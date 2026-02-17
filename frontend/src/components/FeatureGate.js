import { useNavigate } from 'react-router-dom';
import { usePlan } from '../contexts/PlanContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Lock, Sparkles, Crown } from 'lucide-react';

// Badge para mostrar que é recurso Pro
export const ProBadge = ({ plan = 'essencial' }) => {
  const planLabels = {
    essencial: 'Essencial',
    executivo: 'Executivo',
    enterprise: 'Enterprise'
  };
  
  return (
    <Badge variant="secondary" className="gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0">
      <Crown className="h-3 w-3" />
      {planLabels[plan] || 'Pro'}
    </Badge>
  );
};

// Componente que bloqueia acesso e mostra upgrade
export const FeatureGate = ({ 
  featureId, 
  children, 
  fallback = null,
  showTeaser = true 
}) => {
  const { hasAccess, getMinPlan, isPro } = usePlan();
  const navigate = useNavigate();
  
  if (hasAccess(featureId)) {
    return children;
  }
  
  if (!showTeaser && fallback) {
    return fallback;
  }
  
  const minPlan = getMinPlan(featureId);
  
  return (
    <Card className="border-dashed border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-violet-600" />
        </div>
        <ProBadge plan={minPlan} />
        <h3 className="text-lg font-semibold mt-3 mb-2">Recurso Premium</h3>
        <p className="text-muted-foreground mb-4 max-w-md">
          Este recurso está disponível no plano {minPlan === 'essencial' ? 'Essencial' : 'Executivo'} ou superior.
          Faça upgrade para desbloquear todas as funcionalidades.
        </p>
        <Button 
          onClick={() => navigate('/plans')}
          className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Ver Planos
        </Button>
      </CardContent>
    </Card>
  );
};

// Wrapper para página inteira
export const ProtectedFeature = ({ featureId, children }) => {
  const { hasAccess, loading } = usePlan();
  
  if (loading) {
    return null;
  }
  
  if (!hasAccess(featureId)) {
    return (
      <div className="p-6">
        <FeatureGate featureId={featureId} />
      </div>
    );
  }
  
  return children;
};

// Badge pequeno para colocar ao lado do nome no menu
export const ProIndicator = ({ featureId }) => {
  const { hasAccess, isPro } = usePlan();
  
  if (!isPro(featureId) || hasAccess(featureId)) {
    return null;
  }
  
  return (
    <Crown className="h-3 w-3 text-violet-500 ml-1" />
  );
};

export default FeatureGate;
