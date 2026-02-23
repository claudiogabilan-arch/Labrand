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
  BarChart3, Target, TrendingUp, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, ArrowRight, Zap
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const QUADRANT_COLORS = {
  concentrate: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', label: 'Concentrar Esforços' },
  keep_up: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', label: 'Manter' },
  low_priority: { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-700', label: 'Baixa Prioridade' },
  possible_overkill: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', label: 'Possível Excesso' }
};

const CATEGORY_LABELS = {
  product: 'Produto',
  brand: 'Marca',
  experience: 'Experiência',
  social: 'Social'
};

export default function ConversionAttributes() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [matrix, setMatrix] = useState(null);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [analysisRes, matrixRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/conversion-attributes/analysis`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/conversion-attributes/matrix`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setAnalysis(analysisRes.data);
      setMatrix(matrixRes.data);
    } catch (error) {
      console.error('Error loading conversion data');
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

  const topDrivers = analysis?.top_conversion_drivers || [];
  const weaknesses = analysis?.weaknesses || [];
  const recommendations = analysis?.recommendations || [];
  const attributes = analysis?.attributes || [];

  return (
    <div className="space-y-6" data-testid="conversion-attributes-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Atributos de Conversão</h1>
            <p className="text-muted-foreground">Quais atributos mais influenciam a decisão de compra</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <CardContent className="pt-6 text-center">
            <p className="text-4xl font-bold">{analysis?.conversion_rate || 0}%</p>
            <p className="text-sm opacity-80 mt-1">Taxa de Conversão</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{analysis?.total_surveys || 0}</p>
            <p className="text-sm text-muted-foreground">Respostas Analisadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{topDrivers.length}</p>
            <p className="text-sm text-muted-foreground">Drivers de Conversão</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-amber-600">{weaknesses.length}</p>
            <p className="text-sm text-muted-foreground">Pontos a Melhorar</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="drivers">
        <TabsList>
          <TabsTrigger value="drivers">Top Drivers</TabsTrigger>
          <TabsTrigger value="matrix">Matriz IPA</TabsTrigger>
          <TabsTrigger value="all">Todos Atributos</TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4">
          {/* Top Conversion Drivers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Principais Drivers de Conversão
              </CardTitle>
              <CardDescription>Atributos que mais influenciam a decisão de compra</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topDrivers.map((driver, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{driver.attribute.name}</p>
                      <p className="text-sm text-muted-foreground">{CATEGORY_LABELS[driver.attribute.category]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{driver.conversion_impact}</p>
                      <p className="text-xs text-muted-foreground">Impacto na Conversão</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className={`p-4 rounded-lg border ${
                      rec.type === 'critical' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={`h-4 w-4 ${rec.type === 'critical' ? 'text-red-600' : 'text-blue-600'}`} />
                        <span className="font-medium">{rec.attribute}</span>
                      </div>
                      <p className="text-sm">{rec.message}</p>
                      <p className="text-sm font-medium mt-2">{rec.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="matrix" className="space-y-4">
          {/* Importance-Performance Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Matriz Importância x Performance (IPA)</CardTitle>
              <CardDescription>Priorize investimentos com base na importância e performance atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(matrix?.quadrants || {}).map(([quadrant, attrs]) => {
                  const style = QUADRANT_COLORS[quadrant];
                  return (
                    <div key={quadrant} className={`p-4 rounded-lg border ${style.bg} ${style.border}`}>
                      <h4 className={`font-bold ${style.text} mb-3`}>{style.label}</h4>
                      {attrs.length > 0 ? (
                        <div className="space-y-2">
                          {attrs.map((attr, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/50 p-2 rounded">
                              <span className="font-medium">{attr.name}</span>
                              <div className="text-right text-xs">
                                <p>Imp: {attr.importance.toFixed(1)}</p>
                                <p>Perf: {attr.performance.toFixed(1)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm opacity-60">Nenhum atributo</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Priority Actions */}
          {matrix?.priority_actions && (
            <Card>
              <CardHeader>
                <CardTitle>Ações Prioritárias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {matrix.priority_actions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Badge variant={action.priority === 'high' ? 'destructive' : 'secondary'}>
                        {action.priority === 'high' ? 'Alta' : 'Média'}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{action.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {action.attributes.join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {/* All Attributes */}
          <Card>
            <CardHeader>
              <CardTitle>Todos os Atributos</CardTitle>
              <CardDescription>Ordenados por impacto na conversão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attributes.map((attr, idx) => {
                  const quadrantStyle = QUADRANT_COLORS[attr.quadrant] || QUADRANT_COLORS.low_priority;
                  
                  return (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{attr.attribute.name}</span>
                          <Badge variant="outline" className="ml-2">{CATEGORY_LABELS[attr.attribute.category]}</Badge>
                        </div>
                        <Badge className={`${quadrantStyle.bg} ${quadrantStyle.text}`}>
                          {quadrantStyle.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Impacto Conversão</p>
                          <p className="text-xl font-bold">{attr.conversion_impact}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Importância (Convertidos)</p>
                          <p className="text-lg font-semibold">{attr.converted.avg_importance}/5</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Performance (Convertidos)</p>
                          <p className="text-lg font-semibold">{attr.converted.avg_performance}/5</p>
                        </div>
                      </div>
                      
                      <Progress value={attr.conversion_impact} className="h-2 mt-3" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
