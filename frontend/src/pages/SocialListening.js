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
  Radio, MessageCircle, Heart, ThumbsUp, ThumbsDown, Minus,
  Loader2, RefreshCw, ExternalLink, TrendingUp, TrendingDown,
  Twitter, Instagram, Facebook, Linkedin
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLATFORM_ICONS = {
  twitter: Twitter,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin
};

const PLATFORM_COLORS = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  facebook: '#1877F2',
  linkedin: '#0A66C2'
};

const SENTIMENT_STYLES = {
  positive: { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-100' },
  negative: { icon: ThumbsDown, color: 'text-red-600', bg: 'bg-red-100' },
  neutral: { icon: Minus, color: 'text-gray-600', bg: 'bg-gray-100' }
};

export default function SocialListening() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [mentions, setMentions] = useState([]);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, mentionsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/dashboard?days=30`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/mentions?limit=20`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/alerts`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setDashboard(dashRes.data);
      setMentions(mentionsRes.data.mentions || []);
      setAlerts(alertsRes.data.alerts || []);
    } catch (error) {
      console.error('Error loading social data');
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

  const summary = dashboard?.summary || {};

  return (
    <div className="space-y-6" data-testid="social-listening-page">
      {/* Header */}
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
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

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
            <p className="text-xs text-muted-foreground mt-1">Últimos 30 dias</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{summary.total_engagement?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">Engajamento Total</p>
            <p className="text-xs text-muted-foreground mt-1">Likes, shares, comments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-500" /> Positivo
              </span>
              <span className="font-bold text-green-600">{summary.positive_pct || 0}%</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm flex items-center gap-1">
                <Minus className="h-4 w-4 text-gray-500" /> Neutro
              </span>
              <span className="font-bold text-gray-600">{summary.neutral_pct || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center gap-1">
                <ThumbsDown className="h-4 w-4 text-red-500" /> Negativo
              </span>
              <span className="font-bold text-red-600">{summary.negative_pct || 0}%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* By Platform */}
        <Card>
          <CardHeader>
            <CardTitle>Por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(dashboard?.by_platform || {}).map(([platform, data]) => {
                const Icon = PLATFORM_ICONS[platform] || MessageCircle;
                const color = PLATFORM_COLORS[platform] || '#666';
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
          <CardHeader>
            <CardTitle>Menções Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {mentions.slice(0, 8).map((mention, idx) => {
                const Icon = PLATFORM_ICONS[mention.platform] || MessageCircle;
                const SentimentIcon = SENTIMENT_STYLES[mention.sentiment?.label]?.icon || Minus;
                const sentimentStyle = SENTIMENT_STYLES[mention.sentiment?.label] || SENTIMENT_STYLES.neutral;
                
                return (
                  <div key={idx} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: PLATFORM_COLORS[mention.platform] }} />
                        <span className="text-sm font-medium">{mention.author || 'Anônimo'}</span>
                      </div>
                      <Badge className={`${sentimentStyle.bg} ${sentimentStyle.color}`}>
                        <SentimentIcon className="h-3 w-3 mr-1" />
                        {mention.sentiment?.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{mention.content}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>❤️ {mention.engagement?.likes || 0}</span>
                      <span>🔄 {mention.engagement?.shares || 0}</span>
                      <span>💬 {mention.engagement?.comments || 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart (Simplified) */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Sentimento</CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(dashboard?.trend || {}).slice(-14).map(([date, data], idx) => {
              const total = data.total || 1;
              const positiveHeight = (data.positive / total) * 100;
              const negativeHeight = (data.negative / total) * 100;
              
              return (
                <div key={date} className="flex-1 flex flex-col gap-0.5" title={date}>
                  <div className="flex-1 flex flex-col justify-end">
                    <div 
                      className="bg-green-500 rounded-t"
                      style={{ height: `${positiveHeight}%`, minHeight: positiveHeight > 0 ? '4px' : '0' }}
                    />
                  </div>
                  <div 
                    className="bg-red-500 rounded-b"
                    style={{ height: `${negativeHeight}%`, minHeight: negativeHeight > 0 ? '4px' : '0' }}
                  />
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
