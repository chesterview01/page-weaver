import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FolderOpen, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

interface RecentProject {
  id: string;
  name: string;
  updated_at: string;
  is_published: boolean;
  published_domain: string | null;
}

interface RecentProjectsProps {
  onOpenProject?: (projectId: string) => void;
}

const RecentProjects: React.FC<RecentProjectsProps> = ({ onOpenProject }) => {
  const { user, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadRecentProjects();
    }
  }, [isAuthenticated, user]);

  const loadRecentProjects = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, updated_at, is_published, published_domain')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading recent projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenProject = async (projectId: string) => {
    // Get the latest build for this project
    const { data: builds } = await supabase
      .from('builds')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (builds && builds.length > 0) {
      const build = builds[0];
      sessionStorage.setItem('restoreBuild', JSON.stringify({
        html: build.html,
        css: build.css,
        js: build.js,
        label: build.label,
      }));
      // Reload to trigger the restore
      window.location.href = '/app';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES');
  };

  if (!isAuthenticated || projects.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Clock className="w-4 h-4" />
          <span className="hidden sm:inline">Recientes</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Proyectos recientes</p>
          <p className="text-xs text-muted-foreground">Tus últimos proyectos</p>
        </div>
        <DropdownMenuSeparator />
        
        {isLoading ? (
          <div className="px-2 py-4 text-center text-muted-foreground text-sm">
            Cargando...
          </div>
        ) : (
          projects.map((project) => (
            <DropdownMenuItem 
              key={project.id}
              className="flex items-center justify-between cursor-pointer"
              onClick={() => handleOpenProject(project.id)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(project.updated_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {project.is_published && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Globe className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')} className="text-primary">
          <FolderOpen className="w-4 h-4 mr-2" />
          Ver todos los proyectos
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RecentProjects;
