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

// Stream chat from database RPC
async function streamChat({
  conversationId,
  userMessage,
  messages,
  settings,
  onDelta,
  onDone,
  onError,
}: {
  conversationId: string;
  userMessage: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  settings: { narrativeStyle: string; customApiUrl?: string; customApiKey?: string; useCustomAI?: boolean } | null;
  onDelta: (deltaText: string) => void;
  onDone: (insertedMessageId?: string) => void;
  onError: (error: Error) => void;
}) {
  try {
    const { data, error } = await supabase.rpc('handle_constructor_chat', {
      p_conversation_id: conversationId,
      p_messages: messages,
      p_user_message: userMessage,
      p_narrative_style: settings?.narrativeStyle || 'detailed',
      p_custom_api_url: settings?.customApiUrl || null,
      p_custom_api_key: settings?.customApiKey || null,
      p_use_custom_ai: settings?.useCustomAI || false
    });

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error("No se recibió respuesta del asistente de IA.");
    }

    const responseJson = typeof data === 'string'
      ? JSON.parse(data)
      : (data as { content?: string; message_id?: string });
    const content = responseJson?.content || '';
    const messageId = responseJson?.message_id || null;

    onDelta(content);
    onDone(messageId);
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

    // Prepare messages for AI (excluding the new user message, as the RPC appends it)
    const aiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    // Include current code context if it exists
    if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
      const codeContext = `Código actual:\n\nHTML:\n${currentCode.html}\n\nCSS:\n${currentCode.css}\n\nJS:\n${currentCode.js}`;
      aiMessages.unshift({ role: 'user', content: `Contexto: ${codeContext}` });
    }

    let assistantContent = '';
    const assistantId = `msg-${Date.now()}-ai`;

    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    await streamChat({
      conversationId: conversationId!,
      userMessage: content,
      messages: aiMessages,
      settings: settings ? {
        narrativeStyle: settings.narrative_style,
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
      onDone: async (insertedMessageId) => {
        setIsLoading(false);

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
                conversation_id: conversationId,
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
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      },
    });
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
