import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings, useBuiltProjects, type BuiltProject } from '@/hooks/useSiteContent';

const SiteContentSection: React.FC = () => {
  const { settings, loading, update } = useSiteSettings();
  const { projects, reload } = useBuiltProjects();
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveSettings = async () => {
    if (!form) return;
    setSaving(true);
    const { error } = await update({
      site_name: form.site_name,
      hero_title: form.hero_title,
      hero_subtitle: form.hero_subtitle,
      contact_whatsapp: form.contact_whatsapp,
      contact_email: form.contact_email,
      contact_instagram: form.contact_instagram,
      contact_facebook: form.contact_facebook,
      contact_twitter: form.contact_twitter,
      contact_linkedin: form.contact_linkedin,
      logo_url: form.logo_url,
      favicon_url: form.favicon_url,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      background_color: form.background_color,
    });
    setSaving(false);
    toast({ title: error ? 'Error' : 'Guardado', description: error ? String(error) : 'Contenido actualizado.', variant: error ? 'destructive' : undefined });
  };


  const addProject = async () => {
    const { error } = await (supabase as any).from('built_projects').insert({
      title: 'Nuevo proyecto',
      category: 'Enterprise',
      image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80',
      link_url: '#',
      sort_order: projects.length + 1,
    });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  const updateProject = async (p: BuiltProject, patch: Partial<BuiltProject>) => {
    const { error } = await (supabase as any).from('built_projects').update(patch).eq('id', p.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  const removeProject = async (id: string) => {
    const { error } = await (supabase as any).from('built_projects').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else reload();
  };

  if (loading || !form) {
    return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidad y Hero</CardTitle>
          <CardDescription>Nombre del sitio y textos principales de la landing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre del sitio</Label>
            <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Título del hero</Label>
            <Textarea rows={2} value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Subtítulo del hero</Label>
            <Textarea rows={3} value={form.hero_subtitle} onChange={(e) => setForm({ ...form, hero_subtitle: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Marca (Logo, Favicon y Colores)</CardTitle>
          <CardDescription>
            Estos valores se aplican globalmente en toda la plataforma. Los colores usan formato HSL sin la palabra "hsl", ej: <code>174 72% 50%</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>URL del Logo</Label>
            <Input value={form.logo_url || ''} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." />
            {form.logo_url && <img src={form.logo_url} alt="logo" className="h-12 mt-2" />}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>URL del Favicon</Label>
            <Input value={form.favicon_url || ''} onChange={(e) => setForm({ ...form, favicon_url: e.target.value })} placeholder="https://.../favicon.png" />
          </div>
          <div className="space-y-2">
            <Label>Color primario (HSL)</Label>
            <Input value={form.primary_color || ''} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} placeholder="174 72% 50%" />
            <div className="h-6 rounded" style={{ background: `hsl(${form.primary_color || '174 72% 50%'})` }} />
          </div>
          <div className="space-y-2">
            <Label>Color de acento (HSL)</Label>
            <Input value={form.accent_color || ''} onChange={(e) => setForm({ ...form, accent_color: e.target.value })} placeholder="199 89% 48%" />
            <div className="h-6 rounded" style={{ background: `hsl(${form.accent_color || '199 89% 48%'})` }} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Color de fondo (HSL)</Label>
            <Input value={form.background_color || ''} onChange={(e) => setForm({ ...form, background_color: e.target.value })} placeholder="222 47% 6%" />
            <div className="h-6 rounded border border-border" style={{ background: `hsl(${form.background_color || '222 47% 6%'})` }} />
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Contacto y Redes</CardTitle>
          <CardDescription>Datos mostrados en la sección de contacto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            { k: 'contact_whatsapp', l: 'WhatsApp (link o número)' },
            { k: 'contact_email', l: 'Email' },
            { k: 'contact_instagram', l: 'Instagram (URL)' },
            { k: 'contact_facebook', l: 'Facebook (URL)' },
            { k: 'contact_twitter', l: 'Twitter / X (URL)' },
            { k: 'contact_linkedin', l: 'LinkedIn (URL)' },
          ].map((f) => (
            <div key={f.k} className="space-y-2">
              <Label>{f.l}</Label>
              <Input value={form[f.k] || ''} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar identidad y contacto
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Proyectos construidos</CardTitle>
            <CardDescription>Imágenes clicables mostradas en la landing. La imagen redirige al link configurado.</CardDescription>
          </div>
          <Button size="sm" onClick={addProject}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Sin proyectos aún.</p>}
          {projects.map((p) => (
            <div key={p.id} className="grid gap-3 md:grid-cols-[120px_1fr_auto] items-start border border-border rounded-md p-3">
              <img src={p.image_url} alt={p.title} className="h-24 w-full object-cover rounded" />
              <div className="grid gap-2 md:grid-cols-2">
                <Input defaultValue={p.title} onBlur={(e) => e.target.value !== p.title && updateProject(p, { title: e.target.value })} placeholder="Título" />
                <Input defaultValue={p.category} onBlur={(e) => e.target.value !== p.category && updateProject(p, { category: e.target.value })} placeholder="Categoría" />
                <Input className="md:col-span-2" defaultValue={p.image_url} onBlur={(e) => e.target.value !== p.image_url && updateProject(p, { image_url: e.target.value })} placeholder="URL de imagen" />
                <Input className="md:col-span-2" defaultValue={p.link_url} onBlur={(e) => e.target.value !== p.link_url && updateProject(p, { link_url: e.target.value })} placeholder="Link destino (https://...)" />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeProject(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default SiteContentSection;
