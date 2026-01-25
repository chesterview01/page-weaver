import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface GitHubConnection {
  id: string;
  user_id: string;
  github_username: string | null;
  repository_name: string | null;
  repository_url: string | null;
  created_at: string;
  updated_at: string;
}

interface GitHubStatus {
  connected: boolean;
  username: string | null;
  organizations: string[] | null;
  repository: {
    name: string;
    url: string;
  } | null;
}

interface ProjectFile {
  path: string;
  content: string;
}

export const useGitHubConnection = () => {
  const { user } = useAuthContext();
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load connection from database (basic info)
  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('github_connections')
        .select('id, user_id, github_username, repository_name, repository_url, created_at, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading GitHub connection:', error);
      }

      setConnection(data || null);
      
      // If we have a connection, also set the status
      if (data) {
        setStatus({
          connected: true,
          username: data.github_username,
          organizations: [],
          repository: data.repository_name ? {
            name: data.repository_name,
            url: data.repository_url || '',
          } : null,
        });
      } else {
        setStatus({ connected: false, username: null, organizations: null, repository: null });
      }
    } catch (error) {
      console.error('Error loading GitHub connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch status from edge function (for more detailed info)
  const fetchStatus = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('github-status', {
        method: 'GET',
      });

      if (!error && data) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Error fetching GitHub status:', error);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Listen for postMessage from OAuth popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Accept messages from any origin for OAuth flow
      if (event.data?.type === 'github-oauth-success') {
        console.log('Received GitHub OAuth success message');
        loadConnection();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [loadConnection]);

  const initiateOAuth = useCallback(() => {
    if (!user) {
      toast({
        title: "Error",
        description: "Debes iniciar sesión para conectar GitHub",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'Ov23liWq6ozPxlRo6WHq';
    const redirectUri = `https://bjoygscbgzzvhxjnrrsj.supabase.co/functions/v1/github-auth-callback`;
    const scope = 'repo user';
    const state = user.id; // Pass user ID as state for callback

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
    
    console.log('Opening GitHub OAuth with redirect:', redirectUri);
    
    // Open in a popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      authUrl,
      'github-oauth',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );

    // If popup was blocked, try opening in new tab
    if (!popup || popup.closed) {
      window.open(authUrl, '_blank');
    }

    // Poll for completion (when the popup redirects back and closes)
    const checkInterval = setInterval(() => {
      try {
        if (popup?.closed) {
          clearInterval(checkInterval);
          setIsConnecting(false);
          // Reload connection after popup closes
          setTimeout(() => {
            loadConnection();
          }, 1000);
        }
      } catch (e) {
        // Cross-origin access error, ignore
      }
    }, 500);

    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
      setIsConnecting(false);
    }, 300000);
  }, [user, loadConnection]);

  const disconnect = useCallback(async () => {
    if (!user || !connection) return false;

    try {
      const { error } = await supabase
        .from('github_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'github_disconnect',
        entity_type: 'github_connection',
        entity_id: user.id,
        details: { github_username: connection.github_username },
      });

      setConnection(null);
      setStatus({ connected: false, username: null, organizations: null, repository: null });
      
      toast({
        title: "GitHub desconectado",
        description: "Tu cuenta de GitHub ha sido desconectada correctamente.",
      });

      return true;
    } catch (error) {
      console.error('Error disconnecting GitHub:', error);
      toast({
        title: "Error",
        description: "No se pudo desconectar GitHub",
        variant: "destructive",
      });
      return false;
    }
  }, [user, connection]);

  // Sync project files to GitHub
  const syncProject = useCallback(async (
    repoName: string,
    files: ProjectFile[],
    options?: {
      isNewRepo?: boolean;
      isPrivate?: boolean;
      commitMessage?: string;
    }
  ) => {
    if (!user || !connection) {
      toast({
        title: "Error",
        description: "Debes conectar tu cuenta de GitHub primero",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('github-sync', {
        body: {
          repoName,
          files,
          isNewRepo: options?.isNewRepo ?? false,
          isPrivate: options?.isPrivate ?? false,
          commitMessage: options?.commitMessage ?? `Update from Chester Code IA - ${new Date().toISOString()}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "¡Sincronizado!",
          description: `Proyecto sincronizado con ${data.repoUrl}`,
        });

        // Reload connection to get updated repo info
        await loadConnection();

        return data;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error syncing to GitHub:', error);
      toast({
        title: "Error al sincronizar",
        description: error.message || "No se pudo sincronizar el proyecto con GitHub",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [user, connection, loadConnection]);

  // Legacy upload function (kept for backward compatibility)
  const uploadToGitHub = useCallback(async (
    buildIdOrCode: string | { html: string; css: string; js: string; projectName?: string }, 
    repoName: string, 
    isNewRepo: boolean = false
  ) => {
    if (!user || !connection) {
      toast({
        title: "Error",
        description: "Debes conectar tu cuenta de GitHub primero",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsUploading(true);

      // Check if we're passing code directly or a buildId
      const isDirectCode = typeof buildIdOrCode === 'object';

      const { data, error } = await supabase.functions.invoke('github-upload', {
        body: isDirectCode 
          ? { 
              repoName, 
              isNewRepo,
              directCode: buildIdOrCode,
            }
          : { 
              buildId: buildIdOrCode, 
              repoName, 
              isNewRepo 
            },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "¡Subido correctamente!",
          description: `Tu proyecto ha sido subido a ${data.repoUrl}`,
        });

        // Reload connection to get updated repo info
        await loadConnection();

        return data;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error uploading to GitHub:', error);
      toast({
        title: "Error al subir",
        description: error.message || "No se pudo subir el proyecto a GitHub",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, connection, loadConnection]);

  return {
    connection,
    status,
    isLoading,
    isConnecting,
    isUploading,
    isSyncing,
    isConnected: !!connection?.github_username || (status?.connected ?? false),
    initiateOAuth,
    disconnect,
    uploadToGitHub,
    syncProject,
    reloadConnection: loadConnection,
    fetchStatus,
  };
};
