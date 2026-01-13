-- Create project_integrations table to store external Supabase connections
CREATE TABLE public.project_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  integration_type TEXT NOT NULL DEFAULT 'supabase',
  supabase_url TEXT,
  supabase_anon_key TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  connection_status TEXT NOT NULL DEFAULT 'disconnected',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, integration_type)
);

-- Enable Row Level Security
ALTER TABLE public.project_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view own project integrations" 
ON public.project_integrations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own project integrations" 
ON public.project_integrations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own project integrations" 
ON public.project_integrations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own project integrations" 
ON public.project_integrations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_project_integrations_updated_at
BEFORE UPDATE ON public.project_integrations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();