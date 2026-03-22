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
  MessageSquare
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const pillarInfo = [
  { key: 'start', name: 'Start', icon: Target, color: 'bg-blue-500', href: '/pillars/start', description: 'Diagnóstico inicial e cenários' },
  { key: 'values', name: 'Valores', icon: Heart, color: 'bg-rose-500', href: '/pillars/values', description: 'Valores e necessidades' },
  { key: 'purpose', name: 'Propósito', icon: Compass, color: 'bg-amber-500', href: '/pillars/purpose', description: 'Declaração de propósito' },
  { key: 'promise', name: 'Promessa', icon: Star, color: 'bg-purple-500', href: '/pillars/promise', description: 'Promessa da marca' },
  { key: 'positioning', name: 'Posicionamento', icon: Crosshair, color: 'bg-emerald-500', href: '/pillars/positioning', description: 'Posição no mercado' },
  { key: 'personality', name: 'Personalidade', icon: Users, color: 'bg-orange-500', href: '/pillars/personality', description: 'Arquétipos e atributos' },
  { key: 'universality', name: 'Universal', icon: Globe, color: 'bg-cyan-500', href: '/pillars/universality', description: 'Acessibilidade e inclusão' },
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

  useEffect(() => {
    // Show tutorial on first visit
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
      const [actRes, appRes, notifRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/activity?limit=5`, { headers }).catch(() => ({ data: { activities: [] } })),
        axios.get(`${API}/brands/${currentBrand.brand_id}/approvals?status=pending`, { headers }).catch(() => ({ data: { counts: {} } })),
        axios.get(`${API}/notifications?unread_only=true`, { headers }).catch(() => ({ data: { unread_count: 0 } }))
      ]);
      setRecentActivity(actRes.data.activities || []);
      setPendingApprovals(appRes.data.counts?.pending || 0);
      setUnreadNotifs(notifRes.data.unread_count || 0);
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

  const overallProgress = metrics?.overall_completion || 0;

  return (
    <div className="space-y-8 relative" data-testid="dashboard">
      {/* Ambient orb for visual life */}
      <div className="ambient-orb -top-24 -right-24 opacity-60" />

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Olá, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie a marca <span className="font-medium text-foreground">{currentBrand.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 border-border/60 text-sm font-medium">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-secondary" />
            {overallProgress}% concluído
          </Badge>
        </div>
      </div>

      {/* Overall Progress Card */}
      <Card className="border border-border/50 overflow-hidden relative z-10" data-testid="overall-progress-card">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-secondary/80 to-secondary/20" style={{width: `${overallProgress}%`}} />
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-base mb-3">Progresso Geral da Marca</h3>
              <Progress value={overallProgress} className="h-1.5 [&>div]:bg-secondary" />
              <p className="text-sm text-muted-foreground mt-2">
                {overallProgress < 30 && 'Você está começando! Complete os pilares para fortalecer sua marca.'}
                {overallProgress >= 30 && overallProgress < 70 && 'Bom progresso! Continue preenchendo os pilares.'}
                {overallProgress >= 70 && overallProgress < 100 && 'Quase lá! Finalize os últimos detalhes.'}
                {overallProgress === 100 && 'Parabéns! Todos os pilares estão completos.'}
              </p>
              <div className="mt-3 p-3 bg-accent rounded-lg border border-secondary/10">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-secondary" />
                  <span className="text-muted-foreground">Impacto no</span>
                  <span className="font-semibold text-accent-foreground">BVS Score:</span>
                  <span className="font-bold text-accent-foreground">
                    {overallProgress < 30 && '+5-15 pontos ao completar pilares'}
                    {overallProgress >= 30 && overallProgress < 70 && '+10-20 pontos potenciais'}
                    {overallProgress >= 70 && '+25 pontos de Força da Marca'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{metrics?.tasks?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Concluídas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{metrics?.tasks?.in_progress || 0}</div>
                <div className="text-xs text-muted-foreground">Andamento</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{metrics?.decisions?.validated || 0}</div>
                <div className="text-xs text-muted-foreground">Validadas</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pillars Grid */}
      <div className="relative z-10">
        <h2 className="font-heading text-lg font-semibold mb-4">Pilares de Marca</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {pillarInfo.map((pillar) => {
            const Icon = pillar.icon;
            const progress = metrics?.pillars?.[pillar.key] || 0;
            
            return (
              <Link 
                key={pillar.key} 
                to={pillar.href}
                data-testid={`pillar-card-${pillar.key}`}
              >
                <Card className={`h-full pillar-card group ${progress === 100 ? 'border-emerald-200/60' : progress > 0 ? 'border-amber-200/40' : 'border-border/50'}`}>
                  <CardContent className="pt-6 pb-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-xl ${pillar.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      {progress === 100 ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-secondary transition-colors duration-200" />
                      )}
                    </div>
                    <h3 className="font-heading font-semibold text-sm mb-1">{pillar.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{pillar.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className={`font-medium ${progress === 100 ? 'text-emerald-600' : progress > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          {progress}%
                        </span>
                      </div>
                      <Progress 
                        value={progress} 
                        className={`h-1 [&>div]:transition-all [&>div]:duration-500 ${progress === 100 ? '[&>div]:bg-emerald-500' : progress > 0 ? '[&>div]:bg-amber-500' : '[&>div]:bg-muted-foreground/20'}`} 
                      />
                      {progress === 0 && (
                        <p className="text-xs text-secondary/70 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          +3 pts no BVS ao completar
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
        <Card className="pillar-card cursor-pointer group" onClick={() => navigate('/planning')} data-testid="quick-action-planning">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                <ListTodo className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">Planejamento</h3>
                <p className="text-xs text-muted-foreground">
                  {metrics?.tasks?.backlog || 0} tarefas no backlog
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pillar-card cursor-pointer group" onClick={() => navigate('/scorecard')} data-testid="quick-action-scorecard">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100">
                <CheckCircle2 className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">Decisões</h3>
                <p className="text-xs text-muted-foreground">
                  {metrics?.decisions?.pending || 0} pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="pillar-card cursor-pointer group" onClick={() => navigate('/narratives')} data-testid="quick-action-narratives">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center border border-purple-100">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-sm">Narrativas</h3>
                <p className="text-xs text-muted-foreground">
                  Histórias e manifesto
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity + Approvals Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        {/* Recent Activity */}
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

        {/* Quick Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Status Rapido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate('/collaboration')} data-testid="pending-approvals-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Aprovacoes Pendentes</p>
                  <p className="text-xs text-muted-foreground">Aguardando sua acao</p>
                </div>
              </div>
              <span className="text-lg font-bold text-amber-600">{pendingApprovals}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => {}} data-testid="unread-notifs-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Bell className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Notificacoes</p>
                  <p className="text-xs text-muted-foreground">Nao lidas</p>
                </div>
              </div>
              <span className="text-lg font-bold text-secondary">{unreadNotifs}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => navigate('/naming')} data-testid="naming-card">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Naming</p>
                  <p className="text-xs text-muted-foreground">Ferramenta de criacao de nomes</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentor / AI Insights */}
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Mentor de Marca</CardTitle>
                <CardDescription>Insights personalizados para {currentBrand?.name}</CardDescription>
              </div>
            </div>
            <Button 
              onClick={generateMentorInsights} 
              disabled={isLoadingInsights}
              variant="outline"
              className="border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
            >
              {isLoadingInsights ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Gerar Insights
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mentorInsights ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-sm">{mentorInsights}</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Clique em "Gerar Insights" para receber recomendações de melhorias, ações de marca, 
              oportunidades de mercado e sugestões de novos produtos baseados nos dados da sua marca.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tutorial */}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
    </div>
  );
};

export default Dashboard;
