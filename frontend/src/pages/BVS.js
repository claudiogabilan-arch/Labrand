import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Gem, TrendingUp, Target, Users, Heart, Loader2, RefreshCw,
  ArrowRight, CheckCircle2, AlertTriangle, Info, Award
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COMPONENT_ICONS = {
  brand_strength: Target,
  market_performance: TrendingUp,
  customer_connection: Users,
  brand_health: Heart
};

const COMPONENT_COLORS = {
  brand_strength: '#8B5CF6',
  market_performance: '#10B981',
  customer_connection: '#F59E0B',
  brand_health: '#EC4899'
};

export default function BVS() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [bvsData, setBvsData] = useState(null);
  const [history, setHistory] = useState(null);
  const [recommendations, setRecommendations] = useState(null);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bvsRes, historyRes, recsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/bvs`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/bvs/history?months=6`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/bvs/recommendations`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setBvsData(bvsRes.data);
      setHistory(historyRes.data);
      setRecommendations(recsRes.data);
    } catch (error) {
      console.error('Error loading BVS data');
    } finally {
      setLoading(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca primeiro</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const level = bvsData?.level || {};
  const components = bvsData?.components || {};
  const insights = bvsData?.insights || [];
  const benchmark = bvsData?.benchmark || {};

  return (
    <div className="space-y-6" data-testid="bvs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
            <Gem className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">BVS - Branding Value Score</h1>
            <p className="text-muted-foreground">Indicador unificado de valor de marca</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Main BVS Score */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <CardContent className="py-10 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-500/20 to-transparent rounded-full -ml-24 -mb-24" />
          
          <div className="relative grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center md:text-left">
              <p className="text-slate-400 text-sm mb-2">Branding Value Score</p>
              <div className="flex items-baseline gap-2 justify-center md:justify-start">
                <span className="text-7xl font-bold">{bvsData?.bvs_score || 0}</span>
                <span className="text-2xl text-slate-400">/100</span>
              </div>
              <Badge 
                className="mt-4 text-lg px-4 py-1"
                style={{ backgroundColor: level.color }}
              >
                {level.name}
              </Badge>
              <p className="text-sm text-slate-400 mt-3">{level.description}</p>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              {Object.entries(components).map(([compId, comp]) => {
                const Icon = COMPONENT_ICONS[compId] || Target;
                const color = COMPONENT_COLORS[compId] || '#666';
                
                return (
                  <div key={compId} className="bg-white/10 backdrop-blur rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: color + '30' }}
                      >
                        <Icon className="h-4 w-4" style={{ color }} />
                      </div>
                      <span className="text-sm font-medium">{comp.name}</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{comp.score}</span>
                      <span className="text-slate-400 text-sm">/100</span>
                    </div>
                    <Progress value={comp.score} className="h-2 mt-2" />
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benchmark Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className={benchmark.your_position === 'above_avg' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}>
          <CardContent className="py-4 text-center">
            <Award className={`h-8 w-8 mx-auto mb-2 ${benchmark.your_position === 'above_avg' ? 'text-green-600' : 'text-amber-600'}`} />
            <p className="text-2xl font-bold">{bvsData?.bvs_score || 0}</p>
            <p className="text-sm text-muted-foreground">Seu BVS</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{benchmark.industry_avg || 55}</p>
            <p className="text-sm text-muted-foreground">Média do Mercado</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-green-600">{benchmark.top_performers || 80}</p>
            <p className="text-sm text-muted-foreground">Top Performers</p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, idx) => {
            const Icon = insight.type === 'success' ? CheckCircle2 :
                        insight.type === 'warning' ? AlertTriangle : Info;
            const bgColor = insight.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
                          insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                          'bg-blue-50 border-blue-200 text-blue-800';
            
            return (
              <Card key={idx} className={`border ${bgColor}`}>
                <CardContent className="py-3 flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm opacity-80">{insight.message}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Component Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Componente</CardTitle>
            <CardDescription>Fontes de dados que compõem cada dimensão</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(components).map(([compId, comp]) => {
              const Icon = COMPONENT_ICONS[compId] || Target;
              const color = COMPONENT_COLORS[compId] || '#666';
              
              return (
                <div key={compId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color }} />
                      <span className="font-medium">{comp.name}</span>
                    </div>
                    <span className="text-xl font-bold">{comp.score}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{comp.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(comp.details || {}).map(([key, value]) => (
                      <div key={key} className="bg-muted/50 p-2 rounded text-center">
                        <p className="font-bold">{value}</p>
                        <p className="text-muted-foreground truncate">{key.replace(/_/g, ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Recomendações para Melhorar</CardTitle>
            {recommendations?.potential_bvs_improvement > 0 && (
              <CardDescription>
                Potencial de melhoria: +{recommendations.potential_bvs_improvement} pontos 
                (meta: {recommendations.target_bvs})
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {recommendations?.recommendations?.length > 0 ? (
              <div className="space-y-4">
                {recommendations.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{rec.component}</span>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                        {rec.priority === 'high' ? 'Alta Prioridade' : 'Média'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold">{rec.current_score}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold text-green-600">{rec.target_score}</span>
                    </div>
                    <div className="space-y-1">
                      {rec.actions.map((action, i) => (
                        <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          {action}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p>Excelente! Sua marca está bem posicionada em todas as dimensões.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do BVS</CardTitle>
          <CardDescription>
            Crescimento nos últimos 6 meses: {history?.growth > 0 ? '+' : ''}{history?.growth || 0} pontos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {history?.history?.map((month, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-sm font-bold">{month.bvs_score}</span>
                <div
                  className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t transition-all"
                  style={{ height: `${(month.bvs_score / 100) * 100}%` }}
                />
                <span className="text-xs text-muted-foreground">{month.month?.slice(5)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No AI Credits Banner */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                BVS calculado sem consumir créditos de IA
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Todas as métricas são agregadas automaticamente das fontes de dados existentes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
