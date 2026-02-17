import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Check, Crown, Zap, Building2, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

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
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const currentPlan = user?.plan || 'free';

  // Handle return from Stripe checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (sessionId && success === 'true') {
      checkPaymentStatus(sessionId);
    } else if (canceled === 'true') {
      toast.error('Pagamento cancelado');
      setSearchParams({});
    }
  }, [searchParams]);

  const checkPaymentStatus = async (sessionId) => {
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 5;
    const pollInterval = 2000;

    const poll = async () => {
      try {
        const response = await axios.get(
          `${API}/payments/status/${sessionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.payment_status === 'paid') {
          toast.success('Pagamento confirmado! Seu plano foi atualizado.');
          setSearchParams({});
          setCheckingPayment(false);
          // Reload page to update user data
          window.location.reload();
          return;
        } else if (response.data.status === 'expired') {
          toast.error('Sessão de pagamento expirada. Tente novamente.');
          setSearchParams({});
          setCheckingPayment(false);
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          toast.info('Verificando pagamento... Por favor, aguarde a confirmação por email.');
          setSearchParams({});
          setCheckingPayment(false);
        }
      } catch (error) {
        console.error('Error checking payment:', error);
        setCheckingPayment(false);
        setSearchParams({});
      }
    };

    poll();
  };

  const handleUpgrade = async (planId) => {
    if (planId === 'enterprise') {
      toast.info('Entre em contato: contato@labrand.com.br');
      return;
    }

    if (planId === currentPlan) {
      toast.info('Você já está neste plano!');
      return;
    }

    setLoading(planId);

    try {
      const response = await axios.post(
        `${API}/payments/create-checkout`,
        {
          plan_id: planId,
          origin_url: window.location.origin
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao iniciar checkout');
      setLoading(null);
    }
  };

  if (checkingPayment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-xl font-semibold">Confirmando pagamento...</h2>
        <p className="text-muted-foreground">Por favor, aguarde enquanto verificamos seu pagamento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4" data-testid="plans-page">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Planos LABrand</h1>
        <p className="text-muted-foreground">Escolha o plano ideal para sua estratégia de marca</p>
        {currentPlan !== 'free' && (
          <Badge variant="default" className="mt-2">
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Plano atual: {PLANS_DATA.find(p => p.id === currentPlan)?.name || currentPlan}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
        {PLANS_DATA.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = currentPlan === plan.id;
          const isLoading = loading === plan.id;
          
          return (
            <Card 
              key={plan.id} 
              className={`relative ${plan.color} ${plan.popular ? 'scale-105 shadow-xl' : ''} ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600">
                  Mais Popular
                </Badge>
              )}
              {isCurrentPlan && (
                <Badge className="absolute -top-3 right-4 bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Atual
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
                {plan.price !== null && (
                  <p className="text-xs text-muted-foreground mt-1">15 dias de trial grátis</p>
                )}
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
                  variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={isLoading || isCurrentPlan}
                  data-testid={`select-plan-${plan.id}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : isCurrentPlan ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Plano Atual
                    </>
                  ) : (
                    plan.cta || 'Selecionar'
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Payment Info */}
      <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground space-y-2">
        <p>🔒 Pagamento seguro processado por Stripe</p>
        <p>Cancele a qualquer momento. Sem taxas de cancelamento.</p>
      </div>
    </div>
  );
};

export default Plans;
