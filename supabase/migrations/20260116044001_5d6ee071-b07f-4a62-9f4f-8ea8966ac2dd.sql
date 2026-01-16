-- Add deployment fields to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS published_domain text,
ADD COLUMN IF NOT EXISTS deployment_url text,
ADD COLUMN IF NOT EXISTS deployment_id text;

-- Create deployment_config table for admin settings
CREATE TABLE IF NOT EXISTS public.deployment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  main_domain text NOT NULL DEFAULT 'chestercodeia.com',
  vercel_token text,
  vercel_team_id text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on deployment_config
ALTER TABLE public.deployment_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage deployment config
CREATE POLICY "Admins can manage deployment config"
  ON public.deployment_config
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active deployment config (for subdomain generation)
CREATE POLICY "Anyone can view active deployment config"
  ON public.deployment_config
  FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_deployment_config_updated_at
  BEFORE UPDATE ON public.deployment_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config if not exists
INSERT INTO public.deployment_config (main_domain)
SELECT 'chestercodeia.com'
WHERE NOT EXISTS (SELECT 1 FROM public.deployment_config);