import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  MapPin, Plus, Edit2, Trash2, Loader2, 
  Smile, Frown, Meh, Monitor, Building2,
  TrendingUp, TrendingDown, Minus, Target,
  ChevronDown, AlertTriangle, CheckCircle2,
  DollarSign, Users, Brain, BarChart3,
  Zap, ArrowRight, Lightbulb, PieChart
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FUNNEL_PHASES = ["Topo de Funil", "Meio de Funil", "Fundo de Funil"];
const ENVIRONMENTS = ["Online", "Offline"];
const SENTIMENTS = [
  { value: "Feliz", icon: Smile, color: "text-green-500" },
  { value: "Neutro", icon: Meh, color: "text-yellow-500" },
  { value: "Triste", icon: Frown, color: "text-blue-500" },
  { value: "Frustrado", icon: Frown, color: "text-red-500" }
];

const getScoreColor = (nota) => {
  if (nota <= 3) return { bg: "bg-red-500", text: "text-red-500", label: "Crítico" };
  if (nota <= 6) return { bg: "bg-yellow-500", text: "text-yellow-500", label: "Atenção" };
  return { bg: "bg-green-500", text: "text-green-500", label: "Excelente" };
};

const getROIColor = (roi) => {
  if (roi < 0) return "text-red-500";
  if (roi < 50) return "text-yellow-500";
  return "text-green-500";
};

const getSentimentIcon = (sentiment) => {
  const found = SENTIMENTS.find(s => s.value === sentiment);
  return found || SENTIMENTS[1];
};

export default function Touchpoints() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [touchpoints, setTouchpoints] = useState([]);
  const [byPhase, setByPhase] = useState({});
  const [stats, setStats] = useState({});
  const [financial, setFinancial] = useState({});
  const [heatmap, setHeatmap] = useState({});
  const [topCritical, setTopCritical] = useState([]);
  const [topExcellent, setTopExcellent] = useState([]);
  const [personas, setPersonas] = useState(["Geral"]);
  const [selectedPersona, setSelectedPersona] = useState("Geral");
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [editingTouchpoint, setEditingTouchpoint] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ambiente: 'Online',
    fase_funil: 'Topo de Funil',
    sentimento: 'Neutro',
    nota: 5,
    persona: 'Geral',
    custo_mensal: 0,
    receita_gerada: 0,
    conversoes: 0
  });
  const [newPersona, setNewPersona] = useState({ nome: '', descricao: '' });

  useEffect(() => {
    if (currentBrand) {
      loadData();
    }
  }, [currentBrand, selectedPersona]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpRes, personasRes, analysisRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/touchpoints?persona=${selectedPersona === 'Geral' ? '' : selectedPersona}`, 
          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/personas`, 
          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/touchpoints/ai-analysis`, 
          { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setTouchpoints(tpRes.data.touchpoints || []);
      setByPhase(tpRes.data.by_phase || {});
      setStats(tpRes.data.stats || {});
      setFinancial(tpRes.data.financial || {});
      setHeatmap(tpRes.data.heatmap || {});
      setTopCritical(tpRes.data.top_critical || []);
      setTopExcellent(tpRes.data.top_excellent || []);
      setPersonas(personasRes.data.persona_names || ["Geral"]);
      setAiAnalysis(analysisRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingTouchpoint) {
        await axios.put(
          `${API}/brands/${currentBrand.brand_id}/touchpoints/${editingTouchpoint.touchpoint_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Touchpoint atualizado!');
      } else {
        await axios.post(
          `${API}/brands/${currentBrand.brand_id}/touchpoints`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Touchpoint criado!');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar touchpoint');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (touchpointId) => {
    if (!window.confirm('Tem certeza que deseja excluir este touchpoint?')) return;
    
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/touchpoints/${touchpointId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Touchpoint removido!');
      loadData();
    } catch (error) {
      toast.error('Erro ao remover touchpoint');
    }
  };

  const handleCreatePersona = async () => {
    if (!newPersona.nome.trim()) {
      toast.error('Nome da persona é obrigatório');
      return;
    }
    
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/personas`,
        newPersona,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Persona criada!');
      setPersonaDialogOpen(false);
      setNewPersona({ nome: '', descricao: '' });
      loadData();
    } catch (error) {
      toast.error('Erro ao criar persona');
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/touchpoints/ai-analysis`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAiAnalysis(response.data);
      toast.success(`Análise concluída! (${response.data.credits_used} créditos usados)`);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Créditos insuficientes. Adquira mais créditos em Configurações > Créditos IA.');
      } else {
        toast.error('Erro ao analisar touchpoints');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const openEditDialog = (tp) => {
    setEditingTouchpoint(tp);
    setFormData({
      nome: tp.nome,
      descricao: tp.descricao || '',
      ambiente: tp.ambiente,
      fase_funil: tp.fase_funil,
      sentimento: tp.sentimento,
      nota: tp.nota,
      persona: tp.persona || 'Geral',
      custo_mensal: tp.custo_mensal || 0,
      receita_gerada: tp.receita_gerada || 0,
      conversoes: tp.conversoes || 0
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTouchpoint(null);
    setFormData({
      nome: '',
      descricao: '',
      ambiente: 'Online',
      fase_funil: 'Topo de Funil',
      sentimento: 'Neutro',
      nota: 5,
      persona: selectedPersona,
      custo_mensal: 0,
      receita_gerada: 0,
      conversoes: 0
    });
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
    <div className="space-y-6" data-testid="touchpoints-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Touchpoints</h1>
            <p className="text-muted-foreground">Mapeamento e análise da jornada do cliente</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Persona Filter */}
          <Select value={selectedPersona} onValueChange={setSelectedPersona}>
            <SelectTrigger className="w-40">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              {personas.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Add Persona Button */}
          <Dialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Users className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Persona</DialogTitle>
                <DialogDescription>Crie uma nova persona para segmentar touchpoints</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Persona *</Label>
                  <Input
                    placeholder="Ex: Decisor C-Level"
                    value={newPersona.nome}
                    onChange={(e) => setNewPersona({ ...newPersona, nome: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    placeholder="Características principais..."
                    value={newPersona.descricao}
                    onChange={(e) => setNewPersona({ ...newPersona, descricao: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPersonaDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreatePersona}>Criar Persona</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Add Touchpoint Button */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-touchpoint-btn">
                <Plus className="h-4 w-4 mr-2" /> Novo Touchpoint
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTouchpoint ? 'Editar' : 'Novo'} Touchpoint</DialogTitle>
                <DialogDescription>Configure o ponto de contato com o cliente</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Ex: Anúncio no Instagram"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    />
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label>Descrição</Label>
                    <Textarea
                      placeholder="Detalhes sobre este touchpoint..."
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select value={formData.ambiente} onValueChange={(v) => setFormData({ ...formData, ambiente: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ENVIRONMENTS.map(env => (
                          <SelectItem key={env} value={env}>
                            {env === 'Online' ? <Monitor className="h-4 w-4 inline mr-2" /> : <Building2 className="h-4 w-4 inline mr-2" />}
                            {env}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Fase do Funil</Label>
                    <Select value={formData.fase_funil} onValueChange={(v) => setFormData({ ...formData, fase_funil: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNNEL_PHASES.map(phase => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2 col-span-2">
                    <Label>Persona</Label>
                    <Select value={formData.persona} onValueChange={(v) => setFormData({ ...formData, persona: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {personas.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Sentimento Predominante</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SENTIMENTS.map(s => {
                      const Icon = s.icon;
                      return (
                        <Button
                          key={s.value}
                          type="button"
                          variant={formData.sentimento === s.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setFormData({ ...formData, sentimento: s.value })}
                          className="flex flex-col h-auto py-2"
                        >
                          <Icon className={`h-5 w-5 mb-1 ${formData.sentimento === s.value ? '' : s.color}`} />
                          <span className="text-xs">{s.value}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Nota de Avaliação</Label>
                    <span className={`text-2xl font-bold ${getScoreColor(formData.nota).text}`}>
                      {formData.nota}
                    </span>
                  </div>
                  <Slider
                    value={[formData.nota]}
                    onValueChange={(v) => setFormData({ ...formData, nota: v[0] })}
                    min={0}
                    max={10}
                    step={1}
                    className="py-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-red-500">0 - Crítico</span>
                    <span className="text-yellow-500">5 - Neutro</span>
                    <span className="text-green-500">10 - Excelente</span>
                  </div>
                </div>
                
                {/* Financial Fields */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" /> Dados Financeiros (ROI)
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Custo Mensal (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.custo_mensal}
                        onChange={(e) => setFormData({ ...formData, custo_mensal: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Receita Gerada (R$)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.receita_gerada}
                        onChange={(e) => setFormData({ ...formData, receita_gerada: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Conversões</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.conversoes}
                        onChange={(e) => setFormData({ ...formData, conversoes: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {formData.custo_mensal > 0 && (
                    <p className={`text-sm mt-2 ${getROIColor(((formData.receita_gerada - formData.custo_mensal) / formData.custo_mensal * 100))}`}>
                      ROI Estimado: {(((formData.receita_gerada - formData.custo_mensal) / formData.custo_mensal) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingTouchpoint ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
          <TabsTrigger value="financial">ROI & Financeiro</TabsTrigger>
          <TabsTrigger value="ai">Análise IA</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold">{stats.total || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${getScoreColor(stats.avg_score || 0).text}`}>
                  {stats.avg_score || 0}
                </p>
                <p className="text-sm text-muted-foreground">Média</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.excellent || 0}</p>
                <p className="text-sm text-muted-foreground">Excelentes</p>
              </CardContent>
            </Card>
            <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.attention || 0}</p>
                <p className="text-sm text-muted-foreground">Atenção</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.critical || 0}</p>
                <p className="text-sm text-muted-foreground">Críticos</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="pt-6 text-center">
                <p className={`text-3xl font-bold ${getROIColor(financial.roi_geral || 0)}`}>
                  {financial.roi_geral || 0}%
                </p>
                <p className="text-sm text-muted-foreground">ROI Geral</p>
              </CardContent>
            </Card>
          </div>

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Heatmap da Jornada
              </CardTitle>
              <CardDescription>Saúde dos touchpoints por fase do funil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {FUNNEL_PHASES.map((phase, i) => {
                  const data = heatmap[phase] || {};
                  const scoreColor = getScoreColor(data.avg_score || 0);
                  return (
                    <div 
                      key={phase}
                      className={`p-4 rounded-lg border-2 ${
                        data.critical > 0 ? 'border-red-300 bg-red-50/50' :
                        data.avg_score >= 7 ? 'border-green-300 bg-green-50/50' :
                        'border-yellow-300 bg-yellow-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{phase}</h4>
                        <Badge variant="outline">{data.count || 0}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                          <span className="text-white font-bold text-xl">{data.avg_score || 0}</span>
                        </div>
                        <div className="flex-1">
                          <Progress value={(data.avg_score || 0) * 10} className="h-2 mb-2" />
                          <div className="flex justify-between text-xs">
                            {data.critical > 0 && (
                              <span className="text-red-500">{data.critical} críticos</span>
                            )}
                            <span className={getROIColor(data.roi || 0)}>ROI: {data.roi || 0}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top 5 Lists */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Top 5 Críticos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topCritical.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Nenhum touchpoint crítico!</p>
                ) : (
                  <div className="space-y-2">
                    {topCritical.map((tp, i) => (
                      <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">{tp.nota}</Badge>
                          <span className="font-medium">{tp.nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{tp.fase_funil}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Top 5 Melhores
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topExcellent.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">Adicione touchpoints para ver os melhores</p>
                ) : (
                  <div className="space-y-2">
                    {topExcellent.map((tp, i) => (
                      <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500">{tp.nota}</Badge>
                          <span className="font-medium">{tp.nome}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{tp.fase_funil}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Visualização do Funil
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FUNNEL_PHASES.map((phase, index) => {
                  const phaseData = byPhase[phase] || [];
                  const widthPercent = 100 - (index * 15);
                  
                  return (
                    <div key={phase} className="relative">
                      <div 
                        className={`mx-auto rounded-lg p-4 ${
                          index === 0 ? 'bg-blue-100 dark:bg-blue-950/30' :
                          index === 1 ? 'bg-purple-100 dark:bg-purple-950/30' :
                          'bg-green-100 dark:bg-green-950/30'
                        }`}
                        style={{ width: `${widthPercent}%` }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold flex items-center gap-2">
                            {index === 0 && <TrendingUp className="h-4 w-4 text-blue-500" />}
                            {index === 1 && <Minus className="h-4 w-4 text-purple-500" />}
                            {index === 2 && <TrendingDown className="h-4 w-4 text-green-500" />}
                            {phase}
                          </h3>
                          <Badge variant="secondary">{phaseData.length} touchpoints</Badge>
                        </div>
                        
                        {phaseData.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">Nenhum touchpoint nesta fase</p>
                        ) : (
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {phaseData.map(tp => {
                              const scoreColor = getScoreColor(tp.nota);
                              const sentiment = getSentimentIcon(tp.sentimento);
                              const SentimentIcon = sentiment.icon;
                              
                              return (
                                <div 
                                  key={tp.touchpoint_id}
                                  className="bg-white dark:bg-background rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{tp.nome}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {tp.ambiente === 'Online' ? <Monitor className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                                          {tp.ambiente}
                                        </Badge>
                                        <SentimentIcon className={`h-4 w-4 ${sentiment.color}`} />
                                        {tp.roi !== undefined && tp.roi !== 0 && (
                                          <span className={`text-xs ${getROIColor(tp.roi)}`}>ROI: {tp.roi}%</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={`w-10 h-10 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                                        <span className="text-white font-bold">{tp.nota}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(tp)}>
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDelete(tp.touchpoint_id)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      {index < 2 && (
                        <div className="flex justify-center py-1">
                          <ChevronDown className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-red-500" />
                <p className="text-2xl font-bold">R$ {(financial.total_custo || 0).toLocaleString('pt-BR')}</p>
                <p className="text-sm text-muted-foreground">Investimento Mensal</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">R$ {(financial.total_receita || 0).toLocaleString('pt-BR')}</p>
                <p className="text-sm text-muted-foreground">Receita Gerada</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{financial.total_conversoes || 0}</p>
                <p className="text-sm text-muted-foreground">Conversões</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${financial.roi_geral >= 0 ? 'border-green-300' : 'border-red-300'}`}>
              <CardContent className="pt-6 text-center">
                <TrendingUp className={`h-8 w-8 mx-auto mb-2 ${getROIColor(financial.roi_geral || 0)}`} />
                <p className={`text-2xl font-bold ${getROIColor(financial.roi_geral || 0)}`}>
                  {financial.roi_geral || 0}%
                </p>
                <p className="text-sm text-muted-foreground">ROI Geral</p>
              </CardContent>
            </Card>
          </div>

          {/* ROI by Touchpoint */}
          <Card>
            <CardHeader>
              <CardTitle>ROI por Touchpoint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {touchpoints.filter(tp => tp.custo_mensal > 0).sort((a, b) => b.roi - a.roi).map(tp => (
                  <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{tp.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Custo: R$ {tp.custo_mensal.toLocaleString('pt-BR')} | Receita: R$ {tp.receita_gerada.toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${getROIColor(tp.roi)}`}>{tp.roi}%</p>
                      <p className="text-xs text-muted-foreground">{tp.conversoes} conversões</p>
                    </div>
                  </div>
                ))}
                {touchpoints.filter(tp => tp.custo_mensal > 0).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Adicione dados financeiros aos touchpoints para ver o ROI
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Analysis Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Brain className="h-5 w-5" />
                    Análise Inteligente com IA
                  </CardTitle>
                  <CardDescription>
                    Recomendações estratégicas baseadas nos seus touchpoints
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleAIAnalysis} 
                  disabled={analyzing || touchpoints.length === 0}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analisando...</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" /> Analisar (3 créditos)</>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            {aiAnalysis && aiAnalysis.diagnostico && (
              <CardContent className="space-y-6">
                {/* Diagnóstico */}
                <div className="p-4 bg-white dark:bg-background rounded-lg border">
                  <h4 className="font-semibold mb-2">📊 Diagnóstico</h4>
                  <p>{aiAnalysis.diagnostico}</p>
                </div>

                {/* Pontos Críticos */}
                {aiAnalysis.pontos_criticos?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Pontos Críticos
                    </h4>
                    <div className="space-y-2">
                      {aiAnalysis.pontos_criticos.map((p, i) => (
                        <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{p.touchpoint}</p>
                              <p className="text-sm text-muted-foreground">{p.problema}</p>
                            </div>
                            <Badge variant={p.impacto === 'alto' ? 'destructive' : 'secondary'}>
                              {p.impacto}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-green-500" />
                            <span className="text-green-700 dark:text-green-400">{p.acao_sugerida}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Wins */}
                {aiAnalysis.quick_wins?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Quick Wins
                    </h4>
                    <div className="grid md:grid-cols-3 gap-2">
                      {aiAnalysis.quick_wins.map((qw, i) => (
                        <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200">
                          <span className="text-sm">{qw}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Otimização por Funil */}
                {aiAnalysis.otimizacao_funil && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Otimização do Funil
                    </h4>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                        <p className="font-medium text-blue-700 mb-1">Topo</p>
                        <p className="text-sm">{aiAnalysis.otimizacao_funil.topo}</p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                        <p className="font-medium text-purple-700 mb-1">Meio</p>
                        <p className="text-sm">{aiAnalysis.otimizacao_funil.meio}</p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                        <p className="font-medium text-green-700 mb-1">Fundo</p>
                        <p className="text-sm">{aiAnalysis.otimizacao_funil.fundo}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sugestão de Novos Touchpoints */}
                {aiAnalysis.sugestao_novos_touchpoints?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-orange-500" />
                      Touchpoints Sugeridos
                    </h4>
                    <div className="space-y-2">
                      {aiAnalysis.sugestao_novos_touchpoints.map((s, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{s.nome}</p>
                            <p className="text-sm text-muted-foreground">{s.motivo}</p>
                          </div>
                          <Badge variant="outline">{s.fase}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ROI Insights */}
                {aiAnalysis.roi_insights && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      Insights de ROI
                    </h4>
                    <p>{aiAnalysis.roi_insights}</p>
                  </div>
                )}

                {/* Prioridades */}
                {aiAnalysis.prioridades?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">🎯 Prioridades</h4>
                    <ol className="list-decimal list-inside space-y-1">
                      {aiAnalysis.prioridades.map((p, i) => (
                        <li key={i} className="text-sm">{p}</li>
                      ))}
                    </ol>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-right">
                  Análise realizada em {new Date(aiAnalysis.analyzed_at).toLocaleString('pt-BR')} | 
                  {aiAnalysis.touchpoints_analyzed} touchpoints analisados
                </p>
              </CardContent>
            )}
            
            {(!aiAnalysis || !aiAnalysis.diagnostico) && (
              <CardContent>
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">Nenhuma análise realizada</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Clique em "Analisar" para obter recomendações estratégicas baseadas nos seus touchpoints
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {touchpoints.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Nenhum touchpoint cadastrado</h3>
                <p className="text-muted-foreground">
                  Comece mapeando os pontos de contato da sua marca com os clientes
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Touchpoint
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
