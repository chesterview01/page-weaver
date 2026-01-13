import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Loader2, CheckCircle2, AlertCircle, Rocket } from 'lucide-react';
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

  const defaultDomain = projectName
    ? `${projectName.toLowerCase().replace(/\s+/g, '-')}.chestercode.app`
    : 'miproyecto.chestercode.app';

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
      const updates: Record<string, unknown> = {
        is_published: true,
        domain_status: useCustomDomain ? 'pending' : 'default',
      };

      if (useCustomDomain && customDomain) {
        updates.custom_domain = customDomain;
      }

      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) throw error;

      toast({
        title: "¡Proyecto publicado!",
        description: useCustomDomain
          ? `Tu proyecto estará disponible en ${customDomain} una vez que configures los DNS.`
          : `Tu proyecto está disponible en ${defaultDomain}`,
      });

      setOpen(false);
      onPublished?.();
    } catch (error) {
      console.error('Error publishing:', error);
      toast({
        title: "Error",
        description: "No se pudo publicar el proyecto.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
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
            Configura cómo quieres publicar tu proyecto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Default domain */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Dominio por defecto</span>
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
                  <p className="font-mono">A @ → 185.158.133.1</p>
                  <p className="font-mono">A www → 185.158.133.1</p>
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
                Publicando...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                Publicar ahora
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PublishDialog;
