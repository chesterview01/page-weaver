import React, { useRef, useState, useEffect } from 'react';
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
import { HeroParallax } from '@/components/ui/hero-parallax';
import { useAuthContext } from '@/contexts/AuthContext';

const SERVICES = [
  { icon: Server, title: 'Software empresarial', desc: 'Arquitectura y desarrollo de ERPs, CRMs y plataformas internas de misión crítica. Construimos ecosistemas digitales escalables y seguros que centralizan la operación de tu empresa, reducen la fricción y optimizan la toma de decisiones en tiempo real.' },
  { icon: Database, title: 'Bases de datos', desc: 'Diseño, migración y optimización de bases de datos relacionales y NoSQL. Garantizamos alta disponibilidad, tiempos de respuesta de milisegundos y políticas de seguridad estrictas (RLS) para proteger el activo más valioso de tu empresa: la información.' },
  { icon: Globe, title: 'Páginas web', desc: 'Diseño inmersivo y desarrollo de ultra-alto rendimiento. Creamos plataformas web, portafolios y landing pages con integraciones 3D, animaciones fluidas y arquitectura moderna que convierten simples visitantes en clientes de alto valor.' },
  { icon: Smartphone, title: 'Aplicaciones', desc: 'Desarrollo nativo y multiplataforma. Diseñamos aplicaciones móviles y web-apps con interfaces intuitivas y experiencias sin fricción, pensadas para maximizar la retención, el engagement y el rendimiento en cualquier dispositivo.' },
  { icon: Bot, title: 'Bots e IA', desc: 'Integración de Inteligencia Artificial de vanguardia. Implementamos asistentes virtuales autónomos, integraciones con LLMs y agentes de atención 24/7 entrenados con la data específica de tu negocio para escalar tu soporte y ventas.' },
  { icon: Workflow, title: 'Automatizaciones', desc: 'Interconexión inteligente de sistemas. Conectamos tus API, creamos flujos de trabajo complejos y programamos scripts personalizados para eliminar tareas manuales, reducir el error humano y acelerar tus procesos operativos.' },
];

const PRODUCTS = [
  // Row 1
  { title: "Enterprise Dashboard", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" },
  { title: "Cloud Analytics", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" },
  { title: "System Monitoring", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80" },
  { title: "Financial Platform", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80" },
  { title: "AI Control Panel", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80" },
  // Row 2
  { title: "Mobile CRM", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80" },
  { title: "DevOps Workspace", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1618401471353-b98aadebc25a?w=800&q=80" },
  { title: "Cybersecurity Hub", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" },
  { title: "Inventory Management", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?w=800&q=80" },
  { title: "Real-time Metrics", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&q=80" },
  // Row 3
  { title: "Modern SaaS", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80" },
  { title: "Digital Banking", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80" },
  { title: "Smart Logistics", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80" },
  { title: "API Gateway", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&q=80" },
  { title: "Data Warehouse", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" },
  // Row 4
  { title: "Supply Chain Pro", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80" },
  { title: "E-commerce Engine", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1557821552-17105176677c?w=800&q=80" },
  { title: "HealthTech Portal", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80" },
  { title: "Auto Pilot AI", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80" },
  { title: "Crypto Tracker", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80" },
  // Row 5
  { title: "Smart City Grid", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800&q=80" },
  { title: "Green Energy Monitor", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80" },
  { title: "Space Tech Lab", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80" },
  { title: "Neuro Sync", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80" },
  { title: "Quantum Computing", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80" },
  // Row 6
  { title: "Bio Metrics Plus", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=800&q=80" },
  { title: "Deep Sea Exploration", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1484417856240-44e40e94531f?w=800&q=80" },
  { title: "Remote Work Suite", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1587560699334-bea93391dcef?w=800&q=80" },
  { title: "Event Horizon", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=800&q=80" },
  { title: "Digital Twins", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80" },
  // Row 7
  { title: "Enterprise Dashboard 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" },
  { title: "Cloud Analytics 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" },
  { title: "System Monitoring 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=800&q=80" },
  { title: "Financial Platform 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80" },
  { title: "AI Control Panel 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80" },
  // Row 8
  { title: "Mobile CRM 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80" },
  { title: "DevOps Workspace 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1618401471353-b98aadebc25a?w=800&q=80" },
  { title: "Cybersecurity Hub 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" },
  { title: "Inventory Management 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1586717791821-3f44a563eb4c?w=800&q=80" },
  { title: "Real-time Metrics 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&q=80" },
  // Row 9
  { title: "Modern SaaS 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80" },
  { title: "Digital Banking 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80" },
  { title: "Smart Logistics 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800&q=80" },
  { title: "API Gateway 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?w=800&q=80" },
  { title: "Data Warehouse 2", link: "#contacto", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" },
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
  const servicesRef = useRef<HTMLElement>(null);

  const { settings } = useSiteSettings();
  const { projects } = useBuiltProjects();
  const { isAuthenticated } = useAuthContext();

  const siteName = settings?.site_name || 'Chester Code';

  useEffect(() => {
    if (settings?.site_name) document.title = settings.site_name;
  }, [settings?.site_name]);

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
  const handleAction = () => {
    if (isAuthenticated) {
      navigate('/app');
    } else {
      setAuthOpen(true);
    }
  };

  const heroTitle = settings?.hero_title === "Construimos software serio para empresas que escalan." || !settings?.hero_title ? "ESTUDIO DE DESARROLLO DE SOFTWARE PROFESIONAL" : settings.hero_title;
  const heroSubtitle = settings?.hero_subtitle || "Tu socio en el desarrollo de software a medida. Construimos plataformas rápidas, escalables y con bases de datos en tiempo real.";

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
            {!isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Entrar</Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate('/app')}>Ir a la App</Button>
            )}
            <Button size="sm" className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90" onClick={handleAction}>
              Iniciar proyecto
            </Button>
          </div>
        </div>
      </header>

      {/* HERO PARALLAX */}
      <HeroParallax
        products={PRODUCTS}
        title={heroTitle}
        subtitle={heroSubtitle}
        isAuthenticated={isAuthenticated}
        onAuthClick={() => setAuthOpen(true)}
      />

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

import { MotionValue } from 'framer-motion';

function ServicesSticky({ sectionRef, bgY }: { sectionRef: React.RefObject<HTMLElement | null>; bgY: MotionValue<string> }) {
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
