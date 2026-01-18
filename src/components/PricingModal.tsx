import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Rocket, Loader2 } from 'lucide-react';
import { useSubscriptionPlans, SubscriptionPlan } from '@/hooks/useSubscriptionPlans';
import PaymentModal from '@/components/PaymentModal';

const planIcons: Record<string, React.ElementType> = {
  'Básico': Zap,
  'Pro': Crown,
  'Ultra': Rocket,
};

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PricingModal: React.FC<PricingModalProps> = ({ open, onOpenChange }) => {
  const { plans, isLoading } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleSelectPlan = (plan: SubscriptionPlan) => {
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              ¡Te quedaste sin créditos! 💳
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Elige un plan para continuar creando proyectos increíbles
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              {plans.map((plan, index) => {
                const Icon = planIcons[plan.name] || Zap;
                const isPopular = index === 1;

                return (
                  <Card 
                    key={plan.id} 
                    className={`relative flex flex-col ${isPopular ? 'border-primary shadow-lg' : ''}`}
                  >
                    {isPopular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                        Más popular
                      </Badge>
                    )}
                    
                    <CardHeader className="text-center pb-2">
                      <div className={`w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2 ${
                        isPopular ? 'gradient-primary' : 'bg-muted'
                      }`}>
                        <Icon className={`w-5 h-5 ${isPopular ? 'text-primary-foreground' : 'text-foreground'}`} />
                      </div>
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">
                          {formatPrice(plan.price_cents)}
                        </span>
                        <span className="text-muted-foreground">/mes</span>
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1">
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span>{plan.max_builds} builds/mes</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span>{plan.max_storage_mb} MB</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-primary" />
                          <span>{plan.credits_per_month} créditos</span>
                        </li>
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Button 
                        className="w-full" 
                        variant={isPopular ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSelectPlan(plan)}
                      >
                        Seleccionar
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        plan={selectedPlan ? {
          id: selectedPlan.id,
          name: selectedPlan.name,
          price_cents: selectedPlan.price_cents,
        } : null}
      />
    </>
  );
};

export default PricingModal;
