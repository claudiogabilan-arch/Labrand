import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Waves, Target, TrendingUp, MessageCircle, CheckCircle2,
  AlertTriangle, Info, Loader2, RefreshCw, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WAVE_ICONS = {
  brand: Target,
  business: TrendingUp,
  communication: MessageCircle
};

const INSIGHT_ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info
};

const INSIGHT_COLORS = {
  success: "text-green-600 bg-green-50 border-green-200",
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  info: "text-blue-600 bg-blue-50 border-blue-200"
};

export default function ValueWaves() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [framework, setFramework] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [activeWave, setActiveWave] = useState('brand');
  const [mode, setMode] = useState('view'); // view or assess

  useEffect(() => {
    loadFramework();
  }, []);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadFramework = async () => {
    try {
      const res = await axios.get(`${API}/value-waves/framework`);
      setFramework(res.data.framework);
    } catch (error) {
      console.error('Error loading framework');
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [assessmentRes, recsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/value-waves`,
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/value-waves/recommendations`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      
      setAssessment(assessmentRes.data.assessment);
      setRecommendations(recsRes.data.recommendations || []);
      
      // Initialize answers from existing assessment
      if (assessmentRes.data.assessment?.answers) {
        const existingAnswers = {};
        assessmentRes.data.assessment.answers.forEach(a => {
          const key = `${a.wave_id}_${a.dimension_id}_${a.question_id}`;
          existingAnswers[key] = a.answer;
        });
        setAnswers(existingAnswers);
      }
    } catch (error) {
      console.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (waveId, dimId, qId, value) => {
    const key = `${waveId}_${dimId}_${qId}`;
    setAnswers(prev => ({ ...prev, [key]: parseInt(value) }));
  };

  const handleSaveAssessment = async () => {
    setSaving(true);
    try {
      // Convert answers to array format
      const answersArray = Object.entries(answers).map(([key, value]) => {
        const [wave_id, dimension_id, question_id] = key.split('_');
        return { wave_id, dimension_id, question_id, answer: value };
      });
      
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/value-waves/assess`,
        { answers: answersArray },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Avaliação salva com sucesso!');
      setMode('view');
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar avaliação');
    } finally {
      setSaving(false);
    }
  };

  const getAnsweredCount = (waveId) => {
    if (!framework) return { answered: 0, total: 0 };
    const wave = framework[waveId];
    let total = 0;
    let answered = 0;
    
    wave.dimensions.forEach(dim => {
      dim.questions.forEach(q => {
        total++;
        const key = `${waveId}_${dim.id}_${q.id}`;
        if (answers[key] !== undefined) answered++;
      });
    });
    
    return { answered, total };
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
    <div className="space-y-6" data-testid="value-waves-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Waves className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Ondas de Valor</h1>
            <p className="text-muted-foreground">Gestão de valor: Marca, Negócio e Comunicação</p>
          </div>
        </div>
        {mode === 'view' ? (
          <Button onClick={() => setMode('assess')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {assessment ? 'Reavaliar' : 'Iniciar Avaliação'}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode('view')}>Cancelar</Button>
            <Button onClick={handleSaveAssessment} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Avaliação
            </Button>
          </div>
        )}
      </div>

      {mode === 'view' && assessment ? (
        <>
          {/* Overall Score */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="md:col-span-1 bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6 text-center">
                <p className="text-5xl font-bold">{assessment.overall_score}</p>
                <p className="text-lg font-medium mt-1">{assessment.level}</p>
                <p className="text-sm text-muted-foreground mt-2">{assessment.level_description}</p>
              </CardContent>
            </Card>

            {/* Wave Scores */}
            {Object.entries(framework || {}).map(([waveId, wave]) => {
              const waveScore = assessment.wave_scores?.[waveId];
              const Icon = WAVE_ICONS[waveId];
              
              return (
                <Card key={waveId}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: wave.color + '20' }}
                      >
                        <Icon className="h-4 w-4" style={{ color: wave.color }} />
                      </div>
                      <span className="font-medium">{wave.name}</span>
                    </div>
                    <p className="text-3xl font-bold">{waveScore?.percentage || 0}%</p>
                    <Progress 
                      value={waveScore?.percentage || 0} 
                      className="h-2 mt-2"
                      style={{ '--progress-color': wave.color }}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Insights */}
          {assessment.insights?.length > 0 && (
            <div className="space-y-2">
              {assessment.insights.map((insight, idx) => {
                const Icon = INSIGHT_ICONS[insight.type] || Info;
                return (
                  <Card key={idx} className={`border ${INSIGHT_COLORS[insight.type]}`}>
                    <CardContent className="py-3 flex items-start gap-3">
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm opacity-80">{insight.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendações de Melhoria</CardTitle>
                <CardDescription>Ações priorizadas para aumentar seu score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                        {rec.priority === 'high' ? 'Alta' : 'Média'}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium">{rec.wave} - {rec.dimension}</p>
                        <p className="text-sm text-muted-foreground">{rec.action}</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{rec.score}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detailed Scores */}
          <Tabs defaultValue="brand">
            <TabsList>
              {Object.entries(framework || {}).map(([waveId, wave]) => (
                <TabsTrigger key={waveId} value={waveId} style={{ color: wave.color }}>
                  {wave.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(framework || {}).map(([waveId, wave]) => {
              const waveScore = assessment.wave_scores?.[waveId];
              
              return (
                <TabsContent key={waveId} value={waveId}>
                  <Card>
                    <CardHeader>
                      <CardTitle style={{ color: wave.color }}>{wave.name}</CardTitle>
                      <CardDescription>{wave.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-3 gap-4">
                        {wave.dimensions.map(dim => {
                          const dimScore = waveScore?.dimensions?.[dim.id];
                          return (
                            <div key={dim.id} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">{dim.name}</span>
                                <span className="text-2xl font-bold">{dimScore?.percentage || 0}%</span>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{dim.description}</p>
                              <Progress value={dimScore?.percentage || 0} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      ) : mode === 'view' ? (
        /* No Assessment Yet */
        <Card>
          <CardContent className="py-16 text-center">
            <Waves className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-bold mb-2">Avalie sua Gestão de Valor</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Responda às perguntas sobre as três ondas de valor (Marca, Negócio e Comunicação) 
              para obter uma análise completa e recomendações personalizadas.
            </p>
            <Button onClick={() => setMode('assess')}>
              Iniciar Avaliação <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Assessment Mode */
        <Tabs value={activeWave} onValueChange={setActiveWave}>
          <TabsList className="mb-4">
            {Object.entries(framework || {}).map(([waveId, wave]) => {
              const counts = getAnsweredCount(waveId);
              return (
                <TabsTrigger key={waveId} value={waveId} className="flex items-center gap-2">
                  <span style={{ color: wave.color }}>{wave.name}</span>
                  <Badge variant={counts.answered === counts.total ? "default" : "secondary"}>
                    {counts.answered}/{counts.total}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(framework || {}).map(([waveId, wave]) => (
            <TabsContent key={waveId} value={waveId} className="space-y-4">
              {wave.dimensions.map(dim => (
                <Card key={dim.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{dim.name}</CardTitle>
                    <CardDescription>{dim.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {dim.questions.map(q => {
                      const key = `${waveId}_${dim.id}_${q.id}`;
                      return (
                        <div key={q.id} className="space-y-3">
                          <Label className="text-base">{q.text}</Label>
                          <RadioGroup
                            value={answers[key]?.toString()}
                            onValueChange={(v) => handleAnswerChange(waveId, dim.id, q.id, v)}
                            className="grid grid-cols-2 md:grid-cols-4 gap-2"
                          >
                            {q.options.map((opt, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <RadioGroupItem value={idx.toString()} id={`${key}_${idx}`} />
                                <Label htmlFor={`${key}_${idx}`} className="text-sm cursor-pointer">
                                  {opt}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  disabled={activeWave === 'brand'}
                  onClick={() => {
                    const waves = Object.keys(framework);
                    const idx = waves.indexOf(activeWave);
                    if (idx > 0) setActiveWave(waves[idx - 1]);
                  }}
                >
                  Anterior
                </Button>
                {activeWave === 'communication' ? (
                  <Button onClick={handleSaveAssessment} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Finalizar Avaliação
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      const waves = Object.keys(framework);
                      const idx = waves.indexOf(activeWave);
                      if (idx < waves.length - 1) setActiveWave(waves[idx + 1]);
                    }}
                  >
                    Próxima Onda <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
