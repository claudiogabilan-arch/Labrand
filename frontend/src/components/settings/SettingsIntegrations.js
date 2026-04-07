import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Link2, Unlink, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsIntegrations() {
  const { getAuthHeaders } = useAuth();
  const { currentBrand } = useBrand();
  const [googleStatus, setGoogleStatus] = useState({ connected: false, loading: true });

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

  useEffect(() => {
    const fetchGoogleStatus = async () => {
      if (!currentBrand?.brand_id) { setGoogleStatus({ connected: false, loading: false }); return; }
      try {
        const res = await axios.get(`${API}/brands/${currentBrand.brand_id}/google/status`, { headers: getAuthHeaders(), withCredentials: true });
        setGoogleStatus({ ...res.data, loading: false });
      } catch { setGoogleStatus({ connected: false, loading: false }); }
    };
    fetchGoogleStatus();
  }, [currentBrand?.brand_id, getAuthHeaders]);

  const handleConnectGoogle = async () => {
    if (!currentBrand?.brand_id) { toast.error('Selecione uma marca primeiro'); return; }
    try {
      const res = await axios.get(`${API}/auth/google/init?brand_id=${currentBrand.brand_id}`, { headers: getAuthHeaders(), withCredentials: true });
      window.location.href = res.data.auth_url;
    } catch { toast.error('Erro ao iniciar conexao com Google'); }
  };

  const handleDisconnectGoogle = async () => {
    if (!currentBrand?.brand_id) return;
    try {
      await axios.delete(`${API}/brands/${currentBrand.brand_id}/google/disconnect`, { headers: getAuthHeaders(), withCredentials: true });
      setGoogleStatus({ connected: false, loading: false });
      toast.success('Google desconectado');
    } catch { toast.error('Erro ao desconectar Google'); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Integracoes Google</CardTitle>
        <CardDescription>
          Conecte sua conta Google para acessar Analytics, Search Console e Drive
          {currentBrand && <span className="font-medium"> para {currentBrand.name}</span>}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!currentBrand ? (
          <div className="text-center py-8 text-muted-foreground">Selecione uma marca para configurar integracoes</div>
        ) : googleStatus.loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 border-2 rounded-lg ${googleStatus.connected ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${googleStatus.connected ? 'bg-emerald-500' : 'bg-gray-100'}`}>
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
                    {googleStatus.connected ? `Conectado em ${new Date(googleStatus.connected_at).toLocaleDateString('pt-BR')}` : 'Analytics, Search Console, Drive'}
                  </p>
                </div>
              </div>
              {googleStatus.connected ? (
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-100 text-emerald-700 gap-1"><CheckCircle2 className="h-3 w-3" />Conectado</Badge>
                  <Button variant="outline" size="sm" onClick={handleDisconnectGoogle} data-testid="disconnect-google-btn">
                    <Unlink className="h-4 w-4 mr-2" /> Desconectar
                  </Button>
                </div>
              ) : (
                <Button onClick={handleConnectGoogle} data-testid="connect-google-btn">
                  <Link2 className="h-4 w-4 mr-2" /> Conectar Google
                </Button>
              )}
            </div>

            {googleStatus.connected && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                    </div>
                    <span className="font-medium">Analytics</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Metricas de trafego e comportamento</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                    </div>
                    <span className="font-medium">Search Console</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Performance de busca organica</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center">
                      <svg className="h-4 w-4 text-amber-600" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                    </div>
                    <span className="font-medium">Drive</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Importar documentos</p>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Permissoes solicitadas:</strong> Ao conectar, voce autoriza acesso de leitura ao Google Analytics, Search Console e Google Drive. Nenhuma modificacao sera feita em seus dados.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
