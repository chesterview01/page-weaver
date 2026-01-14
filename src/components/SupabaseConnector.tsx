import React, { useState } from 'react';
import { Database, Link, Unlink, Loader2, CheckCircle2, AlertCircle, ExternalLink, Key, Globe, TestTube2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useProjectIntegrations, ProjectIntegration } from '@/hooks/useProjectIntegrations';
import { createClient } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface SupabaseConnectorProps {
  projectId?: string;
  projectName?: string;
  compact?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const SupabaseConnector: React.FC<SupabaseConnectorProps> = ({
  projectId,
  projectName,
  compact = false,
  onConnectionChange,
}) => {
  const { integration, isLoading, isConnecting, connectSupabase, disconnectSupabase } = useProjectIntegrations(projectId || '');
  const [open, setOpen] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Test connection with direct SDK
  const handleTestConnection = async () => {
    if (!supabaseUrl || !supabaseKey) {
      toast({
        title: "Campos requeridos",
        description: "Ingresa URL y Key de Supabase.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult('idle');
    setTestMessage('');

    try {
      // Initialize client directly with SDK
      const testClient = createClient(supabaseUrl, supabaseKey);
      
      // Try to make a simple query to validate connection
      const { data, error } = await testClient.from('projects').select('id').limit(1);
      
      // Connection is valid even if table doesn't exist or is empty
      if (error && !error.message.includes('does not exist') && !error.message.includes('permission denied')) {
        throw new Error(error.message);
      }

      setTestResult('success');
      setTestMessage('Conexión exitosa con Supabase');
      toast({
        title: "Conexión exitosa",
        description: "Las credenciales de Supabase son válidas.",
      });
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setTestResult('error');
      setTestMessage(error.message || 'Error de conexión');
      toast({
        title: "Error de conexión",
        description: error.message || "No se pudo conectar con Supabase.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!supabaseUrl || !supabaseKey || !projectId) return;
    
    const success = await connectSupabase(projectId, supabaseUrl, supabaseKey);
    if (success) {
      setOpen(false);
      setSupabaseUrl('');
      setSupabaseKey('');
      setTestResult('idle');
      onConnectionChange?.(true);
    }
  };

  const handleDisconnect = async () => {
    if (!projectId) return;
    const success = await disconnectSupabase(projectId);
    if (success) {
      setShowDisconnectConfirm(false);
      onConnectionChange?.(false);
    }
  };

  const isConnected = integration?.is_connected ?? false;

  if (isLoading) {
    return (
      <Button variant="outline" size={compact ? "sm" : "default"} disabled>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Cargando...
      </Button>
    );
  }

  // Compact mode - just show status badge
  if (compact) {
    if (isConnected) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-green-600">Supabase conectado</span>
        </div>
      );
    }
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Database className="h-3 w-3 mr-1" />
            Conectar Supabase
          </Button>
        </DialogTrigger>
        <ConnectDialogContent
          projectName={projectName}
          supabaseUrl={supabaseUrl}
          setSupabaseUrl={setSupabaseUrl}
          supabaseKey={supabaseKey}
          setSupabaseKey={setSupabaseKey}
          isConnecting={isConnecting}
          isTesting={isTesting}
          testResult={testResult}
          testMessage={testMessage}
          onTest={handleTestConnection}
          onConnect={handleConnect}
        />
      </Dialog>
    );
  }

  // Full mode - show detailed card
  if (isConnected) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-600">Conectado a Supabase</span>
          </div>
          <Dialog open={showDisconnectConfirm} onOpenChange={setShowDisconnectConfirm}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Desconectar Supabase?</DialogTitle>
                <DialogDescription>
                  Esto desactivará la integración con Supabase para este proyecto. 
                  Los datos guardados en tu Supabase no se eliminarán.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDisconnectConfirm(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="text-sm text-muted-foreground space-y-1">
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            <span className="font-mono text-xs truncate">{integration?.supabase_url}</span>
          </div>
          {integration?.last_sync_at && (
            <p className="text-xs">
              Última sincronización: {new Date(integration.last_sync_at).toLocaleString('es-ES')}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Database className="h-4 w-4 mr-2" />
          Conectar con Supabase
        </Button>
      </DialogTrigger>
      <ConnectDialogContent
        projectName={projectName}
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        supabaseKey={supabaseKey}
        setSupabaseKey={setSupabaseKey}
        isConnecting={isConnecting}
        isTesting={isTesting}
        testResult={testResult}
        testMessage={testMessage}
        onTest={handleTestConnection}
        onConnect={handleConnect}
      />
    </Dialog>
  );
};

// Separate component for dialog content to avoid duplication
const ConnectDialogContent: React.FC<{
  projectName?: string;
  supabaseUrl: string;
  setSupabaseUrl: (value: string) => void;
  supabaseKey: string;
  setSupabaseKey: (value: string) => void;
  isConnecting: boolean;
  isTesting: boolean;
  testResult: 'idle' | 'success' | 'error';
  testMessage: string;
  onTest: () => void;
  onConnect: () => void;
}> = ({
  projectName,
  supabaseUrl,
  setSupabaseUrl,
  supabaseKey,
  setSupabaseKey,
  isConnecting,
  isTesting,
  testResult,
  testMessage,
  onTest,
  onConnect,
}) => (
  <DialogContent className="sm:max-w-[500px]">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <Database className="h-5 w-5" />
        Conectar con Supabase
      </DialogTitle>
      <DialogDescription>
        {projectName 
          ? `Conecta "${projectName}" con tu proyecto de Supabase para persistir datos.`
          : 'Conecta tu proyecto con Supabase para persistir datos.'
        }
      </DialogDescription>
    </DialogHeader>

    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>¿Dónde encuentro estas credenciales?</AlertTitle>
      <AlertDescription className="text-xs">
        Ve a tu proyecto en{' '}
        <a 
          href="https://supabase.com/dashboard" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary underline inline-flex items-center gap-1"
        >
          Supabase Dashboard
          <ExternalLink className="h-3 w-3" />
        </a>
        {' → Settings → API → Project URL y anon key.'}
      </AlertDescription>
    </Alert>

    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="supabase-url" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Project URL (SUPABASE_URL)
        </Label>
        <Input
          id="supabase-url"
          placeholder="https://xxxxx.supabase.co"
          value={supabaseUrl}
          onChange={(e) => setSupabaseUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="supabase-key" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Anon Key (SUPABASE_KEY)
        </Label>
        <Input
          id="supabase-key"
          type="password"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          value={supabaseKey}
          onChange={(e) => setSupabaseKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Usa solo la clave anon (pública). Nunca uses la service_role key.
        </p>
      </div>

      {/* Test result display */}
      {testResult !== 'idle' && (
        <Alert variant={testResult === 'success' ? 'default' : 'destructive'} className={testResult === 'success' ? 'border-green-500/50 bg-green-500/10' : ''}>
          {testResult === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription className={testResult === 'success' ? 'text-green-600' : ''}>
            {testMessage}
          </AlertDescription>
        </Alert>
      )}
    </div>

    <DialogFooter className="flex-col sm:flex-row gap-2">
      <Button 
        variant="outline"
        onClick={onTest}
        disabled={!supabaseUrl || !supabaseKey || isTesting}
        className="w-full sm:w-auto"
      >
        {isTesting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Validando...
          </>
        ) : (
          <>
            <TestTube2 className="h-4 w-4 mr-2" />
            Probar conexión
          </>
        )}
      </Button>
      <Button 
        onClick={onConnect} 
        disabled={!supabaseUrl || !supabaseKey || isConnecting}
        className="w-full sm:w-auto"
      >
        {isConnecting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Conectando...
          </>
        ) : (
          <>
            <Link className="h-4 w-4 mr-2" />
            Conectar
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
);

export default SupabaseConnector;
