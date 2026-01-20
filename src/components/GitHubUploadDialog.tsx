import React, { useState } from 'react';
import { Github, Loader2, FolderUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { Checkbox } from '@/components/ui/checkbox';

interface GitHubUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buildId: string;
  buildLabel: string;
}

export const GitHubUploadDialog: React.FC<GitHubUploadDialogProps> = ({
  open,
  onOpenChange,
  buildId,
  buildLabel,
}) => {
  const { 
    connection, 
    isConnected, 
    isUploading, 
    uploadToGitHub, 
    initiateOAuth 
  } = useGitHubConnection();

  const [repoName, setRepoName] = useState(() => {
    // Generate a default repo name from the build label
    return buildLabel
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50) || 'my-project';
  });
  const [isNewRepo, setIsNewRepo] = useState(true);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; repoUrl: string } | null>(null);

  const handleUpload = async () => {
    const result = await uploadToGitHub(buildId, repoName, isNewRepo);
    if (result) {
      setUploadResult(result);
    }
  };

  const handleClose = () => {
    setUploadResult(null);
    onOpenChange(false);
  };

  if (uploadResult?.success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Github className="h-5 w-5" />
              ¡Proyecto subido correctamente!
            </DialogTitle>
            <DialogDescription>
              Tu proyecto ha sido subido a GitHub exitosamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm font-medium mb-2">Repositorio:</p>
            <a 
              href={uploadResult.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              {uploadResult.repoUrl}
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>
              Cerrar
            </Button>
            <Button variant="outline" asChild>
              <a href={uploadResult.repoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver en GitHub
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Subir a GitHub
          </DialogTitle>
          <DialogDescription>
            Sube "{buildLabel}" a un repositorio de GitHub.
          </DialogDescription>
        </DialogHeader>

        {!isConnected ? (
          <div className="text-center py-6">
            <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-4">
              Primero debes conectar tu cuenta de GitHub.
            </p>
            <Button onClick={initiateOAuth}>
              <Github className="h-4 w-4 mr-2" />
              Conectar con GitHub
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm">
                <span className="font-medium">Cuenta:</span>{' '}
                @{connection?.github_username}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repoName">Nombre del repositorio</Label>
              <Input
                id="repoName"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder="mi-proyecto"
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                github.com/{connection?.github_username}/{repoName}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isNewRepo"
                checked={isNewRepo}
                onCheckedChange={(checked) => setIsNewRepo(checked as boolean)}
                disabled={isUploading}
              />
              <Label htmlFor="isNewRepo" className="text-sm">
                Crear nuevo repositorio
              </Label>
            </div>

            {!isNewRepo && (
              <p className="text-xs text-muted-foreground bg-yellow-500/10 p-2 rounded border border-yellow-500/30">
                ⚠️ Si el repositorio existe, los archivos serán actualizados.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          {isConnected && (
            <Button onClick={handleUpload} disabled={isUploading || !repoName.trim()}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <FolderUp className="h-4 w-4 mr-2" />
                  Subir a GitHub
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GitHubUploadDialog;
