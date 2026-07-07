import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import AuthModal from '@/components/AuthModal';
import { useAuthContext } from '@/contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuthContext();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/app', { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(220_40%_5%)] text-foreground relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-10 py-12 shadow-2xl shadow-black/40">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Bienvenido de nuevo</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Inicia sesión para acceder al constructor y comenzar tu próximo proyecto.
          </p>
        </div>
      </div>

      <AuthModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) navigate('/');
        }}
      />
    </div>
  );
};

export default Login;
