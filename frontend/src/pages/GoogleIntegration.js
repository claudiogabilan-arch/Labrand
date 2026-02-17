import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  BarChart3, TrendingUp, Users, Eye, Search, Globe, 
  Link2, Unlink, Loader2, RefreshCw, ArrowUpRight, ArrowDownRight,
  ExternalLink, CheckCircle2, AlertCircle
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GoogleIntegration() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    analytics: false,
    searchConsole: false
  });
  const [analyticsData, setAnalyticsData] = useState(null);
  const [searchConsoleData, setSearchConsoleData] = useState(null);
  const [propertyId, setPropertyId] = useState('');
  const [siteUrl, setSiteUrl] = useState('');

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadData();
    }
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/google-integration`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConnectionStatus(response.data.connection_status || { analytics: false, searchConsole: false });
      setAnalyticsData(response.data.analytics);
      setSearchConsoleData(response.data.search_console);
      setPropertyId(response.data.property_id || '');
      setSiteUrl(response.data.site_url || '');
    } catch (error) {
      console.log('No Google data');
    } finally {
      setLoading(false);
    }
  };

  const connectGoogle = async (service) => {
    setConnecting(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/google-integration/connect`,
        { 
          service,
          property_id: propertyId,
          site_url: siteUrl
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.auth_url) {
        // Redirect to Google OAuth in same window
        window.location.href = response.data.auth_url;
      } else {
        setConnectionStatus(response.data.connection_status);
        toast.success(`${service === 'analytics' ? 'Google Analytics' : 'Search Console'} conectado!`);
        loadData();
      }
    } catch (error) {
      toast.error('Erro ao conectar. Verifique as credenciais.');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectGoogle = async (service) => {
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/google-integration/disconnect`,
        { service },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setConnectionStatus(prev => ({ ...prev, [service]: false }));
      if (service === 'analytics') setAnalyticsData(null);
      if (service === 'searchConsole') setSearchConsoleData(null);
      toast.success('Desconectado com sucesso');
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/google-integration/refresh`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await loadData();
      toast.success('Dados atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
    } finally {
      setRefreshing(false);
    }
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (num) => {
    if (!num) return '0%';
    return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="google-integration-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-green-500 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Google Integration</h1>
            <p className="text-muted-foreground">Analytics e Search Console</p>
          </div>
        </div>
        {(connectionStatus.analytics || connectionStatus.searchConsole) && (
          <Button variant="outline" onClick={refreshData} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar Dados
          </Button>
        )}
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Google Analytics
            {connectionStatus.analytics && <Badge variant="default" className="ml-1 h-5">Conectado</Badge>}
          </TabsTrigger>
          <TabsTrigger value="search-console" className="gap-2">
            <Search className="h-4 w-4" />
            Search Console
            {connectionStatus.searchConsole && <Badge variant="default" className="ml-1 h-5">Conectado</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Google Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {!connectionStatus.analytics ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  Conectar Google Analytics 4
                </CardTitle>
                <CardDescription>
                  Visualize métricas de tráfego e comportamento do seu site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Property ID (GA4)</Label>
                  <Input
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    placeholder="Ex: 123456789"
                    data-testid="analytics-property-id"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Encontre em: Google Analytics → Admin → Property Settings
                  </p>
                </div>
                <Button onClick={() => connectGoogle('analytics')} disabled={connecting || !propertyId}>
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  Conectar Google Analytics
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Analytics Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <Users className="h-8 w-8 text-blue-500" />
                      {analyticsData?.users_change > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-2">{formatNumber(analyticsData?.users || 0)}</p>
                    <p className="text-sm text-muted-foreground">Usuários</p>
                    <p className={`text-xs ${analyticsData?.users_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercent(analyticsData?.users_change)} vs período anterior
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <Eye className="h-8 w-8 text-purple-500" />
                      {analyticsData?.pageviews_change > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-2xl font-bold mt-2">{formatNumber(analyticsData?.pageviews || 0)}</p>
                    <p className="text-sm text-muted-foreground">Pageviews</p>
                    <p className={`text-xs ${analyticsData?.pageviews_change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatPercent(analyticsData?.pageviews_change)} vs período anterior
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2">{analyticsData?.bounce_rate || 0}%</p>
                    <p className="text-sm text-muted-foreground">Bounce Rate</p>
                    <p className="text-xs text-muted-foreground">Taxa de rejeição</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <Globe className="h-8 w-8 text-orange-500" />
                    </div>
                    <p className="text-2xl font-bold mt-2">{analyticsData?.avg_session_duration || '0:00'}</p>
                    <p className="text-sm text-muted-foreground">Duração Média</p>
                    <p className="text-xs text-muted-foreground">Por sessão</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Pages */}
              {analyticsData?.top_pages && (
                <Card>
                  <CardHeader>
                    <CardTitle>Páginas Mais Visitadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analyticsData.top_pages.map((page, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm truncate flex-1">{page.path}</span>
                          <Badge variant="outline">{formatNumber(page.views)} views</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" onClick={() => disconnectGoogle('analytics')}>
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar Analytics
              </Button>
            </>
          )}
        </TabsContent>

        {/* Search Console Tab */}
        <TabsContent value="search-console" className="space-y-6">
          {!connectionStatus.searchConsole ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-500" />
                  Conectar Google Search Console
                </CardTitle>
                <CardDescription>
                  Visualize dados de pesquisa orgânica e performance no Google
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL do Site</Label>
                  <Input
                    value={siteUrl}
                    onChange={(e) => setSiteUrl(e.target.value)}
                    placeholder="Ex: https://seusite.com.br"
                    data-testid="search-console-url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use a URL exata cadastrada no Search Console
                  </p>
                </div>
                <Button onClick={() => connectGoogle('searchConsole')} disabled={connecting || !siteUrl}>
                  {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  Conectar Search Console
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Search Console Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <Search className="h-8 w-8 text-blue-500" />
                    <p className="text-2xl font-bold mt-2">{formatNumber(searchConsoleData?.clicks || 0)}</p>
                    <p className="text-sm text-muted-foreground">Cliques</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <Eye className="h-8 w-8 text-purple-500" />
                    <p className="text-2xl font-bold mt-2">{formatNumber(searchConsoleData?.impressions || 0)}</p>
                    <p className="text-sm text-muted-foreground">Impressões</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                    <p className="text-2xl font-bold mt-2">{searchConsoleData?.ctr || 0}%</p>
                    <p className="text-sm text-muted-foreground">CTR Médio</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <BarChart3 className="h-8 w-8 text-orange-500" />
                    <p className="text-2xl font-bold mt-2">{searchConsoleData?.position || 0}</p>
                    <p className="text-sm text-muted-foreground">Posição Média</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Queries */}
              {searchConsoleData?.top_queries && (
                <Card>
                  <CardHeader>
                    <CardTitle>Principais Termos de Busca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {searchConsoleData.top_queries.map((query, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <span className="text-sm truncate flex-1">{query.query}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline">{query.clicks} cliques</Badge>
                            <Badge variant="secondary">Pos. {query.position}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button variant="outline" onClick={() => disconnectGoogle('searchConsole')}>
                <Unlink className="h-4 w-4 mr-2" />
                Desconectar Search Console
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Como configurar a integração</p>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                <li>Acesse o Google Analytics ou Search Console</li>
                <li>Copie o Property ID (Analytics) ou URL do site (Search Console)</li>
                <li>Cole nos campos acima e clique em Conectar</li>
                <li>Autorize o acesso na janela do Google</li>
              </ol>
              <Button variant="link" className="px-0 mt-2" asChild>
                <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
                  Abrir Google Analytics <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
