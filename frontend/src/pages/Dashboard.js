import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Database, ArrowUpRight, BarChart3,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ── Theme tokens ──────────────────────────────────────────────────────────
const T = {
  bg:        '#0D0E10',
  card:      '#161719',
  cardBorder:'#1F2124',
  cardHover: '#1A1C1F',
  textPri:   '#F0F0F0',
  textSec:   '#6B7280',
  accent:    '#FF5C00',
  accent2:   '#3B82F6',
  accent3:   '#10B981',
  warn:      '#F59E0B',
  danger:    '#EF4444',
  muted:     '#2A2D31',
};

const PILLAR_LABELS = {
  start: 'Start', values: 'Valores', purpose: 'Propósito', promise: 'Promessa',
  positioning: 'Posicion.', personality: 'Personal.', universality: 'Universal',
};

const PERIOD_DAYS = { '30': 30, '90': 90, '365': 365 };

// ── UI primitives ────────────────────────────────────────────────────────
function Card({ children, className = '', testId }) {
  return (
    <div
      className={`rounded-[14px] ${className}`}
      style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

function CardLabel({ children }) {
  return (
    <p className="text-[11px] uppercase tracking-[0.12em] font-medium" style={{ color: T.textSec }}>
      {children}
    </p>
  );
}

function MicroBar({ value, max = 100, color = T.accent }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="h-[3px] rounded-sm overflow-hidden mt-3" style={{ background: T.cardBorder }}>
      <div className="h-full rounded-sm" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function EmptyCard({ icon: Icon = Database, title, ctaLabel, ctaHref }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center text-center h-full py-10 gap-3">
      <Icon className="h-8 w-8" style={{ color: T.muted }} />
      <p className="text-sm" style={{ color: T.textSec }}>{title}</p>
      {ctaLabel && (
        <Button
          variant="ghost"
          size="sm"
          className="text-xs hover:bg-transparent"
          style={{ color: T.accent }}
          onClick={() => navigate(ctaHref)}
        >
          {ctaLabel} <ArrowUpRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

function SkeletonCard({ className = '' }) {
  return (
    <Card className={className}>
      <CardBody>
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-24 rounded" style={{ background: T.cardBorder }} />
          <div className="h-10 w-32 rounded" style={{ background: T.cardBorder }} />
          <div className="h-3 w-full rounded" style={{ background: T.cardBorder }} />
        </div>
      </CardBody>
    </Card>
  );
}

// ── Recharts shared tooltip (dark) ────────────────────────────────────────
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{ background: T.cardBorder, border: `1px solid ${T.muted}`, color: T.textPri }}
    >
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: T.textSec }}>{p.name}</span>
          <span className="ml-auto tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Stat cards (line 1) ──────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, microValue, microMax }) {
  return (
    <Card>
      <CardBody>
        <CardLabel>{label}</CardLabel>
        <div className="flex items-baseline gap-3 mt-2">
          <span className="font-bold leading-none tabular-nums" style={{ color: T.textPri, fontSize: 48 }}>
            {value}
          </span>
        </div>
        {sub && (
          <p className="text-xs mt-2 font-medium" style={{ color: subColor || T.textSec }}>
            {sub}
          </p>
        )}
        {microValue !== undefined && <MicroBar value={microValue} max={microMax || 100} />}
      </CardBody>
    </Card>
  );
}

// ── Funnel (CSS trapezoidal) ──────────────────────────────────────────────
const FUNNEL_DEFAULT_STAGES = [
  { key: 'awareness',     label: 'Awareness',     width: 100, color: '#FF5C00' },
  { key: 'consideration', label: 'Consideração',  width: 80,  color: '#F97316' },
  { key: 'preference',    label: 'Preferência',   width: 60,  color: '#FB923C' },
  { key: 'loyalty',       label: 'Fidelidade',    width: 40,  color: '#FED7AA' },
];

function BrandFunnel({ stages }) {
  const items = FUNNEL_DEFAULT_STAGES.map((s, i) => {
    const value = stages?.[s.key] ?? null;
    const next = stages?.[FUNNEL_DEFAULT_STAGES[i + 1]?.key] ?? null;
    const conv = (value && next) ? Math.round((next / value) * 100) : null;
    return { ...s, value, conv };
  });
  return (
    <div className="space-y-2">
      {items.map(s => (
        <div key={s.key} className="flex items-center gap-3">
          <div
            className="rounded-md px-3 py-2 text-xs font-medium flex items-center justify-between text-white"
            style={{ width: `${s.width}%`, background: s.color, color: s.width < 60 ? '#0D0E10' : '#fff' }}
          >
            <span>{s.label}</span>
            <span className="tabular-nums">{s.value ?? '—'}</span>
          </div>
          {s.conv !== null && (
            <span className="text-[10px] tabular-nums shrink-0" style={{ color: T.textSec }}>
              ↓ {s.conv}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Period filter for time-series helper ─────────────────────────────────
function filterByPeriod(items, days) {
  if (!Array.isArray(items) || !items.length) return [];
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter(i => {
    const d = i.date || i.created_at || i.timestamp;
    if (!d) return true;
    return new Date(d).getTime() >= cutoff;
  });
}

// ── Page ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [period, setPeriod] = useState('90');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    bvs: null, bvsHistory: null, health: null, funnel: null,
    sov: null, mentions: null, competitors: null, metrics: null,
  });

  useEffect(() => {
    if (!currentBrand?.brand_id || !token) return;
    let cancelled = false;
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const id = currentBrand.brand_id;

    Promise.allSettled([
      axios.get(`${API}/brands/${id}/bvs`,                          { headers }),
      axios.get(`${API}/brands/${id}/bvs/history`,                  { headers }),
      axios.get(`${API}/brands/${id}/brand-health`,                 { headers }),
      axios.get(`${API}/brands/${id}/brand-funnel`,                 { headers }),
      axios.get(`${API}/brands/${id}/share-of-voice`,               { headers }),
      axios.get(`${API}/brands/${id}/social-listening/mentions`,    { headers }),
      axios.get(`${API}/brands/${id}/competitors/analyses`,         { headers }),
      axios.get(`${API}/brands/${id}/metrics`,                      { headers }),
    ]).then(rs => {
      if (cancelled) return;
      const get = (r) => r.status === 'fulfilled' ? r.value.data : null;
      setData({
        bvs:         get(rs[0]),
        bvsHistory:  get(rs[1]),
        health:      get(rs[2]),
        funnel:      get(rs[3]),
        sov:         get(rs[4]),
        mentions:    get(rs[5]),
        competitors: get(rs[6]),
        metrics:     get(rs[7]),
      });
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentBrand?.brand_id, token]);

  const days = PERIOD_DAYS[period] || 90;

  // ── Stat cards data ──
  const bvsScore = data.bvs?.bvs_score ?? 0;
  const bvsGrowth = data.bvsHistory?.growth ?? 0;
  const pillarsTotal = data.metrics?.pillars_total ?? 7;
  const pillarsCompleted = data.metrics?.pillars_completed ?? 0;
  const pillarsPct = data.metrics?.overall_completion ?? 0;
  const healthScore = data.health?.health_score ?? 0;
  const healthLevel = data.health?.level || 'em_atencao';
  const totalMentions = data.mentions?.total ?? 0;
  const positiveMentions = useMemo(
    () => (data.mentions?.mentions || []).filter(m => m.sentiment === 'positive').length,
    [data.mentions]
  );
  const negativeMentions = useMemo(
    () => (data.mentions?.mentions || []).filter(m => m.sentiment === 'negative').length,
    [data.mentions]
  );

  // ── Evolution chart series ──
  const evolutionData = useMemo(() => {
    const hist = data.bvsHistory?.history || [];
    const filtered = filterByPeriod(hist, days);
    return filtered.map(h => ({
      date: h.date ? new Date(h.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '',
      bvs: h.score ?? h.bvs_score ?? 0,
      health: h.health_score ?? null,
      social: h.social_engagement ?? null,
    }));
  }, [data.bvsHistory, days]);

  // ── Pilares horizontal bars ──
  const pillarsData = useMemo(() => {
    const obj = data.metrics?.pillars || {};
    return Object.entries(obj)
      .map(([k, v]) => ({ name: PILLAR_LABELS[k] || k, value: v }))
      .sort((a, b) => b.value - a.value);
  }, [data.metrics]);

  // ── SoV donut data ──
  const sovData = useMemo(() => {
    const sov = data.sov?.sov;
    if (!sov?.brand?.name) return [];
    const items = [{ name: sov.brand.name, value: sov.brand.sov_percentage || 0, color: T.accent }];
    (sov.competitors || []).slice(0, 5).forEach((c, i) => {
      items.push({
        name: c.name,
        value: c.sov_percentage || 0,
        color: ['#374151', '#2D3138', '#22262D', '#1F2124', '#191B1F'][i] || T.cardBorder,
      });
    });
    return items;
  }, [data.sov]);

  // ── Mentions stacked area ──
  const mentionsTimeline = useMemo(() => {
    const m = data.mentions?.mentions || [];
    const filtered = filterByPeriod(m, days);
    if (!filtered.length) return [];
    const buckets = {};
    for (const item of filtered) {
      const d = (item.created_at || item.date || '').slice(0, 10);
      if (!d) continue;
      if (!buckets[d]) buckets[d] = { date: d, positive: 0, neutral: 0, negative: 0 };
      const s = item.sentiment || 'neutral';
      if (buckets[d][s] !== undefined) buckets[d][s]++;
      else buckets[d].neutral++;
    }
    return Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
  }, [data.mentions, days]);

  // ── Radar (brand dimensions) ──
  const radarData = useMemo(() => {
    const components = data.bvs?.components || {};
    const labels = {
      identity: 'Identidade', purpose: 'Propósito', positioning: 'Posicionamento',
      reputation: 'Reputação', experience: 'Experiência', communication: 'Comunicação',
    };
    return Object.entries(labels).map(([k, label]) => ({
      dim: label,
      value: components[k]?.score ?? components[k] ?? 0,
    }));
  }, [data.bvs]);

  // ── Competitors table ──
  const competitorRows = useMemo(() => {
    const list = data.competitors?.analyses || [];
    return list.slice(0, 6).map(c => ({
      name: c.competitor_name || c.name || '—',
      bvs: c.bvs_score ?? c.score ?? null,
      sov: c.share_of_voice ?? null,
      digital: c.digital_presence ?? null,
      positioning: c.positioning_summary || c.positioning || '—',
      status: c.status || (c.bvs_score && c.bvs_score > bvsScore ? 'leader' : 'follower'),
    }));
  }, [data.competitors, bvsScore]);

  const healthLabel = ({ saudavel: 'Saudável', em_atencao: 'Em Atenção', em_risco: 'Em Risco' }[healthLevel]) || 'Em Atenção';
  const healthColor = ({ saudavel: T.accent3, em_atencao: T.warn, em_risco: T.danger }[healthLevel]) || T.warn;

  return (
    <div className="-mx-6 -my-8 md:-mx-8 px-6 md:px-8 py-8 min-h-[calc(100vh-3.5rem)]" style={{ background: T.bg, color: T.textPri }} data-testid="ecosystem-dashboard">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Ecossistema de Marca</h1>
          <p className="text-sm mt-1" style={{ color: T.textSec }}>
            <span className="font-medium" style={{ color: T.textPri }}>{currentBrand?.name || '—'}</span>
            <span className="mx-2">·</span>
            {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger
            className="w-[200px] border"
            style={{ background: T.card, borderColor: T.cardBorder, color: T.textPri }}
            data-testid="period-select"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent style={{ background: T.card, borderColor: T.cardBorder }}>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="365">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* LINHA 1 — Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {loading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              label="BVS Score"
              value={bvsScore}
              sub={
                <span className="inline-flex items-center gap-1">
                  {bvsGrowth >= 0
                    ? <TrendingUp className="h-3 w-3" style={{ color: T.accent3 }} />
                    : <TrendingDown className="h-3 w-3" style={{ color: T.danger }} />}
                  <span style={{ color: bvsGrowth >= 0 ? T.accent3 : T.danger }}>
                    {bvsGrowth >= 0 ? '+' : ''}{bvsGrowth} pts
                  </span>
                </span>
              }
              microValue={bvsScore}
            />
            <StatCard
              label="Pilares Preenchidos"
              value={`${pillarsCompleted} / ${pillarsTotal}`}
              sub={<span style={{ color: T.accent }}>{pillarsPct}% completo</span>}
              microValue={pillarsPct}
            />
            <StatCard
              label="Saúde da Marca"
              value={`${healthScore}%`}
              sub={
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: healthColor }} />
                  <span style={{ color: healthColor }}>{healthLabel}</span>
                </span>
              }
              microValue={healthScore}
            />
            <StatCard
              label="Menções Sociais"
              value={totalMentions}
              sub={
                <>
                  <span style={{ color: T.accent3 }}>{positiveMentions} positivas</span>
                  <span className="mx-1.5" style={{ color: T.textSec }}>·</span>
                  <span style={{ color: T.danger }}>{negativeMentions} negativas</span>
                </>
              }
            />
          </>
        )}
      </div>

      {/* LINHA 2 — Evolução + Força por Pilar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <Card className="lg:col-span-7" testId="evolution-card">
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardLabel>Evolução da Marca</CardLabel>
                <p className="text-sm mt-1" style={{ color: T.textSec }}>BVS · Saúde · Engajamento Social</p>
              </div>
            </div>
            {evolutionData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={evolutionData} margin={{ top: 5, right: 10, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accent} stopOpacity={0.3} /><stop offset="95%" stopColor={T.accent} stopOpacity={0} /></linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accent2} stopOpacity={0.3} /><stop offset="95%" stopColor={T.accent2} stopOpacity={0} /></linearGradient>
                    <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accent3} stopOpacity={0.3} /><stop offset="95%" stopColor={T.accent3} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="0" stroke={T.cardBorder} vertical={false} />
                  <XAxis dataKey="date" stroke={T.textSec} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={T.textSec} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<DarkTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: T.textSec }} iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="bvs"    name="BVS Score"          stroke={T.accent}  strokeWidth={2} dot={false} fill="url(#g1)" fillOpacity={1} />
                  <Area type="monotone" dataKey="health" name="Saúde da Marca"     stroke={T.accent2} strokeWidth={2} dot={false} fill="url(#g2)" fillOpacity={1} />
                  <Area type="monotone" dataKey="social" name="Engajamento Social" stroke={T.accent3} strokeWidth={2} dot={false} fill="url(#g3)" fillOpacity={1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCard title="Dados insuficientes para o período selecionado" ctaLabel="Preencher BVS" ctaHref="/bvs" />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-5" testId="pillars-card">
          <CardBody>
            <CardLabel>Força por Pilar</CardLabel>
            <p className="text-sm mt-1 mb-4" style={{ color: T.textSec }}>% completude por dimensão</p>
            {pillarsData.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={pillarsData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" stroke={T.textSec} fontSize={11} tickLine={false} axisLine={false} width={70} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: T.cardHover }} />
                  <Bar dataKey="value" fill={T.accent} radius={[4, 4, 4, 4]} background={{ fill: T.cardBorder, radius: 4 }} label={{ position: 'right', fill: T.textPri, fontSize: 11, formatter: (v) => `${v}%` }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCard title="Sem dados de pilares" ctaLabel="Preencher Pilares" ctaHref="/pillars/start" />
            )}
          </CardBody>
        </Card>
      </div>

      {/* LINHA 3 — Funil + SoV + Menções */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        <Card className="lg:col-span-4" testId="funnel-card">
          <CardBody>
            <CardLabel>Funil de Marca</CardLabel>
            <p className="text-sm mt-1 mb-4" style={{ color: T.textSec }}>Conversão entre etapas</p>
            {data.funnel?.funnel?.has_data === false ? (
              <EmptyCard title="Funil ainda não configurado" ctaLabel="Configurar Funil" ctaHref="/brand-funnel" />
            ) : (
              <BrandFunnel stages={data.funnel?.funnel?.stages || {}} />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-4" testId="sov-card">
          <CardBody>
            <CardLabel>Share of Voice</CardLabel>
            <p className="text-sm mt-1 mb-4" style={{ color: T.textSec }}>Participação de menções</p>
            {sovData.length && data.sov?.has_data ? (
              <div className="flex items-center gap-3">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={sovData} dataKey="value" innerRadius={42} outerRadius={70} paddingAngle={2}>
                      {sovData.map((s, i) => <Cell key={i} fill={s.color} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  <p className="text-2xl font-bold tabular-nums" style={{ color: T.textPri }}>
                    {sovData[0]?.value || 0}%
                  </p>
                  <div className="space-y-1.5">
                    {sovData.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="truncate flex-1" style={{ color: T.textSec }}>{s.name}</span>
                        <span className="tabular-nums" style={{ color: T.textPri }}>{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyCard title="Configure Share of Voice" ctaLabel="Ir para SoV" ctaHref="/share-of-voice" />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-4" testId="mentions-card">
          <CardBody>
            <div className="flex items-start justify-between mb-4">
              <div>
                <CardLabel>Menções ao Longo do Tempo</CardLabel>
                <p className="text-sm mt-1" style={{ color: T.textSec }}>Sentimento agregado</p>
              </div>
              <span className="text-2xl font-bold tabular-nums" style={{ color: T.textPri }}>{totalMentions}</span>
            </div>
            {mentionsTimeline.length ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={mentionsTimeline}>
                  <CartesianGrid stroke={T.cardBorder} vertical={false} />
                  <XAxis dataKey="date" stroke={T.textSec} fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip content={<DarkTooltip />} />
                  <Area type="monotone" dataKey="positive" stackId="1" stroke={T.accent3} fill={T.accent3} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="neutral"  stackId="1" stroke={T.textSec} fill={T.textSec} fillOpacity={0.4} />
                  <Area type="monotone" dataKey="negative" stackId="1" stroke={T.danger} fill={T.danger} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCard title="Sem menções no período" ctaLabel="Configurar Listening" ctaHref="/social-listening" />
            )}
          </CardBody>
        </Card>
      </div>

      {/* LINHA 4 — Radar + Concorrentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5" testId="radar-card">
          <CardBody>
            <CardLabel>Dimensões da Marca</CardLabel>
            <p className="text-sm mt-1 mb-2" style={{ color: T.textSec }}>Componentes do BVS</p>
            {radarData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={T.cardBorder} />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: T.textSec, fontSize: 11 }} />
                  <PolarRadiusAxis stroke="transparent" tick={false} domain={[0, 100]} />
                  <Radar name="Marca" dataKey="value" stroke={T.accent} fill={T.accent} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip content={<DarkTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyCard title="Sem componentes de BVS" ctaLabel="Calcular BVS" ctaHref="/bvs" icon={BarChart3} />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-7" testId="competitors-card">
          <CardBody>
            <CardLabel>Benchmark de Concorrentes</CardLabel>
            <p className="text-sm mt-1 mb-4" style={{ color: T.textSec }}>Posição relativa no mercado</p>
            {competitorRows.length ? (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ color: T.textSec }} className="text-[10px] uppercase tracking-wider">
                      <th className="text-left font-medium px-6 py-2">Marca</th>
                      <th className="text-right font-medium px-3 py-2">BVS</th>
                      <th className="text-right font-medium px-3 py-2">SoV</th>
                      <th className="text-right font-medium px-3 py-2">Digital</th>
                      <th className="text-left font-medium px-3 py-2">Posicionamento</th>
                      <th className="text-right font-medium px-6 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Brand row first */}
                    <tr style={{ background: T.cardBorder, borderLeft: `3px solid ${T.accent}` }}>
                      <td className="px-6 py-3 font-medium" style={{ color: T.textPri }}>{currentBrand?.name || '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: T.textPri }}>{bvsScore || '—'}</td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: T.textPri }}>{data.sov?.sov?.brand?.sov_percentage ?? '—'}%</td>
                      <td className="px-3 py-3 text-right tabular-nums" style={{ color: T.textPri }}>—</td>
                      <td className="px-3 py-3 truncate max-w-[180px]" style={{ color: T.textSec }}>—</td>
                      <td className="px-6 py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: `${T.accent}20`, color: T.accent }}>Própria</span>
                      </td>
                    </tr>
                    {competitorRows.map((c, i) => {
                      const statusMap = {
                        leader:     { label: 'Líder',      bg: `${T.accent3}20`, color: T.accent3 },
                        challenger: { label: 'Desafiante', bg: `${T.accent}20`,  color: T.accent },
                        follower:   { label: 'Seguidor',   bg: `${T.textSec}20`, color: T.textSec },
                      };
                      const st = statusMap[c.status] || statusMap.follower;
                      return (
                        <tr key={i} className="hover:bg-[#1A1C1F] transition-colors" style={{ borderTop: `1px solid ${T.cardBorder}` }}>
                          <td className="px-6 py-3" style={{ color: T.textPri }}>{c.name}</td>
                          <td className="px-3 py-3 text-right tabular-nums" style={{ color: T.textSec }}>{c.bvs ?? '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums" style={{ color: T.textSec }}>{c.sov ?? '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums" style={{ color: T.textSec }}>{c.digital ?? '—'}</td>
                          <td className="px-3 py-3 truncate max-w-[180px]" style={{ color: T.textSec }}>{c.positioning}</td>
                          <td className="px-6 py-3 text-right">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyCard title="Nenhum concorrente analisado" ctaLabel="Analisar Concorrentes" ctaHref="/competitors" />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export { Dashboard };
