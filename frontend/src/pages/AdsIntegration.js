import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, Target,
  RefreshCw, Loader2, Link2, Unlink, CheckCircle2, BarChart3
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PROVIDER_ICONS = {
  meta: '📘',
  google: '🔴'
};

export default function AdsIntegration() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null);
  const [providers, setProviders] = useState([]);
  const [metrics, setMetrics] = useState({});
  const [connectDialog, setConnectDialog] = useState(null);
  const [formData, setFormData] = useState({ account_id: '', access_token: '' });
  const [activeTab, setActiveTab] = useState('meta');

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const provRes = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/ads/providers`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setProviders(provRes.data.providers || []);
      
      // Load metrics for connected providers
      for (const prov of provRes.data.providers.filter(p => p.connected)) {
        const metRes = await axios.get(
          `${API}/brands/${currentBrand.brand_id}/ads/${prov.id}/metrics`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setMetrics(prev => ({ ...prev, [prov.id]: metRes.data }));
      }
    } catch (error) {
      console.error('Error loading ads data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!connectDialog) return;
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/ads/connect`,
        { provider: connectDialog, ...formData },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`${connectDialog === 'meta' ? 'Meta' : 'Google'} Ads conectado!`);
      setConnectDialog(null);
      setFormData({ account_id: '', access_token: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao conectar');
    }
  };

  const handleDisconnect = async (provider) => {
    if (!window.confirm('Desconectar e remover dados?')) return;
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/ads/${provider}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Desconectado');
      setMetrics(prev => ({ ...prev, [provider]: null }));
      loadData();
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  const handleSync = async (provider) => {
    setSyncing(provider);
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/ads/${provider}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Dados sincronizados (MOCK)');
      
      // Reload metrics
      const metRes = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/ads/${provider}/metrics`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setMetrics(prev => ({ ...prev, [provider]: metRes.data }));
    } catch (error) {
      toast.error('Erro ao sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const formatNumber = (value) => value.toLocaleString('pt-BR');

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
    <div className="space-y-6" data-testid="ads-integration-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-red-500 flex items-center justify-center">
          <BarChart3 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Integrações de Ads</h1>
          <p className="text-muted-foreground">Meta Ads e Google Ads em um só lugar</p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {providers.map(provider => {
          const connected = provider.connected;
          const provMetrics = metrics[provider.id];
          
          return (
            <Card key={provider.id} className={connected ? "border-green-500/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{PROVIDER_ICONS[provider.id]}</span>
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <CardDescription>{provider.description}</CardDescription>
                    </div>
                  </div>
                  {connected && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {connected ? (
                  <>
                    {provMetrics?.summary && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Investimento 30d</p>
                          <p className="font-bold">{formatCurrency(provMetrics.summary.spend)}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">Conversões</p>
                          <p className="font-bold">{formatNumber(provMetrics.summary.conversions)}</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">CTR</p>
                          <p className="font-bold">{provMetrics.summary.ctr}%</p>
                        </div>
                        <div className="p-2 bg-muted rounded">
                          <p className="text-muted-foreground">ROAS</p>
                          <p className="font-bold">{provMetrics.summary.avg_roas}x</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleSync(provider.id)}
                        disabled={syncing === provider.id}
                      >
                        {syncing === provider.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><RefreshCw className="h-4 w-4 mr-1" /> Sincronizar</>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDisconnect(provider.id)}>
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button className="w-full" onClick={() => setConnectDialog(provider.id)}>
                    <Link2 className="h-4 w-4 mr-2" /> Conectar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Metrics */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="meta">📘 Meta Ads</TabsTrigger>
          <TabsTrigger value="google">🔴 Google Ads</TabsTrigger>
          <TabsTrigger value="comparison">📊 Comparativo</TabsTrigger>
        </TabsList>

        <TabsContent value="meta" className="space-y-4">
          {metrics.meta?.has_data ? (
            <MetricsDetail data={metrics.meta} provider="Meta" />
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Conecte o Meta Ads para ver métricas detalhadas
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="google" className="space-y-4">
          {metrics.google?.has_data ? (
            <MetricsDetail data={metrics.google} provider="Google" />
          ) : (
            <Card><CardContent className="py-8 text-center text-muted-foreground">
              Conecte o Google Ads para ver métricas detalhadas
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo de Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.meta?.has_data || metrics.google?.has_data ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Métrica</th>
                        <th className="text-right py-2">Meta Ads</th>
                        <th className="text-right py-2">Google Ads</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2">Investimento</td>
                        <td className="text-right">{metrics.meta?.summary?.spend ? formatCurrency(metrics.meta.summary.spend) : '-'}</td>
                        <td className="text-right">{metrics.google?.summary?.spend ? formatCurrency(metrics.google.summary.spend) : '-'}</td>
                        <td className="text-right font-bold">
                          {formatCurrency((metrics.meta?.summary?.spend || 0) + (metrics.google?.summary?.spend || 0))}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Impressões</td>
                        <td className="text-right">{metrics.meta?.summary?.impressions ? formatNumber(metrics.meta.summary.impressions) : '-'}</td>
                        <td className="text-right">{metrics.google?.summary?.impressions ? formatNumber(metrics.google.summary.impressions) : '-'}</td>
                        <td className="text-right font-bold">
                          {formatNumber((metrics.meta?.summary?.impressions || 0) + (metrics.google?.summary?.impressions || 0))}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Cliques</td>
                        <td className="text-right">{metrics.meta?.summary?.clicks ? formatNumber(metrics.meta.summary.clicks) : '-'}</td>
                        <td className="text-right">{metrics.google?.summary?.clicks ? formatNumber(metrics.google.summary.clicks) : '-'}</td>
                        <td className="text-right font-bold">
                          {formatNumber((metrics.meta?.summary?.clicks || 0) + (metrics.google?.summary?.clicks || 0))}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Conversões</td>
                        <td className="text-right">{metrics.meta?.summary?.conversions || '-'}</td>
                        <td className="text-right">{metrics.google?.summary?.conversions || '-'}</td>
                        <td className="text-right font-bold">
                          {(metrics.meta?.summary?.conversions || 0) + (metrics.google?.summary?.conversions || 0)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2">CTR</td>
                        <td className="text-right">{metrics.meta?.summary?.ctr ? `${metrics.meta.summary.ctr}%` : '-'}</td>
                        <td className="text-right">{metrics.google?.summary?.ctr ? `${metrics.google.summary.ctr}%` : '-'}</td>
                        <td className="text-right font-bold">-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Conecte pelo menos uma plataforma para ver o comparativo
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={() => setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Conectar {connectDialog === 'meta' ? 'Meta Ads' : 'Google Ads'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ID da Conta de Anúncios</Label>
              <Input
                placeholder={connectDialog === 'meta' ? 'Ex: act_123456789' : 'Ex: 123-456-7890'}
                value={formData.account_id}
                onChange={(e) => setFormData({...formData, account_id: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                placeholder="Seu token de acesso"
                value={formData.access_token}
                onChange={(e) => setFormData({...formData, access_token: e.target.value})}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {connectDialog === 'meta' 
                ? 'Obtenha o token em developers.facebook.com → Suas aplicações → Marketing API'
                : 'Configure no Google Ads API Center ou use OAuth 2.0'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancelar</Button>
            <Button onClick={handleConnect}>Conectar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Metrics Detail Component
function MetricsDetail({ data, provider }) {
  const formatCurrency = (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" /> Investimento
            </div>
            <p className="text-2xl font-bold">{formatCurrency(data.summary.spend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" /> Impressões
            </div>
            <p className="text-2xl font-bold">{data.summary.impressions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MousePointer className="h-4 w-4" /> Cliques
            </div>
            <p className="text-2xl font-bold">{data.summary.clicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" /> Conversões
            </div>
            <p className="text-2xl font-bold">{data.summary.conversions}</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Métricas Diárias - Últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left py-2">Data</th>
                  <th className="text-right py-2">Invest.</th>
                  <th className="text-right py-2">Impr.</th>
                  <th className="text-right py-2">Cliques</th>
                  <th className="text-right py-2">CTR</th>
                  <th className="text-right py-2">Conv.</th>
                  <th className="text-right py-2">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.metrics.slice(0, 15).map((day, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/50">
                    <td className="py-2">{new Date(day.date).toLocaleDateString('pt-BR')}</td>
                    <td className="text-right">{formatCurrency(day.spend)}</td>
                    <td className="text-right">{day.impressions.toLocaleString()}</td>
                    <td className="text-right">{day.clicks}</td>
                    <td className="text-right">{day.ctr}%</td>
                    <td className="text-right">{day.conversions}</td>
                    <td className="text-right">{day.roas}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
