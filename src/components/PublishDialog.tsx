import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Loader2, CheckCircle2, AlertCircle, Rocket, ExternalLink, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PublishDialogProps {
  projectId: string | null;
  projectName: string;
  currentCode: string;
  onPublished?: () => void;
}

const PublishDialog: React.FC<PublishDialogProps> = ({
  projectId,
  projectName,
  currentCode,
  onPublished,
}) => {
  const [open, setOpen] = useState(false);
  const [useCustomDomain, setUseCustomDomain] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [domainStatus, setDomainStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [mainDomain, setMainDomain] = useState('chestercodeia.com');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadDeploymentConfig();
  }, []);

  const loadDeploymentConfig = async () => {
    try {
      // First try to use the secure RPC to avoid exposing sensitive tokens in the table query
      const { data: rpcDomain, error: rpcError } = await supabase.rpc('get_main_deployment_domain');

      if (!rpcError && rpcDomain) {
        setMainDomain(rpcDomain);
        return;
      }

      // If RPC failed or wasn't available, attempt fallback direct query safely (only for admins)
      // Any RLS errors or 406 will be caught and handled silently
      const { data, error: queryError } = await supabase
        .from('deployment_config')
        .select('main_domain')
        .eq('is_active', true)
        .maybeSingle();

      if (!queryError && data?.main_domain) {
        setMainDomain(data.main_domain);
      } else {
        // Silent fallback to default domain to prevent console noise/errors
        setMainDomain('chestercodeia.com');
      }
    } catch (error) {
      // Handle silently to keep the interface working flawlessly with the default domain
      setMainDomain('chestercodeia.com');
      console.warn('Silent fallback to default domain chestercodeia.com:', error);
    }
  };

  const subdomain = projectName
    ? projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50)
    : 'miproyecto';

  const defaultDomain = `${subdomain}.${mainDomain}`;

  const validateDomain = (domain: string) => {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const handleValidateDomain = () => {
    if (!customDomain) return;
    setIsValidating(true);
    setTimeout(() => {
      if (validateDomain(customDomain)) {
        setDomainStatus('valid');
      } else {
        setDomainStatus('invalid');
      }
      setIsValidating(false);
    }, 1000);
  };

  const extractCodeParts = (code: string) => {
    let html = '';
    let css = '';
    let js = '';

    // Try to extract HTML
    const htmlMatch = code.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    } else if (code.includes('<')) {
      html = code;
    }

    // Extract CSS from style tags
    const styleMatches = code.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    if (styleMatches) {
      css = styleMatches.map(s => s.replace(/<\/?style[^>]*>/gi, '')).join('\n');
    }

    // Extract JS from script tags
    const scriptMatches = code.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatches) {
      js = scriptMatches
        .filter(s => !s.includes('src='))
        .map(s => s.replace(/<\/?script[^>]*>/gi, ''))
        .join('\n');
    }

    return { html, css, js };
  };

  const handlePublish = async () => {
    if (!projectId) {
      toast({
        title: "Error",
        description: "Primero debes guardar el proyecto.",
        variant: "destructive",
      });
      return;
    }

    if (useCustomDomain && domainStatus !== 'valid') {
      toast({
        title: "Error",
        description: "Por favor valida el dominio antes de publicar.",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    try {
      const { html, css, js } = extractCodeParts(currentCode);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authenticated session');
      }

      const response = await supabase.functions.invoke('vercel-deploy', {
        body: {
          projectId,
          projectName,
          html,
          css,
          js,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Deployment failed');
      }

      const data = response.data;

      if (!data.success) {
        throw new Error(data.error || 'Deployment failed');
      }

      // Update with custom domain if selected
      if (useCustomDomain && customDomain) {
        await supabase
          .from('projects')
          .update({ 
            custom_domain: customDomain,
            domain_status: 'pending' 
          })
          .eq('id', projectId);
      }

      const finalUrl = useCustomDomain ? customDomain : data.subdomain;
      setPublishedUrl(data.deploymentUrl || `https://${finalUrl}`);

      toast({
        title: "¡Proyecto publicado!",
        description: useCustomDomain
          ? `Tu proyecto estará disponible en ${customDomain} una vez que configures los DNS.`
          : `Tu proyecto está disponible en ${data.subdomain}`,
      });

      onPublished?.();
    } catch (error) {
      const err = error as Error;
      console.error('Error publishing:', err);
      toast({
        title: "Error al publicar",
        description: err.message || "No se pudo publicar el proyecto.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "URL copiada al portapapeles",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm" disabled={!currentCode}>
          <Rocket className="h-4 w-4 mr-2" />
          Publicar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar proyecto</DialogTitle>
          <DialogDescription>
            Despliega tu proyecto en un subdominio único
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {publishedUrl ? (
            // Success state
            <div className="space-y-4">
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-600">
                  ¡Tu proyecto ha sido publicado exitosamente!
                </AlertDescription>
              </Alert>

              <div className="p-4 rounded-lg bg-muted/50 border">
                <Label className="text-sm text-muted-foreground">URL de tu proyecto:</Label>
                <div className="flex items-center gap-2 mt-2">
                  <code className="flex-1 text-sm font-mono text-primary truncate">
                    {publishedUrl}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(publishedUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => window.open(publishedUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => {
                  setPublishedUrl(null);
                  setOpen(false);
                }}
              >
                Cerrar
              </Button>
            </div>
          ) : (
            // Publish form
            <>
              {/* Default domain */}
              <div className="p-4 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Subdominio asignado</span>
                </div>
                <p className="text-sm font-mono text-primary">{defaultDomain}</p>
              </div>

              {/* Custom domain toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Usar dominio propio</Label>
                  <p className="text-sm text-muted-foreground">
                    Configura tu propio dominio personalizado
                  </p>
                </div>
                <Switch
                  checked={useCustomDomain}
                  onCheckedChange={(checked) => {
                    setUseCustomDomain(checked);
                    if (!checked) {
                      setDomainStatus('idle');
                      setCustomDomain('');
                    }
                  }}
                />
              </div>

              {/* Custom domain input */}
              {useCustomDomain && (
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
                        disabled={!customDomain || isValidating}
                      >
                        {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Validar'}
                      </Button>
                    </div>
                  </div>

                  {domainStatus === 'valid' && (
                    <Alert className="border-green-500/50 bg-green-500/10">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-600">
                        Dominio válido. Configura los DNS después de publicar.
                      </AlertDescription>
                    </Alert>
                  )}

                  {domainStatus === 'invalid' && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        El formato del dominio no es válido.
                      </AlertDescription>
                    </Alert>
                  )}

                  {domainStatus === 'valid' && (
                    <div className="p-3 rounded-lg bg-muted/50 border text-xs space-y-1">
                      <p className="font-medium">Después de publicar, configura:</p>
                      <p className="font-mono">CNAME @ → cname.vercel-dns.com</p>
                      <p className="font-mono">CNAME www → cname.vercel-dns.com</p>
                    </div>
                  )}
                </div>
              )}

              <Button
                className="w-full"
                onClick={handlePublish}
                disabled={isPublishing || (useCustomDomain && domainStatus !== 'valid')}
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desplegando en Vercel...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Publicar ahora
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishDialog;