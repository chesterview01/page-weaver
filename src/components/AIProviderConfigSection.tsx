import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from '@/hooks/use-toast';

interface AIProviderConfig {
  id: string;
  provider: 'lovable' | 'gemini';
  gemini_api_key: string | null;
}

const AIProviderConfigSection: React.FC = () => {
  const [config, setConfig] = useState<AIProviderConfig | null>(null);
  const [provider, setProvider] = useState<'lovable' | 'gemini'>('lovable');
  const [geminiKey, setGeminiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('ai_provider_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setConfig(data as AIProviderConfig);
        setProvider((data.provider as 'lovable' | 'gemini') || 'lovable');
        setGeminiKey(data.gemini_api_key || '');
      }
    } catch (e) {
      console.error('Error loading AI config:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        provider,
        gemini_api_key: geminiKey || null,
        updated_by: user?.id,
      };

      if (config?.id) {
        const { error } = await supabase
          .from('ai_provider_config')
          .update(payload)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ai_provider_config')
          .insert(payload);
        if (error) throw error;
      }

      toast({
        title: 'Configuración guardada',
        description: `Proveedor de IA activo: ${provider === 'lovable' ? 'Lovable AI' : 'Gemini'}`,
      });
      await load();
    } catch (e: any) {
      console.error('Error saving AI config:', e);
      toast({
        title: 'Error',
        description: e.message || 'No se pudo guardar la configuración.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Sistema de IA Dual
        </CardTitle>
        <CardDescription>
          Elige qué proveedor de IA usará la plataforma para generar el código de los usuarios.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Proveedor activo</Label>
          <RadioGroup value={provider} onValueChange={(v) => setProvider(v as 'lovable' | 'gemini')} className="grid gap-3">
            <label className="flex items-start gap-3 p-4 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="lovable" id="prov-lovable" className="mt-1" />
              <div>
                <div className="font-medium">Lovable AI (por defecto)</div>
                <p className="text-sm text-muted-foreground">
                  Usa el gateway de Lovable con Gemini 3 Flash. Recomendado.
                </p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-4 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="gemini" id="prov-gemini" className="mt-1" />
              <div>
                <div className="font-medium">Gemini API (directo)</div>
                <p className="text-sm text-muted-foreground">
                  Usa tu propia API Key de Google Gemini. Requiere la clave configurada abajo.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gemini-key">Gemini API Key</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="gemini-key"
                type={showKey ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showKey ? 'Ocultar' : 'Mostrar'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Obtén tu API Key en{' '}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              Google AI Studio
            </a>
            . Se guarda de forma segura en la base de datos y solo el administrador puede leerla.
          </p>
        </div>

        <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar configuración
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIProviderConfigSection;
