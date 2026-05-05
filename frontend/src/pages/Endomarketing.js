import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
} from 'recharts';
import {
  Flame, Zap, Award, TrendingUp, Target, DollarSign, Heart, Sparkles,
  Trophy, Star, Users, UserCheck, Gamepad2, Loader2, FileDown, RefreshCw,
} from 'lucide-react';
import { SkeletonCard } from '../components/ui/skeleton-patterns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PILLARS = [
  { key: 'engajamento',      label: 'Engajamento',      icon: Zap },
  { key: 'meritocracia',     label: 'Meritocracia',     icon: Award },
  { key: 'alta_performance', label: 'Alta Performance', icon: TrendingUp },
  { key: 'resultados',       label: 'Resultados',       icon: Target },
  { key: 'economia',         label: 'Economia',         icon: DollarSign },
  { key: 'pertencimento',    label: 'Pertencimento',    icon: Heart },
];

const LIKERT = [
  { value: 0, label: 'Nunca' },
  { value: 1, label: 'Raramente' },
  { value: 2, label: 'Às vezes' },
  { value: 3, label: 'Frequentemente' },
  { value: 4, label: 'Sempre' },
];

const LEVEL_META = {
  'Marca em Risco':       { color: 'bg-red-500',    text: 'text-red-500',    desc: 'Cultura fraca e desengajamento alto. Ação imediata necessária.' },
  'Marca em Construção':  { color: 'bg-orange-500', text: 'text-orange-500', desc: 'A base existe, mas falta sistema e consistência.' },
  'Marca em Movimento':   { color: 'bg-yellow-500', text: 'text-yellow-500', desc: 'Cultura presente, mas sem operação regular.' },
  'Marca Viva':           { color: 'bg-emerald-500',text: 'text-emerald-500',desc: 'Cultura operacional. Pronta para escalar com gamificação.' },
};

const TRILHA_COLORS = ['border-blue-500/40 bg-blue-500/5', 'border-emerald-500/40 bg-emerald-500/5', 'border-orange-500/40 bg-orange-500/5'];

// ── Reusable header (sticky across tabs) ────────────────────────────────
function MethodHeader() {
  return (
    <div className="space-y-2">
      <Badge variant="outline" className="gap-1.5 px-2.5 py-0.5 border-orange-500/40 text-orange-500 bg-orange-500/5">
        <Flame className="h-3 w-3" />
        Metodologia Sandro Serzedello · Cofundador LaBrand
      </Badge>
      <h1 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">De Dentro Pra Fora</h1>
      <p className="text-base text-muted-foreground">Diagnóstico de Endomarketing & Cultura de Marca</p>
      <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed pt-1">
        A marca forte começa quando a liderança é convertida em cultura, a cultura em operação — e a operação é
        medida, reconhecida e celebrada de dentro pra fora.
      </p>
    </div>
  );
}

// ── Tab 1 — Diagnostic questionnaire ────────────────────────────────────
function DiagnosticTab({ questions, answers, setAnswers, onSubmit, hasExisting, saving }) {
  const total = questions.length;
  const answered = Object.keys(answers).length;
  const pct = total ? Math.round((answered / total) * 100) : 0;

  const grouped = questions.reduce((acc, q, i) => {
    acc[q.pilar] = acc[q.pilar] || [];
    acc[q.pilar].push({ ...q, idx: i });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Pilar mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="pilar-cards">
        {PILLARS.map(p => {
          const Icon = p.icon;
          return (
            <div key={p.key} className="rounded-lg border border-border/60 px-3 py-3 flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium leading-tight">{p.label}</span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2 pt-2" data-testid="diagnostic-progress">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progresso do diagnóstico</span>
          <span className="font-medium tabular-nums">{answered} / {total} ({pct}%)</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {/* Questions grouped by pillar */}
      {PILLARS.map(p => {
        const items = grouped[p.key] || [];
        if (!items.length) return null;
        const Icon = p.icon;
        return (
          <div key={p.key} className="space-y-3" data-testid={`pilar-section-${p.key}`}>
            <div className="flex items-center gap-2 pt-2">
              <Icon className="h-4 w-4 text-primary" />
              <h3 className="font-heading text-sm uppercase tracking-wider font-semibold">{p.label}</h3>
              <div className="flex-1 h-px bg-border/60" />
            </div>
            <div className="space-y-3">
              {items.map(q => (
                <div key={q.idx} className="space-y-2.5 p-4 rounded-lg border border-border/40 bg-card">
                  <p className="text-sm leading-relaxed">{q.pergunta}</p>
                  <div className="flex flex-wrap gap-2">
                    {LIKERT.map(opt => {
                      const selected = answers[q.idx] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setAnswers(prev => ({ ...prev, [q.idx]: opt.value }))}
                          data-testid={`q${q.idx}-${opt.value}`}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            selected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:border-primary/40'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Submit */}
      <div className="flex justify-end pt-2">
        <Button
          size="lg"
          onClick={onSubmit}
          disabled={answered < total || saving}
          data-testid="save-diagnostic-btn"
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {hasExisting ? <RefreshCw className="h-4 w-4 mr-2" /> : null}
          {hasExisting ? 'Refazer Diagnóstico' : 'Salvar Diagnóstico'}
        </Button>
      </div>
    </div>
  );
}

// ── Tab 2 — Score visual ─────────────────────────────────────────────────
function ScoreTab({ diagnosis, onGenerate, generating }) {
  if (!diagnosis) return <SkeletonCard lines={4} />;
  const s = diagnosis.scores || {};
  const meta = LEVEL_META[s.nivel_maturidade] || LEVEL_META['Marca em Construção'];

  const radarData = PILLARS.map(p => ({
    pilar: p.label,
    score: s[p.key] || 0,
  }));

  return (
    <div className="space-y-6" data-testid="score-tab">
      {/* Score central */}
      <Card>
        <CardContent className="py-10 flex flex-col items-center text-center gap-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Score Geral</p>
          <p className="font-heading text-7xl font-bold tabular-nums leading-none">{Math.round(s.geral || 0)}</p>
          <Badge className={`${meta.color} text-white border-0 px-3 py-1`} data-testid="maturity-badge">
            {s.nivel_maturidade}
          </Badge>
          <p className="text-sm text-muted-foreground max-w-md">{meta.desc}</p>
        </CardContent>
      </Card>

      {/* Radar */}
      <Card data-testid="score-radar">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Distribuição por Pilar</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="pilar" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} stroke="transparent" />
              <Radar name="Score" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cards por pilar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PILLARS.map(p => {
          const Icon = p.icon;
          const v = s[p.key] || 0;
          return (
            <Card key={p.key} data-testid={`pilar-score-${p.key}`}>
              <CardContent className="py-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{p.label}</span>
                  </div>
                  <span className="font-heading text-2xl font-bold tabular-nums">{Math.round(v)}</span>
                </div>
                <Progress value={v} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA gerar plano */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={onGenerate} disabled={generating} data-testid="generate-plan-btn" className="gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'Sandro está analisando sua marca…' : 'Gerar Plano + Temporada com IA'}
        </Button>
      </div>
    </div>
  );
}

// ── Tab 3 — Plano ────────────────────────────────────────────────────────
function PlanoTab({ diagnosis, onGenerate, generating, onExportPdf, exporting }) {
  const plano = diagnosis?.plano_endomarketing;
  if (!plano) {
    return (
      <Card className="border-dashed" data-testid="plano-empty">
        <CardContent className="py-16 text-center space-y-4">
          <Sparkles className="h-12 w-12 mx-auto text-primary" />
          <p className="text-muted-foreground">Plano ainda não gerado.</p>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Plano com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="plano-tab">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onExportPdf} disabled={exporting} data-testid="plan-export-pdf">
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Diagnóstico Executivo</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-foreground/90">
          {(plano.diagnostico_executivo || '').split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Principais Gaps</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(plano.principais_gaps || []).map((gap, i) => (
            <Badge key={i} variant="destructive" className="px-3 py-1.5 text-xs font-normal">{gap}</Badge>
          ))}
        </CardContent>
      </Card>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-3">Recomendações por Pilar</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map(p => {
            const Icon = p.icon;
            const rec = plano.recomendacoes_por_pilar?.[p.key] || '—';
            return (
              <Card key={p.key}>
                <CardContent className="py-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm">{p.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{rec}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="font-heading text-lg font-semibold mb-3">Plano 90 Dias</h3>
        <div className="space-y-3">
          {(plano.plano_90_dias || []).map((mes, i) => (
            <Card key={i}>
              <CardContent className="py-5 flex gap-4">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-heading font-bold text-lg shrink-0">
                  {mes.mes}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-semibold">{mes.foco}</p>
                  <ul className="space-y-1">
                    {(mes.acoes || []).map((a, j) => (
                      <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span><span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="font-heading text-lg">Indicadores Sugeridos</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(plano.indicadores_sugeridos || []).map((kpi, i) => (
            <Badge key={i} variant="outline" className="px-3 py-1.5 text-xs font-normal border-primary/40 text-primary">{kpi}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 4 — Temporada gamificada ─────────────────────────────────────────
function TemporadaTab({ diagnosis, onGenerate, generating, onExportPdf, exporting }) {
  const tg = diagnosis?.temporada_gamificada;
  if (!tg) {
    return (
      <Card className="border-dashed" data-testid="temporada-empty">
        <CardContent className="py-16 text-center space-y-4">
          <Trophy className="h-12 w-12 mx-auto text-primary" />
          <p className="text-muted-foreground">Temporada ainda não gerada.</p>
          <Button onClick={onGenerate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Temporada com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  const PillarCard = ({ icon: Icon, title, children, testId }) => (
    <Card data-testid={testId}>
      <CardContent className="py-5 space-y-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );

  const KV = ({ k, v }) => v ? (
    <div><span className="text-foreground font-medium">{k}: </span>{Array.isArray(v) ? v.join(' · ') : v}</div>
  ) : null;

  return (
    <div className="space-y-6" data-testid="temporada-tab">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onExportPdf} disabled={exporting} data-testid="temporada-export-pdf">
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
          Exportar PDF
        </Button>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <h2 className="font-heading text-3xl font-bold">{tg.nome_da_temporada}</h2>
        <Badge variant="outline" className="border-primary/40 text-primary">Temporada de {tg.duracao_dias || 90} dias</Badge>
        <Card>
          <CardContent className="py-5">
            <p className="text-foreground/90 leading-relaxed italic">{tg.narrativa}</p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card><CardContent className="py-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">KPI Principal</p>
          <p className="font-semibold mt-1">{tg.kpi_principal}</p>
        </CardContent></Card>
        <Card><CardContent className="py-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">KPI Secundário</p>
          <p className="font-semibold mt-1">{tg.kpi_secundario}</p>
        </CardContent></Card>
      </div>

      {/* 5 pilares */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PillarCard icon={Trophy} title="Competição" testId="card-competicao">
          <KV k="Estrutura" v={tg.competicao?.estrutura_ranking} />
          <KV k="Critério" v={tg.competicao?.criterio} />
          <KV k="Ciclo" v={tg.competicao?.ciclo} />
        </PillarCard>
        <PillarCard icon={Star} title="Palco" testId="card-palco">
          <KV k="Ritual semanal" v={tg.palco?.ritual_semanal} />
          <KV k="Encerramento" v={tg.palco?.ritual_encerramento} />
          <KV k="Prêmio principal" v={tg.palco?.premio_principal} />
        </PillarCard>
        <PillarCard icon={Users} title="Comunidade" testId="card-comunidade">
          <KV k="Time" v={tg.comunidade?.nome_do_time} />
          <KV k="Identidade" v={tg.comunidade?.identidade} />
          <KV k="Ritual" v={tg.comunidade?.ritual_de_pertencimento} />
        </PillarCard>
        <PillarCard icon={Gamepad2} title="O Game" testId="card-game">
          <KV k="Pontos" v={tg.mecanica_do_game?.pontos} />
          <KV k="Níveis" v={tg.mecanica_do_game?.niveis} />
          <KV k="Missões semanais" v={tg.mecanica_do_game?.missoes_semanais} />
          <KV k="Certificações" v={tg.mecanica_do_game?.certificacoes} />
        </PillarCard>
      </div>

      {/* Pessoas (trilhas) */}
      <Card data-testid="card-pessoas">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Pessoas — Trilhas de Vitória
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(tg.trilhas_de_vitoria || []).map((t, i) => (
            <div key={i} className={`rounded-lg border p-4 ${TRILHA_COLORS[i % TRILHA_COLORS.length]}`}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t.perfil}</p>
              <p className="text-sm leading-relaxed">{t.trilha}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Cronograma */}
      <div>
        <h3 className="font-heading text-lg font-semibold mb-3">Cronograma da Temporada</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card><CardContent className="py-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Abertura</p>
            <p className="text-sm leading-relaxed">{tg.cronograma?.abertura}</p>
          </CardContent></Card>
          <Card><CardContent className="py-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Checkpoints</p>
            <p className="text-sm leading-relaxed">{tg.cronograma?.checkpoints}</p>
          </CardContent></Card>
          <Card><CardContent className="py-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Encerramento</p>
            <p className="text-sm leading-relaxed">{tg.cronograma?.encerramento}</p>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function Endomarketing() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('diagnostico');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  const headers = useCallback(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // Load questions + existing diagnosis
  useEffect(() => {
    if (!currentBrand?.brand_id || !token) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      axios.get(`${API}/endomarketing/questions`, { headers: headers() }),
      axios.get(`${API}/endomarketing/diagnosis/${currentBrand.brand_id}`, { headers: headers() }),
    ]).then(([qRes, dRes]) => {
      if (cancelled) return;
      if (qRes.status === 'fulfilled') setQuestions(qRes.value.data.questions || []);
      if (dRes.status === 'fulfilled') {
        const doc = dRes.value.data;
        setDiagnosis(doc);
        // Pre-populate answers by index (assuming same order)
        const map = {};
        (doc.respostas || []).forEach((r, i) => { map[i] = r.resposta; });
        setAnswers(map);
      } else {
        setDiagnosis(null);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentBrand?.brand_id, token, headers]);

  const handleSaveDiagnostic = async () => {
    if (!currentBrand?.brand_id) return;
    setSaving(true);
    try {
      const respostas = questions.map((q, i) => ({
        pilar: q.pilar,
        pergunta: q.pergunta,
        resposta: answers[i],
      }));
      const res = await axios.post(
        `${API}/endomarketing/diagnosis`,
        { brand_id: currentBrand.brand_id, respostas },
        { headers: headers() }
      );
      setDiagnosis(res.data);
      toast.success('Diagnóstico salvo com sucesso!');
      setActiveTab('score');
    } catch (e) {
      toast.error('Erro ao salvar diagnóstico');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    if (!currentBrand?.brand_id) return;
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/endomarketing/generate/${currentBrand.brand_id}`,
        {},
        { headers: headers(), timeout: 120000 }
      );
      setDiagnosis(res.data);
      toast.success('Plano e Temporada gerados com sucesso!');
      setActiveTab('plano');
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Erro ao gerar plano com IA');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = async () => {
    if (!currentBrand?.brand_id) return;
    setExporting(true);
    try {
      const res = await axios.get(
        `${API}/endomarketing/export-pdf/${currentBrand.brand_id}`,
        { headers: headers(), responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `DeDentroProFora_${currentBrand.name || 'marca'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  if (!currentBrand) {
    return <div className="text-center py-12 text-muted-foreground">Selecione uma marca primeiro.</div>;
  }

  return (
    <div className="space-y-8" data-testid="endomarketing-page">
      <MethodHeader />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="overflow-x-auto whitespace-nowrap" data-testid="endo-tabs">
          <TabsTrigger value="diagnostico" data-testid="tab-diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="score" data-testid="tab-score" disabled={!diagnosis}>Score</TabsTrigger>
          <TabsTrigger value="plano" data-testid="tab-plano" disabled={!diagnosis}>Plano</TabsTrigger>
          <TabsTrigger value="temporada" data-testid="tab-temporada" disabled={!diagnosis}>Temporada</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostico">
          {loading
            ? <SkeletonCard lines={6} />
            : <DiagnosticTab
                questions={questions}
                answers={answers}
                setAnswers={setAnswers}
                onSubmit={handleSaveDiagnostic}
                hasExisting={!!diagnosis}
                saving={saving}
              />
          }
        </TabsContent>

        <TabsContent value="score">
          {loading ? <SkeletonCard lines={4} /> : <ScoreTab diagnosis={diagnosis} onGenerate={handleGenerate} generating={generating} />}
        </TabsContent>

        <TabsContent value="plano">
          {loading ? <SkeletonCard lines={4} /> : <PlanoTab diagnosis={diagnosis} onGenerate={handleGenerate} generating={generating} onExportPdf={handleExportPdf} exporting={exporting} />}
        </TabsContent>

        <TabsContent value="temporada">
          {loading ? <SkeletonCard lines={4} /> : <TemporadaTab diagnosis={diagnosis} onGenerate={handleGenerate} generating={generating} onExportPdf={handleExportPdf} exporting={exporting} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
