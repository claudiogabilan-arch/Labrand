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
  Activity, TrendingUp, TrendingDown, Minus, Target, Waves, Filter, Shield,
  ArrowUpRight, ArrowDownRight, ArrowRight, Loader2, RefreshCw,
  AlertTriangle, CheckCircle2, Info, Eye, Heart, ShoppingCart, Award
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Health level configurations
const HEALTH_LEVELS = {
  excellent: { min: 80, label: 'Excelente', color: 'text-green-600', bg: 'bg-green-500' },
  good: { min: 60, label: 'Bom', color: 'text-blue-600', bg: 'bg-blue-500' },
  developing: { min: 40, label: 'Em Desenvolvimento', color: 'text-amber-600', bg: 'bg-amber-500' },
  critical: { min: 0, label: 'Crítico', color: 'text-red-600', bg: 'bg-red-500' }
};

const getHealthLevel = (score) => {
  if (score >= 80) return HEALTH_LEVELS.excellent;
  if (score >= 60) return HEALTH_LEVELS.good;
  if (score >= 40) return HEALTH_LEVELS.developing;
  return HEALTH_LEVELS.critical;
};

const FUNNEL_ICONS = {
  awareness: Eye,
  consideration: Target,
  preference: Heart,
  purchase: ShoppingCart,
  loyalty: Award,
  advocacy: TrendingUp
};

export default function BrandHealth() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(null);
  const [valueWaves, setValueWaves] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [disasterChecks, setDisasterChecks] = useState([]);
  const [overallHealth, setOverallHealth] = useState(0);

  useEffect(() => {
    if (currentBrand) loadAllData();
  }, [currentBrand]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Try new consolidated endpoint first
      let healthResponse = null;
      try {
        healthResponse = await axios.get(`${API}/brands/${currentBrand.brand_id}/brand-health`, 
          { headers: { Authorization: `Bearer ${token}` }});
      } catch (e) {
        console.log('Using legacy endpoints');
      }
      
      const [trackingRes, wavesRes, funnelRes, checksRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/comparison`, 
          { headers: { Authorization: `Bearer ${token}` }}).catch(() => ({ data: null })),
        axios.get(`${API}/brands/${currentBrand.brand_id}/value-waves`,
          { headers: { Authorization: `Bearer ${token}` }}).catch(() => ({ data: null })),
        axios.get(`${API}/brands/${currentBrand.brand_id}/brand-funnel`,
          { headers: { Authorization: `Bearer ${token}` }}).catch(() => ({ data: null })),
        axios.get(`${API}/brands/${currentBrand.brand_id}/disaster-checks`,
          { headers: { Authorization: `Bearer ${token}` }}).catch(() => ({ data: { checks: [] } }))
      ]);
      
      setTracking(trackingRes.data);
      setValueWaves(wavesRes.data?.assessment);
      setFunnel(funnelRes.data?.funnel);
      setDisasterChecks(checksRes.data?.checks || []);
      
      // Use consolidated health score if available
      if (healthResponse?.data?.health_score) {
        setOverallHealth(healthResponse.data.health_score);
      } else {
        // Calculate overall health score from individual modules
        const scores = [];
        if (trackingRes.data?.current?.brand_score) scores.push(trackingRes.data.current.brand_score);
        if (wavesRes.data?.assessment?.overall_score) scores.push(wavesRes.data.assessment.overall_score);
        if (funnelRes.data?.funnel?.health_score) scores.push(funnelRes.data.funnel.health_score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        setOverallHealth(avgScore);
      }
      
    } catch (error) {
      console.error('Error loading health data');
    } finally {
      setLoading(false);
    }
  };

  const getChangeIndicator = (change) => {
    if (!change) return { icon: Minus, color: 'text-gray-400', label: '-' };
    if (change > 0) return { icon: ArrowUpRight, color: 'text-green-600', label: `+${change}` };
    if (change < 0) return { icon: ArrowDownRight, color: 'text-red-600', label: `${change}` };
    return { icon: Minus, color: 'text-gray-400', label: '0' };
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

  const healthLevel = getHealthLevel(overallHealth);
  const activeChecks = disasterChecks.filter(c => c.status !== 'completed');

  return (
    <div className="space-y-6" data-testid="brand-health-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-lg">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Saúde da Marca</h1>
            <p className="text-muted-foreground">Visão consolidada dos indicadores estratégicos</p>
          </div>
        </div>
        <Button onClick={loadAllData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Overall Health Score */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0">
        <CardContent className="py-8">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="text-center md:text-left">
              <p className="text-slate-400 text-sm mb-2">Índice de Saúde Geral</p>
              <div className="flex items-baseline gap-3">
                <span className="text-6xl font-bold">{overallHealth}</span>
                <span className="text-2xl text-slate-400">/100</span>
              </div>
              <Badge className={`mt-3 ${healthLevel.bg}`}>
                {healthLevel.label}
              </Badge>
            </div>
            
            <div className="col-span-2">
              <div className="grid grid-cols-3 gap-4">
                {/* Brand Tracking Score */}
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <TrendingUp className="h-6 w-6 mx-auto mb-2 text-purple-400" />
                  <p className="text-3xl font-bold">{tracking?.current?.brand_score || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">Brand Score</p>
                  {tracking?.changes?.brand_score !== undefined && (
                    <div className={`text-xs mt-1 ${tracking.changes.brand_score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tracking.changes.brand_score >= 0 ? '+' : ''}{tracking.changes.brand_score}
                    </div>
                  )}
                </div>
                
                {/* Value Waves Score */}
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Waves className="h-6 w-6 mx-auto mb-2 text-cyan-400" />
                  <p className="text-3xl font-bold">{valueWaves?.overall_score || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">Ondas de Valor</p>
                  {valueWaves?.level && (
                    <div className="text-xs mt-1 text-cyan-400">{valueWaves.level}</div>
                  )}
                </div>
                
                {/* Funnel Health */}
                <div className="bg-white/10 rounded-xl p-4 text-center">
                  <Filter className="h-6 w-6 mx-auto mb-2 text-emerald-400" />
                  <p className="text-3xl font-bold">{funnel?.health_score || 0}</p>
                  <p className="text-xs text-slate-400 mt-1">Saúde do Funil</p>
                  {funnel?.conversion_rates?.awareness_to_consideration && (
                    <div className="text-xs mt-1 text-emerald-400">
                      {funnel.conversion_rates.awareness_to_consideration}% conv.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions / Alerts */}
      {(activeChecks.length > 0 || !valueWaves || !funnel?.stages) && (
        <div className="grid md:grid-cols-3 gap-4">
          {!valueWaves && (
            <Card className="border-cyan-200 bg-cyan-50 dark:bg-cyan-950/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-cyan-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-cyan-800 dark:text-cyan-200">Avalie suas Ondas de Valor</p>
                    <p className="text-sm text-cyan-600 dark:text-cyan-300">Complete a avaliação para ter uma visão completa</p>
                    <Button asChild size="sm" className="mt-2" variant="outline">
                      <Link to="/value-waves">Iniciar Avaliação</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {funnel?.is_estimated && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Dados do Funil Estimados</p>
                    <p className="text-sm text-amber-600 dark:text-amber-300">Atualize com dados reais para análises precisas</p>
                    <Button asChild size="sm" className="mt-2" variant="outline">
                      <Link to="/brand-funnel">Atualizar Funil</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeChecks.length > 0 && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-800 dark:text-red-200">
                      {activeChecks.length} Disaster Check{activeChecks.length > 1 ? 's' : ''} em andamento
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {activeChecks[0].name} - {activeChecks[0].completion_percentage}% completo
                    </p>
                    <Button asChild size="sm" className="mt-2" variant="outline">
                      <Link to="/disaster-check">Ver Checks</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Brand Tracking Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">Brand Tracking</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/brand-tracking">
                  Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tracking?.current ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'brand_score', label: 'Brand Score' },
                    { key: 'brand_equity', label: 'Brand Equity' },
                    { key: 'maturity_score', label: 'Maturidade' }
                  ].map(({ key, label }) => {
                    const value = tracking.current[key] || 0;
                    const change = tracking.changes?.[key];
                    const indicator = getChangeIndicator(change);
                    const ChangeIcon = indicator.icon;
                    
                    return (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${indicator.color}`}>
                          <ChangeIcon className="h-3 w-3" />
                          <span>{indicator.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>Pilares: {tracking.current.pillar_completion || 0}% completos</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Dados de tracking serão gerados automaticamente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Value Waves Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-lg">Ondas de Valor</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/value-waves">
                  Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {valueWaves ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'brand', label: 'Marca', color: '#8B5CF6' },
                    { key: 'business', label: 'Negócio', color: '#10B981' },
                    { key: 'communication', label: 'Comunicação', color: '#F59E0B' }
                  ].map(({ key, label, color }) => {
                    const score = valueWaves.wave_scores?.[key]?.percentage || 0;
                    return (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-2xl font-bold" style={{ color }}>{score}%</p>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <Progress value={score} className="h-1 mt-2" />
                      </div>
                    );
                  })}
                </div>
                {valueWaves.insights?.length > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm">{valueWaves.insights[0].description}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Complete a avaliação das Ondas de Valor</p>
                <Button asChild className="mt-3" size="sm">
                  <Link to="/value-waves">Iniciar</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Funnel Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-emerald-500" />
                <CardTitle className="text-lg">Funil de Marca</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/brand-funnel">
                  Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {funnel?.stages ? (
              <div className="space-y-3">
                {['awareness', 'consideration', 'preference', 'purchase', 'loyalty', 'advocacy'].map((stage, idx) => {
                  const stageData = funnel.stages[stage];
                  const value = stageData?.value || 0;
                  const maxValue = Math.max(...Object.values(funnel.stages).map(s => s?.value || 0), 100);
                  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
                  const Icon = FUNNEL_ICONS[stage];
                  const colors = ['#94A3B8', '#60A5FA', '#A78BFA', '#34D399', '#FBBF24', '#F472B6'];
                  
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div 
                          className="h-6 rounded-full transition-all"
                          style={{ width: `${Math.max(width, 5)}%`, backgroundColor: colors[idx] }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {value >= 1000 ? `${(value/1000).toFixed(1)}K` : value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Configure o funil de conversão</p>
                <Button asChild className="mt-3" size="sm">
                  <Link to="/brand-funnel">Configurar</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disaster Checks Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg">Disaster Checks</CardTitle>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/disaster-check">
                  Ver detalhes <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {disasterChecks.length > 0 ? (
              <div className="space-y-3">
                {disasterChecks.slice(0, 3).map(check => (
                  <div key={check.check_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        check.status === 'completed' ? 'bg-green-500' :
                        check.status === 'almost_ready' ? 'bg-amber-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <p className="font-medium text-sm">{check.name}</p>
                        <p className="text-xs text-muted-foreground">{check.launch_type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{check.completion_percentage}%</p>
                      <p className="text-xs text-muted-foreground">Risco: {check.risk_score}%</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <p>Nenhum check de lançamento ativo</p>
                <Button asChild className="mt-3" size="sm">
                  <Link to="/disaster-check">Criar Check</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credits Info */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                Todas as análises desta página são gratuitas
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Brand Tracking, Ondas de Valor, Funil de Marca e Disaster Check não consomem créditos de IA
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
