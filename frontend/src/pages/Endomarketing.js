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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList, Legend,
} from 'recharts';
import {
  Flame, Zap, Award, TrendingUp, Target, DollarSign, Heart, Sparkles,
  Trophy, Star, Users, UserCheck, Gamepad2, Loader2, FileDown, RefreshCw,
  AlertTriangle, Construction, Rocket,
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

// ── Tab 5 — Painel (visual dashboard) ─────────────────────────────────────
const MATURITY_COLOR = {
  'Marca em Risco':      '#EF4444',
  'Marca em Construção': '#F59E0B',
  'Marca em Movimento':  '#3B82F6',
  'Marca Viva':          '#10B981',
};
const MATURITY_ICON = {
  'Marca em Risco':      AlertTriangle,
  'Marca em Construção': Construction,
  'Marca em Movimento':  Zap,
  'Marca Viva':          Flame,
};

function scoreBandColor(v) {
  if (v < 40) return '#EF4444';
  if (v < 60) return '#F59E0B';
  if (v < 80) return '#3B82F6';
  return '#10B981';
}
function maturityBandColor(v) {
  if (v <= 25) return '#EF4444';
  if (v <= 50) return '#F59E0B';
  if (v <= 75) return '#3B82F6';
  return '#10B981';
}
function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return '—'; }
}

// Dark panel card wrapper (inline styles to guarantee dark theme regardless of app theme)
const CARD_BASE_STYLE = {
  background: '#1C1F26',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
  boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
  color: '#F0F0F0',
};

const PanelCard = ({ className = '', style = {}, children, testId }) => (
  <div
    data-testid={testId}
    className={`p-5 md:p-6 ${className}`}
    style={{ ...CARD_BASE_STYLE, ...style }}
  >
    {children}
  </div>
);

const StatCard = ({ testId, borderTopColor, children, style = {} }) => (
  <div
    data-testid={testId}
    className="p-5 md:p-6"
    style={{
      background: 'linear-gradient(135deg, #1C1F26 0%, #22252E 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderTop: `2px solid ${borderTopColor}`,
      borderRadius: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
      color: '#F0F0F0',
      ...style,
    }}
  >
    {children}
  </div>
);

const ChartCard = ({ testId, className = '', style = {}, children }) => (
  <div
    data-testid={testId}
    className={`p-5 md:p-6 ${className}`}
    style={{
      background: 'linear-gradient(145deg, #1C1F26 0%, #1F2330 100%)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16,
      boxShadow: '0 4px 24px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.12)',
      color: '#F0F0F0',
      ...style,
    }}
  >
    {children}
  </div>
);

// Section label between rows (uses platform muted tone over light bg)
const SectionLabel = ({ children, testId }) => (
  <p
    data-testid={testId}
    className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground"
    style={{ margin: '24px 0 12px 4px' }}
  >
    {children}
  </p>
);

const PanelLabel = ({ children }) => (
  <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: '#6B7280' }}>{children}</p>
);

// Dark tooltip for Recharts
const DarkTooltip = ({ active, payload, label, renderExtra }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-xl"
      style={{ background: '#0D0E10', border: '1px solid #2A2D31', color: '#F0F0F0' }}
    >
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#F0F0F0' }}>
          {p.name}: <span className="font-bold tabular-nums">{p.value}</span>
        </p>
      ))}
      {renderExtra ? renderExtra(payload) : null}
    </div>
  );
};

function PainelTab({ diagnosis, onExportPdf, exporting, onGoDiagnostico, onGenerate, generating }) {
  if (!diagnosis) {
    return (
      <PanelCard testId="painel-empty" className="text-center py-16">
        <Flame className="h-12 w-12 mx-auto mb-4" style={{ color: '#FF5C00' }} />
        <h3 className="font-heading text-xl font-bold mb-2">Painel indisponível</h3>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
          Salve um diagnóstico para liberar o Painel visual.
        </p>
        <Button onClick={onGoDiagnostico} data-testid="painel-cta-diagnostic">
          Iniciar Diagnóstico
        </Button>
      </PanelCard>
    );
  }

  const s = diagnosis.scores || {};
  const plano = diagnosis.plano_endomarketing;
  const tg = diagnosis.temporada_gamificada;
  const geral = Math.round(s.geral || 0);
  const nivel = s.nivel_maturidade || 'Marca em Construção';
  const NivelIcon = MATURITY_ICON[nivel] || Zap;
  const nivelColor = MATURITY_COLOR[nivel] || '#F59E0B';

  // Pillar ranking (strongest + weakest)
  const pilarData = PILLARS.map(p => ({
    key: p.key,
    label: p.label,
    shortLabel: p.label.length > 10 ? p.label.slice(0, 9) + '.' : p.label,
    icon: p.icon,
    score: Math.round(s[p.key] || 0),
    gap: 100 - Math.round(s[p.key] || 0),
  }));
  const strongest = [...pilarData].sort((a, b) => b.score - a.score)[0];
  const weakest = [...pilarData].sort((a, b) => a.score - b.score)[0];

  const StrongIcon = strongest.icon;
  const WeakIcon = weakest.icon;

  return (
    <div className="space-y-4" data-testid="painel-tab">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4" data-testid="painel-header">
        <div className="space-y-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: '#1F2124', color: '#FF5C00', border: '1px solid #FF5C0033' }}
          >
            <Flame className="h-3 w-3" />
            Metodologia Sandro Serzedello · Cofundador LaBrand
          </span>
          <h2 className="font-heading text-[22px] font-bold text-foreground">
            Painel de Endomarketing
          </h2>
          <p className="text-xs text-muted-foreground">
            Última análise em {formatDate(diagnosis.updated_at || diagnosis.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onGoDiagnostico}
            data-testid="painel-redo-btn"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refazer Diagnóstico
          </Button>
          <Button onClick={onExportPdf} disabled={exporting} data-testid="painel-export-pdf" className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* LINHA 1 — 4 STAT CARDS */}
      <SectionLabel testId="section-overview">Visão Geral</SectionLabel>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="painel-stats">
        {/* Card 1 - Score */}
        <StatCard testId="stat-score" borderTopColor="#FF5C00">
          <PanelLabel>Score de Maturidade</PanelLabel>
          <p className="font-heading font-bold leading-none mt-2" style={{ color: '#FFFFFF', fontSize: 52 }}>
            {geral}
          </p>
          <div className="mt-4 h-1 rounded-full overflow-hidden" style={{ background: '#1F2124' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${geral}%`, background: maturityBandColor(geral) }}
            />
          </div>
        </StatCard>

        {/* Card 2 - Nivel */}
        <StatCard testId="stat-nivel" borderTopColor={nivelColor}>
          <PanelLabel>Nível Atual</PanelLabel>
          <p className="font-heading text-[22px] font-bold mt-2" style={{ color: nivelColor }}>
            {nivel}
          </p>
          <div className="mt-2">
            <NivelIcon className="h-6 w-6" style={{ color: nivelColor }} />
          </div>
        </StatCard>

        {/* Card 3 - Strongest */}
        <StatCard testId="stat-strongest" borderTopColor="#10B981">
          <PanelLabel>Ponto Forte</PanelLabel>
          <div className="flex items-center gap-2 mt-2">
            <StrongIcon className="h-5 w-5" style={{ color: '#10B981' }} />
            <span className="font-heading text-lg font-bold" style={{ color: '#10B981' }}>
              {strongest.label}
            </span>
          </div>
          <p className="font-heading font-bold leading-none mt-1" style={{ color: '#10B981', fontSize: 36 }}>
            {strongest.score}
          </p>
          <p className="text-[11px] mt-2" style={{ color: '#6B7280' }}>Aproveite para liderar</p>
        </StatCard>

        {/* Card 4 - Weakest */}
        <StatCard testId="stat-weakest" borderTopColor="#FF5C00">
          <PanelLabel>Maior Oportunidade</PanelLabel>
          <div className="flex items-center gap-2 mt-2">
            <WeakIcon className="h-5 w-5" style={{ color: '#FF5C00' }} />
            <span className="font-heading text-lg font-bold" style={{ color: '#FF5C00' }}>
              {weakest.label}
            </span>
          </div>
          <p className="font-heading font-bold leading-none mt-1" style={{ color: '#FF5C00', fontSize: 36 }}>
            {weakest.score}
          </p>
          <p className="text-[11px] mt-2" style={{ color: '#6B7280' }}>Priorize este pilar</p>
        </StatCard>
      </div>

      {/* LINHA 2 — RADAR + BARRAS HORIZONTAIS */}
      <SectionLabel testId="section-mapa">Mapa dos Pilares</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Radar */}
        <ChartCard testId="painel-radar" className="lg:col-span-5">
          <div className="flex items-center justify-between mb-2">
            <PanelLabel>Mapa dos 6 Pilares</PanelLabel>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <RadarChart data={pilarData} outerRadius="75%">
                <PolarGrid stroke="#1F2124" />
                <PolarAngleAxis
                  dataKey="label"
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={false}
                  stroke="transparent"
                />
                {/* Reference ring at 100 */}
                <Radar
                  name="Referência"
                  dataKey={() => 100}
                  stroke="#2A2D31"
                  strokeDasharray="3 3"
                  fill="#1F2124"
                  fillOpacity={0.4}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#FF5C00"
                  strokeWidth={2}
                  fill="#FF5C00"
                  fillOpacity={0.15}
                />
                <Tooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Horizontal bars */}
        <ChartCard testId="painel-bars" className="lg:col-span-7">
          <PanelLabel>Score por Pilar</PanelLabel>
          <div style={{ width: '100%', height: 320 }} className="mt-2">
            <ResponsiveContainer>
              <BarChart
                data={pilarData}
                layout="vertical"
                margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                barCategoryGap={10}
              >
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,92,0,0.05)' }}
                  content={(props) => (
                    <DarkTooltip
                      {...props}
                      renderExtra={(payload) => {
                        const row = payload[0]?.payload;
                        if (!row) return null;
                        return <p className="mt-1" style={{ color: '#EF4444' }}>Gap: {row.gap} pts</p>;
                      }}
                    />
                  )}
                />
                <Bar
                  dataKey="score"
                  background={{ fill: '#1F2124', radius: 4 }}
                  radius={[4, 4, 4, 4]}
                >
                  {pilarData.map((entry, i) => (
                    <Cell key={i} fill={scoreBandColor(entry.score)} />
                  ))}
                  <LabelList
                    dataKey="score"
                    position="right"
                    offset={8}
                    style={{ fill: '#F0F0F0', fontSize: 12, fontWeight: 700 }}
                    formatter={(v) => `${v}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-[11px]" style={{ color: '#6B7280' }}>
            {pilarData.map(p => (
              <span key={p.key} className="inline-flex items-center gap-1">
                <span style={{ color: '#EF4444' }}>•</span>
                {p.shortLabel}: <span className="font-semibold" style={{ color: '#EF4444' }}>gap {p.gap}</span>
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* LINHA 3 — GAP GRAGH + EXECUTIVE */}
      <SectionLabel testId="section-gaps">Análise de Gaps</SectionLabel>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <ChartCard testId="painel-gap" className="lg:col-span-6">
          <PanelLabel>Análise de Gaps por Pilar</PanelLabel>
          <div style={{ width: '100%', height: 300 }} className="mt-2">
            <ResponsiveContainer>
              <BarChart
                data={pilarData}
                margin={{ top: 8, right: 8, left: -8, bottom: 8 }}
                barCategoryGap={18}
              >
                <CartesianGrid stroke="#1F2124" vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  axisLine={{ stroke: '#1F2124' }}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,92,0,0.05)' }}
                  content={(props) => (
                    <DarkTooltip
                      {...props}
                      renderExtra={(payload) => {
                        const row = payload[0]?.payload;
                        if (!row) return null;
                        return (
                          <p className="mt-1" style={{ color: '#FF5C00' }}>
                            +{row.gap} pts disponíveis em {row.label}
                          </p>
                        );
                      }}
                    />
                  )}
                />
                <Legend
                  wrapperStyle={{ color: '#6B7280', fontSize: 11 }}
                  iconType="circle"
                />
                <Bar dataKey="score" name="Score Atual" fill="#FF5C00" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="gap"
                  name="Potencial de Ganho"
                  fill="#1F2124"
                  stroke="#2A2D31"
                  strokeDasharray="3 3"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <PanelCard
          testId="painel-executive"
          className="lg:col-span-6"
          style={{ borderLeft: '3px solid #FF5C00' }}
        >
          <PanelLabel>Diagnóstico</PanelLabel>
          {plano?.diagnostico_executivo ? (
            <div className="space-y-4 mt-3" style={{ color: '#D1D5DB', fontSize: 14, lineHeight: 1.7 }}>
              {(plano.diagnostico_executivo || '').split('\n\n').slice(0, 3).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center" data-testid="painel-executive-empty">
              <Sparkles className="h-10 w-10 mx-auto mb-3" style={{ color: '#FF5C00' }} />
              <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                Plano ainda não gerado.
              </p>
              <Button onClick={onGenerate} disabled={generating} data-testid="painel-generate-plan">
                {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Gerar análise com IA
              </Button>
            </div>
          )}
        </PanelCard>
      </div>

      {/* LINHA 4 — TEMPORADA */}
      <SectionLabel testId="section-temporada">Temporada</SectionLabel>
      {tg ? (
        <div className="space-y-4" data-testid="painel-temporada">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="space-y-1">
              <PanelLabel>Temporada Gamificada</PanelLabel>
              <h3 className="font-heading text-xl font-bold text-foreground">
                {tg.nome_da_temporada || 'Temporada'}
              </h3>
            </div>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: '#FF5C0020', color: '#FF5C00' }}
            >
              {tg.duracao_dias || 90} dias
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Competição */}
            <PanelCard testId="t-competicao" style={{ borderTop: '2px solid #FF5C00' }}>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-4 w-4" style={{ color: '#FF5C00' }} />
                <span className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Competição</span>
              </div>
              <span
                className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium mb-2"
                style={{ background: '#FF5C0020', color: '#FF5C00' }}
              >
                {tg.competicao?.ciclo || 'Ciclo'}
              </span>
              <p className="text-xs line-clamp-2 mb-1" style={{ color: '#D1D5DB' }}>
                {tg.competicao?.criterio || '—'}
              </p>
              <p className="text-[11px]" style={{ color: '#6B7280' }}>
                {tg.competicao?.estrutura_ranking || ''}
              </p>
            </PanelCard>

            {/* Palco */}
            <PanelCard testId="t-palco" style={{ borderTop: '2px solid #F59E0B' }}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4" style={{ color: '#F59E0B' }} />
                <span className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Palco</span>
              </div>
              <p className="text-xs mb-2" style={{ color: '#D1D5DB' }}>
                {tg.palco?.ritual_semanal || '—'}
              </p>
              {tg.palco?.premio_principal && (
                <span
                  className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium"
                  style={{ background: '#F59E0B20', color: '#F59E0B' }}
                >
                  {tg.palco.premio_principal}
                </span>
              )}
            </PanelCard>

            {/* Comunidade */}
            <PanelCard testId="t-comunidade" style={{ borderTop: '2px solid #10B981' }}>
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4" style={{ color: '#10B981' }} />
                <span className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Comunidade</span>
              </div>
              <p className="font-heading text-base font-bold mb-1" style={{ color: '#10B981' }}>
                {tg.comunidade?.nome_do_time || '—'}
              </p>
              <p className="text-xs" style={{ color: '#D1D5DB' }}>
                {tg.comunidade?.ritual_de_pertencimento || ''}
              </p>
            </PanelCard>

            {/* Pessoas */}
            <PanelCard testId="t-pessoas" style={{ borderTop: '2px solid #3B82F6' }}>
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4" style={{ color: '#3B82F6' }} />
                <span className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>Pessoas</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(tg.trilhas_de_vitoria || []).slice(0, 3).map((t, i) => {
                  const palette = ['#3B82F6', '#10B981', '#FF5C00'];
                  const c = palette[i % palette.length];
                  return (
                    <span
                      key={i}
                      title={t.trilha}
                      className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium cursor-help truncate max-w-full"
                      style={{ background: `${c}20`, color: c }}
                    >
                      {(t.perfil || '').replace(/^(Vendedor|Técnico) /, '')}
                    </span>
                  );
                })}
              </div>
            </PanelCard>

            {/* O Game */}
            <PanelCard testId="t-game" style={{ borderTop: '2px solid #8B5CF6' }}>
              <div className="flex items-center gap-2 mb-3">
                <Gamepad2 className="h-4 w-4" style={{ color: '#8B5CF6' }} />
                <span className="font-semibold text-sm" style={{ color: '#F0F0F0' }}>O Game</span>
              </div>
              <div className="flex gap-1 flex-wrap mb-2">
                {(tg.mecanica_do_game?.niveis || []).slice(0, 4).map((lvl, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    style={{
                      background: `rgba(139, 92, 246, ${0.1 + i * 0.15})`,
                      color: '#8B5CF6',
                    }}
                  >
                    {lvl.length > 12 ? lvl.slice(0, 11) + '…' : lvl}
                  </span>
                ))}
              </div>
              <p className="text-xs" style={{ color: '#D1D5DB' }}>
                {(tg.mecanica_do_game?.missoes_semanais || []).length} missões semanais
              </p>
            </PanelCard>
          </div>

          {/* LINHA 5 — TIMELINE */}
          <PanelCard testId="painel-timeline">
            <PanelLabel>Cronograma da Temporada</PanelLabel>
            <div className="mt-6 relative">
              {/* connecting line */}
              <div
                className="hidden md:block absolute left-[10%] right-[10%] h-[2px]"
                style={{
                  top: 24,
                  background: 'linear-gradient(90deg, #FF5C00 0%, #FF5C0080 50%, #161719 100%)',
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                {[
                  { icon: Rocket,    title: 'Abertura',     desc: tg.cronograma?.abertura     },
                  { icon: RefreshCw, title: 'Checkpoints',  desc: tg.cronograma?.checkpoints  },
                  { icon: Trophy,    title: 'Encerramento', desc: tg.cronograma?.encerramento },
                ].map((m, i) => {
                  const Icon = m.icon;
                  return (
                    <div key={i} className="flex flex-col items-center text-center px-2" data-testid={`timeline-${i}`}>
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center mb-3 relative z-10"
                        style={{
                          background: '#161719',
                          border: '2px solid #FF5C00',
                          boxShadow: '0 0 18px #FF5C0040',
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: '#FF5C00' }} />
                      </div>
                      <p className="font-heading text-[13px] font-bold" style={{ color: '#F0F0F0' }}>
                        {m.title}
                      </p>
                      <p className="text-xs mt-1 line-clamp-2 max-w-[260px]" style={{ color: '#6B7280' }}>
                        {m.desc || '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </PanelCard>
        </div>
      ) : (
        <PanelCard testId="painel-temporada-empty" className="text-center py-10">
          <Trophy className="h-10 w-10 mx-auto mb-3" style={{ color: '#FF5C00' }} />
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
            Temporada gamificada ainda não gerada.
          </p>
          <Button onClick={onGenerate} disabled={generating} data-testid="painel-generate-temporada">
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Gerar Temporada com IA
          </Button>
        </PanelCard>
      )}
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
          <TabsTrigger value="painel" data-testid="tab-painel" disabled={!diagnosis}>Painel</TabsTrigger>
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

        <TabsContent value="painel">
          {loading ? <SkeletonCard lines={4} /> : (
            <PainelTab
              diagnosis={diagnosis}
              onExportPdf={handleExportPdf}
              exporting={exporting}
              onGoDiagnostico={() => setActiveTab('diagnostico')}
              onGenerate={handleGenerate}
              generating={generating}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
