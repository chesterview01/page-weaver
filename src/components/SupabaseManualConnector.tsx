import React, { useState } from 'react';
import { Database, Link, Unlink, Loader2, CheckCircle2, AlertCircle, ExternalLink, Key, Globe, TestTube2, Shield } from 'lucide-react';
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
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';
import { toast } from '@/hooks/use-toast';

interface SupabaseManualConnectorProps {
  compact?: boolean;
  onConnectionChange?: (connected: boolean) => void;
}

export const SupabaseManualConnector: React.FC<SupabaseManualConnectorProps> = ({
  compact = false,
  onConnectionChange,
}) => {
  const { 
    connection, 
    isLoading, 
    isConnecting, 
    isConnected,
    connectSupabase, 
    disconnectSupabase,
    validateConnection,
  } = useSupabaseConnection();
  
  const [open, setOpen] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [serviceRoleKey, setServiceRoleKey] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Test connection
  const handleTestConnection = async () => {
    if (!supabaseUrl || !serviceRoleKey) {
      toast({
        title: "Campos requeridos",
        description: "Ingresa URL y Service Role Key de Supabase.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult('idle');
    setTestMessage('');

    try {
      const result = await validateConnection(supabaseUrl, serviceRoleKey);
      
      if (result.valid) {
        setTestResult('success');
        setTestMessage(result.message);
        toast({
          title: "Conexión exitosa",
          description: "Las credenciales son válidas.",
        });
      } else {
        setTestResult('error');
        setTestMessage(result.message);
        toast({
          title: "Error de conexión",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setTestResult('error');
      setTestMessage(error.message || 'Error de conexión');
      toast({
        title: "Error",
        description: error.message || "No se pudo validar la conexión.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!supabaseUrl || !serviceRoleKey) return;
    
    const success = await connectSupabase(supabaseUrl, serviceRoleKey, projectName || undefined);
    if (success) {
      setOpen(false);
      setSupabaseUrl('');
      setServiceRoleKey('');
      setProjectName('');
      setTestResult('idle');
      onConnectionChange?.(true);
    }
  };

  const handleDisconnect = async () => {
    const success = await disconnectSupabase();
    if (success) {
      setShowDisconnectConfirm(false);
      onConnectionChange?.(false);
    }
  };

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
          supabaseUrl={supabaseUrl}
          setSupabaseUrl={setSupabaseUrl}
          serviceRoleKey={serviceRoleKey}
          setServiceRoleKey={setServiceRoleKey}
          projectName={projectName}
          setProjectName={setProjectName}
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
            <span className="font-medium text-green-600">Conectado a Supabase ✓</span>
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
                  Esto desactivará la conexión con Supabase. 
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
          {connection?.project_name && (
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3" />
              <span>{connection.project_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Globe className="h-3 w-3" />
            <span className="font-mono text-xs truncate">{connection?.supabase_url}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3" />
            <span className="text-xs">Service Role Key configurada</span>
          </div>
          {connection?.last_validated_at && (
            <p className="text-xs">
              Última validación: {new Date(connection.last_validated_at).toLocaleString('es-ES')}
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
        supabaseUrl={supabaseUrl}
        setSupabaseUrl={setSupabaseUrl}
        serviceRoleKey={serviceRoleKey}
        setServiceRoleKey={setServiceRoleKey}
        projectName={projectName}
        setProjectName={setProjectName}
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

// Dialog content component
const ConnectDialogContent: React.FC<{
  supabaseUrl: string;
  setSupabaseUrl: (value: string) => void;
  serviceRoleKey: string;
  setServiceRoleKey: (value: string) => void;
  projectName: string;
  setProjectName: (value: string) => void;
  isConnecting: boolean;
  isTesting: boolean;
  testResult: 'idle' | 'success' | 'error';
  testMessage: string;
  onTest: () => void;
  onConnect: () => void;
}> = ({
  supabaseUrl,
  setSupabaseUrl,
  serviceRoleKey,
  setServiceRoleKey,
  projectName,
  setProjectName,
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
        Ingresa las credenciales de tu proyecto de Supabase para conectar.
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
        {' → Settings → API → Project URL y service_role key (bajo "Project API keys").'}
      </AlertDescription>
    </Alert>

    <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
      <Shield className="h-4 w-4" />
      <AlertTitle>⚠️ Importante sobre la Service Role Key</AlertTitle>
      <AlertDescription className="text-xs">
        La service_role key tiene acceso completo a tu base de datos, sin restricciones de RLS.
        Nunca la expongas en código del frontend ni la compartas públicamente.
      </AlertDescription>
    </Alert>

    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="project-name" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Nombre del proyecto (opcional)
        </Label>
        <Input
          id="project-name"
          placeholder="Mi proyecto Supabase"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

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
        <Label htmlFor="service-role-key" className="flex items-center gap-2">
          <Key className="h-4 w-4" />
          Service Role Key (SUPABASE_SERVICE_ROLE_KEY)
        </Label>
        <Input
          id="service-role-key"
          type="password"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          value={serviceRoleKey}
          onChange={(e) => setServiceRoleKey(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Usa la service_role key para acceso completo. La encontrarás en Settings → API.
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
        disabled={!supabaseUrl || !serviceRoleKey || isTesting}
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
        disabled={!supabaseUrl || !serviceRoleKey || isConnecting}
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

export default SupabaseManualConnector;
