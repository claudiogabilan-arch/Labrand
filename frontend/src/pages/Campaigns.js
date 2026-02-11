import { useState, useEffect, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Calendar as CalendarIcon,
  Plus,
  DollarSign,
  Target,
  Clock,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  X
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const campaignTypes = [
  { value: 'awareness', label: 'Awareness', color: 'bg-blue-500' },
  { value: 'engagement', label: 'Engajamento', color: 'bg-emerald-500' },
  { value: 'conversion', label: 'Conversão', color: 'bg-amber-500' },
  { value: 'retention', label: 'Retenção', color: 'bg-purple-500' },
  { value: 'launch', label: 'Lançamento', color: 'bg-rose-500' },
];

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Campaigns = () => {
  const { currentBrand, fetchTasks, createTask, updateTask, deleteTask } = useBrand();
  const { getAuthHeaders } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'awareness',
    start_date: '',
    end_date: '',
    budget: '',
    goals: ''
  });

  const loadCampaigns = useCallback(async () => {
    if (!currentBrand?.brand_id) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/brands/${currentBrand.brand_id}/campaigns`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setCampaigns(response.data || []);
    } catch (error) {
      // If endpoint doesn't exist yet, use empty array
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentBrand?.brand_id, getAuthHeaders]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    setIsSaving(true);
    try {
      const campaignData = {
        ...formData,
        brand_id: currentBrand.brand_id,
        budget: parseFloat(formData.budget) || 0
      };

      if (editingCampaign) {
        await axios.put(
          `${API}/brands/${currentBrand.brand_id}/campaigns/${editingCampaign.campaign_id}`,
          campaignData,
          { headers: getAuthHeaders(), withCredentials: true }
        );
        toast.success('Campanha atualizada!');
      } else {
        await axios.post(
          `${API}/brands/${currentBrand.brand_id}/campaigns`,
          campaignData,
          { headers: getAuthHeaders(), withCredentials: true }
        );
        toast.success('Campanha criada!');
      }
      
      setShowForm(false);
      setEditingCampaign(null);
      setFormData({ title: '', description: '', type: 'awareness', start_date: '', end_date: '', budget: '', goals: '' });
      loadCampaigns();
    } catch (error) {
      toast.error('Erro ao salvar campanha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title,
      description: campaign.description || '',
      type: campaign.type,
      start_date: campaign.start_date,
      end_date: campaign.end_date,
      budget: campaign.budget?.toString() || '',
      goals: campaign.goals || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/campaigns/${campaignId}`,
        { headers: getAuthHeaders(), withCredentials: true }
      );
      toast.success('Campanha excluída!');
      loadCampaigns();
    } catch (error) {
      toast.error('Erro ao excluir campanha');
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const getCampaignsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return campaigns.filter(c => {
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      const check = new Date(dateStr);
      return check >= start && check <= end;
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const totalBudget = campaigns.reduce((sum, c) => sum + (c.budget || 0), 0);

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para continuar</p>
      </div>
    );
  }

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="space-y-6" data-testid="campaigns-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Calendário de Campanhas</h1>
            <p className="text-muted-foreground">Planeje e acompanhe suas campanhas</p>
          </div>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingCampaign(null); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.length}</p>
                <p className="text-xs text-muted-foreground">Campanhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.filter(c => new Date(c.end_date) >= new Date()).length}</p>
                <p className="text-xs text-muted-foreground">Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(totalBudget)}</p>
                <p className="text-xs text-muted-foreground">Orçamento Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{campaigns.filter(c => c.type === 'conversion').length}</p>
                <p className="text-xs text-muted-foreground">Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingCampaign(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Campanha *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Black Friday 2024"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim *</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Campanha</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {campaignTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orçamento (R$)</Label>
                  <Input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                    placeholder="10000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Objetivos</Label>
                <Textarea
                  value={formData.goals}
                  onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                  placeholder="Descreva os objetivos da campanha..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Detalhes adicionais..."
                  rows={2}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} disabled={isSaving} className="flex-1">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingCampaign ? 'Atualizar' : 'Criar'} Campanha
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingCampaign(null); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map(i => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {days.map(day => {
              const dayCampaigns = getCampaignsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              return (
                <div
                  key={day}
                  className={`aspect-square border rounded-lg p-1 overflow-hidden ${
                    isToday ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>{day}</div>
                  <div className="space-y-0.5 mt-0.5">
                    {dayCampaigns.slice(0, 2).map(campaign => {
                      const typeInfo = campaignTypes.find(t => t.value === campaign.type);
                      return (
                        <div
                          key={campaign.campaign_id}
                          className={`text-[10px] truncate px-1 rounded text-white ${typeInfo?.color || 'bg-gray-500'}`}
                          title={campaign.title}
                        >
                          {campaign.title}
                        </div>
                      );
                    })}
                    {dayCampaigns.length > 2 && (
                      <div className="text-[10px] text-muted-foreground">+{dayCampaigns.length - 2}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Todas as Campanhas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma campanha cadastrada. Clique em "Nova Campanha" para começar.
            </p>
          ) : (
            <div className="space-y-3">
              {campaigns.map(campaign => {
                const typeInfo = campaignTypes.find(t => t.value === campaign.type);
                const isActive = new Date(campaign.end_date) >= new Date() && new Date(campaign.start_date) <= new Date();
                return (
                  <div
                    key={campaign.campaign_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-12 rounded-full ${typeInfo?.color || 'bg-gray-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{campaign.title}</p>
                          {isActive && <Badge className="text-xs bg-emerald-500">Ativa</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{new Date(campaign.start_date).toLocaleDateString('pt-BR')} - {new Date(campaign.end_date).toLocaleDateString('pt-BR')}</span>
                          <Badge variant="outline">{typeInfo?.label}</Badge>
                          {campaign.budget > 0 && <span>{formatCurrency(campaign.budget)}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(campaign.campaign_id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Campaigns;
