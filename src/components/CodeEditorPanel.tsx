import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Copy, Check, RotateCcw, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CodeEditorPanelProps {
  content: string;
  filename: string;
  onSave?: (content: string) => void;
  onChange?: (content: string) => void;
  readOnly?: boolean;
  className?: string;
}

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    html: 'html',
    css: 'css',
    json: 'json',
    md: 'markdown',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    sql: 'sql',
    sh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
  };
  return languageMap[ext || ''] || 'plaintext';
};

const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  content,
  filename,
  onSave,
  onChange,
  readOnly = false,
  className,
}) => {
  const [editedContent, setEditedContent] = useState(content);
  const [hasChanges, setHasChanges] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const language = getLanguageFromFilename(filename);

  // Reset content when file changes
  useEffect(() => {
    setEditedContent(content);
    setHasChanges(false);
    setSaveStatus('idle');
  }, [content, filename]);

  const handleContentChange = useCallback((newContent: string) => {
    setEditedContent(newContent);
    setHasChanges(newContent !== content);
    onChange?.(newContent);
  }, [content, onChange]);

  const handleSave = useCallback(() => {
    if (!hasChanges || readOnly) return;
    
    setSaveStatus('saving');
    onSave?.(editedContent);
    
    setTimeout(() => {
      setSaveStatus('saved');
      setHasChanges(false);
      toast({
        title: "Guardado",
        description: `${filename} guardado correctamente`,
      });
      
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 300);
  }, [editedContent, hasChanges, onSave, readOnly, filename, toast]);

  const handleRevert = useCallback(() => {
    setEditedContent(content);
    setHasChanges(false);
    setSaveStatus('idle');
  }, [content]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(editedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [editedContent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const lines = editedContent.split('\n');

  return (
    <div className={cn('flex flex-col h-full bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">{filename}</span>
          <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
            {language}
          </span>
          {hasChanges && (
            <span className="text-xs text-yellow-500 px-2 py-0.5 bg-yellow-500/10 rounded">
              Sin guardar
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-500 px-2 py-0.5 bg-green-500/10 rounded flex items-center gap-1">
              <Check className="w-3 h-3" />
              Guardado
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {hasChanges && !readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleRevert}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Revertir
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-500" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copiar
              </>
            )}
          </Button>
          {!readOnly && (
            <Button
              variant={hasChanges ? 'default' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5"
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'saving'}
            >
              <Save className="w-3.5 h-3.5" />
              {saveStatus === 'saving' ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto relative">
        <div className="flex min-h-full">
          {/* Line numbers */}
          <div className="flex-shrink-0 bg-muted/20 border-r border-border select-none">
            <div className="px-3 py-3 font-mono text-xs text-muted-foreground">
              {lines.map((_, index) => (
                <div key={index} className="h-5 leading-5 text-right">
                  {index + 1}
                </div>
              ))}
            </div>
          </div>

          {/* Code area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={editedContent}
              onChange={(e) => handleContentChange(e.target.value)}
              readOnly={readOnly}
              className={cn(
                'absolute inset-0 w-full h-full px-4 py-3 font-mono text-sm',
                'bg-transparent resize-none outline-none',
                'leading-5 whitespace-pre overflow-auto',
                readOnly && 'cursor-default'
              )}
              spellCheck={false}
              wrap="off"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Líneas: {lines.length}</span>
          <span>Caracteres: {editedContent.length}</span>
        </div>
        <div>
          {!readOnly && <span>Ctrl/Cmd + S para guardar</span>}
        </div>
      </div>
    </div>
  );
};

export default CodeEditorPanel;
