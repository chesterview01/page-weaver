import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import { Sparkles, Zap, Code2, Rocket, Shield, Globe } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const openLogin = () => {
    setAuthMode('login');
    setAuthOpen(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-secondary/10 rounded-full blur-[80px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Code2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Chester Code IA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={openLogin}>
            Iniciar sesión
          </Button>
          <Button onClick={openRegister} className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity">
            Registrarse
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 px-6 md:px-12 lg:px-20">
        <section className="max-w-6xl mx-auto pt-16 md:pt-24 lg:pt-32 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Potenciado por Inteligencia Artificial</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold leading-tight mb-6">
            Crea proyectos y páginas
            <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-pulse">
              increíbles con IA
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Describe lo que quieres construir y nuestra IA generará el código por ti. 
            Sin experiencia previa necesaria. Solo imagina y crea.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button 
              size="lg" 
              onClick={openRegister}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 text-lg px-8 py-6"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Comenzar gratis
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => navigate('/pricing')}
              className="w-full sm:w-auto text-lg px-8 py-6"
            >
              Ver planes
            </Button>
          </div>

          {/* Preview mockup */}
          <div className="relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-background/50 text-xs text-muted-foreground">
                    chestercode.ia
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 h-[300px] md:h-[400px]">
                <div className="border-r border-border bg-muted/10 p-4">
                  <div className="space-y-3">
                    <div className="h-3 bg-primary/20 rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-3 bg-accent/20 rounded w-4/5" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="col-span-2 p-4 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 mx-auto mb-4 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm">Vista previa en tiempo real</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="max-w-6xl mx-auto py-24 md:py-32">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Todo lo que necesitas para crear
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Herramientas poderosas y fáciles de usar para convertir tus ideas en realidad
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'IA Generativa',
                description: 'Describe tu idea en lenguaje natural y la IA genera el código automáticamente.',
              },
              {
                icon: Zap,
                title: 'Vista previa instantánea',
                description: 'Ve los cambios en tiempo real mientras la IA construye tu proyecto.',
              },
              {
                icon: Code2,
                title: 'Código limpio',
                description: 'Genera HTML, CSS y JavaScript optimizado y bien estructurado.',
              },
              {
                icon: Rocket,
                title: 'Publicación fácil',
                description: 'Exporta tu proyecto como ZIP o publícalo directamente en tu dominio.',
              },
              {
                icon: Shield,
                title: 'Proyectos guardados',
                description: 'Guarda versiones de tu trabajo y accede desde cualquier lugar.',
              },
              {
                icon: Globe,
                title: 'Dominio personalizado',
                description: 'Configura tu propio dominio para publicar tus creaciones.',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl border border-border bg-card/30 hover:bg-card/50 hover:border-primary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="max-w-4xl mx-auto py-16 md:py-24 text-center">
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              ¿Listo para empezar?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Crea tu cuenta gratis y recibe 2 créditos para comenzar a construir.
            </p>
            <Button 
              size="lg" 
              onClick={openRegister}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 text-lg px-8"
            >
              Crear cuenta gratis
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 Chester Code IA. Todos los derechos reservados.</p>
        </footer>
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authMode} />
    </div>
  );
};

export default Landing;
