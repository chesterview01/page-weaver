import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Version, CodeOutput, ProjectOutput, ChatMode, ChatStep, ChatStepStatus } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocalPersistence } from '@/hooks/useLocalPersistence';
import { generateThumbnail } from '@/utils/thumbnailGenerator';
import { projectTemplate } from '@/constants/projectTemplate';

// Parse JSON project structure from AI response
const parseProjectFromResponse = (content: string): ProjectOutput | null => {
  try {
    // Look for JSON block with project structure
    const jsonMatch = content.match(/```json\n?([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.projectName && Array.isArray(parsed.files)) {
        return parsed as ProjectOutput;
      }
    }
    
    // Try to find raw JSON in response
    const rawJsonMatch = content.match(/\{[\s\S]*"projectName"[\s\S]*"files"[\s\S]*\}/);
    if (rawJsonMatch) {
      const parsed = JSON.parse(rawJsonMatch[0]);
      if (parsed.projectName && Array.isArray(parsed.files)) {
        return parsed as ProjectOutput;
      }
    }
  } catch (e) {
    console.log('No valid project JSON found, falling back to code blocks');
  }
  return null;
};

// Convert project structure to legacy CodeOutput for preview
const projectToCodeOutput = (project: ProjectOutput): CodeOutput => {
  let html = '';
  let css = '';
  let js = '';
  
  project.files.forEach(file => {
    const path = file.path.toLowerCase();
    if (path.endsWith('.html') || path.includes('index.html')) {
      html += file.content + '\n';
    } else if (path.endsWith('.css')) {
      css += file.content + '\n';
    } else if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx')) {
      js += file.content + '\n';
    }
  });
  
  return { html: html.trim(), css: css.trim(), js: js.trim() };
};

// Merge project files to keep unchanged files intact
const mergeProjectFiles = (existing: ProjectOutput | null, incoming: ProjectOutput): ProjectOutput => {
  if (!existing) return incoming;

  // Clone existing files
  const mergedFiles = [...existing.files];

  incoming.files.forEach(incomingFile => {
    const existingIndex = mergedFiles.findIndex(f => f.path === incomingFile.path);
    if (existingIndex !== -1) {
      // Overwrite existing file content
      mergedFiles[existingIndex] = {
        path: incomingFile.path,
        content: incomingFile.content
      };
    } else {
      // Add new file
      mergedFiles.push(incomingFile);
    }
  });

  return {
    projectName: incoming.projectName || existing.projectName || 'chester-code-project',
    files: mergedFiles
  };
};

// Parse code blocks from AI response (legacy fallback)
const parseCodeFromResponse = (content: string): CodeOutput | null => {
  const htmlMatch = content.match(/```html\n?([\s\S]*?)```/);
  const cssMatch = content.match(/```css\n?([\s\S]*?)```/);
  const jsMatch = content.match(/```(?:javascript|js)\n?([\s\S]*?)```/);

  if (htmlMatch || cssMatch || jsMatch) {
    return {
      html: htmlMatch?.[1]?.trim() || '',
      css: cssMatch?.[1]?.trim() || '',
      js: jsMatch?.[1]?.trim() || '',
    };
  }
  return null;
};

// Extract narrative text (everything before code/json blocks)
const extractNarrative = (content: string): string => {
  let narrative = content
    .replace(/```json\n?[\s\S]*?```/g, '')
    .replace(/```html\n?[\s\S]*?```/g, '')
    .replace(/```css\n?[\s\S]*?```/g, '')
    .replace(/```(?:javascript|js)\n?[\s\S]*?```/g, '')
    .trim();
  
  narrative = narrative.replace(/\n{3,}/g, '\n\n');
  
  return narrative || content;
};

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentProject, setCurrentProject] = useState<ProjectOutput | null>(projectTemplate);
  const [currentCode, setCurrentCode] = useState<CodeOutput | null>(projectToCodeOutput(projectTemplate));
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastBuildId, setLastBuildId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Agent State
  const [chatMode, setChatModeState] = useState<ChatMode>(() => {
    try {
      const stored = localStorage.getItem('chester_chat_mode');
      return (stored === 'quick' || stored === 'architect') ? stored : 'quick';
    } catch {
      return 'quick';
    }
  });
  const [currentSteps, setCurrentSteps] = useState<ChatStep[]>([]);
  const [healingRetries, setHealingRetries] = useState(0);
  const isHealingRef = useRef(false);

  const setChatMode = useCallback((mode: ChatMode) => {
    setChatModeState(mode);
    try {
      localStorage.setItem('chester_chat_mode', mode);
    } catch (e) {
      console.error('Error saving chat mode:', e);
    }
  }, []);
  
  const { settings } = useSettings();
  const { user, deductCredit, wallet, isAuthenticated } = useAuthContext();
  const { saveState, loadState, clearState, isCacheStale } = useLocalPersistence();
  
  const initializedRef = useRef(false);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    saveState({
      currentCode,
      currentProject,
      messages,
      versions,
      conversationId,
      projectId: currentProjectId,
      lastBuildId,
      lastSync: new Date().toISOString(),
    });
  }, [messages, versions, currentCode, currentProject, conversationId, currentProjectId, lastBuildId, isInitialized, saveState]);

  // Initialize: Load from cache first, then sync with database
  useEffect(() => {
    if (initializedRef.current) return;
    
    const initializeChat = async () => {
      // Load cached state first for immediate display
      const cached = loadState();
      
      // Check URL params for project loading
      const urlParams = new URLSearchParams(window.location.search);
      const projectIdFromUrl = urlParams.get('project');
      
      // Check for restore build from sessionStorage (from Settings page)
      const restoreBuildData = sessionStorage.getItem('restoreBuild');
      if (restoreBuildData) {
        try {
          const buildData = JSON.parse(restoreBuildData);
          sessionStorage.removeItem('restoreBuild');
          
          const restoredCode: CodeOutput = {
            html: buildData.html || '',
            css: buildData.css || '',
            js: buildData.js || '',
          };
          
          setCurrentCode(restoredCode);
          setCurrentProject(null);
          
          const restoredVersion: Version = {
            id: `restored-${Date.now()}`,
            timestamp: new Date(),
            label: buildData.label || 'Proyecto restaurado',
            code: restoredCode,
          };
          
          setVersions([restoredVersion]);
          setCurrentVersion(restoredVersion.id);
          
          // Create new conversation for restored build
          if (user) {
            await createNewConversation();
          }
          
          initializedRef.current = true;
          setIsInitialized(true);
          return;
        } catch (error) {
          console.error('Error restoring build:', error);
          sessionStorage.removeItem('restoreBuild');
        }
      }
      
      // If loading a specific project from URL, ignore cache
      if (projectIdFromUrl) {
        await loadProjectFromDatabase(projectIdFromUrl);
        initializedRef.current = true;
        setIsInitialized(true);
        return;
      }
      
      // If we have cached data and user is authenticated
      if (cached.conversationId && user) {
        // Apply cached data immediately
        if (cached.messages.length > 0) setMessages(cached.messages);
        if (cached.versions.length > 0) setVersions(cached.versions);
        if (cached.currentCode) setCurrentCode(cached.currentCode);
        if (cached.currentProject) setCurrentProject(cached.currentProject);
        if (cached.conversationId) setConversationId(cached.conversationId);
        if (cached.projectId) setCurrentProjectId(cached.projectId);
        if (cached.lastBuildId) setLastBuildId(cached.lastBuildId);
        if (cached.versions.length > 0) setCurrentVersion(cached.versions[0].id);
        
        // Sync with database if cache is stale
        if (isCacheStale(cached.lastSync)) {
          await syncWithDatabase(cached.conversationId);
        }
        
        initializedRef.current = true;
        setIsInitialized(true);
        return;
      }
      
      // No cache or no user - start fresh
      if (user) {
        await createNewConversation();
      }
      
      initializedRef.current = true;
      setIsInitialized(true);
    };

    initializeChat();
  }, [user]);

  const loadProjectFromDatabase = async (projectId: string) => {
    try {
      setCurrentProjectId(projectId);
      
      const { data: builds } = await supabase
        .from('builds')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (builds && builds.length > 0) {
        const loadedVersions: Version[] = builds.map(build => ({
          id: build.id,
          timestamp: new Date(build.created_at),
          label: build.label,
          code: { html: build.html, css: build.css, js: build.js },
        }));
        
        setVersions(loadedVersions);
        setCurrentVersion(loadedVersions[0].id);
        setCurrentCode(loadedVersions[0].code);
        setLastBuildId(loadedVersions[0].id);
        
        if (builds[0].conversation_id) {
          setConversationId(builds[0].conversation_id);
          await loadMessagesFromDatabase(builds[0].conversation_id);
        }
      }
    } catch (error) {
      console.error('Error loading project from database:', error);
    }
  };

  const loadMessagesFromDatabase = async (convId: string) => {
    try {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      
      if (msgs) {
        const loadedMessages: Message[] = msgs.map(m => {
          const project = parseProjectFromResponse(m.content);
          const code = project ? projectToCodeOutput(project) : parseCodeFromResponse(m.content);
          return {
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: extractNarrative(m.content),
            timestamp: new Date(m.created_at),
            projectOutput: project || undefined,
            codeOutput: code || undefined,
          };
        });
        setMessages(loadedMessages);

        // Find the latest message that has a project output to restore state
        const latestMsgWithProject = [...loadedMessages].reverse().find(m => m.projectOutput);
        if (latestMsgWithProject && latestMsgWithProject.projectOutput) {
          setCurrentProject(latestMsgWithProject.projectOutput);
          setCurrentCode(projectToCodeOutput(latestMsgWithProject.projectOutput));
        } else {
          // Fallback to latest message with codeOutput
          const latestMsgWithCode = [...loadedMessages].reverse().find(m => m.codeOutput);
          if (latestMsgWithCode && latestMsgWithCode.codeOutput) {
            setCurrentCode(latestMsgWithCode.codeOutput);
            setCurrentProject(null);
          } else {
            // Default to template if no messages have code/project
            setCurrentProject(projectTemplate);
            setCurrentCode(projectToCodeOutput(projectTemplate));
          }
        }
      }
    } catch (error) {
      console.error('Error loading messages from database:', error);
    }
  };

  const syncWithDatabase = async (convId: string) => {
    try {
      // Load latest messages
      await loadMessagesFromDatabase(convId);
      
      // Load latest builds for this conversation
      const { data: builds } = await supabase
        .from('builds')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false });
      
      if (builds && builds.length > 0) {
        const loadedVersions: Version[] = builds.map(build => ({
          id: build.id,
          timestamp: new Date(build.created_at),
          label: build.label,
          code: { html: build.html, css: build.css, js: build.js },
        }));
        
        setVersions(loadedVersions);
        setCurrentVersion(loadedVersions[0].id);
        setCurrentCode(loadedVersions[0].code);
        setLastBuildId(loadedVersions[0].id);
        
        // Update project ID if latest build has one
        if (builds[0].project_id) {
          setCurrentProjectId(builds[0].project_id);
        }
      }
    } catch (error) {
      console.error('Error syncing with database:', error);
    }
  };

  const createNewConversation = async (): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setConversationId(conv.id);
      return conv.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const sendMessage = useCallback(async (content: string, isHealingCall = false) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas una cuenta para enviar mensajes.",
        variant: "destructive",
      });
      return;
    }

    // Only deduct credit and add user message if this is NOT an internal healing call
    if (!isHealingCall) {
      if (!wallet || wallet.credits < 1) {
        toast({
          title: "Sin créditos",
          description: "No tienes suficientes créditos. Visita la sección de planes.",
          variant: "destructive",
        });
        return;
      }

      const credited = await deductCredit(1, content.substring(0, 50));
      if (!credited) return;
    }

    // Reset healing retries if this is a fresh user message
    if (!isHealingCall) {
      setHealingRetries(0);
      isHealingRef.current = false;
    }

    // Ensure we have a valid conversation ID synchronously to avoid race conditions (Error 409)
    let activeConvId = conversationId;
    if (!activeConvId) {
      activeConvId = await createNewConversation();
    }

    if (!activeConvId) {
      toast({
        title: "Error",
        description: "No se pudo inicializar la conversación. Por favor, recarga la página.",
        variant: "destructive",
      });
      return;
    }

    // Add user message to UI and database only for normal calls
    if (!isHealingCall) {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      try {
        await supabase.from('messages').insert({
          conversation_id: activeConvId,
          role: 'user',
          content,
        });
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }

    setIsLoading(true);

    // Initialize progress steps checklist
    if (isHealingCall) {
      setCurrentSteps([
        { id: 'healing', label: `⚙️ [Intento ${healingRetries}/3] Detectado error de compilación. Reparando...`, status: 'loading' }
      ]);
    } else if (chatMode === 'quick') {
      setCurrentSteps([
        { id: 'requirements', label: 'Procesando requerimiento...', status: 'loading' },
        { id: 'components', label: 'Escribiendo componentes...', status: 'pending' }
      ]);
    } else {
      // architect mode checklist
      setCurrentSteps([
        { id: 'requirements', label: 'Analizando requerimientos...', status: 'loading' },
        { id: 'architecture', label: 'Diseñando arquitectura...', status: 'pending' },
        { id: 'components', label: 'Escribiendo componentes...', status: 'pending' }
      ]);
    }

    const assistantId = `msg-${Date.now()}-ai`;

    // Add placeholder assistant message
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: isHealingCall ? '🛠️ Aplicando corrección automática para error detectado...' : '',
      timestamp: new Date(),
    }]);

    try {
      let finalAssistantContent = "";

      // Common System Prompt definitions
      const baseSystemPrompt = `Eres un Ingeniero Frontend Senior y Diseñador UI/UX experto. Tu objetivo es generar código de altísima calidad, moderno y listo para producción.

REGLAS ESTRICTAS DE DISEÑO:
1. UTILIZA TAILWIND CSS: Prohibido escribir CSS personalizado a menos que sea estrictamente necesario para animaciones complejas. Usa clases de Tailwind para todo el diseño, espaciado, colores y tipografía.
2. DISEÑO MODERNO: Usa modo oscuro por defecto (o un esquema de colores muy elegante), bordes redondeados (rounded-xl, rounded-2xl), sombras suaves (shadow-lg), y gradientes modernos (bg-gradient-to-r).
3. ICONOGRAFÍA: Usa iconos modernos (como Lucide o Heroicons) referenciándolos correctamente.
4. RESPONSIVE: Todo debe verse perfecto en móviles, tablets y escritorio usando los prefijos sm:, md:, lg: de Tailwind.

ENTORNO DE DESARROLLO ESTÁNDAR:
Trabajas sobre un proyecto React + Vite + TailwindCSS. El usuario YA TIENE configurados y funcionando los archivos base (package.json, vite.config.ts, etc.).
ESTÁ PROHIBIDO generar, modificar o devolver los archivos de configuración a menos que se te pida instalar una nueva dependencia explícitamente.

PROJECT MANIFESTO - REGLAS DE ARQUITECTURA CRÍTICAS:
1. SEPARACIÓN DE RESPONSABILIDADES OBLIGATORIA:
   - \`src/components/ui/\`: Componentes atómicos (Botones, Inputs, Cards).
   - \`src/components/layout/\`: Elementos de estructura (Navbar, Footer, Sidebar).
   - \`src/pages/\`: Vistas completas que importan los componentes.
   - \`src/hooks/\`: Toda la lógica de negocio y llamadas a APIs/Supabase.
   - \`src/lib/\`: Configuraciones (ej. supabaseClient.ts).

2. CERO MONOLITOS: NUNCA entregues una aplicación completa en un solo archivo \`index.html\` o \`App.tsx\`. Debes separar obligatoriamente la lógica en componentes y archivos específicos dentro de las carpetas mencionadas.

3. MODULARIDAD EXTREMA: Si el componente o vista que vas a crear es muy grande, divídelo en piezas más pequeñas dentro de \`src/components/\`.

Al entregar tu respuesta JSON (PART 2 - PROJECT STRUCTURE), devuelve únicamente los archivos que hayas creado o modificado siguiendo estrictamente este árbol de carpetas.

REGLAS DE CÓDIGO ADICIONALES:
1. CÓDIGO COMPLETO: NUNCA dejes funciones a medias, NUNCA uses comentarios como '...resto del código aquí'. Debes devolver el código 100% funcional.

REGLAS DE SALIDA DE ENTREGAS (CRÍTICO):
Tu respuesta debe tener exactamente DOS PARTES DISTINTAS organizadas de la siguiente manera:

PART 1 - NARRATIVE:
Empieza siempre con una explicación amigable, clara y profesional explicando los cambios que estás construyendo o modificando. NO muestres ningún bloque de código en esta sección.

PART 2 - PROJECT STRUCTURE:
Justo después de tu narrativa, debes incluir un único bloque de código JSON con la estructura de archivos que contenga únicamente los archivos creados o modificados en el siguiente formato JSON exacto:
\`\`\`json
{
  "projectName": "nombre-del-proyecto",
  "files": [
    {
      "path": "src/pages/Home.tsx",
      "content": "import React from 'react';\\n..."
    },
    {
      "path": "src/components/ui/Button.tsx",
      "content": "import React from 'react';\\n..."
    }
  ]
}
\`\`\`

Asegúrate de que el JSON sea completamente válido, sin errores de escape, y que las comillas dobles internas de los contenidos estén debidamente escapadas.
`;

      let projectContextText = "";
      if (currentProject && currentProject.files.length > 0) {
        projectContextText += `\n\nESTRUCTURA Y ARCHIVOS ACTUALES DEL PROYECTO (Utilízalos como base y modifica o añade archivos sobre este árbol):\n`;
        currentProject.files.forEach(file => {
          projectContextText += `\n--- Archivo: ${file.path} ---\n${file.content}\n`;
        });
      } else if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
        projectContextText += `\n\nDATOS DE REFERENCIA (Código actual del proyecto para que continúes o modifiques sobre él):\n\nHTML:\n${currentCode.html}\n\nCSS:\n${currentCode.css}\n\nJS:\n${currentCode.js}\n`;
      }

      if (!isHealingCall && chatMode === 'architect') {
        // --- MULTI-STEP AGENT SEQUENTIAL ARCHITECT MODE ---

        // Step 1: Request Architecture Plan
        const planningPromptText = `Eres un Arquitecto de Software Principal experto. Tu tarea única y exclusiva en este paso es diseñar una planificación y arquitectura detallada en español para el requerimiento del usuario:
"${content}"

Por favor, analiza y detalla:
1. Qué archivos nuevos deben crearse y qué archivos existentes deben modificarse (siguiendo estrictamente las carpetas del PROJECT MANIFESTO).
2. Cuál es la estrategia para gestionar componentes y responsabilidades.
3. Qué librerías, iconos de Lucide o dependencias se usarán.

Escribe una planificación sumamente estructurada y explicativa para el usuario. NO escribas bloques de código todavía. Devuelve solo el texto de planificación en español.`;

        const planningChatHistory = [
          { role: 'system', content: baseSystemPrompt + projectContextText },
          { role: 'user', content: planningPromptText }
        ];

        // Call the RPC for Plan
        const planningResponse = await supabase.rpc('chat_with_gemini', {
          chat_history: planningChatHistory,
          model_name: 'gemini-3.1-flash-lite'
        });

        if (planningResponse.error) throw planningResponse.error;

        let planText = "";
        const rData = planningResponse.data;
        if (rData) {
          planText = typeof rData === 'string' ? rData : (rData.text || rData.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(rData));
        }

        if (!planText) {
          throw new Error("No se pudo generar el plan arquitectónico.");
        }

        // Complete Step 1 & Move to Step 2
        setCurrentSteps(prev => prev.map(s => {
          if (s.id === 'requirements') return { ...s, status: 'completed' };
          if (s.id === 'architecture') return { ...s, status: 'loading' };
          return s;
        }));

        // Display the plan intermediate state briefly, simulate deep thinking
        setMessages(prev => prev.map(m => m.id === assistantId ? {
          ...m,
          content: `### 📋 Plan Arquitectónico Diseñado:\n\n${planText}\n\n*Escribiendo componentes ahora...*`
        } : m));

        await new Promise(resolve => setTimeout(resolve, 1500));

        // Move to Step 3
        setCurrentSteps(prev => prev.map(s => {
          if (s.id === 'architecture') return { ...s, status: 'completed' };
          if (s.id === 'components') return { ...s, status: 'loading' };
          return s;
        }));

        // Step 2: Request the actual implementation/code files based on the plan!
        const generationPromptText = `Eres el Desarrollador Principal experto. Implementa los archivos de código basándote estrictamente en el plan arquitectónico que hemos aprobado.

REQUERIMIENTO ORIGINAL: "${content}"

PLAN APROBADO:
${planText}

Genera los archivos correspondientes siguiendo exactamente las instrucciones de formato (PART 1 - NARRATIVE y PART 2 - PROJECT STRUCTURE en bloque JSON de código).`;

        const generationChatHistory = [
          { role: 'system', content: baseSystemPrompt + projectContextText },
          { role: 'user', content: generationPromptText }
        ];

        const codeResponse = await supabase.rpc('chat_with_gemini', {
          chat_history: generationChatHistory,
          model_name: 'gemini-3.1-flash-lite'
        });

        if (codeResponse.error) throw codeResponse.error;

        if (codeResponse.data) {
          finalAssistantContent = typeof codeResponse.data === 'string' ? codeResponse.data : (codeResponse.data.text || codeResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(codeResponse.data));
        }

        // Add the plan text to the final narrative output so the user sees the CoT reasoning!
        finalAssistantContent = `### 📋 Arquitectura Planificada:\n${planText}\n\n---\n\n${finalAssistantContent}`;

      } else {
        // --- QUICK MODE OR AUTO-HEALING SINGLE-CALL FLOW ---

        if (isHealingCall) {
          // Transition healing step indicator
          setCurrentSteps(prev => prev.map(s => s.id === 'healing' ? { ...s, status: 'loading' } : s));
        } else {
          // Quick mode transitions
          await new Promise(resolve => setTimeout(resolve, 600));
          setCurrentSteps(prev => prev.map(s => {
            if (s.id === 'requirements') return { ...s, status: 'completed' };
            if (s.id === 'components') return { ...s, status: 'loading' };
            return s;
          }));
        }

        const chatHistory: any[] = [
          { role: 'system', content: baseSystemPrompt + projectContextText }
        ];

        // For healing calls we send a minimized context, for normal calls we append historical messages
        if (!isHealingCall) {
          const historyLimit = 15;
          const recentMessages = messages.slice(-historyLimit);
          recentMessages.forEach(m => {
            chatHistory.push({
              role: m.role,
              content: m.content
            });
          });
        }

        chatHistory.push({
          role: 'user',
          content: content
        });

        const codeResponse = await supabase.rpc('chat_with_gemini', {
          chat_history: chatHistory,
          model_name: 'gemini-3.1-flash-lite'
        });

        if (codeResponse.error) throw codeResponse.error;

        if (codeResponse.data) {
          finalAssistantContent = typeof codeResponse.data === 'string' ? codeResponse.data : (codeResponse.data.text || codeResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(codeResponse.data));
        }
      }

      if (!finalAssistantContent) {
        throw new Error("No se recibió respuesta de la IA.");
      }

      setIsLoading(false);

      // Parse narrative text and structure/code outputs
      const parsedProject = parseProjectFromResponse(finalAssistantContent);
      let mergedProject: ProjectOutput | null = null;
      let finalCode: CodeOutput | null = null;

      if (parsedProject) {
        mergedProject = mergeProjectFiles(currentProject, parsedProject);
        finalCode = projectToCodeOutput(mergedProject);
      } else {
        const parsedCode = parseCodeFromResponse(finalAssistantContent);
        if (parsedCode) {
          finalCode = parsedCode;
        }
      }

      const narrativeContent = extractNarrative(finalAssistantContent);

      // Update UI with the final result
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? {
          ...m,
          content: narrativeContent,
          codeOutput: finalCode || undefined,
          projectOutput: mergedProject || undefined
        } : m)
      );

      // Update steps to completed
      setCurrentSteps(prev => prev.map(s => {
        if (s.id === 'components' || s.id === 'healing') return { ...s, status: 'completed' };
        return s;
      }));

      // Hide steps after 3 seconds
      setTimeout(() => {
        setCurrentSteps([]);
      }, 3000);

      if (finalCode || mergedProject) {
        const resolvedCode = finalCode || { html: '', css: '', js: '' };

        const newVersion: Version = {
          id: `v-${Date.now()}`,
          timestamp: new Date(),
          label: content.substring(0, 40) + (content.length > 40 ? '...' : ''),
          code: resolvedCode,
          project: mergedProject || undefined,
        };

        setVersions(prev => [newVersion, ...prev]);
        setCurrentVersion(newVersion.id);
        setCurrentCode(resolvedCode);
        setCurrentProject(mergedProject);

        // Save assistant message and build data to the database
        try {
          const { data: savedMessage } = await supabase
            .from('messages')
            .insert({
              conversation_id: activeConvId,
              role: 'assistant',
              content: finalAssistantContent,
            })
            .select()
            .single();

          if (savedMessage) {
            const { data: build } = await supabase.from('builds').insert({
              conversation_id: activeConvId,
              message_id: savedMessage.id,
              label: newVersion.label,
              html: resolvedCode.html,
              css: resolvedCode.css,
              js: resolvedCode.js,
              project_id: currentProjectId,
            }).select().single();

            if (build) {
              setLastBuildId(build.id);

              generateThumbnail(resolvedCode.html, resolvedCode.css, resolvedCode.js).then(async (thumbnailUrl) => {
                if (thumbnailUrl) {
                  await supabase
                    .from('builds')
                    .update({ thumbnail_url: thumbnailUrl })
                    .eq('id', build.id);
                }
              }).catch(console.error);

              toast({
                title: isHealingCall ? "Auto-corrección completada" : "Build guardado",
                description: isHealingCall ? "Se corrigieron los errores de compilación." : "Tu código ha sido guardado automáticamente.",
              });
            }

            await supabase.from('audit_logs').insert({
              action: isHealingCall ? 'build_auto_healed' : 'build_created',
              entity_type: 'build',
              entity_id: build?.id,
              details: { label: newVersion.label, project_id: currentProjectId },
            });
          }
        } catch (error) {
          console.error('Error saving build:', error);
        }
      } else {
        // Save assistant message without code
        try {
          await supabase.from('messages').insert({
            conversation_id: activeConvId,
            role: 'assistant',
            content: finalAssistantContent,
          });
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }

    } catch (error: any) {
      setIsLoading(false);
      setCurrentSteps(prev => prev.map(s => ({ ...s, status: 'error' })));
      setTimeout(() => {
        setCurrentSteps([]);
      }, 5000);

      toast({
        title: "Error de IA",
        description: error.message || "Error al conectar con la base de datos.",
        variant: "destructive",
      });
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    }
  }, [conversationId, messages, currentCode, currentProject, currentProjectId, isAuthenticated, wallet, deductCredit, createNewConversation, chatMode, healingRetries]);

  const selectVersion = useCallback((versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setCurrentVersion(versionId);
      setCurrentCode(version.code);
      setCurrentProject(version.project || null);
      
      supabase.from('audit_logs').insert({
        action: 'version_rollback',
        entity_type: 'build',
        entity_id: versionId,
        details: { label: version.label },
      });
    }
  }, [versions]);

  const saveToProject = useCallback(async (projectId: string) => {
    if (!lastBuildId) {
      toast({
        title: "Sin builds",
        description: "Genera un build primero antes de guardar.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update all builds in this conversation to the project
      await supabase
        .from('builds')
        .update({ project_id: projectId })
        .eq('conversation_id', conversationId);

      setCurrentProjectId(projectId);

      await supabase.from('audit_logs').insert({
        action: 'build_saved_to_project',
        entity_type: 'build',
        entity_id: lastBuildId,
        details: { project_id: projectId },
      });

      toast({
        title: "Proyecto guardado",
        description: "El proyecto se ha guardado correctamente con todos los archivos.",
      });
    } catch (error) {
      console.error('Error saving to project:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el proyecto.",
        variant: "destructive",
      });
    }
  }, [lastBuildId, conversationId]);

  // Update project when files are edited
  const updateProject = useCallback((updatedProject: ProjectOutput) => {
    setCurrentProject(updatedProject);
    
    // Also update the code output for preview
    const newCode = projectToCodeOutput(updatedProject);
    setCurrentCode(newCode);
    
    // Update the current version with new project
    if (currentVersion) {
      setVersions(prev => prev.map(v => 
        v.id === currentVersion 
          ? { ...v, code: newCode, project: updatedProject }
          : v
      ));
    }
  }, [currentVersion]);

  // Clear chat and start new conversation
  const clearChat = useCallback(async () => {
    clearState();
    setMessages([]);
    setVersions([]);
    setCurrentVersion(null);
    setCurrentProject(projectTemplate);
    setCurrentCode(projectToCodeOutput(projectTemplate));
    setCurrentProjectId(null);
    setLastBuildId(null);
    initializedRef.current = false;
    
    if (user) {
      await createNewConversation();
    }
    
    toast({
      title: "Chat limpiado",
      description: "Se ha iniciado una nueva conversación con la plantilla base.",
    });
  }, [clearState, user, createNewConversation]);

  // Handle Sandpack compilation/bundling error with Auto-healing (Fase 3)
  const handleCompilerError = useCallback(async (error: { errorText: string; filepath?: string }) => {
    // If already loading or healing, or we've hit the limit of 3 retries, don't trigger again
    if (isLoading || isHealingRef.current || healingRetries >= 3) {
      if (healingRetries >= 3) {
        toast({
          title: "Límite de auto-correcciones superado",
          description: "Chester Code intentó corregir el error 3 veces sin éxito. Por favor, revisa el código manualmente.",
          variant: "destructive",
        });
      }
      return;
    }

    isHealingRef.current = true;
    const nextRetries = healingRetries + 1;
    setHealingRetries(nextRetries);

    toast({
      title: `Auto-corrección activa (Intento ${nextRetries}/3)`,
      description: `Detectado error de compilación. Chester está reparando...`,
    });

    const errorDetails = `Error: ${error.errorText} ${error.filepath ? `en el archivo: ${error.filepath}` : ''}`;

    const healingPrompt = `¡ALERTA! El código generado anteriormente causó el siguiente error de compilación/ejecución en el bundler de Sandpack:
\`\`\`
${errorDetails}
\`\`\`

Por favor, corrige este error de inmediato. Analiza qué componente, importación o etiqueta causó la falla y genera un parche corrector. Devuelve todos los archivos modificados siguiendo el formato JSON exacto (PART 1 - NARRATIVE y PART 2 - PROJECT STRUCTURE) para parchar el código y solucionar el error.`;

    // Trigger sequential healing call passing isHealingCall = true
    await sendMessage(healingPrompt, true);
    isHealingRef.current = false;
  }, [isLoading, healingRetries, sendMessage]);

  return {
    messages,
    versions,
    currentVersion,
    currentCode,
    currentProject,
    isLoading,
    sendMessage,
    selectVersion,
    saveToProject,
    updateProject,
    lastBuildId,
    currentProjectId,
    clearChat,
    conversationId,
    chatMode,
    setChatMode,
    currentSteps,
    onCompilerError: handleCompilerError,
  };
};
