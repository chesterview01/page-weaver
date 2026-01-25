import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (Supabase handles this automatically)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage('Error al procesar la autenticación');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (session) {
          setStatus('success');
          setMessage('¡Autenticación exitosa! Redirigiendo...');
          
          // Small delay to show success message
          setTimeout(() => {
            navigate('/app', { replace: true });
          }, 1500);
        } else {
          // No session, might be an error or cancelled
          setStatus('error');
          setMessage('No se pudo obtener la sesión');
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setMessage('Error inesperado');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-lg text-muted-foreground">{message}</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <p className="text-lg text-foreground">{message}</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
            <p className="text-lg text-muted-foreground">{message}</p>
            <p className="text-sm text-muted-foreground">Redirigiendo al inicio...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
