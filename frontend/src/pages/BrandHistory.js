import { useState, useEffect, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Calendar as CalendarIcon, Loader2, User, Filter } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const ALL = '__all__';

const MODULES = [
  { value: ALL, label: 'Todos os módulos' },
  { value: 'pilar', label: 'Pilares' },
  { value: 'touchpoint', label: 'Touchpoints' },
  { value: 'campanha', label: 'Campanhas' },
  { value: 'decisao', label: 'Decisões' },
  { value: 'narrativ', label: 'Narrativas' },
  { value: 'approval', label: 'Aprovações' },
  { value: 'comment', label: 'Comentários' },
  { value: 'settings', label: 'Configurações' },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

function groupByDate(activities) {
  const groups = {};
  for (const act of activities) {
    const date = act.created_at ? act.created_at.split('T')[0] : 'unknown';
    if (!groups[date]) groups[date] = [];
    groups[date].push(act);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export default function BrandHistory() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [filterUser, setFilterUser] = useState(ALL);
  const [filterModule, setFilterModule] = useState(ALL);
  const [teamMembers, setTeamMembers] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date()
  });

  useEffect(() => {
    if (!currentBrand?.brand_id) return;
    const loadTeam = async () => {
      try {
        const res = await axios.get(`${API}/team/members/${currentBrand.brand_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const members = res.data.members || [];
        const owner = res.data.owner;
        setTeamMembers(owner ? [owner, ...members] : members);
      } catch { /* silent */ }
    };
    loadTeam();
  }, [currentBrand?.brand_id, token]);

  const loadActivities = useCallback(async (currentSkip, reset = false) => {
    if (!currentBrand?.brand_id) return;
    reset ? setLoading(true) : setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: '20', skip: String(currentSkip) });
      if (filterUser && filterUser !== ALL) params.set('user_id', filterUser);
      if (filterModule && filterModule !== ALL) params.set('module', filterModule);
      if (dateRange.from) params.set('date_from', dateRange.from.toISOString());
      if (dateRange.to) params.set('date_to', dateRange.to.toISOString());

      const res = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/activity?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const newActivities = res.data.activities || [];
      setActivities(prev => reset ? newActivities : [...prev, ...newActivities]);
      setTotal(res.data.total || 0);
      setHasMore(res.data.has_more || false);
      setSkip(currentSkip + 20);
    } catch { /* silent */ }
    finally { reset ? setLoading(false) : setLoadingMore(false); }
  }, [currentBrand?.brand_id, filterUser, filterModule, dateRange, token]);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadActivities(0, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.brand_id, filterUser, filterModule, dateRange]);

  if (!currentBrand) {
    return <div className="text-center py-12 text-muted-foreground">Selecione uma marca primeiro</div>;
  }

  const grouped = groupByDate(activities);

  return (
    <div className="space-y-6" data-testid="brand-history-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[hsl(var(--secondary))] flex items-center justify-center">
          <Clock className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Histórico de alterações</h1>
          <p className="text-muted-foreground">{currentBrand.name} — {total} registros</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3" data-testid="history-filters">
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-48" data-testid="filter-user">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todos usuários" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos usuários</SelectItem>
            {teamMembers.map(m => (
              <SelectItem key={m.user_id || m.member_id} value={m.user_id}>
                {m.name || m.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-48" data-testid="filter-module">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todos módulos" />
          </SelectTrigger>
          <SelectContent>
            {MODULES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2" data-testid="filter-date">
              <CalendarIcon className="h-4 w-4" />
              {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
              }}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Activity List */}
      {loading ? (
        <div className="flex items-center justify-center py-16" data-testid="history-loading">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activities.length === 0 ? (
        <Card className="border-dashed" data-testid="history-empty">
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">Nenhuma alteração no período selecionado</h3>
            <p className="text-muted-foreground text-sm mt-1">Tente expandir o intervalo de datas ou remover filtros.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6" data-testid="history-list">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {date === new Date().toISOString().split('T')[0]
                    ? 'Hoje'
                    : new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <div className="space-y-2">
                {items.map((act) => (
                  <div
                    key={act.activity_id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    data-testid={`activity-item-${act.activity_id}`}
                    title={act.created_at ? new Date(act.created_at).toLocaleString('pt-BR') : ''}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {(act.user_name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="font-medium">{act.user_name || 'Usuário'}</span>
                        {' '}
                        <span className="text-muted-foreground">{act.description || act.action}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => loadActivities(skip)} disabled={loadingMore} data-testid="load-more-btn">
                {loadingMore ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
