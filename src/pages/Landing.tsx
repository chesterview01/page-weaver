import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import { 
  Sparkles, 
  Zap, 
  Code2, 
  Rocket, 
  Shield, 
  Globe, 
  Users, 
  Star,
  ArrowRight,
  CheckCircle2,
  Layers,
  Database,
  Cloud,
  Github,
  Twitter,
  Linkedin,
  Mail
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Animation hook for fade-in on scroll
const useIntersectionObserver = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
};

// Animated Section Component
const AnimatedSection = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-700 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
        className
      )}
    >
      {children}
    </div>
  );
};

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

  const features = [
    {
      icon: Sparkles,
      title: 'IA Generativa',
      description: 'Describe tu idea y la IA genera código automáticamente.',
    },
    {
      icon: Zap,
      title: 'Vista Previa Instantánea',
      description: 'Cambios en tiempo real mientras construyes.',
    },
    {
      icon: Code2,
      title: 'Código Limpio',
      description: 'HTML, CSS y JavaScript optimizado.',
    },
    {
      icon: Rocket,
      title: 'Publicación Fácil',
      description: 'Exporta o publica en tu dominio.',
    },
  ];

  const integrations = [
    { icon: Database, name: 'Supabase' },
    { icon: Cloud, name: 'Vercel' },
    { icon: Github, name: 'GitHub' },
    { icon: Layers, name: 'React' },
    { icon: Globe, name: 'Dominio Propio' },
    { icon: Shield, name: 'SSL Gratis' },
  ];

  const testimonials = [
    {
      name: 'María García',
      role: 'Diseñadora UX',
      avatar: 'M',
      comment: 'Chester Code IA me permitió crear prototipos funcionales en minutos. Increíble herramienta.',
      rating: 5,
    },
    {
      name: 'Carlos López',
      role: 'Emprendedor',
      avatar: 'C',
      comment: 'Sin conocimientos de programación pude lanzar mi landing page. Muy recomendado.',
      rating: 5,
    },
    {
      name: 'Ana Martínez',
      role: 'Desarrolladora Frontend',
      avatar: 'A',
      comment: 'Uso Chester para acelerar mi flujo de trabajo. La IA genera código de calidad.',
      rating: 5,
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/15 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/15 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20 backdrop-blur-sm bg-background/80 border-b border-border/50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
            <Code2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Chester Code IA
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            onClick={openLogin}
            className="hidden sm:inline-flex hover:bg-primary/10 transition-colors"
          >
            Iniciar sesión
          </Button>
          <Button 
            onClick={openRegister} 
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 shadow-lg shadow-primary/25"
          >
            Comenzar gratis
          </Button>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section - Full Screen */}
        <section className="min-h-[calc(100vh-80px)] flex items-center px-6 md:px-12 lg:px-20 py-12 lg:py-0">
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Potenciado por IA</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Crea proyectos
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mt-2">
                  increíbles con IA
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Describe lo que quieres construir y nuestra IA generará el código por ti. 
                Sin experiencia previa necesaria.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Button 
                  size="lg" 
                  onClick={openRegister}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 text-lg px-8 py-6 shadow-xl shadow-primary/30 group"
                >
                  <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  Comenzar gratis
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/pricing')}
                  className="w-full sm:w-auto text-lg px-8 py-6 border-2 hover:bg-primary/5 transition-colors"
                >
                  Ver planes
                </Button>
              </div>

              {/* Trust badges */}
              <div className="flex items-center justify-center lg:justify-start gap-6 mt-10 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">2 créditos gratis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="text-sm">Sin tarjeta</span>
                </div>
              </div>
            </div>

            {/* Right - Mockup */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 rounded-3xl blur-2xl" />
              <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
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
                <div className="grid grid-cols-3 h-[400px]">
                  <div className="border-r border-border bg-muted/20 p-4">
                    <div className="space-y-3">
                      <div className="h-3 bg-primary/30 rounded w-3/4 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-accent/30 rounded w-4/5 animate-pulse" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-primary/20 rounded w-5/6" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  </div>
                  <div className="col-span-2 p-6 flex flex-col items-center justify-center bg-gradient-to-br from-muted/10 to-muted/5">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center mb-4 animate-pulse">
                      <Zap className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-muted-foreground text-sm">Vista previa en tiempo real</p>
                    <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-xs">
                      <div className="h-16 rounded-lg bg-primary/10 animate-pulse" />
                      <div className="h-16 rounded-lg bg-accent/10 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <AnimatedSection>
          <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                  Todo lo que necesitas
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Herramientas poderosas y fáciles de usar para convertir tus ideas en realidad
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                {features.map((feature, i) => (
                  <div
                    key={i}
                    className="group p-8 rounded-2xl border border-border bg-card/50 hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Integrations Section */}
        <AnimatedSection>
          <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                  Integraciones potentes
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Conecta con las herramientas que ya usas y amas
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                {integrations.map((integration, i) => (
                  <div
                    key={i}
                    className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-card/30 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <integration.icon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {integration.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Testimonials Section */}
        <AnimatedSection>
          <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20 bg-muted/30">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                  Lo que dicen nuestros usuarios
                </h2>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Miles de creadores ya usan Chester Code IA
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {testimonials.map((testimonial, i) => (
                  <div
                    key={i}
                    className="p-8 rounded-2xl border border-border bg-card/50 hover:bg-card hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, j) => (
                        <Star key={j} className="w-5 h-5 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="text-foreground mb-6 leading-relaxed">
                      "{testimonial.comment}"
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* CTA Section */}
        <AnimatedSection>
          <section className="py-24 md:py-32 px-6 md:px-12 lg:px-20">
            <div className="max-w-4xl mx-auto text-center">
              <div className="p-12 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/30">
                    <Rocket className="w-10 h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                    ¿Listo para empezar?
                  </h2>
                  <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
                    Crea tu cuenta gratis y recibe 2 créditos para comenzar a construir tus proyectos.
                  </p>
                  <Button 
                    size="lg" 
                    onClick={openRegister}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 text-lg px-10 py-6 shadow-xl shadow-primary/30"
                  >
                    Crear cuenta gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </AnimatedSection>

        {/* Footer */}
        <footer className="border-t border-border bg-muted/20">
          <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-20 py-16">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
              {/* Brand */}
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Code2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Chester Code IA
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Crea proyectos increíbles con el poder de la inteligencia artificial.
                </p>
              </div>

              {/* Product */}
              <div>
                <h4 className="font-semibold mb-4">Producto</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Características</a></li>
                  <li><a href="/pricing" className="hover:text-primary transition-colors">Precios</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Integraciones</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Changelog</a></li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h4 className="font-semibold mb-4">Empresa</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Sobre nosotros</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Carreras</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Contacto</a></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-primary transition-colors">Privacidad</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Términos</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Cookies</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom */}
            <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border gap-4">
              <p className="text-sm text-muted-foreground">
                © 2025 Chester Code IA. Todos los derechos reservados.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} defaultTab={authMode} />
    </div>
  );
};

export default Landing;
