import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AuthModal from '@/components/AuthModal';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { 
  Sparkles, 
  Zap, 
  Code2, 
  Rocket, 
  Shield, 
  Globe, 
  Star,
  ArrowRight,
  CheckCircle2,
  Layers,
  Database,
  Cloud,
  Github,
  Twitter,
  Linkedin,
  Mail,
  Palette,
  Smartphone,
  Clock,
  Wand2,
  MessageSquare,
  Server
} from 'lucide-react';
import { motion, useScroll, useTransform, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';

// Tutorial steps for the mini-carousel
const tutorialSteps = [
  {
    icon: Wand2,
    step: 'Paso 1',
    title: 'Diseña tu idea con IA',
    description:
      'Usa nuestra IA para diseñar y estructurar la idea de tu página en minutos, sin escribir una sola línea de código.',
    gradient: 'from-primary to-accent',
  },
  {
    icon: MessageSquare,
    step: 'Paso 2',
    title: 'Contáctanos con tu código',
    description:
      'Envíanos el código generado por la IA junto con tu visión, requisitos y objetivos de negocio.',
    gradient: 'from-accent to-primary',
  },
  {
    icon: Server,
    step: 'Paso 3',
    title: 'Ponemos tu web en producción',
    description:
      'Nuestro equipo profesional toma tu idea y la despliega con arquitectura escalable, segura y lista para crecer.',
    gradient: 'from-primary via-accent to-primary',
  },
];

// Animation variants with proper typing
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5 }
  }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.3 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring",
      stiffness: 300,
      damping: 15
    }
  }
};

const scaleUp: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5 }
  }
};


// Fictional project cards data
const projectCards = [
  { 
    title: 'Startup Landing', 
    category: 'Landing Page',
    gradient: 'from-violet-500 to-purple-600',
    mockupColor: 'bg-violet-500/20'
  },
  { 
    title: 'E-commerce Store', 
    category: 'Tienda Online',
    gradient: 'from-emerald-500 to-teal-600',
    mockupColor: 'bg-emerald-500/20'
  },
  { 
    title: 'Portfolio Creativo', 
    category: 'Portfolio',
    gradient: 'from-orange-500 to-red-600',
    mockupColor: 'bg-orange-500/20'
  },
  { 
    title: 'App Dashboard', 
    category: 'Dashboard',
    gradient: 'from-blue-500 to-indigo-600',
    mockupColor: 'bg-blue-500/20'
  },
  { 
    title: 'Blog Personal', 
    category: 'Blog',
    gradient: 'from-pink-500 to-rose-600',
    mockupColor: 'bg-pink-500/20'
  },
  { 
    title: 'SaaS Platform', 
    category: 'Web App',
    gradient: 'from-cyan-500 to-blue-600',
    mockupColor: 'bg-cyan-500/20'
  },
  { 
    title: 'Restaurant Menu', 
    category: 'Sitio Web',
    gradient: 'from-amber-500 to-orange-600',
    mockupColor: 'bg-amber-500/20'
  },
  { 
    title: 'Fitness Tracker', 
    category: 'Web App',
    gradient: 'from-lime-500 to-green-600',
    mockupColor: 'bg-lime-500/20'
  },
];

// Project Card Component with hover effects
const ProjectCard = ({ project, index }: { project: typeof projectCards[0]; index: number }) => (
  <motion.div
    variants={fadeInUp}
    whileHover={{ 
      y: -8, 
      scale: 1.02,
      transition: { duration: 0.3 }
    }}
    className="group relative rounded-2xl border border-border bg-card/50 overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-primary/10 transition-shadow duration-300"
  >
    {/* Mockup Preview */}
    <div className={cn("h-40 relative overflow-hidden", project.mockupColor)}>
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", project.gradient)} />
      {/* Fake browser chrome */}
      <div className="absolute top-3 left-3 right-3">
        <div className="flex gap-1.5 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/30" />
        </div>
        <div className="h-2 bg-white/20 rounded-full w-2/3" />
      </div>
      {/* Fake content lines */}
      <div className="absolute bottom-4 left-4 right-4 space-y-2">
        <div className="h-3 bg-white/30 rounded w-3/4" />
        <div className="h-2 bg-white/20 rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-6 bg-white/40 rounded-md w-16" />
          <div className="h-6 bg-white/20 rounded-md w-12" />
        </div>
      </div>
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ opacity: 1, scale: 1 }}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="bg-white/90 text-black px-4 py-2 rounded-full text-sm font-medium">
            Ver proyecto
          </div>
        </motion.div>
      </div>
    </div>
    {/* Card info */}
    <div className="p-4">
      <p className="text-xs text-muted-foreground mb-1">{project.category}</p>
      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
        {project.title}
      </h3>
    </div>
  </motion.div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Scroll-based parallax for mockup
  const { scrollY } = useScroll();
  const mockupY = useTransform(scrollY, [0, 500], [0, 100]);
  const mockupRotate = useTransform(scrollY, [0, 500], [0, 5]);

  const openLogin = () => {
    setAuthMode('login');
    setAuthOpen(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setAuthOpen(true);
  };

  const benefits = [
    {
      icon: Sparkles,
      title: 'IA Generativa',
      description: 'Describe tu idea en lenguaje natural y la IA genera código profesional automáticamente.',
    },
    {
      icon: Zap,
      title: 'Resultados Instantáneos',
      description: 'Ve los cambios en tiempo real mientras construyes. Sin esperas, sin compilaciones.',
    },
    {
      icon: Rocket,
      title: 'Publica en Segundos',
      description: 'Exporta como ZIP o publica directamente en tu dominio con un solo clic.',
    },
  ];

  const features = [
    { icon: Palette, text: 'Diseños modernos' },
    { icon: Smartphone, text: 'Responsive' },
    { icon: Code2, text: 'Código limpio' },
    { icon: Clock, text: 'Ahorra tiempo' },
    { icon: Shield, text: 'Seguro' },
    { icon: Globe, text: 'SEO optimizado' },
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
      <motion.nav 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-50 flex items-center justify-between px-6 py-5 md:px-12 lg:px-20 backdrop-blur-sm bg-background/80 border-b border-border/50 sticky top-0"
      >
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
      </motion.nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="min-h-[calc(100vh-80px)] flex items-center px-6 md:px-12 lg:px-20 py-12 lg:py-0">
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="text-center lg:text-left"
            >
              <motion.div 
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
              >
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm text-primary font-medium">Potenciado por IA</span>
              </motion.div>

              <motion.h1 
                variants={fadeInUp}
                className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] mb-6 tracking-tight"
              >
                Crea proyectos
                <span className="block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mt-2">
                  increíbles con IA
                </span>
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed"
              >
                Describe lo que quieres construir y nuestra IA generará el código por ti. 
                Sin experiencia previa necesaria.
              </motion.p>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <Button 
                  size="lg" 
                  onClick={openRegister}
                  className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all hover:scale-105 text-lg px-8 py-6 shadow-xl shadow-primary/30 group"
                >
                  <Rocket className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                  Comienza a crear tu página gratis
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
              </motion.div>

              {/* Feature pills */}
              <motion.div 
                variants={fadeInUp}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mt-10"
              >
                {features.slice(0, 4).map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border text-sm">
                    <feature.icon className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">{feature.text}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right - Animated Mockup */}
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{ y: mockupY, rotateZ: mockupRotate }}
              className="relative hidden lg:block"
            >
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
                      mi-proyecto.chestercode.ia
                    </div>
                  </div>
                </div>
                {/* Mockup content - fake landing page */}
                <div className="h-[400px] bg-gradient-to-b from-muted/20 to-muted/5 p-6">
                  {/* Fake nav */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="w-24 h-6 bg-primary/30 rounded animate-pulse" />
                    <div className="flex gap-3">
                      <div className="w-16 h-4 bg-muted rounded" />
                      <div className="w-16 h-4 bg-muted rounded" />
                      <div className="w-20 h-6 bg-primary/50 rounded-full" />
                    </div>
                  </div>
                  {/* Fake hero */}
                  <div className="text-center mt-12">
                    <div className="w-48 h-8 bg-gradient-to-r from-primary/40 to-accent/40 rounded mx-auto mb-4 animate-pulse" />
                    <div className="w-64 h-4 bg-muted rounded mx-auto mb-2" />
                    <div className="w-40 h-4 bg-muted rounded mx-auto mb-6" />
                    <div className="flex justify-center gap-3">
                      <div className="w-24 h-10 bg-primary/50 rounded-lg animate-pulse" />
                      <div className="w-20 h-10 bg-muted/50 rounded-lg border border-border" />
                    </div>
                  </div>
                  {/* Fake cards */}
                  <div className="grid grid-cols-3 gap-3 mt-10">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-card/50 rounded-lg border border-border/50 p-3">
                        <div className="w-6 h-6 bg-primary/30 rounded mb-2" />
                        <div className="w-full h-2 bg-muted rounded mb-1" />
                        <div className="w-2/3 h-2 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Floating elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="absolute -right-4 top-20 w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
              >
                <Code2 className="w-8 h-8 text-white" />
              </motion.div>
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                className="absolute -left-4 bottom-32 w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg"
              >
                <Zap className="w-6 h-6 text-white" />
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Projects Showcase Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 md:py-32 px-6 md:px-12 lg:px-20 bg-muted/30"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                Proyectos creados con Chester
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Miles de usuarios ya están creando páginas increíbles con nuestra IA
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6"
            >
              {projectCards.map((project, i) => (
                <ProjectCard key={i} project={project} index={i} />
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Benefits Section with Bounce Animation */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 md:py-32 px-6 md:px-12 lg:px-20"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                ¿Por qué Chester Code IA?
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Herramientas poderosas para convertir tus ideas en realidad
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  className="text-center group"
                >
                  <motion.div
                    variants={bounceIn}
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6 group-hover:from-primary/30 group-hover:to-accent/30 transition-all shadow-lg"
                  >
                    <benefit.icon className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Integrations Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 md:py-32 px-6 md:px-12 lg:px-20 bg-muted/30"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                Integraciones potentes
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Conecta con las herramientas que ya usas y amas
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
            >
              {integrations.map((integration, i) => (
                <motion.div
                  key={i}
                  variants={scaleUp}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-border bg-card/30 hover:bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                >
                  <integration.icon className="w-10 h-10 text-muted-foreground group-hover:text-primary transition-colors mb-3" />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                    {integration.name}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* Testimonials Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 md:py-32 px-6 md:px-12 lg:px-20"
        >
          <div className="max-w-7xl mx-auto">
            <motion.div variants={fadeInUp} className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                Lo que dicen nuestros usuarios
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Miles de creadores ya usan Chester Code IA
              </p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
            >
              {testimonials.map((testimonial, i) => (
                <motion.div
                  key={i}
                  variants={fadeInUp}
                  whileHover={{ y: -5 }}
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
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeIn}
          className="py-24 md:py-32 px-6 md:px-12 lg:px-20"
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.div 
              variants={scaleUp}
              className="p-12 md:p-16 rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
              <div className="relative z-10">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/30"
                >
                  <Rocket className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
                  ¿Listo para empezar?
                </h2>
                <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
                  Crea tu cuenta gratis y recibe 2 créditos para comenzar a construir tus proyectos.
                </p>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    size="lg" 
                    onClick={openRegister}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all text-lg px-10 py-6 shadow-xl shadow-primary/30"
                  >
                    Crear cuenta gratis
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.section>

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
