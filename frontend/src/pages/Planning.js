import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import {
  ListTodo, Plus, Loader2, Calendar, Flag, GripVertical, CheckCircle2,
  Clock, AlertCircle, BarChart3, List, Link2, Unlink, ChevronRight,
  ExternalLink, RefreshCw
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const statusConfig = {
  backlog: { label: 'Backlog', color: 'bg-gray-100 text-gray-700', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: AlertCircle },
  review: { label: 'Revisão', color: 'bg-amber-100 text-amber-700', icon: AlertCircle },
  done: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 }
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Média', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Alta', color: 'bg-amber-100 text-amber-600' },
  urgent: { label: 'Urgente', color: 'bg-rose-100 text-rose-600' }
};

const pillars = [
  { value: 'start', label: 'Start' },
  { value: 'values', label: 'Valores' },
  { value: 'purpose', label: 'Propósito' },
  { value: 'promise', label: 'Promessa' },
  { value: 'positioning', label: 'Posicionamento' },
  { value: 'personality', label: 'Personalidade' },
  { value: 'universality', label: 'Universalidade' },
  { value: 'general', label: 'Geral' }
];

// ClickUp Integration Panel
const ClickUpPanel = ({ brandId, token, clickupStatus, setClickupStatus }) => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('idle'); // idle, workspaces, spaces, folders, done
  const [workspaces, setWorkspaces] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderlessLists, setFolderlessLists] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/integrations/clickup/auth-url`, {
        params: { brand_id: brandId },
        headers,
      });
      window.location.href = res.data.auth_url;
    } catch (err) {
      toast.error('Erro ao gerar URL de autorização');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await axios.delete(`${API}/integrations/clickup/disconnect/${brandId}`, { headers });
      setClickupStatus({ connected: false });
      toast.success('ClickUp desconectado');
    } catch (err) {
      toast.error('Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/integrations/clickup/workspaces/${brandId}`, { headers });
      setWorkspaces(res.data);
      setStep('workspaces');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao carregar workspaces');
    } finally {
      setLoading(false);
    }
  };

  const loadSpaces = async (teamId) => {
    setLoading(true);
    setSelectedTeam(teamId);
    try {
      const res = await axios.get(`${API}/integrations/clickup/spaces/${brandId}/${teamId}`, { headers });
      setSpaces(res.data);
      setStep('spaces');
    } catch (err) {
      toast.error('Erro ao carregar spaces');
    } finally {
      setLoading(false);
    }
  };

  const loadLists = async (spaceId) => {
    setLoading(true);
    setSelectedSpace(spaceId);
    try {
      const [foldersRes, listsRes] = await Promise.all([
        axios.get(`${API}/integrations/clickup/folders/${brandId}/${spaceId}`, { headers }),
        axios.get(`${API}/integrations/clickup/lists/${brandId}/${spaceId}`, { headers }),
      ]);
      setFolders(foldersRes.data);
      setFolderlessLists(listsRes.data);
      setStep('folders');
    } catch (err) {
      toast.error('Erro ao carregar listas');
    } finally {
      setLoading(false);
    }
  };

  const selectList = async (listId, listName) => {
    setLoading(true);
    try {
      await axios.post(
        `${API}/integrations/clickup/select-list/${brandId}`,
        { list_id: listId, list_name: listName },
        { headers }
      );
      setClickupStatus(prev => ({ ...prev, selected_list_id: listId, selected_list_name: listName }));
      setStep('done');
      toast.success(`Lista "${listName}" selecionada!`);
    } catch (err) {
      toast.error('Erro ao selecionar lista');
    } finally {
      setLoading(false);
    }
  };

  if (!clickupStatus.connected) {
    return (
      <Card className="border-dashed" data-testid="clickup-connect-card">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                <Link2 className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium text-sm">ClickUp</p>
                <p className="text-xs text-muted-foreground">Sincronize tarefas com o ClickUp</p>
              </div>
            </div>
            <Button size="sm" onClick={handleConnect} disabled={loading} data-testid="connect-clickup-btn">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
              Conectar ClickUp
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="clickup-panel">
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">ClickUp Conectado</p>
              {clickupStatus.selected_list_name ? (
                <p className="text-xs text-muted-foreground">
                  Lista: <span className="font-medium">{clickupStatus.selected_list_name}</span>
                </p>
              ) : (
                <p className="text-xs text-amber-600">Selecione uma lista para sincronizar</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadWorkspaces} disabled={loading} data-testid="choose-list-btn">
              {loading && step !== 'done' ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
              {clickupStatus.selected_list_id ? 'Trocar Lista' : 'Escolher Lista'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDisconnect} disabled={disconnecting} data-testid="disconnect-clickup-btn">
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4 text-red-500" />}
            </Button>
          </div>
        </div>

        {/* Workspace selector */}
        {step === 'workspaces' && workspaces.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30" data-testid="clickup-workspaces">
            <p className="text-xs font-medium text-muted-foreground uppercase">Selecione o Workspace</p>
            {workspaces.map(w => (
              <button key={w.id} onClick={() => loadSpaces(w.id)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left text-sm"
                data-testid={`workspace-${w.id}`}
              >
                {w.name} <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* Space selector */}
        {step === 'spaces' && spaces.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30" data-testid="clickup-spaces">
            <p className="text-xs font-medium text-muted-foreground uppercase">Selecione o Space</p>
            {spaces.map(s => (
              <button key={s.id} onClick={() => loadLists(s.id)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left text-sm"
                data-testid={`space-${s.id}`}
              >
                {s.name} <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* List selector */}
        {step === 'folders' && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30" data-testid="clickup-lists">
            <p className="text-xs font-medium text-muted-foreground uppercase">Selecione a Lista</p>
            {folders.map(f => (
              <div key={f.id} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground px-2">{f.name}</p>
                {f.lists.map(l => (
                  <button key={l.id} onClick={() => selectList(l.id, l.name)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-primary/10 text-left text-sm pl-4"
                    data-testid={`list-${l.id}`}
                  >
                    {l.name} <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ))}
            {folderlessLists.length > 0 && (
              <>
                {folders.length > 0 && <p className="text-xs font-medium text-muted-foreground px-2">Sem pasta</p>}
                {folderlessLists.map(l => (
                  <button key={l.id} onClick={() => selectList(l.id, l.name)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-primary/10 text-left text-sm"
                    data-testid={`list-${l.id}`}
                  >
                    {l.name} <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </>
            )}
            {folders.length === 0 && folderlessLists.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhuma lista encontrada neste space</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const Planning = () => {
  const { currentBrand, fetchTasks, createTask, updateTask, deleteTask } = useBrand();
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('kanban');
  const [syncToClickUp, setSyncToClickUp] = useState(true);
  const [clickupStatus, setClickupStatus] = useState({ connected: false });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    pillar: 'general',
    due_date: ''
  });

  const headers = { Authorization: `Bearer ${token}` };

  const loadClickUpStatus = useCallback(async () => {
    if (!currentBrand?.brand_id) return;
    try {
      const res = await axios.get(
        `${API}/integrations/clickup/status/${currentBrand.brand_id}`,
        { headers }
      );
      setClickupStatus(res.data);
    } catch {
      setClickupStatus({ connected: false });
    }
  }, [currentBrand?.brand_id, token]);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadTasks();
      loadClickUpStatus();
    }
  }, [currentBrand?.brand_id]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTasks(currentBrand.brand_id);
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setIsCreating(true);
    try {
      const created = await createTask(currentBrand.brand_id, newTask);
      setTasks(prev => [...prev, created]);

      // Sync to ClickUp if connected and toggle enabled
      if (syncToClickUp && clickupStatus.connected && clickupStatus.selected_list_id) {
        try {
          const res = await axios.post(
            `${API}/integrations/clickup/sync-task/${currentBrand.brand_id}`,
            newTask,
            { headers }
          );
          if (res.data.clickup_url) {
            toast.success(
              <span>Tarefa criada e sincronizada! <a href={res.data.clickup_url} target="_blank" rel="noopener noreferrer" className="underline">Ver no ClickUp</a></span>
            );
          } else {
            toast.success('Tarefa criada e sincronizada com ClickUp!');
          }
        } catch (err) {
          toast.warning('Tarefa criada localmente, mas falhou ao sincronizar com ClickUp');
        }
      } else {
        toast.success('Tarefa criada!');
      }

      setNewTask({ title: '', description: '', status: 'backlog', priority: 'medium', pillar: 'general', due_date: '' });
      setDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar tarefa');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTask(currentBrand.brand_id, taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: newStatus } : t));
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteTask(currentBrand.brand_id, taskId);
      setTasks(prev => prev.filter(t => t.task_id !== taskId));
      toast.success('Tarefa removida!');
    } catch (error) {
      toast.error('Erro ao remover tarefa');
    }
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  return (
    <div className="space-y-6" data-testid="planning-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
            <ListTodo className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Planejamento & Execução</h1>
            <p className="text-muted-foreground">Gerencie as iniciativas de branding</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-none"
            >
              <List className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button
              variant={viewMode === 'gantt' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('gantt')}
              className="rounded-none"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Gantt
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-task-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
                <DialogDescription>Crie uma nova tarefa para o backlog</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Título da tarefa"
                    data-testid="task-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descreva a tarefa..."
                    rows={3}
                    data-testid="task-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridade</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask(prev => ({ ...prev, priority: v }))}>
                      <SelectTrigger data-testid="task-priority-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pilar</Label>
                    <Select value={newTask.pillar} onValueChange={(v) => setNewTask(prev => ({ ...prev, pillar: v }))}>
                      <SelectTrigger data-testid="task-pillar-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pillars.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Data de Entrega</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                    data-testid="task-due-date-input"
                  />
                </div>
                {/* ClickUp sync toggle */}
                {clickupStatus.connected && clickupStatus.selected_list_id && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border" data-testid="clickup-sync-toggle">
                    <div className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-violet-600" />
                      <span className="text-sm">Sincronizar com ClickUp</span>
                      <Badge variant="outline" className="text-xs">{clickupStatus.selected_list_name}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSyncToClickUp(!syncToClickUp)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${syncToClickUp ? 'bg-violet-600' : 'bg-gray-300'}`}
                      data-testid="clickup-sync-switch"
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${syncToClickUp ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                )}
                <Button onClick={handleCreateTask} disabled={isCreating} className="w-full" data-testid="create-task-btn">
                  {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar Tarefa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ClickUp Integration */}
      <ClickUpPanel
        brandId={currentBrand.brand_id}
        token={token}
        clickupStatus={clickupStatus}
        setClickupStatus={setClickupStatus}
      />

      {/* Gantt View */}
      {viewMode === 'gantt' && (
        <GanttChart tasks={tasks} onStatusChange={handleStatusChange} />
      )}

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const StatusIcon = config.icon;
            const statusTasks = getTasksByStatus(status);
            return (
              <Card key={status} className="min-h-[400px]">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <StatusIcon className="h-4 w-4" />
                      {config.label}
                    </CardTitle>
                    <Badge variant="outline">{statusTasks.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {statusTasks.map(task => (
                    <div
                      key={task.task_id}
                      className="p-3 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      data-testid={`task-card-${task.task_id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{task.title}</p>
                        <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {task.pillar && task.pillar !== 'general' && (
                          <Badge variant="outline" className="text-xs">
                            {pillars.find(p => p.value === task.pillar)?.label}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${priorityConfig[task.priority]?.color}`}>
                          {priorityConfig[task.priority]?.label}
                        </Badge>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                      <div className="flex gap-1 mt-3">
                        {status !== 'backlog' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleStatusChange(task.task_id, Object.keys(statusConfig)[Object.keys(statusConfig).indexOf(status) - 1])}
                          >
                            ← Voltar
                          </Button>
                        )}
                        {status !== 'done' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => handleStatusChange(task.task_id, Object.keys(statusConfig)[Object.keys(statusConfig).indexOf(status) + 1])}
                          >
                            Avançar →
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {statusTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhuma tarefa
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Gantt Chart Component
const GanttChart = ({ tasks, onStatusChange }) => {
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date) - new Date(b.due_date);
    });
  }, [tasks]);

  const dateRange = useMemo(() => {
    const today = new Date();
    const dates = [];
    for (let i = -7; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const getTaskPosition = (task) => {
    if (!task.due_date) return null;
    const taskDate = new Date(task.due_date);
    const startDate = dateRange[0];
    const daysDiff = Math.floor((taskDate - startDate) / (1000 * 60 * 60 * 24));
    return daysDiff;
  };

  const todayIndex = 7;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Cronograma de Tarefas</CardTitle>
        <CardDescription>Visão temporal das entregas</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="flex border-b pb-2 mb-2">
            <div className="w-48 flex-shrink-0 font-medium text-sm">Tarefa</div>
            <div className="flex-1 flex">
              {dateRange.map((date, i) => (
                <div
                  key={i}
                  className={`flex-1 text-center text-xs ${i === todayIndex ? 'bg-primary/10 rounded font-bold' : ''}`}
                >
                  <div className="text-muted-foreground">{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</div>
                  <div>{date.getDate()}</div>
                </div>
              ))}
            </div>
          </div>

          {sortedTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma tarefa cadastrada</p>
          ) : (
            sortedTasks.map((task) => {
              const position = getTaskPosition(task);
              const statusColor = {
                backlog: 'bg-gray-400',
                in_progress: 'bg-blue-500',
                review: 'bg-amber-500',
                done: 'bg-emerald-500'
              }[task.status];

              return (
                <div key={task.task_id} className="flex items-center py-2 border-b hover:bg-muted/50">
                  <div className="w-48 flex-shrink-0 pr-4">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge className={`text-xs ${statusConfig[task.status]?.color}`}>
                        {statusConfig[task.status]?.label}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-1 relative h-8 flex">
                    {dateRange.map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 border-l ${i === todayIndex ? 'border-primary border-l-2' : 'border-gray-100'}`}
                      />
                    ))}
                    {position !== null && position >= 0 && position < dateRange.length && (
                      <div
                        className={`absolute top-1 h-6 rounded-full ${statusColor} flex items-center justify-center text-white text-xs font-medium shadow-sm`}
                        style={{
                          left: `${(position / dateRange.length) * 100}%`,
                          width: '80px',
                          transform: 'translateX(-40px)'
                        }}
                      >
                        {new Date(task.due_date).getDate()}/{new Date(task.due_date).getMonth() + 1}
                      </div>
                    )}
                    {position === null && (
                      <div className="absolute left-0 top-1 text-xs text-muted-foreground italic">
                        Sem data definida
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Planning;
