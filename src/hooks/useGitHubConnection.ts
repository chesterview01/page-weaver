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

export const useGitHubConnection = () => {
  const { user } = useAuthContext();
  const [connection, setConnection] = useState<GitHubConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const loadConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
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
    } catch (error) {
      console.error('Error loading GitHub connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadConnection();
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
    const scope = 'repo';
    const state = user.id; // Pass user ID as state for callback

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
    
    // Open in a new window/tab to avoid iframe restrictions
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

  const uploadToGitHub = useCallback(async (buildId: string, repoName: string, isNewRepo: boolean = false) => {
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

      const { data, error } = await supabase.functions.invoke('github-upload-project', {
        body: { buildId, repoName, isNewRepo },
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
    isLoading,
    isConnecting,
    isUploading,
    isConnected: !!connection?.github_username,
    initiateOAuth,
    disconnect,
    uploadToGitHub,
    reloadConnection: loadConnection,
  };
};
