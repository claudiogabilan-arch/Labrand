import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Loader2, ChevronRight, CheckCircle2, Circle, Lock,
  Target, Heart, Compass, Star, Crosshair, Users, Globe,
  ListTodo, Calendar, Radio, FileText, BarChart3, TrendingUp,
  Sparkles, Plug, Activity, Palette,
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PHASES = [
  {
    id: 'foundation',
    title: 'Fundacao',
    subtitle: 'Construa a base estrategica',
    color: '#3B82F6',
    modules: [
      { key: 'start',   label: 'Start',       icon: Target,   route: '/pillars/start',   pillar: 'start' },
      { key: 'values',  label: 'Valores',      icon: Heart,    route: '/pillars/values',  pillar: 'values' },
      { key: 'purpose', label: 'Proposito',    icon: Compass,  route: '/pillars/purpose', pillar: 'purpose' },
    ],
  },
  {
    id: 'differentiation',
    title: 'Diferenciacao',
    subtitle: 'Destaque-se no mercado',
    color: '#F59E0B',
    modules: [
      { key: 'promise',      label: 'Promessa',        icon: Star,      route: '/pillars/promise',      pillar: 'promise' },
      { key: 'positioning',  label: 'Posicionamento',  icon: Crosshair, route: '/pillars/positioning',  pillar: 'positioning' },
    ],
  },
  {
    id: 'expression',
    title: 'Expressao',
    subtitle: 'De vida a marca',
    color: '#8B5CF6',
    modules: [
      { key: 'personality',   label: 'Personalidade', icon: Users,    route: '/pillars/personality',   pillar: 'personality' },
      { key: 'universality',  label: 'Universal',     icon: Globe,    route: '/pillars/universality',  pillar: 'universality' },
      { key: 'naming',        label: 'Naming',        icon: Sparkles, route: '/naming' },
      { key: 'brand_way',     label: 'Jeito de Ser',  icon: Palette,  route: '/brand-way' },
    ],
  },
  {
    id: 'management',
    title: 'Gestao',
    subtitle: 'Opere e gerencie a marca',
    color: '#10B981',
    modules: [
      { key: 'planning',    label: 'Planejamento', icon: ListTodo, route: '/planning' },
      { key: 'campaigns',   label: 'Campanhas',    icon: Calendar, route: '/campaigns' },
      { key: 'social',      label: 'Social',       icon: Radio,    route: '/social-listening' },
      { key: 'integrations',label: 'Integracoes',  icon: Plug,     route: '/integrations' },
    ],
  },
  {
    id: 'growth',
    title: 'Crescimento',
    subtitle: 'Mensure e otimize resultados',
    color: '#EC4899',
    modules: [
      { key: 'reports',    label: 'Relatorios',   icon: FileText,    route: '/reports' },
      { key: 'benchmark',  label: 'Benchmark',    icon: BarChart3,   route: '/benchmark' },
      { key: 'brand_health', label: 'Saude',      icon: Activity,    route: '/brand-health' },
      { key: 'valuation',  label: 'Valuation',    icon: TrendingUp,  route: '/valuation' },
    ],
  },
];

export default function BrandJourney() {
  const navigate = useNavigate();
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [tasks, setTasks] = useState({ total: 0, completed: 0 });
  const [campaigns, setCampaigns] = useState(0);

  const fetchData = useCallback(async () => {
    if (!currentBrand?.brand_id || !token) return;
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [metRes, campRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/metrics`, { headers }).catch(() => null),
        axios.get(`${API}/brands/${currentBrand.brand_id}/campaigns`, { headers }).catch(() => null),
      ]);

      if (metRes?.data) {
        setMetrics(metRes.data);
        setTasks(metRes.data.tasks || { total: 0, completed: 0 });
      }
      if (campRes?.data) {
        setCampaigns(Array.isArray(campRes.data) ? campRes.data.length : 0);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [currentBrand?.brand_id, token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Compute module completion status
  const getModuleStatus = (mod) => {
    if (mod.pillar && metrics?.pillars) {
      const val = metrics.pillars[mod.pillar] || 0;
      if (val >= 100) return 'done';
      if (val > 0) return 'in_progress';
      return 'pending';
    }
    // Non-pillar modules: check by key
    if (mod.key === 'planning' && tasks.total > 0) return tasks.completed > 0 ? 'done' : 'in_progress';
    if (mod.key === 'campaigns' && campaigns > 0) return 'done';
    return 'pending';
  };

  const getModuleProgress = (mod) => {
    if (mod.pillar && metrics?.pillars) return metrics.pillars[mod.pillar] || 0;
    if (mod.key === 'planning' && tasks.total > 0) return Math.round((tasks.completed / tasks.total) * 100);
    if (mod.key === 'campaigns' && campaigns > 0) return 100;
    return 0;
  };

  // Phase completion
  const getPhaseCompletion = (phase) => {
    const modules = phase.modules;
    const total = modules.length;
    if (total === 0) return 0;
    const sum = modules.reduce((acc, mod) => acc + getModuleProgress(mod), 0);
    return Math.round(sum / total);
  };

  // Overall journey progress
  const overallProgress = metrics?.overall_completion || 0;

  // Recommended next action
  const getNextAction = () => {
    for (const phase of PHASES) {
      for (const mod of phase.modules) {
        const status = getModuleStatus(mod);
        if (status === 'in_progress') return { label: `Continuar ${mod.label}`, route: mod.route, phase: phase.title };
        if (status === 'pending') return { label: `Comecar ${mod.label}`, route: mod.route, phase: phase.title };
      }
    }
    return null;
  };

  const nextAction = !loading ? getNextAction() : null;

  if (!currentBrand) {
    return (
      <div className="text-center py-12" data-testid="brand-journey-page">
        <p className="text-muted-foreground">Selecione uma marca para ver a jornada.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="brand-journey-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="brand-journey-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Jornada da Marca</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe a evolucao de <strong>{currentBrand.name}</strong> em cada fase estrategica
        </p>
      </div>

      {/* Overall Progress Bar */}
      <Card data-testid="journey-overall-progress">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold">Progresso Geral</div>
              <div className="text-xs text-muted-foreground">
                {metrics?.pillars_completed || 0} de {metrics?.pillars_total || 7} pilares completos
              </div>
            </div>
            <div className="text-2xl font-bold">{overallProgress}%</div>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            {PHASES.map((phase, idx) => {
              const width = 100 / PHASES.length;
              const comp = getPhaseCompletion(phase);
              return (
                <div
                  key={phase.id}
                  className="absolute top-0 h-full transition-all duration-500"
                  style={{
                    left: `${idx * width}%`,
                    width: `${(comp / 100) * width}%`,
                    backgroundColor: phase.color,
                    borderRadius: idx === 0 ? '9999px 0 0 9999px' : idx === PHASES.length - 1 ? '0 9999px 9999px 0' : '0',
                  }}
                />
              );
            })}
          </div>
          <div className="flex mt-2">
            {PHASES.map((phase) => (
              <div key={phase.id} className="flex-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: phase.color }} />
                {phase.title}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Recommended Action */}
      {nextAction && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5" data-testid="journey-next-action">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Proximo Passo Recomendado</div>
              <div className="text-sm font-semibold mt-0.5">{nextAction.label}</div>
              <div className="text-xs text-muted-foreground">Fase: {nextAction.phase}</div>
            </div>
            <Button size="sm" onClick={() => navigate(nextAction.route)} data-testid="journey-next-action-btn">
              Ir agora
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Journey Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-border" />

        <div className="space-y-8">
          {PHASES.map((phase, phaseIdx) => {
            const phaseCompletion = getPhaseCompletion(phase);
            const allDone = phaseCompletion >= 100;
            const anyStarted = phaseCompletion > 0;

            return (
              <div key={phase.id} className="relative" data-testid={`phase-${phase.id}`}>
                {/* Phase marker on timeline */}
                <div className="flex items-start gap-4">
                  <div
                    className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-lg`}
                    style={{ backgroundColor: allDone ? phase.color : anyStarted ? phase.color : '#94A3B8' }}
                  >
                    {allDone ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      <span>{phaseIdx + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Phase header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h2 className="font-bold text-lg font-heading" style={{ color: anyStarted ? phase.color : undefined }}>
                          {phase.title}
                        </h2>
                        <p className="text-xs text-muted-foreground">{phase.subtitle}</p>
                      </div>
                      <Badge
                        variant={allDone ? 'default' : anyStarted ? 'secondary' : 'outline'}
                        className="text-xs"
                        style={allDone ? { backgroundColor: phase.color } : {}}
                      >
                        {phaseCompletion}%
                      </Badge>
                    </div>

                    {/* Module cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {phase.modules.map((mod) => {
                        const status = getModuleStatus(mod);
                        const progress = getModuleProgress(mod);
                        const Icon = mod.icon;

                        return (
                          <button
                            key={mod.key}
                            onClick={() => navigate(mod.route)}
                            className="group text-left p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200 hover:border-primary/30"
                            data-testid={`journey-module-${mod.key}`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                                style={{
                                  backgroundColor: status === 'done' ? `${phase.color}20` : 'hsl(var(--muted))',
                                  color: status === 'done' ? phase.color : 'hsl(var(--muted-foreground))',
                                }}
                              >
                                <Icon className="h-4.5 w-4.5" />
                              </div>
                              {status === 'done' && (
                                <CheckCircle2 className="h-4 w-4" style={{ color: phase.color }} />
                              )}
                              {status === 'in_progress' && (
                                <div className="h-4 w-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: `${phase.color} transparent ${phase.color} ${phase.color}` }} />
                              )}
                              {status === 'pending' && (
                                <Circle className="h-4 w-4 text-muted-foreground/30" />
                              )}
                            </div>
                            <div className="font-medium text-sm mb-1">{mod.label}</div>
                            <Progress value={progress} className="h-1" />
                            <div className="text-[10px] text-muted-foreground mt-1">{progress}% completo</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
