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
import { toast } from 'sonner';
import { 
  MapPin, Plus, Edit2, Trash2, Loader2, 
  Smile, Frown, Meh, Monitor, Building2,
  TrendingUp, TrendingDown, Minus, Target,
  ChevronDown, AlertTriangle, CheckCircle2
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

const getSentimentIcon = (sentiment) => {
  const found = SENTIMENTS.find(s => s.value === sentiment);
  return found || SENTIMENTS[1];
};

export default function Touchpoints() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touchpoints, setTouchpoints] = useState([]);
  const [byPhase, setByPhase] = useState({});
  const [stats, setStats] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTouchpoint, setEditingTouchpoint] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ambiente: 'Online',
    fase_funil: 'Topo de Funil',
    sentimento: 'Neutro',
    nota: 5
  });

  useEffect(() => {
    if (currentBrand) {
      loadTouchpoints();
    }
  }, [currentBrand]);

  const loadTouchpoints = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/touchpoints`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTouchpoints(response.data.touchpoints || []);
      setByPhase(response.data.by_phase || {});
      setStats(response.data.stats || {});
    } catch (error) {
      toast.error('Erro ao carregar touchpoints');
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
      loadTouchpoints();
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
      loadTouchpoints();
    } catch (error) {
      toast.error('Erro ao remover touchpoint');
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
      nota: tp.nota
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
      nota: 5
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Touchpoints</h1>
            <p className="text-muted-foreground">Pontos de contato da marca com o cliente</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-touchpoint-btn">
              <Plus className="h-4 w-4 mr-2" /> Novo Touchpoint
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTouchpoint ? 'Editar' : 'Novo'} Touchpoint</DialogTitle>
              <DialogDescription>Defina os detalhes do ponto de contato</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  placeholder="Ex: Anúncio no Instagram"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  data-testid="touchpoint-name-input"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Detalhes sobre este touchpoint..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              
              <div className="space-y-2">
                <Label>Sentimento Predominante</Label>
                <div className="flex gap-2">
                  {SENTIMENTS.map(s => {
                    const Icon = s.icon;
                    return (
                      <Button
                        key={s.value}
                        type="button"
                        variant={formData.sentimento === s.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, sentimento: s.value })}
                        className="flex-1"
                      >
                        <Icon className={`h-4 w-4 mr-1 ${formData.sentimento === s.value ? '' : s.color}`} />
                        {s.value}
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
                  <span>0 - Crítico</span>
                  <span>5 - Neutro</span>
                  <span>10 - Excelente</span>
                </div>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{stats.total || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className={`text-3xl font-bold ${getScoreColor(stats.avg_score || 0).text}`}>
                {stats.avg_score || 0}
              </p>
              <p className="text-sm text-muted-foreground">Média</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.excellent || 0}</p>
              <p className="text-sm text-muted-foreground">Excelentes (7-10)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats.attention || 0}</p>
              <p className="text-sm text-muted-foreground">Atenção (4-6)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">{stats.critical || 0}</p>
              <p className="text-sm text-muted-foreground">Críticos (0-3)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Visualização do Funil
          </CardTitle>
          <CardDescription>Touchpoints organizados por fase da jornada do cliente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {FUNNEL_PHASES.map((phase, index) => {
              const phaseData = byPhase[phase] || [];
              const widthPercent = 100 - (index * 20); // 100%, 80%, 60%
              
              return (
                <div key={phase} className="relative">
                  {/* Funnel shape */}
                  <div 
                    className={`mx-auto rounded-lg p-4 transition-all ${
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
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum touchpoint nesta fase
                      </p>
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
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {tp.ambiente === 'Online' ? <Monitor className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                                      {tp.ambiente}
                                    </Badge>
                                    <SentimentIcon className={`h-4 w-4 ${sentiment.color}`} />
                                  </div>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <div className={`w-10 h-10 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                                    <span className="text-white font-bold">{tp.nota}</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6"
                                      onClick={() => openEditDialog(tp)}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 text-red-500 hover:text-red-700"
                                      onClick={() => handleDelete(tp.touchpoint_id)}
                                    >
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
                  
                  {/* Connector arrow */}
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

      {/* List View */}
      {touchpoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Todos os Touchpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {touchpoints.map(tp => {
                const scoreColor = getScoreColor(tp.nota);
                const sentiment = getSentimentIcon(tp.sentimento);
                const SentimentIcon = sentiment.icon;
                
                return (
                  <div 
                    key={tp.touchpoint_id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                        <span className="text-white font-bold text-lg">{tp.nota}</span>
                      </div>
                      <div>
                        <p className="font-medium">{tp.nome}</p>
                        <p className="text-sm text-muted-foreground">{tp.descricao || 'Sem descrição'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{tp.fase_funil}</Badge>
                          <Badge variant="secondary" className="text-xs">{tp.ambiente}</Badge>
                          <SentimentIcon className={`h-4 w-4 ${sentiment.color}`} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={scoreColor.bg}>{scoreColor.label}</Badge>
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(tp)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleDelete(tp.touchpoint_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
