import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, X, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SubscriptionPlan {
  id: string;
  name: string;
  price_cents: number;
  max_builds: number;
  max_storage_mb: number;
  credits_per_month: number;
  is_active: boolean;
}

const SubscriptionPlanEditor: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    price_cents: 0,
    max_builds: 1,
    max_storage_mb: 100,
    credits_per_month: 0,
    is_active: true,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_cents', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los planes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingId(plan.id);
    setFormData(plan);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData({
      name: '',
      price_cents: 0,
      max_builds: 1,
      max_storage_mb: 100,
      credits_per_month: 0,
      is_active: true,
    });
  };

  const handleSave = async () => {
    if (!formData.name || formData.price_cents === undefined) {
      toast({
        title: "Campos requeridos",
        description: "El nombre y el precio son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('subscription_plans')
          .update({
            name: formData.name,
            price_cents: Number(formData.price_cents),
            max_builds: Number(formData.max_builds),
            max_storage_mb: Number(formData.max_storage_mb),
            credits_per_month: Number(formData.credits_per_month),
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);

        if (error) throw error;
        toast({ title: "Plan actualizado", description: "Los cambios se guardaron correctamente." });
      } else {
        const { error } = await supabase
          .from('subscription_plans')
          .insert({
            name: formData.name,
            price_cents: Number(formData.price_cents),
            max_builds: Number(formData.max_builds),
            max_storage_mb: Number(formData.max_storage_mb),
            credits_per_month: Number(formData.credits_per_month),
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast({ title: "Plan creado", description: "El nuevo plan ha sido registrado." });
      }

      handleCancel();
      loadPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el plan.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este plan?')) return;

    try {
      const { error } = await supabase
        .from('subscription_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Plan eliminado" });
      loadPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el plan. Es posible que tenga usuarios asociados.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => (cents / 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Planes de Suscripción</h3>
          <p className="text-sm text-muted-foreground">Gestiona los planes disponibles para los usuarios</p>
        </div>
        {!showAddForm && !editingId && (
          <Button onClick={() => setShowAddForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuevo Plan
          </Button>
        )}
      </div>

      {(showAddForm || editingId) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>{editingId ? 'Editar Plan' : 'Crear Nuevo Plan'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Nombre del Plan</Label>
                <Input
                  id="plan-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Pro, Enterprise..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-price">Precio (en centavos USD)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  value={formData.price_cents}
                  onChange={(e) => setFormData({ ...formData, price_cents: parseInt(e.target.value) })}
                  placeholder="Ej: 599 para $5.99"
                />
                <p className="text-[10px] text-muted-foreground">Muestra: ${(Number(formData.price_cents || 0) / 100).toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-builds">Máximo de Builds / mes</Label>
                <Input
                  id="plan-builds"
                  type="number"
                  value={formData.max_builds}
                  onChange={(e) => setFormData({ ...formData, max_builds: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-storage">Almacenamiento (MB)</Label>
                <Input
                  id="plan-storage"
                  type="number"
                  value={formData.max_storage_mb}
                  onChange={(e) => setFormData({ ...formData, max_storage_mb: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-credits">Créditos mensuales</Label>
                <Input
                  id="plan-credits"
                  type="number"
                  value={formData.credits_per_month}
                  onChange={(e) => setFormData({ ...formData, credits_per_month: parseInt(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="plan-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="plan-active">Plan Activo</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="ghost" onClick={handleCancel}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Builds</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Créditos</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay planes configurados.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>${formatPrice(plan.price_cents)}</TableCell>
                  <TableCell>{plan.max_builds}</TableCell>
                  <TableCell>{plan.max_storage_mb} MB</TableCell>
                  <TableCell>{plan.credits_per_month}</TableCell>
                  <TableCell>
                    {plan.is_active ? (
                      <span className="flex items-center text-green-500 text-xs">
                        <Check className="h-3 w-3 mr-1" /> Activo
                      </span>
                    ) : (
                      <span className="flex items-center text-muted-foreground text-xs">
                        <X className="h-3 w-3 mr-1" /> Inactivo
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)} className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default SubscriptionPlanEditor;
