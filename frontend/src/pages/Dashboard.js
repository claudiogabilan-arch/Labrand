import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tutorial } from '../components/Tutorial';
import {
  Target,
  Heart,
  Compass,
  Star,
  Crosshair,
  Users,
  Globe,
  ArrowRight,
  TrendingUp,
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Plus,
  Lightbulb,
  Loader2,
  RefreshCw,
  Bell,
  MessageSquare,
  Link2,
  ExternalLink,
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music,
  Eye,
  Share2,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const formatNum = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const pillarInfo = [
  { key: 'start', name: 'Start', icon: Target, color: 'bg-[hsl(var(--chart-1))]', href: '/pillars/start', description: 'Diagnóstico inicial e cenários' },
  { key: 'values', name: 'Valores', icon: Heart, color: 'bg-[hsl(var(--chart-2))]', href: '/pillars/values', description: 'Valores e necessidades' },
  { key: 'purpose', name: 'Propósito', icon: Compass, color: 'bg-[hsl(var(--chart-3))]', href: '/pillars/purpose', description: 'Declaração de propósito' },
  { key: 'promise', name: 'Promessa', icon: Star, color: 'bg-[hsl(var(--chart-4))]', href: '/pillars/promise', description: 'Promessa da marca' },
  { key: 'positioning', name: 'Posicionamento', icon: Crosshair, color: 'bg-[hsl(var(--chart-5))]', href: '/pillars/positioning', description: 'Posição no mercado' },
  { key: 'personality', name: 'Personalidade', icon: Users, color: 'bg-[hsl(var(--secondary))]', href: '/pillars/personality', description: 'Arquétipos e atributos' },
  { key: 'universality', name: 'Universal', icon: Globe, color: 'bg-[hsl(var(--muted-foreground))]', href: '/pillars/universality', description: 'Acessibilidade e inclusão' },
];

export const Dashboard = () => {
  const { currentBrand, metrics, fetchMetrics } = useBrand();
  const { user, getAuthHeaders, token } = useAuth();
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  const [mentorInsights, setMentorInsights] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [clickupData, setClickupData] = useState({ connected: false, history: [], stats: {} });
  const [clickupPeriod, setClickupPeriod] = useState('all');
  const [socialDash, setSocialDash] = useState(null);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);

  useEffect(() => {
    const tutorialComplete = localStorage.getItem('labrand_tutorial_complete');
    if (!tutorialComplete) {
      setShowTutorial(true);
    }
  }, []);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      fetchMetrics(currentBrand.brand_id);
      loadDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.brand_id, fetchMetrics]);

  const loadDashboardData = async () => {
    if (!currentBrand?.brand_id || !token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [actRes, appRes, notifRes, clickupStatusRes, socialDashRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/activity?limit=5`, { headers }).catch(() => ({ data: { activities: [] } })),
        axios.get(`${API}/brands/${currentBrand.brand_id}/approvals?status=pending`, { headers }).catch(() => ({ data: { counts: {} } })),
        axios.get(`${API}/notifications?unread_only=true`, { headers }).catch(() => ({ data: { unread_count: 0 } })),
        axios.get(`${API}/integrations/clickup/status/${currentBrand.brand_id}`, { headers }).catch(() => ({ data: { connected: false } })),
        axios.get(`${API}/brands/${currentBrand.brand_id}/social-dashboard`, { headers }).catch(() => ({ data: null }))
      ]);
      setRecentActivity(actRes.data.activities || []);
      setPendingApprovals(appRes.data.counts?.pending || 0);
      setUnreadNotifs(notifRes.data.unread_count || 0);
      setSocialDash(socialDashRes.data?.connected_count > 0 ? socialDashRes.data : null);

      const cuStatus = clickupStatusRes.data;
      if (cuStatus.connected) {
        try {
          const [histRes, statsRes] = await Promise.all([
            axios.get(`${API}/integrations/clickup/sync-history/${currentBrand.brand_id}?limit=5`, { headers }),
            axios.get(`${API}/integrations/clickup/sync-stats/${currentBrand.brand_id}`, { headers }),
          ]);
          setClickupData({ connected: true, ...cuStatus, history: histRes.data || [], stats: statsRes.data || {} });
        } catch {
          setClickupData({ connected: true, ...cuStatus, history: [], stats: {} });
        }
      } else {
        setClickupData({ connected: false, history: [], stats: {} });
      }
    } catch { /* silent */ }
  };

  const loadClickupHistoryByPeriod = async (period) => {
    if (!currentBrand?.brand_id || !token) return;
    setClickupPeriod(period);
    const headers = { Authorization: `Bearer ${token}` };
    const daysParam = period === 'week' ? 7 : period === 'month' ? 30 : 0;
    try {
      const res = await axios.get(`${API}/integrations/clickup/sync-history/${currentBrand.brand_id}?limit=10&days=${daysParam}`, { headers });
      setClickupData(prev => ({ ...prev, history: res.data || [] }));
    } catch { /* silent */ }
  };

  const generateMentorInsights = async () => {
    if (!currentBrand?.brand_id) return;
    setIsLoadingInsights(true);
    try {
      const response = await axios.post(`${API}/ai/mentor`, {
        brand_id: currentBrand.brand_id,
        brand_name: currentBrand.name,
        industry: currentBrand.industry
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setMentorInsights(response.data.insights);
    } catch (error) {
      toast.error('Erro ao gerar insights');
    } finally {
      setIsLoadingInsights(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6" data-testid="no-brand-state">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading text-2xl font-semibold">Nenhuma marca cadastrada</h2>
          <p className="text-muted-foreground max-w-md">
            Comece criando sua primeira marca para acessar todas as ferramentas de gestão de branding.
          </p>
        </div>
        <Button onClick={() => navigate('/brands/new')} size="lg" data-testid="create-first-brand-btn">
          <Plus className="h-4 w-4 mr-2" />
          Criar minha primeira marca
        </Button>
      </div>
    );
  }

  // Score logic
  const score = metrics?.bvs_score ?? metrics?.overall_completion ?? 0;
  const scoreVariation = metrics?.bvs_variation ?? null;

  // Next action logic
  const nextPillar = pillarInfo.find(p => (metrics?.pillars?.[p.key] || 0) < 100);
  const nextAction = nextPillar
    ? { title: `Completar Pilar ${nextPillar.name}`, href: nextPillar.href }
    : { title: 'Avaliar Maturidade da Marca', href: '/maturity' };

  const isLoading = !metrics;

  return (
    <div className="space-y-8 relative" data-testid="dashboard">
      {/* Ambient orb for visual life */}
      <div className="ambient-orb -top-24 -right-24 opacity-60" />

      {/* ═══════════ ZONA 1 — HERO ═══════════ */}
      <Card className="border border-border/50 overflow-hidden relative z-10" data-testid="hero-card">
        {isLoading ? (
          <CardContent className="py-10">
            <div className="flex flex-col md:flex-row md:items-center gap-8 animate-pulse">
              <div className="flex-1 space-y-4">
                <div className="h-20 w-40 bg-muted rounded-lg" />
                <div className="h-4 w-56 bg-muted rounded" />
                <div className="h-3 w-44 bg-muted rounded" />
              </div>
              <div className="w-full md:w-80 h-32 bg-muted rounded-xl" />
            </div>
          </CardContent>
        ) : (
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              {/* Left — Score */}
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-medium">Score Geral</p>
                <p className="font-heading text-7xl font-bold tracking-tight leading-none" data-testid="hero-score">
                  {score}
                </p>
                {scoreVariation !== null && scoreVariation !== 0 && (
                  <p className={`text-sm font-medium mt-2 flex items-center gap-1 ${scoreVariation > 0 ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--destructive))]'}`} data-testid="hero-variation">
                    {scoreVariation > 0 ? '▲' : '▼'} {scoreVariation > 0 ? '+' : ''}{scoreVariation} esta semana
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Pontuação consolidada da sua marca
                </p>
              </div>

              {/* Right — Next Action */}
              <div className="w-full md:w-80 p-5 rounded-xl border border-border/60 bg-muted/30" data-testid="next-action-card">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium mb-3">Próximo passo recomendado</p>
                <h3 className="font-heading font-semibold text-base mb-4">{nextAction.title}</h3>
                <Button onClick={() => navigate(nextAction.href)} className="w-full" data-testid="next-action-btn">
                  Continuar <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ═══════════ ZONA 2 — PROGRESSO DOS PILARES ═══════════ */}
      <div className="relative z-10">
        <h2 className="font-heading text-lg font-semibold mb-4">Pilares de Marca</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3" data-testid="pillars-bento-grid">
          {pillarInfo.map((pillar) => {
            const Icon = pillar.icon;
            const progress = metrics?.pillars?.[pillar.key] || 0;

            return (
              <Link
                key={pillar.key}
                to={pillar.href}
                data-testid={`pillar-card-${pillar.key}`}
              >
                <Card className={`h-full pillar-card group ${progress === 100 ? 'border-[hsl(var(--success))]/40' : progress > 0 ? 'border-[hsl(var(--warning))]/30' : 'border-border/50'}`}>
                  <CardContent className="pt-4 pb-4 px-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-lg ${pillar.color} flex items-center justify-center`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      {progress === 100 && <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />}
                    </div>
                    <h3 className="font-heading font-semibold text-xs mb-1 truncate">{pillar.name}</h3>
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span className={`font-medium ${progress === 100 ? 'text-[hsl(var(--success))]' : progress > 0 ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'}`}>
                        {progress}%
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      className={`h-1 [&>div]:transition-all [&>div]:duration-500 ${progress === 100 ? '[&>div]:bg-[hsl(var(--success))]' : progress > 0 ? '[&>div]:bg-[hsl(var(--warning))]' : '[&>div]:bg-muted-foreground/20'}`}
                    />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══════════ ZONA 3 — ATIVIDADE ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        {/* Coluna esquerda — Atividade Recente */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Atividade Recente
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/collaboration')} data-testid="view-all-activity">
                Ver tudo <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade recente</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((act, i) => (
                  <div key={act.activity_id || i} className="flex items-start gap-3 text-sm" data-testid={`activity-${i}`}>
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-secondary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug truncate">{act.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{act.user_name} · {timeAgo(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna direita — Mentor IA */}
        <Card className="border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
                  <Lightbulb className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base font-heading">Mentor de Marca</CardTitle>
                  <CardDescription className="text-xs">Insights para {currentBrand?.name}</CardDescription>
                </div>
              </div>
              <Button
                onClick={generateMentorInsights}
                disabled={isLoadingInsights}
                variant="outline"
                size="sm"
                className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                data-testid="generate-insights-btn"
              >
                {isLoadingInsights ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mentorInsights ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{mentorInsights}</div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Clique no botão para receber recomendações de marca, oportunidades de mercado e sugestões estratégicas.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ═══════════ INTEGRAÇÕES ATIVAS (colapsável) ═══════════ */}
      {(clickupData.connected || socialDash) && (
        <div className="relative z-10" data-testid="integrations-section">
          <button
            onClick={() => setIntegrationsOpen(!integrationsOpen)}
            className="flex items-center gap-2 w-full text-left py-2 group"
            data-testid="integrations-toggle"
          >
            <h2 className="font-heading text-sm font-semibold text-muted-foreground uppercase tracking-wider">Integrações ativas</h2>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${integrationsOpen ? '' : '-rotate-90'}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${integrationsOpen ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-5">
              {/* ClickUp */}
              {clickupData.connected && (
                <Card data-testid="clickup-dashboard-widget">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base font-heading flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-violet-600" />
                          ClickUp
                        </CardTitle>
                        {clickupData.stats?.total > 0 && (
                          <Badge variant="secondary" className="text-xs font-bold" data-testid="clickup-total-badge">
                            {clickupData.stats.total} sincronizada{clickupData.stats.total !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/planning')} data-testid="clickup-widget-go-planning">
                        Planejamento <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      {clickupData.selected_list_name && (
                        <p className="text-xs text-muted-foreground">Lista: <span className="font-medium">{clickupData.selected_list_name}</span></p>
                      )}
                      <div className="flex border rounded-md overflow-hidden" data-testid="clickup-period-filter">
                        {[
                          { key: 'week', label: 'Semana', count: clickupData.stats?.this_week },
                          { key: 'month', label: 'Mês', count: clickupData.stats?.this_month },
                          { key: 'all', label: 'Todos', count: clickupData.stats?.total },
                        ].map(p => (
                          <button
                            key={p.key}
                            onClick={() => loadClickupHistoryByPeriod(p.key)}
                            className={`px-2.5 py-1 text-xs font-medium transition-colors ${
                              clickupPeriod === p.key
                                ? 'bg-violet-600 text-white'
                                : 'hover:bg-muted text-muted-foreground'
                            }`}
                            data-testid={`clickup-filter-${p.key}`}
                          >
                            {p.label}{p.count > 0 ? ` (${p.count})` : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {clickupData.history.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {clickupPeriod === 'all' ? 'Nenhuma tarefa sincronizada ainda.' : 'Nenhuma sincronização neste período.'}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {clickupData.history.map((item, i) => (
                          <div key={i} className="flex items-center justify-between py-2 border-b last:border-0" data-testid={`clickup-activity-${i}`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.task_title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {item.synced_by_name} · {new Date(item.synced_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                            {item.clickup_url && (
                              <a href={item.clickup_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 flex-shrink-0 ml-2"
                                data-testid={`clickup-activity-link-${i}`}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Social Media */}
              {socialDash && (
                <Card data-testid="social-dashboard-widget">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-heading flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-pink-500" />
                        Social Media — Visão Geral
                      </CardTitle>
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/social-listening')} data-testid="social-widget-go-listening">
                        Social Listening <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {Object.entries(socialDash.platforms || {}).map(([plat, data]) => {
                        const icons = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, tiktok: Music };
                        const colors = { instagram: 'text-pink-500', facebook: 'text-blue-600', linkedin: 'text-blue-700', youtube: 'text-red-600', tiktok: 'text-gray-800' };
                        const Icon = icons[plat] || Globe;
                        return (
                          <div key={plat} className="text-center p-3 rounded-lg bg-muted/50 border" data-testid={`social-plat-${plat}`}>
                            <Icon className={`h-5 w-5 mx-auto mb-1 ${colors[plat] || 'text-gray-500'}`} />
                            <p className="text-lg font-bold">{formatNum(data.followers || 0)}</p>
                            <p className="text-[10px] text-muted-foreground capitalize">{plat}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { icon: Heart, label: 'Curtidas', value: socialDash.total_engagement?.likes || 0, color: 'text-red-500' },
                        { icon: MessageSquare, label: 'Comentários', value: socialDash.total_engagement?.comments || 0, color: 'text-blue-500' },
                        { icon: Share2, label: 'Shares', value: socialDash.total_engagement?.shares || 0, color: 'text-green-500' },
                        { icon: Eye, label: 'Views', value: socialDash.total_engagement?.views || 0, color: 'text-purple-500' },
                      ].map((m, i) => (
                        <div key={i} className="text-center">
                          <m.icon className={`h-4 w-4 mx-auto mb-0.5 ${m.color}`} />
                          <p className="text-sm font-bold">{formatNum(m.value)}</p>
                          <p className="text-[10px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    {socialDash.top_posts?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Top Posts</p>
                        <div className="space-y-2">
                          {socialDash.top_posts.slice(0, 3).map((post, i) => {
                            const icons = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, tiktok: Music };
                            const Icon = icons[post.platform] || Globe;
                            const eng = post.engagement || {};
                            return (
                              <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm" data-testid={`top-post-${i}`}>
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Icon className="h-4 w-4 flex-shrink-0" />
                                  <p className="truncate text-xs">{post.content || '(sem texto)'}</p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-2">
                                  {eng.likes > 0 && <span><Heart className="h-3 w-3 inline text-red-400" /> {formatNum(eng.likes)}</span>}
                                  {eng.views > 0 && <span><Eye className="h-3 w-3 inline text-purple-400" /> {formatNum(eng.views)}</span>}
                                  {post.url && <a href={post.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground text-center">
                      {socialDash.total_engagement?.posts || 0} posts analisados de {socialDash.connected_count} rede{socialDash.connected_count > 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial */}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
};

export default Dashboard;
