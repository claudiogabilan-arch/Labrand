import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { toast } from 'sonner';
import { 
  Users, Link2, Unlink, Loader2, RefreshCw, Download,
  CheckCircle2, AlertCircle, Building2, Mail, Phone, Filter
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CRM_INFO = {
  rdstation: { 
    name: "RD Station", 
    color: "bg-blue-500",
    description: "CRM brasileiro líder em inbound marketing",
    fields: ["client_id", "client_secret"]
  },
  hubspot: { 
    name: "HubSpot", 
    color: "bg-orange-500",
    description: "Plataforma completa de CRM e marketing",
    fields: ["api_key"]
  },
  kommo: { 
    name: "Kommo", 
    color: "bg-purple-500",
    description: "CRM focado em vendas e mensagens",
    fields: ["api_key", "subdomain"]
  }
};

const STAGE_COLORS = {
  lead: "bg-gray-500",
  qualified: "bg-blue-500",
  opportunity: "bg-yellow-500",
  customer: "bg-green-500"
};

const STAGE_LABELS = {
  lead: "Lead",
  qualified: "Qualificado",
  opportunity: "Oportunidade",
  customer: "Cliente"
};

export default function CRMIntegration() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [stats, setStats] = useState({});
  const [contacts, setContacts] = useState([]);
  const [contactStats, setContactStats] = useState({});
  const [connectDialog, setConnectDialog] = useState(null);
  const [formData, setFormData] = useState({});
  const [filterProvider, setFilterProvider] = useState(null);

  useEffect(() => {
    if (currentBrand) loadData();
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [intRes, contactsRes] = await Promise.all([
        axios.get(`${API}/brands/${currentBrand.brand_id}/crm`, 
          { headers: { Authorization: `Bearer ${token}` }}),
        axios.get(`${API}/brands/${currentBrand.brand_id}/crm/contacts`,
          { headers: { Authorization: `Bearer ${token}` }})
      ]);
      setIntegrations(intRes.data.integrations || []);
      setStats(intRes.data.stats || {});
      setContacts(contactsRes.data.contacts || []);
      setContactStats(contactsRes.data.by_stage || {});
    } catch (error) {
      console.error('Error loading CRM data');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!connectDialog) return;
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/crm/connect`,
        { provider: connectDialog, ...formData },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(`${CRM_INFO[connectDialog].name} conectado!`);
      setConnectDialog(null);
      setFormData({});
      loadData();
    } catch (error) {
      toast.error('Erro ao conectar CRM. Verifique suas credenciais.');
    }
  };

  const handleDisconnect = async (provider) => {
    if (!window.confirm(`Desconectar ${CRM_INFO[provider].name}?`)) return;
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/crm/${provider}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('CRM desconectado com sucesso');
      loadData();
    } catch (error) {
      toast.error('Erro ao desconectar. Tente novamente.');
    }
  };

  const handleImport = async (provider) => {
    setImporting(provider);
    try {
      const response = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/crm/import`,
        { provider, import_type: "contacts" },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success(response.data.message);
      loadData();
    } catch (error) {
      toast.error('Erro ao importar dados. Verifique a conexão.');
    } finally {
      setImporting(null);
    }
  };

  const isConnected = (provider) => integrations.some(i => i.provider === provider);

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
    <div className="space-y-6" data-testid="crm-integration-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Integrações CRM</h1>
          <p className="text-muted-foreground">Conecte seus CRMs e importe contatos</p>
        </div>
      </div>

      {/* CRM Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(CRM_INFO).map(([key, info]) => {
          const connected = isConnected(key);
          const integration = integrations.find(i => i.provider === key);
          
          return (
            <Card key={key} className={connected ? "border-green-500/50" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${info.color} flex items-center justify-center`}>
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription className="text-xs">{info.description}</CardDescription>
                    </div>
                  </div>
                  {connected && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {connected ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Contatos importados</span>
                      <Badge variant="secondary">{stats[key]?.contacts || 0}</Badge>
                    </div>
                    {integration?.last_sync && (
                      <p className="text-xs text-muted-foreground">
                        Último sync: {new Date(integration.last_sync).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleImport(key)}
                        disabled={importing === key}
                      >
                        {importing === key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><RefreshCw className="h-4 w-4 mr-1" /> Sincronizar</>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDisconnect(key)}
                      >
                        <Unlink className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={() => setConnectDialog(key)}
                  >
                    <Link2 className="h-4 w-4 mr-2" /> Conectar
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{contacts.length}</div>
            <p className="text-sm text-muted-foreground">Total Contatos</p>
          </CardContent>
        </Card>
        {Object.entries(STAGE_LABELS).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${STAGE_COLORS[key]}`} />
                <span className="text-2xl font-bold">{contactStats[key] || 0}</span>
              </div>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Contatos Importados
            </CardTitle>
            <div className="flex gap-2">
              {Object.entries(CRM_INFO).map(([key, info]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={filterProvider === key ? "default" : "outline"}
                  onClick={() => setFilterProvider(filterProvider === key ? null : key)}
                >
                  {info.name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum contato importado ainda</p>
              <p className="text-sm">Conecte um CRM e sincronize os dados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead>Fonte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts
                  .filter(c => !filterProvider || c.source === filterProvider)
                  .slice(0, 20)
                  .map((contact, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3" /> {contact.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" /> {contact.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={STAGE_COLORS[contact.stage]}>
                        {STAGE_LABELS[contact.stage] || contact.stage}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{contact.source_name}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Connect Dialog */}
      <Dialog open={!!connectDialog} onOpenChange={() => setConnectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conectar {connectDialog && CRM_INFO[connectDialog]?.name}</DialogTitle>
            <DialogDescription>
              Insira suas credenciais de API para conectar o CRM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {connectDialog && CRM_INFO[connectDialog]?.fields.includes("client_id") && (
              <div className="space-y-2">
                <Label>Client ID</Label>
                <Input
                  placeholder="Seu Client ID"
                  value={formData.client_id || ''}
                  onChange={(e) => setFormData({...formData, client_id: e.target.value})}
                />
              </div>
            )}
            {connectDialog && CRM_INFO[connectDialog]?.fields.includes("client_secret") && (
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <Input
                  type="password"
                  placeholder="Seu Client Secret"
                  value={formData.client_secret || ''}
                  onChange={(e) => setFormData({...formData, client_secret: e.target.value})}
                />
              </div>
            )}
            {connectDialog && CRM_INFO[connectDialog]?.fields.includes("api_key") && (
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  placeholder="Sua API Key"
                  value={formData.api_key || ''}
                  onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                />
              </div>
            )}
            {connectDialog && CRM_INFO[connectDialog]?.fields.includes("subdomain") && (
              <div className="space-y-2">
                <Label>Subdomínio (ex: suaempresa)</Label>
                <Input
                  placeholder="suaempresa"
                  value={formData.subdomain || ''}
                  onChange={(e) => setFormData({...formData, subdomain: e.target.value})}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Suas credenciais são armazenadas de forma segura e usadas apenas para sincronização.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialog(null)}>Cancelar</Button>
            <Button onClick={handleConnect}>Conectar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
