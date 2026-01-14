import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderOpen, Trash2, ExternalLink, Eye, EyeOff, 
  Calendar, Clock, RotateCcw, Loader2, FileCode,
  AlertTriangle
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
  CardHeader,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Build {
  id: string;
  label: string;
  html: string;
  css: string;
  js: string;
  created_at: string;
  project_id: string | null;
  conversation_id: string;
}

interface ProjectsGridProps {
  onOpenBuild: (build: Build) => void;
}

export const ProjectsGrid: React.FC<ProjectsGridProps> = ({ onOpenBuild }) => {
  const navigate = useNavigate();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Build | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<Build | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadBuilds();
  }, []);

  const loadBuilds = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('builds')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuilds(data || []);
    } catch (error) {
      console.error('Error loading builds:', error);
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
        {builds.map((build) => (
          <Card 
            key={build.id} 
            className="group hover:border-primary/50 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-lg">
                    {build.label}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant={build.project_id ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {build.project_id ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Publicado
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Borrador
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <FileCode className="h-8 w-8 text-primary/30 group-hover:text-primary/50 transition-colors" />
              </div>
            </CardHeader>
            
            <CardContent className="pb-3">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{formatDate(build.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatTime(build.created_at)}</span>
                </div>
              </div>
              
              {/* File preview */}
              <div className="mt-3 p-2 rounded bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Archivos incluidos:</p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-background">index.html</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-background">style.css</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-background">script.js</span>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="pt-0 gap-2">
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
        ))}
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
    </>
  );
};

export default ProjectsGrid;
