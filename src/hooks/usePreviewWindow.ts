import { useRef, useCallback, useEffect } from 'react';
import { CodeOutput } from '@/types/chat';

export const usePreviewWindow = () => {
  const previewWindowRef = useRef<Window | null>(null);

  const generatePreviewHtml = (code: CodeOutput): string => {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vista Previa</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    ${code.css}
  </style>
</head>
<body>
  ${code.html}
  <script>${code.js}</script>
</body>
</html>`;
  };

  const openPreview = useCallback((code: CodeOutput) => {
    const html = generatePreviewHtml(code);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // If window exists and is still open, update it
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.location.href = url;
      previewWindowRef.current.focus();
    } else {
      // Open new window
      previewWindowRef.current = window.open(url, 'preview-window', 'width=1200,height=800');
    }

    // Clean up URL after a delay
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, []);

  const updatePreview = useCallback((code: CodeOutput) => {
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      const html = generatePreviewHtml(code);
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      previewWindowRef.current.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }, []);

  const closePreview = useCallback(() => {
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.close();
    }
    previewWindowRef.current = null;
  }, []);

  const isPreviewOpen = useCallback(() => {
    return previewWindowRef.current !== null && !previewWindowRef.current.closed;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't close on unmount - let user keep the window
    };
  }, []);

  return {
    openPreview,
    updatePreview,
    closePreview,
    isPreviewOpen,
  };
};
