import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  BarChart3, TrendingUp, TrendingDown, Search, Globe, Link2, AlertCircle,
  DollarSign, Users, Target, CheckCircle2, XCircle, Eye, MousePointer,
  Loader2
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function Intelligence() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBrand) return;
      setLoading(true);
      try {
        const res = await axios.get(
          `${API}/api/brands/${currentBrand.brand_id}/intelligence/summary`,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        setSummary(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentBrand, token]);

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca para ver o dashboard de inteligência.</p>
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

  const sources = summary?.sources_connected || {};
  const connectedCount = Object.values(sources).filter(Boolean).length;
  const formatCurrency = (v) => `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6" data-testid="intelligence-page">
      <div>
        <h1 className="text-2xl font-bold">Intelligence Dashboard</h1>
        <p className="text-muted-foreground">Visão unificada de todas as métricas da sua marca</p>
      </div>

      {/* Connection Status */}
      <Card className={connectedCount < 2 ? "border-yellow-500/50 bg-yellow-500/5" : "border-green-500/50 bg-green-500/5"}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            {connectedCount < 2 ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Fontes de Dados Conectadas ({connectedCount}/4)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SourceBadge name="Google Analytics" connected={sources.google_analytics} href="/google-integration" />
            <SourceBadge name="Meta Ads" connected={sources.meta_ads} href="/ads" />
            <SourceBadge name="Google Ads" connected={sources.google_ads} href="/ads" />
            <SourceBadge name="CRM" connected={sources.crm} href="/crm" />
          </div>
        </CardContent>
      </Card>

      {/* Brand Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" /> Saúde da Marca
          </CardTitle>
          <CardDescription>Completude dos pilares estratégicos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {summary?.brand_health?.pillars_filled || 0} de {summary?.brand_health?.total_pillars || 7} pilares preenchidos
            </span>
            <span className="font-bold">{summary?.brand_health?.completeness || 0}%</span>
          </div>
          <Progress value={summary?.brand_health?.completeness || 0} />
          {(summary?.brand_health?.completeness || 0) < 50 && (
            <p className="text-sm text-yellow-600">
              💡 Complete mais pilares para ter uma marca mais forte e consistente.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Marketing Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Investimento em Ads"
          value={formatCurrency(summary?.marketing?.total_ad_spend_30d)}
          sublabel="Últimos 30 dias"
          color="text-blue-500"
        />
        <MetricCard
          icon={Eye}
          label="Impressões"
          value={(summary?.marketing?.total_impressions_30d || 0).toLocaleString()}
          sublabel="Últimos 30 dias"
          color="text-purple-500"
        />
        <MetricCard
          icon={Target}
          label="Conversões"
          value={summary?.marketing?.total_conversions_30d || 0}
          sublabel="Últimos 30 dias"
          color="text-green-500"
        />
        <MetricCard
          icon={MousePointer}
          label="Custo por Conversão"
          value={formatCurrency(summary?.marketing?.cost_per_conversion)}
          sublabel="Média"
          color="text-orange-500"
        />
      </div>

      {/* CRM Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Base de Contatos (CRM)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">{summary?.crm?.total_contacts || 0}</p>
              <p className="text-sm text-muted-foreground">Contatos importados</p>
            </div>
            {!sources.crm && (
              <Button variant="outline" onClick={() => window.location.href = '/crm'}>
                <Link2 className="h-4 w-4 mr-2" /> Conectar CRM
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {connectedCount >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(summary?.marketing?.cost_per_conversion || 0) > 0 && (
              <InsightItem
                type={(summary?.marketing?.cost_per_conversion || 0) < 50 ? 'positive' : 'neutral'}
                text={`Seu custo por conversão é ${formatCurrency(summary?.marketing?.cost_per_conversion)}. ${
                  (summary?.marketing?.cost_per_conversion || 0) < 50 
                    ? 'Está dentro de uma faixa saudável!' 
                    : 'Considere otimizar suas campanhas.'
                }`}
              />
            )}
            {(summary?.brand_health?.completeness || 0) < 70 && (
              <InsightItem
                type="warning"
                text="Marcas com mais de 70% dos pilares preenchidos têm melhor performance em branding. Complete seus pilares!"
              />
            )}
            {sources.meta_ads && sources.google_ads && (
              <InsightItem
                type="positive"
                text="Você está diversificando seus canais de mídia. Continue monitorando o ROAS de cada plataforma."
              />
            )}
            {!sources.google_analytics && (
              <InsightItem
                type="warning"
                text="Conecte o Google Analytics para ter uma visão completa do comportamento dos usuários no seu site."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => window.location.href = '/ads'}>
            Gerenciar Ads
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/crm'}>
            Gerenciar CRM
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/google-integration'}>
            Google Analytics
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/benchmark'}>
            Ver Benchmark
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceBadge({ name, connected, href }) {
  return (
    <div 
      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
        connected ? 'bg-green-500/10' : 'bg-muted hover:bg-muted/80'
      }`}
      onClick={() => window.location.href = href}
    >
      {connected ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={`text-sm ${connected ? 'font-medium' : 'text-muted-foreground'}`}>{name}</span>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sublabel, color }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`flex items-center gap-2 mb-1 ${color}`}>
          <Icon className="h-4 w-4" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </CardContent>
    </Card>
  );
}

function InsightItem({ type, text }) {
  const styles = {
    positive: 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-700 dark:text-yellow-400',
    neutral: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400'
  };
  
  const icons = {
    positive: <TrendingUp className="h-4 w-4" />,
    warning: <AlertCircle className="h-4 w-4" />,
    neutral: <BarChart3 className="h-4 w-4" />
  };
  
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${styles[type]}`}>
      {icons[type]}
      <span className="text-sm">{text}</span>
    </div>
  );
}
