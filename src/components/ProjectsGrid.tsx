import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Trash2, ExternalLink, Eye, EyeOff, 
  Calendar, Clock, RotateCcw, Loader2, FileCode,
  AlertTriangle, Globe, XCircle, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { deleteThumbnail } from '@/utils/thumbnailGenerator';

interface Build {
  id: string;
  label: string;
  html: string;
  css: string;
  js: string;
  created_at: string;
  project_id: string | null;
  conversation_id: string;
  thumbnail_url: string | null;
}

interface Project {
  id: string;
  name: string;
  is_published: boolean | null;
  published_domain: string | null;
  deployment_url: string | null;
  deployment_id: string | null;
  created_at: string;
}

interface ProjectsGridProps {
  onOpenBuild: (build: Build) => void;
}

export const ProjectsGrid: React.FC<ProjectsGridProps> = ({ onOpenBuild }) => {
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Build | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<Build | null>(null);
  const [unpublishConfirm, setUnpublishConfirm] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnpublishing, setIsUnpublishing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const { data: buildsData, error: buildsError } = await supabase
        .from('builds')
        .select('*')
        .order('created_at', { ascending: false });

      if (buildsError) throw buildsError;
      setBuilds(buildsData || []);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('id, name, is_published, published_domain, deployment_url, deployment_id, created_at')
        .order('updated_at', { ascending: false });

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los proyectos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (build: Build) => {
    try {
      setIsDeleting(true);
      
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
      setDeleteConfirm(null);
      
      toast({
        title: "Proyecto eliminado",
        description: `"${build.label}" ha sido eliminado correctamente.`,
      });
    } catch (error) {
      console.error('Error deleting build:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnpublish = async (project: Project) => {
    try {
      setIsUnpublishing(true);
      
      if (project.deployment_id) {
        const response = await supabase.functions.invoke('vercel-delete', {
          body: {
            projectId: project.id,
            deploymentId: project.deployment_id,
          },
        });

        if (response.error) {
          console.error('Vercel delete error:', response.error);
        }
      }

      setProjects(prev => prev.map(p => 
        p.id === project.id 
          ? { ...p, is_published: false, published_domain: null, deployment_url: null, deployment_id: null }
          : p
      ));
      setUnpublishConfirm(null);
      
      toast({
        title: "Publicación eliminada",
        description: `"${project.name}" ya no está publicado.`,
      });
    } catch (error) {
      console.error('Error unpublishing:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación.",
        variant: "destructive",
      });
    } finally {
      setIsUnpublishing(false);
    }
  };

  const handleOpen = (build: Build) => {
    onOpenBuild(build);
    toast({
      title: "Proyecto abierto",
      description: `"${build.label}" cargado en el editor.`,
    });
    navigate('/app');
  };

  const handleRestore = (build: Build) => {
    onOpenBuild(build);
    setRestoreConfirm(null);
    toast({
      title: "Proyecto restaurado",
      description: `"${build.label}" ha sido restaurado en el editor.`,
    });
    navigate('/app');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "URL copiada al portapapeles",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getProjectForBuild = (build: Build): Project | undefined => {
    return projects.find(p => p.id === build.project_id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (builds.length === 0) {
    return (
      <div className="text-center py-16">
        <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium text-foreground mb-2">No tienes proyectos guardados</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Crea tu primer proyecto en el editor y se guardará automáticamente.
        </p>
        <Button onClick={() => navigate('/app')}>
          Ir al Editor
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {builds.map((build) => {
          const project = getProjectForBuild(build);
          const isPublished = project?.is_published;
          const publishedDomain = project?.published_domain;
          const deploymentUrl = project?.deployment_url;

          return (
            <Card 
              key={build.id} 
              className="group overflow-hidden hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-muted overflow-hidden">
                {build.thumbnail_url ? (
                  <img
                    src={build.thumbnail_url}
                    alt={`Preview de ${build.label}`}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <FileCode className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <Badge 
                    variant={isPublished ? "default" : "secondary"}
                    className={isPublished 
                      ? "bg-green-500/90 hover:bg-green-500 text-white" 
                      : "bg-muted-foreground/20 text-muted-foreground"
                    }
                  >
                    {isPublished ? (
                      <>
                        <Eye className="w-3 h-3 mr-1" />
                        Publicado
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3 mr-1" />
                        Borrador
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-foreground truncate text-lg mb-2">
                  {build.label}
                </h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(build.created_at)}</span>
                    <span className="mx-1">•</span>
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(build.created_at)}</span>
                  </div>
                </div>

                {/* Published domain */}
                {isPublished && publishedDomain && (
                  <div className="mt-3 p-2 rounded bg-green-500/10 border border-green-500/30">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs font-medium text-green-600">Subdominio:</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-xs font-mono text-green-700 truncate flex-1">
                        {publishedDomain}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(`https://${publishedDomain}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => window.open(deploymentUrl || `https://${publishedDomain}`, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="p-4 pt-0 gap-2 flex-wrap">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleOpen(build)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRestoreConfirm(build)}
                  title="Restaurar versión"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                {isPublished && project && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                    onClick={() => setUnpublishConfirm(project)}
                    title="Eliminar publicación"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteConfirm(build)}
                  title="Eliminar proyecto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              ¿Eliminar proyecto?
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar "{deleteConfirm?.label}"? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={!!restoreConfirm} onOpenChange={() => setRestoreConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              ¿Restaurar proyecto?
            </DialogTitle>
            <DialogDescription>
              Esto cargará "{restoreConfirm?.label}" en el editor y reemplazará 
              el contenido actual. ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreConfirm(null)}>
              Cancelar
            </Button>
            <Button onClick={() => restoreConfirm && handleRestore(restoreConfirm)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish Confirmation Dialog */}
      <Dialog open={!!unpublishConfirm} onOpenChange={() => setUnpublishConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-orange-500" />
              ¿Eliminar publicación?
            </DialogTitle>
            <DialogDescription>
              Esto eliminará el deployment de Vercel y el proyecto "{unpublishConfirm?.name}" 
              dejará de estar disponible en {unpublishConfirm?.published_domain}. 
              ¿Deseas continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnpublishConfirm(null)}>
              Cancelar
            </Button>
            <Button 
              variant="default"
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => unpublishConfirm && handleUnpublish(unpublishConfirm)}
              disabled={isUnpublishing}
            >
              {isUnpublishing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Eliminar publicación
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProjectsGrid;
