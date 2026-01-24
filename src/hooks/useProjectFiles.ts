import { useState, useCallback } from 'react';
import { ProjectFile, ProjectOutput } from '@/types/chat';

export interface UseProjectFilesReturn {
  project: ProjectOutput | null;
  setProject: (project: ProjectOutput | null) => void;
  selectedFile: string | null;
  setSelectedFile: (path: string | null) => void;
  getFileContent: (path: string) => string | null;
  updateFileContent: (path: string, newContent: string) => boolean;
  createFile: (path: string, content?: string) => boolean;
  createFolder: (path: string) => boolean;
  deleteFile: (path: string) => boolean;
  renameFile: (oldPath: string, newPath: string) => boolean;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export const useProjectFiles = (
  initialProject: ProjectOutput | null = null,
  onProjectChange?: (project: ProjectOutput) => void
): UseProjectFilesReturn => {
  const [project, setProjectState] = useState<ProjectOutput | null>(initialProject);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const setProject = useCallback((newProject: ProjectOutput | null) => {
    setProjectState(newProject);
    setSelectedFile(null);
    setHasUnsavedChanges(false);
    setSaveStatus('idle');
  }, []);

  const getFileContent = useCallback((path: string): string | null => {
    if (!project) return null;
    const file = project.files.find(f => f.path === path);
    return file?.content ?? null;
  }, [project]);

  const updateFileContent = useCallback((path: string, newContent: string): boolean => {
    if (!project) return false;
    
    const fileIndex = project.files.findIndex(f => f.path === path);
    if (fileIndex === -1) return false;

    const updatedFiles = [...project.files];
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], content: newContent };
    
    const updatedProject = { ...project, files: updatedFiles };
    setProjectState(updatedProject);
    onProjectChange?.(updatedProject);
    
    return true;
  }, [project, onProjectChange]);

  const createFile = useCallback((path: string, content: string = ''): boolean => {
    if (!project) return false;
    
    // Check if file already exists
    if (project.files.some(f => f.path === path)) {
      console.warn(`File ${path} already exists`);
      return false;
    }

    const newFile: ProjectFile = { path, content };
    const updatedProject = {
      ...project,
      files: [...project.files, newFile]
    };
    
    setProjectState(updatedProject);
    onProjectChange?.(updatedProject);
    setSelectedFile(path);
    
    return true;
  }, [project, onProjectChange]);

  const createFolder = useCallback((path: string): boolean => {
    if (!project) return false;
    
    // Create a .gitkeep file to represent the folder
    const gitkeepPath = path.endsWith('/') ? `${path}.gitkeep` : `${path}/.gitkeep`;
    
    // Check if folder already exists
    if (project.files.some(f => f.path.startsWith(path.endsWith('/') ? path : `${path}/`))) {
      console.warn(`Folder ${path} already exists`);
      return false;
    }

    const newFile: ProjectFile = { path: gitkeepPath, content: '' };
    const updatedProject = {
      ...project,
      files: [...project.files, newFile]
    };
    
    setProjectState(updatedProject);
    onProjectChange?.(updatedProject);
    
    return true;
  }, [project, onProjectChange]);

  const deleteFile = useCallback((path: string): boolean => {
    if (!project) return false;
    
    // Check if it's a folder (delete all files in folder)
    const isFolder = project.files.some(f => f.path.startsWith(`${path}/`));
    
    let updatedFiles: ProjectFile[];
    if (isFolder) {
      updatedFiles = project.files.filter(f => !f.path.startsWith(`${path}/`) && f.path !== path);
    } else {
      updatedFiles = project.files.filter(f => f.path !== path);
    }
    
    if (updatedFiles.length === project.files.length) {
      console.warn(`File or folder ${path} not found`);
      return false;
    }

    const updatedProject = { ...project, files: updatedFiles };
    setProjectState(updatedProject);
    onProjectChange?.(updatedProject);
    
    if (selectedFile === path || (isFolder && selectedFile?.startsWith(`${path}/`))) {
      setSelectedFile(null);
    }
    
    return true;
  }, [project, onProjectChange, selectedFile]);

  const renameFile = useCallback((oldPath: string, newPath: string): boolean => {
    if (!project) return false;
    
    const fileIndex = project.files.findIndex(f => f.path === oldPath);
    if (fileIndex === -1) return false;
    
    // Check if new path already exists
    if (project.files.some(f => f.path === newPath)) {
      console.warn(`File ${newPath} already exists`);
      return false;
    }

    const updatedFiles = [...project.files];
    updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], path: newPath };
    
    const updatedProject = { ...project, files: updatedFiles };
    setProjectState(updatedProject);
    onProjectChange?.(updatedProject);
    
    if (selectedFile === oldPath) {
      setSelectedFile(newPath);
    }
    
    return true;
  }, [project, onProjectChange, selectedFile]);

  return {
    project,
    setProject,
    selectedFile,
    setSelectedFile,
    getFileContent,
    updateFileContent,
    createFile,
    createFolder,
    deleteFile,
    renameFile,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    saveStatus,
    setSaveStatus,
  };
};
