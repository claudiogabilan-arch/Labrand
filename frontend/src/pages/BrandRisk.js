import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  AlertTriangle, Shield, TrendingDown, Eye, Scale, Users, 
  Building2, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle,
  Sparkles
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RISK_CATEGORIES = [
  { 
    id: 'reputacional', 
    name: 'Risco Reputacional', 
    icon: Eye,
    color: 'text-red-500',
    description: 'Exposição a crises de imagem e percepção pública'
  },
  { 
    id: 'competitivo', 
    name: 'Risco Competitivo', 
    icon: TrendingDown,
    color: 'text-orange-500',
    description: 'Vulnerabilidade frente à concorrência'
  },
  { 
    id: 'operacional', 
    name: 'Risco Operacional', 
    icon: Building2,
    color: 'text-yellow-500',
    description: 'Inconsistências na entrega da promessa de marca'
  },
  { 
    id: 'legal', 
    name: 'Risco Legal', 
    icon: Scale,
    color: 'text-purple-500',
    description: 'Exposição a questões regulatórias e propriedade intelectual'
  },
  { 
    id: 'cultural', 
    name: 'Risco Cultural', 
    icon: Users,
    color: 'text-blue-500',
    description: 'Desalinhamento entre cultura interna e marca externa'
  },
];

const RISK_LEVELS = {
  baixo: { label: 'Baixo', color: 'bg-green-500', textColor: 'text-green-700' },
  moderado: { label: 'Moderado', color: 'bg-yellow-500', textColor: 'text-yellow-700' },
  alto: { label: 'Alto', color: 'bg-orange-500', textColor: 'text-orange-700' },
  critico: { label: 'Crítico', color: 'bg-red-500', textColor: 'text-red-700' },
};

export default function BrandRisk() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [riskData, setRiskData] = useState(null);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadRiskData();
    }
  }, [currentBrand]);

  const loadRiskData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/risk-analysis`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRiskData(response.data);
    } catch (error) {
      console.log('No risk data yet');
    } finally {
      setLoading(false);
    }
  };

  const analyzeRisks = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/risk-analysis`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRiskData(response.data);
      toast.success('Análise de risco concluída!');
    } catch (error) {
      toast.error('Erro ao analisar riscos');
    } finally {
      setAnalyzing(false);
    }
  };

  const getOverallRiskLevel = () => {
    if (!riskData?.risks) return 'baixo';
    const scores = Object.values(riskData.risks).map(r => r.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 75) return 'critico';
    if (avg >= 50) return 'alto';
    if (avg >= 25) return 'moderado';
    return 'baixo';
  };

  const getOverallScore = () => {
    if (!riskData?.risks) return 0;
    const scores = Object.values(riskData.risks).map(r => r.score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const overallLevel = getOverallRiskLevel();
  const overallScore = getOverallScore();

  return (
    <div className="space-y-6" data-testid="brand-risk-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Módulo de Risco de Marca</h1>
            <p className="text-muted-foreground">Análise de vulnerabilidades e exposições da marca</p>
          </div>
        </div>
        <Button onClick={analyzeRisks} disabled={analyzing} data-testid="analyze-risks-btn">
          {analyzing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {riskData ? 'Reanalisar com IA' : 'Analisar Riscos com IA'}
        </Button>
      </div>

      {!riskData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma análise realizada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Clique no botão acima para realizar uma análise de risco baseada nos dados da sua marca
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Risk Score */}
          <Card className={`border-2 ${RISK_LEVELS[overallLevel].color.replace('bg-', 'border-')}/30`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Índice de Vulnerabilidade Geral</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold">{overallScore}</span>
                    <Badge className={`${RISK_LEVELS[overallLevel].color} text-white`}>
                      {RISK_LEVELS[overallLevel].label}
                    </Badge>
                  </div>
                </div>
                <div className="w-32 h-32">
                  <div className="relative w-full h-full">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted/20"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${(overallScore / 100) * 352} 352`}
                        className={RISK_LEVELS[overallLevel].textColor}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className={`h-8 w-8 ${RISK_LEVELS[overallLevel].textColor}`} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {RISK_CATEGORIES.map((category) => {
              const risk = riskData.risks?.[category.id] || { score: 0, factors: [] };
              const level = risk.score >= 75 ? 'critico' : risk.score >= 50 ? 'alto' : risk.score >= 25 ? 'moderado' : 'baixo';
              const Icon = category.icon;
              
              return (
                <Card key={category.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${category.color}`} />
                        <CardTitle className="text-base">{category.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className={RISK_LEVELS[level].textColor}>
                        {risk.score}%
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Progress value={risk.score} className="h-2 mb-3" />
                    <div className="space-y-1">
                      {risk.factors?.slice(0, 3).map((factor, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {risk.score >= 50 ? (
                            <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-yellow-500 mt-0.5 shrink-0" />
                          )}
                          <span className="text-muted-foreground">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Recommendations */}
          {riskData.recommendations && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Recomendações de Mitigação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {riskData.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="outline">{i + 1}</Badge>
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Analysis */}
          <p className="text-xs text-muted-foreground text-center">
            Última análise: {new Date(riskData.analyzed_at).toLocaleString('pt-BR')}
          </p>
        </>
      )}
    </div>
  );
}
