import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface ProjectIntegration {
  id: string;
  project_id: string;
  user_id: string;
  integration_type: string;
  supabase_url: string | null;
  supabase_anon_key: string | null;
  is_connected: boolean;
  connection_status: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ExternalSupabaseClient {
  projectId: string;
  client: SupabaseClient;
}

export const useProjectIntegrations = (projectId?: string) => {
  const [integration, setIntegration] = useState<ProjectIntegration | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [externalClient, setExternalClient] = useState<ExternalSupabaseClient | null>(null);

  // Load integration for a specific project
  const loadIntegration = useCallback(async (pId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', pId)
        .eq('integration_type', 'supabase')
        .maybeSingle();

      if (error) throw error;
      setIntegration(data as ProjectIntegration | null);
      
      // If connected, initialize external client
      if (data?.is_connected && data?.supabase_url && data?.supabase_anon_key) {
        const client = createClient(data.supabase_url, data.supabase_anon_key);
        setExternalClient({ projectId: pId, client });
      }
    } catch (error) {
      console.error('Error loading integration:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      loadIntegration(projectId);
    }
  }, [projectId, loadIntegration]);

  // Connect to external Supabase
  const connectSupabase = useCallback(async (
    pId: string,
    supabaseUrl: string,
    supabaseAnonKey: string
  ): Promise<boolean> => {
    setIsConnecting(true);
    try {
      // Test connection first
      const testClient = createClient(supabaseUrl, supabaseAnonKey);
      const { error: testError } = await testClient.from('_test_connection').select('*').limit(1);
      
      // Ignore "relation does not exist" error - that's expected
      // We just want to verify the credentials work
      if (testError && !testError.message.includes('does not exist') && !testError.message.includes('permission denied')) {
        throw new Error('No se pudo conectar con Supabase. Verifica las credenciales.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Check if integration exists
      const { data: existing } = await supabase
        .from('project_integrations')
        .select('id')
        .eq('project_id', pId)
        .eq('integration_type', 'supabase')
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('project_integrations')
          .update({
            supabase_url: supabaseUrl,
            supabase_anon_key: supabaseAnonKey,
            is_connected: true,
            connection_status: 'connected',
            last_sync_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('project_integrations')
          .insert({
            project_id: pId,
            user_id: user.id,
            integration_type: 'supabase',
            supabase_url: supabaseUrl,
            supabase_anon_key: supabaseAnonKey,
            is_connected: true,
            connection_status: 'connected',
            last_sync_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'supabase_connected',
        entity_type: 'project_integration',
        entity_id: pId,
        details: { supabase_url: supabaseUrl },
      });

      // Initialize external client
      setExternalClient({ projectId: pId, client: testClient });

      toast({
        title: "Supabase conectado",
        description: "La integración con Supabase se configuró correctamente.",
      });

      await loadIntegration(pId);
      return true;
    } catch (error: any) {
      console.error('Error connecting Supabase:', error);
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con Supabase.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [loadIntegration]);

  // Disconnect from external Supabase
  const disconnectSupabase = useCallback(async (pId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_integrations')
        .update({
          is_connected: false,
          connection_status: 'disconnected',
        })
        .eq('project_id', pId)
        .eq('integration_type', 'supabase');

      if (error) throw error;

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'supabase_disconnected',
        entity_type: 'project_integration',
        entity_id: pId,
        details: {},
      });

      setExternalClient(null);
      await loadIntegration(pId);

      toast({
        title: "Supabase desconectado",
        description: "La integración ha sido desactivada.",
      });

      return true;
    } catch (error: any) {
      console.error('Error disconnecting Supabase:', error);
      toast({
        title: "Error",
        description: "No se pudo desconectar Supabase.",
        variant: "destructive",
      });
      return false;
    }
  }, [loadIntegration]);

  // Delete integration completely
  const deleteIntegration = useCallback(async (pId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('project_integrations')
        .delete()
        .eq('project_id', pId)
        .eq('integration_type', 'supabase');

      if (error) throw error;

      setIntegration(null);
      setExternalClient(null);

      toast({
        title: "Integración eliminada",
        description: "Los datos de conexión han sido eliminados.",
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la integración.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Get all integrations for a user
  const getAllIntegrations = useCallback(async (): Promise<ProjectIntegration[]> => {
    try {
      const { data, error } = await supabase
        .from('project_integrations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data as ProjectIntegration[]) || [];
    } catch (error) {
      console.error('Error loading all integrations:', error);
      return [];
    }
  }, []);

  return {
    integration,
    isLoading,
    isConnecting,
    externalClient: externalClient?.client || null,
    connectSupabase,
    disconnectSupabase,
    deleteIntegration,
    getAllIntegrations,
    loadIntegration,
  };
};
