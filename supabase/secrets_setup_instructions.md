# Instrucciones de Configuración de Variables de Entorno (Secretos) en Supabase

Para que la Edge Function `chat` de **SofwarX / Chester Code IA** pueda comunicarse correctamente con la pasarela de Lovable AI (o Gemini si se opta por el sistema dual), es indispensable agregar la variable de entorno (secreto) de la API Key.

La Edge Function utiliza principalmente la siguiente variable:
- `LOVABLE_API_KEY`: API Key provista por el proveedor de IA Lovable.

---

## Opción 1: Desde el Panel de Control Web de Supabase (Recomendado)

Si prefieres realizar la configuración a través de la interfaz web, sigue estos pasos:

1. Inicia sesión en tu cuenta en **[Supabase.com](https://supabase.com/)**.
2. Selecciona tu proyecto actual (por ejemplo, el correspondiente a `chestercodeia` / `ycdrvyzuberonxgwjzjc`).
3. En la barra lateral izquierda, ve a **Settings** (icono de engranaje ⚙️) y luego haz clic en **API**.
4. Desplázate hacia abajo hasta la sección **Edge Function Secrets** o ve directamente a **Edge Functions** en la barra lateral de desarrollo de base de datos.
5. Haz clic en **Add Secret** (o busca la lista de secretos).
6. Agrega un nuevo secreto con la siguiente configuración:
   - **Name / Key:** `LOVABLE_API_KEY`
   - **Value:** *(Pega tu clave de API correspondiente)*
7. Haz clic en **Save** o **Save Secret** para guardar.

---

## Opción 2: Usando la CLI de Supabase (Línea de Comandos)

Si estás administrando tu infraestructura mediante la consola o terminal local, puedes establecer los secretos ejecutando el siguiente comando desde la raíz de tu proyecto local de Supabase:

```bash
supabase secrets set LOVABLE_API_KEY=tu_api_key_aqui
```

Esto sincronizará automáticamente la clave con el entorno de ejecución de tus Edge Functions en producción.

---

## Nota sobre el Proveedor de IA Dual (Gemini / Inteligencia Artificial del Administrador)

La Edge Function de chat también admite de forma automática una configuración administrada por base de datos para usar **Gemini-2.5-flash** mediante un sistema dual controlado por el administrador.

Si deseas configurar Gemini:
1. Asegúrate de tener la tabla `public.ai_provider_config` en tu base de datos de Supabase.
2. Agrega una fila con el valor `provider = 'gemini'` y guarda tu clave de API de Gemini en la columna `gemini_api_key`.
3. La Edge Function se encargará automáticamente de leer esta clave desde la base de datos de forma ultra segura usando el rol de servicio (`SUPABASE_SERVICE_ROLE_KEY`) evitando fugas de información.
