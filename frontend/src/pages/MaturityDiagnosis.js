import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  ClipboardCheck, ArrowRight, ArrowLeft, Loader2, 
  Target, Heart, MessageSquare, TrendingUp, Users,
  CheckCircle2, AlertTriangle, BarChart3, Download
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DIMENSIONS = [
  { id: 'clareza', name: 'Clareza Estratégica', icon: Target, color: 'text-blue-500' },
  { id: 'consistencia', name: 'Consistência', icon: Heart, color: 'text-red-500' },
  { id: 'comunicacao', name: 'Comunicação', icon: MessageSquare, color: 'text-green-500' },
  { id: 'diferenciacao', name: 'Diferenciação', icon: TrendingUp, color: 'text-purple-500' },
  { id: 'conexao', name: 'Conexão com Público', icon: Users, color: 'text-orange-500' },
];

const QUESTIONS = [
  // Clareza Estratégica
  { dimension: 'clareza', question: 'Sua marca tem um propósito claramente definido e documentado?', options: ['Não temos', 'Temos mas não está claro', 'Está definido mas pouco usado', 'Está claro e guia decisões', 'É nosso norte estratégico'] },
  { dimension: 'clareza', question: 'Os valores da marca são conhecidos por toda a equipe?', options: ['Não temos valores definidos', 'Poucos conhecem', 'A maioria conhece', 'Todos conhecem', 'Vivemos os valores diariamente'] },
  { dimension: 'clareza', question: 'Existe uma estratégia de posicionamento documentada?', options: ['Não existe', 'Existe informalmente', 'Está documentada mas desatualizada', 'Está documentada e atualizada', 'É revisada periodicamente'] },
  
  // Consistência
  { dimension: 'consistencia', question: 'A identidade visual é aplicada consistentemente em todos os pontos de contato?', options: ['Não há padrão', 'Pouca consistência', 'Consistente na maioria', 'Muito consistente', 'Totalmente padronizado'] },
  { dimension: 'consistencia', question: 'O tom de voz da marca é o mesmo em todos os canais?', options: ['Não há tom definido', 'Varia muito', 'Consistente em alguns canais', 'Consistente na maioria', 'Totalmente consistente'] },
  { dimension: 'consistencia', question: 'As experiências do cliente são consistentes em diferentes touchpoints?', options: ['Muito inconsistentes', 'Pouco consistentes', 'Razoavelmente consistentes', 'Muito consistentes', 'Experiência unificada'] },
  
  // Comunicação
  { dimension: 'comunicacao', question: 'A marca tem uma narrativa clara que conta sua história?', options: ['Não temos narrativa', 'Narrativa confusa', 'Narrativa básica', 'Narrativa clara', 'Narrativa envolvente'] },
  { dimension: 'comunicacao', question: 'Os colaboradores conseguem explicar a marca facilmente?', options: ['Não conseguem', 'Com dificuldade', 'De forma básica', 'Com clareza', 'São embaixadores da marca'] },
  { dimension: 'comunicacao', question: 'A comunicação externa reflete os valores da marca?', options: ['Não reflete', 'Raramente', 'Às vezes', 'Frequentemente', 'Sempre'] },
  
  // Diferenciação
  { dimension: 'diferenciacao', question: 'Sua marca tem um diferencial claro em relação aos concorrentes?', options: ['Não temos diferencial', 'Diferencial fraco', 'Diferencial moderado', 'Diferencial forte', 'Diferencial único'] },
  { dimension: 'diferenciacao', question: 'Os clientes reconhecem o que torna sua marca única?', options: ['Não reconhecem', 'Poucos reconhecem', 'Alguns reconhecem', 'A maioria reconhece', 'Todos reconhecem'] },
  { dimension: 'diferenciacao', question: 'A marca inova e se adapta às mudanças do mercado?', options: ['Não inova', 'Raramente inova', 'Inova ocasionalmente', 'Inova frequentemente', 'Líder em inovação'] },
  
  // Conexão com Público
  { dimension: 'conexao', question: 'A marca conhece profundamente seu público-alvo?', options: ['Não conhecemos', 'Conhecimento superficial', 'Conhecimento razoável', 'Conhecimento profundo', 'Conhecimento excepcional'] },
  { dimension: 'conexao', question: 'Existe engajamento emocional dos clientes com a marca?', options: ['Nenhum engajamento', 'Pouco engajamento', 'Engajamento moderado', 'Alto engajamento', 'Clientes apaixonados'] },
  { dimension: 'conexao', question: 'A marca tem uma comunidade ativa de defensores?', options: ['Não temos', 'Comunidade pequena', 'Comunidade crescendo', 'Comunidade ativa', 'Comunidade muito engajada'] },
];

const MATURITY_LEVELS = [
  { min: 0, max: 20, level: 'Inicial', color: 'bg-red-500', description: 'A marca precisa de estruturação básica' },
  { min: 21, max: 40, level: 'Em Desenvolvimento', color: 'bg-orange-500', description: 'Fundamentos em construção' },
  { min: 41, max: 60, level: 'Definida', color: 'bg-yellow-500', description: 'Marca com bases estabelecidas' },
  { min: 61, max: 80, level: 'Gerenciada', color: 'bg-blue-500', description: 'Gestão de marca estruturada' },
  { min: 81, max: 100, level: 'Otimizada', color: 'bg-green-500', description: 'Marca de alta performance' },
];

export default function MaturityDiagnosis() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState(null);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadPreviousResults();
    }
  }, [currentBrand]);

  const loadPreviousResults = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/maturity-diagnosis`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data;
      // Check if diagnosis was completed (has results or status completed)
      if (data && (data.results || data.status === 'completed')) {
        setResults(data);
        setAnswers(data.answers || {});
        setShowResults(true);
        if (data.recommendations) {
          setRecommendations(data.recommendations);
        }
      }
    } catch (error) {
      console.log('No previous diagnosis');
    } finally {
      setLoading(false);
    }
  };

  const getAIRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/maturity-diagnosis/recommendations`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecommendations(response.data);
      toast.success(`Recomendações geradas! (${response.data.credits_used || 1} crédito usado)`);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Créditos insuficientes. Adquira mais créditos em Configurações > Créditos IA.');
      } else {
        toast.error('Erro ao gerar recomendações');
      }
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAnswer = (questionIndex, value) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: parseInt(value) }));
  };

  const calculateResults = () => {
    const dimensionScores = {};
    
    DIMENSIONS.forEach(dim => {
      const dimQuestions = QUESTIONS.map((q, i) => ({ ...q, index: i })).filter(q => q.dimension === dim.id);
      const dimAnswers = dimQuestions.map(q => answers[q.index] || 0);
      const avgScore = dimAnswers.reduce((a, b) => a + b, 0) / dimAnswers.length;
      dimensionScores[dim.id] = Math.round((avgScore / 4) * 100); // Convert 0-4 to 0-100
    });
    
    const overallScore = Math.round(
      Object.values(dimensionScores).reduce((a, b) => a + b, 0) / DIMENSIONS.length
    );
    
    const maturityLevel = MATURITY_LEVELS.find(l => overallScore >= l.min && overallScore <= l.max);
    
    // Generate priorities
    const sortedDimensions = Object.entries(dimensionScores)
      .sort(([,a], [,b]) => a - b)
      .map(([id, score]) => ({ id, score, ...DIMENSIONS.find(d => d.id === id) }));
    
    return {
      overall_score: overallScore,
      maturity_level: maturityLevel,
      dimension_scores: dimensionScores,
      priorities: sortedDimensions.slice(0, 3),
      strengths: sortedDimensions.slice(-2).reverse()
    };
  };

  const submitDiagnosis = async () => {
    setSaving(true);
    const calculatedResults = calculateResults();
    
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/maturity-diagnosis`,
        { answers, results: calculatedResults },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults({ answers, results: calculatedResults, created_at: new Date().toISOString() });
      setShowResults(true);
      toast.success('Diagnóstico concluído!');
    } catch (error) {
      toast.error('Erro ao salvar diagnóstico');
    } finally {
      setSaving(false);
    }
  };

  const startNewDiagnosis = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setResults(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showResults && results) {
    const r = results.results || results;
    return (
      <div className="space-y-6" data-testid="maturity-results">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Diagnóstico de Maturidade</h1>
              <p className="text-muted-foreground">Resultados para {currentBrand?.name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={startNewDiagnosis}>
            Refazer Diagnóstico
          </Button>
        </div>

        {/* Overall Score */}
        <Card className={`${r.maturity_level?.color?.replace('bg-', 'border-')}/30 border-2`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Score Geral de Maturidade</p>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-5xl font-bold">{r.overall_score}%</span>
                  <div>
                    <Badge className={r.maturity_level?.color}>{r.maturity_level?.level}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">{r.maturity_level?.description}</p>
                  </div>
                </div>
              </div>
              <div className="w-32 h-32 relative">
                <svg className="w-full h-full -rotate-90">
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" className="text-muted/20" />
                  <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="12" fill="none" strokeDasharray={`${(r.overall_score / 100) * 352} 352`} className={r.maturity_level?.color?.replace('bg-', 'text-')} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <ClipboardCheck className={`h-8 w-8 ${r.maturity_level?.color?.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dimension Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Scores por Dimensão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DIMENSIONS.map(dim => {
              const score = r.dimension_scores?.[dim.id] || 0;
              const Icon = dim.icon;
              return (
                <div key={dim.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${dim.color}`} />
                      <span className="font-medium">{dim.name}</span>
                    </div>
                    <span className="font-bold">{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Priorities & Strengths */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Prioridades de Melhoria
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.priorities?.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{i + 1}º</Badge>
                    <span>{p.name}</span>
                  </div>
                  <Badge variant="destructive">{p.score}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Pontos Fortes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.strengths?.map((s, i) => (
                <div key={s.id} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded">
                  <span>{s.name}</span>
                  <Badge className="bg-green-500">{s.score}%</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* AI Recommendations Section */}
        <Card className="border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                <Target className="h-5 w-5" />
                Recomendações com IA
              </CardTitle>
              {!recommendations && (
                <Button 
                  onClick={getAIRecommendations} 
                  disabled={loadingRecommendations}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {loadingRecommendations ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando...</>
                  ) : (
                    <><Target className="h-4 w-4 mr-2" /> Gerar Recomendações (1 crédito)</>
                  )}
                </Button>
              )}
            </div>
            {recommendations && (
              <CardDescription>{recommendations.summary}</CardDescription>
            )}
          </CardHeader>
          {recommendations && (
            <CardContent className="space-y-6">
              {/* Priority Actions */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Ações Prioritárias
                </h4>
                <div className="space-y-2">
                  {recommendations.priority_actions?.map((action, i) => (
                    <div key={i} className="p-3 bg-white dark:bg-background rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{i + 1}</Badge>
                          <span className="font-medium">{action.action}</span>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={action.impact === 'alto' ? 'default' : 'secondary'} className="text-xs">
                            Impacto: {action.impact}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Esforço: {action.effort}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Dimensão: {action.dimension}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Wins */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Quick Wins
                </h4>
                <div className="grid md:grid-cols-3 gap-2">
                  {recommendations.quick_wins?.map((win, i) => (
                    <div key={i} className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200">
                      <span className="text-sm">{win}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Roadmap */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  Roadmap
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                    <Badge className="mb-2">30 dias</Badge>
                    <ul className="text-sm space-y-1">
                      {recommendations.roadmap?.["30_days"]?.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200">
                    <Badge className="mb-2 bg-indigo-500">90 dias</Badge>
                    <ul className="text-sm space-y-1">
                      {recommendations.roadmap?.["90_days"]?.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                    <Badge className="mb-2 bg-purple-500">180 dias</Badge>
                    <ul className="text-sm space-y-1">
                      {recommendations.roadmap?.["180_days"]?.map((item, i) => (
                        <li key={i}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Strengths to Leverage */}
              {recommendations.strengths_to_leverage?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Pontos Fortes para Alavancar
                  </h4>
                  <div className="space-y-2">
                    {recommendations.strengths_to_leverage?.map((strength, i) => (
                      <div key={i} className="p-3 bg-white dark:bg-background rounded-lg border flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Diagnóstico realizado em: {new Date(results.created_at).toLocaleString('pt-BR')}
        </p>
      </div>
    );
  }

  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const dimension = DIMENSIONS.find(d => d.id === question.dimension);

  return (
    <div className="space-y-6" data-testid="maturity-quiz">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
          <ClipboardCheck className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de Maturidade</h1>
          <p className="text-muted-foreground">Avalie sua marca em 5 dimensões</p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Pergunta {currentQuestion + 1} de {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            {dimension && <dimension.icon className={`h-5 w-5 ${dimension.color}`} />}
            <Badge variant="outline">{dimension?.name}</Badge>
          </div>
          <CardTitle className="text-xl">{question.question}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={answers[currentQuestion]?.toString()}
            onValueChange={(value) => handleAnswer(currentQuestion, value)}
            className="space-y-3"
          >
            {question.options.map((option, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value={i.toString()} id={`option-${i}`} />
                <Label htmlFor={`option-${i}`} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestion(prev => prev - 1)}
          disabled={currentQuestion === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        
        {currentQuestion === QUESTIONS.length - 1 ? (
          <Button onClick={submitDiagnosis} disabled={saving || Object.keys(answers).length < QUESTIONS.length}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Concluir Diagnóstico
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestion(prev => prev + 1)}
            disabled={answers[currentQuestion] === undefined}
          >
            Próxima
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
