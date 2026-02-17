import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  Users, CreditCard, Zap, TrendingUp, DollarSign, 
  BarChart3, Activity, Shield, Loader2, RefreshCw,
  Brain, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_LABELS = {
  suggestion: 'Sugestão de IA',
  risk_analysis: 'Análise de Risco',
  consistency_analysis: 'Alertas de Consistência',
  mentor_insight: 'Mentor IA',
  brand_way_suggestion: 'Jeito de Ser (IA)',
  purchase_starter: 'Compra Starter',
  purchase_pro: 'Compra Pro',
  purchase_enterprise: 'Compra Enterprise'
};

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [aiUsage, setAiUsage] = useState(null);

  useEffect(() => {
    if (user && user.role !== 'admin' && !user.is_admin) {
      toast.error('Acesso restrito a administradores');
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, aiRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/users?limit=20`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/ai-usage?days=30`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setAiUsage(aiRes.data);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Acesso negado');
        navigate('/dashboard');
      } else {
        toast.error('Erro ao carregar dados');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Visão geral da plataforma</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuários</p>
                <p className="text-3xl font-bold">{stats?.users?.total || 0}</p>
                <p className="text-xs text-green-600">{stats?.users?.active || 0} verificados</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Marcas</p>
                <p className="text-3xl font-bold">{stats?.brands?.total || 0}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-3xl font-bold">R$ {(stats?.revenue?.total || 0).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{stats?.revenue?.transactions || 0} transações</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Créditos IA Usados</p>
                <p className="text-3xl font-bold">{stats?.credits?.total_used || 0}</p>
                <p className="text-xs text-muted-foreground">de {stats?.credits?.total_sold || 0} vendidos</p>
              </div>
              <Brain className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="ai">Consumo IA</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Users by Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usuários por Plano</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats?.users?.by_plan || {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={plan === 'enterprise' ? 'default' : 'outline'}>
                        {plan.charAt(0).toUpperCase() + plan.slice(1)}
                      </Badge>
                    </div>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Usage by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uso de IA por Tipo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats?.ai_usage?.by_type?.slice(0, 6).map((item) => (
                  <div key={item._id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{ACTION_LABELS[item._id] || item._id}</span>
                      <span className="font-medium">{item.count}x ({item.total_credits} créditos)</span>
                    </div>
                    <Progress value={(item.count / (stats?.ai_usage?.by_type?.[0]?.count || 1)) * 100} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Credits Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Créditos IA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Vendidos</span>
                    <span className="font-bold text-green-600">+{stats?.credits?.total_sold || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Consumidos</span>
                    <span className="font-bold text-red-600">-{stats?.credits?.total_used || 0}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Saldo dos Clientes</span>
                    <span className="font-bold">{stats?.credits?.total_available || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Estimated Costs */}
            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-500" />
                  Custo Estimado Emergent
                </CardTitle>
                <CardDescription>Últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Chamadas de IA:</span>
                    <span className="font-bold">{aiUsage?.total_calls || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Créditos consumidos:</span>
                    <span className="font-bold">{aiUsage?.total_credits_consumed || 0}</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg">
                    <span>Custo estimado:</span>
                    <span className="font-bold text-orange-600">
                      ~R$ {aiUsage?.estimated_cost_brl || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    (US$ {aiUsage?.estimated_cost_usd || 0} × R$ 5,50)
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Usuários por Consumo de IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.ai_usage?.top_users?.map((u, i) => (
                  <div key={u._id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{i + 1}º</Badge>
                      <div>
                        <p className="font-medium">{u.name || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{u.total_credits_used} créditos</p>
                      <p className="text-xs text-muted-foreground">{u.total_calls} chamadas</p>
                    </div>
                  </div>
                ))}
                {(!stats?.ai_usage?.top_users || stats.ai_usage.top_users.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Nenhum uso registrado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuários Recentes</CardTitle>
              <CardDescription>Últimos 20 usuários cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.user_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {u.picture ? (
                          <img src={u.picture} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <span className="font-bold text-primary">{u.name?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={u.plan === 'enterprise' ? 'default' : u.plan === 'executivo' ? 'secondary' : 'outline'}>
                        {u.plan || 'free'}
                      </Badge>
                      <div className="text-right text-sm">
                        <p>{u.credits?.available_credits || 0} créditos</p>
                        <p className="text-xs text-muted-foreground">
                          {u.email_verified ? '✓ Verificado' : '⏳ Pendente'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Usage Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consumo de IA Detalhado</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{aiUsage?.total_calls || 0}</p>
                  <p className="text-sm text-muted-foreground">Chamadas de IA</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-purple-600">{aiUsage?.total_credits_consumed || 0}</p>
                  <p className="text-sm text-muted-foreground">Créditos Consumidos</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-center">
                  <p className="text-3xl font-bold text-orange-600">~R$ {aiUsage?.estimated_cost_brl || 0}</p>
                  <p className="text-sm text-muted-foreground">Custo Estimado</p>
                </div>
              </div>

              <h4 className="font-semibold mb-3">Por Tipo de Funcionalidade</h4>
              <div className="space-y-3">
                {Object.entries(aiUsage?.by_action || {}).map(([action, data]) => (
                  <div key={action} className="flex items-center justify-between p-2 border rounded">
                    <span>{ACTION_LABELS[action] || action}</span>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">{data.count} chamadas</Badge>
                      <Badge>{data.credits} créditos</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
