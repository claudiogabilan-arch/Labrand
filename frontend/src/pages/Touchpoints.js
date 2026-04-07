import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { MapPin, Plus, Loader2, Users, Edit2, Clock } from 'lucide-react';
import axios from 'axios';

import GuidanceAlert from '../components/touchpoints/GuidanceAlert';
import TouchpointForm from '../components/touchpoints/TouchpointForm';
import TouchpointOverview from '../components/touchpoints/TouchpointOverview';
import TouchpointOffline from '../components/touchpoints/TouchpointOffline';
import TouchpointFunnel from '../components/touchpoints/TouchpointFunnel';
import TouchpointFinancial from '../components/touchpoints/TouchpointFinancial';
import TouchpointAI from '../components/touchpoints/TouchpointAI';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    nome: '', descricao: '', ambiente: 'Online', tipo_offline: '',
    fase_funil: 'Topo de Funil', sentimento: 'Neutro', nota: 5,
    persona: 'Geral', custo_mensal: 0, receita_gerada: 0,
    conversoes: 0, emissora: '', dia_horario: ''
  });
  const [newPersona, setNewPersona] = useState({ nome: '', descricao: '' });

  useEffect(() => { if (currentBrand) loadData(); }, [currentBrand, selectedPersona]);
  useEffect(() => { loadOfflineTypes(); }, []);

  const loadOfflineTypes = async () => {
    try {
      const res = await axios.get(`${API}/touchpoints/offline-types`, { headers: { Authorization: `Bearer ${token}` } });
      setOfflineTypes(res.data.types || []);
    } catch { /* silent */ }
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
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.nome.trim()) { toast.error('Nome e obrigatorio'); return; }
    setSaving(true);
    try {
      let response;
      if (editingTouchpoint) {
        response = await axios.put(`${API}/brands/${currentBrand.brand_id}/touchpoints/${editingTouchpoint.touchpoint_id}`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Touchpoint atualizado!');
      } else {
        response = await axios.post(`${API}/brands/${currentBrand.brand_id}/touchpoints`, formData, { headers: { Authorization: `Bearer ${token}` } });
        toast.success('Touchpoint criado!');
      }
      const guidance = response.data?.guidance || [];
      guidance.forEach(g => {
        if (g.type === 'warning') toast.warning(g.message, { duration: 8000 });
        else if (g.type === 'info') toast.info(g.message, { duration: 8000 });
        else if (g.type === 'success') toast.success(g.message, { duration: 8000 });
      });
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch { toast.error('Erro ao salvar touchpoint'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (touchpointId) => {
    if (!window.confirm('Tem certeza que deseja excluir este touchpoint?')) return;
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/touchpoints/${touchpointId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Touchpoint removido!');
      loadData();
    } catch { toast.error('Erro ao remover touchpoint'); }
  };

  const handleCreatePersona = async () => {
    if (!newPersona.nome.trim()) { toast.error('Nome da persona e obrigatorio'); return; }
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/personas`, newPersona, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Persona criada!');
      setPersonaDialogOpen(false);
      setNewPersona({ nome: '', descricao: '' });
      loadData();
    } catch { toast.error('Erro ao criar persona'); }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await axios.post(`${API}/brands/${currentBrand.brand_id}/touchpoints/ai-analysis`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setAiAnalysis(response.data);
      toast.success(`Analise concluida! (${response.data.credits_used} creditos usados)`);
    } catch (error) {
      if (error.response?.status === 402) toast.error('Creditos insuficientes. Adquira mais creditos em Configuracoes > Creditos IA.');
      else toast.error('Analise IA nao disponivel no momento');
    } finally { setAnalyzing(false); }
  };

  const openEditDialog = (tp) => {
    setEditingTouchpoint(tp);
    setFormData({
      nome: tp.nome, descricao: tp.descricao || '', ambiente: tp.ambiente,
      tipo_offline: tp.tipo_offline || '', fase_funil: tp.fase_funil,
      sentimento: tp.sentimento, nota: tp.nota, persona: tp.persona || 'Geral',
      custo_mensal: tp.custo_mensal || 0, receita_gerada: tp.receita_gerada || 0,
      conversoes: tp.conversoes || 0, emissora: tp.emissora || '', dia_horario: tp.dia_horario || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTouchpoint(null);
    setFormData({
      nome: '', descricao: '', ambiente: 'Online', tipo_offline: '',
      fase_funil: 'Topo de Funil', sentimento: 'Neutro', nota: 5,
      persona: selectedPersona, custo_mensal: 0, receita_gerada: 0,
      conversoes: 0, emissora: '', dia_horario: ''
    });
  };

  if (!currentBrand) {
    return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Selecione uma marca primeiro</p></div>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
            <p className="text-muted-foreground">Mapeamento e analise da jornada do cliente</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedPersona} onValueChange={setSelectedPersona}>
            <SelectTrigger className="w-40" data-testid="persona-filter">
              <Users className="h-4 w-4 mr-2" /><SelectValue placeholder="Persona" />
            </SelectTrigger>
            <SelectContent>{personas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>

          <Dialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" data-testid="add-persona-btn"><Users className="h-4 w-4" /></Button>
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

          <TouchpointForm
            dialogOpen={dialogOpen} setDialogOpen={setDialogOpen}
            editingTouchpoint={editingTouchpoint} formData={formData} setFormData={setFormData}
            saving={saving} onSubmit={handleSubmit} onReset={resetForm}
            personas={personas} offlineTypes={offlineTypes}
          />
        </div>
      </div>

      {/* Page-level Guidance */}
      <GuidanceAlert messages={pageGuidance} />

      {/* Needs Update Alerts */}
      {needsUpdate.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20" data-testid="needs-update-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Clock className="h-4 w-4" /> Touchpoints que precisam de atualizacao ({needsUpdate.length})
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

        <TabsContent value="overview" className="space-y-4">
          <TouchpointOverview touchpoints={touchpoints} stats={stats} financial={financial}
            heatmap={heatmap} topCritical={topCritical} topExcellent={topExcellent}
            onEdit={openEditDialog} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="offline" className="space-y-4">
          <TouchpointOffline touchpoints={touchpoints} offlineTypes={offlineTypes} stats={stats}
            onEdit={openEditDialog} onDelete={handleDelete}
            onCreateOffline={() => { resetForm(); setFormData(prev => ({ ...prev, ambiente: 'Offline' })); setDialogOpen(true); }} />
        </TabsContent>

        <TabsContent value="funnel" className="space-y-4">
          <TouchpointFunnel byPhase={byPhase} onEdit={openEditDialog} onDelete={handleDelete} />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <TouchpointFinancial touchpoints={touchpoints} financial={financial} />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <TouchpointAI touchpoints={touchpoints} aiAnalysis={aiAnalysis} analyzing={analyzing} onAnalyze={handleAIAnalysis} />
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
