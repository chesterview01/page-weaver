import React, { useRef, useState, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowUpRight,
  Database,
  Workflow,
  Smartphone,
  Globe,
  Send,
  ArrowRight,
  CheckCircle2,
  Bot,
  Server,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AuthModal from '@/components/AuthModal';

const Spline = lazy(() => import('@splinetool/react-spline'));

const SERVICES = [
  {
    icon: Server,
    title: 'Software empresarial',
    desc: 'Arquitectura y desarrollo de ERPs, CRMs y plataformas internas de misión crítica. Construimos ecosistemas digitales escalables y seguros que centralizan la operación de tu empresa, reducen la fricción y optimizan la toma de decisiones en tiempo real.',
  },
  {
    icon: Database,
    title: 'Bases de datos',
    desc: 'Diseño, migración y optimización de bases de datos relacionales y NoSQL. Garantizamos alta disponibilidad, tiempos de respuesta de milisegundos y políticas de seguridad estrictas (RLS) para proteger el activo más valioso de tu empresa: la información.',
  },
  {
    icon: Globe,
    title: 'Páginas web',
    desc: 'Diseño inmersivo y desarrollo de ultra-alto rendimiento. Creamos plataformas web, portafolios y landing pages con integraciones 3D, animaciones fluidas y arquitectura moderna que convierten simples visitantes en clientes de alto valor.',
  },
  {
    icon: Smartphone,
    title: 'Aplicaciones',
    desc: 'Desarrollo nativo y multiplataforma. Diseñamos aplicaciones móviles y web-apps con interfaces intuitivas y experiencias sin fricción, pensadas para maximizar la retención, el engagement y el rendimiento en cualquier dispositivo.',
  },
  {
    icon: Bot,
    title: 'Bots e IA',
    desc: 'Integración de Inteligencia Artificial de vanguardia. Implementamos asistentes virtuales autónomos, integraciones con LLMs y agentes de atención 24/7 entrenados con la data específica de tu negocio para escalar tu soporte y ventas.',
  },
  {
    icon: Workflow,
    title: 'Automatizaciones',
    desc: 'Interconexión inteligente de sistemas. Conectamos tus API, creamos flujos de trabajo complejos y programamos scripts personalizados para eliminar tareas manuales, reducir el error humano y acelerar tus procesos operativos.',
  },
];

const reveal = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      variants={reveal}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const servicesRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroContentY = useTransform(heroProgress, [0, 1], ['0%', '15%']);
  const heroGridY = useTransform(heroProgress, [0, 1], ['0%', '60%']);

  const { scrollYProgress: servicesProgress } = useScroll({
    target: servicesRef,
    offset: ['start end', 'end start'],
  });
  const servicesBgY = useTransform(servicesProgress, [0, 1], ['-10%', '10%']);

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.name || !contact.email || !contact.message) return;
    setSending(true);
    try {
      // Fallback silencioso — sin edge function
      await new Promise((r) => setTimeout(r, 700));
      toast.success('Mensaje enviado. Te contactaremos pronto.');
      setContact({ name: '', email: '', message: '' });
    } catch {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight">Chester Code</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#servicios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Servicios</a>
            <a href="#trabajo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trabajo</a>
            <a href="#contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>
              Entrar
            </Button>
            <Button size="sm" className="gradient-primary text-primary-foreground hover:opacity-90" onClick={() => navigate('/app')}>
              Probar builder
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden pt-24">
        {/* Background grid */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            y: heroGridY,
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 gradient-glow" />

        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 px-6 py-16 lg:grid-cols-2 lg:gap-12">
          <motion.div style={{ y: heroContentY }} className="relative z-10">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Agencia de Desarrollo de Software
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter md:text-7xl lg:text-8xl">
                Construimos software serio{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  para empresas que escalan.
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
                Diseñamos, desarrollamos y operamos plataformas web, sistemas internos y aplicaciones móviles con estándares de ingeniería de alta gama.
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  className="gradient-primary text-primary-foreground hover:opacity-90 group h-12 px-6"
                  onClick={() => document.getElementById('contacto')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Iniciar un proyecto
                  <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 border-border/60"
                  onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver servicios
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="mt-12 flex items-center gap-6 text-xs uppercase tracking-wider text-muted-foreground">
                <div>
                  <div className="text-2xl font-bold text-foreground">50+</div>
                  <div className="mt-1">Proyectos entregados</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-foreground">24h</div>
                  <div className="mt-1">Tiempo respuesta</div>
                </div>
                <div className="h-8 w-px bg-border" />
                <div>
                  <div className="text-2xl font-bold text-foreground">100%</div>
                  <div className="mt-1">Código propietario</div>
                </div>
              </div>
            </Reveal>
          </motion.div>

          {/* 3D ROBOT */}
          <div className="relative h-[500px] w-full lg:h-[650px]">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-32 w-32 animate-pulse rounded-full bg-primary/20 blur-3xl" />
                </div>
              }
            >
              <Spline scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <ServicesSticky sectionRef={servicesRef} bgY={servicesBgY} />

      {/* WORK / TRABAJO */}
      <section id="trabajo" className="relative border-t border-border bg-background py-32">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal>
            <SectionHead eyebrow="Trabajo" title="Proyectos seleccionados." />
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="group relative aspect-[4/5] overflow-hidden rounded-lg border border-border/60 bg-card">
                  <div className="absolute inset-0 gradient-primary opacity-10 transition-opacity group-hover:opacity-30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl font-extrabold text-muted-foreground/20">0{i}</div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="text-xs uppercase tracking-wider text-primary">Enterprise</div>
                    <div className="mt-1 text-xl font-bold">Proyecto #{i}</div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="relative border-t border-border bg-[hsl(222_47%_4%)] py-32">
        <div className="mx-auto grid max-w-[1400px] gap-16 px-6 lg:grid-cols-2 lg:gap-24">
          <div>
            <Reveal>
              <SectionHead eyebrow="Contacto" title="Hablemos de tu próximo proyecto." />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="mt-8 max-w-lg text-lg text-muted-foreground">
                Cuéntanos qué quieres construir. Te responderemos en menos de 24 horas hábiles con una propuesta inicial.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mt-10 space-y-4">
                {['Discovery sin costo', 'Estimación detallada en 48h', 'Contrato y NDA estándar'].map((x) => (
                  <li key={x} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <form onSubmit={submitContact} className="space-y-5 rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur">
              <Field label="Nombre">
                <Input
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  placeholder="Tu nombre"
                  required
                  maxLength={120}
                />
              </Field>
              <Field label="Email">
                <Input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  placeholder="tu@empresa.com"
                  required
                  maxLength={200}
                />
              </Field>
              <Field label="Mensaje">
                <Textarea
                  rows={5}
                  value={contact.message}
                  onChange={(e) => setContact({ ...contact, message: e.target.value })}
                  placeholder="Describe brevemente tu proyecto y objetivos"
                  required
                  maxLength={4000}
                />
              </Field>
              <Button type="submit" disabled={sending} className="w-full gradient-primary text-primary-foreground hover:opacity-90 h-12">
                {sending ? 'Enviando...' : (<>Enviar consulta <Send className="ml-2 h-4 w-4" /></>)}
              </Button>
            </form>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded gradient-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-mono text-xs font-semibold">Chester Code © {new Date().getFullYear()}</span>
          </div>
          <div className="text-xs text-muted-foreground">Ingeniería seria. Diseño impecable.</div>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle bg-primary" />
        {eyebrow}
      </div>
      <h2 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold tracking-tighter md:text-6xl">
        {title}
      </h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ServicesSticky({
  sectionRef,
  bgY,
}: {
  sectionRef: React.RefObject<HTMLElement | null>;
  bgY: any;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section
      ref={sectionRef}
      id="servicios"
      className="relative overflow-hidden border-t border-border bg-[hsl(222_47%_4%)]"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          y: bgY,
        }}
      />
      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-6 py-32 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
        <div className="lg:sticky lg:top-40 lg:self-start">
          <Reveal>
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle bg-primary" />
              Servicios
            </div>
            <h2 className="mt-6 text-balance text-5xl font-extrabold tracking-tighter md:text-7xl">
              Lo que <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                construimos.
              </span>
            </h2>
            <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
              Seis capacidades técnicas, una sola filosofía: ingeniería seria, entrega medible y diseño impecable.
            </p>
          </Reveal>
        </div>

        <ul className="relative divide-y divide-border/60">
          {SERVICES.map((s, i) => {
            const isOpen = openIndex === i;
            const isHovered = hoveredIndex === i;
            const isDimmed = hoveredIndex !== null && !isHovered;
            return (
              <motion.li
                key={s.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="group relative cursor-pointer py-10 transition-opacity duration-300"
                style={{ opacity: isDimmed ? 0.4 : 1 }}
              >
                <div className="flex items-start justify-between gap-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-4 md:gap-8">
                      <span
                        className="mt-2 font-mono text-sm tabular-nums transition-colors duration-300 md:mt-6 md:text-xl"
                        style={{ color: isHovered || isOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                      >
                        0{i + 1}
                      </span>
                      <h3
                        className="text-4xl font-extrabold tracking-tighter transition-colors duration-300 md:text-7xl lg:text-8xl leading-[0.85] uppercase"
                        style={{ color: isHovered || isOpen ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
                      >
                        {s.title}
                      </h3>
                    </div>
                    <motion.div
                      initial={false}
                      animate={{
                        height: isOpen ? 'auto' : 0,
                        opacity: isOpen ? 1 : 0,
                        marginTop: isOpen ? 32 : 0,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 30,
                        opacity: { duration: 0.2 },
                      }}
                      className="overflow-hidden pl-10 md:pl-24"
                    >
                      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                        {s.desc}
                      </p>
                    </motion.div>
                  </div>
                  <div className="mt-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border transition-colors duration-300 group-hover:border-primary md:mt-6 md:h-20 md:w-20">
                    <motion.div
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <Plus
                        className="h-6 w-6 stroke-[1.5px] transition-colors duration-300 md:h-10 md:w-10"
                        style={{ color: isHovered || isOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                      />
                    </motion.div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
