import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import { Check, X, Crown, Zap, Building2, Clock, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const planIcons = {
  free: Building2,
  pro: Zap,
  enterprise: Crown
};

const planColors = {
  free: 'border-gray-200',
  pro: 'border-blue-500 ring-2 ring-blue-100',
  enterprise: 'border-purple-500'
};

export const Plans = () => {
  const { user, getAuthHeaders } = useAuth();
  const [plans, setPlans] = useState({});
  const [userPlan, setUserPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, userPlanRes] = await Promise.all([
          axios.get(`${API}/plans`),
          axios.get(`${API}/user/plan`, { headers: getAuthHeaders(), withCredentials: true })
        ]);
        setPlans(plansRes.data.plans);
        setUserPlan(userPlanRes.data);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [getAuthHeaders]);

  const handleUpgrade = async (planId) => {
    try {
      // In production, this would redirect to Stripe checkout
      toast.info('Integração de pagamento será implementada em breve!');
      // await axios.post(`${API}/user/upgrade`, { plan: planId }, { headers: getAuthHeaders() });
      // toast.success('Plano atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar plano');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-6" data-testid="plans-page">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-heading text-3xl font-bold">Planos LABrand</h1>
        <p className="text-muted-foreground">Escolha o plano ideal para sua marca</p>
      </div>

      {/* Trial Banner */}
      {userPlan?.is_trial_active && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium">Período de Teste Ativo</p>
                  <p className="text-sm text-muted-foreground">
                    Você tem acesso às funcionalidades Pro por mais <strong>{userPlan.trial_days_left} dias</strong>
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500">{userPlan.trial_days_left} dias restantes</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan Usage */}
      {userPlan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Seu Uso Atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Requisições IA este mês</span>
                <span>{userPlan.ai_requests_used} / {userPlan.ai_requests_limit === -1 ? '∞' : userPlan.ai_requests_limit}</span>
              </div>
              <Progress 
                value={userPlan.ai_requests_limit === -1 ? 0 : (userPlan.ai_requests_used / userPlan.ai_requests_limit) * 100} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(plans).map(([planId, plan]) => {
          const Icon = planIcons[planId] || Building2;
          const isCurrentPlan = userPlan?.plan === planId;
          const isEffectivePlan = userPlan?.effective_plan === planId;
          
          return (
            <Card 
              key={planId} 
              className={`relative ${planColors[planId]} ${isEffectivePlan ? 'ring-2 ring-primary' : ''}`}
            >
              {planId === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-500">Mais Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <div className={`w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                  planId === 'free' ? 'bg-gray-100' : planId === 'pro' ? 'bg-blue-100' : 'bg-purple-100'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    planId === 'free' ? 'text-gray-600' : planId === 'pro' ? 'text-blue-600' : 'text-purple-600'
                  }`} />
                </div>
                <CardTitle>{plan.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {plan.price === 0 ? 'Grátis' : `R$${plan.price}`}
                  </span>
                  {plan.price > 0 && <span className="text-muted-foreground">/mês</span>}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {planId === 'free' && (
                    <>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Exportação PDF</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Integração Google</span>
                      </li>
                      <li className="flex items-center gap-2 text-sm text-muted-foreground">
                        <X className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span>Mentor IA</span>
                      </li>
                    </>
                  )}
                </ul>
                
                <Button 
                  className="w-full" 
                  variant={isCurrentPlan ? "outline" : planId === 'pro' ? "default" : "outline"}
                  disabled={isCurrentPlan}
                  onClick={() => handleUpgrade(planId)}
                >
                  {isCurrentPlan ? 'Plano Atual' : isEffectivePlan ? 'Ativo (Trial)' : planId === 'free' ? 'Começar Grátis' : 'Fazer Upgrade'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium">O que acontece após o período de teste?</p>
            <p className="text-sm text-muted-foreground">
              Após 15 dias, você continua com o plano Free com funcionalidades básicas. 
              Seus dados são mantidos e você pode fazer upgrade a qualquer momento.
            </p>
          </div>
          <div>
            <p className="font-medium">Posso cancelar a qualquer momento?</p>
            <p className="text-sm text-muted-foreground">
              Sim! Não há fidelidade. Você pode cancelar seu plano pago e voltar para o Free quando quiser.
            </p>
          </div>
          <div>
            <p className="font-medium">Como funciona o pagamento?</p>
            <p className="text-sm text-muted-foreground">
              Aceitamos cartão de crédito e PIX. O pagamento é processado de forma segura via Stripe.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Plans;
