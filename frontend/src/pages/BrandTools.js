import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { useToast } from '../hooks/use-toast';
import {
  BarChart3, FileText, Bell, MessageCircle, Users, Sparkles,
  TrendingUp, Download, Send, RefreshCw, Loader2, CheckCircle,
  AlertTriangle, Target, Zap, Copy, Heart, Award, ArrowUp, ArrowDown
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function BrandTools() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('equity');
  const [loading, setLoading] = useState({});

  // States para cada feature
  const [brandScore, setBrandScore] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [alertConfig, setAlertConfig] = useState(null);
  const [alertsHistory, setAlertsHistory] = useState([]);
  const [socialMentions, setSocialMentions] = useState(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState(null);
  const [contentTypes, setContentTypes] = useState([]);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [brandEquity, setBrandEquity] = useState(null);

  // Form states
  const [competitors, setCompetitors] = useState('');
  const [contentType, setContentType] = useState('tagline');
  const [contentTone, setContentTone] = useState('professional');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Fetch brand score
  const fetchBrandScore = async () => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, score: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/brand-score`, { headers });
      if (res.ok) setBrandScore(await res.json());
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, score: false }));
  };

  // Generate PDF Report
  const generateReport = async () => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, report: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/reports/executive-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: ['summary', 'pillars', 'score', 'recommendations'] })
      });
      if (res.ok) {
        // Download the PDF
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `labrand_relatorio_${currentBrand.name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Relatório baixado!', description: 'PDF gerado e baixado com sucesso' });
        fetchReportHistory();
      } else {
        toast({ title: 'Erro', description: 'Falha ao gerar relatório', variant: 'destructive' });
      }
    } catch (e) { 
      console.error(e);
      toast({ title: 'Erro', description: 'Falha ao gerar relatório', variant: 'destructive' }); 
    }
    setLoading(l => ({ ...l, report: false }));
  };

  const fetchReportHistory = async () => {
    if (!currentBrand) return;
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/reports/history`, { headers });
      if (res.ok) setReportHistory((await res.json()).reports || []);
    } catch (e) { console.error(e); }
  };

  // Alert config
  const fetchAlertConfig = async () => {
    if (!currentBrand) return;
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/alerts/config`, { headers });
      if (res.ok) setAlertConfig(await res.json());
    } catch (e) { console.error(e); }
  };

  const saveAlertConfig = async (config) => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, alerts: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/alerts/config`, {
        method: 'POST', headers, body: JSON.stringify(config)
      });
      if (res.ok) {
        toast({ title: 'Configuração salva!', description: 'Alertas configurados com sucesso' });
        setAlertConfig((await res.json()).config);
      }
    } catch (e) { toast({ title: 'Erro', variant: 'destructive' }); }
    setLoading(l => ({ ...l, alerts: false }));
  };

  const sendTestAlert = async () => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, testAlert: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/alerts/send-test`, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Email enviado!', description: data.message });
        fetchAlertsHistory(); // Refresh history
      } else {
        const err = await res.json();
        toast({ title: 'Erro', description: err.detail, variant: 'destructive' });
      }
    } catch (e) { toast({ title: 'Erro ao enviar email', variant: 'destructive' }); }
    setLoading(l => ({ ...l, testAlert: false }));
  };

  const sendSpecificAlert = async (alertType) => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, sendAlert: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/alerts/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ alert_type: alertType })
      });
      if (res.ok) {
        const data = await res.json();
        toast({ title: 'Alerta enviado!', description: data.message });
        fetchAlertsHistory(); // Refresh history
      } else {
        const err = await res.json();
        toast({ title: 'Erro', description: err.detail, variant: 'destructive' });
      }
    } catch (e) { toast({ title: 'Erro ao enviar alerta', variant: 'destructive' }); }
    setLoading(l => ({ ...l, sendAlert: false }));
  };

  const fetchAlertsHistory = async () => {
    if (!currentBrand) return;
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/alerts/history`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAlertsHistory(data.alerts || []);
      }
    } catch (e) { console.error(e); }
  };

  // Social Listening
  const fetchSocialMentions = async () => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, social: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/social-listening/mentions?days=30`, { headers });
      if (res.ok) setSocialMentions(await res.json());
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, social: false }));
  };

  // Competitor Analysis
  const analyzeCompetitors = async () => {
    if (!currentBrand || !competitors.trim()) return;
    setLoading(l => ({ ...l, competitors: true }));
    try {
      const compList = competitors.split(',').map(c => c.trim()).filter(Boolean);
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/competitors/analyze-ai`, {
        method: 'POST', headers, body: JSON.stringify({ competitors: compList, analysis_depth: 'basic' })
      });
      if (res.ok) {
        setCompetitorAnalysis(await res.json());
        toast({ title: 'Análise concluída!', description: `${compList.length} concorrentes analisados` });
      } else {
        const err = await res.json();
        toast({ title: 'Erro', description: err.detail, variant: 'destructive' });
      }
    } catch (e) { toast({ title: 'Erro', variant: 'destructive' }); }
    setLoading(l => ({ ...l, competitors: false }));
  };

  // Content Generator
  const fetchContentTypes = async () => {
    try {
      const res = await fetch(`${API}/api/content-generator/types`, { headers });
      if (res.ok) setContentTypes((await res.json()).types || []);
    } catch (e) { console.error(e); }
  };

  const generateContent = async () => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, content: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/content-generator/generate`, {
        method: 'POST', headers, body: JSON.stringify({ content_type: contentType, tone: contentTone })
      });
      if (res.ok) {
        setGeneratedContent(await res.json());
        toast({ title: 'Conteúdo gerado!' });
      } else {
        const err = await res.json();
        toast({ title: 'Erro', description: err.detail, variant: 'destructive' });
      }
    } catch (e) { toast({ title: 'Erro', variant: 'destructive' }); }
    setLoading(l => ({ ...l, content: false }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência' });
  };

  // Brand Equity
  const fetchBrandEquity = async () => {
    if (!currentBrand) return;
    setLoading(l => ({ ...l, equity: true }));
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/brand-equity`, { headers });
      if (res.ok) setBrandEquity(await res.json());
    } catch (e) { console.error(e); }
    setLoading(l => ({ ...l, equity: false }));
  };

  useEffect(() => {
    if (currentBrand && token) {
      fetchBrandScore();
      fetchReportHistory();
      fetchAlertConfig();
      fetchAlertsHistory();
      fetchContentTypes();
    }
  }, [currentBrand, token]);

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="brand-tools-no-brand">
        <p className="text-muted-foreground">Selecione uma marca para acessar as ferramentas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="brand-tools-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ferramentas de Marca</h1>
          <p className="text-muted-foreground">Análises avançadas e geração de conteúdo</p>
        </div>
        <Badge variant="outline" className="text-sm">{currentBrand.name}</Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="equity" className="flex items-center gap-1" data-testid="tab-equity">
            <Award className="h-4 w-4" /> Equity
          </TabsTrigger>
          <TabsTrigger value="score" className="flex items-center gap-1" data-testid="tab-score">
            <BarChart3 className="h-4 w-4" /> Score
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1" data-testid="tab-reports">
            <FileText className="h-4 w-4" /> PDF
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-1" data-testid="tab-alerts">
            <Bell className="h-4 w-4" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-1" data-testid="tab-social">
            <MessageCircle className="h-4 w-4" /> Social
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center gap-1" data-testid="tab-competitors">
            <Users className="h-4 w-4" /> IA
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-1" data-testid="tab-content">
            <Sparkles className="h-4 w-4" /> Conteúdo
          </TabsTrigger>
        </TabsList>

        {/* TAB 0: Brand Equity Score */}
        <TabsContent value="equity" className="space-y-4" data-testid="tab-content-equity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Brand Equity Score
              </CardTitle>
              <CardDescription>Valor da marca baseado no modelo de Aaker (5 dimensões)</CardDescription>
            </CardHeader>
            <CardContent>
              {!brandEquity ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Calcule o valor estratégico da sua marca</p>
                  <Button onClick={fetchBrandEquity} disabled={loading.equity} data-testid="calc-equity-btn">
                    {loading.equity ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Award className="h-4 w-4 mr-2" />}
                    Calcular Brand Equity
                  </Button>
                </div>
              ) : loading.equity ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : (
                <div className="space-y-6">
                  {/* Score Principal */}
                  <div className="flex items-center gap-6">
                    <div className="relative w-36 h-36">
                      <svg className="w-36 h-36 transform -rotate-90">
                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="none"
                          className={brandEquity.status === 'excellent' ? 'text-amber-500' : brandEquity.status === 'good' ? 'text-green-500' : brandEquity.status === 'developing' ? 'text-blue-500' : 'text-gray-400'}
                          strokeDasharray={`${brandEquity.equity_score * 4.02} 402`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-4xl font-bold">{brandEquity.equity_score}</span>
                        <span className="text-xs text-muted-foreground">Equity</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={brandEquity.status === 'excellent' ? 'bg-amber-500' : brandEquity.status === 'good' ? 'bg-green-500' : 'bg-blue-500'}>
                          {brandEquity.level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">Multiplicador: {brandEquity.valuation_multiplier}x</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Brand Equity mede o valor agregado que sua marca traz além do produto/serviço em si.
                      </p>
                      {brandEquity.benchmark && (
                        <div className="flex items-center gap-2 text-sm">
                          {brandEquity.benchmark.gap_to_average >= 0 ? (
                            <><ArrowUp className="h-4 w-4 text-green-500" /><span className="text-green-600">{brandEquity.benchmark.gap_to_average} pontos acima da média do setor</span></>
                          ) : (
                            <><ArrowDown className="h-4 w-4 text-red-500" /><span className="text-red-600">{Math.abs(brandEquity.benchmark.gap_to_average)} pontos abaixo da média do setor</span></>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5 Dimensões */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">5 Dimensões do Brand Equity</h4>
                    {Object.entries(brandEquity.dimensions || {}).map(([key, dim]) => (
                      <div key={key} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{dim.name}</span>
                            <Badge variant="outline" className="text-xs">Peso: {dim.weight}%</Badge>
                          </div>
                          <span className={`text-sm font-bold ${dim.status === 'high' ? 'text-green-600' : dim.status === 'medium' ? 'text-amber-600' : 'text-red-600'}`}>
                            {dim.score}%
                          </span>
                        </div>
                        <Progress value={dim.score} className={`h-2 ${dim.status === 'high' ? '[&>div]:bg-green-500' : dim.status === 'medium' ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} />
                      </div>
                    ))}
                  </div>

                  {/* Recomendações */}
                  {brandEquity.recommendations?.length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Recomendações para Aumentar o Equity
                      </h4>
                      <div className="space-y-2">
                        {brandEquity.recommendations.map((rec, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <Badge variant={rec.priority === 'alta' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                              {rec.priority}
                            </Badge>
                            <div>
                              <span className="font-medium">{rec.dimension}:</span> {rec.action}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benchmark */}
                  {brandEquity.benchmark && (
                    <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{brandEquity.equity_score}</p>
                        <p className="text-xs text-muted-foreground">Sua Marca</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{brandEquity.benchmark.industry_average}</p>
                        <p className="text-xs text-muted-foreground">Média do Setor</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-amber-500">{brandEquity.benchmark.industry_top_10}</p>
                        <p className="text-xs text-muted-foreground">Top 10%</p>
                      </div>
                    </div>
                  )}

                  <Button onClick={fetchBrandEquity} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" /> Recalcular
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 1: Brand Score Unificado */}
        <TabsContent value="score" className="space-y-4" data-testid="tab-content-score">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Brand Score Unificado
              </CardTitle>
              <CardDescription>Visão consolidada da saúde da sua marca</CardDescription>
            </CardHeader>
            <CardContent>
              {loading.score ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : brandScore ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
                        <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none"
                          className={brandScore.status === 'success' ? 'text-green-500' : brandScore.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}
                          strokeDasharray={`${brandScore.unified_score * 3.52} 352`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-3xl font-bold">{brandScore.unified_score}</span>
                        <span className="text-xs text-muted-foreground">pontos</span>
                      </div>
                    </div>
                    <div>
                      <Badge variant={brandScore.status === 'success' ? 'default' : 'secondary'} className="mb-2">
                        {brandScore.level}
                      </Badge>
                      <p className="text-sm text-muted-foreground">Score calculado com base em 4 dimensões estratégicas</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(brandScore.dimensions || {}).map(([key, dim]) => (
                      <div key={key} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{dim.label}</span>
                          <span className="text-sm text-muted-foreground">{dim.score}%</span>
                        </div>
                        <Progress value={dim.score} className="h-2" />
                        <span className="text-xs text-muted-foreground">Peso: {dim.weight}%</span>
                      </div>
                    ))}
                  </div>

                  {brandScore.recommendations?.filter(Boolean).length > 0 && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" /> Recomendações
                      </h4>
                      <ul className="text-sm space-y-1">
                        {brandScore.recommendations.filter(Boolean).map((rec, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-muted-foreground" /> {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button onClick={fetchBrandScore} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" /> Atualizar Score
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Button onClick={fetchBrandScore}>Calcular Brand Score</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Relatórios PDF */}
        <TabsContent value="reports" className="space-y-4" data-testid="tab-content-reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Relatório PDF Executivo
              </CardTitle>
              <CardDescription>Gere relatórios profissionais para stakeholders</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={generateReport} disabled={loading.report} data-testid="generate-report-btn">
                  {loading.report ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Gerar Relatório Executivo
                </Button>
              </div>

              {reportHistory.length > 0 && (
                <div className="border rounded-lg">
                  <div className="p-3 bg-muted/50 border-b">
                    <h4 className="font-medium">Histórico de Relatórios</h4>
                  </div>
                  <ScrollArea className="h-48">
                    {reportHistory.map((report, i) => (
                      <div key={i} className="p-3 border-b flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{report.brand_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.generated_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Badge variant="outline">{report.executive_summary?.overall_health || 'N/A'}</Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                * Funcionalidade MOCK - Download real de PDF em desenvolvimento
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Alertas por Email */}
        <TabsContent value="alerts" className="space-y-4" data-testid="tab-content-alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                Alertas por Email
              </CardTitle>
              <CardDescription>Configure notificações automáticas sobre sua marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Frequência</Label>
                  <Select value={alertConfig?.frequency || 'weekly'} onValueChange={f => setAlertConfig(c => ({ ...c, frequency: f }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Tipos de Alerta</Label>
                  <div className="space-y-2">
                    {['consistency', 'risk', 'opportunities'].map(type => (
                      <label key={type} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={alertConfig?.alert_types?.includes(type)} onCheckedChange={checked => {
                          setAlertConfig(c => ({
                            ...c,
                            alert_types: checked 
                              ? [...(c?.alert_types || []), type]
                              : (c?.alert_types || []).filter(t => t !== type)
                          }));
                        }} />
                        {type === 'consistency' ? 'Consistência' : type === 'risk' ? 'Risco' : 'Oportunidades'}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => saveAlertConfig(alertConfig)} disabled={loading.alerts} data-testid="save-alerts-btn">
                  {loading.alerts ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Salvar Configuração
                </Button>
                <Button variant="outline" onClick={sendTestAlert} disabled={loading.testAlert} data-testid="test-alert-btn">
                  {loading.testAlert ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Enviar Teste
                </Button>
              </div>

              {/* Send Specific Alerts */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Enviar Alerta Agora</h4>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => sendSpecificAlert('consistency')} 
                    disabled={loading.sendAlert}
                    data-testid="send-consistency-alert-btn"
                  >
                    ⚠️ Consistência
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => sendSpecificAlert('risk')} 
                    disabled={loading.sendAlert}
                    data-testid="send-risk-alert-btn"
                  >
                    🚨 Risco
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => sendSpecificAlert('opportunities')} 
                    disabled={loading.sendAlert}
                    data-testid="send-opportunities-alert-btn"
                  >
                    💡 Oportunidades
                  </Button>
                </div>
              </div>

              {/* Alerts History */}
              {alertsHistory && alertsHistory.length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3">Histórico de Alertas Enviados</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {alertsHistory.slice(0, 5).map((alert, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span>{alert.alert_type === 'test' ? '✅' : alert.alert_type === 'consistency' ? '⚠️' : alert.alert_type === 'risk' ? '🚨' : '💡'}</span>
                          <span className="capitalize">{alert.alert_type}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{alert.recipients?.[0]}</span>
                          <span>{new Date(alert.sent_at).toLocaleString('pt-BR')}</span>
                          {alert.success ? 
                            <span className="text-green-500">✓</span> : 
                            <span className="text-red-500">✗</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-4">
                ✅ Integração real com Resend ativa - Emails sendo enviados para os destinatários configurados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Social Listening */}
        <TabsContent value="social" className="space-y-4" data-testid="tab-content-social">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                Social Listening Light
              </CardTitle>
              <CardDescription>Monitore menções da sua marca nas redes sociais</CardDescription>
            </CardHeader>
            <CardContent>
              {!socialMentions ? (
                <div className="text-center py-8">
                  <Button onClick={fetchSocialMentions} disabled={loading.social} data-testid="fetch-social-btn">
                    {loading.social ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Buscar Menções
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{socialMentions.total_mentions}</p>
                      <p className="text-xs text-muted-foreground">Menções</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-500">{socialMentions.sentiment_score}</p>
                      <p className="text-xs text-muted-foreground">Score Sentimento</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold">{(socialMentions.reach_total / 1000).toFixed(1)}K</p>
                      <p className="text-xs text-muted-foreground">Alcance Total</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-500">{socialMentions.sentiment_summary?.positive || 0}</p>
                      <p className="text-xs text-muted-foreground">Positivas</p>
                    </div>
                  </div>

                  <div className="border rounded-lg">
                    <div className="p-3 bg-muted/50 border-b flex justify-between">
                      <h4 className="font-medium">Menções Recentes</h4>
                      <Button variant="ghost" size="sm" onClick={fetchSocialMentions}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                    <ScrollArea className="h-64">
                      {socialMentions.mentions?.map((mention, i) => (
                        <div key={i} className="p-3 border-b">
                          <div className="flex justify-between items-start">
                            <Badge variant="outline">{mention.source}</Badge>
                            <Badge variant={mention.sentiment === 'positive' ? 'default' : mention.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                              {mention.sentiment === 'positive' ? '😊' : mention.sentiment === 'negative' ? '😞' : '😐'}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2">{mention.text}</p>
                          <p className="text-xs text-muted-foreground mt-1">{mention.date} • {mention.reach} alcance</p>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Trending:</span>
                    {socialMentions.trending_topics?.map((topic, i) => (
                      <Badge key={i} variant="secondary">{topic}</Badge>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    * Dados MOCK - Integração real com APIs de social listening em desenvolvimento
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Análise de Concorrentes */}
        <TabsContent value="competitors" className="space-y-4" data-testid="tab-content-competitors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Análise de Concorrentes com IA
              </CardTitle>
              <CardDescription>Obtenha insights competitivos usando inteligência artificial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Concorrentes (separados por vírgula)</Label>
                <Textarea
                  placeholder="Ex: Empresa A, Empresa B, Empresa C"
                  value={competitors}
                  onChange={e => setCompetitors(e.target.value)}
                  data-testid="competitors-input"
                />
              </div>

              <Button onClick={analyzeCompetitors} disabled={loading.competitors || !competitors.trim()} data-testid="analyze-competitors-btn">
                {loading.competitors ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Analisar com IA (2 créditos)
              </Button>

              {competitorAnalysis && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{competitorAnalysis.competitors_analyzed} concorrentes</Badge>
                    <Badge>{competitorAnalysis.credits_used} créditos usados</Badge>
                  </div>

                  {competitorAnalysis.analysis?.map((comp, i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{comp.competitor}</h4>
                        <Badge variant={comp.threat_level === 'high' ? 'destructive' : comp.threat_level === 'medium' ? 'secondary' : 'outline'}>
                          {comp.threat_level === 'high' ? 'Alta Ameaça' : comp.threat_level === 'medium' ? 'Média Ameaça' : 'Baixa Ameaça'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{comp.positioning}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="font-medium text-green-600">Forças:</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {comp.strengths?.map((s, j) => <li key={j}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-red-600">Fraquezas:</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {comp.weaknesses?.map((w, j) => <li key={j}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Recomendações Estratégicas</h4>
                    <ul className="text-sm space-y-1">
                      {competitorAnalysis.strategic_recommendations?.map((rec, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Target className="h-3 w-3 text-primary" /> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: Gerador de Conteúdo */}
        <TabsContent value="content" className="space-y-4" data-testid="tab-content-generator">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Gerador de Conteúdo de Marca
              </CardTitle>
              <CardDescription>Crie textos alinhados com a identidade da sua marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Conteúdo</Label>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger data-testid="content-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {contentTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.credits} crédito{type.credits > 1 ? 's' : ''})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tom</Label>
                  <Select value={contentTone} onValueChange={setContentTone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="inspirational">Inspiracional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={generateContent} disabled={loading.content} data-testid="generate-content-btn">
                {loading.content ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Gerar Conteúdo
              </Button>

              {generatedContent && (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{generatedContent.content_name}</Badge>
                    <Badge>{generatedContent.credits_used} crédito{generatedContent.credits_used > 1 ? 's' : ''}</Badge>
                  </div>

                  <div className="space-y-3">
                    {generatedContent.suggestions?.map((suggestion, i) => (
                      <div key={i} className="p-4 border rounded-lg group hover:bg-muted/50 transition-colors">
                        <p className="text-sm whitespace-pre-wrap">{suggestion}</p>
                        <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => copyToClipboard(suggestion)}>
                            <Copy className="h-3 w-3 mr-1" /> Copiar
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Heart className="h-3 w-3 mr-1" /> Favoritar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
