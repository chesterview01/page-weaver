import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Version, CodeOutput, ProjectOutput } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocalPersistence } from '@/hooks/useLocalPersistence';
import { generateThumbnail } from '@/utils/thumbnailGenerator';

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
  const [currentCode, setCurrentCode] = useState<CodeOutput | null>(null);
  const [currentProject, setCurrentProject] = useState<ProjectOutput | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastBuildId, setLastBuildId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { settings } = useSettings();
  const { user, deductCredit, wallet, isAuthenticated } = useAuthContext();
  const { saveState, loadState, clearState, isCacheStale } = useLocalPersistence();
  
  const initializedRef = useRef(false);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    
    saveState({
      currentCode,
      messages,
      versions,
      conversationId,
      projectId: currentProjectId,
      lastBuildId,
      lastSync: new Date().toISOString(),
    });
  }, [messages, versions, currentCode, conversationId, currentProjectId, lastBuildId, isInitialized, saveState]);

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
        const loadedMessages: Message[] = msgs.map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: extractNarrative(m.content),
          timestamp: new Date(m.created_at),
        }));
        setMessages(loadedMessages);
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

  const sendMessage = useCallback(async (content: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas una cuenta para enviar mensajes.",
        variant: "destructive",
      });
      return;
    }

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

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Save user message to database
    try {
      await supabase.from('messages').insert({
        conversation_id: activeConvId,
        role: 'user',
        content,
      });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Construct unifed rich chat history in Spanish including system instructions, current code context, and history
    let combinedSystemPrompt = `Eres un Ingeniero Frontend Senior y Diseñador UI/UX experto. Tu objetivo es generar código de altísima calidad, moderno y listo para producción.

REGLAS ESTRICTAS DE DISEÑO:
1. UTILIZA TAILWIND CSS: Prohibido escribir CSS personalizado a menos que sea estrictamente necesario para animaciones complejas. Usa clases de Tailwind para todo el diseño, espaciado, colores y tipografía.
2. DISEÑO MODERNO: Usa modo oscuro por defecto (o un esquema de colores muy elegante), bordes redondeados (rounded-xl, rounded-2xl), sombras suaves (shadow-lg), y gradientes modernos (bg-gradient-to-r).
3. ICONOGRAFÍA: Usa iconos modernos (como Lucide o Heroicons) referenciándolos correctamente.
4. RESPONSIVE: Todo debe verse perfecto en móviles, tablets y escritorio usando los prefijos sm:, md:, lg: de Tailwind.

REGLAS DE CÓDIGO:
1. CÓDIGO COMPLETO: NUNCA dejes funciones a medias, NUNCA uses comentarios como '...resto del código aquí'. Debes devolver el código 100% funcional.
2. ESTRUCTURA: Si generas múltiples archivos, especifica claramente el nombre del archivo antes del bloque de código.

REGLAS DE SALIDA DE ENTREGAS (CRÍTICO):
Tu respuesta debe tener exactamente DOS PARTES DISTINTAS organizadas de la siguiente manera:

PART 1 - NARRATIVE:
Empieza siempre con una explicación amigable, clara y profesional explicando los cambios que estás construyendo o modificando. NO muestres ningún bloque de código en esta sección.

PART 2 - PROJECT STRUCTURE:
Justo después de tu narrativa, debes incluir un único bloque de código JSON con la estructura completa del proyecto que contenga exactamente este formato:
\`\`\`json
{
  "projectName": "nombre-del-proyecto",
  "files": [
    {
      "path": "src/pages/index.html",
      "content": "<!DOCTYPE html>\\n..."
    },
    {
      "path": "src/styles/main.css",
      "content": "/* Contenido CSS con clases Tailwind o estilos globales base si aplica */"
    },
    {
      "path": "src/scripts/main.js",
      "content": "// Código funcional interactivo JS"
    },
    {
      "path": "package.json",
      "content": "{ \\"name\\": \\"...\\" }"
    },
    {
      "path": "README.md",
      "content": "# Nombre del Proyecto..."
    }
  ]
}
\`\`\`

Asegúrate de que el JSON sea completamente válido, sin errores de escape, y que las comillas dobles internas de los contenidos estén debidamente escapadas.
`;

    // Include current code context in the system prompt if it exists
    if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
      combinedSystemPrompt += `\n\nDATOS DE REFERENCIA (Código actual del proyecto para que continúes o modifiques sobre él):\n\nHTML:\n${currentCode.html}\n\nCSS:\n${currentCode.css}\n\nJS:\n${currentCode.js}\n`;
    }

    const chatHistory: any[] = [
      { role: 'system', content: combinedSystemPrompt }
    ];

    // Include prior chat history (up to last 15 messages for optimal memory and context length)
    const historyLimit = 15;
    const recentMessages = messages.slice(-historyLimit);
    recentMessages.forEach(m => {
      chatHistory.push({
        role: m.role,
        content: m.content
      });
    });

    // Append the latest user query
    chatHistory.push({
      role: 'user',
      content: content
    });

    const assistantId = `msg-${Date.now()}-ai`;

    // Add empty placeholder assistant message in the UI state
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    try {
      // Call the secure database RPC 'chat_with_gemini' passing the full chat history
      const { data, error: rpcError } = await supabase.rpc('chat_with_gemini', {
        chat_history: chatHistory,
        model_name: 'gemini-3.1-flash-lite'
      });

      if (rpcError) throw rpcError;

      // Safely extract the generated response text from the RPC result JSON
      let assistantContent = "";
      if (data) {
        if (typeof data === 'string') {
          assistantContent = data;
        } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
          assistantContent = data.candidates[0].content.parts[0].text;
        } else if (data.text) {
          assistantContent = data.text;
        } else {
          assistantContent = JSON.stringify(data);
        }
      }

      if (!assistantContent) {
        throw new Error("No se recibió respuesta de la IA.");
      }

      setIsLoading(false);

      // Parse narrative text and structure/code outputs
      const project = parseProjectFromResponse(assistantContent);
      const code = project ? projectToCodeOutput(project) : parseCodeFromResponse(assistantContent);
      const narrativeContent = extractNarrative(assistantContent);

      // Update UI with the final result
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? {
          ...m,
          content: narrativeContent,
          codeOutput: code || undefined,
          projectOutput: project || undefined
        } : m)
      );

      if (code || project) {
        const finalCode = code || { html: '', css: '', js: '' };

        const newVersion: Version = {
          id: `v-${Date.now()}`,
          timestamp: new Date(),
          label: content.substring(0, 40) + (content.length > 40 ? '...' : ''),
          code: finalCode,
          project: project || undefined,
        };

        setVersions(prev => [newVersion, ...prev]);
        setCurrentVersion(newVersion.id);
        setCurrentCode(finalCode);
        setCurrentProject(project);

        // Save assistant message and build data to the database
        try {
          const { data: savedMessage } = await supabase
            .from('messages')
            .insert({
              conversation_id: activeConvId,
              role: 'assistant',
              content: assistantContent,
            })
            .select()
            .single();

          if (savedMessage) {
            const { data: build } = await supabase.from('builds').insert({
              conversation_id: activeConvId,
              message_id: savedMessage.id,
              label: newVersion.label,
              html: finalCode.html,
              css: finalCode.css,
              js: finalCode.js,
              project_id: currentProjectId,
            }).select().single();

            if (build) {
              setLastBuildId(build.id);

              // Generate and save thumbnail in background
              generateThumbnail(finalCode.html, finalCode.css, finalCode.js).then(async (thumbnailUrl) => {
                if (thumbnailUrl) {
                  await supabase
                    .from('builds')
                    .update({ thumbnail_url: thumbnailUrl })
                    .eq('id', build.id);
                }
              }).catch(console.error);

              toast({
                title: "Build guardado",
                description: "Tu código ha sido guardado automáticamente.",
              });
            }

            await supabase.from('audit_logs').insert({
              action: 'build_created',
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
            content: assistantContent,
          });
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }

    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: "Error de IA",
        description: error.message || "Error al conectar con la base de datos.",
        variant: "destructive",
      });
      // Remove placeholder message on failure
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    }
  }, [conversationId, messages, currentCode, currentProjectId, isAuthenticated, wallet, deductCredit, createNewConversation]);

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
    setCurrentCode(null);
    setCurrentProject(null);
    setCurrentProjectId(null);
    setLastBuildId(null);
    initializedRef.current = false;
    
    if (user) {
      await createNewConversation();
    }
    
    toast({
      title: "Chat limpiado",
      description: "Se ha iniciado una nueva conversación.",
    });
  }, [clearState, user, createNewConversation]);

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
  };
};
