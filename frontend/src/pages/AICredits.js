import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { Zap, TrendingUp, History, AlertTriangle, Loader2, Sparkles, CreditCard } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 100, price: 49, popular: false },
  { id: 'pro', name: 'Pro', credits: 500, price: 199, popular: true, savings: '20%' },
  { id: 'enterprise', name: 'Enterprise', credits: 2000, price: 699, popular: false, savings: '30%' },
];

export default function AICredits() {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creditsData, setCreditsData] = useState(null);
  const [history, setHistory] = useState([]);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    loadCreditsData();
  }, []);

  const loadCreditsData = async () => {
    setLoading(true);
    try {
      const [creditsRes, historyRes] = await Promise.all([
        axios.get(`${API}/ai-credits/balance`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/ai-credits/history`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCreditsData(creditsRes.data);
      setHistory(historyRes.data.history || []);
    } catch (error) {
      console.error('Error loading credits:', error);
    } finally {
      setLoading(false);
    }
  };

  const purchaseCredits = async (packageId) => {
    setPurchasing(packageId);
    try {
      const response = await axios.post(
        `${API}/ai-credits/purchase`,
        { package_id: packageId, origin_url: window.location.origin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      toast.error('Erro ao iniciar compra');
    } finally {
      setPurchasing(null);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage > 80) return 'text-red-500';
    if (percentage > 50) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const usagePercentage = creditsData?.total_credits > 0 
    ? Math.round((creditsData.used_credits / creditsData.total_credits) * 100) 
    : 0;

  return (
    <div className="space-y-6" data-testid="ai-credits-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Créditos de IA</h1>
          <p className="text-muted-foreground">Gerencie seus créditos para funcionalidades de IA</p>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 border-violet-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo Disponível</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold">{creditsData?.available_credits || 0}</span>
                <span className="text-muted-foreground">créditos</span>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span>Total: {creditsData?.total_credits || 0}</span>
                <span>Usados: {creditsData?.used_credits || 0}</span>
              </div>
            </div>
            <div className="w-24 h-24 relative">
              <svg className="w-full h-full -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/20" />
                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${((100 - usagePercentage) / 100) * 251} 251`} className="text-violet-500" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-lg font-bold ${getUsageColor(usagePercentage)}`}>
                  {100 - usagePercentage}%
                </span>
              </div>
            </div>
          </div>
          
          {creditsData?.available_credits < 50 && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-400">
                Seus créditos estão acabando! Recarregue para continuar usando IA.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Packages */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Comprar Créditos</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card key={pkg.id} className={`relative ${pkg.popular ? 'border-violet-500 ring-2 ring-violet-200' : ''}`}>
              {pkg.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600">
                  Mais Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-violet-500" />
                <CardTitle>{pkg.name}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{pkg.credits}</span>
                  <span className="text-muted-foreground ml-1">créditos</span>
                </div>
                {pkg.savings && (
                  <Badge variant="secondary" className="mt-2">Economia de {pkg.savings}</Badge>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <span className="text-2xl font-bold">R$ {pkg.price}</span>
                </div>
                <Button 
                  className="w-full" 
                  variant={pkg.popular ? 'default' : 'outline'}
                  onClick={() => purchaseCredits(pkg.id)}
                  disabled={purchasing === pkg.id}
                >
                  {purchasing === pkg.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Comprar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Usage History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length > 0 ? (
            <div className="space-y-3">
              {history.slice(0, 10).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant={item.credits > 0 ? 'default' : 'secondary'}>
                    {item.credits > 0 ? '+' : ''}{item.credits} créditos
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Nenhum histórico de uso ainda
            </p>
          )}
        </CardContent>
      </Card>

      {/* Credit Costs Info */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Custo por Funcionalidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-background rounded-lg">
              <p className="font-medium">Sugestão IA</p>
              <p className="text-muted-foreground">1 crédito</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="font-medium">Análise de Risco</p>
              <p className="text-muted-foreground">5 créditos</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="font-medium">Consistência</p>
              <p className="text-muted-foreground">5 créditos</p>
            </div>
            <div className="p-3 bg-background rounded-lg">
              <p className="font-medium">Mentor Insights</p>
              <p className="text-muted-foreground">3 créditos</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
