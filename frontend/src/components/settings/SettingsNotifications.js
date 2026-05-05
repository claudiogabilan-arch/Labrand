import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { Checkbox } from '../ui/checkbox';
import { Loader2, Mail, MessageCircle, Edit3, Sparkles, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TYPES = [
  { id: 'comment', label: 'Comentários',           icon: MessageCircle },
  { id: 'change',  label: 'Mudanças e aprovações', icon: Edit3 },
  { id: 'ai',      label: 'Insights de IA',        icon: Sparkles },
  { id: 'system',  label: 'Sistema',               icon: SettingsIcon },
];

export default function SettingsNotifications() {
  const { token } = useAuth();
  const { brands } = useBrand();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailDigest, setEmailDigest] = useState('off');
  const [muteTypes, setMuteTypes] = useState([]);
  const [muteBrands, setMuteBrands] = useState([]);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [perTypeEmail, setPerTypeEmail] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const p = res.data || {};
        setEmailDigest(p.email_digest || 'off');
        setMuteTypes(p.mute_types || []);
        setMuteBrands(p.mute_brands || []);
        setEmailEnabled(p.email_enabled !== false);
        setPerTypeEmail(p.types || {});
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const toggleMuteType = (id) => {
    setMuteTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const toggleMuteBrand = (id) => {
    setMuteBrands(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/notifications/preferences`, {
        email_enabled: emailEnabled,
        types: perTypeEmail,
        email_digest: emailDigest,
        mute_types: muteTypes,
        mute_brands: muteBrands,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Preferências salvas');
    } catch {
      toast.error('Erro ao salvar preferências');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="settings-notifications">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading">
            <Mail className="h-5 w-5" /> Resumo por email
          </CardTitle>
          <CardDescription>
            Receba um resumo agrupado das notificações não lidas. Mantém a caixa limpa sem perder o que importa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleGroup
            type="single"
            value={emailDigest}
            onValueChange={(v) => v && setEmailDigest(v)}
            className="justify-start"
            data-testid="digest-frequency"
          >
            <ToggleGroupItem value="off" data-testid="digest-off">Desligado</ToggleGroupItem>
            <ToggleGroupItem value="daily" data-testid="digest-daily">Diário</ToggleGroupItem>
            <ToggleGroupItem value="weekly" data-testid="digest-weekly">Semanal</ToggleGroupItem>
          </ToggleGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Silenciar tipos</CardTitle>
          <CardDescription>Tipos selecionados não entrarão no digest por email.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TYPES.map(t => {
              const Icon = t.icon;
              const checked = muteTypes.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-muted/40' : 'hover:bg-muted/20'}`}
                  data-testid={`mute-type-${t.id}`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleMuteType(t.id)}
                  />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t.label}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Silenciar marcas</CardTitle>
          <CardDescription>Marcas marcadas serão ignoradas no digest. Continuam aparecendo no painel in-app.</CardDescription>
        </CardHeader>
        <CardContent>
          {brands?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {brands.map(b => {
                const checked = muteBrands.includes(b.brand_id);
                return (
                  <label
                    key={b.brand_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checked ? 'bg-muted/40' : 'hover:bg-muted/20'}`}
                    data-testid={`mute-brand-${b.brand_id}`}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleMuteBrand(b.brand_id)} />
                    <span className="text-sm">{b.name}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma marca disponível.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">Email transacional</CardTitle>
          <CardDescription>Emails imediatos para eventos críticos (aprovações, menções). O digest acima é independente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Label className="flex items-center gap-3 cursor-pointer" data-testid="toggle-email-enabled">
            <Checkbox checked={emailEnabled} onCheckedChange={(v) => setEmailEnabled(!!v)} />
            <span className="text-sm">Receber emails de notificação imediatos</span>
          </Label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} data-testid="save-notifications">
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar preferências
        </Button>
      </div>
    </div>
  );
}
