import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Filter, Eye, Search, Heart, ShoppingCart, Award, Megaphone,
  Loader2, RefreshCw, ArrowRight, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Target, ChevronDown
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STAGE_ICONS = {
  awareness: Eye,
  consideration: Search,
  preference: Heart,
  purchase: ShoppingCart,
  loyalty: Award,
  advocacy: Megaphone
};

const STAGE_COLORS = [
  '#94A3B8', // awareness - slate
  '#60A5FA', // consideration - blue
  '#A78BFA', // preference - purple
  '#34D399', // purchase - green
  '#FBBF24', // loyalty - amber
  '#F472B6'  // advocacy - pink
];

export default function BrandFunnel() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stages, setStages] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editValues, setEditValues] = useState({});

  useEffect(() => {
    loadStages();
  }, []);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadStages = async () => {
    try {
      const res = await axios.get(`${API}/brand-funnel/stages`);
      setStages(res.data.stages || []);
    } catch (error) {
      console.error('Error loading stages');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [funnelRes, analysisRes, benchmarkRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/brand-funnel`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/brand-funnel/analysis`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/brand-funnel/benchmark`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setFunnel(funnelRes.data.funnel);
      setAnalysis(analysisRes.data);
      setBenchmark(benchmarkRes.data);
      
      // Initialize edit values
      if (funnelRes.data.funnel?.stages) {
        const values = {};
        Object.entries(funnelRes.data.funnel.stages).forEach(([key, val]) => {
          values[key] = val.value || 0;
        });
        setEditValues(values);
      }
    } catch (error) {
      console.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFunnel = async () => {
    setSaving(true);
    try {
      const stagesData = stages.map(stage => ({
        stage_id: stage.id,
        value: parseInt(editValues[stage.id]) || 0,
        previous_value: funnel?.stages?.[stage.id]?.value || null
      }));
      
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/brand-funnel`,
        { stages: stagesData, period: 'monthly' },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Funil atualizado!');
      setEditMode(false);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar funil');
    } finally {
      setSaving(false);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('pt-BR');
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

  return (
    <div className="space-y-6" data-testid="brand-funnel-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Filter className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Funil de Conversão de Marca</h1>
            <p className="text-muted-foreground">Jornada de preferência do público</p>
          </div>
        </div>
        {editMode ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
            <Button onClick={handleSaveFunnel} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditMode(true)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Dados
          </Button>
        )}
      </div>

      {/* Estimated Data Warning */}
      {funnel?.is_estimated && (
        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Dados Estimados:</strong> Os valores atuais são baseados em estimativas. 
              Atualize com dados reais para análises mais precisas.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State - No funnel data */}
      {(!funnel?.stages || Object.keys(funnel.stages).length === 0) && !editMode && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Nenhum dado de funil configurado</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              {funnel?.message || "Insira os dados reais do seu funil de marca para visualizar a jornada de preferência do público. Clique em 'Atualizar Dados' para começar."}
            </p>
            <Button onClick={() => setEditMode(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Inserir Dados do Funil
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Health Score - only show when there's data */}
      {funnel?.stages && Object.keys(funnel.stages).length > 0 && (
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-4xl font-bold">{funnel?.health_score || analysis?.health_score || 0}</p>
            <p className="text-sm text-muted-foreground">Saúde do Funil</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Awareness → Compra</p>
            <p className="text-3xl font-bold">
              {funnel?.stages?.awareness?.value && funnel?.stages?.purchase?.value
                ? ((funnel.stages.purchase.value / funnel.stages.awareness.value) * 100).toFixed(2)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Conversão Total</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Compra → Lealdade</p>
            <p className="text-3xl font-bold">
              {funnel?.conversion_rates?.purchase_to_loyalty || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Retenção</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">Lealdade → Advocacia</p>
            <p className="text-3xl font-bold">
              {funnel?.conversion_rates?.loyalty_to_advocacy || 0}%
            </p>
            <p className="text-xs text-muted-foreground">Taxa de Indicação</p>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Funil de Marca</CardTitle>
          <CardDescription>Visualização da jornada de preferência</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage, idx) => {
              const Icon = STAGE_ICONS[stage.id];
              const stageData = funnel?.stages?.[stage.id];
              const value = editMode ? editValues[stage.id] : (stageData?.value || 0);
              const maxValue = editMode 
                ? Math.max(...Object.values(editValues).map(v => parseInt(v) || 0), 100)
                : Math.max(...Object.values(funnel?.stages || {}).map(s => s.value || 0), 100);
              const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
              const nextStage = stages[idx + 1];
              const conversionRate = nextStage && funnel?.conversion_rates
                ? funnel.conversion_rates[`${stage.id}_to_${nextStage.id}`]
                : null;
              
              return (
                <div key={stage.id} className="relative">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: STAGE_COLORS[idx] + '20' }}
                    >
                      <Icon className="h-5 w-5" style={{ color: STAGE_COLORS[idx] }} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{stage.name}</span>
                        {editMode ? (
                          <Input
                            type="number"
                            className="w-32 h-8 text-right"
                            value={editValues[stage.id] || ''}
                            onChange={(e) => setEditValues({...editValues, [stage.id]: e.target.value})}
                          />
                        ) : (
                          <span className="font-bold">{formatNumber(value)}</span>
                        )}
                      </div>
                      <div className="h-8 bg-muted rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{ 
                            width: `${Math.max(width, 2)}%`,
                            backgroundColor: STAGE_COLORS[idx]
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{stage.description}</p>
                    </div>
                  </div>
                  
                  {/* Conversion Rate Arrow */}
                  {conversionRate !== null && idx < stages.length - 1 && (
                    <div className="flex items-center justify-center my-2 ml-14">
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline" className="ml-2">
                        {conversionRate}% conversão
                      </Badge>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="analysis">
        <TabsList>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
          <TabsTrigger value="benchmark">Benchmark</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          {/* Bottlenecks */}
          {analysis?.bottlenecks?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Gargalos Identificados
                </CardTitle>
                <CardDescription>Pontos de conversão abaixo do benchmark</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.bottlenecks.map((bottleneck, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={bottleneck.priority === 'high' ? 'destructive' : 'secondary'}>
                          {bottleneck.priority === 'high' ? 'Alta' : 'Média'}
                        </Badge>
                        <div>
                          <p className="font-medium">{bottleneck.from_stage} → {bottleneck.to_stage}</p>
                          <p className="text-sm text-muted-foreground">
                            Gap de {bottleneck.gap.toFixed(1)}% vs benchmark
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">{bottleneck.current_rate}%</p>
                        <p className="text-xs text-muted-foreground">Benchmark: {bottleneck.benchmark}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {analysis?.opportunities?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Oportunidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.opportunities.map((opp, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{opp.type}</Badge>
                        <span className="font-medium">{opp.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{opp.description}</p>
                      <p className="text-sm font-medium text-primary">{opp.action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benchmark" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparação com Benchmark do Setor</CardTitle>
              <CardDescription>
                Setor: {benchmark?.sector || 'Geral'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {benchmark?.comparison && Object.keys(benchmark.comparison).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(benchmark.comparison).map(([key, data]) => {
                    const [from, , to] = key.split('_');
                    const fromStage = stages.find(s => s.id === from);
                    const toStage = stages.find(s => s.id === to);
                    
                    return (
                      <div key={key} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium">
                            {fromStage?.name} → {toStage?.name}
                          </span>
                          <Badge variant={data.status === 'above' ? 'default' : 'destructive'}>
                            {data.status === 'above' ? 'Acima' : 'Abaixo'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <p className="text-2xl font-bold">{data.brand}%</p>
                            <p className="text-xs text-muted-foreground">Sua marca</p>
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-muted-foreground">{data.benchmark}%</p>
                            <p className="text-xs text-muted-foreground">Benchmark</p>
                          </div>
                          <div>
                            <p className={`text-2xl font-bold ${data.difference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {data.difference >= 0 ? '+' : ''}{data.difference}%
                            </p>
                            <p className="text-xs text-muted-foreground">Diferença</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Atualize os dados do funil para ver a comparação com benchmark</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
