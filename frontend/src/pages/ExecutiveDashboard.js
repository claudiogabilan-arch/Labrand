import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, DollarSign, Shield, Target } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (value) => {
  if (!value) return 'R$ --';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

export default function ExecutiveDashboard() {
  const { currentBrand, pillars } = useBrand();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBrand) return;
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/executive-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentBrand, token]);

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca para ver o resumo executivo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const brandStrength = data?.brand_strength || 0;
  const rbi = data?.role_of_brand || 0;
  const valuation = data?.valuation || 0;
  const trend = data?.trend || 'stable';
  const risks = data?.risks || [];
  const opportunities = data?.opportunities || [];

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-500';

  return (
    <div className="space-y-6" data-testid="executive-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resumo Executivo</h1>
          <p className="text-muted-foreground">{currentBrand.name}</p>
        </div>
        <Badge variant="outline" className={trendColor}>
          <TrendIcon className="h-4 w-4 mr-1" />
          {trend === 'up' ? 'Em alta' : trend === 'down' ? 'Em queda' : 'Estável'}
        </Badge>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Brand Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(valuation)}</p>
            <p className="text-xs text-muted-foreground mt-1">Valor estimado da marca</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Brand Strength
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{brandStrength}<span className="text-lg">/100</span></p>
            <p className="text-xs text-muted-foreground mt-1">Força da marca</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" /> Role of Brand
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rbi}<span className="text-lg">%</span></p>
            <p className="text-xs text-muted-foreground mt-1">Índice de relevância</p>
          </CardContent>
        </Card>
      </div>

      {/* Riscos e Oportunidades */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Top Vulnerabilidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {risks.length > 0 ? (
              <ul className="space-y-3">
                {risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center text-sm font-bold text-red-600">{i + 1}</span>
                    <span className="text-sm">{risk}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Preencha os pilares para identificar vulnerabilidades.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-600">
              <Lightbulb className="h-5 w-5" /> Top Oportunidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunities.length > 0 ? (
              <ul className="space-y-3">
                {opportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-sm font-bold text-green-600">{i + 1}</span>
                    <span className="text-sm">{opp}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">Preencha os pilares para identificar oportunidades.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
