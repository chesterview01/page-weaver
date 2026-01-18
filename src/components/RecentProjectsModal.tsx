import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ProjectCard from './ProjectCard';
import { deleteThumbnail } from '@/utils/thumbnailGenerator';

interface Build {
  id: string;
  label: string;
  html: string;
  css: string;
  js: string;
  created_at: string;
  thumbnail_url: string | null;
  project_id: string | null;
}

interface Project {
  id: string;
  is_published: boolean;
  published_domain: string | null;
}

interface RecentProjectsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RecentProjectsModal: React.FC<RecentProjectsModalProps> = ({ open, onOpenChange }) => {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      loadBuilds();
    }
  }, [open, user]);

  const loadBuilds = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get user's conversations first
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', user.id);

      if (!conversations || conversations.length === 0) {
        setBuilds([]);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Get builds for those conversations
      const { data: buildsData, error } = await supabase
        .from('builds')
        .select('id, label, html, css, js, created_at, thumbnail_url, project_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setBuilds(buildsData || []);

      // Get project info for published status
      const projectIds = buildsData
        ?.map(b => b.project_id)
        .filter((id): id is string => id !== null) || [];

      if (projectIds.length > 0) {
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, is_published, published_domain')
          .in('id', projectIds);

        if (projectsData) {
          const projectsMap: Record<string, Project> = {};
          projectsData.forEach(p => {
            projectsMap[p.id] = p;
          });
          setProjects(projectsMap);
        }
      }
    } catch (error) {
      console.error('Error loading builds:', error);
      toast.error('Error al cargar los proyectos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async (build: Build) => {
    setLoadingId(build.id);
    try {
      sessionStorage.setItem('restoreBuild', JSON.stringify({
        html: build.html,
        css: build.css,
        js: build.js,
        label: build.label,
      }));
      onOpenChange(false);
      window.location.href = '/app';
    } catch (error) {
      console.error('Error opening build:', error);
      toast.error('Error al abrir el proyecto');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (build: Build) => {
    try {
      // Delete thumbnail if exists
      if (build.thumbnail_url) {
        await deleteThumbnail(build.thumbnail_url);
      }

      const { error } = await supabase
        .from('builds')
        .delete()
        .eq('id', build.id);

      if (error) throw error;

      setBuilds(prev => prev.filter(b => b.id !== build.id));
      toast.success('Proyecto eliminado');
    } catch (error) {
      console.error('Error deleting build:', error);
      toast.error('Error al eliminar el proyecto');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">Proyectos recientes</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : builds.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tienes proyectos guardados aún.</p>
              <p className="text-sm mt-2">Crea tu primer proyecto y guárdalo para verlo aquí.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {builds.map((build) => {
                const project = build.project_id ? projects[build.project_id] : null;
                return (
                  <ProjectCard
                    key={build.id}
                    id={build.id}
                    name={build.label}
                    thumbnailUrl={build.thumbnail_url}
                    createdAt={build.created_at}
                    isPublished={project?.is_published || false}
                    publishedDomain={project?.published_domain}
                    onOpen={() => handleOpen(build)}
                    onDelete={() => handleDelete(build)}
                    isLoading={loadingId === build.id}
                  />
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RecentProjectsModal;
