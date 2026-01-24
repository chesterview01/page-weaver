import React, { useState } from 'react';
import { Copy, Check, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CodeViewerProps {
  content: string;
  filename: string;
  className?: string;
}

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    svg: 'xml',
  };
  return languageMap[ext || ''] || 'plaintext';
};

const CodeViewer: React.FC<CodeViewerProps> = ({ content, filename, className }) => {
  const [copied, setCopied] = useState(false);
  
  const language = getLanguageFromFilename(filename);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  const lines = content.split('\n');
  
  return (
    <div className={cn('flex flex-col h-full bg-card rounded-lg overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{filename}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {language}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 gap-1"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span className="text-xs">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-xs">Copiar</span>
            </>
          )}
        </Button>
      </div>
      
      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="flex-shrink-0 py-4 pr-2 pl-4 text-right select-none bg-muted/30 border-r border-border">
            {lines.map((_, index) => (
              <div
                key={index}
                className="text-xs text-muted-foreground leading-6 font-mono"
              >
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Code */}
          <pre className="flex-1 py-4 px-4 overflow-x-auto">
            <code className="text-sm font-mono leading-6 whitespace-pre">
              {content}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;
