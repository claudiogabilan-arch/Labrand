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
    id: 'essencial',
    name: 'Essencial',
    price: 997,
    icon: Building2,
    color: 'border-gray-300',
    features: ['1 marca', 'Todos os pilares', 'Brand Strength Score', 'Valuation básico', 'Relatório PDF'],
    cta: 'Começar'
  },
  {
    id: 'executivo',
    name: 'Executivo',
    price: 1997,
    icon: Zap,
    color: 'border-blue-500 ring-2 ring-blue-200',
    popular: true,
    features: ['Até 5 marcas', 'Dashboard Executivo', 'Benchmark Setorial', 'Simulador Estratégico', 'Módulo de Risco', 'Suporte prioritário'],
    cta: 'Mais Popular'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    icon: Crown,
    color: 'border-amber-500',
    features: ['Marcas ilimitadas', 'API access', 'White label', 'Onboarding dedicado', 'SLA garantido', 'Integrações customizadas'],
    cta: 'Falar com Consultor'
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

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {PLANS_DATA.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          
          return (
            <Card key={plan.id} className={`relative ${plan.color} ${plan.popular ? 'scale-105 shadow-xl' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <Icon className="h-10 w-10 mx-auto mb-2 text-primary" />
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  {plan.price === null ? (
                    <span className="text-2xl font-bold">Sob Consulta</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">R$ {plan.price.toLocaleString('pt-BR')}</span>
                      <span className="text-muted-foreground">/mês</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-4" 
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {plan.cta || 'Selecionar'}
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
