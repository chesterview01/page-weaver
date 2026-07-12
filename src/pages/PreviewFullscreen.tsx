import React, { useState, useEffect, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackPreview
} from "@codesandbox/sandpack-react";
import { ProjectOutput } from '@/types/chat';
import { projectTemplate } from '@/constants/projectTemplate';

const PreviewFullscreen: React.FC = () => {
  const [project, setProject] = useState<ProjectOutput | null>(null);

  // Helper function to load project from localStorage
  const loadProjectFromStorage = () => {
    try {
      const storedProject = localStorage.getItem('chester_current_project');
      if (storedProject) {
        const parsed = JSON.parse(storedProject) as ProjectOutput;
        if (parsed && Array.isArray(parsed.files)) {
          setProject(parsed);
          return;
        }
      }

      // Fallback: If no current project exists but we have current code,
      // we can try constructing a simple project or use the default template
      const storedCode = localStorage.getItem('chester_current_code');
      if (storedCode) {
        try {
          const parsedCode = JSON.parse(storedCode);
          if (parsedCode && (parsedCode.html || parsedCode.css || parsedCode.js)) {
            const tempProject: ProjectOutput = {
              projectName: 'chester-preview-project',
              files: [
                { path: 'index.html', content: parsedCode.html || '' },
                { path: 'style.css', content: parsedCode.css || '' },
                { path: 'script.js', content: parsedCode.js || '' }
              ]
            };
            setProject(tempProject);
            return;
          }
        } catch (e) {
          console.error('Error parsing stored code:', e);
        }
      }

      // Default fallback
      setProject(projectTemplate);
    } catch (error) {
      console.error('Error loading project from localStorage:', error);
      setProject(projectTemplate);
    }
  };

  // Initial load
  useEffect(() => {
    loadProjectFromStorage();

    // Listen for storage changes across tabs/windows (real-time sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chester_current_project' || e.key === 'chester_current_code') {
        loadProjectFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

  if (!project) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-slate-400 font-medium">Cargando vista previa en pantalla completa...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden flex flex-col">
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
        <div className="w-full h-full relative bg-slate-900 flex-1">
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </SandpackProvider>
    </div>
  );
};

export default PreviewFullscreen;
