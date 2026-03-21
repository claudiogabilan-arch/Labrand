import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, Plus, ChevronRight, ChevronLeft, ChevronDown,
  Check, Download, Trash2, Target, Zap, Network, Sparkles,
  Volume2, Globe, Star, RotateCcw, Search, X
} from 'lucide-react';
import axios from 'axios';
import {
  PROVOCACOES, ARCHETYPES, LANG_OPTIONS, TENSIONS, PERCEPTIONS,
  STEPS, EVAL_CRITERIA
} from '../data/namingData';
import {
  generateNames as genNames, getMeaning, analyzePhone, splitSyl,
  checkGlobal, exportReportTxt
} from '../utils/namingUtils';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEP_ICONS = [Target, Zap, Network, Sparkles, Volume2, Globe, Star];

const TONES = ['', 'Moderno', 'Clássico', 'Divertido', 'Sério / Profissional', 'Sofisticado', 'Acessível'];
const STYLES = ['', 'Criativo / Inventado', 'Descritivo', 'Abstrato', 'Acrônimo / Sigla', 'Metáfora'];

function defaultState() {
  return {
    step: 1,
    project: { name: '', desc: '', mission: '', audience: '', values: [], competitors: '', perceptions: [], tone: '', style: '', language: 'pt' },
    archetype: '', tension: '', keywords: [],
    generatedNames: [], selectedNames: [], evaluations: {},
    provOpen: { inspiracao: false, construcao: false, implementacao: false }
  };
}

export default function Naming() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [S, setS] = useState(defaultState);
  const [langOpen, setLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState('');
  const langRef = useRef(null);
  const saveTimeout = useRef(null);

  // Load projects list
  useEffect(() => {
    if (currentBrand) loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand]);

  // Close language dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-save debounce
  const autoSave = useCallback(() => {
    if (!currentProjectId) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveProject(false);
    }, 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, S]);

  useEffect(() => {
    if (currentProjectId) autoSave();
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S, currentProjectId]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/brands/${currentBrand.brand_id}/naming`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(res.data.projects || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const loadProject = async (projectId) => {
    try {
      const res = await axios.get(`${API}/brands/${currentBrand.brand_id}/naming/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const p = res.data.project;
      setCurrentProjectId(projectId);
      setShowWizard(true);
      setS({
        step: p.state?.step || 1,
        project: p.state?.project || { name: p.project_name || '', desc: '', mission: '', audience: '', values: [], competitors: '', perceptions: [], tone: '', style: '', language: 'pt' },
        archetype: p.state?.archetype || '',
        tension: p.state?.tension || '',
        keywords: p.state?.keywords || [],
        generatedNames: p.state?.generatedNames || [],
        selectedNames: p.state?.selectedNames || [],
        evaluations: p.state?.evaluations || {},
        provOpen: p.state?.provOpen || { inspiracao: false, construcao: false, implementacao: false }
      });
    } catch {
      toast.error('Erro ao carregar projeto');
    }
  };

  const saveProject = async (showToast = true) => {
    if (!currentProjectId || !currentBrand) return;
    setSaving(true);
    try {
      await axios.put(`${API}/brands/${currentBrand.brand_id}/naming/${currentProjectId}/state`, {
        state: S,
        project_name: S.project.name
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (showToast) toast.success('Projeto salvo!');
    } catch {
      if (showToast) toast.error('Erro ao salvar');
    }
    setSaving(false);
  };

  const createProject = async () => {
    if (!S.project.name.trim()) {
      toast.error('Preencha o nome do projeto');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/brands/${currentBrand.brand_id}/naming`, {
        project_name: S.project.name,
        state: S
      }, { headers: { Authorization: `Bearer ${token}` } });
      setCurrentProjectId(res.data.project_id);
      toast.success('Projeto criado!');
      loadProjects();
    } catch {
      toast.error('Erro ao criar projeto');
    }
    setSaving(false);
  };

  const deleteProject = async (projectId, e) => {
    e.stopPropagation();
    if (!window.confirm('Apagar este projeto?')) return;
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/naming/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(prev => prev.filter(p => p.project_id !== projectId));
      if (currentProjectId === projectId) {
        setCurrentProjectId(null);
        setShowWizard(false);
        setS(defaultState());
      }
      toast.success('Projeto removido');
    } catch {
      toast.error('Erro ao remover');
    }
  };

  // State updaters
  const updateProject = (key, val) => setS(prev => ({ ...prev, project: { ...prev.project, [key]: val } }));
  const updateField = (key, val) => setS(prev => ({ ...prev, [key]: val }));

  // Validation
  const validate = () => {
    if (S.step === 1) {
      if (!S.project.name.trim()) { toast.error('Preencha o nome do projeto'); return false; }
      if (!S.project.desc.trim()) { toast.error('Preencha a descrição do negócio'); return false; }
      if (!S.project.audience.trim()) { toast.error('Preencha o público-alvo'); return false; }
    }
    if (S.step === 2 && !S.archetype) { toast.error('Escolha um arquétipo'); return false; }
    return true;
  };

  const goNext = () => {
    if (!validate()) return;
    if (S.step === 7) { exportReportTxt(S); return; }
    // Create project on first advance if not yet created
    if (S.step === 1 && !currentProjectId) {
      createProject().then(() => setS(prev => ({ ...prev, step: prev.step + 1 })));
      return;
    }
    setS(prev => ({ ...prev, step: prev.step + 1 }));
  };
  const goPrev = () => setS(prev => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  const goStep = (n) => { if (n <= S.step) setS(prev => ({ ...prev, step: n })); };

  // Tag helpers
  const addValue = (val) => {
    const v = val.trim().replace(/,$/, '');
    if (v && !S.project.values.includes(v)) updateProject('values', [...S.project.values, v]);
  };
  const removeValue = (v) => updateProject('values', S.project.values.filter(x => x !== v));
  const togglePerception = (p) => {
    const percs = S.project.perceptions.includes(p) ? S.project.perceptions.filter(x => x !== p) : [...S.project.perceptions, p];
    updateProject('perceptions', percs);
  };
  const addKeyword = (val) => {
    const v = val.trim().replace(/,$/, '');
    if (v && !S.keywords.includes(v)) updateField('keywords', [...S.keywords, v]);
  };
  const removeKeyword = (k) => updateField('keywords', S.keywords.filter(x => x !== k));

  // Generation
  const handleGenerate = () => {
    const names = genNames(S);
    setS(prev => ({ ...prev, generatedNames: names, selectedNames: [] }));
    toast.success(`${names.length} nomes gerados!`);
  };

  const toggleName = (word) => {
    setS(prev => {
      const sel = prev.selectedNames.includes(word)
        ? prev.selectedNames.filter(n => n !== word)
        : [...prev.selectedNames, word];
      return { ...prev, selectedNames: sel };
    });
  };

  // Evaluation
  const getStar = (name, key) => ((S.evaluations[name] || {})[key]) || 0;
  const setStar = (name, key, val) => {
    setS(prev => {
      const evals = { ...prev.evaluations };
      if (!evals[name]) evals[name] = {};
      evals[name] = { ...evals[name], [key]: evals[name][key] === val ? 0 : val };
      return { ...prev, evaluations: evals };
    });
  };
  const scoreName = (name) => EVAL_CRITERIA.reduce((s, c) => s + getStar(name, c.k), 0);
  const removeName = (name) => {
    setS(prev => ({
      ...prev,
      selectedNames: prev.selectedNames.filter(n => n !== name),
      generatedNames: prev.generatedNames.filter(n => n.word !== name),
      evaluations: (() => { const e = { ...prev.evaluations }; delete e[name]; return e; })()
    }));
  };

  // Toggle provocations
  const toggleProv = (key) => {
    setS(prev => ({ ...prev, provOpen: { ...prev.provOpen, [key]: !prev.provOpen[key] } }));
  };

  // Reset
  const resetSession = () => {
    if (!window.confirm('Apagar todos os dados da sessão atual?')) return;
    setS(defaultState());
    setCurrentProjectId(null);
    setShowWizard(false);
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="naming-no-brand">
        <p className="text-muted-foreground">Selecione uma marca primeiro</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="naming-loading">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  // ── PROJECT LIST ──
  if (!showWizard) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="naming-projects-list">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-heading">Ferramenta de Naming</h1>
            <p className="text-muted-foreground text-sm">Crie nomes memoráveis com metodologia estruturada</p>
          </div>
          <Button data-testid="naming-new-project-btn" onClick={() => { setS(defaultState()); setCurrentProjectId(null); setShowWizard(true); }} className="bg-foreground text-background hover:bg-foreground/90">
            <Plus className="h-4 w-4 mr-2" /> Novo Projeto
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Sparkles className="h-10 w-10 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto de naming</h3>
              <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro projeto para começar a jornada</p>
              <Button onClick={() => { setS(defaultState()); setCurrentProjectId(null); setShowWizard(true); }} className="bg-foreground text-background hover:bg-foreground/90">
                <Plus className="h-4 w-4 mr-2" /> Criar Projeto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Card key={p.project_id} className="cursor-pointer card-hover group" onClick={() => loadProject(p.project_id)} data-testid={`naming-project-${p.project_id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold truncate flex-1">{p.project_name || 'Sem nome'}</h3>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 -mt-1 -mr-2 h-7 w-7 p-0" onClick={(e) => deleteProject(p.project_id, e)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                    {p.state?.project?.desc || 'Projeto em andamento'}
                  </p>
                  <div className="flex items-center gap-2">
                    {p.state?.archetype && (
                      <Badge variant="outline" className="text-xs">
                        {ARCHETYPES.find(a => a.id === p.state.archetype)?.name || p.state.archetype}
                      </Badge>
                    )}
                    {p.state?.generatedNames?.length > 0 && (
                      <Badge className="text-xs bg-secondary/10 text-secondary border-secondary/20">
                        {p.state.generatedNames.length} nomes
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">Etapa {p.state?.step || 1}/7</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── WIZARD VIEW ──
  const currentStep = STEPS[S.step - 1];
  const arch = ARCHETYPES.find(a => a.id === S.archetype);
  const langOpt = LANG_OPTIONS.find(l => l.id === S.project.language) || LANG_OPTIONS[1];
  const filteredLangs = langSearch ? LANG_OPTIONS.filter(l => l.name.toLowerCase().includes(langSearch.toLowerCase())) : LANG_OPTIONS;

  return (
    <div className="animate-fade-in" data-testid="naming-wizard">
      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <button onClick={() => { setCurrentProjectId(null); setShowWizard(false); setS(defaultState()); }} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="naming-back-btn">
            <ChevronLeft className="h-4 w-4 inline -mt-0.5" /> Projetos
          </button>
          <span className="text-border">|</span>
          <span className="text-sm font-medium truncate max-w-[200px]">{S.project.name || 'Novo Projeto'}</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Salvando...</span>}
          <Button variant="ghost" size="sm" onClick={resetSession} className="text-xs text-muted-foreground" data-testid="naming-reset-btn">
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Nova Sessão
          </Button>
        </div>
      </div>

      {/* ── PROGRESS BAR ── */}
      <div className="flex items-center gap-0 overflow-x-auto pb-3 mb-6 border-b" data-testid="naming-progress-bar">
        {STEPS.map((s, i) => {
          const done = s.n < S.step;
          const active = s.n === S.step;
          const StepIcon = STEP_ICONS[i];
          return (
            <div key={s.n} className="flex items-center">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-border mx-0.5 flex-shrink-0" />}
              <button
                onClick={() => goStep(s.n)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-all border-b-2 -mb-[13px] ${
                  active ? 'text-foreground border-secondary' :
                  done ? 'text-foreground border-transparent cursor-pointer' :
                  'text-muted-foreground border-transparent'
                }`}
                data-testid={`naming-step-${s.n}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                  done ? 'bg-foreground text-background' :
                  active ? 'border-2 border-secondary text-secondary' :
                  'border border-border text-muted-foreground'
                }`}>
                  {done ? <Check className="h-3 w-3" /> : s.n}
                </span>
                {s.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── STAGE HEADER ── */}
      <div className="mb-6">
        <Badge variant="outline" className="mb-2 text-secondary border-secondary/30 bg-secondary/5 text-xs font-semibold">
          Etapa {currentStep.n}
        </Badge>
        <h2 className="text-xl font-bold font-heading">{currentStep.sub}</h2>
        <p className="text-sm text-muted-foreground">{currentStep.desc}</p>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-[860px] space-y-4 pb-24">
        {S.step === 1 && <Step1 S={S} updateProject={updateProject} addValue={addValue} removeValue={removeValue} togglePerception={togglePerception} langOpt={langOpt} langOpen={langOpen} setLangOpen={setLangOpen} langSearch={langSearch} setLangSearch={setLangSearch} filteredLangs={filteredLangs} langRef={langRef} toggleProv={toggleProv} />}
        {S.step === 2 && <Step2 S={S} updateField={updateField} toggleProv={toggleProv} />}
        {S.step === 3 && <Step3 S={S} arch={arch} addKeyword={addKeyword} removeKeyword={removeKeyword} toggleProv={toggleProv} />}
        {S.step === 4 && <Step4 S={S} arch={arch} langOpt={langOpt} handleGenerate={handleGenerate} toggleName={toggleName} />}
        {S.step === 5 && <Step5 S={S} />}
        {S.step === 6 && <Step6 S={S} />}
        {S.step === 7 && <Step7 S={S} getStar={getStar} setStar={setStar} scoreName={scoreName} removeName={removeName} toggleProv={toggleProv} />}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-50 px-6 py-3 flex items-center justify-between" data-testid="naming-bottom-nav">
        <Button variant="ghost" onClick={goPrev} className={S.step <= 1 ? 'invisible' : ''} data-testid="naming-prev-btn">
          <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <span className="text-xs text-muted-foreground">Etapa {S.step} de 7</span>
        <Button onClick={goNext} className="bg-foreground text-background hover:bg-foreground/90" data-testid="naming-next-btn">
          {S.step === 7 ? (
            <><Download className="h-4 w-4 mr-1" /> Exportar Relatório</>
          ) : (
            <>Próxima Etapa <ChevronRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── STEP 1: ESSÊNCIA ──
function Step1({ S, updateProject, addValue, removeValue, togglePerception, langOpt, langOpen, setLangOpen, langSearch, setLangSearch, filteredLangs, langRef, toggleProv }) {
  const [valInput, setValInput] = useState('');
  const p = S.project;

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium">Nome do Projeto <span className="text-secondary">*</span></label>
              <Input data-testid="naming-field-name" placeholder="Ex: Nome para novo produto" value={p.name} onChange={e => updateProject('name', e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium">Descrição do Negócio <span className="text-secondary">*</span></label>
              <Textarea data-testid="naming-field-desc" placeholder="Descreva o que a empresa/produto faz..." value={p.desc} onChange={e => updateProject('desc', e.target.value)} rows={3} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Missão</label>
              <Input placeholder="Missão da empresa" value={p.mission} onChange={e => updateProject('mission', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Público-alvo <span className="text-secondary">*</span></label>
              <Input data-testid="naming-field-audience" placeholder="Quem são seus clientes" value={p.audience} onChange={e => updateProject('audience', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Valores da Marca</label>
              <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-secondary/20" onClick={() => document.getElementById('val-input')?.focus()}>
                {p.values.map(v => (
                  <span key={v} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs font-medium">
                    {v}
                    <button onClick={(e) => { e.stopPropagation(); removeValue(v); }} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                <input id="val-input" className="flex-1 min-w-[100px] bg-transparent outline-none text-sm" placeholder="Adicionar valor..." value={valInput}
                  onChange={e => setValInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addValue(valInput); setValInput(''); } }} />
              </div>
              <p className="text-[10px] text-muted-foreground">Enter ou vírgula para adicionar</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Concorrentes</label>
              <Input placeholder="Empresa A, Empresa B" value={p.competitors} onChange={e => updateProject('competitors', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Tom da Marca</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={p.tone} onChange={e => updateProject('tone', e.target.value)}>
                {TONES.map(t => <option key={t} value={t}>{t || 'Selecione...'}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Estilo de Nome</label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm bg-background" value={p.style} onChange={e => updateProject('style', e.target.value)}>
                {STYLES.map(t => <option key={t} value={t}>{t || 'Selecione...'}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perception Tags */}
      <Card>
        <CardContent className="p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">Percepção Desejada</p>
          <div className="flex flex-wrap gap-2">
            {PERCEPTIONS.map(pp => (
              <button key={pp} onClick={() => togglePerception(pp)} data-testid={`naming-perc-${pp}`}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                  p.perceptions.includes(pp)
                    ? 'bg-secondary/10 border-secondary text-secondary'
                    : 'border-border text-muted-foreground hover:border-secondary/50 hover:text-foreground'
                }`}>
                {pp}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Language Selector */}
      <Card>
        <CardContent className="p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">Idioma dos Nomes</p>
          <div className="relative" ref={langRef}>
            <button onClick={() => setLangOpen(!langOpen)} data-testid="naming-lang-btn"
              className={`w-full flex items-center gap-2 px-3 py-2.5 border rounded-lg transition-colors ${langOpen ? 'border-secondary' : 'border-border hover:border-secondary/50'}`}>
              <span className="text-lg">{langOpt.flag}</span>
              <span className="text-sm font-medium flex-1 text-left">{langOpt.name}</span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${langOpen ? 'rotate-180' : ''}`} />
            </button>
            {langOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-secondary rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input className="flex-1 bg-transparent outline-none text-sm" placeholder="Buscar idioma..." value={langSearch} onChange={e => setLangSearch(e.target.value)} autoFocus />
                </div>
                <div className="max-h-[240px] overflow-y-auto py-1">
                  {filteredLangs.map(l => (
                    <button key={l.id} onClick={() => { updateProject('language', l.id); setLangOpen(false); setLangSearch(''); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors ${p.language === l.id ? 'bg-secondary/5' : ''}`}>
                      <span className="text-base">{l.flag}</span>
                      <span className={`flex-1 text-left font-medium ${p.language === l.id ? 'text-secondary' : ''}`}>{l.name}</span>
                      {p.language === l.id && <Check className="h-4 w-4 text-secondary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ProvocationsSection sectionKey="inspiracao" label="Inspiração" items={PROVOCACOES.filter(p => p.n <= 7)} open={S.provOpen.inspiracao} toggle={toggleProv} />
    </>
  );
}

// ── STEP 2: PROPULSOR ──
function Step2({ S, updateField, toggleProv }) {
  return (
    <>
      <Card>
        <CardContent className="p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">Escolha o Arquétipo da Marca</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {ARCHETYPES.map(a => (
              <button key={a.id} onClick={() => updateField('archetype', S.archetype === a.id ? '' : a.id)}
                data-testid={`naming-arch-${a.id}`}
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  S.archetype === a.id
                    ? 'border-secondary bg-secondary/5 shadow-[0_0_0_3px_hsl(var(--secondary)/0.15)]'
                    : 'border-border hover:border-secondary/40'
                }`}>
                <div className={`text-sm font-bold mb-0.5 ${S.archetype === a.id ? 'text-secondary' : ''}`}>{a.name}</div>
                <div className="text-[11px] text-muted-foreground">{a.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Tensão Criativa Central</p>
          <p className="text-xs text-muted-foreground">Qual é o paradoxo ou tensão que define sua marca?</p>
          <Textarea data-testid="naming-tension-input" placeholder="Ex: Ser inovador mantendo tradição, ser premium sendo acessível..." value={S.tension} onChange={e => updateField('tension', e.target.value)} rows={2} />
          <div className="flex flex-wrap gap-1.5">
            {TENSIONS.map(t => (
              <button key={t} onClick={() => updateField('tension', t)}
                className="px-3 py-1 rounded-full text-xs border border-border text-muted-foreground hover:border-secondary/50 hover:text-secondary transition-all">
                {t}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ── STEP 3: SEMÂNTICO ──
function Step3({ S, arch, addKeyword, removeKeyword, toggleProv }) {
  const [kwInput, setKwInput] = useState('');
  const bl = S.project.language === 'mix' ? 'pt' : (S.project.language || 'pt');
  const suggestions = arch ? (arch.words[bl] || arch.words.pt).filter(w => !S.keywords.includes(w)) : [];

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Palavras-chave do Universo da Marca</p>
          <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[42px] cursor-text focus-within:ring-2 focus-within:ring-secondary/20" onClick={() => document.getElementById('kw-input')?.focus()}>
            {S.keywords.map(k => (
              <span key={k} className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-xs font-medium">
                {k}
                <button onClick={(e) => { e.stopPropagation(); removeKeyword(k); }} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
            <input id="kw-input" data-testid="naming-kw-input" className="flex-1 min-w-[120px] bg-transparent outline-none text-sm" placeholder="Ex: transformação, conexão, velocidade..." value={kwInput}
              onChange={e => setKwInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(kwInput); setKwInput(''); } }} />
          </div>
          <p className="text-[10px] text-muted-foreground">Enter ou vírgula para adicionar</p>

          {suggestions.length > 0 && (
            <div className="pt-2">
              <p className="text-[10px] font-semibold text-muted-foreground mb-2">Sugestões — arquétipo {arch.name}:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(w => (
                  <button key={w} onClick={() => addKeyword(w)}
                    className="px-3 py-1 rounded-full text-xs border border-border text-muted-foreground hover:border-secondary/50 hover:text-secondary hover:bg-secondary/5 transition-all before:content-['+_'] before:text-secondary before:font-bold">
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Context Summary */}
      <Card>
        <CardContent className="p-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">Resumo do Contexto</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { l: 'Projeto', v: S.project.name },
              { l: 'Arquétipo', v: arch?.name || '—' },
              { l: 'Tom', v: S.project.tone || '—' },
              { l: 'Estilo', v: S.project.style || '—' },
              { l: 'Idioma', v: LANG_OPTIONS.find(l => l.id === S.project.language)?.name || 'Português' }
            ].map(item => (
              <div key={item.l}>
                <div className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{item.l}</div>
                <div className="text-sm font-semibold">{item.v}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ProvocationsSection sectionKey="construcao" label="Construção" items={PROVOCACOES.filter(p => p.n >= 8 && p.n <= 14)} open={S.provOpen.construcao} toggle={toggleProv} />
    </>
  );
}

// ── STEP 4: GERAÇÃO ──
function Step4({ S, arch, langOpt, handleGenerate, toggleName }) {
  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 bg-muted/50 rounded-lg">
            {[
              { l: 'Arquétipo', v: arch?.name || '—' },
              { l: 'Idioma', v: `${langOpt.flag} ${langOpt.name}` },
              { l: 'Palavras-chave', v: `${S.keywords.length} palavras` },
              { l: 'Tensão', v: S.tension ? (S.tension.length > 28 ? S.tension.slice(0, 28) + '...' : S.tension) : '—' }
            ].map(item => (
              <div key={item.l}>
                <div className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">{item.l}</div>
                <div className="text-sm font-semibold">{item.v}</div>
              </div>
            ))}
          </div>
          <button onClick={handleGenerate} data-testid="naming-generate-btn"
            className="w-full flex items-center justify-center gap-2 bg-foreground text-background rounded-xl py-3.5 text-sm font-semibold hover:bg-foreground/90 transition-colors">
            <Sparkles className="h-4 w-4" />
            {S.generatedNames.length ? 'Gerar Novos Nomes' : 'Gerar Nomes'}
          </button>
          {!S.keywords.length && !S.archetype && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">Dica: Adicione palavras-chave na Etapa 3 e selecione um arquétipo na Etapa 2 para resultados melhores.</p>
          )}
        </CardContent>
      </Card>

      {S.generatedNames.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-3">
              Nomes Gerados — clique para selecionar
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {S.generatedNames.map(n => {
                const sel = S.selectedNames.includes(n.word);
                const meaning = getMeaning(n.word);
                return (
                  <button key={n.word} onClick={() => toggleName(n.word)}
                    data-testid={`naming-name-${n.word}`}
                    className={`text-left p-3.5 rounded-xl border transition-all relative ${
                      sel ? 'border-secondary bg-secondary/5' : 'border-border hover:border-secondary/40'
                    }`}>
                    {sel && <span className="absolute top-2.5 right-2.5 text-secondary"><Check className="h-3.5 w-3.5" /></span>}
                    <div className={`text-lg font-extrabold tracking-tight mb-0.5 ${sel ? 'text-secondary' : ''}`}>{n.word}</div>
                    <div className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground mb-1">{n.tech}</div>
                    {meaning && <div className="text-[10px] text-muted-foreground border-t pt-1.5 mt-1.5 leading-relaxed">{meaning}</div>}
                  </button>
                );
              })}
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              <strong className="text-secondary">{S.selectedNames.length}</strong> nomes selecionados para avaliação
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

// ── STEP 5: SONORO ──
function Step5({ S }) {
  const names = S.selectedNames.length ? S.selectedNames : S.generatedNames.map(n => n.word).slice(0, 6);
  if (!names.length) return <EmptyState icon={<Volume2 className="h-8 w-8" />} title="Nenhum nome selecionado" desc="Volte e selecione nomes na etapa de geração." />;

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-4">Análise Fonética</p>
        <div className="space-y-3">
          {names.map(name => {
            const a = analyzePhone(name);
            return (
              <div key={name} className="p-4 border rounded-xl" data-testid={`naming-phonetic-${name}`}>
                <div className="text-xl font-extrabold tracking-tight mb-2.5">{name}</div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <PhBadge type={a.syl <= 3 ? 'good' : a.syl <= 4 ? 'warn' : 'bad'}>{a.syl} sílabas</PhBadge>
                  <PhBadge type={a.mem ? 'good' : 'warn'}>{a.mem ? 'Memorável' : 'Médio'}</PhBadge>
                  <PhBadge type={a.pron === 'Fácil' ? 'good' : a.pron === 'Médio' ? 'warn' : 'bad'}>{a.pron}</PhBadge>
                  <PhBadge type={a.fb}>{a.flow}</PhBadge>
                  {a.rhy && <PhBadge type="good">Rítmico</PhBadge>}
                  {a.alit && <PhBadge type="good">Aliteração</PhBadge>}
                </div>
                <p className="text-xs text-muted-foreground italic">Pronúncia: {splitSyl(name)}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── STEP 6: GLOBAL ──
function Step6({ S }) {
  const names = S.selectedNames.length ? S.selectedNames : S.generatedNames.map(n => n.word).slice(0, 6);
  if (!names.length) return <EmptyState icon={<Globe className="h-8 w-8" />} title="Nenhum nome selecionado" desc="Volte e selecione nomes na etapa de geração." />;

  const langs = [{ f: '🇧🇷', n: 'PT' }, { f: '🇺🇸', n: 'EN' }, { f: '🇪🇸', n: 'ES' }, { f: '🇫🇷', n: 'FR' }, { f: '🇩🇪', n: 'DE' }, { f: '🇨🇳', n: 'ZH' }];

  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1">Verificação Internacional</p>
        <p className="text-xs text-muted-foreground mb-4">Verifique se os nomes não possuem conotações negativas nos principais idiomas.</p>
        <div className="space-y-3">
          {names.map(name => (
            <div key={name} className="p-4 border rounded-xl" data-testid={`naming-global-${name}`}>
              <div className="text-xl font-extrabold tracking-tight mb-3">{name}</div>
              <div className="flex flex-wrap gap-2">
                {langs.map(l => {
                  const result = checkGlobal(name, l.n);
                  return (
                    <div key={l.n} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs ${
                      result.status === 'ok' ? 'bg-muted border-border' : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                    }`}>
                      <span>{l.f}</span>
                      <span className="font-medium">{l.n}:</span>
                      <strong>{result.status === 'ok' ? '✓' : '⚠️'} {result.text}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── STEP 7: AVALIAÇÃO ──
function Step7({ S, getStar, setStar, scoreName, removeName, toggleProv }) {
  const names = S.selectedNames.length ? S.selectedNames : S.generatedNames.map(n => n.word).slice(0, 6);
  if (!names.length) return <EmptyState icon={<Star className="h-8 w-8" />} title="Nenhum nome para avaliar" desc="Volte e gere ou selecione nomes primeiro." />;

  const sorted = [...names].sort((a, b) => scoreName(b) - scoreName(a));

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{sorted.length} nomes · máx <strong>25 pts</strong></p>
        <Button variant="outline" size="sm" onClick={() => exportReportTxt(S)} data-testid="naming-export-btn">
          <Download className="h-3.5 w-3.5 mr-1" /> Exportar .txt
        </Button>
      </div>

      <div className="space-y-3">
        {sorted.map(name => {
          const sc = scoreName(name);
          const meaning = getMeaning(name);
          const found = S.generatedNames.find(n => n.word === name);
          return (
            <Card key={name}>
              <CardContent className="p-5" data-testid={`naming-eval-${name}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-2xl font-extrabold tracking-tight">{name}</div>
                    {meaning && <div className="text-xs text-muted-foreground mt-0.5">{meaning}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-extrabold text-secondary">{sc}</div>
                    <div className="text-xs text-muted-foreground">/ 25 pts</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
                  {EVAL_CRITERIA.map(c => (
                    <div key={c.k}>
                      <div className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground mb-1">{c.l}</div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <button key={i} onClick={() => setStar(name, c.k, i)}
                            className={`text-base transition-colors ${getStar(name, c.k) >= i ? 'text-secondary' : 'text-border hover:text-secondary/40'}`}>
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-[11px] text-muted-foreground">Técnica: {found?.tech || '—'}</span>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7" onClick={() => removeName(name)}>
                    <Trash2 className="h-3 w-3 mr-1" /> Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ProvocationsSection sectionKey="implementacao" label="Implementação" items={PROVOCACOES.filter(p => p.n >= 15)} open={S.provOpen.implementacao} toggle={toggleProv} />
    </>
  );
}

// ── SHARED COMPONENTS ──

function ProvocationsSection({ sectionKey, label, items, open, toggle }) {
  return (
    <div className="mt-4">
      <button onClick={() => toggle(sectionKey)} data-testid={`naming-prov-${sectionKey}`}
        className="w-full flex items-center justify-between p-4 border rounded-xl hover:border-secondary/40 transition-colors">
        <span className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          Provocações — {label}
          <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/5 text-[10px] font-semibold">{items.length} perguntas</Badge>
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2.5 mt-2.5">
          {items.map(p => (
            <div key={p.n} className="p-4 border rounded-xl border-l-[3px] border-l-secondary">
              <div className="text-[9px] font-bold tracking-widest uppercase text-secondary mb-1.5">Provocação {String(p.n).padStart(2, '0')} · {p.cat}</div>
              <div className="text-sm font-bold mb-2 leading-snug">{p.q}</div>
              <div className="text-xs text-muted-foreground leading-relaxed">{p.txt}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhBadge({ type, children }) {
  const styles = {
    good: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400',
    warn: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400',
    bad: 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-800 dark:text-rose-400'
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${styles[type] || styles.good}`}>{children}</span>;
}

function EmptyState({ icon, title, desc }) {
  return (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="text-muted-foreground/40 mx-auto mb-3 flex justify-center">{icon}</div>
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
