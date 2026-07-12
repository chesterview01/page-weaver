import React from 'react';
import { Download, FolderArchive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadAsZip } from '@/utils/exportProject';
import { CodeOutput, ProjectOutput } from '@/types/chat';
import { toast } from '@/hooks/use-toast';

interface ExportDropdownProps {
  code: CodeOutput | null;
  project?: ProjectOutput | null;
  projectName?: string;
}

const ExportDropdown: React.FC<ExportDropdownProps> = ({ code, project, projectName = 'mi-proyecto' }) => {
  const hasContent = !!(project && project.files.length > 0) || !!code;
  if (!hasContent) return null;

  const handleDownloadZip = async () => {
    try {
      await downloadAsZip(code || { html: '', css: '', js: '' }, projectName, project);
      toast({
        title: "Descarga iniciada",
        description: "Tu proyecto se está descargando como ZIP.",
      });
    } catch (error) {
      console.error('Error downloading ZIP:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el archivo ZIP.",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownloadZip}>
          <FolderArchive className="w-4 h-4 mr-2" />
          Descargar ZIP
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportDropdown;
