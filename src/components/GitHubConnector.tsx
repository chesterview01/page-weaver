import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Github, Loader2, CheckCircle2, AlertCircle, ExternalLink, Upload, Unlink, RefreshCw, FolderGit2, Lock, Globe } from 'lucide-react';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { toast } from '@/hooks/use-toast';
import { CodeOutput } from '@/types/chat';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface ProjectFile {
  path: string;
  content: string;
}

interface GitHubConnectorProps {
  currentCode: string | CodeOutput | null;
  currentProject?: {
    projectName: string;
    files: ProjectFile[];
  } | null;
}

const GitHubConnector: React.FC<GitHubConnectorProps> = ({ currentCode, currentProject }) => {
  const {
    connection,
    status,
    isLoading,
    isConnecting,
    isSyncing,
    isConnected,
    initiateOAuth,
    disconnect,
    syncProject,
  } = useGitHubConnection();

  const [open, setOpen] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [repoName, setRepoName] = useState('');
  const [createNewRepo, setCreateNewRepo] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

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

  // Reset repo name when project changes
  useEffect(() => {
    if (currentProject?.projectName) {
      setRepoName(getDefaultRepoName());
    }
  }, [currentProject?.projectName]);

  const handleConnect = () => {
    initiateOAuth();
  };

  const handleDisconnect = async () => {
    await disconnect();
    setDisconnectConfirm(false);
  };

  const handleSync = async () => {
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

    // Prepare files from current project
    let files: ProjectFile[] = [];
    
    if (currentProject?.files && currentProject.files.length > 0) {
      files = currentProject.files;
    } else if (currentCode && typeof currentCode === 'object' && 'html' in currentCode) {
      // Legacy format - convert to files
      const code = currentCode as CodeOutput;
      files = [
        { path: 'index.html', content: code.html || '' },
        { path: 'styles.css', content: code.css || '' },
        { path: 'script.js', content: code.js || '' },
        { path: 'README.md', content: `# ${finalRepoName}\n\nProyecto creado con Chester Code IA.` },
      ];
    }

    if (files.length === 0) {
      toast({
        title: "Error",
        description: "No hay archivos para sincronizar.",
        variant: "destructive",
      });
      return;
    }

    setSyncStatus('syncing');
    
    try {
      const result = await syncProject(finalRepoName, files, {
        isNewRepo: createNewRepo,
        isPrivate,
      });
      
      if (result) {
        setSyncStatus('success');
        setTimeout(() => {
          setSyncStatus('idle');
        }, 3000);
      } else {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (error) {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Check if we have code to sync
  const hasCode = currentCode || (currentProject?.files && currentProject.files.length > 0);

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
              ? "Sincroniza tu proyecto con GitHub" 
              : "Conecta tu cuenta de GitHub para sincronizar proyectos"
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

            {/* Repository Configuration */}
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
                  github.com/{connection.github_username}/{repoName || getDefaultRepoName()}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="create-new" className="text-sm font-normal cursor-pointer">
                    Crear repositorio si no existe
                  </Label>
                </div>
                <Switch
                  id="create-new"
                  checked={createNewRepo}
                  onCheckedChange={setCreateNewRepo}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isPrivate ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="is-private" className="text-sm font-normal cursor-pointer">
                    Repositorio privado
                  </Label>
                </div>
                <Switch
                  id="is-private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
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

            {/* Sync Button */}
            <Button
              className="w-full"
              onClick={handleSync}
              disabled={!hasCode || isSyncing || syncStatus === 'syncing'}
            >
              {syncStatus === 'syncing' || isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : syncStatus === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  ¡Sincronizado!
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Error al sincronizar
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar con GitHub
                </>
              )}
            </Button>

            {!hasCode && (
              <p className="text-xs text-center text-muted-foreground">
                Genera una página primero para poder sincronizarla con GitHub.
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
                Con un solo clic, podrás sincronizar tus proyectos directamente con repositorios de GitHub.
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
                <span>Sincroniza cambios con un clic</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GitHubConnector;
