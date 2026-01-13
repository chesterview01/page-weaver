import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}
const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  onSendMessage,
  disabled = false
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };
  return <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-primary shadow-glow">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">AI Builder</h2>
          <p className="text-xs text-muted-foreground">Procesamiento IA</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 && <div className="flex flex-col items-center justify-center h-full text-center px-4 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              ¡Comienza a construir!
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Describe la página web que quieres crear. Por ejemplo: "Construye una landing page con un hero moderno y un botón de CTA"
            </p>
          </div>}

        {messages.map(message => <div key={message.id} className={cn('flex gap-3 animate-slide-up', message.role === 'user' ? 'flex-row-reverse' : '')}>
            <div className={cn('flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center', message.role === 'user' ? 'bg-primary/20 text-primary' : 'gradient-primary text-primary-foreground')}>
              {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={cn('flex-1 max-w-[85%] rounded-2xl px-4 py-3', message.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'glass-panel rounded-bl-md')}>
              <div className="text-sm whitespace-pre-wrap prose prose-sm prose-invert max-w-none">
                {message.content || (message.role === 'assistant' ? '...' : '')}
              </div>
              {message.codeOutput && <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10">
                    ✓ Código generado
                  </span>
                </div>}
              <span className="text-xs opacity-60 mt-2 block">
                {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
              </span>
            </div>
          </div>)}

        {isLoading && <div className="flex gap-3 animate-slide-up">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{
              animationDelay: '0ms'
            }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{
              animationDelay: '150ms'
            }} />
                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{
              animationDelay: '300ms'
            }} />
              </div>
            </div>
          </div>}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="relative glass-panel rounded-xl overflow-hidden">
          <textarea ref={textareaRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="Describe lo que quieres construir..." className="w-full bg-transparent px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[48px] max-h-[150px]" rows={1} disabled={isLoading} />
          <Button type="submit" size="icon" variant="glow" className="absolute right-2 bottom-2 h-8 w-8" disabled={!input.trim() || isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>;
};
export default ChatPanel;