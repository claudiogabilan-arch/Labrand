import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  AlertTriangle, CheckCircle2, XCircle, Loader2, RefreshCw,
  Sparkles, ArrowRight, Eye, Lightbulb
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ALERT_TYPES = {
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', border: 'border-yellow-200' },
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200' },
  info: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200' },
};

export default function ConsistencyAlerts() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [alertsData, setAlertsData] = useState(null);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadAlerts();
    }
  }, [currentBrand]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/consistency-alerts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlertsData(response.data);
    } catch (error) {
      console.log('No alerts data');
    } finally {
      setLoading(false);
    }
  };

  const analyzeConsistency = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/consistency-alerts`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlertsData(response.data);
      toast.success('Análise de consistência concluída!');
    } catch (error) {
      toast.error('Erro ao analisar consistência');
    } finally {
      setAnalyzing(false);
    }
  };

  const getConsistencyScore = () => {
    if (!alertsData?.alerts) return 100;
    const errors = alertsData.alerts.filter(a => a.type === 'error').length;
    const warnings = alertsData.alerts.filter(a => a.type === 'warning').length;
    return Math.max(0, 100 - (errors * 15) - (warnings * 5));
  };

  const getAlertsByType = (type) => {
    return alertsData?.alerts?.filter(a => a.type === type) || [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const consistencyScore = getConsistencyScore();
  const errors = getAlertsByType('error');
  const warnings = getAlertsByType('warning');
  const successes = getAlertsByType('success');
  const infos = getAlertsByType('info');

  return (
    <div className="space-y-6" data-testid="consistency-alerts-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
            <Eye className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Alertas de Consistência</h1>
            <p className="text-muted-foreground">IA detecta inconsistências entre os pilares da marca</p>
          </div>
        </div>
        <Button onClick={analyzeConsistency} disabled={analyzing} data-testid="analyze-consistency-btn">
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {alertsData ? 'Reanalisar' : 'Analisar Consistência'}
        </Button>
      </div>

      {!alertsData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Eye className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma análise realizada</h3>
            <p className="text-muted-foreground text-center mb-4">
              A IA irá analisar todos os pilares da sua marca e identificar inconsistências
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Consistency Score */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Score de Consistência</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold">{consistencyScore}%</span>
                    <Badge variant={consistencyScore >= 80 ? 'default' : consistencyScore >= 50 ? 'secondary' : 'destructive'}>
                      {consistencyScore >= 80 ? 'Excelente' : consistencyScore >= 50 ? 'Atenção' : 'Crítico'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{errors.length} erros</p>
                  <p>{warnings.length} alertas</p>
                  <p>{successes.length} consistentes</p>
                </div>
              </div>
              <Progress value={consistencyScore} className="h-3" />
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className={`${ALERT_TYPES.error.bg} ${ALERT_TYPES.error.border}`}>
              <CardContent className="pt-4 text-center">
                <XCircle className={`h-8 w-8 mx-auto mb-2 ${ALERT_TYPES.error.color}`} />
                <p className="text-2xl font-bold">{errors.length}</p>
                <p className="text-sm text-muted-foreground">Inconsistências</p>
              </CardContent>
            </Card>
            <Card className={`${ALERT_TYPES.warning.bg} ${ALERT_TYPES.warning.border}`}>
              <CardContent className="pt-4 text-center">
                <AlertTriangle className={`h-8 w-8 mx-auto mb-2 ${ALERT_TYPES.warning.color}`} />
                <p className="text-2xl font-bold">{warnings.length}</p>
                <p className="text-sm text-muted-foreground">Alertas</p>
              </CardContent>
            </Card>
            <Card className={`${ALERT_TYPES.success.bg} ${ALERT_TYPES.success.border}`}>
              <CardContent className="pt-4 text-center">
                <CheckCircle2 className={`h-8 w-8 mx-auto mb-2 ${ALERT_TYPES.success.color}`} />
                <p className="text-2xl font-bold">{successes.length}</p>
                <p className="text-sm text-muted-foreground">Consistentes</p>
              </CardContent>
            </Card>
            <Card className={`${ALERT_TYPES.info.bg} ${ALERT_TYPES.info.border}`}>
              <CardContent className="pt-4 text-center">
                <Lightbulb className={`h-8 w-8 mx-auto mb-2 ${ALERT_TYPES.info.color}`} />
                <p className="text-2xl font-bold">{infos.length}</p>
                <p className="text-sm text-muted-foreground">Sugestões</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerts List */}
          <div className="space-y-4">
            {/* Errors */}
            {errors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600 flex items-center gap-2">
                    <XCircle className="h-5 w-5" />
                    Inconsistências Encontradas
                  </CardTitle>
                  <CardDescription>Correções prioritárias para melhorar a consistência</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {errors.map((alert, i) => (
                    <div key={i} className={`p-4 rounded-lg ${ALERT_TYPES.error.bg} ${ALERT_TYPES.error.border} border`}>
                      <div className="flex items-start gap-3">
                        <XCircle className={`h-5 w-5 mt-0.5 ${ALERT_TYPES.error.color}`} />
                        <div className="flex-1">
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                          {alert.suggestion && (
                            <div className="mt-2 p-2 bg-white dark:bg-background rounded flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                              <p className="text-sm">{alert.suggestion}</p>
                            </div>
                          )}
                          {alert.pillars && (
                            <div className="flex gap-2 mt-2">
                              {alert.pillars.map((p, j) => (
                                <Badge key={j} variant="outline">{p}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Warnings */}
            {warnings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-yellow-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Alertas de Atenção
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {warnings.map((alert, i) => (
                    <div key={i} className={`p-4 rounded-lg ${ALERT_TYPES.warning.bg} ${ALERT_TYPES.warning.border} border`}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${ALERT_TYPES.warning.color}`} />
                        <div className="flex-1">
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                          {alert.suggestion && (
                            <p className="text-sm mt-2 italic">💡 {alert.suggestion}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Successes */}
            {successes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Pontos Consistentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {successes.map((alert, i) => (
                      <div key={i} className={`p-3 rounded-lg ${ALERT_TYPES.success.bg} ${ALERT_TYPES.success.border} border`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className={`h-4 w-4 ${ALERT_TYPES.success.color}`} />
                          <span className="text-sm font-medium">{alert.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info/Suggestions */}
            {infos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-blue-600 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    Sugestões de Melhoria
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {infos.map((alert, i) => (
                    <div key={i} className={`p-4 rounded-lg ${ALERT_TYPES.info.bg} ${ALERT_TYPES.info.border} border`}>
                      <div className="flex items-start gap-3">
                        <Lightbulb className={`h-5 w-5 mt-0.5 ${ALERT_TYPES.info.color}`} />
                        <div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Last Analysis */}
          <p className="text-xs text-muted-foreground text-center">
            Última análise: {new Date(alertsData.analyzed_at).toLocaleString('pt-BR')}
          </p>
        </>
      )}
    </div>
  );
}
