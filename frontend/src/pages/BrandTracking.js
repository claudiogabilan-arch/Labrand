import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Minus, BarChart3, Calendar, 
  RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, AlertCircle,
  CheckCircle2, Info, Target, Users, Globe
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const METRIC_ICONS = {
  brand_score: Target,
  brand_equity: TrendingUp,
  maturity_score: BarChart3,
  pillar_completion: CheckCircle2,
  touchpoints_count: Globe,
  crm_contacts: Users
};

const METRIC_LABELS = {
  brand_score: "Brand Score",
  brand_equity: "Brand Equity",
  maturity_score: "Maturidade",
  pillar_completion: "Pilares",
  touchpoints_count: "Touchpoints",
  crm_contacts: "Contatos CRM"
};

const ALERT_ICONS = {
  success: CheckCircle2,
  warning: AlertCircle,
  critical: AlertCircle,
  info: Info
};

const ALERT_COLORS = {
  success: "text-green-600 bg-green-50 border-green-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  critical: "text-red-600 bg-red-50 border-red-200",
  info: "text-blue-600 bg-blue-50 border-blue-200"
};

export default function BrandTracking() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, comparisonRes, alertsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/history?months=6`, 
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/comparison`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/alerts`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setHistory(historyRes.data.snapshots || []);
      setComparison(comparisonRes.data);
      setAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Error loading tracking data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setSaving(true);
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/tracking/snapshot`,
        { notes: `Snapshot manual - ${new Date().toLocaleDateString('pt-BR')}` },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Snapshot criado com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao criar snapshot');
    } finally {
      setSaving(false);
    }
  };

  const getChangeIndicator = (change) => {
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

  return (
    <div className="space-y-6" data-testid="brand-tracking-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Brand Tracking</h1>
            <p className="text-muted-foreground">Acompanhe a evolução da sua marca ao longo do tempo</p>
          </div>
        </div>
        <Button onClick={handleCreateSnapshot} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Criar Snapshot
        </Button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => {
            const Icon = ALERT_ICONS[alert.type] || Info;
            return (
              <Card key={idx} className={`border ${ALERT_COLORS[alert.type]}`}>
                <CardContent className="py-3 flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm opacity-80">{alert.recommendation}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Current vs Previous Comparison */}
      {comparison && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(METRIC_LABELS).map(([key, label]) => {
            const Icon = METRIC_ICONS[key];
            const current = comparison.current?.[key] || 0;
            const change = comparison.changes?.[key] || 0;
            const indicator = getChangeIndicator(change);
            const ChangeIcon = indicator.icon;
            
            return (
              <Card key={key}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className={`flex items-center gap-1 text-sm ${indicator.color}`}>
                      <ChangeIcon className="h-3 w-3" />
                      <span>{indicator.label}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">{current}{key === 'pillar_completion' ? '%' : ''}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="evolution">
        <TabsList>
          <TabsTrigger value="evolution">Evolução</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-4">
          {/* Evolution Charts (simplified as bars) */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução dos Indicadores</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {['brand_score', 'brand_equity', 'maturity_score', 'pillar_completion'].map(metric => {
                  const data = history.slice(0, 6).reverse();
                  const maxValue = Math.max(...data.map(d => d[metric] || 0), 100);
                  
                  return (
                    <div key={metric} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{METRIC_LABELS[metric]}</span>
                        <span className="text-sm text-muted-foreground">
                          Atual: {data[data.length - 1]?.[metric] || 0}
                        </span>
                      </div>
                      <div className="flex items-end gap-1 h-16">
                        {data.map((snapshot, idx) => {
                          const value = snapshot[metric] || 0;
                          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                          const isLatest = idx === data.length - 1;
                          
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex flex-col items-center gap-1"
                            >
                              <div
                                className={`w-full rounded-t transition-all ${
                                  isLatest ? 'bg-primary' : 'bg-primary/40'
                                }`}
                                style={{ height: `${height}%`, minHeight: '4px' }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {new Date(snapshot.created_at).toLocaleDateString('pt-BR', { month: 'short' })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.slice(0, 12).map((snapshot, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {new Date(snapshot.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {snapshot.type === 'manual' ? 'Snapshot Manual' : 'Automático'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">{snapshot.brand_score}</p>
                        <p className="text-xs text-muted-foreground">Brand Score</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{snapshot.pillar_completion}%</p>
                        <p className="text-xs text-muted-foreground">Pilares</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{snapshot.maturity_score}</p>
                        <p className="text-xs text-muted-foreground">Maturidade</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
