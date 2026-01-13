import React from 'react';
import Header from '@/components/Header';
import ChatPanel from '@/components/ChatPanel';
import PreviewPanel from '@/components/PreviewPanel';
import VersionPanel from '@/components/VersionPanel';
import { useChat } from '@/hooks/useChat';

const Index = () => {
  const {
    messages,
    versions,
    currentVersion,
    currentCode,
    isLoading,
    sendMessage,
    selectVersion,
  } = useChat();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top glow effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] gradient-glow pointer-events-none" />
      
      <Header />
      
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
          <PreviewPanel code={currentCode} />
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
