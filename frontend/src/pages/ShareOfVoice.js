import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Volume2, TrendingUp, TrendingDown, Users, Loader2, RefreshCw,
  Award, Target, AlertTriangle, CheckCircle2, Info
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ShareOfVoice() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [sovData, setSovData] = useState(null);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sovRes, trendRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/share-of-voice?period=30`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/share-of-voice/trend?months=6`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setSovData(sovRes.data);
      setTrend(trendRes.data);
    } catch (error) {
      console.error('Error loading SOV data');
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

  const brand = sovData?.sov?.brand || {};
  const competitors = sovData?.sov?.competitors || [];
  const insights = sovData?.insights || [];
  const hasData = sovData?.has_data !== false;

  // Show empty state if no data
  if (!hasData) {
    return (
      <div className="space-y-6" data-testid="share-of-voice-page">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Volume2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Share of Voice</h1>
            <p className="text-muted-foreground">Participação nas conversas do mercado</p>
          </div>
        </div>
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Volume2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Sem dados de Share of Voice</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {sovData?.message || "Configure o monitoramento em Social Listening e adicione concorrentes para comparar sua participação no mercado."}
            </p>
            <Button onClick={() => window.location.href = '/social-listening'}>
              Configurar Social Listening
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // All players for chart
  const allPlayers = [
    { name: brand.name, sov: brand.sov_percentage, isBrand: true },
    ...competitors.map(c => ({ name: c.name, sov: c.sov_percentage, isBrand: false }))
  ].sort((a, b) => b.sov - a.sov);

  return (
    <div className="space-y-6" data-testid="share-of-voice-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Volume2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Share of Voice</h1>
            <p className="text-muted-foreground">Participação nas conversas do mercado</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((insight, idx) => {
            const Icon = insight.type === 'success' ? CheckCircle2 :
                        insight.type === 'warning' ? AlertTriangle : Info;
            const bgColor = insight.type === 'success' ? 'bg-green-50 border-green-200' :
                          insight.type === 'warning' ? 'bg-amber-50 border-amber-200' :
                          'bg-blue-50 border-blue-200';
            
            return (
              <Card key={idx} className={`border ${bgColor}`}>
                <CardContent className="py-3 flex items-start gap-3">
                  <Icon className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm opacity-80">{insight.message}</p>
                    <p className="text-sm font-medium mt-1">{insight.action}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Main Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{brand.sov_percentage || 0}%</p>
            <p className="text-sm opacity-80 mt-1">Seu Share of Voice</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Award className="h-5 w-5" />
              <span>#{sovData?.brand_rank || '-'} de {sovData?.total_players || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{brand.mentions?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">Suas Menções</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{sovData?.total_market_mentions?.toLocaleString() || 0}</p>
            <p className="text-sm text-muted-foreground">Total do Mercado</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              {trend?.growth > 0 ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : trend?.growth < 0 ? (
                <TrendingDown className="h-6 w-6 text-red-500" />
              ) : null}
              <p className="text-3xl font-bold">{trend?.growth > 0 ? '+' : ''}{trend?.growth || 0}%</p>
            </div>
            <p className="text-sm text-muted-foreground">Crescimento 6 meses</p>
          </CardContent>
        </Card>
      </div>

      {/* SOV Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Share of Voice</CardTitle>
          <CardDescription>Sua marca vs concorrentes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allPlayers.map((player, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {idx === 0 && <Award className="h-4 w-4 text-amber-500" />}
                    <span className={`font-medium ${player.isBrand ? 'text-primary' : ''}`}>
                      {player.name}
                    </span>
                    {player.isBrand && <Badge>Você</Badge>}
                  </div>
                  <span className="font-bold">{player.sov}%</span>
                </div>
                <Progress 
                  value={player.sov} 
                  className={`h-4 ${player.isBrand ? '' : ''}`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução do Share of Voice</CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-40">
            {trend?.trend?.map((month, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-1 flex-1 justify-end">
                  <span className="text-xs font-medium">{month.brand_sov}%</span>
                  <div
                    className="w-full bg-primary rounded-t transition-all"
                    style={{ height: `${month.brand_sov * 2}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {month.month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>SOV por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(sovData?.channel_breakdown || {}).map(([channel, data]) => {
              const channelSOV = data.market > 0 ? Math.round((data.brand / data.market) * 100) : 0;
              const channelName = channel === 'social' ? 'Redes Sociais' :
                                channel === 'search' ? 'Busca Orgânica' : 'Mídia Paga';
              
              return (
                <div key={channel} className="p-4 border rounded-lg text-center">
                  <p className="text-2xl font-bold">{channelSOV}%</p>
                  <p className="text-sm text-muted-foreground">{channelName}</p>
                  <div className="flex justify-between text-xs mt-2">
                    <span>Você: {data.brand}</span>
                    <span>Mercado: {data.market}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
