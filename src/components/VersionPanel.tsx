import React from 'react';
import { History, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Version } from '@/types/chat';
import { cn } from '@/lib/utils';

interface VersionPanelProps {
  versions: Version[];
  currentVersion: string | null;
  onSelectVersion: (versionId: string) => void;
}

const VersionPanel: React.FC<VersionPanelProps> = ({
  versions,
  currentVersion,
  onSelectVersion,
}) => {
  if (versions.length === 0) {
    return (
      <div className="p-4 text-center">
        <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No hay versiones guardadas
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Historial</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {versions.length} versiones
        </span>
      </div>

      <div className="space-y-1 max-h-[300px] overflow-y-auto scrollbar-thin">
        {versions.map((version, index) => (
          <button
            key={version.id}
            onClick={() => onSelectVersion(version.id)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200',
              currentVersion === version.id
                ? 'glass-panel glow-border'
                : 'hover:bg-secondary/50'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium',
                currentVersion === version.id
                  ? 'gradient-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {currentVersion === version.id ? (
                <Check className="w-3 h-3" />
              ) : (
                versions.length - index
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {version.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {version.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            {currentVersion !== version.id && (
              <RotateCcw className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default VersionPanel;
