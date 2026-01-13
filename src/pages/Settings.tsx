import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Bot, Settings2, Trash2, ExternalLink, Save, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSettings } from '@/hooks/useSettings';
import { useProjects } from '@/hooks/useProjects';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, isLoading: settingsLoading, updateSettings, testCustomAI } = useSettings();
  const { projects, isLoading: projectsLoading, deleteProject } = useProjects();

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
          <TabsList className="grid w-full grid-cols-4 bg-card">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Mis Proyectos</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span className="hidden sm:inline">Cambiar IA</span>
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

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Mis Proyectos</CardTitle>
                <CardDescription>
                  Gestiona tus proyectos guardados. Puedes abrir, editar o eliminar cualquier proyecto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projectsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando proyectos...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tienes proyectos guardados aún.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">{project.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {project.description || 'Sin descripción'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Actualizado: {new Date(project.updated_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/app?project=${project.id}`)}
                            title="Abrir proyecto"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProject(project.id)}
                            title="Eliminar proyecto"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Config Tab */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de IA</CardTitle>
                <CardDescription>
                  Configura una API de IA personalizada. Si no configuras nada, se usará Lovable AI por defecto.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Usar IA personalizada</Label>
                    <p className="text-sm text-muted-foreground">
                      Activa esta opción para usar tu propia API de IA
                    </p>
                  </div>
                  <Switch
                    checked={settings?.use_custom_ai || false}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        updateSettings({ use_custom_ai: false });
                      }
                    }}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="api-url">URL de la API</Label>
                    <Input
                      id="api-url"
                      placeholder="https://api.example.com/v1/chat/completions"
                      value={customApiUrl}
                      onChange={(e) => setCustomApiUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      La URL debe ser compatible con el formato de OpenAI
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={!customApiUrl || !customApiKey || isTesting}
                    >
                      {isTesting ? 'Probando...' : 'Probar conexión'}
                    </Button>
                    <Button onClick={handleSaveAIConfig}>
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
