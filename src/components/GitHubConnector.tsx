import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Github, Loader2, CheckCircle2, AlertCircle, ExternalLink, Upload, Unlink } from 'lucide-react';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { toast } from '@/hooks/use-toast';
import { CodeOutput } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GitHubConnectorProps {
  currentCode: string | CodeOutput | null;
  currentProject?: {
    projectName: string;
    files: Array<{ path: string; content: string }>;
  } | null;
}

const GitHubConnector: React.FC<GitHubConnectorProps> = ({ currentCode, currentProject }) => {
  const {
    connection,
    isLoading,
    isConnecting,
    isUploading,
    isConnected,
    initiateOAuth,
    disconnect,
    uploadToGitHub,
  } = useGitHubConnection();

  const [open, setOpen] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [repoName, setRepoName] = useState('');
  const [createNewRepo, setCreateNewRepo] = useState(true);

  // Get repository name suggestion from project
  const getDefaultRepoName = () => {
    if (currentProject?.projectName) {
      return currentProject.projectName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    return 'mi-proyecto';
  };

  const handleConnect = () => {
    initiateOAuth();
  };

  const handleDisconnect = async () => {
    await disconnect();
    setDisconnectConfirm(false);
  };

  const handleUpload = async () => {
    if (!connection) {
      toast({
        title: "Error",
        description: "Debes conectar tu cuenta de GitHub primero.",
        variant: "destructive",
      });
      return;
    }

    const finalRepoName = repoName.trim() || getDefaultRepoName();
    
    if (!finalRepoName) {
      toast({
        title: "Error",
        description: "Ingresa un nombre para el repositorio.",
        variant: "destructive",
      });
      return;
    }

    // Get the latest build ID from the current project/code
    // For now, we'll use the edge function that handles the upload
    setUploadStatus('uploading');
    
    try {
      // The uploadToGitHub function expects a buildId, but we can modify it
      // to work with the current code directly
      const result = await uploadToGitHub('current', finalRepoName, createNewRepo);
      
      if (result) {
        setUploadStatus('success');
        setTimeout(() => {
          setUploadStatus('idle');
          setOpen(false);
        }, 2000);
      } else {
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch (error) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  // Check if we have code to upload
  const hasCode = currentCode || currentProject;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Github className="h-4 w-4" />
          GitHub
          {isConnected && <CheckCircle2 className="h-3 w-3 text-green-500" />}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            GitHub
          </DialogTitle>
          <DialogDescription>
            {isConnected 
              ? "Sube tu proyecto a un repositorio de GitHub" 
              : "Conecta tu cuenta de GitHub para subir proyectos"
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isConnected && connection ? (
          <div className="space-y-6 mt-4">
            {/* Connected Status */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Github className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">@{connection.github_username}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">Cuenta conectada</span>
                </div>
              </div>
              <Dialog open={disconnectConfirm} onOpenChange={setDisconnectConfirm}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                    <Unlink className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>¿Desconectar GitHub?</DialogTitle>
                    <DialogDescription>
                      Esto eliminará la conexión con tu cuenta de GitHub (@{connection.github_username}). 
                      Tus repositorios no serán afectados.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDisconnectConfirm(false)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={handleDisconnect}>
                      Desconectar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Repository Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repo-name">Nombre del repositorio</Label>
                <Input
                  id="repo-name"
                  placeholder={getDefaultRepoName()}
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Se creará en github.com/{connection.github_username}/{repoName || getDefaultRepoName()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="create-new"
                  checked={createNewRepo}
                  onChange={(e) => setCreateNewRepo(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="create-new" className="text-sm font-normal cursor-pointer">
                  Crear nuevo repositorio (si no existe)
                </Label>
              </div>
            </div>

            {/* Last Repository */}
            {connection.repository_url && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Último repositorio:</p>
                <a
                  href={connection.repository_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {connection.repository_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {/* Upload Button */}
            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={!hasCode || isUploading || uploadStatus === 'uploading'}
            >
              {uploadStatus === 'uploading' || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : uploadStatus === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  ¡Subido correctamente!
                </>
              ) : uploadStatus === 'error' ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Error al subir
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir a GitHub
                </>
              )}
            </Button>

            {!hasCode && (
              <p className="text-xs text-center text-muted-foreground">
                Genera una página primero para poder subirla a GitHub.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Not Connected */}
            <div className="text-center py-6">
              <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                <Github className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">Conecta tu cuenta de GitHub</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Con un solo clic, podrás subir tus proyectos directamente a repositorios de GitHub.
              </p>
              
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Github className="h-4 w-4 mr-2" />
                    Conectar con GitHub
                  </>
                )}
              </Button>
            </div>

            {/* Benefits */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Sin necesidad de tokens manuales</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Autorización segura con OAuth</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Crea repositorios automáticamente</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GitHubConnector;
