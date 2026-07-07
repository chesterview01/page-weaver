import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectSubmission {
  id: string;
  user_id: string;
  project_id: string | null;
  project_name: string;
  custom_message: string;
  status: 'pendiente' | 'en_revision' | 'completado' | 'rechazado';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string | null;
}

export interface SubmissionInput {
  project_id?: string | null;
  project_name: string;
  custom_message: string;
}

export function useCreateSubmission() {
  const [submitting, setSubmitting] = useState(false);

  const create = useCallback(async (input: SubmissionInput) => {
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) return { error: 'not_authenticated' as const };

      const { error } = await (supabase as any)
        .from('project_submissions')
        .insert({
          user_id: user.id,
          project_id: input.project_id ?? null,
          project_name: input.project_name || 'Proyecto sin nombre',
          custom_message: input.custom_message,
        });
      return { error };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { create, submitting };
}

export function useAdminSubmissions() {
  const [items, setItems] = useState<ProjectSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('project_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      const rows = (data as ProjectSubmission[]) || [];

      // best-effort profile lookup for display names
      if (rows.length) {
        const ids = Array.from(new Set(rows.map((r) => r.user_id)));
        try {
          const { data: profs } = await (supabase as any)
            .from('profiles')
            .select('user_id, display_name')
            .in('user_id', ids);
          const map = new Map((profs || []).map((p: any) => [p.user_id, p.display_name]));
          rows.forEach((r) => (r.user_email = (map.get(r.user_id) as string | undefined) || null));
        } catch {
          /* silent */
        }
      }
      setItems(rows);
    } catch (e) {
      console.warn('load submissions failed', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: ProjectSubmission['status']) => {
      const { error } = await (supabase as any)
        .from('project_submissions')
        .update({ status })
        .eq('id', id);
      if (!error) setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
      return { error };
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, reload: load, updateStatus };
}
