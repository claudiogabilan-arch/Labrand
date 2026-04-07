import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Save, Loader2, Shield } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsSecurity() {
  const { getAuthHeaders } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleSave = async () => {
    if (form.newPassword !== form.confirmPassword) { toast.error('As senhas nao coincidem'); return; }
    if (form.newPassword.length < 6) { toast.error('Minimo 6 caracteres'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        current_password: form.currentPassword, new_password: form.newPassword,
      }, { headers: getAuthHeaders(), withCredentials: true });
      toast.success('Senha alterada!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Erro ao alterar senha'); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2"><Shield className="h-5 w-5" /> Seguranca</CardTitle>
        <CardDescription>Altere sua senha de acesso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label>Senha Atual</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showPassword ? 'text' : 'password'} value={form.currentPassword} onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))} className="pl-10 pr-10" data-testid="current-password-input" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Nova Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showPassword ? 'text' : 'password'} value={form.newPassword} onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))} className="pl-10" data-testid="new-password-input" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Confirmar Nova Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} className="pl-10" data-testid="confirm-password-input" />
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} data-testid="save-security-btn">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Alterar Senha
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
