
-- SITE SETTINGS (singleton)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'Chester Code',
  hero_title TEXT NOT NULL DEFAULT 'Construimos software serio para empresas que escalan.',
  hero_subtitle TEXT NOT NULL DEFAULT 'Diseñamos, desarrollamos y operamos plataformas web, sistemas internos y aplicaciones móviles con estándares de ingeniería de alta gama.',
  contact_whatsapp TEXT DEFAULT '',
  contact_email TEXT DEFAULT '',
  contact_instagram TEXT DEFAULT '',
  contact_facebook TEXT DEFAULT '',
  contact_twitter TEXT DEFAULT '',
  contact_linkedin TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_insert" ON public.site_settings;
CREATE POLICY "site_settings_admin_insert" ON public.site_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "site_settings_admin_update" ON public.site_settings;
CREATE POLICY "site_settings_admin_update" ON public.site_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "site_settings_admin_delete" ON public.site_settings;
CREATE POLICY "site_settings_admin_delete" ON public.site_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton
INSERT INTO public.site_settings (site_name)
SELECT 'Chester Code'
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- BUILT PROJECTS
CREATE TABLE IF NOT EXISTS public.built_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Enterprise',
  image_url TEXT NOT NULL,
  link_url TEXT NOT NULL DEFAULT '#',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.built_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.built_projects TO authenticated;
GRANT ALL ON public.built_projects TO service_role;

ALTER TABLE public.built_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "built_projects_public_read" ON public.built_projects;
CREATE POLICY "built_projects_public_read" ON public.built_projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "built_projects_admin_insert" ON public.built_projects;
CREATE POLICY "built_projects_admin_insert" ON public.built_projects FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "built_projects_admin_update" ON public.built_projects;
CREATE POLICY "built_projects_admin_update" ON public.built_projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "built_projects_admin_delete" ON public.built_projects;
CREATE POLICY "built_projects_admin_delete" ON public.built_projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_built_projects_updated_at ON public.built_projects;
CREATE TRIGGER update_built_projects_updated_at
  BEFORE UPDATE ON public.built_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed sample built projects
INSERT INTO public.built_projects (title, category, image_url, link_url, sort_order)
SELECT * FROM (VALUES
  ('Dashboard Analytics', 'SaaS', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80', '#', 1),
  ('Panel Admin ERP',     'Enterprise', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', '#', 2),
  ('Landing Corporativa', 'Marketing',  'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1200&q=80', '#', 3),
  ('E-commerce Platform', 'Retail',     'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80', '#', 4),
  ('CRM Empresarial',     'B2B',        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80', '#', 5),
  ('App Móvil FinTech',   'Mobile',     'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80', '#', 6)
) AS v(title, category, image_url, link_url, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.built_projects);
