import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Minus, BarChart3, Calendar, 
  RefreshCw, Loader2, ArrowUpRight, ArrowDownRight, AlertCircle,
  CheckCircle2, Info, Target, Users, Globe, GitCompare, Clock
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const METRIC_ICONS = {
  brand_score: Target, brand_equity: TrendingUp, maturity_score: BarChart3,
  pillar_completion: CheckCircle2, touchpoints_count: Globe, crm_contacts: Users
};
const METRIC_LABELS = {
  brand_score: "Brand Score", brand_equity: "Brand Equity", maturity_score: "Maturidade",
  pillar_completion: "Pilares (%)", touchpoints_count: "Touchpoints", crm_contacts: "Contatos CRM"
};
const METRIC_COLORS = {
  brand_score: "#8b5cf6", brand_equity: "#3b82f6", maturity_score: "#f59e0b",
  pillar_completion: "#22c55e", touchpoints_count: "#06b6d4", crm_contacts: "#ec4899"
};
const ALERT_ICONS = { success: CheckCircle2, warning: AlertCircle, critical: AlertCircle, info: Info };
const ALERT_COLORS = {
  success: "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/20",
  warning: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20",
  critical: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20",
  info: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/20"
};

function getChangeIndicator(change) {
  if (change > 0) return { icon: ArrowUpRight, color: 'text-green-600', bg: 'bg-green-100', label: `+${change}` };
  if (change < 0) return { icon: ArrowDownRight, color: 'text-red-600', bg: 'bg-red-100', label: `${change}` };
  return { icon: Minus, color: 'text-gray-400', bg: 'bg-gray-100', label: '0' };
}

function formatMonth(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }); } catch { return ''; }
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch { return ''; }
}

export default function BrandTracking() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);

  useEffect(() => { if (currentBrand) loadData(); }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyRes, comparisonRes, alertsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/history?months=12`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/comparison`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/tracking/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const snaps = historyRes.data.snapshots || [];
      setHistory(snaps);
      setComparison(comparisonRes.data);
      setAlerts(alertsRes.data.alerts || []);
      if (snaps.length >= 2) { setCompareA(0); setCompareB(snaps.length - 1); }
    } catch { /* empty */ } finally { setLoading(false); }
  };

  const handleCreateSnapshot = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/tracking/snapshot`, { notes: `Snapshot manual - ${new Date().toLocaleDateString('pt-BR')}` }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Snapshot criado!');
      loadData();
    } catch { toast.error('Erro ao criar snapshot'); } finally { setSaving(false); }
  };

  if (!currentBrand) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Selecione uma marca primeiro</p></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const snapA = compareA !== null ? history[compareA] : null;
  const snapB = compareB !== null ? history[compareB] : null;
  const timelineData = history.slice(0, 12).reverse();

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
            <p className="text-muted-foreground">Evolucao da marca ao longo do tempo</p>
          </div>
        </div>
        <Button onClick={handleCreateSnapshot} disabled={saving} data-testid="create-snapshot-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Criar Snapshot
        </Button>
      </div>

      {/* Empty State */}
      {history.length === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum snapshot disponivel</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">Crie seu primeiro snapshot para comecar a acompanhar a evolucao.</p>
            <Button onClick={handleCreateSnapshot} disabled={saving}>Criar Primeiro Snapshot</Button>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => {
            const Icon = ALERT_ICONS[alert.type] || Info;
            return (
              <Card key={idx} className={`border ${ALERT_COLORS[alert.type]}`}>
                <CardContent className="py-3 flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div className="flex-1"><p className="font-medium">{alert.message}</p><p className="text-sm opacity-80">{alert.recommendation}</p></div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* KPI Cards */}
      {comparison && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(METRIC_LABELS).map(([key, label]) => {
            const Icon = METRIC_ICONS[key];
            const current = comparison.current?.[key] || 0;
            const change = comparison.changes?.[key] || 0;
            const ind = getChangeIndicator(change);
            const ChangeIcon = ind.icon;
            return (
              <Card key={key} data-testid={`kpi-${key}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className={`flex items-center gap-1 text-sm px-1.5 py-0.5 rounded ${ind.bg} ${ind.color}`}>
                      <ChangeIcon className="h-3 w-3" /><span className="text-xs font-medium">{ind.label}</span>
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

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Timeline</TabsTrigger>
          <TabsTrigger value="compare" data-testid="tab-compare">Comparativo</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Historico</TabsTrigger>
        </TabsList>

        {/* TIMELINE TAB */}
        <TabsContent value="timeline" className="space-y-4">
          {timelineData.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Crie snapshots para ver a timeline de evolucao.</CardContent></Card>
          ) : (
            <>
              {/* Visual Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Timeline de Evolucao</CardTitle>
                  <CardDescription>Marcos da evolucao da sua marca</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-violet-500 via-blue-500 to-green-500" />

                    <div className="space-y-6">
                      {timelineData.map((snap, idx) => {
                        const prev = idx > 0 ? timelineData[idx - 1] : null;
                        const scoreChange = prev ? (snap.brand_score || 0) - (prev.brand_score || 0) : 0;
                        const pillarChange = prev ? (snap.pillar_completion || 0) - (prev.pillar_completion || 0) : 0;
                        const isLatest = idx === timelineData.length - 1;

                        return (
                          <div key={idx} className="relative flex items-start gap-4 pl-3" data-testid={`timeline-item-${idx}`}>
                            {/* Dot */}
                            <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isLatest ? 'bg-violet-500 ring-4 ring-violet-200 dark:ring-violet-900' : 'bg-white border-2 border-blue-400'
                            }`}>
                              {isLatest ? <TrendingUp className="h-3.5 w-3.5 text-white" /> : <span className="w-2 h-2 rounded-full bg-blue-400" />}
                            </div>

                            {/* Content */}
                            <div className={`flex-1 p-4 rounded-lg border ${isLatest ? 'border-violet-200 bg-violet-50/50 dark:bg-violet-950/20' : 'hover:bg-muted/30'}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-semibold">{formatFullDate(snap.created_at)}</p>
                                  <p className="text-xs text-muted-foreground">{snap.type === 'manual' ? 'Snapshot Manual' : 'Automatico'}{snap.notes ? ` - ${snap.notes}` : ''}</p>
                                </div>
                                {isLatest && <Badge className="bg-violet-500 text-white">Atual</Badge>}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <span className="font-bold text-violet-600">{snap.brand_score || 0}</span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Brand Score</p>
                                    {scoreChange !== 0 && <p className={`text-xs font-medium ${scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{scoreChange > 0 ? '+' : ''}{scoreChange}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <span className="font-bold text-green-600">{snap.pillar_completion || 0}%</span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pilares</p>
                                    {pillarChange !== 0 && <p className={`text-xs font-medium ${pillarChange > 0 ? 'text-green-600' : 'text-red-600'}`}>{pillarChange > 0 ? '+' : ''}{pillarChange}%</p>}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold">{snap.maturity_score || 0}</p>
                                  <p className="text-xs text-muted-foreground">Maturidade</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-lg font-bold">{snap.touchpoints_count || 0}</p>
                                  <p className="text-xs text-muted-foreground">Touchpoints</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart Evolution */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolucao dos Indicadores</CardTitle>
                  <CardDescription>Ultimos {timelineData.length} snapshots</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {['brand_score', 'brand_equity', 'maturity_score', 'pillar_completion'].map(metric => {
                      const maxValue = Math.max(...timelineData.map(d => d[metric] || 0), 100);
                      return (
                        <div key={metric} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ background: METRIC_COLORS[metric] }} />
                              {METRIC_LABELS[metric]}
                            </span>
                            <span className="text-sm font-bold">{timelineData[timelineData.length - 1]?.[metric] || 0}</span>
                          </div>
                          <div className="flex items-end gap-1 h-16">
                            {timelineData.map((snap, idx) => {
                              const value = snap[metric] || 0;
                              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                              const isLatest = idx === timelineData.length - 1;
                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
                                  <div className="opacity-0 group-hover:opacity-100 absolute -top-6 text-xs font-medium bg-foreground text-background px-1.5 py-0.5 rounded transition-opacity">{value}</div>
                                  <div className="w-full rounded-t transition-all" style={{ height: `${height}%`, minHeight: '4px', background: isLatest ? METRIC_COLORS[metric] : `${METRIC_COLORS[metric]}60` }} />
                                  <span className="text-[10px] text-muted-foreground">{formatMonth(snap.created_at)}</span>
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
            </>
          )}
        </TabsContent>

        {/* COMPARATIVO TAB */}
        <TabsContent value="compare" className="space-y-4" data-testid="compare-tab">
          {history.length < 2 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Necessario pelo menos 2 snapshots para comparar. Crie mais snapshots.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><GitCompare className="h-5 w-5" /> Comparativo Antes/Depois</CardTitle>
                  <CardDescription>Selecione dois snapshots para comparar lado a lado</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-red-600">Antes (Snapshot A)</label>
                      <Select value={String(compareA)} onValueChange={v => setCompareA(Number(v))}>
                        <SelectTrigger data-testid="compare-select-a"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {history.map((s, i) => <SelectItem key={i} value={String(i)}>{formatFullDate(s.created_at)} - Score {s.brand_score || 0}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-green-600">Depois (Snapshot B)</label>
                      <Select value={String(compareB)} onValueChange={v => setCompareB(Number(v))}>
                        <SelectTrigger data-testid="compare-select-b"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {history.map((s, i) => <SelectItem key={i} value={String(i)}>{formatFullDate(s.created_at)} - Score {s.brand_score || 0}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {snapA && snapB && (
                    <div className="space-y-4">
                      {/* Side by side cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50/30 dark:bg-red-950/10">
                          <p className="text-sm font-medium text-red-600 mb-1">ANTES</p>
                          <p className="text-xs text-muted-foreground">{formatFullDate(snapA.created_at)}</p>
                          <p className="text-3xl font-bold mt-2">{snapA.brand_score || 0}</p>
                          <p className="text-xs text-muted-foreground">Brand Score</p>
                        </div>
                        <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/30 dark:bg-green-950/10">
                          <p className="text-sm font-medium text-green-600 mb-1">DEPOIS</p>
                          <p className="text-xs text-muted-foreground">{formatFullDate(snapB.created_at)}</p>
                          <p className="text-3xl font-bold mt-2">{snapB.brand_score || 0}</p>
                          <p className="text-xs text-muted-foreground">Brand Score</p>
                        </div>
                      </div>

                      {/* Metrics comparison */}
                      <div className="space-y-3">
                        {Object.entries(METRIC_LABELS).map(([key, label]) => {
                          const valA = snapA[key] || 0;
                          const valB = snapB[key] || 0;
                          const diff = valB - valA;
                          const pct = valA > 0 ? ((diff / valA) * 100).toFixed(1) : (valB > 0 ? '+100' : '0');
                          return (
                            <div key={key} className="flex items-center gap-4 p-3 rounded-lg border" data-testid={`compare-metric-${key}`}>
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: METRIC_COLORS[key] }} />
                              <span className="text-sm font-medium flex-1">{label}</span>
                              <span className="text-sm text-red-600 w-16 text-right">{valA}</span>
                              <div className="w-8 text-center">
                                {diff > 0 ? <ArrowUpRight className="h-4 w-4 text-green-600 mx-auto" /> :
                                 diff < 0 ? <ArrowDownRight className="h-4 w-4 text-red-600 mx-auto" /> :
                                 <Minus className="h-4 w-4 text-gray-400 mx-auto" />}
                              </div>
                              <span className="text-sm text-green-600 w-16 text-right">{valB}</span>
                              <Badge className={`min-w-[60px] justify-center ${diff > 0 ? 'bg-green-100 text-green-700' : diff < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                                {diff > 0 ? '+' : ''}{pct}%
                              </Badge>
                            </div>
                          );
                        })}
                      </div>

                      {/* Visual bar comparison */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {['brand_score', 'pillar_completion', 'maturity_score', 'brand_equity'].map(key => {
                          const valA = snapA[key] || 0;
                          const valB = snapB[key] || 0;
                          const max = Math.max(valA, valB, 100);
                          return (
                            <div key={key} className="text-center">
                              <p className="text-xs text-muted-foreground mb-2">{METRIC_LABELS[key]}</p>
                              <div className="flex items-end justify-center gap-2 h-24">
                                <div className="w-8 flex flex-col items-center">
                                  <span className="text-xs font-medium text-red-600 mb-1">{valA}</span>
                                  <div className="w-full rounded-t bg-red-300" style={{ height: `${(valA / max) * 100}%`, minHeight: '4px' }} />
                                </div>
                                <div className="w-8 flex flex-col items-center">
                                  <span className="text-xs font-medium text-green-600 mb-1">{valB}</span>
                                  <div className="w-full rounded-t bg-green-500" style={{ height: `${(valB / max) * 100}%`, minHeight: '4px' }} />
                                </div>
                              </div>
                              <div className="flex justify-center gap-2 mt-1 text-[10px]">
                                <span className="text-red-500">Antes</span>
                                <span className="text-green-500">Depois</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Historico de Snapshots</CardTitle></CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">Nenhum snapshot disponivel</p>
              ) : (
                <div className="space-y-3">
                  {history.slice(0, 20).map((snap, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{formatFullDate(snap.created_at)}</p>
                          <p className="text-sm text-muted-foreground">{snap.type === 'manual' ? 'Snapshot Manual' : 'Automatico'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right"><p className="font-medium">{snap.brand_score || 0}</p><p className="text-xs text-muted-foreground">Brand Score</p></div>
                        <div className="text-right"><p className="font-medium">{snap.pillar_completion || 0}%</p><p className="text-xs text-muted-foreground">Pilares</p></div>
                        <div className="text-right"><p className="font-medium">{snap.maturity_score || 0}</p><p className="text-xs text-muted-foreground">Maturidade</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
