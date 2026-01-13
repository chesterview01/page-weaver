import React, { useState } from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useProjects } from '@/hooks/useProjects';
import { toast } from '@/hooks/use-toast';

interface SaveProjectDialogProps {
  onSave: (projectId: string) => void;
  disabled?: boolean;
  existingProjectId?: string | null;
}

const SaveProjectDialog: React.FC<SaveProjectDialogProps> = ({ 
  onSave, 
  disabled,
  existingProjectId 
}) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { createProject, projects } = useProjects();

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    setSaveSuccess(false);
    
    const project = await createProject(name.trim(), description.trim() || undefined);
    
    if (project) {
      onSave(project.id);
      setSaveSuccess(true);
      
      toast({
        title: "✓ Proyecto guardado correctamente",
        description: `"${name}" ha sido guardado con todos los archivos (HTML, CSS, JS).`,
      });
      
      // Show success state for 1.5 seconds before closing
      setTimeout(() => {
        setOpen(false);
        setName('');
        setDescription('');
        setSaveSuccess(false);
      }, 1500);
    }
    setIsSaving(false);
  };

  const handleQuickSave = () => {
    if (existingProjectId) {
      onSave(existingProjectId);
      toast({
        title: "✓ Cambios guardados",
        description: "Los archivos del proyecto han sido actualizados.",
      });
    }
  };

  // If project already exists, show quick save button
  if (existingProjectId) {
    const existingProject = projects.find(p => p.id === existingProjectId);
    return (
      <Button 
        variant="outline" 
        size="sm" 
        disabled={disabled} 
        className="gap-2"
        onClick={handleQuickSave}
      >
        <Save className="h-4 w-4" />
        Guardar en "{existingProject?.name || 'Proyecto'}"
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
          <Save className="h-4 w-4" />
          Guardar proyecto
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Guardar proyecto</DialogTitle>
          <DialogDescription>
            Dale un nombre a tu proyecto. Se guardarán todos los archivos generados (HTML, CSS, JavaScript).
          </DialogDescription>
        </DialogHeader>
        
        {saveSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <p className="text-lg font-medium text-foreground">¡Proyecto guardado!</p>
            <p className="text-sm text-muted-foreground text-center">
              Puedes encontrarlo en la sección "Mis Proyectos" en Ajustes.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">Nombre del proyecto *</Label>
                <Input
                  id="project-name"
                  placeholder="Mi landing page"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description">Descripción (opcional)</Label>
                <Textarea
                  id="project-description"
                  placeholder="Una landing page moderna con hero y formulario de contacto..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={isSaving}
                />
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Archivos que se guardarán:</strong>
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>• index.html - Estructura del proyecto</li>
                  <li>• style.css - Estilos y diseño</li>
                  <li>• script.js - Funcionalidad y scripts</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar proyecto
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SaveProjectDialog;
