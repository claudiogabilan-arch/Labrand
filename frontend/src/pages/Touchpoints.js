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
  Zap, ArrowRight, Lightbulb, PieChart,
  Mic, BookOpen, Tv, Briefcase, Info, Clock
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

const OFFLINE_TYPE_ICONS = {
  palestra: Mic,
  imersao: BookOpen,
  tv: Tv,
  mentoria: Briefcase
};

const getScoreColor = (nota) => {
  if (nota <= 3) return { bg: "bg-red-500", text: "text-red-500", label: "Critico" };
  if (nota <= 6) return { bg: "bg-yellow-500", text: "text-yellow-500", label: "Atencao" };
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

// Guidance Alert Component
function GuidanceAlert({ messages }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div className="space-y-2">
      {messages.map((msg, i) => (
        <div key={i} className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
          msg.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200' :
          msg.type === 'info' ? 'bg-blue-50 border border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200' :
          'bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200'
        }`}>
          {msg.type === 'warning' ? <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> :
           msg.type === 'info' ? <Info className="h-4 w-4 mt-0.5 shrink-0" /> :
           <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />}
          <span>{msg.message}</span>
        </div>
      ))}
    </div>
  );
}

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
  const [offlineTypes, setOfflineTypes] = useState([]);
  const [pageGuidance, setPageGuidance] = useState([]);
  const [needsUpdate, setNeedsUpdate] = useState([]);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ambiente: 'Online',
    tipo_offline: '',
    fase_funil: 'Topo de Funil',
    sentimento: 'Neutro',
    nota: 5,
    persona: 'Geral',
    custo_mensal: 0,
    receita_gerada: 0,
    conversoes: 0,
    emissora: '',
    dia_horario: ''
  });
  const [newPersona, setNewPersona] = useState({ nome: '', descricao: '' });

  useEffect(() => {
    if (currentBrand) {
      loadData();
    }
  }, [currentBrand, selectedPersona]);

  useEffect(() => {
    loadOfflineTypes();
  }, []);

  const loadOfflineTypes = async () => {
    try {
      const res = await axios.get(`${API}/touchpoints/offline-types`, { headers: { Authorization: `Bearer ${token}` } });
      setOfflineTypes(res.data.types || []);
    } catch (e) { /* silent */ }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [tpRes, personasRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/touchpoints?persona=${selectedPersona === 'Geral' ? '' : selectedPersona}`, 
          { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/personas`, 
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
      setPageGuidance(tpRes.data.page_guidance || []);
      setNeedsUpdate(tpRes.data.needs_update || []);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome e obrigatorio');
      return;
    }

    setSaving(true);
    try {
      let response;
      if (editingTouchpoint) {
        response = await axios.put(
          `${API}/brands/${currentBrand.brand_id}/touchpoints/${editingTouchpoint.touchpoint_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Touchpoint atualizado!');
      } else {
        response = await axios.post(
          `${API}/brands/${currentBrand.brand_id}/touchpoints`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Touchpoint criado!');
      }
      
      // Show guidance messages from response
      const guidance = response.data?.guidance || [];
      guidance.forEach(g => {
        if (g.type === 'warning') toast.warning(g.message, { duration: 8000 });
        else if (g.type === 'info') toast.info(g.message, { duration: 8000 });
        else if (g.type === 'success') toast.success(g.message, { duration: 8000 });
      });
      
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
      toast.error('Nome da persona e obrigatorio');
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
      toast.success(`Analise concluida! (${response.data.credits_used} creditos usados)`);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Creditos insuficientes. Adquira mais creditos em Configuracoes > Creditos IA.');
      } else {
        toast.error('Analise IA nao disponivel no momento');
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
      tipo_offline: tp.tipo_offline || '',
      fase_funil: tp.fase_funil,
      sentimento: tp.sentimento,
      nota: tp.nota,
      persona: tp.persona || 'Geral',
      custo_mensal: tp.custo_mensal || 0,
      receita_gerada: tp.receita_gerada || 0,
      conversoes: tp.conversoes || 0,
      emissora: tp.emissora || '',
      dia_horario: tp.dia_horario || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTouchpoint(null);
    setFormData({
      nome: '',
      descricao: '',
      ambiente: 'Online',
      tipo_offline: '',
      fase_funil: 'Topo de Funil',
      sentimento: 'Neutro',
      nota: 5,
      persona: selectedPersona,
      custo_mensal: 0,
      receita_gerada: 0,
      conversoes: 0,
      emissora: '',
      dia_horario: ''
    });
  };

  const handleAmbienteChange = (val) => {
    setFormData(prev => ({ ...prev, ambiente: val, tipo_offline: val === 'Online' ? '' : prev.tipo_offline }));
  };

  const handleOfflineTypeChange = (typeId) => {
    const typeDef = offlineTypes.find(t => t.id === typeId);
    if (typeDef) {
      setFormData(prev => ({
        ...prev,
        tipo_offline: typeId,
        fase_funil: typeDef.default_fase_funil,
        nome: prev.nome || typeDef.nome_exemplo
      }));
    }
  };

  const selectedOfflineType = offlineTypes.find(t => t.id === formData.tipo_offline);

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

  const offlineTouchpoints = touchpoints.filter(tp => tp.ambiente === 'Offline');
  const onlineTouchpoints = touchpoints.filter(tp => tp.ambiente === 'Online');

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
            <p className="text-muted-foreground">Mapeamento e analise da jornada do cliente</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPersona} onValueChange={setSelectedPersona}>
            <SelectTrigger className="w-40" data-testid="persona-filter">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>
              {personas.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" data-testid="add-persona-btn">
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
                  <Input placeholder="Ex: Decisor C-Level" value={newPersona.nome} onChange={(e) => setNewPersona({ ...newPersona, nome: e.target.value })} data-testid="persona-name-input" />
                </div>
                <div className="space-y-2">
                  <Label>Descricao</Label>
                  <Textarea placeholder="Caracteristicas principais..." value={newPersona.descricao} onChange={(e) => setNewPersona({ ...newPersona, descricao: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPersonaDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreatePersona} data-testid="create-persona-submit">Criar Persona</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
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
                {/* Ambiente Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select value={formData.ambiente} onValueChange={handleAmbienteChange}>
                      <SelectTrigger data-testid="ambiente-select">
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

                  {/* Offline Type Selector */}
                  {formData.ambiente === 'Offline' && (
                    <div className="space-y-2">
                      <Label>Tipo de Acao Offline *</Label>
                      <Select value={formData.tipo_offline} onValueChange={handleOfflineTypeChange}>
                        <SelectTrigger data-testid="offline-type-select">
                          <SelectValue placeholder="Selecione o tipo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {offlineTypes.map(type => {
                            const TypeIcon = OFFLINE_TYPE_ICONS[type.id] || Building2;
                            return (
                              <SelectItem key={type.id} value={type.id}>
                                <span className="flex items-center gap-2">
                                  <TypeIcon className="h-4 w-4" />
                                  {type.label}
                                </span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {/* Offline Orientation Banner */}
                {formData.ambiente === 'Offline' && !formData.tipo_offline && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200" data-testid="offline-orientation-banner">
                    <Info className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>Voce esta registrando uma acao presencial. Selecione o tipo de acao offline para preencher automaticamente os campos recomendados.</span>
                  </div>
                )}

                {/* Type-specific Orientation */}
                {selectedOfflineType && (
                  <div className="space-y-2" data-testid="offline-type-guidance">
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 text-sm dark:bg-cyan-950/30 dark:border-cyan-800 dark:text-cyan-200">
                      <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium mb-1">{selectedOfflineType.label}</p>
                        <p>{selectedOfflineType.orientacao}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Nome */}
                <div className="space-y-2">
                  <Label>Nome * {selectedOfflineType && <span className="text-xs text-muted-foreground ml-1">(Ex: {selectedOfflineType.nome_exemplo})</span>}</Label>
                  <Input
                    placeholder={selectedOfflineType ? selectedOfflineType.nome_exemplo : "Ex: Anuncio no Instagram"}
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    data-testid="touchpoint-name-input"
                  />
                </div>
                
                {/* TV-specific fields: Emissora and Dia/Horario */}
                {formData.tipo_offline === 'tv' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Emissora / Canal *</Label>
                      <Input
                        placeholder="Ex: TV Cultura, Globo, Band"
                        value={formData.emissora || ''}
                        onChange={(e) => setFormData({ ...formData, emissora: e.target.value })}
                        data-testid="emissora-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dia e Horario *</Label>
                      <Input
                        placeholder="Ex: Seg 22h, 15/03/2025 20h"
                        value={formData.dia_horario || ''}
                        onChange={(e) => setFormData({ ...formData, dia_horario: e.target.value })}
                        data-testid="dia-horario-input"
                      />
                    </div>
                  </div>
                )}

                {/* Descricao */}
                <div className="space-y-2">
                  <Label>Descricao {selectedOfflineType?.dicas?.descricao && <span className="text-xs text-muted-foreground ml-1">({selectedOfflineType.dicas.descricao})</span>}</Label>
                  <Textarea
                    placeholder={selectedOfflineType?.dicas?.descricao || "Detalhes sobre este touchpoint..."}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    rows={2}
                    data-testid="touchpoint-desc-input"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Fase do Funil */}
                  <div className="space-y-2">
                    <Label>Fase do Funil {selectedOfflineType && <Badge variant="secondary" className="ml-1 text-xs">{selectedOfflineType.default_fase_funil}</Badge>}</Label>
                    <Select value={formData.fase_funil} onValueChange={(v) => setFormData({ ...formData, fase_funil: v })}>
                      <SelectTrigger data-testid="fase-funil-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FUNNEL_PHASES.map(phase => (
                          <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Persona */}
                  <div className="space-y-2">
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
                
                {/* Sentimento */}
                <div className="space-y-2">
                  <Label>Sentimento Predominante {selectedOfflineType && <span className="text-xs text-muted-foreground ml-1">(baseado no feedback recebido)</span>}</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {SENTIMENTS.map(s => {
                      const Icon = s.icon;
                      return (
                        <Button key={s.value} type="button" variant={formData.sentimento === s.value ? 'default' : 'outline'} size="sm"
                          onClick={() => setFormData({ ...formData, sentimento: s.value })} className="flex flex-col h-auto py-2"
                          data-testid={`sentiment-${s.value.toLowerCase()}`}>
                          <Icon className={`h-5 w-5 mb-1 ${formData.sentimento === s.value ? '' : s.color}`} />
                          <span className="text-xs">{s.value}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Nota */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Nota de Avaliacao {selectedOfflineType?.dicas?.nota && <span className="text-xs text-muted-foreground ml-1">({selectedOfflineType.dicas.nota})</span>}</Label>
                    <span className={`text-2xl font-bold ${getScoreColor(formData.nota).text}`}>{formData.nota}</span>
                  </div>
                  <Slider value={[formData.nota]} onValueChange={(v) => setFormData({ ...formData, nota: v[0] })} min={0} max={10} step={1} className="py-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="text-red-500">0 - Critico</span>
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
                      <Label className="text-xs">Custo Mensal (R$) {selectedOfflineType?.dicas?.custo_mensal && <span className="block text-muted-foreground mt-0.5">{selectedOfflineType.dicas.custo_mensal}</span>}</Label>
                      <Input type="number" min="0" value={formData.custo_mensal} data-testid="custo-input"
                        onChange={(e) => setFormData({ ...formData, custo_mensal: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Receita Gerada (R$) {selectedOfflineType?.dicas?.receita_gerada && <span className="block text-muted-foreground mt-0.5">{selectedOfflineType.dicas.receita_gerada}</span>}</Label>
                      <Input type="number" min="0" value={formData.receita_gerada} data-testid="receita-input"
                        onChange={(e) => setFormData({ ...formData, receita_gerada: parseFloat(e.target.value) || 0 })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Conversoes {selectedOfflineType?.dicas?.conversoes && <span className="block text-muted-foreground mt-0.5">{selectedOfflineType.dicas.conversoes}</span>}</Label>
                      <Input type="number" min="0" value={formData.conversoes} data-testid="conversoes-input"
                        onChange={(e) => setFormData({ ...formData, conversoes: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  {formData.custo_mensal > 0 && (
                    <p className={`text-sm mt-2 ${getROIColor(((formData.receita_gerada - formData.custo_mensal) / formData.custo_mensal * 100))}`}>
                      ROI Estimado: {(((formData.receita_gerada - formData.custo_mensal) / formData.custo_mensal) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>

                {/* General Offline Orientation (at save) */}
                {formData.ambiente === 'Offline' && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs dark:bg-slate-950/30 dark:border-slate-700 dark:text-slate-300" data-testid="offline-save-reminder">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Para que esse touchpoint apareca corretamente no Brand Tracking, preencha todos os campos antes do evento. As metricas de resultado (receita, conversoes, nota) podem ser atualizadas em ate 48h depois.</span>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving} data-testid="save-touchpoint-btn">
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {editingTouchpoint ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Page-level Guidance Messages */}
      <GuidanceAlert messages={pageGuidance} />

      {/* Needs Update Alerts */}
      {needsUpdate.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" data-testid="needs-update-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" />
              Touchpoints que precisam de atualizacao ({needsUpdate.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {needsUpdate.map(item => (
              <div key={item.touchpoint_id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-background border">
                <div>
                  <p className="font-medium text-sm">{item.nome}</p>
                  <p className="text-xs text-muted-foreground">{item.messages[0]?.message?.substring(0, 80)}...</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  const tp = touchpoints.find(t => t.touchpoint_id === item.touchpoint_id);
                  if (tp) openEditDialog(tp);
                }} data-testid={`update-tp-${item.touchpoint_id}`}>
                  <Edit2 className="h-3 w-3 mr-1" /> Atualizar
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="offline" data-testid="tab-offline">
            Offline <Badge variant="secondary" className="ml-1.5 text-xs">{stats.total_offline || 0}</Badge>
          </TabsTrigger>
          <TabsTrigger value="funnel" data-testid="tab-funnel">Funil</TabsTrigger>
          <TabsTrigger value="financial" data-testid="tab-financial">ROI & Financeiro</TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">Analise IA</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.total || 0}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className={`text-3xl font-bold ${getScoreColor(stats.avg_score || 0).text}`}>{stats.avg_score || 0}</p><p className="text-sm text-muted-foreground">Media</p></CardContent></Card>
            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20"><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{stats.excellent || 0}</p><p className="text-sm text-muted-foreground">Excelentes</p></CardContent></Card>
            <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-yellow-600">{stats.attention || 0}</p><p className="text-sm text-muted-foreground">Atencao</p></CardContent></Card>
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20"><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-red-600">{stats.critical || 0}</p><p className="text-sm text-muted-foreground">Criticos</p></CardContent></Card>
            <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"><CardContent className="pt-6 text-center"><p className={`text-3xl font-bold ${getROIColor(financial.roi_geral || 0)}`}>{financial.roi_geral || 0}%</p><p className="text-sm text-muted-foreground">ROI Geral</p></CardContent></Card>
          </div>

          {/* Online vs Offline Split */}
          {touchpoints.length > 0 && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4 text-blue-500" /> Online ({stats.total_online || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {onlineTouchpoints.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum touchpoint online</p> : (
                    <div className="space-y-1">
                      {onlineTouchpoints.slice(0, 5).map(tp => (
                        <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 rounded border text-sm">
                          <span className="truncate flex-1">{tp.nome}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full ${getScoreColor(tp.nota).bg} flex items-center justify-center`}>
                              <span className="text-white text-xs font-bold">{tp.nota}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-500" /> Offline ({stats.total_offline || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {offlineTouchpoints.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum touchpoint offline</p> : (
                    <div className="space-y-1">
                      {offlineTouchpoints.slice(0, 5).map(tp => {
                        const TypeIcon = OFFLINE_TYPE_ICONS[tp.tipo_offline] || Building2;
                        return (
                          <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 rounded border text-sm">
                            <span className="truncate flex-1 flex items-center gap-1.5">
                              <TypeIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                              {tp.nome}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full ${getScoreColor(tp.nota).bg} flex items-center justify-center`}>
                                <span className="text-white text-xs font-bold">{tp.nota}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Heatmap da Jornada</CardTitle>
              <CardDescription>Saude dos touchpoints por fase do funil</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {FUNNEL_PHASES.map((phase, i) => {
                  const data = heatmap[phase] || {};
                  const scoreColor = getScoreColor(data.avg_score || 0);
                  return (
                    <div key={phase} className={`p-4 rounded-lg border-2 ${data.critical > 0 ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : data.avg_score >= 7 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20'}`}>
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
                            {data.critical > 0 && <span className="text-red-500">{data.critical} criticos</span>}
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
              <CardHeader><CardTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Top 5 Criticos</CardTitle></CardHeader>
              <CardContent>
                {topCritical.length === 0 ? <p className="text-center text-muted-foreground py-4">Nenhum touchpoint critico!</p> : (
                  <div className="space-y-2">
                    {topCritical.map(tp => (
                      <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">{tp.nota}</Badge>
                          <span className="font-medium">{tp.nome}</span>
                          {tp.ambiente === 'Offline' && <Badge variant="outline" className="text-xs">Offline</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{tp.fase_funil}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border-green-200">
              <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Top 5 Melhores</CardTitle></CardHeader>
              <CardContent>
                {topExcellent.length === 0 ? <p className="text-center text-muted-foreground py-4">Adicione touchpoints para ver os melhores</p> : (
                  <div className="space-y-2">
                    {topExcellent.map(tp => (
                      <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500">{tp.nota}</Badge>
                          <span className="font-medium">{tp.nome}</span>
                          {tp.ambiente === 'Offline' && <Badge variant="outline" className="text-xs">Offline</Badge>}
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

        {/* OFFLINE TAB - New dedicated tab */}
        <TabsContent value="offline" className="space-y-4" data-testid="offline-tab-content">
          {/* Offline Stats */}
          {offlineTouchpoints.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['palestra', 'imersao', 'tv', 'mentoria'].map(typeId => {
                const typeDef = offlineTypes.find(t => t.id === typeId);
                const count = offlineTouchpoints.filter(tp => tp.tipo_offline === typeId).length;
                const TypeIcon = OFFLINE_TYPE_ICONS[typeId] || Building2;
                return (
                  <Card key={typeId}>
                    <CardContent className="pt-6 text-center">
                      <TypeIcon className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs text-muted-foreground">{typeDef?.label || typeId}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Principle box */}
          <Card className="border-cyan-200 bg-cyan-50/30 dark:bg-cyan-950/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-cyan-600 mt-0.5 shrink-0" />
                <div className="text-sm text-cyan-800 dark:text-cyan-200">
                  <p className="font-medium mb-1">Principio Orientador</p>
                  <p>O LABrand nao mede audiencia. Mede percepcao, preferencia e conversao ao longo do tempo. Cada Touchpoint Offline bem preenchido e um dado que prova o valor da marca. O conjunto desses dados ao longo de 12 meses e o que transforma a marca em ativo mensuravel e defensavel.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offline Touchpoints List by Type */}
          {offlineTouchpoints.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-lg">Nenhum touchpoint offline cadastrado</h3>
                    <p className="text-muted-foreground text-sm">Registre suas acoes presenciais: palestras, imersoes, aparicoes em midia e mentorias</p>
                  </div>
                  <Button onClick={() => { resetForm(); setFormData(prev => ({ ...prev, ambiente: 'Offline' })); setDialogOpen(true); }} data-testid="create-offline-tp-btn">
                    <Plus className="h-4 w-4 mr-2" /> Novo Touchpoint Offline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {['palestra', 'imersao', 'tv', 'mentoria'].map(typeId => {
                const typeDef = offlineTypes.find(t => t.id === typeId);
                const typeTps = offlineTouchpoints.filter(tp => tp.tipo_offline === typeId);
                const TypeIcon = OFFLINE_TYPE_ICONS[typeId] || Building2;
                if (typeTps.length === 0) return null;
                return (
                  <Card key={typeId}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TypeIcon className="h-5 w-5 text-orange-500" />
                        {typeDef?.label || typeId} ({typeTps.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {typeTps.map(tp => {
                          const scoreColor = getScoreColor(tp.nota);
                          const sentiment = getSentimentIcon(tp.sentimento);
                          const SentimentIcon = sentiment.icon;
                          return (
                            <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border hover:border-orange-300 transition-colors" data-testid={`offline-tp-${tp.touchpoint_id}`}>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{tp.nome}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  <span>{tp.fase_funil}</span>
                                  <span className="flex items-center gap-1"><SentimentIcon className={`h-3 w-3 ${sentiment.color}`} />{tp.sentimento}</span>
                                  {tp.custo_mensal > 0 && <span>Custo: R$ {tp.custo_mensal.toLocaleString('pt-BR')}</span>}
                                  {tp.receita_gerada > 0 && <span className="text-green-600">Receita: R$ {tp.receita_gerada.toLocaleString('pt-BR')}</span>}
                                  {tp.conversoes > 0 && <span>{tp.conversoes} conversoes</span>}
                                  {tp.roi !== 0 && <span className={getROIColor(tp.roi)}>ROI: {tp.roi}%</span>}
                                  {tp.emissora && <span className="font-medium text-blue-600">{tp.emissora}</span>}
                                  {tp.dia_horario && <span>{tp.dia_horario}</span>}
                                </div>
                                {tp.descricao && <p className="text-xs text-muted-foreground mt-1 truncate">{tp.descricao}</p>}
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                <div className={`w-10 h-10 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                                  <span className="text-white font-bold">{tp.nota}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(tp)} data-testid={`edit-tp-${tp.touchpoint_id}`}><Edit2 className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(tp.touchpoint_id)} data-testid={`delete-tp-${tp.touchpoint_id}`}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Untyped offline touchpoints */}
              {offlineTouchpoints.filter(tp => !tp.tipo_offline).length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-gray-500" />
                      Outros Offline ({offlineTouchpoints.filter(tp => !tp.tipo_offline).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {offlineTouchpoints.filter(tp => !tp.tipo_offline).map(tp => (
                        <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{tp.nome}</p>
                            <p className="text-xs text-muted-foreground">{tp.fase_funil}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 rounded-full ${getScoreColor(tp.nota).bg} flex items-center justify-center`}>
                              <span className="text-white font-bold">{tp.nota}</span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(tp)}><Edit2 className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(tp.touchpoint_id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Funnel Tab */}
        <TabsContent value="funnel" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Visualizacao do Funil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FUNNEL_PHASES.map((phase, index) => {
                  const phaseData = byPhase[phase] || [];
                  const widthPercent = 100 - (index * 15);
                  return (
                    <div key={phase} className="relative">
                      <div className={`mx-auto rounded-lg p-4 ${index === 0 ? 'bg-blue-100 dark:bg-blue-950/30' : index === 1 ? 'bg-purple-100 dark:bg-purple-950/30' : 'bg-green-100 dark:bg-green-950/30'}`} style={{ width: `${widthPercent}%` }}>
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
                              const TypeIcon = tp.tipo_offline ? (OFFLINE_TYPE_ICONS[tp.tipo_offline] || Building2) : null;
                              return (
                                <div key={tp.touchpoint_id} className="bg-white dark:bg-background rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium truncate">{tp.nome}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="outline" className="text-xs">
                                          {tp.ambiente === 'Online' ? <Monitor className="h-3 w-3 mr-1" /> : TypeIcon ? <TypeIcon className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                                          {tp.ambiente}
                                        </Badge>
                                        <SentimentIcon className={`h-4 w-4 ${sentiment.color}`} />
                                        {tp.roi !== undefined && tp.roi !== 0 && <span className={`text-xs ${getROIColor(tp.roi)}`}>ROI: {tp.roi}%</span>}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={`w-10 h-10 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                                        <span className="text-white font-bold">{tp.nota}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDialog(tp)}><Edit2 className="h-3 w-3" /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => handleDelete(tp.touchpoint_id)}><Trash2 className="h-3 w-3" /></Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      {index < 2 && <div className="flex justify-center py-1"><ChevronDown className="h-6 w-6 text-muted-foreground" /></div>}
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
            <Card><CardContent className="pt-6 text-center"><DollarSign className="h-8 w-8 mx-auto mb-2 text-red-500" /><p className="text-2xl font-bold">R$ {(financial.total_custo || 0).toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">Investimento Mensal</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" /><p className="text-2xl font-bold">R$ {(financial.total_receita || 0).toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">Receita Gerada</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><Target className="h-8 w-8 mx-auto mb-2 text-blue-500" /><p className="text-2xl font-bold">{financial.total_conversoes || 0}</p><p className="text-sm text-muted-foreground">Conversoes</p></CardContent></Card>
            <Card className={`border-2 ${financial.roi_geral >= 0 ? 'border-green-300' : 'border-red-300'}`}><CardContent className="pt-6 text-center"><TrendingUp className={`h-8 w-8 mx-auto mb-2 ${getROIColor(financial.roi_geral || 0)}`} /><p className={`text-2xl font-bold ${getROIColor(financial.roi_geral || 0)}`}>{financial.roi_geral || 0}%</p><p className="text-sm text-muted-foreground">ROI Geral</p></CardContent></Card>
          </div>

          {/* ROI by Touchpoint */}
          <Card>
            <CardHeader><CardTitle>ROI por Touchpoint</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {touchpoints.filter(tp => tp.custo_mensal > 0).sort((a, b) => b.roi - a.roi).map(tp => {
                  const TypeIcon = tp.tipo_offline ? (OFFLINE_TYPE_ICONS[tp.tipo_offline] || Building2) : null;
                  return (
                    <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium flex items-center gap-1.5">
                          {TypeIcon && <TypeIcon className="h-4 w-4 text-orange-500" />}
                          {tp.nome}
                          {tp.ambiente === 'Offline' && <Badge variant="outline" className="text-xs ml-1">Offline</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground">Custo: R$ {tp.custo_mensal.toLocaleString('pt-BR')} | Receita: R$ {tp.receita_gerada.toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold ${getROIColor(tp.roi)}`}>{tp.roi}%</p>
                        <p className="text-xs text-muted-foreground">{tp.conversoes} conversoes</p>
                      </div>
                    </div>
                  );
                })}
                {touchpoints.filter(tp => tp.custo_mensal > 0).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Adicione dados financeiros aos touchpoints para ver o ROI</p>
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
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400"><Brain className="h-5 w-5" /> Analise Inteligente com IA</CardTitle>
                  <CardDescription>Recomendacoes estrategicas baseadas nos seus touchpoints</CardDescription>
                </div>
                <Button onClick={handleAIAnalysis} disabled={analyzing || touchpoints.length === 0} className="bg-purple-600 hover:bg-purple-700">
                  {analyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analisando...</> : <><Zap className="h-4 w-4 mr-2" /> Analisar (3 creditos)</>}
                </Button>
              </div>
            </CardHeader>
            
            {aiAnalysis && aiAnalysis.diagnostico ? (
              <CardContent className="space-y-6">
                <div className="p-4 bg-white dark:bg-background rounded-lg border"><h4 className="font-semibold mb-2">Diagnostico</h4><p>{aiAnalysis.diagnostico}</p></div>
                {aiAnalysis.pontos_criticos?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Pontos Criticos</h4>
                    <div className="space-y-2">
                      {aiAnalysis.pontos_criticos.map((p, i) => (
                        <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                          <div className="flex items-start justify-between"><div><p className="font-medium">{p.touchpoint}</p><p className="text-sm text-muted-foreground">{p.problema}</p></div><Badge variant={p.impacto === 'alto' ? 'destructive' : 'secondary'}>{p.impacto}</Badge></div>
                          <div className="mt-2 flex items-center gap-2 text-sm"><ArrowRight className="h-4 w-4 text-green-500" /><span className="text-green-700 dark:text-green-400">{p.acao_sugerida}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiAnalysis.quick_wins?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Quick Wins</h4>
                    <div className="grid md:grid-cols-3 gap-2">
                      {aiAnalysis.quick_wins.map((qw, i) => <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200"><span className="text-sm">{qw}</span></div>)}
                    </div>
                  </div>
                )}
                {aiAnalysis.otimizacao_funil && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-blue-500" /> Otimizacao do Funil</h4>
                    <div className="grid md:grid-cols-3 gap-3">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200"><p className="font-medium text-blue-700 mb-1">Topo</p><p className="text-sm">{aiAnalysis.otimizacao_funil.topo}</p></div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200"><p className="font-medium text-purple-700 mb-1">Meio</p><p className="text-sm">{aiAnalysis.otimizacao_funil.meio}</p></div>
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200"><p className="font-medium text-green-700 mb-1">Fundo</p><p className="text-sm">{aiAnalysis.otimizacao_funil.fundo}</p></div>
                    </div>
                  </div>
                )}
                {aiAnalysis.sugestao_novos_touchpoints?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-orange-500" /> Touchpoints Sugeridos</h4>
                    <div className="space-y-2">
                      {aiAnalysis.sugestao_novos_touchpoints.map((s, i) => (
                        <div key={i} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 flex items-center justify-between">
                          <div><p className="font-medium">{s.nome}</p><p className="text-sm text-muted-foreground">{s.motivo}</p></div>
                          <Badge variant="outline">{s.fase}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {aiAnalysis.roi_insights && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /> Insights de ROI</h4>
                    <p>{aiAnalysis.roi_insights}</p>
                  </div>
                )}
                {aiAnalysis.prioridades?.length > 0 && (
                  <div><h4 className="font-semibold mb-3">Prioridades</h4><ol className="list-decimal list-inside space-y-1">{aiAnalysis.prioridades.map((p, i) => <li key={i} className="text-sm">{p}</li>)}</ol></div>
                )}
                <p className="text-xs text-muted-foreground text-right">Analise realizada em {new Date(aiAnalysis.analyzed_at).toLocaleString('pt-BR')} | {aiAnalysis.touchpoints_analyzed} touchpoints analisados</p>
              </CardContent>
            ) : (
              <CardContent>
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">Nenhuma analise realizada</h3>
                  <p className="text-muted-foreground text-sm mt-1">Clique em "Analisar" para obter recomendacoes estrategicas baseadas nos seus touchpoints</p>
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
                <p className="text-muted-foreground">Comece mapeando os pontos de contato da sua marca com os clientes</p>
              </div>
              <Button onClick={() => setDialogOpen(true)} data-testid="create-first-tp-btn">
                <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Touchpoint
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
