import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Github, Loader2, CheckCircle2, AlertCircle, ExternalLink, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface GitHubConnection {
  id: string;
  github_username: string | null;
  repository_name: string | null;
  repository_url: string | null;
  personal_access_token: string | null;
}

interface GitHubConnectorProps {
  currentCode: string;
}

const GitHubConnector: React.FC<GitHubConnectorProps> = ({ currentCode }) => {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [username, setUsername] = useState('');
  const [repoName, setRepoName] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (open && user) {
      loadConnection();
    }
  }, [open, user]);

  const loadConnection = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('github_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data) {
        setConnection(data as GitHubConnection);
        setUsername(data.github_username || '');
        setRepoName(data.repository_name || '');
        setToken(data.personal_access_token || '');
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const connectionData = {
        user_id: user.id,
        github_username: username || null,
        repository_name: repoName || null,
        repository_url: username && repoName ? `https://github.com/${username}/${repoName}` : null,
        personal_access_token: token || null,
      };

      if (connection) {
        const { error } = await supabase
          .from('github_connections')
          .update(connectionData)
          .eq('id', connection.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('github_connections')
          .insert(connectionData);
        if (error) throw error;
      }

      toast({
        title: "Conexión guardada",
        description: "Tu configuración de GitHub ha sido guardada.",
      });
      loadConnection();
    } catch (error) {
      console.error('Error saving connection:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la conexión.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadToGitHub = async () => {
    if (!connection?.personal_access_token || !connection?.github_username || !connection?.repository_name) {
      toast({
        title: "Error",
        description: "Configura tu conexión de GitHub primero.",
        variant: "destructive",
      });
      return;
    }

    if (!currentCode) {
      toast({
        title: "Error",
        description: "No hay código para subir.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Parse the current code to extract HTML, CSS, and JS
      const htmlMatch = currentCode.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const styleMatch = currentCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const scriptMatch = currentCode.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

      const files = [
        { path: 'index.html', content: currentCode },
        { path: 'style.css', content: styleMatch?.[1] || '/* No styles */' },
        { path: 'script.js', content: scriptMatch?.[1] || '// No scripts' },
      ];

      // Note: In a real implementation, you would use the GitHub API here
      // For now, we'll show instructions for manual upload
      toast({
        title: "Exportación lista",
        description: "Descarga el ZIP y súbelo manualmente a tu repositorio, o usa GitHub Desktop.",
      });

      // Open GitHub repo in new tab
      if (connection.repository_url) {
        window.open(connection.repository_url, '_blank');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      toast({
        title: "Error",
        description: "No se pudo subir a GitHub.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Github className="h-4 w-4 mr-2" />
          GitHub
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Conectar con GitHub
          </DialogTitle>
          <DialogDescription>
            Configura tu repositorio para exportar proyectos
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Autenticación manual</AlertTitle>
              <AlertDescription className="text-xs">
                GitHub OAuth no está disponible. Usa un Personal Access Token para exportar.
                <a
                  href="https://github.com/settings/tokens/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline mt-1"
                >
                  Crear token <ExternalLink className="h-3 w-3" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gh-username">Usuario de GitHub</Label>
                <Input
                  id="gh-username"
                  placeholder="tu-usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gh-repo">Nombre del repositorio</Label>
                <Input
                  id="gh-repo"
                  placeholder="mi-proyecto"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gh-token">Personal Access Token</Label>
                <Input
                  id="gh-token"
                  type="password"
                  placeholder="ghp_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Necesita permisos: repo, workflow
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSaveConnection}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleUploadToGitHub}
                disabled={!connection?.personal_access_token || isUploading || !currentCode}
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir código
                  </>
                )}
              </Button>
            </div>

            {connection?.repository_url && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Repositorio configurado:</span>
                </div>
                <a
                  href={connection.repository_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline font-mono"
                >
                  {connection.repository_url}
                </a>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GitHubConnector;
