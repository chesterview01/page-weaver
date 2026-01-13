import { useState, useCallback, useEffect } from 'react';
import { Message, Version, CodeOutput } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

// Stream chat from edge function
async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
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
      body: JSON.stringify({ messages }),
    });

    if (resp.status === 429) {
      throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    }
    if (resp.status === 402) {
      throw new Error("Usage limit reached. Please add credits to continue.");
    }
    if (!resp.ok || !resp.body) {
      throw new Error("Failed to connect to AI service");
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
    onError(error instanceof Error ? error : new Error("Unknown error"));
  }
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCode, setCurrentCode] = useState<CodeOutput | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initialize or load conversation
  useEffect(() => {
    const initConversation = async () => {
      try {
        // Create a new conversation
        const { data: conv, error: convError } = await supabase
          .from('conversations')
          .insert({})
          .select()
          .single();

        if (convError) throw convError;
        setConversationId(conv.id);

        // Load any existing builds
        const { data: builds } = await supabase
          .from('builds')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false });

        if (builds && builds.length > 0) {
          const loadedVersions: Version[] = builds.map(build => ({
            id: build.id,
            timestamp: new Date(build.created_at),
            label: build.label,
            code: {
              html: build.html,
              css: build.css,
              js: build.js,
            },
          }));
          setVersions(loadedVersions);
          setCurrentVersion(loadedVersions[0].id);
          setCurrentCode(loadedVersions[0].code);
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
      }
    };

    initConversation();
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) {
      toast({
        title: "Error",
        description: "Conversation not initialized. Please refresh the page.",
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
      const codeContext = `Current code state:\n\nHTML:\n${currentCode.html}\n\nCSS:\n${currentCode.css}\n\nJS:\n${currentCode.js}`;
      aiMessages.unshift({ role: 'user', content: `Context: ${codeContext}` });
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
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages(prev => 
          prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
        );
      },
      onDone: async () => {
        setIsLoading(false);

        // Parse code from response
        const code = parseCodeFromResponse(assistantContent);
        
        if (code) {
          const newVersion: Version = {
            id: `v-${Date.now()}`,
            timestamp: new Date(),
            label: content.substring(0, 40) + (content.length > 40 ? '...' : ''),
            code,
          };

          // Update message with code output
          setMessages(prev =>
            prev.map(m => m.id === assistantId ? { ...m, codeOutput: code } : m)
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
                content: assistantContent,
              })
              .select()
              .single();

            if (savedMessage) {
              await supabase.from('builds').insert({
                conversation_id: conversationId,
                message_id: savedMessage.id,
                label: newVersion.label,
                html: code.html,
                css: code.css,
                js: code.js,
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
  }, [conversationId, messages, currentCode]);

  const selectVersion = useCallback((versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setCurrentVersion(versionId);
      setCurrentCode(version.code);
    }
  }, [versions]);

  return {
    messages,
    versions,
    currentVersion,
    currentCode,
    isLoading,
    sendMessage,
    selectVersion,
  };
};
