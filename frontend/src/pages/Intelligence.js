import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Search,
  Globe,
  MessageSquare,
  Heart,
  AlertTriangle,
  Loader2,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

// Mock data for demonstration - in production, this would come from Google Analytics/Search Console
const mockMetrics = {
  share_of_search: {
    current: 23.5,
    previous: 21.2,
    trend: 'up'
  },
  trafego_direto: {
    current: 45678,
    previous: 42100,
    trend: 'up'
  },
  mencoes: {
    current: 1234,
    previous: 1456,
    trend: 'down'
  },
  sentimento: {
    positivo: 65,
    neutro: 25,
    negativo: 10
  },
  alertas: [
    { tipo: 'info', mensagem: 'Aumento de 10% em buscas pela marca' },
    { tipo: 'warning', mensagem: 'Menções negativas em alta nas redes sociais' },
    { tipo: 'success', mensagem: 'Engajamento positivo no último lançamento' }
  ],
  recomendacoes: [
    'Considere aumentar investimento em SEO para manter crescimento de share of search',
    'Monitore as menções negativas e prepare uma estratégia de resposta',
    'Explore parcerias com influenciadores do segmento'
  ]
};

export const Intelligence = () => {
  const { currentBrand, metrics } = useBrand();
  const [isLoading, setIsLoading] = useState(false);

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-emerald-500" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-rose-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="space-y-6" data-testid="intelligence-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Intelligence Dashboard</h1>
          <p className="text-muted-foreground">Métricas e insights de marca</p>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Share of Search</p>
                <p className="text-3xl font-bold mt-1">{mockMetrics.share_of_search.current}%</p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(mockMetrics.share_of_search.trend)}
                  <span className="text-sm text-muted-foreground">
                    vs {mockMetrics.share_of_search.previous}% anterior
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tráfego Direto</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(mockMetrics.trafego_direto.current)}</p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(mockMetrics.trafego_direto.trend)}
                  <span className="text-sm text-muted-foreground">
                    vs {formatNumber(mockMetrics.trafego_direto.previous)} anterior
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Menções</p>
                <p className="text-3xl font-bold mt-1">{formatNumber(mockMetrics.mencoes.current)}</p>
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon(mockMetrics.mencoes.trend)}
                  <span className="text-sm text-muted-foreground">
                    vs {formatNumber(mockMetrics.mencoes.previous)} anterior
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sentimento</p>
                <p className="text-3xl font-bold mt-1">{mockMetrics.sentimento.positivo}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-emerald-500">positivo</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <Heart className="h-5 w-5 text-rose-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sentiment Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Análise de Sentimento</CardTitle>
            <CardDescription>Distribuição do sentimento nas menções</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Positivo</span>
                  <span className="font-medium">{mockMetrics.sentimento.positivo}%</span>
                </div>
                <Progress value={mockMetrics.sentimento.positivo} className="h-3 bg-muted [&>div]:bg-emerald-500" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Neutro</span>
                  <span className="font-medium">{mockMetrics.sentimento.neutro}%</span>
                </div>
                <Progress value={mockMetrics.sentimento.neutro} className="h-3 bg-muted [&>div]:bg-gray-400" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-rose-600">Negativo</span>
                  <span className="font-medium">{mockMetrics.sentimento.negativo}%</span>
                </div>
                <Progress value={mockMetrics.sentimento.negativo} className="h-3 bg-muted [&>div]:bg-rose-500" />
              </div>
            </div>

            {/* Pillar Completion */}
            <div className="mt-8 pt-6 border-t">
              <h4 className="font-medium mb-4">Completude dos Pilares</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(metrics?.pillars || {}).map(([pillar, value]) => (
                  <div key={pillar} className="text-center">
                    <div className="relative w-16 h-16 mx-auto">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${value * 1.76} 176`}
                          className="text-primary"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                        {value}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 capitalize">{pillar}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts & Recommendations */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertas de Mercado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockMetrics.alertas.map((alerta, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alerta.tipo === 'warning' ? 'bg-amber-50 border-amber-200' :
                    alerta.tipo === 'success' ? 'bg-emerald-50 border-emerald-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <p className={`text-sm ${
                    alerta.tipo === 'warning' ? 'text-amber-800' :
                    alerta.tipo === 'success' ? 'text-emerald-800' :
                    'text-blue-800'
                  }`}>
                    {alerta.mensagem}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {mockMetrics.recomendacoes.map((rec, index) => (
                  <li key={index} className="flex gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Note about MOCK data */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800">Dados de Demonstração (MOCK)</p>
              <p className="text-sm text-amber-700 mt-1">
                Os dados exibidos neste dashboard são de demonstração. Para dados reais, conecte sua conta do Google Analytics e Search Console nas configurações de integração.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Intelligence;
