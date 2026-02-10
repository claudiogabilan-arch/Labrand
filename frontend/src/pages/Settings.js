import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
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
  Trash2
} from 'lucide-react';

export const Settings = () => {
  const { user } = useAuth();
  const { brands, currentBrand, updateBrand, createBrand } = useBrand();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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
    industry: ''
  });

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

  useEffect(() => {
    if (user) {
      setProfile(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

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
      industry: brand.industry || ''
    });
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
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
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
                  <div className="space-y-2 md:col-span-2">
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
                        setBrandForm({ name: '', description: '', industry: '' });
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
                {brands.map(brand => (
                  <div 
                    key={brand.brand_id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      currentBrand?.brand_id === brand.brand_id ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{brand.name}</p>
                        <div className="flex items-center gap-2">
                          {brand.industry && (
                            <Badge variant="outline" className="text-xs">{brand.industry}</Badge>
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
                    </div>
                  </div>
                ))}
                {brands.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma marca cadastrada
                  </p>
                )}
              </div>
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
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: 'Claro', icon: Sun },
                    { value: 'dark', label: 'Escuro', icon: Moon },
                    { value: 'system', label: 'Sistema', icon: Monitor }
                  ].map(theme => {
                    const Icon = theme.icon;
                    return (
                      <div
                        key={theme.value}
                        onClick={() => setPersonalization(prev => ({ ...prev, theme: theme.value }))}
                        className={`flex flex-col items-center gap-2 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          personalization.theme === theme.value
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent bg-muted/50 hover:bg-muted'
                        }`}
                        data-testid={`theme-${theme.value}`}
                      >
                        <Icon className="h-6 w-6" />
                        <span className="text-sm font-medium">{theme.label}</span>
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
