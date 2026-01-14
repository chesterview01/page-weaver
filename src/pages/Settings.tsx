import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Bot, Settings2, Trash2, ExternalLink, Save, Globe, AlertCircle, CheckCircle2, Code, FileCode, ChevronDown, ChevronUp, Database, Pencil, Eye, EyeOff, Loader2, Zap, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/hooks/useSettings';
import { useProjects, Project, ProjectBuild } from '@/hooks/useProjects';
import { IntegrationsPanel } from '@/components/IntegrationsPanel';
import { SupabaseConnector } from '@/components/SupabaseConnector';
import { ProjectsGrid } from '@/components/ProjectsGrid';
import { toast } from '@/hooks/use-toast';
const ProjectCard: React.FC<{
  project: Project;
  onOpen: () => void;
  onDelete: () => void;
  getProjectBuilds: (projectId: string) => Promise<ProjectBuild[]>;
}> = ({ project, onOpen, onDelete, getProjectBuilds }) => {
  const [expanded, setExpanded] = useState(false);
  const [builds, setBuilds] = useState<ProjectBuild[]>([]);
  const [loadingBuilds, setLoadingBuilds] = useState(false);

  const handleExpand = async () => {
    if (!expanded && builds.length === 0) {
      setLoadingBuilds(true);
      const projectBuilds = await getProjectBuilds(project.id);
      setBuilds(projectBuilds);
      setLoadingBuilds(false);
    }
    setExpanded(!expanded);
  };

  const isPublished = project.is_published;

  return (
    <div className="rounded-lg bg-muted/50 border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 hover:bg-muted/80 transition-colors">
        <div className="flex-1 cursor-pointer" onClick={handleExpand}>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">{project.name}</h3>
            <Badge variant={isPublished ? "default" : "secondary"} className="text-xs">
              {isPublished ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Publicado
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 mr-1" />
                  Borrador
                </>
              )}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {project.description || 'Sin descripción'}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span>
              Creado: {new Date(project.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <span>
              Actualizado: {new Date(project.updated_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SupabaseConnector projectId={project.id} projectName={project.name} compact />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExpand}
            title={expanded ? "Ocultar versiones" : "Ver versiones"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpen}
            title="Abrir proyecto"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (confirm('¿Estás seguro de eliminar este proyecto?')) {
                onDelete();
              }
            }}
            title="Eliminar proyecto"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-border bg-background/50 p-4">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Code className="h-4 w-4" />
            Versiones guardadas ({builds.length})
          </h4>
          
          {loadingBuilds ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando versiones...
            </div>
          ) : builds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay versiones guardadas.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {builds.map((build, index) => (
                <div key={build.id} className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{build.label}</span>
                    {index === 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">Última</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(build.created_at).toLocaleDateString('es-ES', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="mt-3 p-2 rounded bg-muted/30 text-xs text-muted-foreground">
            <strong>Archivos incluidos:</strong> index.html, style.css, script.js
          </div>
        </div>
      )}
    </div>
  );
};

const Settings = () => {
  const navigate = useNavigate();
  const { settings, isLoading: settingsLoading, updateSettings, testCustomAI } = useSettings();
  const { projects, isLoading: projectsLoading, deleteProject, getProjectBuilds } = useProjects();

  const [customApiUrl, setCustomApiUrl] = useState(settings?.custom_api_url || '');
  const [customApiKey, setCustomApiKey] = useState(settings?.custom_api_key || '');
  const [isTesting, setIsTesting] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  React.useEffect(() => {
    if (settings) {
      setCustomApiUrl(settings.custom_api_url || '');
      setCustomApiKey(settings.custom_api_key || '');
    }
  }, [settings]);

  const handleTestConnection = async () => {
    if (!customApiUrl || !customApiKey) return;
    setIsTesting(true);
    await testCustomAI(customApiUrl, customApiKey);
    setIsTesting(false);
  };

  const handleSaveAIConfig = async () => {
    await updateSettings({
      custom_api_url: customApiUrl || null,
      custom_api_key: customApiKey || null,
      use_custom_ai: !!(customApiUrl && customApiKey),
    });
  };

  const validateDomain = (domain: string) => {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const handleValidateDomain = () => {
    if (!customDomain) return;
    setDomainStatus('validating');
    // Simulate validation
    setTimeout(() => {
      if (validateDomain(customDomain)) {
        setDomainStatus('valid');
      } else {
        setDomainStatus('invalid');
      }
    }, 1000);
  };

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-card">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Proyectos</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Integraciones</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">IA</span>
            </TabsTrigger>
            <TabsTrigger value="domain" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Dominio</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">Preferencias</span>
            </TabsTrigger>
          </TabsList>

          {/* Projects Tab - Now with modern grid */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  Mis Proyectos Guardados
                </CardTitle>
                <CardDescription>
                  Todos los proyectos guardados desde la tabla builds. Abre, restaura o elimina proyectos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectsGrid 
                  onOpenBuild={(build) => {
                    // Store build data in sessionStorage and navigate to editor
                    sessionStorage.setItem('restoreBuild', JSON.stringify({
                      html: build.html,
                      css: build.css,
                      js: build.js,
                      label: build.label,
                    }));
                    navigate('/app');
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-4">
            <IntegrationsPanel />
          </TabsContent>

          {/* AI Config Tab - DeepSeek */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Configuración de IA - DeepSeek
                </CardTitle>
                <CardDescription>
                  Conecta tu API Key de DeepSeek para usar sus modelos de IA. Si no configuras nada, se usará Lovable AI por defecto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="p-4 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings?.use_custom_ai && settings?.custom_api_key ? (
                        <>
                          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                          <div>
                            <p className="font-medium text-foreground">Conectado a DeepSeek</p>
                            <p className="text-xs text-muted-foreground">Usando API personalizada</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">Sin configurar</p>
                            <p className="text-xs text-muted-foreground">Usando Lovable AI por defecto</p>
                          </div>
                        </>
                      )}
                    </div>
                    {settings?.use_custom_ai && settings?.custom_api_key && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateSettings({ 
                            use_custom_ai: false, 
                            custom_api_key: null, 
                            custom_api_url: null 
                          });
                          setCustomApiKey('');
                          setCustomApiUrl('');
                          toast({
                            title: "DeepSeek desconectado",
                            description: "Ahora se usa Lovable AI por defecto.",
                          });
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>¿No tienes API Key?</AlertTitle>
                    <AlertDescription>
                      Obtén tu API Key en{' '}
                      <a 
                        href="https://platform.deepseek.com/api_keys" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        platform.deepseek.com
                      </a>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="api-url">URL de la API</Label>
                    <Input
                      id="api-url"
                      placeholder="https://api.deepseek.com/v1/chat/completions"
                      value={customApiUrl}
                      onChange={(e) => setCustomApiUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL por defecto de DeepSeek: https://api.deepseek.com/v1/chat/completions
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key de DeepSeek</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Tu clave se guarda de forma segura y nunca se comparte
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={!customApiUrl || !customApiKey || isTesting}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Validando...
                        </>
                      ) : (
                        'Probar conexión'
                      )}
                    </Button>
                    <Button 
                      onClick={handleSaveAIConfig}
                      disabled={!customApiUrl || !customApiKey}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar configuración
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Domain Tab */}
          <TabsContent value="domain" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dominio Personalizado</CardTitle>
                <CardDescription>
                  Configura tu propio dominio para publicar tus proyectos. Si no configuras ninguno, 
                  se usará el dominio por defecto de Chester Code IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Información importante</AlertTitle>
                  <AlertDescription>
                    Para usar un dominio personalizado, necesitas configurar los registros DNS en tu proveedor de dominios.
                    Añade un registro A apuntando a nuestra IP y un registro TXT para verificación.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-domain">Tu dominio</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom-domain"
                        placeholder="miproyecto.com"
                        value={customDomain}
                        onChange={(e) => {
                          setCustomDomain(e.target.value);
                          setDomainStatus('idle');
                        }}
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleValidateDomain}
                        disabled={!customDomain || domainStatus === 'validating'}
                      >
                        {domainStatus === 'validating' ? 'Validando...' : 'Validar'}
                      </Button>
                    </div>
                  </div>

                  {domainStatus === 'valid' && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertTitle className="text-green-500">Dominio válido</AlertTitle>
                      <AlertDescription>
                        El formato del dominio es correcto. Configura los siguientes registros DNS:
                      </AlertDescription>
                    </Alert>
                  )}

                  {domainStatus === 'invalid' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Dominio inválido</AlertTitle>
                      <AlertDescription>
                        El formato del dominio no es válido. Ejemplo correcto: miproyecto.com
                      </AlertDescription>
                    </Alert>
                  )}

                  {domainStatus === 'valid' && (
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50 border border-border">
                      <h4 className="font-medium">Configuración DNS requerida:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-3 gap-2 p-2 bg-background rounded">
                          <span className="font-mono text-muted-foreground">Tipo</span>
                          <span className="font-mono text-muted-foreground">Nombre</span>
                          <span className="font-mono text-muted-foreground">Valor</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-2 bg-background rounded">
                          <span className="font-mono">A</span>
                          <span className="font-mono">@</span>
                          <span className="font-mono">185.158.133.1</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-2 bg-background rounded">
                          <span className="font-mono">A</span>
                          <span className="font-mono">www</span>
                          <span className="font-mono">185.158.133.1</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-2 bg-background rounded">
                          <span className="font-mono">TXT</span>
                          <span className="font-mono">_lovable</span>
                          <span className="font-mono text-xs">lovable_verify=abc123</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        La propagación DNS puede tardar hasta 72 horas. El SSL se configurará automáticamente.
                      </p>
                      <Button className="w-full">
                        <Globe className="h-4 w-4 mr-2" />
                        Conectar dominio
                      </Button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-2">Dominio actual</h4>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">tuproyecto.chestercode.ia</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary/20 text-primary">Por defecto</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preferencias</CardTitle>
                <CardDescription>
                  Personaliza el comportamiento de la aplicación.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Guardado automático</Label>
                    <p className="text-sm text-muted-foreground">
                      Guarda automáticamente cada build generado
                    </p>
                  </div>
                  <Switch
                    checked={settings?.auto_save_enabled || false}
                    onCheckedChange={(checked) => updateSettings({ auto_save_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Vista previa en nueva pestaña</Label>
                    <p className="text-sm text-muted-foreground">
                      Abre la vista previa en una nueva pestaña del navegador
                    </p>
                  </div>
                  <Switch
                    checked={settings?.preview_in_new_tab || false}
                    onCheckedChange={(checked) => updateSettings({ preview_in_new_tab: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estilo de narración</Label>
                  <Select
                    value={settings?.narrative_style || 'detailed'}
                    onValueChange={(value) => updateSettings({ narrative_style: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="minimal">Mínimo - Respuestas breves</SelectItem>
                      <SelectItem value="detailed">Detallado - Explicaciones completas</SelectItem>
                      <SelectItem value="technical">Técnico - Con detalles del código</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define cómo la IA describe lo que está construyendo
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
