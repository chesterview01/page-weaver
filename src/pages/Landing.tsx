import React, { useRef, useState, Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowUpRight,
  Database,
  Workflow,
  Smartphone,
  Globe,
  Send,
  CheckCircle2,
  Bot,
  Server,
  Plus,
  Sparkles,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import AuthModal from '@/components/AuthModal';
import { useSiteSettings, useBuiltProjects } from '@/hooks/useSiteContent';

const Spline = lazy(() => import('@splinetool/react-spline'));

const SERVICES = [
  { icon: Server, title: 'Software empresarial', desc: 'Arquitectura y desarrollo de ERPs, CRMs y plataformas internas de misión crítica. Construimos ecosistemas digitales escalables y seguros que centralizan la operación de tu empresa, reducen la fricción y optimizan la toma de decisiones en tiempo real.' },
  { icon: Database, title: 'Bases de datos', desc: 'Diseño, migración y optimización de bases de datos relacionales y NoSQL. Garantizamos alta disponibilidad, tiempos de respuesta de milisegundos y políticas de seguridad estrictas (RLS) para proteger el activo más valioso de tu empresa: la información.' },
  { icon: Globe, title: 'Páginas web', desc: 'Diseño inmersivo y desarrollo de ultra-alto rendimiento. Creamos plataformas web, portafolios y landing pages con integraciones 3D, animaciones fluidas y arquitectura moderna que convierten simples visitantes en clientes de alto valor.' },
  { icon: Smartphone, title: 'Aplicaciones', desc: 'Desarrollo nativo y multiplataforma. Diseñamos aplicaciones móviles y web-apps con interfaces intuitivas y experiencias sin fricción, pensadas para maximizar la retención, el engagement y el rendimiento en cualquier dispositivo.' },
  { icon: Bot, title: 'Bots e IA', desc: 'Integración de Inteligencia Artificial de vanguardia. Implementamos asistentes virtuales autónomos, integraciones con LLMs y agentes de atención 24/7 entrenados con la data específica de tu negocio para escalar tu soporte y ventas.' },
  { icon: Workflow, title: 'Automatizaciones', desc: 'Interconexión inteligente de sistemas. Conectamos tus API, creamos flujos de trabajo complejos y programamos scripts personalizados para eliminar tareas manuales, reducir el error humano y acelerar tus procesos operativos.' },
];

const SHOWCASE_IMAGES = [
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1400&q=80',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1400&q=80',
  'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=1400&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1400&q=80',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1400&q=80',
  'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?w=1400&q=80',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1400&q=80',
  'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1400&q=80',
];

const reveal = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
};

function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} transition={{ delay }} className={className}>
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

  const { settings } = useSiteSettings();
  const { projects } = useBuiltProjects();

  const siteName = settings?.site_name || 'Chester Code';
  const heroTitle = settings?.hero_title || 'Construimos software serio para empresas que escalan.';
  const heroSubtitle = settings?.hero_subtitle || 'Diseñamos, desarrollamos y operamos plataformas web, sistemas internos y aplicaciones móviles con estándares de ingeniería de alta gama.';

  useEffect(() => {
    if (settings?.site_name) document.title = settings.site_name;
  }, [settings?.site_name]);

  const { scrollYProgress: heroProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroContentY = useTransform(heroProgress, [0, 1], ['0%', '15%']);
  const heroGridY = useTransform(heroProgress, [0, 1], ['0%', '60%']);

  const { scrollYProgress: servicesProgress } = useScroll({ target: servicesRef, offset: ['start end', 'end start'] });
  const servicesBgY = useTransform(servicesProgress, [0, 1], ['-10%', '10%']);

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.name || !contact.email || !contact.message) return;
    setSending(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      toast.success('Mensaje enviado. Te contactaremos pronto.');
      setContact({ name: '', email: '', message: '' });
    } catch {
      toast.error('No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }

  // split hero title so last word/segment gets gradient
  const titleParts = (() => {
    const parts = heroTitle.split(' ');
    if (parts.length <= 3) return { first: '', last: heroTitle };
    const cut = Math.ceil(parts.length / 2);
    return { first: parts.slice(0, cut).join(' '), last: parts.slice(cut).join(' ') };
  })();

  return (
    <div className="min-h-screen bg-[hsl(220_40%_5%)] text-foreground">
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[hsl(220_40%_5%/0.75)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-tight">{siteName}</span>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#servicios" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Servicios</a>
            <a href="#trabajo" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Trabajo</a>
            <a href="#contacto" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contacto</a>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Entrar</Button>
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90" onClick={() => setAuthOpen(true)}>
              Iniciar proyecto
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden pt-24">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '72px 72px',
            y: heroGridY,
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />

        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 px-6 py-16 lg:grid-cols-2 lg:gap-12">
          <motion.div style={{ y: heroContentY }} className="relative z-10">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Agencia de Desarrollo de Software
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="mt-6 text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter md:text-7xl lg:text-[5.5rem]">
                {titleParts.first ? <>{titleParts.first} </> : null}
                <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {titleParts.last}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">{heroSubtitle}</p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Button size="lg" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 group h-12 px-6 shadow-lg shadow-primary/20" onClick={() => setAuthOpen(true)}>
                  Iniciar proyecto
                  <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 border-white/10 bg-white/[0.02] hover:bg-white/[0.05]" onClick={() => document.getElementById('servicios')?.scrollIntoView({ behavior: 'smooth' })}>
                  Ver servicios
                </Button>
              </div>
            </Reveal>

            {/* SHOWCASE CAROUSEL — replaces stats */}
            <Reveal delay={0.4}>
              <div className="mt-14 relative">
                <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-4">
                  <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle bg-primary" />
                  Nuestro trabajo en vivo
                </div>
                <ShowcaseMarquee images={SHOWCASE_IMAGES} />
              </div>
            </Reveal>
          </motion.div>

          {/* 3D ROBOT */}
          <div className="relative h-[500px] w-full lg:h-[650px]">
            <Suspense fallback={<div className="flex h-full w-full items-center justify-center"><div className="h-32 w-32 animate-pulse rounded-full bg-primary/20 blur-3xl" /></div>}>
              <Spline scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" />
            </Suspense>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <ServicesSticky sectionRef={servicesRef} bgY={servicesBgY} />

      {/* WORK / TRABAJO — Proyectos construidos */}
      <section id="trabajo" className="relative border-t border-white/5 bg-[hsl(220_40%_5%)] py-32">
        <div className="mx-auto max-w-[1400px] px-6">
          <Reveal>
            <SectionHead eyebrow="Trabajo" title="Proyectos construidos." />
          </Reveal>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {(projects.length ? projects : []).map((p, i) => (
              <Reveal key={p.id} delay={i * 0.05}>
                <a
                  href={p.link_url || '#'}
                  target={p.link_url && p.link_url !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="group relative block aspect-[4/5] overflow-hidden rounded-xl border border-white/10 bg-card"
                >
                  <img src={p.image_url} alt={p.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <div className="text-xs uppercase tracking-wider text-primary">{p.category}</div>
                    <div className="mt-1 text-xl font-bold">{p.title}</div>
                  </div>
                  <div className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </a>
              </Reveal>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center text-muted-foreground text-sm py-16">
                Aún no hay proyectos configurados. Añádelos desde el panel de administración.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="relative border-t border-white/5 bg-[hsl(222_47%_3%)] py-32">
        <div className="mx-auto grid max-w-[1400px] gap-16 px-6 lg:grid-cols-2 lg:gap-24">
          <div>
            <Reveal><SectionHead eyebrow="Contacto" title="Hablemos de tu próximo proyecto." /></Reveal>
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
            <Reveal delay={0.3}>
              <div className="mt-10 flex flex-wrap gap-3">
                {settings?.contact_whatsapp && (
                  <SocialLink href={settings.contact_whatsapp.startsWith('http') ? settings.contact_whatsapp : `https://wa.me/${settings.contact_whatsapp.replace(/[^0-9]/g,'')}`} label="WhatsApp"><MessageCircle className="h-4 w-4" /></SocialLink>
                )}
                {settings?.contact_email && <SocialLink href={`mailto:${settings.contact_email}`} label="Email"><Mail className="h-4 w-4" /></SocialLink>}
                {settings?.contact_instagram && <SocialLink href={settings.contact_instagram} label="Instagram"><Instagram className="h-4 w-4" /></SocialLink>}
                {settings?.contact_facebook && <SocialLink href={settings.contact_facebook} label="Facebook"><Facebook className="h-4 w-4" /></SocialLink>}
                {settings?.contact_twitter && <SocialLink href={settings.contact_twitter} label="Twitter"><Twitter className="h-4 w-4" /></SocialLink>}
                {settings?.contact_linkedin && <SocialLink href={settings.contact_linkedin} label="LinkedIn"><Linkedin className="h-4 w-4" /></SocialLink>}
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <form onSubmit={submitContact} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur">
              <Field label="Nombre">
                <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Tu nombre" required maxLength={120} />
              </Field>
              <Field label="Email">
                <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="tu@empresa.com" required maxLength={200} />
              </Field>
              <Field label="Mensaje">
                <Textarea rows={5} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} placeholder="Describe brevemente tu proyecto y objetivos" required maxLength={4000} />
              </Field>
              <Button type="submit" disabled={sending} className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 h-12">
                {sending ? 'Enviando...' : (<>Enviar consulta <Send className="ml-2 h-4 w-4" /></>)}
              </Button>
            </form>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 bg-[hsl(220_40%_5%)] py-12">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-mono text-xs font-semibold">{siteName} © {new Date().getFullYear()}</span>
          </div>
          <div className="text-xs text-muted-foreground">Ingeniería seria. Diseño impecable.</div>
        </div>
      </footer>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/10 transition-colors">
      {children}
    </a>
  );
}

function ShowcaseMarquee({ images }: { images: string[] }) {
  // duplicate list for seamless loop
  const loop = [...images, ...images];
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] py-4">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[hsl(220_40%_5%)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[hsl(220_40%_5%)] to-transparent" />
      <motion.div
        className="flex gap-4 w-max"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
      >
        {loop.map((src, i) => (
          <div key={i} className="h-32 w-56 shrink-0 overflow-hidden rounded-lg border border-white/10 md:h-40 md:w-72">
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </motion.div>
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
      <h2 className="mt-4 max-w-3xl text-balance text-4xl font-extrabold tracking-tighter md:text-6xl">{title}</h2>
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

function ServicesSticky({ sectionRef, bgY }: { sectionRef: React.RefObject<HTMLElement | null>; bgY: any }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <section ref={sectionRef} id="servicios" className="relative overflow-hidden border-t border-white/5 bg-[hsl(222_47%_3%)]">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
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
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">construimos.</span>
            </h2>
            <p className="mt-6 max-w-md text-base text-muted-foreground md:text-lg">
              Seis capacidades técnicas, una sola filosofía: ingeniería seria, entrega medible y diseño impecable.
            </p>
          </Reveal>
        </div>

        <ul className="relative divide-y divide-white/10">
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
                      <span className="mt-2 font-mono text-sm tabular-nums transition-colors duration-300 md:mt-6 md:text-xl" style={{ color: isHovered || isOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}>
                        0{i + 1}
                      </span>
                      <h3 className="text-4xl font-extrabold tracking-tighter transition-colors duration-300 md:text-7xl lg:text-8xl leading-[0.85] uppercase" style={{ color: isHovered || isOpen ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}>
                        {s.title}
                      </h3>
                    </div>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0, marginTop: isOpen ? 32 : 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30, opacity: { duration: 0.2 } }}
                      className="overflow-hidden pl-10 md:pl-24"
                    >
                      <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">{s.desc}</p>
                    </motion.div>
                  </div>
                  <div className="mt-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 transition-colors duration-300 group-hover:border-primary md:mt-6 md:h-20 md:w-20">
                    <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
                      <Plus className="h-6 w-6 stroke-[1.5px] transition-colors duration-300 md:h-10 md:w-10" style={{ color: isHovered || isOpen ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }} />
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
