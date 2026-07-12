import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Monitor, Smartphone, Tablet, ExternalLink, RefreshCw, FolderTree, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeOutput, ProjectOutput, ProjectFile } from '@/types/chat';
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
  code: CodeOutput | null;
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

// Inner component to safely consume Sandpack context if active
const PreviewPanelInner: React.FC<PreviewPanelProps & {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  viewport: ViewportSize;
  setViewport: (size: ViewportSize) => void;
  selectedFile: string | null;
  setSelectedFile: (file: string | null) => void;
  project: ProjectOutput | null;
  iframeSrc: string | null;
  refreshKey: number;
  triggerRefresh: () => void;
  hasProject: boolean;
  selectedFileContent: ProjectFile | null | undefined;
  handleUpdateFile: (content: string) => void;
  handleCreateFile: (path: string) => void;
  handleCreateFolder: (path: string) => void;
  handleDeleteFile: (path: string) => void;
  isSandpackActive: boolean;
}> = ({
  code,
  onProjectChange,
  viewMode,
  setViewMode,
  viewport,
  setViewport,
  selectedFile,
  setSelectedFile,
  project,
  iframeSrc,
  refreshKey,
  triggerRefresh,
  hasProject,
  selectedFileContent,
  handleUpdateFile,
  handleCreateFile,
  handleCreateFolder,
  handleDeleteFile,
  isSandpackActive,
}) => {
  let sandpackInstance: { runSandbox: () => void; openInNewTab: () => void } | null = null;
  try {
    const context = useSandpack() as unknown as { sandpack: { runSandbox: () => void; openInNewTab: () => void } };
    sandpackInstance = context.sandpack;
  } catch (e) {
    // Not running inside SandpackProvider (fallback mode)
  }

  const handleRefresh = () => {
    if (sandpackInstance) {
      sandpackInstance.runSandbox();
    } else {
      triggerRefresh();
    }
  };

  const handleOpenExternal = () => {
    if (sandpackInstance) {
      sandpackInstance.openInNewTab();
    } else if (iframeSrc) {
      window.open(iframeSrc, '_blank');
    }
  };

  return (
    <div className="flex flex-col h-full">
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
                disabled={!isSandpackActive && !iframeSrc}
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
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          <div
            className={cn(
              'mx-auto h-full transition-all duration-300 rounded-lg overflow-hidden shadow-card bg-slate-950',
              viewportClasses[viewport]
            )}
          >
            {isSandpackActive ? (
              <div className="w-full h-full relative bg-slate-900">
                <SandpackPreview
                  showNavigator={false}
                  showRefreshButton={false}
                  showOpenInCodeSandbox={false}
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            ) : iframeSrc ? (
              <iframe
                key={refreshKey}
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

const PreviewPanel: React.FC<PreviewPanelProps> = (props) => {
  const { code, project: initialProject, onProjectChange } = props;
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);
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

  const selectedFileContent = useMemo(() => {
    if (!project || !selectedFile) return null;
    return project.files.find(f => f.path === selectedFile);
  }, [project, selectedFile]);

  const hasProject = !!(project && project.files.length > 0);
  const isSandpackActive = hasProject;

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
    });
    return filesObj;
  }, [project]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  if (isSandpackActive) {
    return (
      <SandpackProvider
        files={sandpackFiles}
        template="react-ts"
        theme="dark"
        options={{
          initMode: "immediate",
          recompileMode: "immediate",
          classes: {
            "sp-wrapper": "h-full w-full bg-slate-950",
          }
        }}
      >
        <PreviewPanelInner
          {...props}
          viewMode={viewMode}
          setViewMode={setViewMode}
          viewport={viewport}
          setViewport={setViewport}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          project={project}
          iframeSrc={iframeSrc}
          refreshKey={refreshKey}
          triggerRefresh={triggerRefresh}
          hasProject={hasProject}
          selectedFileContent={selectedFileContent}
          handleUpdateFile={handleUpdateFile}
          handleCreateFile={handleCreateFile}
          handleCreateFolder={handleCreateFolder}
          handleDeleteFile={handleDeleteFile}
          isSandpackActive={isSandpackActive}
        />
      </SandpackProvider>
    );
  }

  return (
    <PreviewPanelInner
      {...props}
      viewMode={viewMode}
      setViewMode={setViewMode}
      viewport={viewport}
      setViewport={setViewport}
      selectedFile={selectedFile}
      setSelectedFile={setSelectedFile}
      project={project}
      iframeSrc={iframeSrc}
      refreshKey={refreshKey}
      triggerRefresh={triggerRefresh}
      hasProject={hasProject}
      selectedFileContent={selectedFileContent}
      handleUpdateFile={handleUpdateFile}
      handleCreateFile={handleCreateFile}
      handleCreateFolder={handleCreateFolder}
      handleDeleteFile={handleDeleteFile}
      isSandpackActive={isSandpackActive}
    />
  );
};

export default PreviewPanel;
