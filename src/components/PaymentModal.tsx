import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'binance' | 'paypal' | 'zelle';
  details: Record<string, string>;
}

interface Plan {
  id: string;
  name: string;
  price_cents: number;
}

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ open, onOpenChange, plan }) => {
  const { user } = useAuthContext();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>('binance');
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadPaymentMethods();
    }
  }, [open]);

  const loadPaymentMethods = async () => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true);

    if (!error && data) {
      setPaymentMethods(data as PaymentMethod[]);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmitPayment = async () => {
    if (!user || !plan || !paymentReference.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa la referencia del pago.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('plan_payment_requests')
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          payment_method: selectedMethod,
          payment_reference: paymentReference.trim(),
          amount_cents: plan.price_cents,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: "Pago reportado",
        description: "Tu pago ha sido registrado y está pendiente de aprobación.",
      });
      onOpenChange(false);
      setPaymentReference('');
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar el pago. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'USD',
    });
  };

  const currentMethod = paymentMethods.find(m => m.type === selectedMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pagar plan {plan?.name}</DialogTitle>
          <DialogDescription>
            Total a pagar: <span className="font-bold text-primary">{plan ? formatPrice(plan.price_cents) : ''}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedMethod} onValueChange={setSelectedMethod} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="binance">Binance Pay</TabsTrigger>
            <TabsTrigger value="paypal">PayPal</TabsTrigger>
            <TabsTrigger value="zelle">Zelle</TabsTrigger>
          </TabsList>

          {['binance', 'paypal', 'zelle'].map((methodType) => {
            const method = paymentMethods.find(m => m.type === methodType);
            return (
              <TabsContent key={methodType} value={methodType}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{method?.name || methodType}</CardTitle>
                    <CardDescription>
                      Realiza el pago y luego ingresa la referencia abajo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {method?.details && Object.entries(method.details).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div>
                          <p className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</p>
                          <p className="font-mono text-sm">{value}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyToClipboard(value, key)}
                        >
                          {copied === key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    ))}

                    {!method && (
                      <p className="text-center text-muted-foreground py-4">
                        Método de pago no configurado
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reference">Referencia del pago</Label>
            <Input
              id="reference"
              placeholder="Ingresa el ID de transacción o referencia"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ingresa el número de confirmación, ID de transacción o captura de pantalla
            </p>
          </div>

          <Button
            className="w-full"
            onClick={handleSubmitPayment}
            disabled={!paymentReference.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Reportar pago'
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Tu plan se activará una vez que el administrador apruebe el pago
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
