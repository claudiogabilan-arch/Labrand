import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, CreditCard, Zap, TrendingUp, DollarSign, 
  BarChart3, Activity, Shield, Loader2, RefreshCw,
  Brain, Search, Eye, MapPin, Layers,
  UserCheck, UserX, Clock, Calendar
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACTION_LABELS = {
  suggestion: 'Sugestao de IA',
  risk_analysis: 'Analise de Risco',
  consistency_analysis: 'Alertas de Consistencia',
  mentor_insight: 'Mentor IA',
  brand_way_suggestion: 'Jeito de Ser (IA)',
  purchase_starter: 'Compra Starter',
  purchase_pro: 'Compra Pro',
  purchase_enterprise: 'Compra Enterprise'
};

const PLAN_COLORS = {
  free: 'bg-gray-100 text-gray-700 border-gray-300',
  founder: 'bg-blue-100 text-blue-700 border-blue-300',
  essencial: 'bg-green-100 text-green-700 border-green-300',
  executivo: 'bg-purple-100 text-purple-700 border-purple-300',
  enterprise: 'bg-amber-100 text-amber-700 border-amber-300'
};

const PAYMENT_STATUS_COLORS = {
  pagante: 'bg-green-500 text-white',
  trial: 'bg-blue-500 text-white',
  free: 'bg-gray-400 text-white'
};

const PAYMENT_STATUS_LABELS = {
  pagante: 'Pagante',
  trial: 'Trial',
  free: 'Free'
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '-'; }
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch { return '-'; }
}

function timeSince(dateStr) {
  if (!dateStr) return 'nunca';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'hoje';
    if (diff === 1) return 'ontem';
    if (diff < 7) return `${diff}d atras`;
    if (diff < 30) return `${Math.floor(diff / 7)}sem atras`;
    return `${Math.floor(diff / 30)}m atras`;
  } catch { return '-'; }
}

// User Detail Dialog
function UserDetailDialog({ user, open, onClose }) {
  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              {user.picture ? <img src={user.picture} alt="" className="w-10 h-10 rounded-full" /> : <span className="font-bold text-primary">{user.name?.charAt(0) || '?'}</span>}
            </div>
            <div>
              <p>{user.name}</p>
              <p className="text-sm font-normal text-muted-foreground">{user.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Status */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <Badge className={PAYMENT_STATUS_COLORS[user.payment_status] || 'bg-gray-400'}>{PAYMENT_STATUS_LABELS[user.payment_status] || user.payment_status}</Badge>
              <p className="text-xs text-muted-foreground mt-1">Status</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="font-bold">{user.plan || 'free'}</p>
              <p className="text-xs text-muted-foreground">Plano</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="font-bold">{user.role}</p>
              <p className="text-xs text-muted-foreground">Role</p>
            </div>
          </div>

          {/* Activity */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Atividade</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cadastro</span><span>{formatDate(user.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Ultima atividade</span><span>{timeSince(user.last_activity)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email verificado</span><span>{user.email_verified ? 'Sim' : 'Nao'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Onboarding</span><span>{user.onboarding_completed ? 'Completo' : 'Pendente'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Trial ate</span><span>{formatDate(user.trial_ends_at)}</span></div>
            </CardContent>
          </Card>

          {/* Brands */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Marcas ({user.brands_count || 0})</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-sm">
              {user.brands_owned?.length > 0 && user.brands_owned.map(b => (
                <div key={b.brand_id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                  <Badge variant="outline" className="text-xs">Owner</Badge>
                  <span>{b.name || b.brand_id}</span>
                </div>
              ))}
              {user.brands_member?.length > 0 && user.brands_member.map(b => (
                <div key={b.brand_id} className="flex items-center gap-2 p-1.5 rounded bg-muted/30">
                  <Badge variant="secondary" className="text-xs">Membro</Badge>
                  <span>{b.name || b.brand_id}</span>
                </div>
              ))}
              {(!user.brands_owned?.length && !user.brands_member?.length) && <p className="text-muted-foreground">Nenhuma marca</p>}
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border text-center">
              <p className="text-xl font-bold">{user.touchpoints_count || 0}</p>
              <p className="text-xs text-muted-foreground">Touchpoints</p>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <p className="text-xl font-bold">{user.pillars_count || 0}</p>
              <p className="text-xs text-muted-foreground">Pilares</p>
            </div>
            <div className="p-3 rounded-lg border text-center">
              <p className="text-xl font-bold">{user.credits?.available_credits || 0}</p>
              <p className="text-xs text-muted-foreground">Creditos IA</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersSummary, setUsersSummary] = useState({});
  const [aiUsage, setAiUsage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
        axios.get(`${API}/admin/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/admin/ai-usage?days=30`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setUsersSummary(usersRes.data.summary || {});
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

  const loadFilteredUsers = async () => {
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (searchQuery) params.set('search', searchQuery);
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);
      
      const res = await axios.get(`${API}/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data.users);
      setUsersSummary(res.data.summary || {});
    } catch { toast.error('Erro ao filtrar'); }
  };

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(loadFilteredUsers, 300);
      return () => clearTimeout(t);
    }
  }, [searchQuery, roleFilter, planFilter]);

  const openUserDetail = (u) => {
    setSelectedUser(u);
    setDetailOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
            <p className="text-muted-foreground">Visao geral da plataforma</p>
          </div>
        </div>
        <Button onClick={loadData} variant="outline" data-testid="admin-refresh-btn">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Usuarios</p>
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
                <p className="text-sm text-muted-foreground">Pagantes</p>
                <p className="text-3xl font-bold text-green-600">{usersSummary.paying_users || 0}</p>
                <p className="text-xs text-muted-foreground">{usersSummary.free_users || 0} free</p>
              </div>
              <CreditCard className="h-8 w-8 text-green-500" />
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
                <p className="text-2xl font-bold">R$ {(stats?.revenue?.total_revenue || 0).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">{stats?.revenue?.total_transactions || 0} transacoes</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Creditos IA</p>
                <p className="text-2xl font-bold">{stats?.credits?.total_credits_used || 0}</p>
                <p className="text-xs text-muted-foreground">de {stats?.credits?.total_credits_sold || 0} vendidos</p>
              </div>
              <Brain className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" data-testid="admin-tab-users">Usuarios</TabsTrigger>
          <TabsTrigger value="overview" data-testid="admin-tab-overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="ai" data-testid="admin-tab-ai">Consumo IA</TabsTrigger>
        </TabsList>

        {/* USERS TAB - Primary */}
        <TabsContent value="users" className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-center border">
              <p className="text-xl font-bold text-blue-600">{usersSummary.total_all || 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-center border">
              <p className="text-xl font-bold text-green-600">{usersSummary.paying_users || 0}</p>
              <p className="text-xs text-muted-foreground">Pagantes</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-950/30 text-center border">
              <p className="text-xl font-bold text-gray-600">{usersSummary.free_users || 0}</p>
              <p className="text-xs text-muted-foreground">Free</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-center border">
              <p className="text-xl font-bold text-purple-600">{usersSummary.new_this_month || 0}</p>
              <p className="text-xs text-muted-foreground">Novos este mes</p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou email..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" data-testid="admin-search-users" />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]" data-testid="admin-role-filter">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="estrategista">Estrategista</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]" data-testid="admin-plan-filter">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Planos</SelectItem>
                <SelectItem value="paying">Pagantes</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="founder">Founder</SelectItem>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="executivo">Executivo</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Usuario</th>
                      <th className="text-left p-3 font-medium">Role</th>
                      <th className="text-left p-3 font-medium">Plano</th>
                      <th className="text-center p-3 font-medium">Status</th>
                      <th className="text-center p-3 font-medium">Marcas</th>
                      <th className="text-center p-3 font-medium">TPs</th>
                      <th className="text-center p-3 font-medium">Creditos</th>
                      <th className="text-left p-3 font-medium">Cadastro</th>
                      <th className="text-left p-3 font-medium">Ult. Atividade</th>
                      <th className="text-center p-3 font-medium">Acao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.user_id} className="border-b hover:bg-muted/30 transition-colors" data-testid={`admin-user-row-${u.user_id}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              {u.picture ? <img src={u.picture} alt="" className="w-8 h-8 rounded-full" /> : <span className="font-bold text-xs text-primary">{u.name?.charAt(0) || '?'}</span>}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{u.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">{u.role || u.user_type || '-'}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={`text-xs ${PLAN_COLORS[u.plan] || PLAN_COLORS.free}`}>{u.plan || 'free'}</Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge className={`text-xs ${PAYMENT_STATUS_COLORS[u.payment_status] || 'bg-gray-400 text-white'}`}>
                            {PAYMENT_STATUS_LABELS[u.payment_status] || u.payment_status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center font-medium">{u.brands_count || 0}</td>
                        <td className="p-3 text-center font-medium">{u.touchpoints_count || 0}</td>
                        <td className="p-3 text-center">
                          <span className="font-medium">{u.credits?.available_credits || 0}</span>
                          {u.credits?.used_credits > 0 && <span className="text-xs text-muted-foreground ml-1">({u.credits.used_credits} usados)</span>}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                        <td className="p-3 text-xs text-muted-foreground">{timeSince(u.last_activity)}</td>
                        <td className="p-3 text-center">
                          <Button variant="ghost" size="sm" onClick={() => openUserDetail(u)} data-testid={`admin-view-user-${u.user_id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {users.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Nenhum usuario encontrado</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-lg">Usuarios por Plano</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(stats?.users?.by_plan || {}).map(([plan, count]) => (
                  <div key={plan} className="flex items-center justify-between">
                    <Badge className={PLAN_COLORS[plan] || PLAN_COLORS.free}>{plan.charAt(0).toUpperCase() + plan.slice(1)}</Badge>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Uso de IA por Tipo</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {stats?.usage_by_type?.slice(0, 6).map((item) => (
                  <div key={item._id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{ACTION_LABELS[item._id] || item._id}</span>
                      <span className="font-medium">{item.count}x ({item.total_credits} creditos)</span>
                    </div>
                    <Progress value={(item.count / (stats?.usage_by_type?.[0]?.count || 1)) * 100} className="h-1" />
                  </div>
                ))}
                {(!stats?.usage_by_type || stats.usage_by_type.length === 0) && <p className="text-muted-foreground text-sm">Nenhum uso registrado</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Creditos IA</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Vendidos</span><span className="font-bold text-green-600">+{stats?.credits?.total_credits_sold || 0}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Total Consumidos</span><span className="font-bold text-red-600">-{stats?.credits?.total_credits_used || 0}</span></div>
                  <hr />
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Saldo dos Clientes</span><span className="font-bold">{stats?.credits?.total_credits_available || 0}</span></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-orange-500" /> Custo Estimado Emergent</CardTitle>
                <CardDescription>Ultimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between"><span>Chamadas de IA:</span><span className="font-bold">{aiUsage?.total_calls || 0}</span></div>
                  <div className="flex justify-between"><span>Creditos consumidos:</span><span className="font-bold">{aiUsage?.total_credits_consumed || 0}</span></div>
                  <hr />
                  <div className="flex justify-between text-lg"><span>Custo estimado:</span><span className="font-bold text-orange-600">~R$ {aiUsage?.estimated_cost_brl || 0}</span></div>
                  <p className="text-xs text-muted-foreground">(US$ {aiUsage?.estimated_cost_usd || 0} x R$ 5,50)</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Top 10 Usuarios por Consumo de IA</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.top_users?.map((u, i) => (
                  <div key={u._id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{i + 1}</Badge>
                      <div><p className="font-medium">{u.name || 'N/A'}</p><p className="text-xs text-muted-foreground">{u.email}</p></div>
                    </div>
                    <div className="text-right"><p className="font-bold">{u.total_credits_used} creditos</p><p className="text-xs text-muted-foreground">{u.total_calls} chamadas</p></div>
                  </div>
                ))}
                {(!stats?.top_users || stats.top_users.length === 0) && <p className="text-center text-muted-foreground py-4">Nenhum uso registrado</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Usage Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Consumo de IA Detalhado</CardTitle><CardDescription>Ultimos 30 dias</CardDescription></CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center"><p className="text-3xl font-bold text-blue-600">{aiUsage?.total_calls || 0}</p><p className="text-sm text-muted-foreground">Chamadas de IA</p></div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center"><p className="text-3xl font-bold text-purple-600">{aiUsage?.total_credits_consumed || 0}</p><p className="text-sm text-muted-foreground">Creditos Consumidos</p></div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-center"><p className="text-3xl font-bold text-orange-600">~R$ {aiUsage?.estimated_cost_brl || 0}</p><p className="text-sm text-muted-foreground">Custo Estimado</p></div>
              </div>
              <h4 className="font-semibold mb-3">Por Tipo de Funcionalidade</h4>
              <div className="space-y-3">
                {Object.entries(aiUsage?.by_action || {}).map(([action, data]) => (
                  <div key={action} className="flex items-center justify-between p-2 border rounded">
                    <span>{ACTION_LABELS[action] || action}</span>
                    <div className="flex items-center gap-4"><Badge variant="outline">{data.count} chamadas</Badge><Badge>{data.credits} creditos</Badge></div>
                  </div>
                ))}
                {Object.keys(aiUsage?.by_action || {}).length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum uso registrado</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Detail Dialog */}
      <UserDetailDialog user={selectedUser} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
