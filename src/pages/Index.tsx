import React, { useEffect } from 'react';
import Header from '@/components/Header';
import ChatPanel from '@/components/ChatPanel';
import PreviewPanel from '@/components/PreviewPanel';
import VersionPanel from '@/components/VersionPanel';
import SaveProjectDialog from '@/components/SaveProjectDialog';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { usePreviewWindow } from '@/hooks/usePreviewWindow';

const Index = () => {
  const {
    messages,
    versions,
    currentVersion,
    currentCode,
    isLoading,
    sendMessage,
    selectVersion,
    saveToProject,
    lastBuildId,
  } = useChat();

  const { settings } = useSettings();
  const { openPreview, updatePreview, isPreviewOpen } = usePreviewWindow();

  // Auto-open preview in new tab when code changes (if setting enabled)
  useEffect(() => {
    if (currentCode && settings?.preview_in_new_tab) {
      if (isPreviewOpen()) {
        updatePreview(currentCode);
      } else {
        openPreview(currentCode);
      }
    }
  }, [currentCode, settings?.preview_in_new_tab, openPreview, updatePreview, isPreviewOpen]);

  const handleOpenPreview = () => {
    if (currentCode) {
      openPreview(currentCode);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top glow effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] gradient-glow pointer-events-none" />
      
      <Header onOpenPreview={handleOpenPreview} hasCode={!!currentCode} />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column - Chat */}
        <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col border-r border-border bg-card/30">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={sendMessage}
          />
        </div>

        {/* Right Column - Preview */}
        <div className="hidden md:flex flex-1 flex-col">
          <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
            <span className="text-sm text-muted-foreground px-2">Vista previa</span>
            <SaveProjectDialog 
              onSave={saveToProject}
              disabled={!lastBuildId}
            />
          </div>
          <div className="flex-1">
            <PreviewPanel code={currentCode} />
          </div>
        </div>

        {/* Version Sidebar */}
        <div className="hidden lg:block w-[260px] border-l border-border bg-card/30">
          <VersionPanel
            versions={versions}
            currentVersion={currentVersion}
            onSelectVersion={selectVersion}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
