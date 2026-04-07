import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Moon, Sun, Monitor, Bell, Save, Loader2, BellRing } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsPersonalization() {
  const { getAuthHeaders } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const { permission: pushPerm, subscribed: pushSub, loading: pushLoad, subscribe: pushSubscribe, unsubscribe: pushUnsub } = usePushNotifications();
  const [notifs, setNotifs] = useState({ email: true, browser: true, tasks: true, reports: false });

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/notifications/preferences`, {
        email_enabled: notifs.email,
        types: { approval_request: notifs.tasks, approval_action: notifs.tasks, comment: notifs.browser },
      }, { headers: getAuthHeaders() });
      toast.success('Preferencias salvas!');
    } catch { toast.error('Erro'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Aparencia</CardTitle><CardDescription>Escolha o tema da interface</CardDescription></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'light', icon: Sun, label: 'Claro' },
              { key: 'dark', icon: Moon, label: 'Escuro' },
              { key: 'system', icon: Monitor, label: 'Sistema' },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTheme(t.key)}
                  className={`p-4 rounded-xl border text-center transition-all ${theme === t.key ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted'}`}
                  data-testid={`theme-${t.key}`}>
                  <Icon className="h-5 w-5 mx-auto mb-1" /><span className="text-xs font-medium">{t.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Bell className="h-5 w-5" />Notificacoes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'email', label: 'Notificacoes por Email' },
            { key: 'browser', label: 'Notificacoes no Navegador' },
            { key: 'tasks', label: 'Alertas de Tarefas' },
            { key: 'reports', label: 'Relatorios Semanais' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2">
              <span className="text-sm">{n.label}</span>
              <Switch checked={notifs[n.key]} onCheckedChange={v => setNotifs(p => ({ ...p, [n.key]: v }))} data-testid={`notif-${n.key}`} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><BellRing className="h-5 w-5" />Push Notifications</CardTitle>
          <CardDescription>Receba notificacoes diretamente no navegador</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-sm">Notificacoes do Navegador</p>
              <p className="text-xs text-muted-foreground">
                {pushPerm === 'denied' ? 'Bloqueado pelo navegador' : pushSub ? 'Ativo' : 'Ative para receber alertas'}
              </p>
            </div>
            <Switch checked={pushSub} disabled={pushLoad || pushPerm === 'denied' || pushPerm === 'unsupported'}
              onCheckedChange={async (c) => { if (c) await pushSubscribe(); else await pushUnsub(); }}
              data-testid="push-notification-toggle" />
          </div>
          {pushPerm === 'denied' && (
            <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg">
              As notificacoes push estao bloqueadas pelo seu navegador. Habilite nas configuracoes do browser.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} data-testid="save-personalization-btn">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Preferencias
        </Button>
      </div>
    </div>
  );
}
