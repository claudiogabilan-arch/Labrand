import { useState, useEffect, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Calendar as CalendarIcon, Plus, DollarSign, Target, Clock, Edit,
  Trash2, ChevronLeft, ChevronRight, Loader2, Save, X, Link2,
  Heart, MessageCircle, Eye, Share2, ExternalLink, Unlink, Instagram,
  Facebook, Linkedin, Youtube, Music
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

const PLAT_ICON = { instagram: Instagram, facebook: Facebook, linkedin: Linkedin, youtube: Youtube, tiktok: Music };

const formatNum = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0);

export const Campaigns = () => {
  const { currentBrand } = useBrand();
  const { getAuthHeaders } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [campaignPosts, setCampaignPosts] = useState({ posts: [], totals: {} });
  const [availablePosts, setAvailablePosts] = useState([]);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingPost, setLinkingPost] = useState(false);

  const [formData, setFormData] = useState({
    title: '', description: '', type: 'awareness',
    start_date: '', end_date: '', budget: '', goals: ''
  });

  const loadCampaigns = useCallback(async () => {
    if (!currentBrand?.brand_id) return;
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/brands/${currentBrand.brand_id}/campaigns`, {
        headers: getAuthHeaders(),
      });
      setCampaigns(response.data || []);
    } catch {
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentBrand?.brand_id, getAuthHeaders]);

  useEffect(() => { loadCampaigns(); }, [loadCampaigns]);

  const handleSubmit = async () => {
    if (!formData.title || !formData.start_date || !formData.end_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setIsSaving(true);
    try {
      const campaignData = { ...formData, budget: parseFloat(formData.budget) || 0 };
      if (editingCampaign) {
        await axios.put(`${API}/brands/${currentBrand.brand_id}/campaigns/${editingCampaign.campaign_id}`, campaignData, { headers: getAuthHeaders() });
        toast.success('Campanha atualizada!');
      } else {
        await axios.post(`${API}/brands/${currentBrand.brand_id}/campaigns`, campaignData, { headers: getAuthHeaders() });
        toast.success('Campanha criada!');
      }
      setShowForm(false);
      setEditingCampaign(null);
      setFormData({ title: '', description: '', type: 'awareness', start_date: '', end_date: '', budget: '', goals: '' });
      loadCampaigns();
    } catch {
      toast.error('Erro ao salvar campanha');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      title: campaign.title, description: campaign.description || '', type: campaign.type,
      start_date: campaign.start_date, end_date: campaign.end_date,
      budget: campaign.budget?.toString() || '', goals: campaign.goals || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (campaignId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta campanha?')) return;
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/campaigns/${campaignId}`, { headers: getAuthHeaders() });
      toast.success('Campanha excluída!');
      if (selectedCampaign?.campaign_id === campaignId) setSelectedCampaign(null);
      loadCampaigns();
    } catch {
      toast.error('Erro ao excluir campanha');
    }
  };

  const selectCampaign = async (campaign) => {
    setSelectedCampaign(campaign);
    try {
      const res = await axios.get(`${API}/brands/${currentBrand.brand_id}/campaigns/${campaign.campaign_id}/posts`, { headers: getAuthHeaders() });
      setCampaignPosts(res.data);
    } catch {
      setCampaignPosts({ posts: [], totals: {} });
    }
  };

  const openLinkDialog = async () => {
    setShowLinkDialog(true);
    try {
      const res = await axios.get(`${API}/brands/${currentBrand.brand_id}/social-listening/mentions?limit=50`, { headers: getAuthHeaders() });
      const all = res.data.mentions || [];
      const linked = selectedCampaign?.linked_posts || [];
      setAvailablePosts(all.filter(p => !linked.includes(p.mention_id)));
    } catch {
      setAvailablePosts([]);
    }
  };

  const linkPost = async (mentionId) => {
    setLinkingPost(true);
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/campaigns/${selectedCampaign.campaign_id}/link-post`, { mention_id: mentionId }, { headers: getAuthHeaders() });
      toast.success('Post vinculado!');
      setAvailablePosts(prev => prev.filter(p => p.mention_id !== mentionId));
      selectCampaign({ ...selectedCampaign, linked_posts: [...(selectedCampaign.linked_posts || []), mentionId] });
      loadCampaigns();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao vincular post');
    } finally {
      setLinkingPost(false);
    }
  };

  const unlinkPost = async (mentionId) => {
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/campaigns/${selectedCampaign.campaign_id}/unlink-post/${mentionId}`, { headers: getAuthHeaders() });
      toast.success('Post desvinculado');
      selectCampaign({ ...selectedCampaign, linked_posts: (selectedCampaign.linked_posts || []).filter(id => id !== mentionId) });
      loadCampaigns();
    } catch {
      toast.error('Erro ao desvincular');
    }
  };

  const navigateMonth = (dir) => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(prev.getMonth() + dir); return d; });
  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();
  const getCampaignsForDay = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return campaigns.filter(c => { const s = new Date(c.start_date); const e = new Date(c.end_date); const ch = new Date(dateStr); return ch >= s && ch <= e; });
  };
  const formatCurrency = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0);

  if (!currentBrand) return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;

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
            <h1 className="font-heading text-2xl font-bold">Campanhas</h1>
            <p className="text-muted-foreground">Planeje e vincule posts de redes sociais</p>
          </div>
        </div>
        <div className="flex gap-2">
          {selectedCampaign && (
            <Button variant="outline" onClick={() => setSelectedCampaign(null)} data-testid="back-to-list-btn">
              <ChevronLeft className="h-4 w-4 mr-1" /> Todas
            </Button>
          )}
          <Button onClick={() => { setShowForm(true); setEditingCampaign(null); }} data-testid="new-campaign-btn">
            <Plus className="h-4 w-4 mr-2" /> Nova Campanha
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: CalendarIcon, label: 'Campanhas', value: campaigns.length, bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
          { icon: Clock, label: 'Ativas', value: campaigns.filter(c => new Date(c.end_date) >= new Date() && new Date(c.start_date) <= new Date()).length, bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-600 dark:text-emerald-400' },
          { icon: DollarSign, label: 'Orçamento Total', value: formatCurrency(totalBudget), bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-600 dark:text-amber-400' },
          { icon: Link2, label: 'Posts Vinculados', value: campaigns.reduce((s, c) => s + (c.linked_posts?.length || 0), 0), bg: 'bg-purple-100 dark:bg-purple-900', text: 'text-purple-600 dark:text-purple-400' },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); setEditingCampaign(null); }}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Campanha *</Label>
                <Input value={formData.title} onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))} placeholder="Ex: Black Friday 2024" data-testid="campaign-title-input" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data Início *</Label>
                  <Input type="date" value={formData.start_date} onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))} data-testid="campaign-start-date" />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim *</Label>
                  <Input type="date" value={formData.end_date} onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))} data-testid="campaign-end-date" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{campaignTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orçamento (R$)</Label>
                  <Input type="number" value={formData.budget} onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))} placeholder="10000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Objetivos</Label>
                <Textarea value={formData.goals} onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))} placeholder="Objetivos da campanha..." rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Detalhes adicionais..." rows={2} />
              </div>
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} disabled={isSaving} className="flex-1" data-testid="save-campaign-btn">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingCampaign ? 'Atualizar' : 'Criar'} Campanha
                </Button>
                <Button variant="outline" onClick={() => { setShowForm(false); setEditingCampaign(null); }}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Detail View */}
      {selectedCampaign ? (
        <CampaignDetail
          campaign={selectedCampaign}
          posts={campaignPosts}
          onLinkPost={openLinkDialog}
          onUnlinkPost={unlinkPost}
          formatCurrency={formatCurrency}
        />
      ) : (
        <>
          {/* Calendar */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{months[currentDate.getMonth()]} {currentDate.getFullYear()}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {emptyDays.map(i => <div key={`e-${i}`} className="aspect-square" />)}
                {days.map(day => {
                  const dc = getCampaignsForDay(day);
                  const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                  return (
                    <div key={day} className={`aspect-square border rounded-lg p-1 overflow-hidden ${isToday ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className={`text-xs font-medium ${isToday ? 'text-primary' : ''}`}>{day}</div>
                      <div className="space-y-0.5 mt-0.5">
                        {dc.slice(0, 2).map(c => {
                          const t = campaignTypes.find(ct => ct.value === c.type);
                          return <div key={c.campaign_id} className={`text-[10px] truncate px-1 rounded text-white cursor-pointer ${t?.color || 'bg-gray-500'}`} onClick={() => selectCampaign(c)} title={c.title}>{c.title}</div>;
                        })}
                        {dc.length > 2 && <div className="text-[10px] text-muted-foreground">+{dc.length - 2}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Campaign List */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Todas as Campanhas</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : campaigns.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma campanha cadastrada.</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(campaign => {
                    const typeInfo = campaignTypes.find(t => t.value === campaign.type);
                    const isActive = new Date(campaign.end_date) >= new Date() && new Date(campaign.start_date) <= new Date();
                    const linkedCount = campaign.linked_posts?.length || 0;
                    return (
                      <div key={campaign.campaign_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => selectCampaign(campaign)} data-testid={`campaign-${campaign.campaign_id}`}>
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-12 rounded-full ${typeInfo?.color || 'bg-gray-500'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{campaign.title}</p>
                              {isActive && <Badge className="text-xs bg-emerald-500">Ativa</Badge>}
                              {linkedCount > 0 && (
                                <Badge variant="outline" className="text-xs gap-1">
                                  <Link2 className="h-3 w-3" /> {linkedCount} post{linkedCount > 1 ? 's' : ''}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{new Date(campaign.start_date).toLocaleDateString('pt-BR')} - {new Date(campaign.end_date).toLocaleDateString('pt-BR')}</span>
                              <Badge variant="outline">{typeInfo?.label}</Badge>
                              {campaign.budget > 0 && <span>{formatCurrency(campaign.budget)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(campaign.campaign_id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Link Post Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vincular Post à Campanha</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {availablePosts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum post disponível. Conecte redes sociais e busque dados em Social Listening.</p>
            ) : (
              availablePosts.map(post => {
                const Icon = PLAT_ICON[post.platform] || MessageCircle;
                return (
                  <div key={post.mention_id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`available-post-${post.mention_id}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className="h-5 w-5 flex-shrink-0" style={{ color: post.platform === 'instagram' ? '#E4405F' : post.platform === 'facebook' ? '#1877F2' : post.platform === 'youtube' ? '#FF0000' : '#666' }} />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{post.content || '(sem texto)'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{post.platform}</span>
                          {post.engagement?.likes > 0 && <span><Heart className="h-3 w-3 inline" /> {post.engagement.likes}</span>}
                          {post.posted_at && <span>{new Date(post.posted_at).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => linkPost(post.mention_id)} disabled={linkingPost} data-testid={`link-post-${post.mention_id}`}>
                      {linkingPost ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3 mr-1" />}
                      Vincular
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Campaign Detail Component
function CampaignDetail({ campaign, posts, onLinkPost, onUnlinkPost, formatCurrency }) {
  const typeInfo = campaignTypes.find(t => t.value === campaign.type);
  const totals = posts.totals || {};

  return (
    <div className="space-y-4" data-testid="campaign-detail">
      {/* Campaign Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-4 h-4 rounded-full ${typeInfo?.color || 'bg-gray-500'}`} />
                <h2 className="text-xl font-bold">{campaign.title}</h2>
                <Badge variant="outline">{typeInfo?.label}</Badge>
              </div>
              {campaign.description && <p className="text-sm text-muted-foreground mb-2">{campaign.description}</p>}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span><CalendarIcon className="h-3.5 w-3.5 inline mr-1" />{new Date(campaign.start_date).toLocaleDateString('pt-BR')} - {new Date(campaign.end_date).toLocaleDateString('pt-BR')}</span>
                {campaign.budget > 0 && <span><DollarSign className="h-3.5 w-3.5 inline mr-1" />{formatCurrency(campaign.budget)}</span>}
              </div>
              {campaign.goals && <p className="text-sm mt-2"><Target className="h-3.5 w-3.5 inline mr-1" />{campaign.goals}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Heart, label: 'Curtidas', value: totals.likes || 0, color: 'text-red-500' },
          { icon: MessageCircle, label: 'Comentários', value: totals.comments || 0, color: 'text-blue-500' },
          { icon: Share2, label: 'Compartilhamentos', value: totals.shares || 0, color: 'text-green-500' },
          { icon: Eye, label: 'Visualizações', value: totals.views || 0, color: 'text-purple-500' },
        ].map((m, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3 text-center">
              <m.icon className={`h-5 w-5 mx-auto mb-1 ${m.color}`} />
              <p className="text-lg font-bold">{formatNum(m.value)}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Linked Posts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Posts Vinculados ({posts.count || 0})</CardTitle>
            <Button size="sm" onClick={onLinkPost} data-testid="link-post-btn">
              <Plus className="h-4 w-4 mr-1" /> Vincular Post
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(!posts.posts || posts.posts.length === 0) ? (
            <p className="text-center text-muted-foreground py-6">Nenhum post vinculado. Clique em "Vincular Post" para associar posts de redes sociais.</p>
          ) : (
            <div className="space-y-3">
              {posts.posts.map(post => {
                const Icon = PLAT_ICON[post.platform] || MessageCircle;
                const eng = post.engagement || {};
                return (
                  <div key={post.mention_id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`linked-post-${post.mention_id}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm truncate font-medium">{post.content || '(sem texto)'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">{post.platform}</Badge>
                          {eng.likes > 0 && <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" /> {formatNum(eng.likes)}</span>}
                          {eng.comments > 0 && <span className="flex items-center gap-0.5"><MessageCircle className="h-3 w-3" /> {formatNum(eng.comments)}</span>}
                          {eng.views > 0 && <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {formatNum(eng.views)}</span>}
                          {post.posted_at && <span>{new Date(post.posted_at).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {post.url && (
                        <a href={post.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => onUnlinkPost(post.mention_id)} className="text-red-500 hover:text-red-700" data-testid={`unlink-${post.mention_id}`}>
                        <Unlink className="h-4 w-4" />
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
}

export default Campaigns;
