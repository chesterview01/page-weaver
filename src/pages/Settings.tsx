import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Bot, Settings2, Trash2, ExternalLink, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import { useProjects } from '@/hooks/useProjects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Settings = () => {
  const navigate = useNavigate();
  const { settings, isLoading: settingsLoading, updateSettings, testCustomAI } = useSettings();
  const { projects, isLoading: projectsLoading, deleteProject } = useProjects();

  const [customApiUrl, setCustomApiUrl] = useState(settings?.custom_api_url || '');
  const [customApiKey, setCustomApiKey] = useState(settings?.custom_api_key || '');
  const [isTesting, setIsTesting] = useState(false);

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
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Ajustes</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Mis Proyectos
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Cambiar IA
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Preferencias
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
                            onClick={() => navigate(`/?project=${project.id}`)}
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
