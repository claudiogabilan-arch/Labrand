import { useState, useEffect, useCallback, useRef } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  PieChart,
  Target,
  Sparkles,
  Save,
  Loader2,
  Info,
  Calculator,
  Building2,
  Users,
  Award,
  Zap,
  Shield,
  Heart,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

// Brand Strength Factors based on Interbrand methodology
const brandStrengthFactors = [
  { id: 'clarity', name: 'Clareza', description: 'Valores, posicionamento e proposta de valor claramente articulados', icon: Target, weight: 10 },
  { id: 'commitment', name: 'Comprometimento', description: 'Compromisso interno com a marca e investimento em branding', icon: Heart, weight: 10 },
  { id: 'governance', name: 'Governança', description: 'Definições claras de responsabilidades e processos de gestão', icon: Shield, weight: 10 },
  { id: 'responsiveness', name: 'Responsividade', description: 'Capacidade de responder a mudanças e oportunidades de mercado', icon: Zap, weight: 10 },
  { id: 'authenticity', name: 'Autenticidade', description: 'Marca baseada em verdades internas e capacidades reais', icon: Award, weight: 10 },
  { id: 'relevance', name: 'Relevância', description: 'Adequação às necessidades e desejos dos públicos', icon: Users, weight: 10 },
  { id: 'differentiation', name: 'Diferenciação', description: 'Percepção de posicionamento único no mercado', icon: Target, weight: 10 },
  { id: 'consistency', name: 'Consistência', description: 'Experiência de marca uniforme em todos os pontos de contato', icon: Building2, weight: 10 },
  { id: 'presence', name: 'Presença', description: 'Grau em que a marca é percebida de forma positiva', icon: Globe, weight: 10 },
  { id: 'engagement', name: 'Engajamento', description: 'Nível de envolvimento e advocacia dos clientes', icon: Heart, weight: 10 }
];

// P/E Ratio Categories based on Interbrand framework
const peCategories = [
  { id: 'consistent_over', name: 'Overperformer Consistente', color: 'bg-emerald-500', description: 'P/E acima da média com baixa volatilidade' },
  { id: 'consistent_under', name: 'Underperformer Consistente', color: 'bg-rose-500', description: 'P/E abaixo da média com baixa volatilidade' },
  { id: 'inconsistent_over', name: 'Overperformer Inconsistente', color: 'bg-amber-500', description: 'P/E acima da média com alta volatilidade' },
  { id: 'inconsistent_under', name: 'Underperformer Inconsistente', color: 'bg-gray-500', description: 'P/E abaixo da média com alta volatilidade' }
];

export const Valuation = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight, metrics } = useBrand();
  const [data, setData] = useState({
    // Financial Analysis
    receita_anual: '',
    lucro_operacional: '',
    margem_operacional: '',
    custo_capital: '',
    lucro_economico: '',
    
    // Role of Brand Index
    role_of_brand: 50,
    rbi_justificativa: '',
    
    // Brand Strength Scores (0-100 for each factor)
    brand_strength: {
      clarity: 50,
      commitment: 50,
      governance: 50,
      responsiveness: 50,
      authenticity: 50,
      relevance: 50,
      differentiation: 50,
      consistency: 50,
      presence: 50,
      engagement: 50
    },
    
    // Valuation Results
    brand_value: null,
    pe_category: '',
    pe_ratio: '',
    pe_volatility: '',
    sector_pe_average: '',
    
    // Analysis
    strengths: [],
    weaknesses: [],
    opportunities: [],
    recommendations: []
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadData();
    }
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'valuation');
      if (pillarData && Object.keys(pillarData).length > 0) {
        setData(prev => ({ 
          ...prev, 
          ...pillarData,
          brand_strength: pillarData.brand_strength || prev.brand_strength
        }));
      }
    } catch (error) {
      console.error('Error loading valuation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSave = useCallback(async (newData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updatePillar(currentBrand.brand_id, 'valuation', newData);
      } catch (error) {
        console.error('Autosave error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [currentBrand?.brand_id, updatePillar]);

  const handleFieldChange = (field, value) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    autoSave(newData);
  };

  const handleStrengthChange = (factor, value) => {
    const newStrength = { ...data.brand_strength, [factor]: value[0] };
    const newData = { ...data, brand_strength: newStrength };
    setData(newData);
    autoSave(newData);
  };

  const calculateBrandStrength = () => {
    const scores = Object.values(data.brand_strength);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const calculateBrandValue = async () => {
    setIsCalculating(true);
    try {
      // Interbrand Formula: Brand Value = Economic Profit × Role of Brand × Brand Strength Multiplier
      const receita = parseFloat(data.receita_anual) || 0;
      const lucroOp = parseFloat(data.lucro_operacional) || 0;
      const custoCapital = parseFloat(data.custo_capital) || 10;
      
      // Economic Profit = Operating Profit - (Revenue × Cost of Capital)
      const lucroEconomico = lucroOp - (receita * (custoCapital / 100));
      
      // Role of Brand as percentage
      const roleOfBrand = data.role_of_brand / 100;
      
      // Brand Strength Score (0-100) → Multiplier (1-10)
      const brandStrengthScore = calculateBrandStrength();
      const brandMultiplier = 1 + (brandStrengthScore / 100) * 9; // Maps 0-100 to 1-10
      
      // Brand Value Calculation
      const brandValue = Math.max(0, lucroEconomico * roleOfBrand * brandMultiplier);
      
      // Determine P/E Category based on brand strength and other factors
      let peCategory = '';
      const avgPE = parseFloat(data.sector_pe_average) || 15;
      const currentPE = parseFloat(data.pe_ratio) || avgPE;
      const volatility = parseFloat(data.pe_volatility) || 20;
      
      if (currentPE >= avgPE && volatility <= 25) {
        peCategory = 'consistent_over';
      } else if (currentPE < avgPE && volatility <= 25) {
        peCategory = 'consistent_under';
      } else if (currentPE >= avgPE && volatility > 25) {
        peCategory = 'inconsistent_over';
      } else {
        peCategory = 'inconsistent_under';
      }
      
      const newData = {
        ...data,
        lucro_economico: lucroEconomico.toFixed(2),
        brand_value: brandValue.toFixed(2),
        pe_category: peCategory
      };
      
      setData(newData);
      await updatePillar(currentBrand.brand_id, 'valuation', newData);
      toast.success('Valuation calculado com sucesso!');
    } catch (error) {
      toast.error('Erro ao calcular valuation');
    } finally {
      setIsCalculating(false);
    }
  };

  const generateRecommendations = async () => {
    setIsGenerating(true);
    try {
      const brandStrengthScore = calculateBrandStrength();
      const weakFactors = Object.entries(data.brand_strength)
        .filter(([_, score]) => score < 50)
        .map(([factor, score]) => {
          const factorInfo = brandStrengthFactors.find(f => f.id === factor);
          return `${factorInfo?.name}: ${score}/100`;
        });
      
      const strongFactors = Object.entries(data.brand_strength)
        .filter(([_, score]) => score >= 70)
        .map(([factor, score]) => {
          const factorInfo = brandStrengthFactors.find(f => f.id === factor);
          return `${factorInfo?.name}: ${score}/100`;
        });
      
      const context = `
        Marca: ${currentBrand.name}
        Valor da Marca Estimado: R$ ${data.brand_value || 'Não calculado'}
        Role of Brand Index: ${data.role_of_brand}%
        Brand Strength Score: ${brandStrengthScore}/100
        Categoria P/E: ${peCategories.find(c => c.id === data.pe_category)?.name || 'Não definida'}
        
        Fatores Fortes: ${strongFactors.join(', ') || 'Nenhum acima de 70'}
        Fatores Fracos: ${weakFactors.join(', ') || 'Nenhum abaixo de 50'}
        
        Receita Anual: R$ ${data.receita_anual}
        Lucro Operacional: R$ ${data.lucro_operacional}
      `;
      
      const result = await generateInsight(context, 'valuation', currentBrand.name);
      
      const newData = {
        ...data,
        recommendations: [...(data.recommendations || []), result.insight]
      };
      setData(newData);
      autoSave(newData);
      toast.success('Recomendações geradas!');
    } catch (error) {
      toast.error('Erro ao gerar recomendações');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'valuation', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0';
    const num = parseFloat(value);
    if (num >= 1000000000) return `R$ ${(num / 1000000000).toFixed(2)}B`;
    if (num >= 1000000) return `R$ ${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `R$ ${(num / 1000).toFixed(2)}K`;
    return `R$ ${num.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para continuar</p>
      </div>
    );
  }

  const brandStrengthScore = calculateBrandStrength();
  const currentPECategory = peCategories.find(c => c.id === data.pe_category);

  return (
    <div className="space-y-6" data-testid="valuation-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Brand Valuation</h1>
            <p className="text-muted-foreground">Avaliação do valor da marca baseado na metodologia Interbrand</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando...
            </Badge>
          )}
          <Button onClick={handleSave} disabled={isSaving} data-testid="save-btn">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Value Summary Card */}
      {data.brand_value && (
        <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-white">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor Estimado da Marca</p>
                <p className="text-4xl font-bold text-emerald-600">{formatCurrency(data.brand_value)}</p>
                {currentPECategory && (
                  <Badge className={`mt-2 ${currentPECategory.color} text-white`}>
                    {currentPECategory.name}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{brandStrengthScore}</p>
                  <p className="text-xs text-muted-foreground">Brand Strength</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.role_of_brand}%</p>
                  <p className="text-xs text-muted-foreground">Role of Brand</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{formatCurrency(data.lucro_economico)}</p>
                  <p className="text-xs text-muted-foreground">Lucro Econômico</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial">Análise Financeira</TabsTrigger>
          <TabsTrigger value="role">Role of Brand</TabsTrigger>
          <TabsTrigger value="strength">Brand Strength</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Financial Analysis Tab */}
        <TabsContent value="financial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Dados Financeiros
              </CardTitle>
              <CardDescription>
                Insira os dados financeiros para calcular o lucro econômico da marca
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Receita Anual (R$)</Label>
                  <Input
                    type="number"
                    value={data.receita_anual}
                    onChange={(e) => handleFieldChange('receita_anual', e.target.value)}
                    placeholder="Ex: 10000000"
                    data-testid="receita-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lucro Operacional (R$)</Label>
                  <Input
                    type="number"
                    value={data.lucro_operacional}
                    onChange={(e) => handleFieldChange('lucro_operacional', e.target.value)}
                    placeholder="Ex: 2000000"
                    data-testid="lucro-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Margem Operacional (%)</Label>
                  <Input
                    type="number"
                    value={data.margem_operacional}
                    onChange={(e) => handleFieldChange('margem_operacional', e.target.value)}
                    placeholder="Ex: 20"
                    data-testid="margem-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custo de Capital (%)</Label>
                  <Input
                    type="number"
                    value={data.custo_capital}
                    onChange={(e) => handleFieldChange('custo_capital', e.target.value)}
                    placeholder="Ex: 10"
                    data-testid="custo-capital-input"
                  />
                </div>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">Lucro Econômico</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Lucro Econômico = Lucro Operacional - (Receita × Custo de Capital)
                    </p>
                    {data.lucro_economico && (
                      <p className="text-lg font-bold text-blue-900 mt-2">
                        {formatCurrency(data.lucro_economico)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5 text-purple-500" />
                Métricas de Mercado
              </CardTitle>
              <CardDescription>
                Compare com o setor para determinar a categoria P/E
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>P/E Ratio Atual</Label>
                  <Input
                    type="number"
                    value={data.pe_ratio}
                    onChange={(e) => handleFieldChange('pe_ratio', e.target.value)}
                    placeholder="Ex: 18.5"
                    data-testid="pe-ratio-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Média P/E do Setor</Label>
                  <Input
                    type="number"
                    value={data.sector_pe_average}
                    onChange={(e) => handleFieldChange('sector_pe_average', e.target.value)}
                    placeholder="Ex: 15"
                    data-testid="sector-pe-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Volatilidade P/E (%)</Label>
                  <Input
                    type="number"
                    value={data.pe_volatility}
                    onChange={(e) => handleFieldChange('pe_volatility', e.target.value)}
                    placeholder="Ex: 20"
                    data-testid="pe-volatility-input"
                  />
                </div>
              </div>

              {/* P/E Categories Visual */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {peCategories.map(category => (
                  <div
                    key={category.id}
                    className={`p-4 rounded-lg border-2 ${
                      data.pe_category === category.id
                        ? `${category.color} text-white border-transparent`
                        : 'bg-muted/30 border-transparent'
                    }`}
                  >
                    <p className="font-medium text-sm">{category.name}</p>
                    <p className={`text-xs mt-1 ${data.pe_category === category.id ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {category.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role of Brand Tab */}
        <TabsContent value="role" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                Role of Brand Index (RBI)
              </CardTitle>
              <CardDescription>
                Qual é a porcentagem da decisão de compra atribuível à marca?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Role of Brand</Label>
                  <span className="text-2xl font-bold text-amber-600">{data.role_of_brand}%</span>
                </div>
                <Slider
                  value={[data.role_of_brand]}
                  onValueChange={(value) => handleFieldChange('role_of_brand', value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                  data-testid="rbi-slider"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0% - Commoditizado</span>
                  <span>50% - Moderado</span>
                  <span>100% - Brand-driven</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Justificativa do RBI</Label>
                <Textarea
                  value={data.rbi_justificativa}
                  onChange={(e) => handleFieldChange('rbi_justificativa', e.target.value)}
                  placeholder="Explique por que este percentual representa a influência da marca na decisão de compra..."
                  rows={4}
                  data-testid="rbi-justificativa-input"
                />
              </div>

              <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                <h4 className="font-medium text-amber-900 mb-2">Referências de RBI por Setor</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="font-medium">Luxo</p>
                    <p className="text-amber-700">70-90%</p>
                  </div>
                  <div>
                    <p className="font-medium">Tecnologia</p>
                    <p className="text-amber-700">40-60%</p>
                  </div>
                  <div>
                    <p className="font-medium">FMCG</p>
                    <p className="text-amber-700">30-50%</p>
                  </div>
                  <div>
                    <p className="font-medium">B2B</p>
                    <p className="text-amber-700">20-40%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Strength Tab */}
        <TabsContent value="strength" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-500" />
                    Brand Strength Score
                  </CardTitle>
                  <CardDescription>
                    Avalie a força da marca nos 10 fatores Interbrand
                  </CardDescription>
                </div>
                <div className="text-center">
                  <p className="text-4xl font-bold text-purple-600">{brandStrengthScore}</p>
                  <p className="text-xs text-muted-foreground">/ 100</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {brandStrengthFactors.map(factor => {
                  const Icon = factor.icon;
                  const score = data.brand_strength[factor.id];
                  return (
                    <div key={factor.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <Label className="font-medium">{factor.name}</Label>
                        </div>
                        <span className={`font-bold ${
                          score >= 70 ? 'text-emerald-600' : 
                          score >= 50 ? 'text-amber-600' : 'text-rose-600'
                        }`}>
                          {score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{factor.description}</p>
                      <Slider
                        value={[score]}
                        onValueChange={(value) => handleStrengthChange(factor.id, value)}
                        max={100}
                        step={5}
                        className="w-full"
                        data-testid={`strength-${factor.id}-slider`}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Visual Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Radar de Brand Strength</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4">
                {brandStrengthFactors.map(factor => {
                  const score = data.brand_strength[factor.id];
                  return (
                    <div key={factor.id} className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-2">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            className="text-muted"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${score * 1.76} 176`}
                            className={
                              score >= 70 ? 'text-emerald-500' : 
                              score >= 50 ? 'text-amber-500' : 'text-rose-500'
                            }
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {score}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{factor.name}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-emerald-500" />
                    Calcular Valuation
                  </CardTitle>
                  <CardDescription>
                    Gere o valor estimado da marca com base nos dados inseridos
                  </CardDescription>
                </div>
                <Button 
                  onClick={calculateBrandValue} 
                  disabled={isCalculating}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="calculate-btn"
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-2" />
                  )}
                  Calcular Valor da Marca
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted/30 border">
                <h4 className="font-medium mb-2">Fórmula de Valuation</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>Valor da Marca</strong> = Lucro Econômico × Role of Brand × Brand Strength Multiplier
                </p>
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Lucro Econômico</p>
                    <p className="font-bold">{formatCurrency(data.lucro_economico)}</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Role of Brand</p>
                    <p className="font-bold">{data.role_of_brand}%</p>
                  </div>
                  <div className="p-3 bg-background rounded-lg">
                    <p className="text-xs text-muted-foreground">Brand Strength</p>
                    <p className="font-bold">{brandStrengthScore}/100</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Recomendações Estratégicas
                  </CardTitle>
                  <CardDescription>
                    Gere insights para aumentar o valor da marca
                  </CardDescription>
                </div>
                <Button 
                  onClick={generateRecommendations} 
                  disabled={isGenerating}
                  variant="outline"
                  data-testid="generate-recommendations-btn"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.recommendations?.length > 0 ? (
                <div className="space-y-3">
                  {data.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                      <p className="text-sm whitespace-pre-wrap">{rec}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Clique em "Gerar com IA" para receber recomendações personalizadas
                </p>
              )}
            </CardContent>
          </Card>

          {/* 4 Steps to Improvement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4 Passos para Aumentar o Valor da Marca</CardTitle>
              <CardDescription>Baseado na metodologia Interbrand</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { num: 1, title: 'Desenvolver Modelo de Valuation', desc: 'Entenda como Brand Strength, Role of Brand e Performance Financeira trabalham juntos' },
                  { num: 2, title: 'Pesquisar Comunidade Financeira', desc: 'Entenda como investidores e analistas percebem a marca' },
                  { num: 3, title: 'Analisar Efetividade da Comunicação', desc: 'Revise planos de RI e RP para identificar melhorias' },
                  { num: 4, title: 'Revisar Estratégia de Marca', desc: 'Alinhe propósito, ambição e movimentos icônicos' }
                ].map(step => (
                  <div key={step.num} className="flex gap-4 p-4 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-foreground font-bold">{step.num}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Valuation;
