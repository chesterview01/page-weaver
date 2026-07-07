import React, { useState } from 'react';
import { ShieldCheck, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCreateSubmission } from '@/hooks/useProjectSubmissions';

interface ReviewRequestModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId?: string | null;
  defaultProjectName?: string;
}

const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  open,
  onOpenChange,
  projectId,
  defaultProjectName,
}) => {
  const { create, submitting } = useCreateSubmission();
  const [projectName, setProjectName] = useState(defaultProjectName || 'Mi proyecto');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  React.useEffect(() => {
    if (open) {
      setProjectName(defaultProjectName || 'Mi proyecto');
      setMessage('');
      setSuccess(false);
    }
  }, [open, defaultProjectName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 10) {
      toast.error('Cuéntanos un poco más (mínimo 10 caracteres).');
      return;
    }
    const { error } = await create({
      project_id: projectId || null,
      project_name: projectName.trim(),
      custom_message: message.trim(),
    });
    if (error) {
      toast.error('No se pudo enviar la solicitud. Intenta de nuevo.');
      return;
    }
    setSuccess(true);
    toast.success('Solicitud enviada. Nuestro equipo la revisará pronto.');
    setTimeout(() => onOpenChange(false), 1400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg border-white/10 bg-[hsl(220_40%_7%/0.85)] backdrop-blur-xl shadow-2xl shadow-primary/10">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-white/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Solicitar Revisión para Producción</DialogTitle>
              <DialogDescription className="mt-1">
                Nuestro equipo auditará tu proyecto antes del lanzamiento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-sm text-muted-foreground">Recibimos tu solicitud correctamente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="project-name">Nombre del proyecto</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                maxLength={120}
                required
                className="bg-white/[0.03] border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensaje o requerimientos</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos qué esperas de la revisión, dudas, o áreas específicas a auditar…"
                rows={6}
                maxLength={2000}
                required
                className="bg-white/[0.03] border-white/10 resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar solicitud
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReviewRequestModal;
