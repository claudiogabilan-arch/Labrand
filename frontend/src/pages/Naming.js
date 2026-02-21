import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Sparkles, Plus, Trash2, Loader2, Star, StarOff,
  Wand2, Target, Users, Building2, Lightbulb, 
  ArrowRight, CheckCircle2, ChevronRight, Save
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
  const [step, setStep] = useState(1);
  const [showNewProject, setShowNewProject] = useState(false);
  const [scoringName, setScoringName] = useState(null);
  const [scores, setScores] = useState({});
  
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

  useEffect(() => {
    if (currentBrand) {
      loadData();
      loadCriteria();
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

  const loadProject = async (projectId) => {
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/naming/${projectId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setCurrentProject(response.data.project);
      setNames(response.data.names || []);
      setStep(response.data.project.status === 'draft' ? 1 : 2);
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
      loadData();
    } catch (error) {
      toast.error('Erro ao criar projeto');
    } finally {
      setSaving(false);
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
      setStep(2);
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
              <p className="text-muted-foreground mb-4">Crie seu primeiro projeto para começar a gerar nomes</p>
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
                    <Badge variant={project.status === 'generated' ? 'default' : 'secondary'}>
                      {project.status === 'generated' ? 'Gerado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {project.names_generated} nomes gerados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.context?.business_description}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                    <span>{new Date(project.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
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
                <Wand2 className="h-5 w-5" /> Novo Projeto de Naming
              </DialogTitle>
              <DialogDescription>
                Preencha o contexto do negócio para gerar sugestões de nomes
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estilo de Nome</Label>
                  <Select value={formData.name_style} onValueChange={(v) => setFormData({...formData, name_style: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STYLES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewProject(false)}>Cancelar</Button>
              <Button onClick={handleCreateProject} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Criar Projeto
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Project detail view
  return (
    <div className="space-y-6" data-testid="naming-project">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { setCurrentProject(null); setNames([]); }}>
            ← Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentProject.project_name}</h1>
            <p className="text-muted-foreground text-sm">
              {currentProject.context?.business_description?.slice(0, 100)}...
            </p>
          </div>
        </div>
        <Badge variant={currentProject.status === 'generated' ? 'default' : 'secondary'}>
          {names.length} nomes
        </Badge>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-muted'}`}>
            1
          </div>
          <span className="font-medium">Contexto</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-muted'}`}>
            2
          </div>
          <span className="font-medium">Gerar Nomes</span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-white' : 'bg-muted'}`}>
            3
          </div>
          <span className="font-medium">Avaliar</span>
        </div>
      </div>

      {/* Step 1: Context Summary */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Contexto do Projeto</CardTitle>
            <CardDescription>Revise as informações antes de gerar os nomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Público-alvo</Label>
                <p>{currentProject.context?.target_audience}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Tom</Label>
                <p className="capitalize">{currentProject.context?.tone}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Estilo</Label>
                <p className="capitalize">{currentProject.context?.name_style}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Percepções</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentProject.context?.desired_perception?.map(p => (
                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>
            </div>
            
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Gerando nomes...</>
              ) : (
                <><Wand2 className="h-4 w-4 mr-2" /> Gerar Nomes com IA (3 créditos)</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2+: Names List */}
      {step >= 2 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Nomes Gerados</h2>
            <Button variant="outline" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
              Gerar mais
            </Button>
          </div>

          <div className="grid gap-4">
            {names.map((name, idx) => (
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
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleToggleFavorite(name.name_id)}
                      >
                        {name.is_favorite ? <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" /> : <StarOff className="h-4 w-4" />}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setScoringName(name); setScores(name.scores || {}); }}
                      >
                        Avaliar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteName(name.name_id)}
                      >
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
