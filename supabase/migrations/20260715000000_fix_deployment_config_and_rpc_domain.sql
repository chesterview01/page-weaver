-- Create migration to secure deployment_config and define get_main_deployment_domain RPC function

-- 1. Ensure the deployment_config table exists with standard structure
CREATE TABLE IF NOT EXISTS public.deployment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_domain text NOT NULL DEFAULT 'chestercodeia.com',
  vercel_token text,
  vercel_team_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Seed default row if empty
INSERT INTO public.deployment_config (main_domain)
SELECT 'chestercodeia.com'
WHERE NOT EXISTS (SELECT 1 FROM public.deployment_config);

-- 2. Enable RLS on deployment_config
ALTER TABLE public.deployment_config ENABLE ROW LEVEL SECURITY;

-- 3. Only admins can manage (ALL) or direct view (SELECT) deployment config to prevent leaking vercel_token
DROP POLICY IF EXISTS "Admins can view deployment config" ON public.deployment_config;
DROP POLICY IF EXISTS "Admins can manage deployment config" ON public.deployment_config;
DROP POLICY IF EXISTS "Anyone can view active deployment config" ON public.deployment_config;

CREATE POLICY "Admins can manage deployment config"
  ON public.deployment_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Secure RPC function to safely retrieve the active main deployment domain without exposing vercel_token
CREATE OR REPLACE FUNCTION public.get_main_deployment_domain()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain TEXT;
BEGIN
  SELECT main_domain INTO v_domain
  FROM public.deployment_config
  WHERE is_active = true
  LIMIT 1;

  RETURN COALESCE(v_domain, 'chestercodeia.com');
END;
$$;

-- 5. Grant execute permissions on the RPC helper function to any authenticated user or anonymous visitor
GRANT EXECUTE ON FUNCTION public.get_main_deployment_domain() TO authenticated, anon;
