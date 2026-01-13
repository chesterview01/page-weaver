-- Create projects table for saved projects
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add project_id to builds table
ALTER TABLE public.builds ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create user_settings table for preferences and custom AI config
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  custom_api_url TEXT,
  custom_api_key TEXT,
  use_custom_ai BOOLEAN NOT NULL DEFAULT false,
  auto_save_enabled BOOLEAN NOT NULL DEFAULT true,
  narrative_style TEXT NOT NULL DEFAULT 'detailed',
  preview_in_new_tab BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_logs table for tracking actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create public access policies (can be restricted later with auth)
CREATE POLICY "Public access to projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to user_settings" ON public.user_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public access to audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.user_settings (narrative_style, auto_save_enabled, preview_in_new_tab, use_custom_ai)
VALUES ('detailed', true, true, false);