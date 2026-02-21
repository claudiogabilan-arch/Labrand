import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import { 
  Sparkles, Plus, Trash2, Loader2, Star, StarOff,
  Wand2, Target, Lightbulb, ChevronRight, Save,
  Zap, Brain, Network, X, Check, Volume2, Globe,
  Download, ExternalLink, AlertTriangle, CheckCircle
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TONES = [
  { value: "moderno", label: "Moderno" },
  { value: "classico", label: "Clássico" },
  { value: "divertido", label: "Divertido" },
  { value: "serio", label: "Sério/Profissional" },
  { value: "sofisticado", label: "Sofisticado" },
  { value: "acessivel", label: "Acessível" },
];

const STYLES = [
  { value: "criativo", label: "Criativo/Inventado" },
  { value: "descritivo", label: "Descritivo" },
  { value: "abstrato", label: "Abstrato" },
  { value: "acronimo", label: "Acrônimo/Sigla" },
  { value: "metafora", label: "Metáfora" },
];

const PERCEPTIONS = [
  "Inovação", "Segurança", "Confiança", "Tradição", "Modernidade",
  "Simplicidade", "Sofisticação", "Acessibilidade", "Premium", "Tecnologia"
];

const STEPS = [
  { id: 1, name: "Essência", icon: Target, description: "Contexto do negócio" },
  { id: 2, name: "Propulsor", icon: Zap, description: "Arquétipo e tensão" },
  { id: 3, name: "Semântico", icon: Network, description: "Mapa de conceitos" },
  { id: 4, name: "Geração", icon: Wand2, description: "Criar nomes com IA" },
  { id: 5, name: "Sonoro", icon: Volume2, description: "Análise fonética" },
  { id: 6, name: "Global", icon: Globe, description: "Teste internacional" },
  { id: 7, name: "Avaliação", icon: Star, description: "Pontuar e selecionar" },
];

export default function Naming() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [names, setNames] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [archetypes, setArchetypes] = useState([]);
  const [tensionExamples, setTensionExamples] = useState([]);
  const [step, setStep] = useState(1);
  const [showNewProject, setShowNewProject] = useState(false);
  const [scoringName, setScoringName] = useState(null);
  const [scores, setScores] = useState({});
  const [semanticMap, setSemanticMap] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  
  const [formData, setFormData] = useState({
    project_name: '',
    business_description: '',
    mission: '',
    values: '',
    target_audience: '',
    competitors: '',
    desired_perception: [],
    tone: 'moderno',
    name_style: 'criativo'
  });
  
  const [propulsor, setPropulsor] = useState({
    archetype: '',
    tension: ''
  });

  useEffect(() => {
    if (currentBrand) {
      loadData();
      loadCriteria();
      loadArchetypes();
    }
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/naming`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setProjects(response.data.projects || []);
    } catch (error) {
      console.error('Error loading naming projects');
    } finally {
      setLoading(false);
    }
  };

  const loadCriteria = async () => {
    try {
      const response = await axios.get(`${API}/naming/criteria`);
      setCriteria(response.data.criteria || []);
    } catch (error) {
      console.error('Error loading criteria');
    }
  };

  const loadArchetypes = async () => {
    try {
      const response = await axios.get(`${API}/naming/archetypes`);
      setArchetypes(response.data.archetypes || []);
      setTensionExamples(response.data.tension_examples || []);
    } catch (error) {
      console.error('Error loading archetypes');
    }
  };

  const loadProject = async (projectId) => {
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/naming/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      const project = response.data.project;
      setCurrentProject(project);
      setNames(response.data.names || []);
      setPropulsor(project.propulsor || { archetype: '', tension: '' });
      setSemanticMap(project.semantic_map || null);
      setKeywords(project.keywords || []);
      
      // Determine current step
      if (response.data.names?.length > 0) setStep(5);
      else if (project.semantic_map) setStep(4);
      else if (project.propulsor?.archetype) setStep(3);
      else setStep(2);
    } catch (error) {
      toast.error('Erro ao carregar projeto');
    }
  };

  const handleCreateProject = async () => {
    if (!formData.project_name || !formData.business_description || !formData.target_audience) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        project_name: formData.project_name,
        context: {
          business_description: formData.business_description,
          mission: formData.mission,
          values: formData.values.split(',').map(v => v.trim()).filter(Boolean),
          target_audience: formData.target_audience,
          competitors: formData.competitors.split(',').map(c => c.trim()).filter(Boolean),
          desired_perception: formData.desired_perception,
          tone: formData.tone,
          name_style: formData.name_style
        }
      };
      
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/naming`,
        payload,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success('Projeto criado!');
      setShowNewProject(false);
      setCurrentProject(response.data);
      setNames([]);
      setStep(2);
      loadData();
    } catch (error) {
      toast.error('Erro ao criar projeto');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePropulsor = async () => {
    if (!propulsor.archetype) {
      toast.error('Selecione um arquétipo');
      return;
    }
    
    try {
      await axios.put(
        `${API}/brands/${currentBrand.brand_id}/naming/${currentProject.project_id}/propulsor?archetype=${propulsor.archetype}&tension=${encodeURIComponent(propulsor.tension)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Fator Propulsor salvo!');
      setStep(3);
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (kw) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleGenerateSemanticMap = async () => {
    if (keywords.length === 0) {
      toast.error('Adicione pelo menos uma palavra-chave');
      return;
    }
    
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/naming/${currentProject.project_id}/semantic-map?${keywords.map(k => `keywords=${encodeURIComponent(k)}`).join('&')}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setSemanticMap(response.data.semantic_map);
      toast.success(`Mapa gerado! (${response.data.credits_used} crédito)`);
      setStep(4);
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Créditos insuficientes');
      } else {
        toast.error('Erro ao gerar mapa');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!currentProject) return;
    
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/naming/${currentProject.project_id}/generate`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setNames(response.data.names || []);
      setStep(5);
      toast.success(`${response.data.names?.length || 0} nomes gerados! (${response.data.credits_used} créditos)`);
      loadData();
    } catch (error) {
      if (error.response?.status === 402) {
        toast.error('Créditos insuficientes. Adquira mais créditos.');
      } else {
        toast.error('Erro ao gerar nomes');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleScore = async () => {
    if (!scoringName) return;
    
    try {
      const response = await axios.put(
        `${API}/brands/${currentBrand.brand_id}/naming/${currentProject.project_id}/names/${scoringName.name_id}/score`,
        { name_id: scoringName.name_id, scores },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setNames(names.map(n => 
        n.name_id === scoringName.name_id 
          ? { ...n, scores, total_score: response.data.total_score }
          : n
      ).sort((a, b) => (b.total_score || 0) - (a.total_score || 0)));
      
      toast.success(`Score: ${response.data.total_score}%`);
      setScoringName(null);
      setScores({});
    } catch (error) {
      toast.error('Erro ao salvar pontuação');
    }
  };

  const handleToggleFavorite = async (nameId) => {
    try {
      const response = await axios.put(
        `${API}/brands/${currentBrand.brand_id}/naming/${currentProject.project_id}/names/${nameId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setNames(names.map(n => 
        n.name_id === nameId ? { ...n, is_favorite: response.data.is_favorite } : n
      ));
    } catch (error) {
      toast.error('Erro ao favoritar');
    }
  };

  const handleDeleteName = async (nameId) => {
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/naming/${currentProject.project_id}/names/${nameId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setNames(names.filter(n => n.name_id !== nameId));
      toast.success('Nome removido');
    } catch (error) {
      toast.error('Erro ao remover');
    }
  };

  const resetForm = () => {
    setFormData({
      project_name: '',
      business_description: '',
      mission: '',
      values: '',
      target_audience: '',
      competitors: '',
      desired_perception: [],
      tone: 'moderno',
      name_style: 'criativo'
    });
  };

  const selectedArchetype = archetypes.find(a => a.id === propulsor.archetype);

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

  // Project list view
  if (!currentProject) {
    return (
      <div className="space-y-6" data-testid="naming-page">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Estúdio de Naming</h1>
              <p className="text-muted-foreground">Crie nomes memoráveis para sua marca</p>
            </div>
          </div>
          <Button onClick={() => { resetForm(); setShowNewProject(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Novo Projeto
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">Nenhum projeto de naming</h3>
              <p className="text-muted-foreground mb-4">Crie seu primeiro projeto para começar</p>
              <Button onClick={() => setShowNewProject(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <Card 
                key={project.project_id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => loadProject(project.project_id)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.project_name}</CardTitle>
                    <Badge variant={project.names_generated > 0 ? 'default' : 'secondary'}>
                      {project.names_generated > 0 ? `${project.names_generated} nomes` : 'Rascunho'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.context?.business_description}
                  </p>
                  {project.propulsor?.archetype && (
                    <Badge variant="outline" className="mt-2">
                      {archetypes.find(a => a.id === project.propulsor.archetype)?.name || project.propulsor.archetype}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* New Project Dialog */}
        <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" /> Etapa 1: Essência Decode®
              </DialogTitle>
              <DialogDescription>
                Preencha o contexto do negócio para começar a jornada de naming
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Projeto *</Label>
                <Input
                  placeholder="Ex: Nome para novo produto"
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição do Negócio *</Label>
                <Textarea
                  placeholder="Descreva o que a empresa/produto faz..."
                  value={formData.business_description}
                  onChange={(e) => setFormData({...formData, business_description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Missão</Label>
                  <Input
                    placeholder="Missão da empresa"
                    value={formData.mission}
                    onChange={(e) => setFormData({...formData, mission: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Público-alvo *</Label>
                  <Input
                    placeholder="Quem são seus clientes"
                    value={formData.target_audience}
                    onChange={(e) => setFormData({...formData, target_audience: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valores (separados por vírgula)</Label>
                  <Input
                    placeholder="Inovação, Qualidade, Confiança"
                    value={formData.values}
                    onChange={(e) => setFormData({...formData, values: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Concorrentes (separados por vírgula)</Label>
                  <Input
                    placeholder="Empresa A, Empresa B"
                    value={formData.competitors}
                    onChange={(e) => setFormData({...formData, competitors: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Percepção Desejada</Label>
                <div className="flex flex-wrap gap-2">
                  {PERCEPTIONS.map(p => (
                    <Badge
                      key={p}
                      variant={formData.desired_perception.includes(p) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const newPerc = formData.desired_perception.includes(p)
                          ? formData.desired_perception.filter(x => x !== p)
                          : [...formData.desired_perception, p];
                        setFormData({...formData, desired_perception: newPerc});
                      }}
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tom da Marca</Label>
                  <Select value={formData.tone} onValueChange={(v) => setFormData({...formData, tone: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estilo de Nome</Label>
                  <Select value={formData.name_style} onValueChange={(v) => setFormData({...formData, name_style: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLES.map(s => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancelar</Button>
              <Button onClick={handleCreateProject} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Próxima Etapa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Project detail view with steps
  return (
    <div className="space-y-6" data-testid="naming-project">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setCurrentProject(null); setNames([]); setSemanticMap(null); setKeywords([]); }}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentProject.project_name}</h1>
            <p className="text-muted-foreground text-sm line-clamp-1">
              {currentProject.context?.business_description}
            </p>
          </div>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, idx) => {
          const StepIcon = s.icon;
          const isActive = step === s.id;
          const isCompleted = step > s.id;
          
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => s.id <= step && setStep(s.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-primary text-white' : 
                  isCompleted ? 'bg-primary/10 text-primary cursor-pointer' : 
                  'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                <span className="text-sm font-medium whitespace-nowrap">{s.name}</span>
              </button>
              {idx < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step 2: Fator Propulsor */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" /> Etapa 2: Fator Propulsor®
              </CardTitle>
              <CardDescription>
                Defina o arquétipo da marca e a tensão criativa central
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Archetype Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Escolha o Arquétipo da Marca</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {archetypes.map(arch => (
                    <Card 
                      key={arch.id}
                      className={`cursor-pointer transition-all ${
                        propulsor.archetype === arch.id 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => setPropulsor({...propulsor, archetype: arch.id})}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{arch.name}</span>
                          {propulsor.archetype === arch.id && <Check className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{arch.essence}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Selected Archetype Details */}
              {selectedArchetype && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-2">Arquétipo: {selectedArchetype.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{selectedArchetype.essence}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {selectedArchetype.keywords.map(kw => (
                        <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Marcas exemplo: {selectedArchetype.brands.join(', ')}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Tension */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Tensão Criativa Central</Label>
                <p className="text-sm text-muted-foreground">
                  Qual é o paradoxo ou tensão que define sua marca?
                </p>
                <Textarea
                  placeholder="Ex: Ser inovador mantendo tradição, ser premium sendo acessível..."
                  value={propulsor.tension}
                  onChange={(e) => setPropulsor({...propulsor, tension: e.target.value})}
                  rows={2}
                />
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Exemplos de tensões:</p>
                  <div className="flex flex-wrap gap-2">
                    {tensionExamples.map((t, idx) => (
                      <Badge 
                        key={idx} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setPropulsor({...propulsor, tension: t.tension})}
                      >
                        {t.tension}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePropulsor} className="w-full">
                <ChevronRight className="h-4 w-4 mr-2" /> Próxima Etapa
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Mapa Semântico */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" /> Etapa 3: Arquétipos Vivos®
              </CardTitle>
              <CardDescription>
                Explore conceitos e palavras relacionadas ao universo da marca
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add Keywords */}
              <div className="space-y-2">
                <Label>Adicione palavras-chave do universo da marca</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: transformação, conexão, velocidade..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                  />
                  <Button onClick={handleAddKeyword} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Keywords List */}
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {keywords.map(kw => (
                    <Badge key={kw} variant="secondary" className="gap-1">
                      {kw}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveKeyword(kw)} />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Suggest from archetype */}
              {selectedArchetype && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Sugestões do arquétipo {selectedArchetype.name}:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedArchetype.keywords.filter(k => !keywords.includes(k)).map(kw => (
                      <Badge 
                        key={kw} 
                        variant="outline" 
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => setKeywords([...keywords, kw])}
                      >
                        + {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleGenerateSemanticMap} 
                disabled={generating || keywords.length === 0}
                className="w-full"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando mapa...</>
                ) : (
                  <><Brain className="h-4 w-4 mr-2" /> Gerar Mapa Semântico (1 crédito)</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Semantic Map Results */}
          {semanticMap && semanticMap.map && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Mapa Semântico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {semanticMap.map.map((item, idx) => (
                  <div key={idx} className="space-y-2 p-3 bg-muted/50 rounded-lg">
                    <h4 className="font-medium text-primary">{item.keyword}</h4>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Conceitos:</p>
                      <div className="flex flex-wrap gap-1">
                        {item.concepts?.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                    {item.metaphors?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Metáforas:</p>
                        <p className="text-sm">{item.metaphors.join(' • ')}</p>
                      </div>
                    )}
                    {item.foreign?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Palavras estrangeiras:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.foreign.map((f, i) => (
                            <span key={i} className="text-sm">
                              <strong>{f.word}</strong> ({f.language}) - {f.meaning}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {semanticMap.combinations?.length > 0 && (
                  <div className="space-y-2 p-3 bg-primary/5 rounded-lg">
                    <h4 className="font-medium">Sugestões de Combinações</h4>
                    <div className="flex flex-wrap gap-2">
                      {semanticMap.combinations.map((c, i) => (
                        <Badge key={i} variant="outline">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => setStep(4)} className="w-full">
                  <ChevronRight className="h-4 w-4 mr-2" /> Ir para Geração de Nomes
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 4: Generate Names */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" /> Etapa 4: Geração de Nomes
            </CardTitle>
            <CardDescription>
              A IA vai gerar sugestões baseadas em todo o contexto coletado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Arquétipo</p>
                <p className="font-medium">{selectedArchetype?.name || 'Não definido'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Tensão</p>
                <p className="font-medium line-clamp-1">{propulsor.tension || 'Não definida'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground">Palavras-chave</p>
                <p className="font-medium">{keywords.length} palavras</p>
              </div>
            </div>
            
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando nomes...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" /> Gerar Nomes com IA (3 créditos)</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Names List & Evaluation */}
      {step === 5 && names.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5" /> Etapa 5: Avaliação
            </h2>
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Gerar mais
            </Button>
          </div>

          <div className="grid gap-4">
            {names.map((name) => (
              <Card key={name.name_id} className={name.is_favorite ? 'border-yellow-500' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold">{name.name}</span>
                        {name.total_score > 0 && (
                          <Badge variant={name.total_score >= 70 ? 'default' : 'secondary'}>
                            {name.total_score}%
                          </Badge>
                        )}
                        {name.is_favorite && <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />}
                      </div>
                      <p className="text-muted-foreground mt-1">{name.meaning}</p>
                      {name.rationale && (
                        <p className="text-sm text-muted-foreground mt-2 italic">"{name.rationale}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleToggleFavorite(name.name_id)}>
                        {name.is_favorite ? <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setScoringName(name); setScores(name.scores || {}); }}>
                        Avaliar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteName(name.name_id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Scoring Dialog */}
      <Dialog open={!!scoringName} onOpenChange={() => setScoringName(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Avaliar: {scoringName?.name}</DialogTitle>
            <DialogDescription>Pontue cada critério de 1 a 10</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {criteria.map(c => (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{c.name}</Label>
                  <span className="text-sm font-medium">{scores[c.id] || 5}</span>
                </div>
                <Slider
                  value={[scores[c.id] || 5]}
                  onValueChange={([v]) => setScores({...scores, [c.id]: v})}
                  min={1}
                  max={10}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">{c.description}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScoringName(null)}>Cancelar</Button>
            <Button onClick={handleScore}>Salvar Avaliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
