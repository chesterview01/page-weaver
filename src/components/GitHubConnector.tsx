import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Github, Loader2, CheckCircle2, AlertCircle, ExternalLink, Upload, FolderGit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { CodeOutput } from '@/types/chat';

interface GitHubConnection {
  id: string;
  github_username: string | null;
  repository_name: string | null;
  repository_url: string | null;
  personal_access_token: string | null;
}

interface GitHubConnectorProps {
  currentCode: string | CodeOutput | null;
}

const GitHubConnector: React.FC<GitHubConnectorProps> = ({ currentCode }) => {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

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

  const getCodeFiles = (): { html: string; css: string; js: string } => {
    if (!currentCode) return { html: '', css: '', js: '' };
    
    if (typeof currentCode === 'object' && 'html' in currentCode) {
      return {
        html: currentCode.html || '',
        css: currentCode.css || '',
        js: currentCode.js || '',
      };
    }
    
    // Parse from string
    const codeString = String(currentCode);
    const styleMatch = codeString.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const scriptMatch = codeString.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    
    return {
      html: codeString,
      css: styleMatch?.[1]?.trim() || '/* No styles */',
      js: scriptMatch?.[1]?.trim() || '// No scripts',
    };
  };

  // Direct GitHub API upload
  const uploadFileToGitHub = async (
    owner: string,
    repo: string,
    path: string,
    content: string,
    token: string,
    message: string
  ): Promise<boolean> => {
    const base64Content = btoa(unescape(encodeURIComponent(content)));
    
    // First, try to get the file to check if it exists (for updates)
    let sha: string | undefined;
    try {
      const getResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      if (getResponse.ok) {
        const fileData = await getResponse.json();
        sha = fileData.sha;
      }
    } catch {
      // File doesn't exist, which is fine
    }

    // PUT the file
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: base64Content,
          ...(sha && { sha }),
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error uploading to GitHub');
    }

    return true;
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

    const { html, css, js } = getCodeFiles();
    if (!html && !css && !js) {
      toast({
        title: "Error",
        description: "No hay código para subir.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    
    try {
      const files = [
        { path: 'index.html', content: html },
        { path: 'style.css', content: css },
        { path: 'script.js', content: js },
      ];

      const commitMessage = `Commit desde Chester Code IA - ${new Date().toLocaleString('es-ES')}`;

      // Upload each file directly to GitHub API
      for (const file of files) {
        await uploadFileToGitHub(
          connection.github_username!,
          connection.repository_name!,
          file.path,
          file.content,
          connection.personal_access_token!,
          commitMessage
        );
      }

      setUploadStatus('success');
      toast({
        title: "¡Proyecto subido a GitHub!",
        description: `${files.length} archivos subidos correctamente.`,
      });
      
      // Open repo in new tab
      if (connection.repository_url) {
        window.open(connection.repository_url, '_blank');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      setUploadStatus('error');
      toast({
        title: "Error al subir",
        description: error instanceof Error ? error.message : "No se pudo subir a GitHub.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      // Reset status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);
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
            Subir a GitHub
          </DialogTitle>
          <DialogDescription>
            Configura tu repositorio y sube tu código con un clic
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <Alert>
              <FolderGit2 className="h-4 w-4" />
              <AlertTitle>Personal Access Token</AlertTitle>
              <AlertDescription className="text-xs">
                Necesitas un token con permisos <code className="bg-muted px-1 rounded">repo</code> para subir código.
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=Chester%20Code%20IA"
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
                <p className="text-xs text-muted-foreground">
                  El repositorio debe existir en GitHub antes de subir.
                </p>
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
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSaveConnection}
                disabled={isSaving || !username || !repoName || !token}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleUploadToGitHub}
                disabled={!connection?.personal_access_token || isUploading || !currentCode}
              >
                {uploadStatus === 'uploading' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Subiendo...
                  </>
                ) : uploadStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    ¡Subido!
                  </>
                ) : uploadStatus === 'error' ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                    Error
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir a GitHub
                  </>
                )}
              </Button>
            </div>

            {connection?.repository_url && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
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
