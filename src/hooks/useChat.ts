import { useState, useCallback, useEffect, useRef } from 'react';
import { Message, Version, CodeOutput, ProjectOutput } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLocalPersistence } from '@/hooks/useLocalPersistence';
import { generateThumbnail } from '@/utils/thumbnailGenerator';

const SYSTEM_INSTRUCTIONS = `You are an expert web developer AI assistant that generates complete web projects with proper file structure.

CRITICAL: Your response must have TWO DISTINCT PARTS:

PART 1 - NARRATIVE (for the user to read):
Start with a friendly, conversational narrative explaining what you're building. DO NOT show any code in this part.
Provide a clear, detailed explanation of what you're creating.

PART 2 - PROJECT STRUCTURE (JSON format):
After your narrative, you MUST include a complete project structure in JSON format wrapped in a json code block.

The JSON must follow this EXACT structure:
\`\`\`json
{
  "projectName": "project-name-here",
  "files": [
    {
      "path": "src/pages/index.html",
      "content": "<!DOCTYPE html>..."
    },
    {
      "path": "src/styles/main.css",
      "content": "/* CSS content */"
    },
    {
      "path": "src/scripts/main.js",
      "content": "// JavaScript content"
    },
    {
      "path": "package.json",
      "content": "{ \\"name\\": \\"...\\" }"
    },
    {
      "path": "README.md",
      "content": "# Project Title..."
    }
  ]
}
\`\`\`

REQUIRED FILES (always include these):
1. src/pages/index.html - Main HTML file with the complete page structure
2. src/styles/main.css - All CSS styles
3. src/scripts/main.js - All JavaScript code
4. package.json - Basic project configuration
5. README.md - Project description

OPTIONAL FILES (include when appropriate):
- src/components/*.html - Reusable HTML components
- src/styles/variables.css - CSS custom properties
- src/styles/components/*.css - Component-specific styles
- public/images/ - Image placeholders references
- .gitignore - Git ignore file

DESIGN GUIDELINES:
- Make code modern, responsive, and visually appealing
- Use modern CSS features like flexbox, grid, gradients, and animations
- Include hover effects and transitions for interactive elements
- Make designs mobile-responsive using media queries
- Build upon previous requests when asked to modify
- The HTML in index.html should be a complete, valid HTML document

IMPORTANT:
- Always respond with the JSON structure, never with separate html/css/js code blocks
- Make sure the JSON is valid and properly escaped
- The content field should contain the actual file content as a string
- Use double backslashes for escaping quotes inside JSON strings`;

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

// Stream chat from database RPC
async function streamChat({
  conversationId,
  userMessage,
  settings,
  onDelta,
  onDone,
  onError,
}: {
  conversationId: string;
  userMessage: string;
  settings: { customApiUrl?: string; customApiKey?: string; useCustomAI?: boolean } | null;
  onDelta: (deltaText: string) => void;
  onDone: (messageId: string | null, returnedConversationId: string | null) => void;
  onError: (error: Error) => void;
}) {
  try {
    const { data, error } = await supabase.rpc('handle_constructor_chat', {
      p_user_message: userMessage,
      p_conversation_id: conversationId || null,
      p_use_custom_ai: settings?.useCustomAI || false,
      p_custom_api_key: settings?.customApiKey || null,
      p_custom_api_url: settings?.customApiUrl || null,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("No se recibió respuesta del asistente de IA.");
    }

    const responseJson = typeof data === 'string'
      ? JSON.parse(data)
      : (data as { success?: boolean; reply?: string; error?: string; conversation_id?: string; message_id?: string });

    if (responseJson?.success === false) {
      throw new Error(responseJson.error || "Error al procesar solicitud en el asistente de IA");
    }

    const reply = responseJson?.reply || '';
    const messageId = responseJson?.message_id || null;
    const returnedConversationId = responseJson?.conversation_id || null;

    onDelta(reply);
    onDone(messageId, returnedConversationId);
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    onError(new Error(errMsg));
  }
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const createNewConversation = async () => {
    if (!user) return;
    
    try {
      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      setConversationId(conv.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
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

    if (!conversationId) {
      toast({
        title: "Error",
        description: "Conversación no inicializada. Por favor, recarga la página.",
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

    // Context formatting: Prepend the existing code to the user prompt
    let promptToSend = content;
    if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
      promptToSend = `Contexto del código actual:\nHTML:\n${currentCode.html}\n\nCSS:\n${currentCode.css}\n\nJS:\n${currentCode.js}\n\nInstrucción del usuario:\n${content}`;
    }

    // Embed system instructions to ensure Gemini returns the proper project structure JSON
    const promptWithSystem = `${SYSTEM_INSTRUCTIONS}\n\nRequerimiento actual:\n${promptToSend}`;

    const assistantId = `msg-${Date.now()}-ai`;
    let assistantContent = '';

    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    await streamChat({
      conversationId: conversationId,
      userMessage: promptWithSystem,
      settings: settings ? {
        customApiUrl: settings.custom_api_url || undefined,
        customApiKey: settings.custom_api_key || undefined,
        useCustomAI: settings.use_custom_ai,
      } : null,
      onDelta: (chunk) => {
        assistantContent += chunk;
        const narrativeContent = extractNarrative(assistantContent);
        setMessages(prev => 
          prev.map(m => m.id === assistantId ? { ...m, content: narrativeContent } : m)
        );
      },
      onDone: async (insertedMessageId, returnedConversationId) => {
        setIsLoading(false);

        if (returnedConversationId && returnedConversationId !== conversationId) {
          setConversationId(returnedConversationId);
        }

        // Try to parse as project structure first
        const project = parseProjectFromResponse(assistantContent);
        const code = project ? projectToCodeOutput(project) : parseCodeFromResponse(assistantContent);
        const narrativeContent = extractNarrative(assistantContent);
        
        if (code || project) {
          const finalCode = code || { html: '', css: '', js: '' };
          
          const newVersion: Version = {
            id: `v-${Date.now()}`,
            timestamp: new Date(),
            label: content.substring(0, 40) + (content.length > 40 ? '...' : ''),
            code: finalCode,
            project: project || undefined,
          };

          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { 
              ...m, 
              content: narrativeContent, 
              codeOutput: finalCode,
              projectOutput: project || undefined,
            } : m)
          );

          setVersions(prev => [newVersion, ...prev]);
          setCurrentVersion(newVersion.id);
          setCurrentCode(finalCode);
          setCurrentProject(project);

          // Save build to database using the assistant message ID created by the RPC function
          if (insertedMessageId) {
            try {
              const { data: build } = await supabase.from('builds').insert({
                conversation_id: returnedConversationId || conversationId,
                message_id: insertedMessageId,
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
                
                // Show toast for auto-save
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
            } catch (error) {
              console.error('Error saving build:', error);
            }
          }
        } else {
          // Update narrative content in the UI messages even if no code block was parsed
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? {
              ...m,
              content: narrativeContent,
            } : m)
          );
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast({
          title: "Error de Construcción",
          description: error.message || "No se pudo conectar con el asistente de IA. Por favor, intenta de nuevo.",
          variant: "destructive",
        });
        // Remove the empty assistant placeholder message so the chat isn't cluttered
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages, currentCode, settings, currentProjectId, isAuthenticated, wallet, deductCredit]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearState, user]);

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
