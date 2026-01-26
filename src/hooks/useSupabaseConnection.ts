import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConnection {
  id: string;
  user_id: string;
  supabase_url: string;
  supabase_service_key: string;
  project_name: string | null;
  is_active: boolean;
  last_validated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ExternalSupabaseClient {
  connectionId: string;
  client: SupabaseClient;
  url: string;
}

export const useSupabaseConnection = () => {
  const [connection, setConnection] = useState<SupabaseConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [externalClient, setExternalClient] = useState<ExternalSupabaseClient | null>(null);

  // Load active connection for current user
  const loadConnection = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnection(null);
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('supabase_connections')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setConnection(data as SupabaseConnection | null);

      // Initialize external client if connected
      if (data?.supabase_url && data?.supabase_service_key) {
        const client = createClient(data.supabase_url, data.supabase_service_key);
        setExternalClient({
          connectionId: data.id,
          client,
          url: data.supabase_url,
        });
      }
    } catch (error) {
      console.error('Error loading connection:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConnection();
  }, [loadConnection]);

  // Validate connection using POST to REST API
  const validateConnection = async (
    supabaseUrl: string,
    serviceRoleKey: string
  ): Promise<{ valid: boolean; message: string }> => {
    try {
      // Normalize URL
      const normalizedUrl = supabaseUrl.replace(/\/$/, '');
      
      // Make a POST request to the REST API endpoint
      const response = await fetch(`${normalizedUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({}),
      });

      // 400 is expected (no table specified), but it means credentials are valid
      // 401/403 means invalid credentials
      if (response.status === 401 || response.status === 403) {
        return { valid: false, message: 'Credenciales inválidas. Verifica tu service_role key.' };
      }

      // Also try a simple GET to verify
      const getResponse = await fetch(`${normalizedUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
      });

      if (getResponse.status === 401 || getResponse.status === 403) {
        return { valid: false, message: 'Credenciales inválidas. Verifica tu service_role key.' };
      }

      return { valid: true, message: 'Conexión exitosa' };
    } catch (error: any) {
      console.error('Validation error:', error);
      return { 
        valid: false, 
        message: error.message || 'Error de conexión. Verifica la URL de Supabase.' 
      };
    }
  };

  // Connect to external Supabase
  const connectSupabase = useCallback(async (
    supabaseUrl: string,
    serviceRoleKey: string,
    projectName?: string
  ): Promise<boolean> => {
    setIsConnecting(true);
    try {
      // Validate connection first
      const validation = await validateConnection(supabaseUrl, serviceRoleKey);
      if (!validation.valid) {
        toast({
          title: "Error de validación",
          description: validation.message,
          variant: "destructive",
        });
        return false;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const normalizedUrl = supabaseUrl.replace(/\/$/, '');

      // Check if connection exists for this user
      const { data: existing } = await supabase
        .from('supabase_connections')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Update existing connection
        const { error } = await supabase
          .from('supabase_connections')
          .update({
            supabase_url: normalizedUrl,
            supabase_service_key: serviceRoleKey,
            project_name: projectName || null,
            is_active: true,
            last_validated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new connection
        const { error } = await supabase
          .from('supabase_connections')
          .insert({
            user_id: user.id,
            supabase_url: normalizedUrl,
            supabase_service_key: serviceRoleKey,
            project_name: projectName || null,
            is_active: true,
            last_validated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'supabase_manual_connection',
        entity_type: 'supabase_connection',
        entity_id: user.id,
        details: { supabase_url: normalizedUrl },
      });

      // Initialize external client
      const client = createClient(normalizedUrl, serviceRoleKey);
      setExternalClient({
        connectionId: existing?.id || 'new',
        client,
        url: normalizedUrl,
      });

      toast({
        title: "Conectado a Supabase",
        description: "La conexión se estableció correctamente.",
      });

      await loadConnection();
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
  }, [loadConnection]);

  // Disconnect from external Supabase
  const disconnectSupabase = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('supabase_connections')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'supabase_disconnected',
        entity_type: 'supabase_connection',
        entity_id: user.id,
        details: {},
      });

      setConnection(null);
      setExternalClient(null);

      toast({
        title: "Desconectado",
        description: "La conexión con Supabase ha sido desactivada.",
      });

      return true;
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "No se pudo desconectar.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Delete connection completely
  const deleteConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('supabase_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setConnection(null);
      setExternalClient(null);

      toast({
        title: "Conexión eliminada",
        description: "Los datos de conexión han sido eliminados.",
      });

      return true;
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la conexión.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // List tables from connected Supabase
  const listTables = useCallback(async (): Promise<string[]> => {
    if (!externalClient) return [];

    try {
      const response = await fetch(`${externalClient.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': connection?.supabase_service_key || '',
          'Authorization': `Bearer ${connection?.supabase_service_key}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to list tables');
      }

      const data = await response.json();
      // The response contains the OpenAPI schema with paths for each table
      if (data.paths) {
        return Object.keys(data.paths)
          .filter(path => path.startsWith('/'))
          .map(path => path.replace('/', ''));
      }
      return [];
    } catch (error) {
      console.error('Error listing tables:', error);
      return [];
    }
  }, [externalClient, connection]);

  // Query a table
  const queryTable = useCallback(async (
    tableName: string,
    options?: { select?: string; limit?: number; filters?: Record<string, any> }
  ) => {
    if (!externalClient || !connection) {
      throw new Error('No hay conexión activa');
    }

    let query = externalClient.client.from(tableName).select(options?.select || '*');
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    return await query;
  }, [externalClient, connection]);

  // Insert into a table
  const insertIntoTable = useCallback(async (
    tableName: string,
    data: Record<string, any> | Record<string, any>[]
  ) => {
    if (!externalClient) {
      throw new Error('No hay conexión activa');
    }

    return await externalClient.client.from(tableName).insert(data);
  }, [externalClient]);

  // Update a table
  const updateTable = useCallback(async (
    tableName: string,
    data: Record<string, any>,
    filters: Record<string, any>
  ) => {
    if (!externalClient) {
      throw new Error('No hay conexión activa');
    }

    let query = externalClient.client.from(tableName).update(data);
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return await query;
  }, [externalClient]);

  // Delete from a table
  const deleteFromTable = useCallback(async (
    tableName: string,
    filters: Record<string, any>
  ) => {
    if (!externalClient) {
      throw new Error('No hay conexión activa');
    }

    let query = externalClient.client.from(tableName).delete();
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    return await query;
  }, [externalClient]);

  return {
    connection,
    isLoading,
    isConnecting,
    isConnected: !!connection?.is_active,
    externalClient: externalClient?.client || null,
    connectSupabase,
    disconnectSupabase,
    deleteConnection,
    loadConnection,
    validateConnection,
    listTables,
    queryTable,
    insertIntoTable,
    updateTable,
    deleteFromTable,
  };
};
