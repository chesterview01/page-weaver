import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, X, Loader2, CreditCard, Users, Settings2, DollarSign, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import DeploymentConfigSection from '@/components/DeploymentConfigSection';

interface PaymentRequest {
  id: string;
  user_id: string;
  plan_id: string;
  payment_method: string;
  payment_reference: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
  user_email?: string;
  plan_name?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  details: Record<string, string>;
  is_active: boolean;
}

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminRole();
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
        loadData();
      } else {
        setIsAdmin(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load payment requests with user and plan info
      const { data: requests, error: requestsError } = await supabase
        .from('plan_payment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (!requestsError && requests) {
        // Get plan names
        const { data: plans } = await supabase.from('subscription_plans').select('id, name');
        const planMap = new Map(plans?.map(p => [p.id, p.name]) || []);

        setPaymentRequests(requests.map(r => ({
          ...r,
          plan_name: planMap.get(r.plan_id) || 'Unknown',
        })) as PaymentRequest[]);
      }

      // Load payment methods
      const { data: methods, error: methodsError } = await supabase
        .from('payment_methods')
        .select('*')
        .order('type');

      if (!methodsError && methods) {
        setPaymentMethods(methods as PaymentMethod[]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovePayment = async (request: PaymentRequest) => {
    setProcessingId(request.id);
    try {
      // Update payment request status
      const { error: updateError } = await supabase
        .from('plan_payment_requests')
        .update({ status: 'approved', admin_notes: 'Approved by admin' })
        .eq('id', request.id);

      if (updateError) throw updateError;

      // Get plan details
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', request.plan_id)
        .single();

      if (plan) {
        // Create or update user subscription
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('user_id', request.user_id)
          .eq('is_active', true)
          .maybeSingle();

        if (existingSub) {
          await supabase
            .from('user_subscriptions')
            .update({
              plan_id: request.plan_id,
              is_active: true,
              started_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', existingSub.id);
        } else {
          await supabase
            .from('user_subscriptions')
            .insert({
              user_id: request.user_id,
              plan_id: request.plan_id,
              is_active: true,
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }

        // Add credits to wallet
        await supabase
          .from('wallets')
          .update({ credits: plan.credits_per_month })
          .eq('user_id', request.user_id);

        // Log the credit addition
        await supabase
          .from('credit_logs')
          .insert({
            user_id: request.user_id,
            amount: plan.credits_per_month,
            action: 'plan_purchase',
            description: `Plan ${plan.name} activado`,
          });
      }

      toast({
        title: "Pago aprobado",
        description: "El plan ha sido activado para el usuario.",
      });
      loadData();
    } catch (error) {
      console.error('Error approving payment:', error);
      toast({
        title: "Error",
        description: "No se pudo aprobar el pago.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async (request: PaymentRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('plan_payment_requests')
        .update({ status: 'rejected', admin_notes: 'Rejected by admin' })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: "Pago rechazado",
        description: "El pago ha sido marcado como rechazado.",
      });
      loadData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast({
        title: "Error",
        description: "No se pudo rechazar el pago.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdatePaymentMethod = async (method: PaymentMethod, newDetails: Record<string, string>) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ details: newDetails })
        .eq('id', method.id);

      if (error) throw error;

      toast({
        title: "Método actualizado",
        description: "Los datos del método de pago han sido actualizados.",
      });
      loadData();
    } catch (error) {
      console.error('Error updating payment method:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el método de pago.",
        variant: "destructive",
      });
    }
  };

  const formatPrice = (cents: number) => (cents / 100).toFixed(2);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Pendiente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">Aprobado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Acceso denegado</h1>
        <p className="text-muted-foreground mb-4">No tienes permisos de administrador.</p>
        <Button onClick={() => navigate('/app')}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/app')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Panel de Administración</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="payments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Solicitudes de pago
            </TabsTrigger>
            <TabsTrigger value="methods" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Métodos de pago
            </TabsTrigger>
            <TabsTrigger value="deployment" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              Despliegue
            </TabsTrigger>
          </TabsList>

          {/* Payment Requests Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Solicitudes de pago pendientes</CardTitle>
                <CardDescription>
                  Aprueba o rechaza las solicitudes de pago de los usuarios
                </CardDescription>
              </CardHeader>
              <CardContent>
                {paymentRequests.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay solicitudes de pago
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="text-sm">
                            {new Date(request.created_at).toLocaleDateString('es-ES')}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {request.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>{request.plan_name}</TableCell>
                          <TableCell className="capitalize">{request.payment_method}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {request.payment_reference || '-'}
                          </TableCell>
                          <TableCell>${formatPrice(request.amount_cents)}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-right">
                            {request.status === 'pending' && (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                                  onClick={() => handleApprovePayment(request)}
                                  disabled={processingId === request.id}
                                >
                                  {processingId === request.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  onClick={() => handleRejectPayment(request)}
                                  disabled={processingId === request.id}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="methods">
            <div className="grid gap-6">
              {paymentMethods.map((method) => (
                <Card key={method.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {method.name}
                    </CardTitle>
                    <CardDescription>
                      Configura los datos de pago para {method.type}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PaymentMethodEditor
                      method={method}
                      onSave={(newDetails) => handleUpdatePaymentMethod(method, newDetails)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Deployment Config Tab */}
          <TabsContent value="deployment">
            <DeploymentConfigSection />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

// Payment Method Editor Component
const PaymentMethodEditor: React.FC<{
  method: PaymentMethod;
  onSave: (details: Record<string, string>) => void;
}> = ({ method, onSave }) => {
  const [details, setDetails] = useState<Record<string, string>>(method.details);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(details);
    setIsSaving(false);
  };

  return (
    <div className="space-y-4">
      {Object.entries(details).map(([key, value]) => (
        <div key={key} className="space-y-2">
          <Label htmlFor={`${method.id}-${key}`} className="capitalize">
            {key.replace('_', ' ')}
          </Label>
          <Input
            id={`${method.id}-${key}`}
            value={value}
            onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
          />
        </div>
      ))}
      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Guardar cambios
      </Button>
    </div>
  );
};

export default Admin;
