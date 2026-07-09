-- 1. Modificar la tabla plan_payment_requests para permitir compra de créditos
ALTER TABLE public.plan_payment_requests
ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE public.plan_payment_requests
ADD COLUMN IF NOT EXISTS credits INTEGER;

-- Comentario para documentar el cambio
COMMENT ON COLUMN public.plan_payment_requests.plan_id IS 'Opcional si es una compra directa de créditos';
COMMENT ON COLUMN public.plan_payment_requests.credits IS 'Cantidad de créditos comprados si plan_id es NULL';

-- 2. Políticas RLS para la tabla subscription_plans
-- Asegurar que RLS esté habilitado
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si es necesario para evitar duplicados (opcional, depende de la situación)
-- DROP POLICY IF EXISTS "Admins can manage subscription plans" ON public.subscription_plans;

-- Política para que cualquier usuario pueda ver los planes
CREATE POLICY "Allow public read access on subscription_plans"
ON public.subscription_plans FOR SELECT
USING (true);

-- Política de acceso total para administradores
CREATE POLICY "Allow admins full access on subscription_plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
