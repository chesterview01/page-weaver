# Informe Final de Auditoría y Propuesta de Corrección - Chester Code IA

Este informe detalla las vulnerabilidades encontradas y proporciona los scripts SQL necesarios para su reparación manual en el editor de Supabase.

---

## 1. Correcciones de Integridad y Relaciones (Foreign Keys)
Se detectaron columnas `user_id` sin referencias explícitas a la tabla de autenticación, lo que podría causar inconsistencias de datos.

```sql
-- Corregir llaves foráneas faltantes
ALTER TABLE public.plan_payment_requests
  ADD CONSTRAINT plan_payment_requests_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.github_connections
  ADD CONSTRAINT github_connections_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.project_integrations
  ADD CONSTRAINT project_integrations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Si la tabla manual supabase_connections existe, asegurar su relación
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supabase_connections') THEN
    ALTER TABLE public.supabase_connections
      ADD CONSTRAINT supabase_connections_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
```

---

## 2. Auditoría de Seguridad RLS (Brechas Críticas)

### Tabla `deployment_config` (CRÍTICO)
**Falla:** La política actual expone el `vercel_token` a cualquier usuario (incluso anónimos).
**Corrección:** Restringir el acceso a la tabla solo para administradores. Para que el frontend pueda obtener el dominio sin ver el token, usaremos una función segura.

```sql
-- 1. Restringir SELECT solo a administradores
DROP POLICY IF EXISTS "Anyone can view active deployment config" ON public.deployment_config;
CREATE POLICY "Admins can view deployment config"
  ON public.deployment_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. Función segura para obtener el dominio principal sin exponer el token
CREATE OR REPLACE FUNCTION public.get_main_deployment_domain()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT main_domain FROM public.deployment_config WHERE is_active = true LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_main_deployment_domain() TO authenticated, anon;
```

### Tabla `audit_logs`
**Falla:** Cualquier usuario autenticado puede ver todos los logs del sistema.
**Corrección:** Solo administradores deben ver logs globales. Se recomienda añadir `user_id` para que usuarios vean sus propios logs.

```sql
-- Añadir user_id a audit_logs si no existe
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Corregir políticas
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL); -- Permitir inserts del sistema
```

---

## 3. Validación de Permisos Globales (Admin Access)

Muchas tablas carecen de la política que permite al Administrador auditar registros de otros usuarios. Ejecute este bloque para estandarizar el acceso global.

```sql
-- Estandarización de acceso Administrador (SELECT Global)

-- Profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Wallets
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.wallets;
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User Subscriptions
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.user_subscriptions;
CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Projects
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
CREATE POLICY "Admins can view all projects" ON public.projects FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- GitHub Connections
DROP POLICY IF EXISTS "Admins can view all github connections" ON public.github_connections;
CREATE POLICY "Admins can view all github connections" ON public.github_connections FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Conversations & Messages & Builds
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.conversations;
CREATE POLICY "Admins can view all conversations" ON public.conversations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

DROP POLICY IF EXISTS "Admins can view all builds" ON public.builds;
CREATE POLICY "Admins can view all builds" ON public.builds FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = builds.conversation_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
```

---

## 4. Aseguramiento de Tablas Manuales

Para la tabla `supabase_connections` (creada manualmente), aplique el siguiente esquema de seguridad:

```sql
-- Activar RLS
ALTER TABLE public.supabase_connections ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can manage own connections"
  ON public.supabase_connections FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all connections"
  ON public.supabase_connections FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_supabase_connections_updated_at') THEN
    CREATE TRIGGER update_supabase_connections_updated_at
      BEFORE UPDATE ON public.supabase_connections
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
```

---

## 5. Propuesta de Cambio en el Frontend

Para evitar la fuga de datos del token de Vercel y adaptarse a la nueva política de seguridad, se debe modificar `src/components/DeploymentConfigSection.tsx` para usar la función RPC en lugar de consultar la tabla directamente (cuando no se es admin).

*Nota: Dado que el panel de administración solo es accesible por admins, el componente `DeploymentConfigSection` seguirá funcionando para ellos. Sin embargo, en `src/components/PublishDialog.tsx` se debe llamar a la función RPC.*

```typescript
// Ejemplo de cambio recomendado en PublishDialog.tsx:
// En lugar de: await supabase.from('deployment_config').select('main_domain').single();
// Usar: await supabase.rpc('get_main_deployment_domain');
```


---

## 6. Verificación de Tablas Adicionales

Se auditaron las siguientes tablas y se confirmó que su configuración actual es correcta y segura:
- **`project_submissions`**: RLS activo, vinculación correcta con `user_id` y permisos de administrador implementados.
- **`site_settings`**: RLS activo, lectura pública permitida (requerido), escritura restringida a administradores.
- **`subscription_plans`**: RLS activo, lectura pública permitida, escritura restringida a administradores.
- **`built_projects`**: RLS activo, lectura pública permitida, escritura restringida a administradores.
- **`ai_provider_config`**: RLS activo, acceso restringido a administradores.

## 7. Conclusión
La arquitectura de la base de datos es robusta, pero las correcciones de RLS propuestas en la Sección 2 son **críticas** para evitar la exposición de credenciales de terceros (Vercel). Se recomienda ejecutar los scripts en el orden presentado.
