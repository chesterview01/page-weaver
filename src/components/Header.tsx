import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, Settings, ExternalLink, LogIn, LogOut, Coins, CreditCard, User, Shield, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AuthModal from '@/components/AuthModal';
import ExportDropdown from '@/components/ExportDropdown';
import GitHubConnector from '@/components/GitHubConnector';
import PublishDialog from '@/components/PublishDialog';
import RecentProjects from '@/components/RecentProjects';
import { useAuthContext } from '@/contexts/AuthContext';
import { CodeOutput } from '@/types/chat';

interface HeaderProps {
  onOpenPreview?: () => void;
  hasCode?: boolean;
  currentCode?: CodeOutput | null;
  projectName?: string;
  projectId?: string | null;
  onNewProject?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenPreview, hasCode, currentCode, projectName, projectId, onNewProject }) => {
  const navigate = useNavigate();
  const { user, profile, wallet, isAuthenticated, signOut, isLoading, isAdmin } = useAuthContext();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <>
      <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
            <Terminal className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight">
              Chester Code <span className="text-primary">IA</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* New Project Button */}
          {isAuthenticated && onNewProject && (
            <Button
              variant="glow"
              size="sm"
              onClick={onNewProject}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proyecto
            </Button>
          )}

          {/* Recent Projects */}
          {isAuthenticated && <RecentProjects />}

          {/* Wallet display for authenticated users */}
          {isAuthenticated && wallet && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              <Coins className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{wallet.credits}</span>
            </div>
          )}

          {/* GitHub Connector */}
          {isAuthenticated && currentCode && (
            <GitHubConnector currentCode={currentCode} />
          )}

          {/* Export dropdown */}
          <ExportDropdown code={currentCode || null} projectName={projectName} />

          {/* Publish button */}
          {isAuthenticated && hasCode && (
            <PublishDialog
              projectId={projectId || null}
              projectName={projectName || 'Mi Proyecto'}
              currentCode={typeof currentCode === 'string' ? currentCode : ''}
            />
          )}

          {hasCode && onOpenPreview && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onOpenPreview}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Vista previa
            </Button>
          )}

          {/* Pricing button */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/pricing')}
            className="gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Planes
          </Button>

          {/* Settings button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => navigate('/settings')}
            title="Ajustes"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Auth section */}
          {isLoading ? (
            <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
          ) : isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(profile?.display_name || user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.display_name || 'Usuario'}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <User className="w-4 h-4 mr-2" />
                  Mi cuenta
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/pricing')}>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Planes y créditos
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="w-4 h-4 mr-2" />
                    Administración
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setAuthModalOpen(true)}
              className="gap-2"
            >
              <LogIn className="w-4 h-4" />
              Iniciar sesión
            </Button>
          )}
        </div>
      </header>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  );
};

export default Header;
