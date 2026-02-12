import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Check, Crown, Zap, Building2, Rocket, Briefcase } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLANS_DATA = [
  {
    id: 'free',
    name: 'Grátis',
    price: 0,
    icon: Building2,
    color: 'border-gray-300',
    features: ['1 marca', '7 pilares básicos', 'Dashboard', '5 requisições IA/mês'],
    notIncluded: ['Exportação PDF', 'Integração Google', 'Benchmark']
  },
  {
    id: 'founder',
    name: 'Founder',
    price: 59.90,
    icon: Rocket,
    color: 'border-green-500',
    features: ['1 marca', 'Todos os pilares', 'Valuation básico', '20 requisições IA/mês'],
    notIncluded: ['Múltiplas marcas', 'Benchmark setorial']
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 97,
    icon: Zap,
    color: 'border-blue-500 ring-2 ring-blue-100',
    popular: true,
    features: ['Até 3 marcas', 'Todos os pilares', 'Exportação PDF', 'Integração Google', '50 requisições IA/mês'],
    notIncluded: ['Benchmark setorial', 'Dashboard executivo']
  },
  {
    id: 'consultor',
    name: 'Consultor',
    price: 197,
    icon: Briefcase,
    color: 'border-purple-500',
    features: ['Até 5 marcas', 'Valuation completo', 'Benchmark setorial', 'Exportação PDF avançada', '100 requisições IA/mês'],
    notIncluded: ['API access', 'White label']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 497,
    icon: Crown,
    color: 'border-amber-500',
    features: ['Marcas ilimitadas', 'Dashboard executivo', 'API access', 'White label', 'Suporte prioritário', 'IA ilimitada'],
    notIncluded: []
  }
];

export const Plans = () => {
  const { user } = useAuth();
  const currentPlan = user?.plan || 'free';

  const handleUpgrade = (planId) => {
    toast.info('Integração de pagamento será ativada em breve! Entre em contato: contato@labrand.com.br');
  };

  return (
    <div className="space-y-8 py-4" data-testid="plans-page">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Planos LABrand</h1>
        <p className="text-muted-foreground">Escolha o plano ideal para sua estratégia de marca</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLANS_DATA.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          
          return (
            <Card key={plan.id} className={`relative ${plan.color} ${plan.popular ? 'scale-105' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <Icon className="h-10 w-10 mx-auto mb-2 text-primary" />
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold">Grátis</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={isCurrentPlan ? 'outline' : 'default'}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan ? 'Plano Atual' : 'Selecionar'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Plans;
