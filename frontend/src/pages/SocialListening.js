import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Radio, MessageCircle, Heart, ThumbsUp, ThumbsDown, Minus,
  Loader2, RefreshCw, ExternalLink, TrendingUp, TrendingDown,
  Instagram, Facebook, Linkedin, Youtube, CheckCircle2, 
  XCircle, ChevronRight, Link2, Eye, EyeOff, Unplug
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_ICONS = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube
};

const PLATFORM_COLORS = {
  instagram: { from: 'from-pink-500', to: 'to-orange-400', text: '#E4405F' },
  facebook: { from: 'from-blue-600', to: 'to-blue-500', text: '#1877F2' },
  linkedin: { from: 'from-blue-700', to: 'to-cyan-600', text: '#0A66C2' },
  youtube: { from: 'from-red-600', to: 'to-red-500', text: '#FF0000' }
};

const SENTIMENT_STYLES = {
  positive: { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-100' },
  negative: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100' },
  neutral: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100' }
};

// Platform Connection Card
function PlatformCard({ platform, onConnect, onDisconnect }) {
  const [expanded, setExpanded] = useState(false);
  const [credentials, setCredentials] = useState({});
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState({});

  const Icon = PLATFORM_ICONS[platform.id] || Radio;
  const colors = PLATFORM_COLORS[platform.id] || { from: 'from-gray-500', to: 'to-gray-400', text: '#666' };

  const handleConnect = async () => {
    setSaving(true);
    try {
      await onConnect(platform.id, credentials);
      setExpanded(false);
      setCredentials({});
    } finally {
      setSaving(false);
    }
  };

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Card className={`transition-all ${platform.connected ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10' : ''}`} data-testid={`platform-${platform.id}`}>
      <CardContent className="p-4">
        {/* Platform Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colors.from} ${colors.to} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h4 className="font-semibold">{platform.name}</h4>
              {platform.connected ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Não conectado</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {platform.connected ? (
              <Button variant="outline" size="sm" onClick={() => onDisconnect(platform.id)} className="text-red-500 hover:text-red-700" data-testid={`disconnect-${platform.id}`}>
                <Unplug className="h-4 w-4 mr-1" /> Desconectar
              </Button>
            ) : (
              <Button variant={expanded ? "secondary" : "default"} size="sm" onClick={() => setExpanded(!expanded)} data-testid={`connect-${platform.id}`}>
                {expanded ? 'Fechar' : 'Conectar'}
                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Expand: Setup Guide + Fields */}
        {expanded && !platform.connected && (
          <div className="mt-4 pt-4 border-t space-y-4">
            {/* Step-by-step guide */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Como conectar {platform.name}
              </h5>
              <ol className="space-y-1.5 text-sm text-muted-foreground">
                {platform.steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">{idx + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              {platform.doc_url && (
                <a href={platform.doc_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-3">
                  <ExternalLink className="h-3 w-3" /> Documentação oficial
                </a>
              )}
            </div>

            {/* Credential Fields */}
            <div className="space-y-3">
              {platform.fields.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`${platform.id}-${field.key}`} className="text-sm">{field.label}</Label>
                  <div className="relative">
                    <Input
                      id={`${platform.id}-${field.key}`}
                      type={field.type === 'password' && !showSecrets[field.key] ? 'password' : 'text'}
                      value={credentials[field.key] || ''}
                      onChange={(e) => setCredentials(prev => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={`Insira ${field.label.toLowerCase()}`}
                      data-testid={`input-${platform.id}-${field.key}`}
                    />
                    {field.type === 'password' && (
                      <button onClick={() => toggleSecret(field.key)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" type="button">
                        {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Connect Button */}
            <Button onClick={handleConnect} disabled={saving} className="w-full" data-testid={`save-${platform.id}`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Salvar e Conectar {platform.name}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SocialListening() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [mentions, setMentions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, mentionsRes, alertsRes, platRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/dashboard?days=30`, { headers }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/mentions?limit=20`, { headers }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/alerts`, { headers }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/platforms`, { headers })
      ]);
      setDashboard(dashRes.data);
      setMentions(mentionsRes.data.mentions || []);
      setAlerts(alertsRes.data.alerts || []);
      setPlatforms(platRes.data.platforms || []);
    } catch (error) {
      console.error('Error loading social data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platformId, credentials) => {
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/social-listening/connect`, 
        { platform: platformId, credentials }, { headers }
      );
      toast.success(`${platformId} conectado com sucesso!`);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao conectar plataforma');
    }
  };

  const handleDisconnect = async (platformId) => {
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/social-listening/disconnect/${platformId}`, { headers });
      toast.success('Plataforma desconectada');
      loadData();
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  if (!currentBrand) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Selecione uma marca primeiro</p></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const summary = dashboard?.summary || {};
  const hasData = dashboard?.has_data !== false;
  const connectedCount = platforms.filter(p => p.connected).length;

  // Empty state - no data, show connection panel
  if (!hasData) {
    return (
      <div className="space-y-6" data-testid="social-listening-page">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Radio className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Social Listening</h1>
            <p className="text-muted-foreground">Monitoramento de menções e sentimento</p>
          </div>
        </div>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Conectar Redes Sociais
            </CardTitle>
            <CardDescription>
              {connectedCount > 0
                ? `${connectedCount} rede(s) conectada(s). Os dados começarão a aparecer nas próximas horas.`
                : "Conecte suas redes sociais para monitorar menções à sua marca em tempo real. O cliente insere suas próprias credenciais de API."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {platforms.map(platform => (
              <PlatformCard 
                key={platform.id} 
                platform={platform} 
                onConnect={handleConnect} 
                onDisconnect={handleDisconnect} 
              />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has data - show dashboard
  return (
    <div className="space-y-6" data-testid="social-listening-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Radio className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Social Listening</h1>
            <p className="text-muted-foreground">Monitoramento de menções e sentimento</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowSetup(!showSetup)} variant="outline" size="sm">
            <Link2 className="h-4 w-4 mr-2" />
            Redes ({connectedCount})
          </Button>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Inline setup panel (toggled) */}
      {showSetup && (
        <Card>
          <CardHeader><CardTitle className="text-base">Gerenciar Conexões</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {platforms.map(platform => (
              <PlatformCard key={platform.id} platform={platform} onConnect={handleConnect} onDisconnect={handleDisconnect} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <Card key={idx} className={`border ${
              alert.type === 'critical' ? 'border-red-200 bg-red-50' :
              alert.type === 'warning' ? 'border-amber-200 bg-amber-50' :
              'border-green-200 bg-green-50'
            }`}>
              <CardContent className="py-3">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm opacity-80">{alert.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{summary.sentiment_score || 0}</p>
            <p className="text-sm text-slate-300 mt-1">Sentiment Score</p>
            <Progress value={summary.sentiment_score || 0} className="h-2 mt-3" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{summary.total_mentions || 0}</p>
            <p className="text-sm text-muted-foreground">Total de Menções</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{summary.total_engagement?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">Engajamento Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm flex items-center gap-1"><ThumbsUp className="h-4 w-4 text-green-500" /> Positivo</span>
              <span className="font-bold text-green-600">{summary.positive_pct || 0}%</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm flex items-center gap-1"><Minus className="h-4 w-4 text-gray-500" /> Neutro</span>
              <span className="font-bold text-gray-600">{summary.neutral_pct || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-1"><ThumbsDown className="h-4 w-4 text-red-500" /> Negativo</span>
              <span className="font-bold text-red-600">{summary.negative_pct || 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Platform */}
        <Card>
          <CardHeader><CardTitle>Por Plataforma</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dashboard?.by_platform || {}).map(([platform, data]) => {
                const Icon = PLATFORM_ICONS[platform] || MessageCircle;
                const color = PLATFORM_COLORS[platform]?.text || '#666';
                const total = data.positive + data.negative + data.neutral;
                const positiveWidth = total > 0 ? (data.positive / total) * 100 : 0;
                const negativeWidth = total > 0 ? (data.negative / total) * 100 : 0;
                return (
                  <div key={platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5" style={{ color }} />
                        <span className="font-medium capitalize">{platform}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{data.count} menções</span>
                    </div>
                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-200">
                      <div className="bg-green-500" style={{ width: `${positiveWidth}%` }} />
                      <div className="bg-gray-400" style={{ width: `${100 - positiveWidth - negativeWidth}%` }} />
                      <div className="bg-red-500" style={{ width: `${negativeWidth}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Mentions */}
        <Card>
          <CardHeader><CardTitle>Menções Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {mentions.slice(0, 8).map((mention, idx) => {
                const Icon = PLATFORM_ICONS[mention.platform] || MessageCircle;
                const sentimentStyle = SENTIMENT_STYLES[mention.sentiment?.label] || SENTIMENT_STYLES.neutral;
                const SentimentIcon = sentimentStyle.icon;
                return (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: PLATFORM_COLORS[mention.platform]?.text }} />
                        <span className="text-sm font-medium">{mention.author || 'Anônimo'}</span>
                      </div>
                      <Badge className={`${sentimentStyle.bg} ${sentimentStyle.color}`}>
                        <SentimentIcon className="h-3 w-3 mr-1" />{mention.sentiment?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{mention.content}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Sentimento</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(dashboard?.trend || {}).slice(-14).map(([date, data]) => {
              const total = data.total || 1;
              const positiveHeight = (data.positive / total) * 100;
              const negativeHeight = (data.negative / total) * 100;
              return (
                <div key={date} className="flex-1 flex flex-col gap-0.5" title={date}>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="bg-green-500 rounded-t" style={{ height: `${positiveHeight}%`, minHeight: positiveHeight > 0 ? '4px' : '0' }} />
                  </div>
                  <div className="bg-red-500 rounded-b" style={{ height: `${negativeHeight}%`, minHeight: negativeHeight > 0 ? '4px' : '0' }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>14 dias atrás</span>
            <span>Hoje</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
