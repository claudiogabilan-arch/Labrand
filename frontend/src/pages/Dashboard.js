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
  RefreshCw
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [showTutorial, setShowTutorial] = useState(false);
  const [mentorInsights, setMentorInsights] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

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
    }
  }, [currentBrand?.brand_id, fetchMetrics]);

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
    <div className="space-y-8" data-testid="dashboard">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">
            Olá, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a marca <span className="font-medium text-foreground">{currentBrand.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            {overallProgress}% concluído
          </Badge>
        </div>
      </div>

      {/* Overall Progress Card */}
      <Card className="border-l-4 border-l-primary" data-testid="overall-progress-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <h3 className="font-heading font-semibold text-lg mb-2">Progresso Geral da Marca</h3>
              <Progress value={overallProgress} className="h-3" />
              <p className="text-sm text-muted-foreground mt-2">
                {overallProgress < 30 && 'Você está começando! Complete os pilares para fortalecer sua marca.'}
                {overallProgress >= 30 && overallProgress < 70 && 'Bom progresso! Continue preenchendo os pilares.'}
                {overallProgress >= 70 && overallProgress < 100 && 'Quase lá! Finalize os últimos detalhes.'}
                {overallProgress === 100 && 'Parabéns! Todos os pilares estão completos.'}
              </p>
              {/* BVS Impact Indicator */}
              <div className="mt-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Impacto no</span>
                  <span className="font-semibold text-primary">BVS Score:</span>
                  <span className="font-bold">
                    {overallProgress < 30 && '+5-15 pontos ao completar pilares'}
                    {overallProgress >= 30 && overallProgress < 70 && '+10-20 pontos potenciais'}
                    {overallProgress >= 70 && '+25 pontos de Força da Marca'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{metrics?.tasks?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Tarefas concluídas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">{metrics?.tasks?.in_progress || 0}</div>
                <div className="text-xs text-muted-foreground">Em andamento</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{metrics?.decisions?.validated || 0}</div>
                <div className="text-xs text-muted-foreground">Decisões validadas</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pillars Grid */}
      <div>
        <h2 className="font-heading text-xl font-semibold mb-4">Pilares de Marca</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pillarInfo.map((pillar) => {
            const Icon = pillar.icon;
            const progress = metrics?.pillars?.[pillar.key] || 0;
            
            return (
              <Link 
                key={pillar.key} 
                to={pillar.href}
                data-testid={`pillar-card-${pillar.key}`}
              >
                <Card className="h-full card-hover group">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg ${pillar.color} flex items-center justify-center`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-heading font-semibold mb-1">{pillar.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{pillar.description}</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-hover cursor-pointer" onClick={() => navigate('/planning')} data-testid="quick-action-planning">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ListTodo className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold">Planejamento</h3>
                <p className="text-sm text-muted-foreground">
                  {metrics?.tasks?.backlog || 0} tarefas no backlog
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => navigate('/scorecard')} data-testid="quick-action-scorecard">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold">Decisões</h3>
                <p className="text-sm text-muted-foreground">
                  {metrics?.decisions?.pending || 0} pendentes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => navigate('/narratives')} data-testid="quick-action-narratives">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-heading font-semibold">Narrativas</h3>
                <p className="text-sm text-muted-foreground">
                  Histórias e manifesto
                </p>
              </div>
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
