import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, ExternalLink, RefreshCw, FolderTree, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeOutput, ProjectOutput } from '@/types/chat';
import { cn } from '@/lib/utils';
import FileExplorerEnhanced from './FileExplorerEnhanced';
import CodeEditorPanel from './CodeEditorPanel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

interface PreviewPanelProps {
  code: CodeOutput | null;
  project?: ProjectOutput | null;
  onProjectChange?: (project: ProjectOutput) => void;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'preview' | 'files';

const PreviewPanel: React.FC<PreviewPanelProps> = ({ code, project: initialProject, onProjectChange }) => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [key, setKey] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectOutput | null>(initialProject || null);

  // Sync project when prop changes
  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
    }
  }, [initialProject]);

  const iframeSrc = useMemo(() => {
    if (!code) return null;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${code.css}
  </style>
</head>
<body>
  ${code.html}
  <script>${code.js}</script>
</body>
</html>`;
    
    return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  }, [code]);

  const viewportClasses: Record<ViewportSize, string> = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  const selectedFileContent = useMemo(() => {
    if (!project || !selectedFile) return null;
    return project.files.find(f => f.path === selectedFile);
  }, [project, selectedFile]);

  const hasProject = project && project.files.length > 0;

  // File operations
  const handleUpdateFile = useCallback((content: string) => {
    if (!project || !selectedFile) return;
    
    const updatedFiles = project.files.map(f => 
      f.path === selectedFile ? { ...f, content } : f
    );
    
    const updatedProject = { ...project, files: updatedFiles };
    setProject(updatedProject);
    onProjectChange?.(updatedProject);
  }, [project, selectedFile, onProjectChange]);

  const handleCreateFile = useCallback((path: string) => {
    if (!project) return;
    
    // Check if file already exists
    if (project.files.some(f => f.path === path)) {
      console.warn(`File ${path} already exists`);
      return;
    }

    const updatedProject = {
      ...project,
      files: [...project.files, { path, content: '' }]
    };
    
    setProject(updatedProject);
    onProjectChange?.(updatedProject);
    setSelectedFile(path);
  }, [project, onProjectChange]);

  const handleCreateFolder = useCallback((path: string) => {
    if (!project) return;
    
    const gitkeepPath = `${path}/.gitkeep`;
    
    if (project.files.some(f => f.path.startsWith(`${path}/`))) {
      console.warn(`Folder ${path} already exists`);
      return;
    }

    const updatedProject = {
      ...project,
      files: [...project.files, { path: gitkeepPath, content: '' }]
    };
    
    setProject(updatedProject);
    onProjectChange?.(updatedProject);
  }, [project, onProjectChange]);

  const handleDeleteFile = useCallback((path: string) => {
    if (!project) return;
    
    const isFolder = project.files.some(f => f.path.startsWith(`${path}/`));
    
    let updatedFiles;
    if (isFolder) {
      updatedFiles = project.files.filter(f => !f.path.startsWith(`${path}/`) && f.path !== path);
    } else {
      updatedFiles = project.files.filter(f => f.path !== path);
    }

    const updatedProject = { ...project, files: updatedFiles };
    setProject(updatedProject);
    onProjectChange?.(updatedProject);
    
    if (selectedFile === path || (isFolder && selectedFile?.startsWith(`${path}/`))) {
      setSelectedFile(null);
    }
  }, [project, onProjectChange, selectedFile]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setViewMode('preview')}
          >
            <Eye className="w-4 h-4" />
            <span className="text-xs">Vista previa</span>
          </Button>
          <Button
            variant={viewMode === 'files' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setViewMode('files')}
            disabled={!hasProject}
            title={!hasProject ? 'Genera una página para ver los archivos' : 'Ver archivos del proyecto'}
          >
            <FolderTree className="w-4 h-4" />
            <span className="text-xs">Archivos</span>
            {hasProject && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-primary/20 text-primary rounded-full">
                {project?.files.length}
              </span>
            )}
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          
          <>
            <Button
              variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewport('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewport('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewport('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'preview' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setKey(k => k + 1)}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => iframeSrc && window.open(iframeSrc, '_blank')}
                disabled={!iframeSrc}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'preview' ? (
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div
            className={cn(
              'mx-auto h-full transition-all duration-300 rounded-lg overflow-hidden shadow-card',
              viewportClasses[viewport]
            )}
          >
            {iframeSrc ? (
              <iframe
                key={key}
                src={iframeSrc}
                className="w-full h-full bg-white border-0"
                title="Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-card text-center p-8">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Monitor className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Vista previa
                </h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Tu página web aparecerá aquí cuando la IA genere el código
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {hasProject ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full overflow-auto border-r border-border bg-card">
                  <div className="px-3 py-2 border-b border-border">
                    <h3 className="text-sm font-semibold">{project.projectName}</h3>
                    <p className="text-xs text-muted-foreground">{project.files.length} archivos</p>
                  </div>
                  <FileExplorerEnhanced
                    files={project.files}
                    selectedFile={selectedFile}
                    onSelectFile={setSelectedFile}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                    onDeleteFile={handleDeleteFile}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={70}>
                <div className="h-full overflow-hidden">
                  {selectedFileContent ? (
                    <CodeEditorPanel
                      content={selectedFileContent.content}
                      filename={selectedFileContent.path}
                      onSave={handleUpdateFile}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/20">
                      <FolderTree className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-sm font-medium">Selecciona un archivo</p>
                      <p className="text-xs mt-1">Haz clic en un archivo del árbol para ver y editar su contenido</p>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FolderTree className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">No hay estructura de proyecto</p>
              <p className="text-xs mt-1">Genera una página para ver los archivos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
