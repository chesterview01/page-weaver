import React, { useMemo } from 'react';
import { Monitor, Smartphone, Tablet, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeOutput } from '@/types/chat';
import { cn } from '@/lib/utils';

interface PreviewPanelProps {
  code: CodeOutput | null;
}

type ViewportSize = 'desktop' | 'tablet' | 'mobile';

const PreviewPanel: React.FC<PreviewPanelProps> = ({ code }) => {
  const [viewport, setViewport] = React.useState<ViewportSize>('desktop');
  const [key, setKey] = React.useState(0);

  const iframeSrc = useMemo(() => {
    if (!code) return null;
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    ${code.css}
  </style>
</head>
<body>
  ${code.html}
  <script>${code.js}</script>
</body>
</html>`;
    
    return `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  }, [code]);

  const viewportClasses: Record<ViewportSize, string> = {
    desktop: 'w-full',
    tablet: 'w-[768px]',
    mobile: 'w-[375px]',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-1">
          <Button
            variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewport('desktop')}
          >
            <Monitor className="w-4 h-4" />
          </Button>
          <Button
            variant={viewport === 'tablet' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewport('tablet')}
          >
            <Tablet className="w-4 h-4" />
          </Button>
          <Button
            variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewport('mobile')}
          >
            <Smartphone className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setKey(k => k + 1)}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => iframeSrc && window.open(iframeSrc, '_blank')}
            disabled={!iframeSrc}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div
          className={cn(
            'mx-auto h-full transition-all duration-300 rounded-lg overflow-hidden shadow-card',
            viewportClasses[viewport]
          )}
        >
          {iframeSrc ? (
            <iframe
              key={key}
              src={iframeSrc}
              className="w-full h-full bg-white border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-card text-center p-8">
              <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Monitor className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Vista previa
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Tu página web aparecerá aquí cuando la IA genere el código
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;
