import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CodeOutput } from '@/types/chat';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_published: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectBuild {
  id: string;
  project_id: string | null;
  label: string;
  html: string;
  css: string;
  js: string;
  created_at: string;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = useCallback(async (name: string, description?: string): Promise<Project | null> => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ name, description })
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'project_created',
        entity_type: 'project',
        entity_id: data.id,
        details: { name, description },
      });

      setProjects(prev => [data, ...prev]);
      toast({
        title: "Proyecto creado",
        description: `"${name}" ha sido guardado.`,
      });

      return data;
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto.",
        variant: "destructive",
      });
      return null;
    }
  }, []);

  const updateProject = useCallback(async (id: string, updates: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'project_updated',
        entity_type: 'project',
        entity_id: id,
        details: updates,
      });

      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      toast({
        title: "Proyecto actualizado",
        description: "Los cambios han sido guardados.",
      });
    } catch (error) {
      console.error('Error updating project:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el proyecto.",
        variant: "destructive",
      });
    }
  }, []);

  const deleteProject = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'project_deleted',
        entity_type: 'project',
        entity_id: id,
        details: {},
      });

      setProjects(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado.",
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto.",
        variant: "destructive",
      });
    }
  }, []);

  const getProjectBuilds = useCallback(async (projectId: string): Promise<ProjectBuild[]> => {
    try {
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading project builds:', error);
      return [];
    }
  }, []);

  const saveBuildToProject = useCallback(async (
    projectId: string,
    buildId: string
  ) => {
    try {
      const { error } = await supabase
        .from('builds')
        .update({ project_id: projectId })
        .eq('id', buildId);

      if (error) throw error;

      // Update project's updated_at
      await supabase
        .from('projects')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', projectId);

      toast({
        title: "Build guardado",
        description: "El build ha sido asociado al proyecto.",
      });
    } catch (error) {
      console.error('Error saving build to project:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el build.",
        variant: "destructive",
      });
    }
  }, []);

  return {
    projects,
    isLoading,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    getProjectBuilds,
    saveBuildToProject,
  };
};
