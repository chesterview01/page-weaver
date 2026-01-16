import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Globe, Loader2, CheckCircle2, AlertCircle, 
  Server, Key, Building2, RefreshCw 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DeploymentConfig {
  id: string;
  main_domain: string;
  vercel_token: string | null;
  vercel_team_id: string | null;
  is_active: boolean;
}

export const DeploymentConfigSection: React.FC = () => {
  const [config, setConfig] = useState<DeploymentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'error'>('idle');

  const [mainDomain, setMainDomain] = useState('chestercodeia.com');
  const [vercelToken, setVercelToken] = useState('');
  const [vercelTeamId, setVercelTeamId] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('deployment_config')
        .select('*')
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setConfig(data);
        setMainDomain(data.main_domain || 'chestercodeia.com');
        setVercelToken(data.vercel_token || '');
        setVercelTeamId(data.vercel_team_id || '');
        setConnectionStatus(data.vercel_token ? 'connected' : 'idle');
      }
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testVercelConnection = async () => {
    if (!vercelToken) {
      toast({
        title: "Error",
        description: "Ingresa el token de Vercel primero.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      let url = 'https://api.vercel.com/v9/projects';
      if (vercelTeamId) {
        url += `?teamId=${vercelTeamId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${vercelToken}`,
        },
      });

      if (response.ok) {
        setConnectionStatus('connected');
        toast({
          title: "Conexión exitosa",
          description: "Vercel está configurado correctamente.",
        });
      } else {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to connect');
      }
    } catch (error: any) {
      setConnectionStatus('error');
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con Vercel.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const updates = {
        main_domain: mainDomain,
        vercel_token: vercelToken || null,
        vercel_team_id: vercelTeamId || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (config) {
        const { error } = await supabase
          .from('deployment_config')
          .update(updates)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('deployment_config')
          .insert(updates);

        if (error) throw error;
      }

      toast({
        title: "Configuración guardada",
        description: "Los ajustes de despliegue han sido actualizados.",
      });

      await loadConfig();
    } catch (error: any) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuración de despliegue
            </CardTitle>
            <CardDescription>
              Configura Vercel para publicar proyectos automáticamente
            </CardDescription>
          </div>
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
            className={connectionStatus === 'connected' ? 'bg-green-500/10 text-green-600 border-green-500/30' : ''}
          >
            {connectionStatus === 'connected' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {connectionStatus === 'connected' ? 'Conectado' : 'Sin configurar'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Domain */}
        <div className="space-y-2">
          <Label htmlFor="main-domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Dominio principal
          </Label>
          <Input
            id="main-domain"
            placeholder="chestercodeia.com"
            value={mainDomain}
            onChange={(e) => setMainDomain(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Los proyectos se publicarán como subdominios: proyecto.{mainDomain}
          </p>
        </div>

        {/* Vercel Token */}
        <div className="space-y-2">
          <Label htmlFor="vercel-token" className="flex items-center gap-2">
            <Key className="h-4 w-4 text-muted-foreground" />
            Token de Vercel
          </Label>
          <Input
            id="vercel-token"
            type="password"
            placeholder="••••••••••••••••"
            value={vercelToken}
            onChange={(e) => {
              setVercelToken(e.target.value);
              setConnectionStatus('idle');
            }}
          />
          <p className="text-xs text-muted-foreground">
            Genera un token en{' '}
            <a 
              href="https://vercel.com/account/tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              vercel.com/account/tokens
            </a>
          </p>
        </div>

        {/* Team ID (optional) */}
        <div className="space-y-2">
          <Label htmlFor="vercel-team" className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Team ID (opcional)
          </Label>
          <Input
            id="vercel-team"
            placeholder="team_xxx..."
            value={vercelTeamId}
            onChange={(e) => setVercelTeamId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Solo si usas una cuenta de equipo en Vercel
          </p>
        </div>

        {/* Connection status alerts */}
        {connectionStatus === 'connected' && (
          <Alert className="border-green-500/50 bg-green-500/10">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-600">
              Conexión con Vercel verificada. Los usuarios pueden publicar proyectos.
            </AlertDescription>
          </Alert>
        )}

        {connectionStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se pudo conectar con Vercel. Verifica el token y vuelve a intentar.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={testVercelConnection}
            disabled={isTesting || !vercelToken}
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Probando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Probar conexión
              </>
            )}
          </Button>
          <Button onClick={saveConfig} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar configuración'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeploymentConfigSection;