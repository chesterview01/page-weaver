
-- 1. AI provider config table (single-row config)
CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'lovable' CHECK (provider IN ('lovable','gemini')),
  gemini_api_key TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_provider_config TO authenticated;
GRANT ALL ON public.ai_provider_config TO service_role;

ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ai config"
  ON public.ai_provider_config FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ai config"
  ON public.ai_provider_config FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ai config"
  ON public.ai_provider_config FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ai config"
  ON public.ai_provider_config FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_provider_config_updated_at
  BEFORE UPDATE ON public.ai_provider_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default row if empty
INSERT INTO public.ai_provider_config (provider)
SELECT 'lovable'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_provider_config);

-- 2. Public helper: any authenticated user can know active provider (never the key)
CREATE OR REPLACE FUNCTION public.get_active_ai_provider()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT provider FROM public.ai_provider_config ORDER BY updated_at DESC LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_ai_provider() TO authenticated, anon;

-- 3. Assign admin role to the designated email (if user already exists)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users
WHERE lower(email) = 'technominer.c.a@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Trigger to auto-grant admin on signup / email verification for that address
CREATE OR REPLACE FUNCTION public.grant_admin_for_designated_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'technominer.c.a@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_designated_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_designated_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_designated_email();

DROP TRIGGER IF EXISTS on_auth_user_updated_grant_designated_admin ON auth.users;
CREATE TRIGGER on_auth_user_updated_grant_designated_admin
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_admin_for_designated_email();
