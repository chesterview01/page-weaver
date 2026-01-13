import { useState, useCallback, useEffect } from 'react';
import { Message, Version, CodeOutput } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/useSettings';
import { useAuthContext } from '@/contexts/AuthContext';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

// Parse code blocks from AI response
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

// Extract narrative text (everything before code blocks)
const extractNarrative = (content: string): string => {
  // Remove code blocks from content
  let narrative = content
    .replace(/```html\n?[\s\S]*?```/g, '')
    .replace(/```css\n?[\s\S]*?```/g, '')
    .replace(/```(?:javascript|js)\n?[\s\S]*?```/g, '')
    .trim();
  
  // Clean up multiple newlines
  narrative = narrative.replace(/\n{3,}/g, '\n\n');
  
  return narrative || content;
};

// Stream chat from edge function
async function streamChat({
  messages,
  settings,
  onDelta,
  onDone,
  onError,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  settings: { narrativeStyle: string; customApiUrl?: string; customApiKey?: string; useCustomAI?: boolean } | null;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}) {
  try {
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages,
        narrativeStyle: settings?.narrativeStyle || 'detailed',
        customApiUrl: settings?.customApiUrl,
        customApiKey: settings?.customApiKey,
        useCustomAI: settings?.useCustomAI,
      }),
    });

    if (resp.status === 429) {
      throw new Error("Límite de peticiones excedido. Por favor, espera un momento.");
    }
    if (resp.status === 402) {
      throw new Error("Límite de uso alcanzado. Por favor, añade créditos.");
    }
    if (!resp.ok || !resp.body) {
      throw new Error("Error al conectar con el servicio de IA");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }

    // Final flush
    if (textBuffer.trim()) {
      for (let raw of textBuffer.split("\n")) {
        if (!raw) continue;
        if (raw.endsWith("\r")) raw = raw.slice(0, -1);
        if (raw.startsWith(":") || raw.trim() === "") continue;
        if (!raw.startsWith("data: ")) continue;
        const jsonStr = raw.slice(6).trim();
        if (jsonStr === "[DONE]") continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch { /* ignore */ }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error : new Error("Error desconocido"));
  }
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<CodeOutput | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [lastBuildId, setLastBuildId] = useState<string | null>(null);
  const { settings } = useSettings();
  const { user, deductCredit, wallet, isAuthenticated } = useAuthContext();

  // Initialize or load conversation
  useEffect(() => {
    const initConversation = async () => {
      // Wait for auth to be ready
      if (!user) return;
      
      try {
        // Check if loading a specific project
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('project');
        
        if (projectId) {
          setCurrentProjectId(projectId);
          // Load project builds
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
            
            // Get or create conversation for this project
            if (builds[0].conversation_id) {
              setConversationId(builds[0].conversation_id);
              // Load messages
              const { data: msgs } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', builds[0].conversation_id)
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
            }
          }
        }
        
        // Create a new conversation if none exists and user is authenticated
        if (!conversationId && user) {
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (convError) {
            console.error('Error creating conversation:', convError);
            return;
          }
          setConversationId(conv.id);
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initConversation();
  }, [user]);

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

    // Deduct credit first
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

    // Save user message to database
    try {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content,
      });
    } catch (error) {
      console.error('Error saving user message:', error);
    }

    // Prepare messages for AI (include context)
    const aiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    aiMessages.push({ role: 'user', content });

    // Include current code context if exists
    if (currentCode && (currentCode.html || currentCode.css || currentCode.js)) {
      const codeContext = `Código actual:\n\nHTML:\n${currentCode.html}\n\nCSS:\n${currentCode.css}\n\nJS:\n${currentCode.js}`;
      aiMessages.unshift({ role: 'user', content: `Contexto: ${codeContext}` });
    }

    let assistantContent = '';
    const assistantId = `msg-${Date.now()}-ai`;

    // Create placeholder assistant message
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    await streamChat({
      messages: aiMessages,
      settings: settings ? {
        narrativeStyle: settings.narrative_style,
        customApiUrl: settings.custom_api_url || undefined,
        customApiKey: settings.custom_api_key || undefined,
        useCustomAI: settings.use_custom_ai,
      } : null,
      onDelta: (chunk) => {
        assistantContent += chunk;
        // Show only narrative in chat
        const narrativeContent = extractNarrative(assistantContent);
        setMessages(prev => 
          prev.map(m => m.id === assistantId ? { ...m, content: narrativeContent } : m)
        );
      },
      onDone: async () => {
        setIsLoading(false);

        // Parse code from response
        const code = parseCodeFromResponse(assistantContent);
        const narrativeContent = extractNarrative(assistantContent);
        
        if (code) {
          const newVersion: Version = {
            id: `v-${Date.now()}`,
            timestamp: new Date(),
            label: content.substring(0, 40) + (content.length > 40 ? '...' : ''),
            code,
          };

          // Update message with code output indicator
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, content: narrativeContent, codeOutput: code } : m)
          );

          setVersions(prev => [newVersion, ...prev]);
          setCurrentVersion(newVersion.id);
          setCurrentCode(code);

          // Save build to database
          try {
            const { data: savedMessage } = await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                role: 'assistant',
                content: assistantContent, // Save full content including code
              })
              .select()
              .single();

            if (savedMessage) {
              const { data: build } = await supabase.from('builds').insert({
                conversation_id: conversationId,
                message_id: savedMessage.id,
                label: newVersion.label,
                html: code.html,
                css: code.css,
                js: code.js,
                project_id: currentProjectId,
              }).select().single();

              if (build) {
                setLastBuildId(build.id);
              }

              // Log action
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
              conversation_id: conversationId,
              role: 'assistant',
              content: assistantContent,
            });
          } catch (error) {
            console.error('Error saving assistant message:', error);
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
        // Remove placeholder message on error
        setMessages(prev => prev.filter(m => m.id !== assistantId));
      },
    });
  }, [conversationId, messages, currentCode, settings, currentProjectId, isAuthenticated, wallet, deductCredit]);

  const selectVersion = useCallback((versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setCurrentVersion(versionId);
      setCurrentCode(version.code);
      
      // Log rollback action
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
      await supabase
        .from('builds')
        .update({ project_id: projectId })
        .eq('id', lastBuildId);

      setCurrentProjectId(projectId);

      // Log action
      await supabase.from('audit_logs').insert({
        action: 'build_saved_to_project',
        entity_type: 'build',
        entity_id: lastBuildId,
        details: { project_id: projectId },
      });

      toast({
        title: "Proyecto guardado",
        description: "El build se ha guardado correctamente.",
      });
    } catch (error) {
      console.error('Error saving to project:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el proyecto.",
        variant: "destructive",
      });
    }
  }, [lastBuildId]);

  return {
    messages,
    versions,
    currentVersion,
    currentCode,
    isLoading,
    sendMessage,
    selectVersion,
    saveToProject,
    lastBuildId,
    currentProjectId,
  };
};
