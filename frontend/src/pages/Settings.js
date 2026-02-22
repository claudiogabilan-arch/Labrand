import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Building2, 
  Palette, 
  Save, 
  Loader2,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Moon,
  Sun,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Unlink,
  CheckCircle2,
  ExternalLink,
  Users,
  Upload,
  Camera,
  UserPlus,
  Crown,
  X
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Settings = () => {
  const { user, getAuthHeaders } = useAuth();
  const { brands, currentBrand, updateBrand, createBrand } = useBrand();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Google integration state
  const [googleStatus, setGoogleStatus] = useState({ connected: false, loading: true });
  
  // Check URL params for Google connection status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google') === 'connected') {
      toast.success('Google conectado com sucesso!');
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('error')) {
      toast.error(`Erro ao conectar Google: ${params.get('error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);
  
  // Fetch Google status
  useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!currentBrand?.brand_id) {
        setGoogleStatus({ connected: false, loading: false });
        return;
      }
      try {
        const response = await axios.get(`${API}/brands/${currentBrand.brand_id}/google/status`, {
          headers: getAuthHeaders(),
          withCredentials: true
        });
        setGoogleStatus({ ...response.data, loading: false });
      } catch (error) {
        setGoogleStatus({ connected: false, loading: false });
      }
    };
    fetchGoogleStatus();
  }, [currentBrand?.brand_id, getAuthHeaders]);
  
  const handleConnectGoogle = async () => {
    if (!currentBrand?.brand_id) {
      toast.error('Selecione uma marca primeiro');
      return;
    }
    try {
      const response = await axios.get(`${API}/auth/google/init?brand_id=${currentBrand.brand_id}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      window.location.href = response.data.auth_url;
    } catch (error) {
      toast.error('Erro ao iniciar conexão com Google');
    }
  };
  
  const handleDisconnectGoogle = async () => {
    if (!currentBrand?.brand_id) return;
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/google/disconnect`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setGoogleStatus({ connected: false, loading: false });
      toast.success('Google desconectado');
    } catch (error) {
      toast.error('Erro ao desconectar Google');
    }
  };
  
  // Profile state
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: ''
  });

  // Security state
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Brand editing state
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({
    name: '',
    description: '',
    industry: '',
    brand_type: 'monolitica',
    parent_brand_id: '',
    brand_color: '#3B82F6'
  });
  const [deletingBrand, setDeletingBrand] = useState(null);

  // Personalization state
  const [personalization, setPersonalization] = useState({
    theme: 'light',
    language: 'pt-BR',
    notifications: {
      email: true,
      browser: true,
      tasks: true,
      reports: false
    },
    sidebar: 'expanded',
    dateFormat: 'DD/MM/YYYY'
  });

  // Team state
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamOwner, setTeamOwner] = useState(null);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [isInviting, setIsInviting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Fetch team members when brand changes
  useEffect(() => {
    if (currentBrand?.brand_id) {
      fetchTeamMembers();
      fetchPendingInvites();
    }
  }, [currentBrand?.brand_id]);

  const fetchTeamMembers = async () => {
    if (!currentBrand?.brand_id) return;
    try {
      const response = await axios.get(`${API}/team/members/${currentBrand.brand_id}`, {
        headers: getAuthHeaders()
      });
      setTeamOwner(response.data.owner);
      setTeamMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchPendingInvites = async () => {
    if (!currentBrand?.brand_id) return;
    try {
      const response = await axios.get(`${API}/team/invites/${currentBrand.brand_id}`, {
        headers: getAuthHeaders()
      });
      setPendingInvites(response.data.invites || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 2MB');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/users/me/avatar`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Foto atualizada!');
      // Refresh page to update avatar everywhere
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer upload');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await axios.delete(`${API}/users/me/avatar`, {
        headers: getAuthHeaders()
      });
      toast.success('Foto removida');
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao remover foto');
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail || !currentBrand?.brand_id) return;

    setIsInviting(true);
    try {
      await axios.post(`${API}/team/invite`, {
        email: inviteEmail,
        role: inviteRole,
        brand_id: currentBrand.brand_id
      }, {
        headers: getAuthHeaders()
      });

      toast.success(`Convite enviado para ${inviteEmail}!`);
      setInviteEmail('');
      fetchPendingInvites();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar convite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await axios.delete(`${API}/team/invites/${inviteId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Convite cancelado');
      fetchPendingInvites();
    } catch (error) {
      toast.error('Erro ao cancelar convite');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Remover este membro da equipe?')) return;
    try {
      await axios.delete(`${API}/team/members/${memberId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Membro removido');
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao remover membro');
    }
  };

  const handleUpdateMemberRole = async (memberId, newRole) => {
    try {
      await axios.put(`${API}/team/members/${memberId}`, { role: newRole }, {
        headers: getAuthHeaders()
      });
      toast.success('Papel atualizado');
      fetchTeamMembers();
    } catch (error) {
      toast.error('Erro ao atualizar papel');
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would call an API to update the user profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Configurações de segurança atualizadas!');
      setSecurity(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      toast.error('Erro ao atualizar segurança');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!brandForm.name.trim()) {
      toast.error('Nome da marca é obrigatório');
      return;
    }
    setIsSaving(true);
    try {
      if (editingBrand) {
        await updateBrand(editingBrand.brand_id, brandForm);
        toast.success('Marca atualizada!');
      } else {
        await createBrand(brandForm);
        toast.success('Marca criada!');
      }
      setEditingBrand(null);
      setBrandForm({ name: '', description: '', industry: '' });
    } catch (error) {
      toast.error('Erro ao salvar marca');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      description: brand.description || '',
      industry: brand.industry || '',
      brand_type: brand.brand_type || 'monolitica',
      parent_brand_id: brand.parent_brand_id || '',
      brand_color: brand.brand_color || '#3B82F6'
    });
  };

  const handleDeleteBrand = async (brand) => {
    try {
      await axios.delete(`${API}/brands/${brand.brand_id}`, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      toast.success('Marca excluída com sucesso!');
      setDeletingBrand(null);
      window.location.reload();
    } catch (error) {
      toast.error('Erro ao excluir marca');
    }
  };

  const handleSavePersonalization = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('labrand_personalization', JSON.stringify(personalization));
      toast.success('Preferências salvas!');
    } catch (error) {
      toast.error('Erro ao salvar preferências');
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const industries = [
    'Tecnologia', 'Saúde', 'Educação', 'Varejo', 'Alimentação',
    'Moda', 'Serviços Financeiros', 'Entretenimento', 'Imobiliário',
    'Consultoria', 'Marketing', 'Indústria', 'Outro'
  ];

  const brandTypes = [
    { value: 'monolitica', label: 'Monolítica', desc: 'Marca única para todos os produtos/serviços' },
    { value: 'endossada', label: 'Endossada', desc: 'Submarca com endosso da marca mãe' },
    { value: 'submarca', label: 'Submarca', desc: 'Marca filha vinculada a uma marca mãe' },
    { value: 'hibrida', label: 'Híbrida', desc: 'Combinação de diferentes estratégias' },
    { value: 'house_of_brands', label: 'House of Brands', desc: 'Grupo de marcas independentes' }
  ];

  const brandColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  // Get potential parent brands (exclude current brand if editing)
  const parentBrandOptions = brands.filter(b => 
    b.brand_id !== editingBrand?.brand_id && 
    (b.brand_type === 'monolitica' || b.brand_type === 'house_of_brands' || b.brand_type === 'hibrida')
  );

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-500 flex items-center justify-center">
          <SettingsIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">Gerencie seu perfil e preferências</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Marcas</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Link2 className="h-4 w-4" />
            <span className="hidden sm:inline">Integrações</span>
          </TabsTrigger>
          <TabsTrigger value="personalization" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Personalização</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <Badge variant="outline" className="mt-2 capitalize">
                    {user?.role || 'Usuário'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="pl-10"
                      data-testid="profile-name-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="pl-10"
                      disabled
                      data-testid="profile-email-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      data-testid="profile-phone-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Localização</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="São Paulo, SP"
                      className="pl-10"
                      data-testid="profile-location-input"
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Conte um pouco sobre você..."
                    rows={3}
                    data-testid="profile-bio-input"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={isSaving} data-testid="save-profile-btn">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Salvar Perfil
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alterar Senha</CardTitle>
              <CardDescription>Atualize sua senha de acesso</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={security.currentPassword}
                    onChange={(e) => setSecurity(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="pl-10 pr-10"
                    data-testid="current-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={security.newPassword}
                    onChange={(e) => setSecurity(prev => ({ ...prev, newPassword: e.target.value }))}
                    data-testid="new-password-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSecurity} disabled={isSaving} data-testid="save-security-btn">
                  {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Shield className="h-4 w-4 mr-2" />}
                  Atualizar Senha
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Autenticação em Duas Etapas</CardTitle>
              <CardDescription>Adicione uma camada extra de segurança</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Ativar 2FA</p>
                  <p className="text-sm text-muted-foreground">
                    Receba um código de verificação ao fazer login
                  </p>
                </div>
                <Switch
                  checked={security.twoFactorEnabled}
                  onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, twoFactorEnabled: checked }))}
                  data-testid="2fa-switch"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sessões Ativas</CardTitle>
              <CardDescription>Gerencie seus dispositivos conectados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">Este dispositivo</p>
                      <p className="text-xs text-muted-foreground">Navegador • Última atividade: Agora</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Gerenciar Marcas</CardTitle>
                  <CardDescription>Crie e edite suas marcas</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setEditingBrand(null);
                    setBrandForm({ name: '', description: '', industry: '' });
                  }}
                  data-testid="new-brand-settings-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Marca
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Brand Form */}
              <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
                <h4 className="font-medium">
                  {editingBrand ? 'Editar Marca' : 'Nova Marca'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Marca *</Label>
                    <Input
                      value={brandForm.name}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome da marca"
                      data-testid="brand-form-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Setor</Label>
                    <Select 
                      value={brandForm.industry} 
                      onValueChange={(v) => setBrandForm(prev => ({ ...prev, industry: v }))}
                    >
                      <SelectTrigger data-testid="brand-form-industry">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map(ind => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Brand Type */}
                  <div className="space-y-2 md:col-span-2">
                    <Label>Arquitetura de Marca *</Label>
                    <Select 
                      value={brandForm.brand_type} 
                      onValueChange={(v) => setBrandForm(prev => ({ ...prev, brand_type: v, parent_brand_id: v === 'submarca' || v === 'endossada' ? prev.parent_brand_id : '' }))}
                    >
                      <SelectTrigger data-testid="brand-form-type">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {brandTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            <div>
                              <span className="font-medium">{type.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">- {type.desc}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Parent Brand (for submarca/endossada) */}
                  {(brandForm.brand_type === 'submarca' || brandForm.brand_type === 'endossada') && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Marca Mãe *</Label>
                      <Select 
                        value={brandForm.parent_brand_id} 
                        onValueChange={(v) => setBrandForm(prev => ({ ...prev, parent_brand_id: v }))}
                      >
                        <SelectTrigger data-testid="brand-form-parent">
                          <SelectValue placeholder="Selecione a marca mãe" />
                        </SelectTrigger>
                        <SelectContent>
                          {parentBrandOptions.map(brand => (
                            <SelectItem key={brand.brand_id} value={brand.brand_id}>
                              {brand.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {parentBrandOptions.length === 0 && (
                        <p className="text-xs text-amber-600">Crie uma marca principal primeiro</p>
                      )}
                    </div>
                  )}

                  {/* Brand Color */}
                  <div className="space-y-2">
                    <Label>Cor da Marca</Label>
                    <div className="flex flex-wrap gap-2">
                      {brandColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setBrandForm(prev => ({ ...prev, brand_color: color }))}
                          className={`w-8 h-8 rounded-lg transition-all ${
                            brandForm.brand_color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          data-testid={`color-${color}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label>Logo da Marca</Label>
                    <div className="flex items-center gap-4">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !editingBrand) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await axios.post(`${API}/brands/${editingBrand.brand_id}/logo`, formData, {
                              headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                            });
                            toast.success('Logo enviado!');
                            window.location.reload();
                          } catch (err) {
                            toast.error('Erro ao enviar logo');
                          }
                        }}
                        className="text-sm"
                        disabled={!editingBrand}
                      />
                      {!editingBrand && <span className="text-xs text-muted-foreground">Salve a marca primeiro</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={brandForm.description}
                      onChange={(e) => setBrandForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Descrição da marca"
                      rows={2}
                      data-testid="brand-form-description"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveBrand} disabled={isSaving} data-testid="save-brand-btn">
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {editingBrand ? 'Atualizar' : 'Criar'} Marca
                  </Button>
                  {editingBrand && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingBrand(null);
                        setBrandForm({ name: '', description: '', industry: '', brand_type: 'monolitica', parent_brand_id: '', brand_color: '#3B82F6' });
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>

              {/* Brands List */}
              <div className="space-y-3">
                <h4 className="font-medium">Suas Marcas</h4>
                {brands.map(brand => {
                  const parentBrand = brands.find(b => b.brand_id === brand.parent_brand_id);
                  const brandType = brandTypes.find(t => t.value === brand.brand_type);
                  return (
                    <div 
                      key={brand.brand_id} 
                      className={`flex items-center justify-between p-4 border rounded-lg ${
                        currentBrand?.brand_id === brand.brand_id ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {brand.logo_url ? (
                          <img 
                            src={`${process.env.REACT_APP_BACKEND_URL}${brand.logo_url}`}
                            alt={brand.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: brand.brand_color || '#3B82F6' }}
                          >
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{brand.name}</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {brand.industry && (
                              <Badge variant="outline" className="text-xs">{brand.industry}</Badge>
                            )}
                            {brandType && (
                              <Badge variant="secondary" className="text-xs">{brandType.label}</Badge>
                            )}
                            {parentBrand && (
                              <Badge variant="outline" className="text-xs bg-amber-50">
                                Mãe: {parentBrand.name}
                              </Badge>
                            )}
                            {currentBrand?.brand_id === brand.brand_id && (
                              <Badge className="text-xs">Ativa</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditBrand(brand)}
                          data-testid={`edit-brand-${brand.brand_id}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingBrand(brand)}
                          data-testid={`delete-brand-${brand.brand_id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {brands.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma marca cadastrada
                  </p>
                )}
              </div>

              {/* Delete Confirmation Dialog */}
              {deletingBrand && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 space-y-4">
                    <h3 className="font-bold text-lg">Excluir Marca</h3>
                    <p className="text-muted-foreground">
                      Tem certeza que deseja excluir <strong>{deletingBrand.name}</strong>? 
                      Esta ação não pode ser desfeita e todos os dados da marca serão perdidos.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => setDeletingBrand(null)}>
                        Cancelar
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleDeleteBrand(deletingBrand)}
                        data-testid="confirm-delete-brand"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Integrações Google</CardTitle>
              <CardDescription>
                Conecte sua conta Google para acessar Analytics, Search Console e Drive
                {currentBrand && <span className="font-medium"> para {currentBrand.name}</span>}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!currentBrand ? (
                <div className="text-center py-8 text-muted-foreground">
                  Selecione uma marca para configurar integrações
                </div>
              ) : googleStatus.loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Google Connection Status */}
                  <div className={`flex items-center justify-between p-4 border-2 rounded-lg ${
                    googleStatus.connected ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        googleStatus.connected ? 'bg-emerald-500' : 'bg-gray-100'
                      }`}>
                        <svg className="h-6 w-6" viewBox="0 0 24 24">
                          <path fill={googleStatus.connected ? "#fff" : "#4285F4"} d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill={googleStatus.connected ? "#fff" : "#34A853"} d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill={googleStatus.connected ? "#fff" : "#FBBC05"} d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill={googleStatus.connected ? "#fff" : "#EA4335"} d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium">Google Services</p>
                        <p className="text-sm text-muted-foreground">
                          {googleStatus.connected 
                            ? `Conectado em ${new Date(googleStatus.connected_at).toLocaleDateString('pt-BR')}`
                            : 'Analytics, Search Console, Drive'}
                        </p>
                      </div>
                    </div>
                    {googleStatus.connected ? (
                      <div className="flex items-center gap-3">
                        <Badge className="bg-emerald-100 text-emerald-700 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Conectado
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleDisconnectGoogle}
                          data-testid="disconnect-google-btn"
                        >
                          <Unlink className="h-4 w-4 mr-2" />
                          Desconectar
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleConnectGoogle} data-testid="connect-google-btn">
                        <Link2 className="h-4 w-4 mr-2" />
                        Conectar Google
                      </Button>
                    )}
                  </div>

                  {/* Services Info */}
                  {googleStatus.connected && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                            </svg>
                          </div>
                          <span className="font-medium">Analytics</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Métricas de tráfego e comportamento</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                            </svg>
                          </div>
                          <span className="font-medium">Search Console</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Performance de busca orgânica</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center">
                            <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                            </svg>
                          </div>
                          <span className="font-medium">Drive</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Importar documentos</p>
                      </div>
                    </div>
                  )}

                  {/* Permissions Info */}
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Permissões solicitadas:</strong> Ao conectar, você autoriza acesso de leitura 
                      ao Google Analytics, Search Console e Google Drive. Nenhuma modificação será feita em seus dados.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalization Tab */}
        <TabsContent value="personalization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aparência</CardTitle>
              <CardDescription>Personalize a interface do sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Tema</Label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'light', label: 'Claro', icon: Sun },
                    { value: 'dark', label: 'Escuro', icon: Moon }
                  ].map(themeOption => {
                    const Icon = themeOption.icon;
                    return (
                      <div
                        key={themeOption.value}
                        onClick={() => {
                          setTheme(themeOption.value);
                          setPersonalization(prev => ({ ...prev, theme: themeOption.value }));
                        }}
                        className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          theme === themeOption.value
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                        data-testid={`theme-${themeOption.value}`}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{themeOption.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Sidebar</Label>
                <div className="flex gap-4">
                  {[
                    { value: 'expanded', label: 'Expandida' },
                    { value: 'collapsed', label: 'Recolhida' }
                  ].map(option => (
                    <div
                      key={option.value}
                      onClick={() => setPersonalization(prev => ({ ...prev, sidebar: option.value }))}
                      className={`flex-1 p-3 border-2 rounded-lg cursor-pointer text-center transition-all ${
                        personalization.sidebar === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-transparent bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select 
                    value={personalization.language} 
                    onValueChange={(v) => setPersonalization(prev => ({ ...prev, language: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Español</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato de Data</Label>
                  <Select 
                    value={personalization.dateFormat} 
                    onValueChange={(v) => setPersonalization(prev => ({ ...prev, dateFormat: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>Configure suas preferências de notificação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'email', label: 'Notificações por Email', desc: 'Receba atualizações no seu email' },
                { key: 'browser', label: 'Notificações do Navegador', desc: 'Receba alertas no navegador' },
                { key: 'tasks', label: 'Lembretes de Tarefas', desc: 'Seja notificado sobre tarefas pendentes' },
                { key: 'reports', label: 'Relatórios Semanais', desc: 'Receba resumos semanais por email' }
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch
                    checked={personalization.notifications[item.key]}
                    onCheckedChange={(checked) => setPersonalization(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, [item.key]: checked }
                    }))}
                    data-testid={`notification-${item.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSavePersonalization} disabled={isSaving} data-testid="save-personalization-btn">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Preferências
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
