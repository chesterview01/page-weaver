import React, { useState, useEffect, useMemo } from 'react';
import {
  SandpackProvider,
  SandpackPreview
} from "@codesandbox/sandpack-react";
import { ProjectOutput } from '@/types/chat';
import { projectTemplate } from '@/constants/projectTemplate';

const PreviewFullscreen: React.FC = () => {
  const [project, setProject] = useState<ProjectOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to load project from localStorage
  const loadProjectFromStorage = (isInitial = false) => {
    try {
      if (isInitial) {
        setIsLoading(true);
      }
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
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  };

  // Initial load
  useEffect(() => {
    // Small delay on initial load to ensure storage sync is completed
    const timer = setTimeout(() => {
      loadProjectFromStorage(true);
    }, 500);

    // Listen for storage changes across tabs/windows (real-time sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chester_current_project' || e.key === 'chester_current_code') {
        loadProjectFromStorage(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Convert files for Sandpack with guaranteed styling CDN injection
  const sandpackFiles = useMemo(() => {
    if (!project) return {};
    const filesObj: Record<string, string> = {};
    project.files.forEach(file => {
      const path = file.path.startsWith('/') ? file.path : `/${file.path}`;
      let content = file.content;

      // Force Tailwind CSS CDN injection for absolute visual parity across previews
      if (path.endsWith('.html') || path === '/index.html' || path === '/public/index.html') {
        if (!content.includes('cdn.tailwindcss.com')) {
          content = content.replace(
            '</head>',
            '  <script src="https://cdn.tailwindcss.com"></script>\n  <script>\n    tailwind.config = {\n      darkMode: "class",\n      theme: { extend: {} }\n    }\n  </script>\n</head>'
          );
        }
      }

      filesObj[path] = content;

      // Map index.html to /public/index.html for Sandpack react-ts (create-react-app) compatibility
      if (path === '/index.html') {
        filesObj['/public/index.html'] = content;
      }
      // Map main.tsx to index.tsx for Sandpack react-ts (create-react-app) compatibility
      if (path === '/src/main.tsx') {
        filesObj['/src/index.tsx'] = content;
      }
    });
    return filesObj;
  }, [project]);

  if (isLoading || !project) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white font-sans">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-slate-400 font-medium">Cargando vista previa en pantalla completa...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 overflow-hidden flex flex-col flex-1 min-h-0">
      <SandpackProvider
        files={sandpackFiles}
        template="react-ts"
        theme="dark"
        customSetup={{
          dependencies: {
            "lucide-react": "^0.263.1",
            "tailwindcss": "^3.3.0",
            "recharts": "^2.7.2"
          }
        }}
        options={{
          initMode: "immediate",
          recompileMode: "immediate",
          classes: {
            "sp-wrapper": "h-full w-full bg-slate-950 flex flex-col flex-1 min-h-0",
          }
        }}
      >
        <div className="w-full h-full relative bg-slate-900 flex-1 min-h-0">
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{ height: '100vh', width: '100%', minHeight: '100vh' }}
          />
        </div>
      </SandpackProvider>
    </div>
  );
};

export default PreviewFullscreen;
