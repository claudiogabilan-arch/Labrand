import { useState, useEffect, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import {
  Loader2, Save, Plus, Trash2, Building2, Globe, Package, Network,
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ARCH_TYPES = [
  { key: 'mono', label: 'Monolitica', desc: 'Uma marca guarda-chuva para tudo (ex: Virgin, FedEx)' },
  { key: 'endo', label: 'Endossada', desc: 'Sub-marcas apoiadas pela marca mae (ex: Marriott, Nestle)' },
  { key: 'ind', label: 'Independente', desc: 'Marcas totalmente separadas (ex: P&G, Unilever)' },
];

const RELATION_TYPES = [
  { key: 'extensao', label: 'Extensao' },
  { key: 'endossada', label: 'Endossada' },
  { key: 'independente', label: 'Independente' },
  { key: 'parceria', label: 'Parceria' },
];

const PRODUCT_TYPES = [
  { key: 'produto', label: 'Produto' },
  { key: 'servico', label: 'Servico' },
  { key: 'sub_marca', label: 'Sub-marca' },
];

export default function BrandArchitecture() {
  const { currentBrand } = useBrand();
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [arch, setArch] = useState(null);
  const [newProduct, setNewProduct] = useState(null);

  const fetchArch = useCallback(async () => {
    if (!currentBrand?.brand_id) return;
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/architecture`,
        { headers: getAuthHeaders() },
      );
      setArch(data);
    } catch { toast.error('Erro ao carregar arquitetura'); }
    finally { setLoading(false); }
  }, [currentBrand?.brand_id, getAuthHeaders]);

  useEffect(() => { fetchArch(); }, [fetchArch]);

  const handleSave = async (updates) => {
    if (!currentBrand?.brand_id) return;
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${API}/brands/${currentBrand.brand_id}/architecture`,
        updates,
        { headers: getAuthHeaders() },
      );
      setArch(data);
      toast.success('Arquitetura atualizada!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleAddProduct = async () => {
    if (!newProduct?.name) { toast.error('Nome do produto e obrigatorio'); return; }
    setSaving(true);
    try {
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/architecture/products`,
        newProduct,
        { headers: getAuthHeaders() },
      );
      setNewProduct(null);
      await fetchArch();
      toast.success('Produto adicionado!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao adicionar produto');
    } finally { setSaving(false); }
  };

  const handleRemoveProduct = async (productId) => {
    if (!window.confirm('Remover este produto?')) return;
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/architecture/products/${productId}`,
        { headers: getAuthHeaders() },
      );
      await fetchArch();
      toast.success('Produto removido!');
    } catch { toast.error('Erro ao remover'); }
  };

  if (!currentBrand) {
    return (
      <div className="text-center py-12" data-testid="brand-architecture-page">
        <p className="text-muted-foreground">Selecione uma marca para configurar a arquitetura.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="brand-architecture-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="brand-architecture-page">
      <div>
        <h1 className="text-2xl font-bold font-heading">Arquitetura de Marca</h1>
        <p className="text-muted-foreground text-sm">Estrutura, portfolio de produtos e presenca global de {currentBrand.name}</p>
      </div>

      {/* Architecture Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Network className="h-4 w-4" />
            Tipo de Arquitetura
          </CardTitle>
          <CardDescription>Como a marca se relaciona com seus produtos e sub-marcas?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ARCH_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => handleSave({ arch_type: t.key })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  arch?.arch_type === t.key
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-primary/30 hover:bg-muted/50'
                }`}
                data-testid={`arch-type-${t.key}`}
              >
                <div className="font-medium text-sm mb-1">{t.label}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Global Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Presenca Global
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pais Sede</Label>
              <Select value={arch?.hq_country || 'BR'} onValueChange={v => handleSave({ hq_country: v })}>
                <SelectTrigger data-testid="arch-hq"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BR">Brasil</SelectItem>
                  <SelectItem value="US">Estados Unidos</SelectItem>
                  <SelectItem value="PT">Portugal</SelectItem>
                  <SelectItem value="UK">Reino Unido</SelectItem>
                  <SelectItem value="DE">Alemanha</SelectItem>
                  <SelectItem value="OTHER">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="text-sm font-medium">Operacoes Globais</div>
                <div className="text-xs text-muted-foreground">Marca opera em mais de um pais?</div>
              </div>
              <Switch
                checked={arch?.global_ops || false}
                onCheckedChange={v => handleSave({ global_ops: v })}
                data-testid="arch-global-ops"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Portfolio */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Portfolio de Produtos
              </CardTitle>
              <CardDescription>{(arch?.products || []).length} produtos/sub-marcas cadastrados</CardDescription>
            </div>
            <Button size="sm" onClick={() => setNewProduct({ name: '', type: 'produto', relation: 'extensao', ticket_medio: 0, channel: 'ambos', markets: [] })} data-testid="add-product-btn">
              <Plus className="h-4 w-4 mr-1" /> Produto
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* New product form */}
          {newProduct && (
            <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 space-y-3 bg-primary/5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Nome do produto"
                    data-testid="new-product-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={newProduct.type} onValueChange={v => setNewProduct({ ...newProduct, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relacao com Marca</Label>
                  <Select value={newProduct.relation} onValueChange={v => setNewProduct({ ...newProduct, relation: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELATION_TYPES.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ticket Medio (R$)</Label>
                  <Input type="number" value={newProduct.ticket_medio} onChange={e => setNewProduct({ ...newProduct, ticket_medio: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Canal</Label>
                  <Select value={newProduct.channel} onValueChange={v => setNewProduct({ ...newProduct, channel: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setNewProduct(null)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddProduct} disabled={saving} data-testid="save-product-btn">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Existing products */}
          {(arch?.products || []).length === 0 && !newProduct && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum produto cadastrado</p>
              <p className="text-xs">Adicione produtos para mapear o portfolio da marca</p>
            </div>
          )}

          {(arch?.products || []).map(prod => (
            <div key={prod.product_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors" data-testid={`product-${prod.product_id}`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-medium text-sm">{prod.name}</div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] h-5">{prod.type}</Badge>
                    <Badge variant="outline" className="text-[10px] h-5">{prod.relation}</Badge>
                    {prod.ticket_medio > 0 && <span>R$ {prod.ticket_medio}</span>}
                    <span>{prod.channel}</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleRemoveProduct(prod.product_id)} data-testid={`remove-${prod.product_id}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
