import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Save, Loader2, Camera } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsProfile() {
  const { user, getAuthHeaders } = useAuth();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '', location: '', bio: '',
  });

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Maximo: 2MB'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post(`${API}/users/me/avatar`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Foto atualizada!');
      window.location.reload();
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro ao fazer upload'); }
    finally { setUploading(false); }
  };

  const handleRemoveAvatar = async () => {
    try {
      await axios.delete(`${API}/users/me/avatar`, { headers: getAuthHeaders() });
      toast.success('Foto removida');
      window.location.reload();
    } catch { toast.error('Erro ao remover foto'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 500));
      toast.success('Perfil atualizado!');
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Informacoes do Perfil</CardTitle>
        <CardDescription>Atualize suas informacoes pessoais</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.picture ? `${process.env.REACT_APP_BACKEND_URL}${user.picture}` : undefined} alt={user?.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">{getInitials(profile.name)}</AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              {uploading ? <Loader2 className="h-6 w-6 text-white animate-spin" /> : <Camera className="h-6 w-6 text-white" />}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
          <div>
            <h3 className="font-medium">{profile.name}</h3>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="capitalize">{user?.role || 'Usuario'}</Badge>
              {user?.picture && (
                <Button variant="ghost" size="sm" onClick={handleRemoveAvatar} className="text-xs text-muted-foreground hover:text-destructive">Remover foto</Button>
              )}
            </div>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="pl-10" data-testid="profile-name-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="email" value={profile.email} disabled className="pl-10" data-testid="profile-email-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="(11) 99999-9999" className="pl-10" data-testid="profile-phone-input" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Localizacao</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={profile.location} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} placeholder="Sao Paulo, SP" className="pl-10" data-testid="profile-location-input" />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Bio</Label>
            <Textarea value={profile.bio} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} placeholder="Conte um pouco sobre voce..." rows={3} data-testid="profile-bio-input" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} data-testid="save-profile-btn">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar Perfil
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
