import React, { useEffect } from 'react';
import { useSiteSettings } from '@/hooks/useSiteContent';

/**
 * Applies globally the brand configuration stored in site_settings:
 * - CSS variables (--primary, --accent, --background) via HSL tokens
 * - Document title (site_name)
 * - Favicon (favicon_url)
 * Renders children as-is.
 */
const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useSiteSettings();

  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    if (settings.primary_color) {
      root.style.setProperty('--primary', settings.primary_color);
      root.style.setProperty('--ring', settings.primary_color);
      root.style.setProperty('--sidebar-primary', settings.primary_color);
    }
    if (settings.accent_color) {
      root.style.setProperty('--accent', settings.accent_color);
    }
    if (settings.background_color) {
      root.style.setProperty('--background', settings.background_color);
    }
    if (settings.site_name) {
      document.title = settings.site_name;
    }
    if (settings.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings]);

  return <>{children}</>;
};

export default BrandProvider;
