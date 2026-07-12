import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, ExternalLink, RefreshCw, FolderTree, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProjectOutput, ProjectFile } from '@/types/chat';
import { cn } from '@/lib/utils';
import FileExplorerEnhanced from './FileExplorerEnhanced';
import CodeEditorPanel from './CodeEditorPanel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  SandpackProvider,
  SandpackPreview,
  useSandpack
} from "@codesandbox/sandpack-react";

interface PreviewPanelProps {
  project?: ProjectOutput | null;
  onProjectChange?: (project: ProjectOutput) => void;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'preview' | 'files';

const viewportClasses: Record<ViewportSize, string> = {
  desktop: 'w-full',
  tablet: 'w-[768px]',
  mobile: 'w-[375px]',
};

// Inner component to safely consume Sandpack context
const PreviewPanelInner: React.FC<{
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  viewport: ViewportSize;
  setViewport: (size: ViewportSize) => void;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  project: ProjectOutput | null;
  hasProject: boolean;
  selectedFileContent: ProjectFile | null | undefined;
  handleUpdateFile: (content: string) => void;
  handleCreateFile: (path: string) => void;
  handleCreateFolder: (path: string) => void;
  handleDeleteFile: (path: string) => void;
}> = ({
  viewMode,
  setViewMode,
  viewport,
  setViewport,
  selectedFile,
  setSelectedFile,
  project,
  hasProject,
  selectedFileContent,
  handleUpdateFile,
  handleCreateFile,
  handleCreateFolder,
  handleDeleteFile,
}) => {
  const { sandpack } = useSandpack();

  const handleRefresh = () => {
    if (sandpack) {
      sandpack.runSandbox();
    }
  };

  const handleOpenExternal = () => {
    if (sandpack) {
      sandpack.openInNewTab();
    }
  };

  return (
    <div className="flex flex-col h-full w-full flex-1 min-h-0 bg-slate-950 text-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card/20">
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
                onClick={handleRefresh}
                title="Actualizar vista previa"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleOpenExternal}
                title="Abrir en pestaña nueva"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'preview' ? (
        <div className="flex-1 min-h-0 bg-muted/30 p-4 flex flex-col h-full">
          <div
            className={cn(
              'mx-auto h-full w-full transition-all duration-300 rounded-lg overflow-hidden shadow-card bg-slate-950 flex flex-col flex-1 min-h-0',
              viewportClasses[viewport]
            )}
          >
            <div className="w-full h-full flex-1 relative bg-slate-900 min-h-0">
              <SandpackPreview
                showNavigator={false}
                showRefreshButton={false}
                showOpenInCodeSandbox={false}
                style={{ height: '100%', width: '100%', minHeight: '100%' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {hasProject ? (
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
                <div className="h-full overflow-auto border-r border-border bg-card">
                  <div className="px-3 py-2 border-b border-border">
                    <h3 className="text-sm font-semibold truncate">{project?.projectName || 'Proyecto'}</h3>
                    <p className="text-xs text-muted-foreground">{project?.files.length} archivos</p>
                  </div>
                  <FileExplorerEnhanced
                    files={project?.files || []}
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
                <div className="h-full overflow-hidden bg-slate-950">
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

const PreviewPanel: React.FC<PreviewPanelProps> = ({ project: initialProject, onProjectChange }) => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectOutput | null>(initialProject || null);

  // Sync project when prop changes
  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
    }
  }, [initialProject]);

  const selectedFileContent = useMemo(() => {
    if (!project || !selectedFile) return null;
    return project.files.find(f => f.path === selectedFile);
  }, [project, selectedFile]);

  const hasProject = !!(project && project.files.length > 0);

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

  // Convert files for Sandpack
  const sandpackFiles = useMemo(() => {
    if (!project) return {};
    const filesObj: Record<string, string> = {};
    project.files.forEach(file => {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
      filesObj[path] = file.content;

      // Map index.html to /public/index.html for Sandpack react-ts (create-react-app) compatibility
      if (path === '/index.html') {
        filesObj['/public/index.html'] = file.content;
      }
      // Map main.tsx to index.tsx for Sandpack react-ts (create-react-app) compatibility
      if (path === '/src/main.tsx') {
        filesObj['/src/index.tsx'] = file.content;
      }
    });
    return filesObj;
  }, [project]);

  if (!hasProject) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-card text-center p-8 text-white">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Monitor className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Vista previa
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          Tu proyecto aparecerá aquí cuando la IA genere el código
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0">
      <SandpackProvider
        files={sandpackFiles}
        template="react-ts"
        theme="dark"
        options={{
          initMode: "immediate",
          recompileMode: "immediate",
          classes: {
            "sp-wrapper": "h-full w-full bg-slate-950 flex flex-col flex-1 min-h-0",
          }
        }}
      >
        <PreviewPanelInner
          viewMode={viewMode}
          setViewMode={setViewMode}
          viewport={viewport}
          setViewport={setViewport}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          project={project}
          hasProject={hasProject}
          selectedFileContent={selectedFileContent}
          handleUpdateFile={handleUpdateFile}
          handleCreateFile={handleCreateFile}
          handleCreateFolder={handleCreateFolder}
          handleDeleteFile={handleDeleteFile}
        />
      </SandpackProvider>
    </div>
  );
};

export default PreviewPanel;
