import React, { useState, useEffect } from 'react';
import { Database, Link2, Unlink, CheckCircle2, XCircle, Loader2, RefreshCw, ExternalLink, Trash2, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useProjectIntegrations, ProjectIntegration } from '@/hooks/useProjectIntegrations';
import { useProjects } from '@/hooks/useProjects';
import { useGitHubConnection } from '@/hooks/useGitHubConnection';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

export const IntegrationsPanel: React.FC = () => {
  const { getAllIntegrations, disconnectSupabase, deleteIntegration } = useProjectIntegrations();
  const { projects } = useProjects();
  const { 
    connection: githubConnection, 
    isLoading: isGithubLoading, 
    isConnected: isGithubConnected,
    initiateOAuth,
    disconnect: disconnectGithub,
    reloadConnection,
  } = useGitHubConnection();
  
  const [integrations, setIntegrations] = useState<ProjectIntegration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [githubDisconnectConfirm, setGithubDisconnectConfirm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle GitHub OAuth callback messages
  useEffect(() => {
    const githubStatus = searchParams.get('github');
    const error = searchParams.get('error');

    if (githubStatus === 'connected') {
      toast({
        title: "¡GitHub conectado!",
        description: "Tu cuenta de GitHub ha sido conectada correctamente.",
      });
      reloadConnection();
      // Clean up URL
      searchParams.delete('github');
      setSearchParams(searchParams, { replace: true });
    }

    if (error) {
      let errorMessage = "Ocurrió un error al conectar con GitHub";
      switch (error) {
        case 'no_code':
          errorMessage = "No se recibió el código de autorización de GitHub";
          break;
        case 'no_state':
          errorMessage = "Error de sesión. Por favor, intenta de nuevo";
          break;
        case 'config_error':
          errorMessage = "Error de configuración. Contacta al administrador";
          break;
        case 'token_error':
          errorMessage = "No se pudo obtener el token de acceso de GitHub";
          break;
        case 'server_error':
          errorMessage = "Error del servidor. Por favor, intenta de nuevo";
          break;
      }
      toast({
        title: "Error de conexión",
        description: errorMessage,
        variant: "destructive",
      });
      // Clean up URL
      searchParams.delete('error');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, reloadConnection]);

  const loadIntegrations = async () => {
    setIsLoading(true);
    const data = await getAllIntegrations();
    setIntegrations(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const getProjectName = (projectId: string): string => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Proyecto desconocido';
  };

  const handleDisconnect = async (projectId: string) => {
    await disconnectSupabase(projectId);
    loadIntegrations();
  };

  const handleDelete = async (projectId: string) => {
    await deleteIntegration(projectId);
    setDeleteConfirm(null);
    loadIntegrations();
  };

  const handleGithubDisconnect = async () => {
    await disconnectGithub();
    setGithubDisconnectConfirm(false);
  };

  const connectedCount = integrations.filter(i => i.is_connected).length;

  return (
    <div className="space-y-6">
      {/* GitHub Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Github className="h-5 w-5" />
                GitHub
              </CardTitle>
              <CardDescription>
                Conecta tu cuenta de GitHub para subir proyectos a repositorios.
              </CardDescription>
            </div>
            {isGithubConnected ? (
              <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary">
                No conectado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isGithubLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : isGithubConnected && githubConnection ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Github className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">@{githubConnection.github_username}</span>
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    {githubConnection.repository_url && (
                      <a 
                        href={githubConnection.repository_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                      >
                        {githubConnection.repository_url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                <Dialog open={githubDisconnectConfirm} onOpenChange={setGithubDisconnectConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Unlink className="h-4 w-4 mr-2" />
                      Desconectar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>¿Desconectar GitHub?</DialogTitle>
                      <DialogDescription>
                        Esto eliminará la conexión con tu cuenta de GitHub (@{githubConnection.github_username}). 
                        Tus repositorios no serán afectados.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setGithubDisconnectConfirm(false)}>
                        Cancelar
                      </Button>
                      <Button variant="destructive" onClick={handleGithubDisconnect}>
                        Desconectar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              {githubConnection.repository_name && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Último repositorio:</span> {githubConnection.repository_name}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Github className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-4">
                Conecta tu cuenta de GitHub para poder subir tus proyectos directamente a repositorios.
              </p>
              <Button onClick={initiateOAuth}>
                <Github className="h-4 w-4 mr-2" />
                Conectar con GitHub
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supabase Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Integraciones de Proyectos
              </CardTitle>
              <CardDescription>
                Gestiona las conexiones de tus proyectos con servicios externos.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadIntegrations} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 border border-border mb-6">
            <div className="flex-1">
              <h4 className="font-medium">Estado de integraciones</h4>
              <p className="text-sm text-muted-foreground">
                {connectedCount} de {integrations.length} integraciones activas
              </p>
            </div>
            {connectedCount > 0 ? (
              <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Activo
              </Badge>
            ) : (
              <Badge variant="secondary">
                Sin conexiones
              </Badge>
            )}
          </div>

          {/* Integrations List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No hay integraciones configuradas</p>
              <p className="text-sm mt-1">
                Conecta tus proyectos con Supabase desde el editor.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    integration.is_connected 
                      ? 'border-green-500/30 bg-green-500/5' 
                      : 'border-border bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-lg ${
                      integration.is_connected ? 'bg-green-500/20' : 'bg-muted'
                    }`}>
                      <Database className={`h-4 w-4 ${
                        integration.is_connected ? 'text-green-600' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {getProjectName(integration.project_id)}
                        </span>
                        {integration.is_connected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {integration.supabase_url || 'No configurado'}
                      </p>
                      {integration.last_sync_at && (
                        <p className="text-xs text-muted-foreground">
                          Última sync: {new Date(integration.last_sync_at).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-2">
                    {integration.is_connected && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(integration.project_id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    )}
                    <Dialog open={deleteConfirm === integration.id} onOpenChange={(open) => setDeleteConfirm(open ? integration.id : null)}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>¿Eliminar integración?</DialogTitle>
                          <DialogDescription>
                            Esto eliminará la configuración de Supabase para "{getProjectName(integration.project_id)}". 
                            Los datos en Supabase no se verán afectados.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancelar
                          </Button>
                          <Button 
                            variant="destructive" 
                            onClick={() => handleDelete(integration.project_id)}
                          >
                            Eliminar
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Help Section */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              ¿Cómo funciona?
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Conecta tu proyecto de Supabase para persistir datos.</li>
              <li>• Los mensajes del chat y proyectos se sincronizarán automáticamente.</li>
              <li>• Usa la autenticación de Supabase para usuarios de tu app.</li>
            </ul>
            <Button variant="link" className="p-0 h-auto mt-2 text-primary" asChild>
              <a href="https://supabase.com/docs" target="_blank" rel="noopener noreferrer">
                Ver documentación de Supabase
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IntegrationsPanel;
