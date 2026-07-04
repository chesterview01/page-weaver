import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UserSettings {
  id: string;
  custom_api_url: string | null;
  custom_api_key: string | null;
  use_custom_ai: boolean;
  auto_save_enabled: boolean;
  narrative_style: 'detailed' | 'minimal' | 'technical';
  preview_in_new_tab: boolean;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        // Silent fail - fall back to defaults
        console.warn('user_settings load skipped:', error.message);
        setSettings(null);
      } else if (data) {
        setSettings(data as UserSettings);
      }
    } catch (error) {
      console.warn('Error loading settings (silent):', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);

      // Log the action
      await supabase.from('audit_logs').insert({
        action: 'settings_updated',
        entity_type: 'user_settings',
        entity_id: settings.id,
        details: updates,
      });

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han aplicado correctamente.",
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    }
  }, [settings]);

  const testCustomAI = useCallback(async (apiUrl: string, apiKey: string) => {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10,
        }),
      });

      if (response.ok) {
        toast({
          title: "Conexión exitosa",
          description: "La API personalizada está funcionando correctamente.",
        });
        return true;
      } else {
        throw new Error('API response not ok');
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: "No se pudo conectar con la API personalizada.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  return {
    settings,
    isLoading,
    updateSettings,
    testCustomAI,
    reloadSettings: loadSettings,
  };
};
