import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Plug, Settings, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Loader2, ExternalLink, Trash2, Eye, EyeOff, Database, TrendingUp,
  Building2, Zap, Key, TestTube, CloudOff
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Provider icons mapping (simplified SVG icons)
const PROVIDER_LOGOS = {
  rdstation: '/logos/rdstation.png',
  hubspot: '/logos/hubspot.png',
  pipedrive: '/logos/pipedrive.png',
  kommo: '/logos/kommo.png',
  meta: '/logos/meta.png',
  google: '/logos/google.png',
  tiktok: '/logos/tiktok.png'
};

const STATUS_STYLES = {
  connected: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', label: 'Conectado' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Erro' },
  pending_test: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', label: 'Pendente' },
  disconnected: { icon: CloudOff, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Desconectado' }
};

export default function Integrations() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState({ crm: {}, ads: {} });
  const [integrations, setIntegrations] = useState([]);
  const [configDialog, setConfigDialog] = useState(null);
  const [credentials, setCredentials] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(null);
  const [syncing, setSyncing] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  useEffect(() => {
    if (currentBrand) loadIntegrations();
  }, [currentBrand]);

  const loadProviders = async () => {
    try {
      const res = await axios.get(`${API}/integrations/providers`);
      setProviders(res.data.providers);
    } catch (error) {
      console.error('Error loading providers');
    }
  };

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/integrations`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setIntegrations(res.data.integrations || []);
    } catch (error) {
      console.error('Error loading integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConfig = (category, providerId) => {
    const provider = providers[category]?.[providerId];
    if (!provider) return;
    
    // Check if already configured
    const existing = integrations.find(
      i => i.category === category && i.provider_id === providerId
    );
    
    // Initialize credentials fields
    const initialCreds = {};
    provider.fields.forEach(field => {
      initialCreds[field.id] = '';
    });
    
    setCredentials(initialCreds);
    setShowPasswords({});
    setConfigDialog({ category, providerId, provider, existing });
  };

  const handleSaveIntegration = async () => {
    if (!configDialog) return;
    
    const { category, providerId, provider } = configDialog;
    
    // Validate required fields
    for (const field of provider.fields) {
      if (field.required && !credentials[field.id]) {
        toast.error(`Campo obrigatório: ${field.label}`);
        return;
      }
    }
    
    setSaving(true);
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/integrations/${category}`,
        {
          provider_id: providerId,
          credentials: credentials,
          is_enabled: true
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      toast.success(`${provider.name} configurado com sucesso!`);
      setConfigDialog(null);
      loadIntegrations();
    } catch (error) {
      toast.error('Erro ao salvar integração');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (category, providerId) => {
    setTesting(`${category}_${providerId}`);
    try {
      const res = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/integrations/${category}/${providerId}/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
      loadIntegrations();
    } catch (error) {
      toast.error('Erro ao testar conexão');
    } finally {
      setTesting(null);
    }
  };

  const handleSync = async (category, providerId) => {
    setSyncing(`${category}_${providerId}`);
    try {
      const res = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/integrations/${category}/${providerId}/sync`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (res.data.success) {
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message);
      }
      loadIntegrations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao sincronizar');
    } finally {
      setSyncing(null);
    }
  };

  const handleDelete = async (category, providerId) => {
    if (!window.confirm('Remover esta integração? Os dados sincronizados serão mantidos.')) return;
    
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/integrations/${category}/${providerId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Integração removida');
      loadIntegrations();
    } catch (error) {
      toast.error('Erro ao remover integração');
    }
  };

  const getIntegrationStatus = (category, providerId) => {
    const integration = integrations.find(
      i => i.category === category && i.provider_id === providerId
    );
    return integration?.status || 'disconnected';
  };

  const isConfigured = (category, providerId) => {
    return integrations.some(i => i.category === category && i.provider_id === providerId);
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca primeiro</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Plug className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integrações</h1>
            <p className="text-muted-foreground">Configure suas conexões com CRMs e Plataformas de Ads</p>
          </div>
        </div>
        <Button onClick={loadIntegrations} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Self-Service: Configure suas próprias credenciais
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-300">
                Você tem total controle sobre suas integrações. As credenciais são armazenadas de forma segura 
                e você pode testar, sincronizar ou remover a qualquer momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="crm">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="crm" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            CRM
          </TabsTrigger>
          <TabsTrigger value="ads" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Plataformas de Ads
          </TabsTrigger>
        </TabsList>

        {/* CRM Tab */}
        <TabsContent value="crm" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(providers.crm || {}).map(([providerId, provider]) => {
              const status = getIntegrationStatus('crm', providerId);
              const configured = isConfigured('crm', providerId);
              const StatusIcon = STATUS_STYLES[status]?.icon || CloudOff;
              const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.disconnected;
              
              return (
                <Card key={providerId} className={configured ? 'border-2 border-primary/30' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Database className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          <Badge className={`${statusStyle.bg} ${statusStyle.color} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusStyle.label}
                          </Badge>
                        </div>
                      </div>
                      <a 
                        href={provider.docs_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {!configured ? (
                        <Button 
                          className="flex-1" 
                          onClick={() => handleOpenConfig('crm', providerId)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenConfig('crm', providerId)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTestConnection('crm', providerId)}
                            disabled={testing === `crm_${providerId}`}
                          >
                            {testing === `crm_${providerId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSync('crm', providerId)}
                            disabled={syncing === `crm_${providerId}` || status !== 'connected'}
                          >
                            {syncing === `crm_${providerId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Sincronizar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete('crm', providerId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Ads Tab */}
        <TabsContent value="ads" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(providers.ads || {}).map(([providerId, provider]) => {
              const status = getIntegrationStatus('ads', providerId);
              const configured = isConfigured('ads', providerId);
              const StatusIcon = STATUS_STYLES[status]?.icon || CloudOff;
              const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.disconnected;
              
              return (
                <Card key={providerId} className={configured ? 'border-2 border-primary/30' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          <Badge className={`${statusStyle.bg} ${statusStyle.color} text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusStyle.label}
                          </Badge>
                        </div>
                      </div>
                      <a 
                        href={provider.docs_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {!configured ? (
                        <Button 
                          className="flex-1" 
                          onClick={() => handleOpenConfig('ads', providerId)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Configurar
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleOpenConfig('ads', providerId)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleTestConnection('ads', providerId)}
                            disabled={testing === `ads_${providerId}`}
                          >
                            {testing === `ads_${providerId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4" />
                            )}
                          </Button>
                          <Button 
                            variant="default" 
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSync('ads', providerId)}
                            disabled={syncing === `ads_${providerId}` || status !== 'connected'}
                          >
                            {syncing === `ads_${providerId}` ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Sincronizar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete('ads', providerId)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Configurar {configDialog?.provider?.name}
            </DialogTitle>
            <DialogDescription>
              Insira suas credenciais de API. Você pode obtê-las no painel do{' '}
              <a 
                href={configDialog?.provider?.docs_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                {configDialog?.provider?.name}
              </a>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {configDialog?.provider?.fields.map(field => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    id={field.id}
                    type={field.type === 'password' && !showPasswords[field.id] ? 'password' : 'text'}
                    placeholder={field.placeholder || ''}
                    value={credentials[field.id] || ''}
                    onChange={(e) => setCredentials({...credentials, [field.id]: e.target.value})}
                  />
                  {field.type === 'password' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPasswords({...showPasswords, [field.id]: !showPasswords[field.id]})}
                    >
                      {showPasswords[field.id] ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveIntegration} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Credenciais
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
