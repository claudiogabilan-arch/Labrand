import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';
import { Palette, Save, Loader2, RotateCcw, Upload, Eye, X } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PRESET_PALETTES = [
  { name: 'Azul Corporativo', primary: '#1E40AF', accent: '#3B82F6', sidebar: '#0F172A', sidebarText: '#E2E8F0' },
  { name: 'Verde Natureza', primary: '#065F46', accent: '#10B981', sidebar: '#064E3B', sidebarText: '#D1FAE5' },
  { name: 'Roxo Premium', primary: '#5B21B6', accent: '#8B5CF6', sidebar: '#1E1B4B', sidebarText: '#E0E7FF' },
  { name: 'Vermelho Energia', primary: '#991B1B', accent: '#EF4444', sidebar: '#1C1917', sidebarText: '#FEE2E2' },
  { name: 'Laranja Criativo', primary: '#9A3412', accent: '#F97316', sidebar: '#1C1917', sidebarText: '#FFEDD5' },
  { name: 'Rose Elegante', primary: '#9D174D', accent: '#EC4899', sidebar: '#1C1917', sidebarText: '#FCE7F3' },
];

export default function WhiteLabelSettings() {
  const { getAuthHeaders } = useAuth();
  const { currentBrand } = useBrand();
  const { config, refreshConfig } = useWhiteLabel();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [form, setForm] = useState({
    primary_color: '',
    accent_color: '',
    sidebar_color: '',
    sidebar_text_color: '',
    button_radius: '0.5rem',
  });

  useEffect(() => {
    if (config) {
      setForm({
        primary_color: config.primary_color || '',
        accent_color: config.accent_color || '',
        sidebar_color: config.sidebar_color || '',
        sidebar_text_color: config.sidebar_text_color || '',
        button_radius: config.button_radius || '0.5rem',
      });
    }
  }, [config]);

  const handleSave = async () => {
    if (!currentBrand?.brand_id) return;
    setSaving(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([key, val]) => {
        if (val) payload[key] = val;
      });
      await axios.put(
        `${API}/brands/${currentBrand.brand_id}/white-label`,
        payload,
        { headers: getAuthHeaders() }
      );
      toast.success('White-label salvo com sucesso!');
      refreshConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar white-label');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!currentBrand?.brand_id) return;
    if (!window.confirm('Isso vai resetar todas as configuracoes visuais para o padrao. Continuar?')) return;
    setSaving(true);
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/white-label`,
        { headers: getAuthHeaders() }
      );
      toast.success('White-label resetado!');
      setForm({ primary_color: '', accent_color: '', sidebar_color: '', sidebar_text_color: '', button_radius: '0.5rem' });
      refreshConfig();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao resetar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentBrand?.brand_id) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Maximo: 5MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await axios.post(
        `${API}/brands/${currentBrand.brand_id}/logo`,
        formData,
        { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } }
      );
      toast.success('Logo atualizado!');
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao enviar logo');
    } finally {
      setUploading(false);
    }
  };

  const applyPalette = (palette) => {
    setForm({
      primary_color: palette.primary,
      accent_color: palette.accent,
      sidebar_color: palette.sidebar,
      sidebar_text_color: palette.sidebarText,
      button_radius: form.button_radius,
    });
  };

  if (!currentBrand) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <Palette className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Selecione uma marca para configurar o white-label</p>
        </CardContent>
      </Card>
    );
  }

  const brandLogo = currentBrand.logo_url
    ? `${process.env.REACT_APP_BACKEND_URL}${currentBrand.logo_url}`
    : null;

  return (
    <div className="space-y-6" data-testid="white-label-settings">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={config?.enabled ? 'default' : 'secondary'} data-testid="wl-status-badge">
            {config?.enabled ? 'Ativo' : 'Inativo'}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Personalizacao visual para <strong>{currentBrand.name}</strong>
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} data-testid="wl-preview-btn">
            {showPreview ? <X className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showPreview ? 'Fechar Preview' : 'Preview'}
          </Button>
          {config?.enabled && (
            <Button variant="outline" size="sm" onClick={handleReset} data-testid="wl-reset-btn">
              <RotateCcw className="h-4 w-4 mr-1" />
              Resetar
            </Button>
          )}
        </div>
      </div>

      {/* Live Preview */}
      {showPreview && (
        <Card className="overflow-hidden" data-testid="wl-preview-card">
          <div className="flex h-48">
            {/* Sidebar preview */}
            <div
              className="w-48 p-4 flex flex-col gap-3"
              style={{
                backgroundColor: form.sidebar_color || '#0F172A',
                color: form.sidebar_text_color || '#E2E8F0',
              }}
            >
              {brandLogo ? (
                <img src={brandLogo} alt="Logo" className="h-8 w-auto object-contain" />
              ) : (
                <div className="h-8 w-24 rounded bg-white/20" />
              )}
              <div className="space-y-1.5 mt-2">
                {['Dashboard', 'Pilares', 'Relatorios'].map((item) => (
                  <div
                    key={item}
                    className="text-xs px-2 py-1.5 rounded opacity-80 hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: item === 'Dashboard' ? (form.accent_color || '#3B82F6') + '30' : 'transparent' }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {/* Content preview */}
            <div className="flex-1 p-4 bg-background">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">{currentBrand.name}</div>
                <div
                  className="h-6 w-6 rounded-full"
                  style={{ backgroundColor: form.primary_color || '#1E40AF' }}
                />
              </div>
              <div className="flex gap-2 mb-3">
                <button
                  className="text-xs text-white px-3 py-1.5 font-medium"
                  style={{
                    backgroundColor: form.primary_color || '#1E40AF',
                    borderRadius: form.button_radius || '0.5rem',
                  }}
                >
                  Botao Primario
                </button>
                <button
                  className="text-xs px-3 py-1.5 border font-medium"
                  style={{
                    borderColor: form.accent_color || '#3B82F6',
                    color: form.accent_color || '#3B82F6',
                    borderRadius: form.button_radius || '0.5rem',
                  }}
                >
                  Botao Secundario
                </button>
              </div>
              <div className="flex gap-2">
                <div className="h-16 flex-1 rounded-lg" style={{ backgroundColor: (form.accent_color || '#3B82F6') + '15' }} />
                <div className="h-16 flex-1 rounded-lg" style={{ backgroundColor: (form.primary_color || '#1E40AF') + '10' }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logo da Marca</CardTitle>
            <CardDescription>O logo aparece no sidebar e header da plataforma</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={currentBrand.name}
                  className="h-16 w-auto max-w-[200px] object-contain border rounded-lg p-2"
                  data-testid="wl-current-logo"
                />
              ) : (
                <div className="h-16 w-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                  <span className="text-xs">Sem logo</span>
                </div>
              )}
              <div>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={uploading}>
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                      {brandLogo ? 'Trocar Logo' : 'Enviar Logo'}
                    </span>
                  </Button>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                    data-testid="wl-logo-upload"
                  />
                </label>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP, SVG (max 5MB)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paletas Rapidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paletas Rapidas</CardTitle>
            <CardDescription>Selecione uma paleta predefinida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_PALETTES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPalette(p)}
                  className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/50 transition-colors text-left"
                  data-testid={`palette-${p.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex -space-x-1">
                    <div className="w-5 h-5 rounded-full border-2 border-background" style={{ backgroundColor: p.primary }} />
                    <div className="w-5 h-5 rounded-full border-2 border-background" style={{ backgroundColor: p.accent }} />
                    <div className="w-5 h-5 rounded-full border-2 border-background" style={{ backgroundColor: p.sidebar }} />
                  </div>
                  <span className="text-xs font-medium truncate">{p.name}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Color Pickers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cores Customizadas</CardTitle>
          <CardDescription>Defina as cores exatas da identidade visual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <ColorField
              label="Cor Primaria"
              description="Botoes, links, destaques"
              value={form.primary_color}
              onChange={(v) => setForm({ ...form, primary_color: v })}
              testId="wl-primary-color"
            />
            <ColorField
              label="Cor de Destaque"
              description="Badges, indicadores, hover"
              value={form.accent_color}
              onChange={(v) => setForm({ ...form, accent_color: v })}
              testId="wl-accent-color"
            />
            <ColorField
              label="Fundo do Sidebar"
              description="Background da navegacao"
              value={form.sidebar_color}
              onChange={(v) => setForm({ ...form, sidebar_color: v })}
              testId="wl-sidebar-color"
            />
            <ColorField
              label="Texto do Sidebar"
              description="Cor dos itens de menu"
              value={form.sidebar_text_color}
              onChange={(v) => setForm({ ...form, sidebar_text_color: v })}
              testId="wl-sidebar-text-color"
            />
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Arredondamento dos Botoes</Label>
              <div className="flex gap-2">
                {[
                  { value: '0', label: 'Reto' },
                  { value: '0.375rem', label: 'Suave' },
                  { value: '0.5rem', label: 'Medio' },
                  { value: '0.75rem', label: 'Arredondado' },
                  { value: '9999px', label: 'Pill' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, button_radius: opt.value })}
                    className={`text-xs px-3 py-1.5 border transition-colors ${
                      form.button_radius === opt.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                    style={{ borderRadius: opt.value }}
                    data-testid={`wl-radius-${opt.label.toLowerCase()}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSave} disabled={saving} data-testid="wl-save-btn">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar White-Label
        </Button>
      </div>
    </div>
  );
}

function ColorField({ label, description, value, onChange, testId }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border"
            data-testid={`${testId}-picker`}
          />
        </div>
        <Input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 font-mono text-sm"
          data-testid={`${testId}-input`}
        />
      </div>
    </div>
  );
}
