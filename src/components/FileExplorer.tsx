import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProjectFile } from '@/types/chat';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
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
  
  // Sort: directories first, then files, alphabetically
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
}

const TreeItem: React.FC<TreeItemProps> = ({
  node,
  depth,
  selectedFile,
  expandedFolders,
  onToggleFolder,
  onSelectFile,
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
  
  return (
    <div>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  onSelectFile,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Auto-expand first level folders
    const initialExpanded = new Set<string>();
    files.forEach(file => {
      const firstFolder = file.path.split('/')[0];
      if (firstFolder) initialExpanded.add(firstFolder);
    });
    return initialExpanded;
  });
  
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
  
  if (files.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No hay archivos generados
      </div>
    );
  }
  
  return (
    <div className="py-2">
      {tree.map(node => (
        <TreeItem
          key={node.path}
          node={node}
          depth={0}
          selectedFile={selectedFile}
          expandedFolders={expandedFolders}
          onToggleFolder={toggleFolder}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
};

export default FileExplorer;
