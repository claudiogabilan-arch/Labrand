import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Slider } from '../components/ui/slider';
import { Badge } from '../components/ui/badge';
import { Loader2, TrendingUp, DollarSign, Target, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

const API = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value);
};

const InfoTooltip = ({ content }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default function Simulator() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [baseData, setBaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brandStrengthChange, setBrandStrengthChange] = useState(0);
  const [rbiChange, setRbiChange] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBrand) return;
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/executive-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setBaseData(await res.json());
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
        <p className="text-muted-foreground">Selecione uma marca para usar o simulador.</p>
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

  const currentBrandStrength = baseData?.brand_strength || 50;
  const currentRbi = baseData?.role_of_brand || 50;
  const currentValuation = baseData?.valuation || 1000000;

  // Cálculos de impacto
  const newBrandStrength = Math.min(100, Math.max(0, currentBrandStrength + brandStrengthChange));
  const newRbi = Math.min(100, Math.max(0, currentRbi + rbiChange));
  
  // Cada ponto de Brand Strength = 1.5% de impacto no valuation
  // Cada ponto de RBI = 2% de impacto na receita
  const valuationMultiplier = 1 + (brandStrengthChange * 0.015) + (rbiChange * 0.01);
  const revenueMultiplier = 1 + (rbiChange * 0.02) + (brandStrengthChange * 0.005);
  
  const projectedValuation = currentValuation * valuationMultiplier;
  const revenueImpact = (revenueMultiplier - 1) * 100;
  const valuationChange = projectedValuation - currentValuation;

  return (
    <TooltipProvider>
      <div className="space-y-6" data-testid="simulator-page">
        <div>
          <h1 className="text-2xl font-bold">Simulador Estratégico</h1>
          <p className="text-muted-foreground">Projete o impacto de melhorias na marca</p>
        </div>

        {/* Controles */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Brand Strength Score
                <InfoTooltip content="Simule o aumento no Brand Strength para ver o impacto no valuation. Cada ponto representa maior consistência estratégica." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Atual: {currentBrandStrength}</span>
                <Badge variant={brandStrengthChange >= 0 ? 'default' : 'destructive'}>
                  {brandStrengthChange >= 0 ? '+' : ''}{brandStrengthChange} pontos
                </Badge>
              </div>
              <Slider
                value={[brandStrengthChange]}
                onValueChange={(v) => setBrandStrengthChange(v[0])}
                min={-20}
                max={30}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-20</span>
                <span>Variação</span>
                <span>+30</span>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <span className="text-2xl font-bold">{newBrandStrength}</span>
                <span className="text-muted-foreground ml-1">projetado</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5" />
                Role of Brand Index
                <InfoTooltip content="Simule o aumento no RBI para ver o impacto na receita. Maior RBI = menor dependência de preço." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Atual: {currentRbi}%</span>
                <Badge variant={rbiChange >= 0 ? 'default' : 'destructive'}>
                  {rbiChange >= 0 ? '+' : ''}{rbiChange}%
                </Badge>
              </div>
              <Slider
                value={[rbiChange]}
                onValueChange={(v) => setRbiChange(v[0])}
                min={-15}
                max={25}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-15%</span>
                <span>Variação</span>
                <span>+25%</span>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <span className="text-2xl font-bold">{newRbi}%</span>
                <span className="text-muted-foreground ml-1">projetado</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resultados */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle>Impacto Projetado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-sm text-muted-foreground">Valuation Projetado</p>
                <p className="text-2xl font-bold">{formatCurrency(projectedValuation)}</p>
                <Badge variant={valuationChange >= 0 ? 'default' : 'destructive'} className="mt-2">
                  {valuationChange >= 0 ? '+' : ''}{formatCurrency(valuationChange)}
                </Badge>
              </div>

              <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-muted-foreground">Impacto na Receita</p>
                <p className="text-2xl font-bold">{revenueImpact >= 0 ? '+' : ''}{revenueImpact.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground mt-2">Estimativa anual</p>
              </div>

              <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
                <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-muted-foreground">ROI de Branding</p>
                <p className="text-2xl font-bold">{((valuationMultiplier - 1) * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-2">Retorno projetado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Análise Estratégica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {brandStrengthChange > 10 && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm">
                  <strong>Alto potencial:</strong> Aumento de {brandStrengthChange} pontos no Brand Strength pode gerar {formatCurrency(valuationChange)} em valor de marca.
                </div>
              )}
              {rbiChange > 10 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                  <strong>Receita:</strong> Aumento de {rbiChange}% no RBI projeta crescimento de {revenueImpact.toFixed(1)}% na receita anual.
                </div>
              )}
              {brandStrengthChange === 0 && rbiChange === 0 && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-muted-foreground">
                  Use os controles acima para simular diferentes cenários de melhoria da marca.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
