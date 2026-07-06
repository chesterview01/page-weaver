import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SiteSettings {
  id: string;
  site_name: string;
  hero_title: string;
  hero_subtitle: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_instagram: string;
  contact_facebook: string;
  contact_twitter: string;
  contact_linkedin: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  accent_color?: string;
  background_color?: string;


export interface BuiltProject {
  id: string;
  title: string;
  category: string;
  image_url: string;
  link_url: string;
  sort_order: number;
  is_active: boolean;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('site_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setSettings(data as SiteSettings);
    } catch (e) {
      console.warn('site_settings load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (patch: Partial<SiteSettings>) => {
    if (!settings) return { error: 'no settings' };
    const { error } = await (supabase as any)
      .from('site_settings')
      .update(patch)
      .eq('id', settings.id);
    if (!error) setSettings({ ...settings, ...patch });
    return { error };
  };

  return { settings, loading, update, reload: load };
}

export function useBuiltProjects() {
  const [projects, setProjects] = useState<BuiltProject[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from('built_projects')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      setProjects((data as BuiltProject[]) || []);
    } catch (e) {
      console.warn('built_projects load failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { projects, loading, reload: load };
}
