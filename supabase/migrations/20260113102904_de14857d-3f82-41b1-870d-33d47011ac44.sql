
-- Tabla para dominios de proyectos
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS custom_domain TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS domain_status TEXT DEFAULT 'none';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- Tabla para configuración de métodos de pago
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('binance', 'paypal', 'zelle')),
  details JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para solicitudes de pago/aprobación de planes
CREATE TABLE public.plan_payment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
  payment_method TEXT NOT NULL,
  payment_reference TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla para credenciales de GitHub (exportación manual)
CREATE TABLE public.github_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  github_username TEXT,
  repository_name TEXT,
  repository_url TEXT,
  personal_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_methods (solo admins pueden modificar, todos pueden ver activos)
CREATE POLICY "Anyone can view active payment methods"
  ON public.payment_methods FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage payment methods"
  ON public.payment_methods FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Políticas para plan_payment_requests
CREATE POLICY "Users can view own payment requests"
  ON public.plan_payment_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment requests"
  ON public.plan_payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all payment requests"
  ON public.plan_payment_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Políticas para github_connections
CREATE POLICY "Users can manage own github connection"
  ON public.github_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_payment_requests_updated_at
  BEFORE UPDATE ON public.plan_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insertar métodos de pago por defecto
INSERT INTO public.payment_methods (name, type, details) VALUES
  ('Binance Pay', 'binance', '{"email": "pagos@chestercode.com", "binance_id": "123456789"}'),
  ('PayPal', 'paypal', '{"email": "pagos@chestercode.com"}'),
  ('Zelle', 'zelle', '{"email": "pagos@chestercode.com", "phone": "+1234567890"}');
