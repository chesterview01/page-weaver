import React, { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FolderOpen, 
  Trash2, 
  ExternalLink, 
  RotateCcw, 
  Globe, 
  FileCode,
  Calendar,
  Loader2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ProjectCardProps {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  isPublished?: boolean;
  publishedDomain?: string | null;
  onOpen: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onUnpublish?: () => void;
  isLoading?: boolean;
  showRestore?: boolean;
  showUnpublish?: boolean;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  id,
  name,
  thumbnailUrl,
  createdAt,
  isPublished = false,
  publishedDomain,
  onOpen,
  onDelete,
  onRestore,
  onUnpublish,
  isLoading = false,
  showRestore = false,
  showUnpublish = false,
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showUnpublishDialog, setShowUnpublishDialog] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 bg-card">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={`Preview de ${name}`}
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
                  <Globe className="w-3 h-3 mr-1" />
                  Publicado
                </>
              ) : (
                'Borrador'
              )}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="font-semibold text-foreground truncate mb-2" title={name}>
            {name}
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(createdAt)}</span>
            <span className="mx-1">•</span>
            <span>{formatTime(createdAt)}</span>
          </div>
          {publishedDomain && isPublished && (
            <a
              href={`https://${publishedDomain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2 block truncate"
            >
              {publishedDomain}
            </a>
          )}
        </CardContent>

        {/* Footer Actions */}
        <CardFooter className="p-4 pt-0 flex flex-wrap gap-2">
          <Button 
            size="sm" 
            onClick={onOpen}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <FolderOpen className="w-4 h-4 mr-1" />
                Abrir
              </>
            )}
          </Button>
          
          {showRestore && onRestore && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRestoreDialog(true)}
              disabled={isLoading}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          )}

          {isPublished && publishedDomain && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(`https://${publishedDomain}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}

          {showUnpublish && isPublished && onUnpublish && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowUnpublishDialog(true)}
              disabled={isLoading}
              className="text-orange-500 hover:text-orange-600"
            >
              <Globe className="w-4 h-4" />
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El proyecto "{name}" será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se cargará el proyecto "{name}" en el editor. Los cambios no guardados se perderán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRestore?.();
                setShowRestoreDialog(false);
              }}
            >
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unpublish Dialog */}
      <AlertDialog open={showUnpublishDialog} onOpenChange={setShowUnpublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Despublicar proyecto?</AlertDialogTitle>
            <AlertDialogDescription>
              El proyecto "{name}" dejará de estar disponible públicamente. Podrás volver a publicarlo más tarde.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onUnpublish?.();
                setShowUnpublishDialog(false);
              }}
              className="bg-orange-500 text-white hover:bg-orange-600"
            >
              Despublicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectCard;
