import React, { useState } from 'react';
import { Save } from 'lucide-react';
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

interface SaveProjectDialogProps {
  onSave: (projectId: string) => void;
  disabled?: boolean;
}

const SaveProjectDialog: React.FC<SaveProjectDialogProps> = ({ onSave, disabled }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { createProject } = useProjects();

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    const project = await createProject(name.trim(), description.trim() || undefined);
    
    if (project) {
      onSave(project.id);
      setOpen(false);
      setName('');
      setDescription('');
    }
    setIsSaving(false);
  };

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
            Dale un nombre a tu proyecto para guardarlo y poder restaurarlo más tarde.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Nombre del proyecto</Label>
            <Input
              id="project-name"
              placeholder="Mi landing page"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SaveProjectDialog;
