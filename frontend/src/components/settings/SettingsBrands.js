import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrand } from '../../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Building2, Plus, Pencil, Trash2, Save, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const industries = [
  'Tecnologia', 'Saude', 'Educacao', 'Varejo', 'Alimentacao',
  'Moda', 'Servicos Financeiros', 'Entretenimento', 'Imobiliario',
  'Consultoria', 'Marketing', 'Industria', 'Outro'
];

const brandTypes = [
  { value: 'monolitica', label: 'Monolitica', desc: 'Marca unica para todos os produtos/servicos' },
  { value: 'endossada', label: 'Endossada', desc: 'Submarca com endosso da marca mae' },
  { value: 'submarca', label: 'Submarca', desc: 'Marca filha vinculada a uma marca mae' },
  { value: 'hibrida', label: 'Hibrida', desc: 'Combinacao de diferentes estrategias' },
  { value: 'house_of_brands', label: 'House of Brands', desc: 'Grupo de marcas independentes' }
];

const brandColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function SettingsBrands() {
  const { getAuthHeaders } = useAuth();
  const { brands, currentBrand, updateBrand, createBrand } = useBrand();
  const [isSaving, setIsSaving] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [deletingBrand, setDeletingBrand] = useState(null);
  const [brandForm, setBrandForm] = useState({
    name: '', description: '', industry: '',
    brand_type: 'monolitica', parent_brand_id: '', brand_color: '#3B82F6'
  });

  const parentBrandOptions = brands.filter(b =>
    b.brand_id !== editingBrand?.brand_id &&
    (b.brand_type === 'monolitica' || b.brand_type === 'house_of_brands' || b.brand_type === 'hibrida')
  );

  const handleSaveBrand = async () => {
    if (!brandForm.name.trim()) { toast.error('Nome da marca e obrigatorio'); return; }
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
      setBrandForm({ name: '', description: '', industry: '', brand_type: 'monolitica', parent_brand_id: '', brand_color: '#3B82F6' });
    } catch { toast.error('Erro ao salvar marca'); }
    finally { setIsSaving(false); }
  };

  const handleEditBrand = (brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name, description: brand.description || '', industry: brand.industry || '',
      brand_type: brand.brand_type || 'monolitica', parent_brand_id: brand.parent_brand_id || '',
      brand_color: brand.brand_color || '#3B82F6'
    });
  };

  const handleDeleteBrand = async (brand) => {
    try {
      await axios.delete(`${API}/brands/${brand.brand_id}`, { headers: getAuthHeaders(), withCredentials: true });
      toast.success('Marca excluida com sucesso!');
      setDeletingBrand(null);
      window.location.reload();
    } catch { toast.error('Erro ao excluir marca'); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Gerenciar Marcas</CardTitle>
            <CardDescription>Crie e edite suas marcas</CardDescription>
          </div>
          <Button onClick={() => { setEditingBrand(null); setBrandForm({ name: '', description: '', industry: '', brand_type: 'monolitica', parent_brand_id: '', brand_color: '#3B82F6' }); }} data-testid="new-brand-settings-btn">
            <Plus className="h-4 w-4 mr-2" /> Nova Marca
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Form */}
        <div className="p-4 border rounded-lg bg-muted/30 space-y-4">
          <h4 className="font-medium">{editingBrand ? 'Editar Marca' : 'Nova Marca'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Marca *</Label>
              <Input value={brandForm.name} onChange={(e) => setBrandForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome da marca" data-testid="brand-form-name" />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={brandForm.industry} onValueChange={(v) => setBrandForm(p => ({ ...p, industry: v }))}>
                <SelectTrigger data-testid="brand-form-industry"><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>{industries.map(ind => <SelectItem key={ind} value={ind}>{ind}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Arquitetura de Marca *</Label>
              <Select value={brandForm.brand_type} onValueChange={(v) => setBrandForm(p => ({ ...p, brand_type: v, parent_brand_id: v === 'submarca' || v === 'endossada' ? p.parent_brand_id : '' }))}>
                <SelectTrigger data-testid="brand-form-type"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {brandTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div><span className="font-medium">{type.label}</span><span className="text-xs text-muted-foreground ml-2">- {type.desc}</span></div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(brandForm.brand_type === 'submarca' || brandForm.brand_type === 'endossada') && (
              <div className="space-y-2 md:col-span-2">
                <Label>Marca Mae *</Label>
                <Select value={brandForm.parent_brand_id} onValueChange={(v) => setBrandForm(p => ({ ...p, parent_brand_id: v }))}>
                  <SelectTrigger data-testid="brand-form-parent"><SelectValue placeholder="Selecione a marca mae" /></SelectTrigger>
                  <SelectContent>{parentBrandOptions.map(brand => <SelectItem key={brand.brand_id} value={brand.brand_id}>{brand.name}</SelectItem>)}</SelectContent>
                </Select>
                {parentBrandOptions.length === 0 && <p className="text-xs text-amber-600">Crie uma marca principal primeiro</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label>Cor da Marca</Label>
              <div className="flex flex-wrap gap-2">
                {brandColors.map(color => (
                  <button key={color} type="button" onClick={() => setBrandForm(p => ({ ...p, brand_color: color }))}
                    className={`w-8 h-8 rounded-lg transition-all ${brandForm.brand_color === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''}`}
                    style={{ backgroundColor: color }} data-testid={`color-${color}`} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo da Marca</Label>
              <div className="flex items-center gap-4">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !editingBrand) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Maximo: 5MB'); return; }
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      await axios.post(`${API}/brands/${editingBrand.brand_id}/logo`, formData, {
                        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                      });
                      toast.success('Logo enviado!');
                      window.location.reload();
                    } catch (err) { toast.error(err.response?.data?.detail || 'Erro ao enviar logo'); }
                  }}
                  className="text-sm" disabled={!editingBrand} />
                <p className="text-xs text-muted-foreground mt-1">Formatos: JPG, PNG, WebP, SVG (max. 5MB)</p>
                {!editingBrand && <span className="text-xs text-amber-600">Salve a marca primeiro para enviar o logo</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea value={brandForm.description} onChange={(e) => setBrandForm(p => ({ ...p, description: e.target.value }))} placeholder="Descricao da marca" rows={2} data-testid="brand-form-description" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSaveBrand} disabled={isSaving} data-testid="save-brand-btn">
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingBrand ? 'Atualizar' : 'Criar'} Marca
            </Button>
            {editingBrand && (
              <Button variant="outline" onClick={() => { setEditingBrand(null); setBrandForm({ name: '', description: '', industry: '', brand_type: 'monolitica', parent_brand_id: '', brand_color: '#3B82F6' }); }}>Cancelar</Button>
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
              <div key={brand.brand_id} className={`flex items-center justify-between p-4 border rounded-lg ${currentBrand?.brand_id === brand.brand_id ? 'border-primary bg-primary/5' : ''}`}>
                <div className="flex items-center gap-3">
                  {brand.logo_url ? (
                    <img src={`${process.env.REACT_APP_BACKEND_URL}${brand.logo_url}`} alt={brand.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.brand_color || '#3B82F6' }}>
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{brand.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mb-1">ID: {brand.brand_id}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {brand.industry && <Badge variant="outline" className="text-xs">{brand.industry}</Badge>}
                      {brandType && <Badge variant="secondary" className="text-xs">{brandType.label}</Badge>}
                      {parentBrand && <Badge variant="outline" className="text-xs bg-amber-50">Mae: {parentBrand.name}</Badge>}
                      {currentBrand?.brand_id === brand.brand_id && <Badge className="text-xs">Ativa</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditBrand(brand)} data-testid={`edit-brand-${brand.brand_id}`}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeletingBrand(brand)} data-testid={`delete-brand-${brand.brand_id}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
          {brands.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma marca cadastrada</p>}
        </div>

        {/* Delete Confirmation */}
        {deletingBrand && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-lg max-w-md w-full mx-4 space-y-4">
              <h3 className="font-bold text-lg">Excluir Marca</h3>
              <p className="text-muted-foreground">Tem certeza que deseja excluir <strong>{deletingBrand.name}</strong>? Esta acao nao pode ser desfeita.</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDeletingBrand(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={() => handleDeleteBrand(deletingBrand)} data-testid="confirm-delete-brand">
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
