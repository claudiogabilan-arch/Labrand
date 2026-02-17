import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import { 
  Users, Plus, X, Loader2, Save, Trash2, Eye, Target, 
  TrendingUp, DollarSign, Star, BarChart3, ArrowRight
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ATTRIBUTES = [
  { id: 'preco', label: 'Preço', icon: DollarSign },
  { id: 'qualidade', label: 'Qualidade', icon: Star },
  { id: 'inovacao', label: 'Inovação', icon: TrendingUp },
  { id: 'atendimento', label: 'Atendimento', icon: Users },
  { id: 'presenca_digital', label: 'Presença Digital', icon: Eye },
  { id: 'reconhecimento', label: 'Reconhecimento', icon: Target },
];

export default function CompetitorAnalysis() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [competitors, setCompetitors] = useState([]);
  const [myBrandScores, setMyBrandScores] = useState({});
  const [newCompetitor, setNewCompetitor] = useState({ name: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadData();
    }
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/competitors`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompetitors(response.data.competitors || []);
      setMyBrandScores(response.data.my_brand_scores || {});
    } catch (error) {
      console.log('No competitor data');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/brands/${currentBrand.brand_id}/competitors`,
        { competitors, my_brand_scores: myBrandScores },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Dados salvos!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const addCompetitor = () => {
    if (!newCompetitor.name.trim()) {
      toast.error('Digite o nome do concorrente');
      return;
    }
    if (competitors.length >= 5) {
      toast.error('Máximo de 5 concorrentes');
      return;
    }
    
    const competitor = {
      id: `comp_${Date.now()}`,
      name: newCompetitor.name.trim(),
      description: newCompetitor.description.trim(),
      scores: {}
    };
    
    setCompetitors([...competitors, competitor]);
    setNewCompetitor({ name: '', description: '' });
    setShowAddForm(false);
    toast.success('Concorrente adicionado');
  };

  const removeCompetitor = (id) => {
    setCompetitors(competitors.filter(c => c.id !== id));
    toast.success('Concorrente removido');
  };

  const updateCompetitorScore = (competitorId, attributeId, value) => {
    setCompetitors(competitors.map(c => {
      if (c.id === competitorId) {
        return { ...c, scores: { ...c.scores, [attributeId]: value[0] } };
      }
      return c;
    }));
  };

  const updateMyBrandScore = (attributeId, value) => {
    setMyBrandScores({ ...myBrandScores, [attributeId]: value[0] });
  };

  const getAverageScore = (scores) => {
    const values = Object.values(scores || {});
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const getCompetitiveAdvantages = () => {
    const advantages = [];
    const disadvantages = [];
    
    ATTRIBUTES.forEach(attr => {
      const myScore = myBrandScores[attr.id] || 0;
      const avgCompetitor = competitors.length > 0
        ? competitors.reduce((sum, c) => sum + (c.scores?.[attr.id] || 0), 0) / competitors.length
        : 0;
      
      if (myScore > avgCompetitor + 10) {
        advantages.push({ attribute: attr.label, diff: Math.round(myScore - avgCompetitor) });
      } else if (myScore < avgCompetitor - 10) {
        disadvantages.push({ attribute: attr.label, diff: Math.round(avgCompetitor - myScore) });
      }
    });
    
    return { advantages, disadvantages };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { advantages, disadvantages } = getCompetitiveAdvantages();

  return (
    <div className="space-y-6" data-testid="competitor-analysis-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Comparador de Concorrentes</h1>
            <p className="text-muted-foreground">Mapeie e compare até 5 concorrentes</p>
          </div>
        </div>
        <div className="flex gap-2">
          {competitors.length < 5 && (
            <Button variant="outline" onClick={() => setShowAddForm(true)} data-testid="add-competitor-btn">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Concorrente
            </Button>
          )}
          <Button onClick={saveData} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Add Competitor Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Concorrente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nome do Concorrente</Label>
              <Input
                value={newCompetitor.name}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, name: e.target.value })}
                placeholder="Ex: Empresa X"
                data-testid="competitor-name-input"
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={newCompetitor.description}
                onChange={(e) => setNewCompetitor({ ...newCompetitor, description: e.target.value })}
                placeholder="Breve descrição do concorrente..."
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addCompetitor}>Adicionar</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Brand Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Sua Marca: {currentBrand?.name}
          </CardTitle>
          <CardDescription>Avalie sua marca em cada atributo (0-100)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ATTRIBUTES.map((attr) => {
              const Icon = attr.icon;
              const value = myBrandScores[attr.id] || 50;
              return (
                <div key={attr.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {attr.label}
                    </Label>
                    <span className="text-sm font-medium">{value}</span>
                  </div>
                  <Slider
                    value={[value]}
                    onValueChange={(v) => updateMyBrandScore(attr.id, v)}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Score Geral</span>
            <Badge variant="default" className="text-lg px-3 py-1">
              {getAverageScore(myBrandScores)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Competitors */}
      {competitors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Concorrentes ({competitors.length}/5)</h2>
          {competitors.map((competitor) => (
            <Card key={competitor.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{competitor.name}</CardTitle>
                    {competitor.description && (
                      <CardDescription>{competitor.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Score: {getAverageScore(competitor.scores)}</Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeCompetitor(competitor.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {ATTRIBUTES.map((attr) => {
                    const Icon = attr.icon;
                    const value = competitor.scores?.[attr.id] || 50;
                    return (
                      <div key={attr.id} className="space-y-2">
                        <Label className="text-xs flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          {attr.label}
                        </Label>
                        <Slider
                          value={[value]}
                          onValueChange={(v) => updateCompetitorScore(competitor.id, attr.id, v)}
                          max={100}
                          step={5}
                        />
                        <p className="text-xs text-center text-muted-foreground">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Competitive Analysis */}
      {competitors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Advantages */}
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader>
              <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Vantagens Competitivas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {advantages.length > 0 ? (
                <div className="space-y-2">
                  {advantages.map((adv, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded">
                      <span className="font-medium">{adv.attribute}</span>
                      <Badge variant="default" className="bg-green-500">+{adv.diff}pts</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma vantagem significativa identificada</p>
              )}
            </CardContent>
          </Card>

          {/* Disadvantages */}
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 rotate-180" />
                Pontos de Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disadvantages.length > 0 ? (
                <div className="space-y-2">
                  {disadvantages.map((dis, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-background rounded">
                      <span className="font-medium">{dis.attribute}</span>
                      <Badge variant="destructive">-{dis.diff}pts</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma desvantagem significativa identificada</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {competitors.length === 0 && !showAddForm && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum concorrente mapeado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Adicione até 5 concorrentes para comparar o posicionamento da sua marca
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeiro Concorrente
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
