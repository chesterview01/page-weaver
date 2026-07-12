import { useRef, useCallback, useEffect } from 'react';
import { CodeOutput } from '@/types/chat';

export const usePreviewWindow = () => {
  const previewWindowRef = useRef<Window | null>(null);

  const openPreview = useCallback((code?: CodeOutput) => {
    // If window exists and is still open, focus it
    if (previewWindowRef.current && !previewWindowRef.current.closed) {
      previewWindowRef.current.focus();
    } else {
      // Open new window pointing exclusively to the unified /preview-fullscreen route
      const targetUrl = `${window.location.origin}/preview-fullscreen`;
      previewWindowRef.current = window.open(targetUrl, '_blank', 'width=1200,height=800');
    }
  }, []);

  const updatePreview = useCallback((code?: CodeOutput) => {
    // Under the localStorage storage event sync approach, changes in the editor
    // write to localStorage. The fullscreen page automatically catches these changes.
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
