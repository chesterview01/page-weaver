import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2, FilePlus, FolderPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectFile } from '@/types/chat';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FileExplorerEnhancedProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onCreateFile?: (path: string) => void;
  onCreateFolder?: (path: string) => void;
  onDeleteFile?: (path: string) => void;
  onRenameFile?: (oldPath: string, newPath: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  content?: string;
}

const buildTree = (files: ProjectFile[]): TreeNode[] => {
  const root: TreeNode[] = [];
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let currentLevel = root;
    
    parts.forEach((part, index) => {
      const isLastPart = index === parts.length - 1;
      const existingNode = currentLevel.find(node => node.name === part);
      
      if (existingNode) {
        if (!isLastPart) {
          currentLevel = existingNode.children;
        }
      } else {
        const newNode: TreeNode = {
          name: part,
          path: parts.slice(0, index + 1).join('/'),
          isDirectory: !isLastPart,
          children: [],
          content: isLastPart ? file.content : undefined,
        };
        currentLevel.push(newNode);
        if (!isLastPart) {
          currentLevel = newNode.children;
        }
      }
    });
  });
  
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: sortNodes(node.children),
    }));
  };
  
  return sortNodes(root);
};

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  onCreateFile?: (parentPath: string) => void;
  onCreateFolder?: (parentPath: string) => void;
  onDeleteFile?: (path: string) => void;
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedFile === node.path;
  
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const iconColors: Record<string, string> = {
      js: 'text-yellow-500',
      jsx: 'text-yellow-500',
      ts: 'text-blue-500',
      tsx: 'text-blue-500',
      css: 'text-purple-500',
      html: 'text-orange-500',
      json: 'text-green-500',
      md: 'text-gray-400',
    };
    return iconColors[ext || ''] || 'text-muted-foreground';
  };
  
  const handleClick = () => {
    if (node.isDirectory) {
      onToggleFolder(node.path);
    } else {
      onSelectFile(node.path);
    }
  };

  const itemContent = (
    <div
      className={cn(
        'flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm text-sm transition-colors',
        'hover:bg-accent/50',
        isSelected && 'bg-accent text-accent-foreground'
      )}
      style={{ paddingLeft: `${depth * 12 + 8}px` }}
      onClick={handleClick}
    >
      {node.isDirectory ? (
        <>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500 shrink-0" />
          )}
        </>
      ) : (
        <>
          <span className="w-4" />
          <File className={cn('w-4 h-4 shrink-0', getFileIcon(node.name))} />
        </>
      )}
      <span className="truncate">{node.name}</span>
    </div>
  );
  
  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {itemContent}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {node.isDirectory && (
            <>
              <ContextMenuItem onClick={() => onCreateFile?.(node.path)}>
                <FilePlus className="w-4 h-4 mr-2" />
                Nuevo archivo
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onCreateFolder?.(node.path)}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Nueva carpeta
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}
          <ContextMenuItem 
            onClick={() => onDeleteFile?.(node.path)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Eliminar {node.isDirectory ? 'carpeta' : 'archivo'}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {node.isDirectory && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedFile={selectedFile}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onSelectFile={onSelectFile}
              onCreateFile={onCreateFile}
              onCreateFolder={onCreateFolder}
              onDeleteFile={onDeleteFile}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorerEnhanced: React.FC<FileExplorerEnhancedProps> = ({
  files,
  selectedFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const initialExpanded = new Set<string>();
    files.forEach(file => {
      const firstFolder = file.path.split('/')[0];
      if (firstFolder) initialExpanded.add(firstFolder);
    });
    return initialExpanded;
  });
  
  const [newFileDialogOpen, setNewFileDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string>('');
  
  const tree = useMemo(() => buildTree(files), [files]);
  
  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreateFile = (parentPath: string) => {
    setCurrentPath(parentPath);
    setNewName('');
    setNewFileDialogOpen(true);
  };

  const handleCreateFolder = (parentPath: string) => {
    setCurrentPath(parentPath);
    setNewName('');
    setNewFolderDialogOpen(true);
  };

  const handleDeleteFile = (path: string) => {
    setDeleteTarget(path);
    setDeleteDialogOpen(true);
  };

  const confirmCreateFile = () => {
    if (newName.trim()) {
      const fullPath = currentPath ? `${currentPath}/${newName.trim()}` : newName.trim();
      onCreateFile?.(fullPath);
      setNewFileDialogOpen(false);
    }
  };

  const confirmCreateFolder = () => {
    if (newName.trim()) {
      const fullPath = currentPath ? `${currentPath}/${newName.trim()}` : newName.trim();
      onCreateFolder?.(fullPath);
      setExpandedFolders(prev => new Set([...prev, fullPath]));
      setNewFolderDialogOpen(false);
    }
  };

  const confirmDelete = () => {
    onDeleteFile?.(deleteTarget);
    setDeleteDialogOpen(false);
  };
  
  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        <p className="mb-4">No hay archivos generados</p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleCreateFile('')}
          className="gap-2"
        >
          <FilePlus className="w-4 h-4" />
          Crear archivo
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <div className="py-2">
        {/* Header actions */}
        <div className="flex items-center gap-1 px-2 pb-2 border-b border-border mb-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleCreateFile('')}
            title="Nuevo archivo en raíz"
          >
            <FilePlus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => handleCreateFolder('')}
            title="Nueva carpeta en raíz"
          >
            <FolderPlus className="w-4 h-4" />
          </Button>
        </div>

        {tree.map(node => (
          <TreeItem
            key={node.path}
            node={node}
            depth={0}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onSelectFile={onSelectFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
          />
        ))}
      </div>

      {/* New File Dialog */}
      <Dialog open={newFileDialogOpen} onOpenChange={setNewFileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo archivo</DialogTitle>
            <DialogDescription>
              {currentPath ? `Crear en: ${currentPath}/` : 'Crear en la raíz del proyecto'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="nombre-archivo.tsx"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCreateFile()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFileDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateFile} disabled={!newName.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva carpeta</DialogTitle>
            <DialogDescription>
              {currentPath ? `Crear en: ${currentPath}/` : 'Crear en la raíz del proyecto'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="nombre-carpeta"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCreateFolder()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmCreateFolder} disabled={!newName.trim()}>
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este elemento?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar "{deleteTarget}". Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FileExplorerEnhanced;
