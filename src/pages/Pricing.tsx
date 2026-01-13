import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Crown, Rocket, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

const planIcons: Record<string, React.ElementType> = {
  'Básico': Zap,
  'Pro': Crown,
  'Ultra': Rocket,
};

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { plans, isLoading } = useSubscriptionPlans();
  const { isAuthenticated, user } = useAuth();

  const handleSelectPlan = (planId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Inicia sesión",
        description: "Necesitas una cuenta para suscribirte a un plan.",
        variant: "destructive",
      });
      return;
    }
    
    // TODO: Integrate with payment processor
    toast({
      title: "Próximamente",
      description: "La integración de pagos estará disponible pronto.",
    });
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
          onClick={() => navigate('/')}
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
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      Seleccionar plan
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-semibold mb-4">¿Tienes preguntas?</h2>
          <p className="text-muted-foreground mb-6">
            Todos los planes incluyen actualizaciones automáticas y acceso a nuevas funciones.
            Los créditos no utilizados no se acumulan para el siguiente mes.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
