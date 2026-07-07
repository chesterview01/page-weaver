import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import ChatPanel from '@/components/ChatPanel';
import PreviewPanel from '@/components/PreviewPanel';
import VersionPanel from '@/components/VersionPanel';
import SaveProjectDialog from '@/components/SaveProjectDialog';
import AuthModal from '@/components/AuthModal';
import PricingModal from '@/components/PricingModal';
import { SupabaseManualConnector } from '@/components/SupabaseManualConnector';
import ReviewRequestModal from '@/components/dashboard/ReviewRequestModal';
import { useChat } from '@/hooks/useChat';
import { useSettings } from '@/hooks/useSettings';
import { usePreviewWindow } from '@/hooks/usePreviewWindow';
import { useAuthContext } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, ShieldCheck } from 'lucide-react';

const Index = () => {
  const {
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
  } = useChat();

  const { settings } = useSettings();
  const { openPreview, updatePreview, isPreviewOpen } = usePreviewWindow();
  const { isAuthenticated, wallet } = useAuthContext();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

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

  const handleSendMessage = async (content: string) => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    if (wallet && wallet.credits < 1) {
      setShowPricingModal(true);
      return;
    }

    await sendMessage(content);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top glow effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] gradient-glow pointer-events-none" />
      
      <Header 
        onOpenPreview={handleOpenPreview} 
        hasCode={!!currentCode} 
        currentCode={currentCode}
        onNewProject={clearChat}
      />
      
      <main className="flex-1 flex overflow-hidden">
        {/* Left Column - Chat */}
        <div className="w-full md:w-[400px] lg:w-[450px] flex flex-col border-r border-border bg-card/30">
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            disabled={!isAuthenticated}
          />
        </div>

        {/* Right Column - Preview */}
        <div className="hidden md:flex flex-1 flex-col">
          <div className="flex items-center justify-between p-2 border-b border-border bg-card/50">
            <span className="text-sm text-muted-foreground px-2">Vista previa</span>
            <div className="flex items-center gap-2">
              <SupabaseManualConnector compact />
              <SaveProjectDialog 
                onSave={saveToProject}
                disabled={!lastBuildId}
                existingProjectId={currentProjectId}
              />
            </div>
          </div>
          <div className="flex-1">
            <PreviewPanel 
              code={currentCode} 
              project={currentProject} 
              onProjectChange={updateProject}
            />
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

      <AuthModal open={showAuthPrompt} onOpenChange={setShowAuthPrompt} />
      <PricingModal open={showPricingModal} onOpenChange={setShowPricingModal} />
    </div>
  );
};

export default Index;
