import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import {
  Users, Plus, Check, X, RotateCcw, MessageSquare,
  Loader2, Clock, CheckCircle2, XCircle, AlertCircle,
  Activity, Send, Trash2, ChevronDown
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-300', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-700 border-red-300', icon: XCircle },
  changes_requested: { label: 'Alteracoes', color: 'bg-blue-100 text-blue-700 border-blue-300', icon: RotateCcw }
};

const ITEM_TYPES = [
  { value: 'pillar', label: 'Pilar' },
  { value: 'touchpoint', label: 'Touchpoint' },
  { value: 'strategy', label: 'Estrategia' },
  { value: 'content', label: 'Conteudo' },
  { value: 'report', label: 'Relatorio' }
];

const ACTION_LABELS = {
  approval_created: 'Solicitou aprovacao',
  approval_approve: 'Aprovou',
  approval_reject: 'Rejeitou',
  approval_request_changes: 'Pediu alteracoes',
  comment_added: 'Comentou',
  page_view: 'Visualizou'
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function Collaboration() {
  const { token, user } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState([]);
  const [counts, setCounts] = useState({});
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [actionComment, setActionComment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [commentFilter, setCommentFilter] = useState({ type: '', id: '' });
  const [formData, setFormData] = useState({ item_type: 'pillar', item_id: '', item_name: '', description: '' });

  useEffect(() => { if (currentBrand) loadData(); }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [appRes, actRes, cmtRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/approvals`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/activity?limit=30`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/brands/${currentBrand.brand_id}/comments`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setApprovals(appRes.data.approvals || []);
      setCounts(appRes.data.counts || {});
      setActivities(actRes.data.activities || []);
      setComments(cmtRes.data.comments || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  const handleCreateApproval = async () => {
    if (!formData.item_name.trim()) { toast.error('Nome e obrigatorio'); return; }
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/approvals`, formData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Solicitacao de aprovacao criada!');
      setDialogOpen(false);
      setFormData({ item_type: 'pillar', item_id: '', item_name: '', description: '' });
      loadData();
    } catch { toast.error('Erro ao criar'); }
  };

  const handleApprovalAction = async (approvalId, action) => {
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/approvals/${approvalId}/action`,
        { action, comment: actionComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const labels = { approve: 'Aprovado!', reject: 'Rejeitado', request_changes: 'Alteracoes solicitadas' };
      toast.success(labels[action]);
      setSelectedApproval(null);
      setActionComment('');
      loadData();
    } catch { toast.error('Erro ao processar'); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await axios.post(`${API}/brands/${currentBrand.brand_id}/comments`,
        { item_type: 'general', item_id: 'brand', content: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewComment('');
      loadData();
    } catch { toast.error('Erro ao comentar'); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
      loadData();
    } catch { toast.error('Erro ao remover'); }
  };

  if (!currentBrand) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Selecione uma marca primeiro</p></div>;
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" data-testid="collaboration-page">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Colaboracao</h1>
            <p className="text-muted-foreground">Aprovacoes, comentarios e atividades da equipe</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-approval-btn"><Plus className="h-4 w-4 mr-2" /> Nova Aprovacao</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar Aprovacao</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.item_type} onValueChange={v => setFormData(p => ({ ...p, item_type: v }))}>
                  <SelectTrigger data-testid="approval-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nome do Item *</Label>
                <Input value={formData.item_name} onChange={e => setFormData(p => ({ ...p, item_name: e.target.value }))} placeholder="Ex: Pilar de Proposito" data-testid="approval-name-input" />
              </div>
              <div className="space-y-2">
                <Label>Descricao</Label>
                <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="O que precisa ser revisado..." rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateApproval} data-testid="submit-approval-btn">Solicitar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className={counts[key] > 0 && key === 'pending' ? 'border-amber-300' : ''}>
              <CardContent className="pt-6 text-center">
                <Icon className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{counts[key] || 0}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals" data-testid="tab-approvals">Aprovacoes {counts.pending > 0 && <Badge className="ml-1.5 bg-amber-500 text-white text-xs">{counts.pending}</Badge>}</TabsTrigger>
          <TabsTrigger value="comments" data-testid="tab-comments">Comentarios</TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity">Atividades</TabsTrigger>
        </TabsList>

        {/* Approvals */}
        <TabsContent value="approvals" className="space-y-3">
          {approvals.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Nenhuma solicitacao de aprovacao. Crie uma para iniciar o workflow.</CardContent></Card>
          ) : approvals.map(app => {
            const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <Card key={app.approval_id} data-testid={`approval-${app.approval_id}`}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cfg.color}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
                        <Badge variant="outline" className="text-xs">{ITEM_TYPES.find(t => t.value === app.item_type)?.label || app.item_type}</Badge>
                      </div>
                      <p className="font-semibold">{app.item_name}</p>
                      {app.description && <p className="text-sm text-muted-foreground mt-1">{app.description}</p>}
                      <p className="text-xs text-muted-foreground mt-2">Por {app.requested_by_name} - {timeAgo(app.created_at)}</p>

                      {/* History */}
                      {app.history?.length > 1 && (
                        <div className="mt-3 border-t pt-2 space-y-1">
                          {app.history.slice(1).map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{h.by_name}</span>
                              <span>{h.action === 'approve' ? 'aprovou' : h.action === 'reject' ? 'rejeitou' : 'pediu alteracoes'}</span>
                              {h.comment && <span className="italic">"{h.comment}"</span>}
                              <span>{timeAgo(h.at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {app.status === 'pending' && (
                      <div className="flex flex-col gap-1 shrink-0">
                        {selectedApproval === app.approval_id ? (
                          <div className="space-y-2 w-48">
                            <Input placeholder="Comentario (opcional)" value={actionComment} onChange={e => setActionComment(e.target.value)} className="text-xs" />
                            <div className="flex gap-1">
                              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handleApprovalAction(app.approval_id, 'approve')}>
                                <Check className="h-3 w-3 mr-1" /> Aprovar
                              </Button>
                              <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => handleApprovalAction(app.approval_id, 'reject')}>
                                <X className="h-3 w-3 mr-1" /> Rejeitar
                              </Button>
                            </div>
                            <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => handleApprovalAction(app.approval_id, 'request_changes')}>
                              <RotateCcw className="h-3 w-3 mr-1" /> Pedir Alteracoes
                            </Button>
                            <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => setSelectedApproval(null)}>Cancelar</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setSelectedApproval(app.approval_id)} data-testid={`review-${app.approval_id}`}>Revisar</Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Comments */}
        <TabsContent value="comments" className="space-y-4">
          {/* New Comment */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{user?.name?.charAt(0) || '?'}</span>
                </div>
                <div className="flex-1 flex gap-2">
                  <Input placeholder="Escreva um comentario..." value={newComment} onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddComment()} data-testid="comment-input" />
                  <Button size="icon" onClick={handleAddComment} disabled={!newComment.trim()} data-testid="send-comment-btn"><Send className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {comments.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Nenhum comentario. Inicie a conversa com sua equipe!</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {comments.map(cmt => (
                <Card key={cmt.comment_id} data-testid={`comment-${cmt.comment_id}`}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {cmt.user_picture ? <img src={cmt.user_picture} alt="" className="w-8 h-8 rounded-full" /> :
                         <span className="text-xs font-bold text-primary">{cmt.user_name?.charAt(0) || '?'}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{cmt.user_name}</span>
                          <span className="text-xs text-muted-foreground">{timeAgo(cmt.created_at)}</span>
                          {cmt.item_type !== 'general' && <Badge variant="outline" className="text-xs">{cmt.item_type}</Badge>}
                        </div>
                        <p className="text-sm mt-1">{cmt.content}</p>
                      </div>
                      {cmt.user_id === user?.user_id && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDeleteComment(cmt.comment_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="activity" className="space-y-2">
          {activities.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground">Nenhuma atividade registrada ainda.</CardContent></Card>
          ) : (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-5 w-5" /> Log de Atividades</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activities.map(act => (
                    <div key={act.activity_id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/30" data-testid={`activity-${act.activity_id}`}>
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm"><span className="font-medium">{act.user_name}</span> {ACTION_LABELS[act.action] || act.action}</p>
                        <p className="text-xs text-muted-foreground">{act.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(act.created_at)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
