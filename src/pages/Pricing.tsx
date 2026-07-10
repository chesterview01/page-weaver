import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Rocket, ArrowLeft, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionPlans, SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import PaymentModal from '@/components/PaymentModal';

const planIcons: Record<string, React.ElementType> = {
  'Básico': Zap,
  'Pro': Crown,
  'Ultra': Rocket,
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { plans, isLoading } = useSubscriptionPlans();
  const { isAuthenticated } = useAuthContext();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas una cuenta para suscribirte a un plan.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPlan(plan);
    setPaymentModalOpen(true);
  };

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString('es-ES', {
      style: 'currency',
      currency: 'USD',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-12 px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Elige tu plan
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Potencia tu creatividad con más builds, almacenamiento y créditos mensuales
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando planes...</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => {
              const Icon = planIcons[plan.name] || Zap;
              const isPopular = index === 1;

              return (
                <Card 
                  key={plan.id} 
                  className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg scale-105' : ''}`}
                >
                  {isPopular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                      Más popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-2">
                    <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-4 ${
                      isPopular ? 'gradient-primary' : 'bg-muted'
                    }`}>
                      <Icon className={`w-6 h-6 ${isPopular ? 'text-primary-foreground' : 'text-foreground'}`} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">
                        {formatPrice(plan.price_cents)}
                      </span>
                      <span className="text-muted-foreground">/mes</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{plan.max_builds} builds por mes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{plan.max_storage_mb} MB de almacenamiento</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{plan.credits_per_month} créditos mensuales</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-primary" />
                        <span>Soporte prioritario</span>
                      </li>
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button 
                      className="w-full" 
                      variant={isPopular ? 'default' : 'outline'}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      Seleccionar plan
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center max-w-2xl mx-auto">
          <Card className="bg-primary/5 border-primary/20 p-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold">¿Solo necesitas más créditos?</h2>
              <p className="text-muted-foreground">
                No necesitas suscribirte a un plan mensual si solo quieres recargar tu saldo de monedas.
                Compra paquetes de créditos flexibles desde tu cartera.
              </p>
              <Button
                variant="outline"
                className="mt-2 border-primary/30 hover:bg-primary/10"
                onClick={() => navigate('/settings?tab=wallet')}
              >
                Ir a mi cartera
              </Button>
            </div>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-4">¿Tienes preguntas?</h2>
          <p className="text-muted-foreground mb-6">
            Todos los planes incluyen actualizaciones automáticas y acceso a nuevas funciones.
            Los créditos no utilizados no se acumulan para el siguiente mes.
          </p>
        </div>
      </div>

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        plan={selectedPlan ? {
          id: selectedPlan.id,
          name: selectedPlan.name,
          price_cents: selectedPlan.price_cents,
        } : null}
      />
    </div>
  );
};

export default Pricing;
