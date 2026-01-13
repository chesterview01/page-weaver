import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Settings, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onOpenPreview?: () => void;
  hasCode?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onOpenPreview, hasCode }) => {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-primary shadow-glow">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">
            WebBuilder<span className="text-primary">AI</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {hasCode && onOpenPreview && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOpenPreview}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir vista previa
          </Button>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9"
          onClick={() => navigate('/settings')}
          title="Ajustes"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

export default Header;
