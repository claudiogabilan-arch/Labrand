import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Users, Mail, UserPlus, Loader2, Crown, Trash2, X } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const getRoleLabel = (role) => {
  const labels = {
    owner: 'Dono', lider_projeto: 'Lider de Projeto', editor: 'Editor',
    colaborador: 'Colaborador', visualizador: 'Visualizador',
    cliente_admin: 'Cliente Admin', aprovador: 'Aprovador', convidado: 'Convidado',
    admin: 'Administrador', super_admin: 'Super Admin',
  };
  return labels[role] || role;
};

export default function SettingsTeam() {
  const { getAuthHeaders } = useAuth();
  const { currentBrand } = useBrand();
  const [members, setMembers] = useState([]);
  const [owner, setOwner] = useState(null);
  const [invites, setInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);

  const fetchTeam = async () => {
    if (!currentBrand?.brand_id) return;
    try {
      const headers = getAuthHeaders();
      const [mRes, iRes] = await Promise.all([
        axios.get(`${API}/team/members/${currentBrand.brand_id}`, { headers }),
        axios.get(`${API}/team/invites/${currentBrand.brand_id}`, { headers }),
      ]);
      setOwner(mRes.data.owner);
      setMembers(mRes.data.members || []);
      setInvites(iRes.data.invites || []);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchTeam(); }, [currentBrand?.brand_id]);

  const handleInvite = async () => {
    if (!inviteEmail || !currentBrand?.brand_id) return;
    setIsInviting(true);
    try {
      await axios.post(`${API}/team/invite`, { email: inviteEmail, role: inviteRole, brand_id: currentBrand.brand_id }, { headers: getAuthHeaders() });
      toast.success(`Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
      fetchTeam();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro ao enviar convite'); }
    finally { setIsInviting(false); }
  };

  const handleCancelInvite = async (id) => {
    try { await axios.delete(`${API}/team/invites/${id}`, { headers: getAuthHeaders() }); toast.success('Cancelado'); fetchTeam(); }
    catch { toast.error('Erro'); }
  };

  const handleRemoveMember = async (id) => {
    if (!window.confirm('Remover membro?')) return;
    try { await axios.delete(`${API}/team/members/${id}`, { headers: getAuthHeaders() }); toast.success('Removido'); fetchTeam(); }
    catch { toast.error('Erro'); }
  };

  const handleUpdateRole = async (id, role) => {
    try { await axios.put(`${API}/team/members/${id}`, { role }, { headers: getAuthHeaders() }); toast.success('Atualizado'); fetchTeam(); }
    catch { toast.error('Erro'); }
  };

  if (!currentBrand) return <div className="text-center py-8 text-muted-foreground">Selecione uma marca</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5" />Equipe</CardTitle>
          <CardDescription>Gerencie os membros da equipe de {currentBrand.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Owner */}
          {owner && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Crown className="h-4 w-4 text-yellow-500" />
                <div><div className="text-sm font-medium">{owner.name}</div><div className="text-xs text-muted-foreground">{owner.email}</div></div>
              </div>
              <Badge>Dono</Badge>
            </div>
          )}
          {/* Members */}
          {members.map(m => (
            <div key={m.member_id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`team-member-${m.member_id}`}>
              <div><div className="text-sm font-medium">{m.name || m.email}</div><div className="text-xs text-muted-foreground">{m.email}</div></div>
              <div className="flex items-center gap-2">
                <Select value={m.role} onValueChange={v => handleUpdateRole(m.member_id, v)}>
                  <SelectTrigger className="w-[170px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Agencia</div>
                    <SelectItem value="lider_projeto">Lider de Projeto</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                    <Separator className="my-1" />
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Cliente</div>
                    <SelectItem value="cliente_admin">Cliente Admin</SelectItem>
                    <SelectItem value="aprovador">Aprovador</SelectItem>
                    <SelectItem value="convidado">Convidado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveMember(m.member_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Invite */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Convidar Membro</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input className="flex-1" type="email" placeholder="email@exemplo.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} data-testid="invite-email-input" />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Agencia</div>
                <SelectItem value="lider_projeto">Lider de Projeto</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="colaborador">Colaborador</SelectItem>
                <SelectItem value="visualizador">Visualizador</SelectItem>
                <Separator className="my-1" />
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Cliente</div>
                <SelectItem value="cliente_admin">Cliente Admin</SelectItem>
                <SelectItem value="aprovador">Aprovador</SelectItem>
                <SelectItem value="convidado">Convidado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={isInviting || !inviteEmail} data-testid="send-invite-btn">
              {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}Enviar
            </Button>
          </div>
          <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span><strong>Lider de Projeto:</strong> edita tudo, gerencia equipe</span>
            <span><strong>Cliente Admin:</strong> visualiza, aprova entregas</span>
            <span><strong>Editor:</strong> edita pilares, cria tarefas</span>
            <span><strong>Aprovador:</strong> aprova/rejeita entregas</span>
            <span><strong>Colaborador:</strong> comenta e sugere</span>
            <span><strong>Convidado:</strong> visualiza relatorios</span>
            <span><strong>Visualizador:</strong> somente leitura</span>
          </div>
          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase">Convites Pendentes</div>
              {invites.map(inv => (
                <div key={inv.invite_id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
                  <div><span>{inv.email}</span><span className="text-xs text-muted-foreground ml-2">{getRoleLabel(inv.role)}</span></div>
                  <Button variant="ghost" size="sm" onClick={() => handleCancelInvite(inv.invite_id)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
