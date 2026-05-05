import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { GitCompareArrows, ArrowUp, ArrowDown, Building2, MapPin, Megaphone, Check } from 'lucide-react';
import { SkeletonCard } from '../components/ui/skeleton-patterns';
import { EmptyState } from '../components/EmptyState';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const PILLAR_ORDER = ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality'];

function fmtDate(s) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase() || 'M';
}

function Trend({ a, b }) {
  if (a == null || b == null) return null;
  if (a === b) return <span className="text-muted-foreground/60 text-xs">=</span>;
  if (a > b) {
    return <span className="inline-flex items-center text-[hsl(var(--success))] text-xs"><ArrowUp className="w-3 h-3" /></span>;
  }
  return <span className="inline-flex items-center text-muted-foreground/70 text-xs"><ArrowDown className="w-3 h-3" /></span>;
}

function BrandPicker({ value, onChange, brands, disabledId, side }) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger data-testid={`compare-picker-${side}`} className="w-full">
        <SelectValue placeholder="Selecionar marca…" />
      </SelectTrigger>
      <SelectContent>
        {brands.map(b => (
          <SelectItem
            key={b.brand_id}
            value={b.brand_id}
            disabled={b.brand_id === disabledId}
          >
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function IdentityCard({ snap }) {
  if (!snap) return <SkeletonCard lines={3} />;
  const b = snap.brand;
  return (
    <Card data-testid="identity-card" className="border-border/60">
      <CardContent className="py-6 flex items-center gap-4">
        <Avatar className="h-14 w-14">
          <AvatarImage src={b.logo_url} alt={b.name} />
          <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(b.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-lg font-semibold truncate">{b.name}</p>
          <p className="text-xs text-muted-foreground">
            {b.sector || 'Setor não informado'} · atualizado em {fmtDate(snap.last_updated)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreCard({ snap, otherScore }) {
  if (!snap) return <SkeletonCard lines={2} />;
  const score = snap.metrics?.overall_completion ?? 0;
  return (
    <Card>
      <CardContent className="py-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Score consolidado</p>
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-5xl font-bold leading-none" data-testid="compare-score">{score}</span>
          <span className="text-muted-foreground text-sm">/ 100</span>
          <Trend a={score} b={otherScore} />
        </div>
        <Progress value={score} className="h-1.5 mt-4" />
      </CardContent>
    </Card>
  );
}

function MetricsRow({ snap, otherSnap }) {
  if (!snap) return <SkeletonCard lines={2} />;
  const items = [
    { label: 'Touchpoints', icon: MapPin,    val: snap.touchpoints_count ?? 0, other: otherSnap?.touchpoints_count ?? 0 },
    { label: 'Campanhas',   icon: Megaphone, val: snap.campaigns_count   ?? 0, other: otherSnap?.campaigns_count   ?? 0 },
    { label: 'Decisões',    icon: Check,     val: snap.decisions_count   ?? 0, other: otherSnap?.decisions_count   ?? 0 },
  ];
  return (
    <Card>
      <CardContent className="py-6 grid grid-cols-3 gap-4">
        {items.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="w-3.5 h-3.5" /> {item.label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl font-bold tabular-nums">{item.val}</span>
                {otherSnap && <Trend a={item.val} b={item.other} />}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PillarsTable({ snapA, snapB }) {
  if (!snapA || !snapB) return null;
  return (
    <Card data-testid="pillars-table">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Pilares</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_minmax(0,1.2fr)_minmax(0,1.2fr)] text-xs uppercase tracking-wider text-muted-foreground border-b pb-2 mb-2">
          <span>Pilar</span>
          <span className="truncate">{snapA.brand.name}</span>
          <span className="truncate">{snapB.brand.name}</span>
        </div>
        {PILLAR_ORDER.map(pt => {
          const a = snapA.pillars?.[pt] || { label: pt, progress: 0 };
          const b = snapB.pillars?.[pt] || { label: pt, progress: 0 };
          const aWins = a.progress > b.progress;
          const bWins = b.progress > a.progress;
          return (
            <div key={pt} className="grid grid-cols-[1fr_minmax(0,1.2fr)_minmax(0,1.2fr)] items-center py-3 border-b border-border/40 last:border-0" data-testid={`pillar-row-${pt}`}>
              <span className="font-medium text-sm">{a.label}</span>
              <div className={`pr-3 ${aWins ? 'opacity-100' : 'opacity-70'}`}>
                <div className="flex items-center gap-2">
                  <Progress value={a.progress} className="h-1.5 flex-1" />
                  <span className={`text-xs tabular-nums w-9 text-right ${aWins ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {a.progress}%
                  </span>
                </div>
              </div>
              <div className={`pl-3 ${bWins ? 'opacity-100' : 'opacity-70'}`}>
                <div className="flex items-center gap-2">
                  <Progress value={b.progress} className="h-1.5 flex-1" />
                  <span className={`text-xs tabular-nums w-9 text-right ${bWins ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                    {b.progress}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function PurposeDiff({ snapA, snapB }) {
  const a = snapA?.pillars?.purpose?.summary;
  const b = snapB?.pillars?.purpose?.summary;
  if (!a && !b) return null;
  return (
    <Card data-testid="purpose-diff">
      <CardHeader>
        <CardTitle className="font-heading text-lg">Propósito · lado a lado</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <blockquote className="border-l-2 border-secondary/50 pl-4 italic text-foreground/90 leading-relaxed" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          “{a || '— sem propósito definido —'}”
          <footer className="not-italic mt-3 text-xs text-muted-foreground" style={{ fontFamily: 'inherit' }}>
            — {snapA.brand.name}
          </footer>
        </blockquote>
        <blockquote className="border-l-2 border-secondary/50 pl-4 italic text-foreground/90 leading-relaxed" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
          “{b || '— sem propósito definido —'}”
          <footer className="not-italic mt-3 text-xs text-muted-foreground" style={{ fontFamily: 'inherit' }}>
            — {snapB.brand.name}
          </footer>
        </blockquote>
      </CardContent>
    </Card>
  );
}

export default function BrandCompare() {
  const { brands } = useBrand();
  const { token } = useAuth();
  const location = useLocation();

  // Read deep-link IDs from query string (?a=brand_id&b=brand_id) so the
  // command palette can pre-select a comparison pair.
  const initialIds = useMemo(() => {
    const p = new URLSearchParams(location.search);
    return { a: p.get('a') || null, b: p.get('b') || null };
  }, [location.search]);

  const [idA, setIdA] = useState(initialIds.a);
  const [idB, setIdB] = useState(initialIds.b);
  const [snapA, setSnapA] = useState(null);
  const [snapB, setSnapB] = useState(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const fetchSnap = async (id, setSnap, setLoading) => {
    if (!id) { setSnap(null); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/brands/${id}/compare-snapshot`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSnap(res.data);
    } catch {
      setSnap(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSnap(idA, setSnapA, setLoadingA); /* eslint-disable-next-line */ }, [idA]);
  useEffect(() => { fetchSnap(idB, setSnapB, setLoadingB); /* eslint-disable-next-line */ }, [idB]);

  const bothSelected = !!(idA && idB);

  return (
    <div className="space-y-6" data-testid="brand-compare-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--secondary))] flex items-center justify-center">
          <GitCompareArrows className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Comparar marcas</h1>
          <p className="text-muted-foreground">Veja pilares, scores e métricas em paralelo — útil para reuniões de portfólio.</p>
        </div>
      </div>

      {/* Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="compare-pickers">
        <BrandPicker side="a" value={idA} onChange={setIdA} brands={brands || []} disabledId={idB} />
        <BrandPicker side="b" value={idB} onChange={setIdB} brands={brands || []} disabledId={idA} />
      </div>

      {!bothSelected ? (
        <EmptyState
          icon={Building2}
          title="Selecione duas marcas para comparar"
          description="Escolha uma marca em cada seletor acima. Vamos consolidar pilares, score, touchpoints, campanhas e decisões lado a lado."
          testId="compare-empty"
        />
      ) : (
        <div className="space-y-6">
          {/* Linha 1 — Identidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingA ? <SkeletonCard lines={3} /> : <IdentityCard snap={snapA} />}
            {loadingB ? <SkeletonCard lines={3} /> : <IdentityCard snap={snapB} />}
          </div>

          {/* Linha 2 — Score */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingA ? <SkeletonCard lines={2} /> : <ScoreCard snap={snapA} otherScore={snapB?.metrics?.overall_completion} />}
            {loadingB ? <SkeletonCard lines={2} /> : <ScoreCard snap={snapB} otherScore={snapA?.metrics?.overall_completion} />}
          </div>

          {/* Linha 3 — Pilares */}
          <PillarsTable snapA={snapA} snapB={snapB} />

          {/* Linha 4 — Operacional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingA ? <SkeletonCard lines={2} /> : <MetricsRow snap={snapA} otherSnap={snapB} />}
            {loadingB ? <SkeletonCard lines={2} /> : <MetricsRow snap={snapB} otherSnap={snapA} />}
          </div>

          {/* Linha 5 — Propósito lado a lado */}
          <PurposeDiff snapA={snapA} snapB={snapB} />
        </div>
      )}
    </div>
  );
}
