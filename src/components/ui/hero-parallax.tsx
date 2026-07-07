"use client";
import React from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "./button";
import { ArrowUpRight, MessageCircle, Instagram, Facebook, Twitter, Linkedin, Mail } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteContent";

export const HeroParallax = ({
  products,
  title,
  subtitle,
  isAuthenticated,
  onAuthClick,
}: {
  products: {
    title: string;
    link: string;
    thumbnail: string;
  }[];
  title?: string;
  subtitle?: string;
  isAuthenticated: boolean;
  onAuthClick: () => void;
}) => {
  const rows = [
    products.slice(0, 5),
    products.slice(5, 10),
    products.slice(10, 15),
    products.slice(15, 20),
    products.slice(20, 25),
    products.slice(25, 30),
    products.slice(30, 35),
    products.slice(35, 40),
    products.slice(40, 45),
  ];
  const ref = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 1], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 1], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 1], [-2100, 600]),
    springConfig
  );
  return (
    <div
      ref={ref}
      className="h-[300vh] pt-40 pb-0 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
    >
      <Header
        title={title}
        subtitle={subtitle}
        isAuthenticated={isAuthenticated}
        onAuthClick={onAuthClick}
      />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className=""
      >
        {rows.map((row, index) => (
          <motion.div
            key={index}
            className={`flex flex-row${
              index % 2 === 0 ? "-reverse space-x-reverse" : ""
            } space-x-20 ${index === rows.length - 1 ? "" : "mb-20"}`}
          >
            {row.map((product) => (
              <ProductCard
                product={product}
                translate={index % 2 === 0 ? translateX : translateXReverse}
                key={product.title}
              />
            ))}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export const Header = ({
  title,
  subtitle,
  isAuthenticated,
  onAuthClick,
}: {
  title?: string;
  subtitle?: string;
  isAuthenticated: boolean;
  onAuthClick: () => void;
}) => {
  const navigate = useNavigate();
  const { settings } = useSiteSettings();

  const handleStart = () => {
    if (isAuthenticated) {
      navigate("/app");
    } else {
      navigate("/login");
    }
  };

  const socials = (() => {
    if (!settings) return [] as { href: string; label: string; icon: React.ReactNode }[];
    const list: { href: string; label: string; icon: React.ReactNode }[] = [];
    if (settings.contact_whatsapp) {
      const raw = settings.contact_whatsapp;
      const href = raw.startsWith("http") ? raw : `https://wa.me/${raw.replace(/[^0-9]/g, "")}`;
      list.push({ href, label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> });
    }
    if (settings.contact_email) list.push({ href: `mailto:${settings.contact_email}`, label: "Email", icon: <Mail className="h-4 w-4" /> });
    if (settings.contact_instagram) list.push({ href: settings.contact_instagram, label: "Instagram", icon: <Instagram className="h-4 w-4" /> });
    if (settings.contact_facebook) list.push({ href: settings.contact_facebook, label: "Facebook", icon: <Facebook className="h-4 w-4" /> });
    if (settings.contact_twitter) list.push({ href: settings.contact_twitter, label: "Twitter", icon: <Twitter className="h-4 w-4" /> });
    if (settings.contact_linkedin) list.push({ href: settings.contact_linkedin, label: "LinkedIn", icon: <Linkedin className="h-4 w-4" /> });
    return list;
  })();

  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
      <h1 className="text-2xl md:text-7xl font-bold dark:text-zinc-300">
        {title || "Chester Code IA"}
      </h1>
      <p className="max-w-2xl text-base md:text-xl mt-8 dark:text-neutral-200">
        {subtitle || "Tu socio en el desarrollo de software a medida. Construimos plataformas rápidas, escalables y con bases de datos en tiempo real."}
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 group h-12 px-6 shadow-lg shadow-primary/20"
          onClick={handleStart}
        >
          Iniciar Proyecto
          <ArrowUpRight className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Button>

        {socials.length > 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] backdrop-blur-xl px-3 py-2 shadow-lg shadow-black/20">
            <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Contacto</span>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-all hover:text-foreground hover:bg-white/5 hover:scale-110"
              >
                {s.icon}
              </a>
            ))}
          </div>
        ) : (
          <a
            href="#contacto"
            className="inline-flex items-center gap-2 h-12 px-5 rounded-md border border-white/10 bg-white/[0.03] backdrop-blur-xl text-sm text-foreground/90 hover:bg-white/[0.06] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Contacto
          </a>
        )}
      </div>
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
}: {
  product: {
    title: string;
    link: string;
    thumbnail: string;
  };
  translate: MotionValue<number>;
}) => {
  return (
    <motion.div
      style={{
        x: translate,
      }}
      whileHover={{
        y: -20,
      }}
      key={product.title}
      className="group/product h-96 w-[30rem] relative flex-shrink-0"
    >
      <Link
        to={product.link}
        className="block group-hover/product:shadow-2xl"
      >
        <img
          src={product.thumbnail}
          height="600"
          width="600"
          className="object-cover object-left-top absolute h-full w-full inset-0"
          alt={product.title}
        />
      </Link>
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black pointer-events-none"></div>
      <h2 className="absolute bottom-4 left-4 opacity-0 group-hover/product:opacity-100 text-white">
        {product.title}
      </h2>
    </motion.div>
  );
};
