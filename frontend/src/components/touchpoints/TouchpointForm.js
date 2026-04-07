import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Slider } from '../ui/slider';
import { Plus, Loader2, Monitor, Building2, DollarSign, Info, Clock } from 'lucide-react';
import { FUNNEL_PHASES, ENVIRONMENTS, SENTIMENTS, OFFLINE_TYPE_ICONS, getScoreColor, getROIColor } from './touchpointConstants';

export default function TouchpointForm({
  dialogOpen, setDialogOpen, editingTouchpoint, formData, setFormData,
  saving, onSubmit, onReset, personas, offlineTypes
}) {
  const handleAmbienteChange = (val) => {
    setFormData(prev => ({ ...prev, ambiente: val, tipo_offline: val === 'Online' ? '' : prev.tipo_offline }));
  };

  const handleOfflineTypeChange = (typeId) => {
    const typeDef = offlineTypes.find(t => t.id === typeId);
    if (typeDef) {
      setFormData(prev => ({
        ...prev, tipo_offline: typeId,
        fase_funil: typeDef.default_fase_funil,
        nome: prev.nome || typeDef.nome_exemplo
      }));
    }
  };

  const selectedOfflineType = offlineTypes.find(t => t.id === formData.tipo_offline);

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) onReset(); }}>
      <DialogTrigger asChild>
        <Button data-testid="add-touchpoint-btn">
          <Plus className="h-4 w-4 mr-2" /> Novo Touchpoint
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTouchpoint ? 'Editar' : 'Novo'} Touchpoint</DialogTitle>
          <DialogDescription>Configure o ponto de contato com o cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select value={formData.ambiente} onValueChange={handleAmbienteChange}>
                <SelectTrigger data-testid="ambiente-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map(env => (
                    <SelectItem key={env} value={env}>
                      {env === 'Online' ? <Monitor className="h-4 w-4 inline mr-2" /> : <Building2 className="h-4 w-4 inline mr-2" />}
                      {env}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {formData.ambiente === 'Offline' && (
              <div className="space-y-2">
                <Label>Tipo de Acao Offline *</Label>
                <Select value={formData.tipo_offline} onValueChange={handleOfflineTypeChange}>
                  <SelectTrigger data-testid="offline-type-select"><SelectValue placeholder="Selecione o tipo..." /></SelectTrigger>
                  <SelectContent>
                    {offlineTypes.map(type => {
                      const TypeIcon = OFFLINE_TYPE_ICONS[type.id] || Building2;
                      return (
                        <SelectItem key={type.id} value={type.id}>
                          <span className="flex items-center gap-2"><TypeIcon className="h-4 w-4" />{type.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {formData.ambiente === 'Offline' && !formData.tipo_offline && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200" data-testid="offline-orientation-banner">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Voce esta registrando uma acao presencial. Selecione o tipo de acao offline para preencher automaticamente os campos recomendados.</span>
            </div>
          )}

          {selectedOfflineType && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-800 text-sm dark:bg-cyan-950/30 dark:border-cyan-800 dark:text-cyan-200" data-testid="offline-type-guidance">
              <Clock className="h-4 w-4 mt-0.5 shrink-0" />
              <div><p className="font-medium mb-1">{selectedOfflineType.label}</p><p>{selectedOfflineType.orientacao}</p></div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome * {selectedOfflineType && <span className="text-xs text-muted-foreground ml-1">(Ex: {selectedOfflineType.nome_exemplo})</span>}</Label>
            <Input placeholder={selectedOfflineType ? selectedOfflineType.nome_exemplo : "Ex: Anuncio no Instagram"} value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })} data-testid="touchpoint-name-input" />
          </div>

          {formData.tipo_offline === 'tv' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Emissora / Canal *</Label>
                <Input placeholder="Ex: TV Cultura, Globo, Band" value={formData.emissora || ''}
                  onChange={(e) => setFormData({ ...formData, emissora: e.target.value })} data-testid="emissora-input" />
              </div>
              <div className="space-y-2">
                <Label>Dia e Horario *</Label>
                <Input placeholder="Ex: Seg 22h, 15/03/2025 20h" value={formData.dia_horario || ''}
                  onChange={(e) => setFormData({ ...formData, dia_horario: e.target.value })} data-testid="dia-horario-input" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descricao {selectedOfflineType?.dicas?.descricao && <span className="text-xs text-muted-foreground ml-1">({selectedOfflineType.dicas.descricao})</span>}</Label>
            <Textarea placeholder={selectedOfflineType?.dicas?.descricao || "Detalhes sobre este touchpoint..."} value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} rows={2} data-testid="touchpoint-desc-input" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fase do Funil {selectedOfflineType && <Badge variant="secondary" className="ml-1 text-xs">{selectedOfflineType.default_fase_funil}</Badge>}</Label>
              <Select value={formData.fase_funil} onValueChange={(v) => setFormData({ ...formData, fase_funil: v })}>
                <SelectTrigger data-testid="fase-funil-select"><SelectValue /></SelectTrigger>
                <SelectContent>{FUNNEL_PHASES.map(phase => <SelectItem key={phase} value={phase}>{phase}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Persona</Label>
              <Select value={formData.persona} onValueChange={(v) => setFormData({ ...formData, persona: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{personas.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sentimento Predominante {selectedOfflineType && <span className="text-xs text-muted-foreground ml-1">(baseado no feedback recebido)</span>}</Label>
            <div className="grid grid-cols-4 gap-2">
              {SENTIMENTS.map(s => {
                const Icon = s.icon;
                return (
                  <Button key={s.value} type="button" variant={formData.sentimento === s.value ? 'default' : 'outline'} size="sm"
                    onClick={() => setFormData({ ...formData, sentimento: s.value })} className="flex flex-col h-auto py-2"
                    data-testid={`sentiment-${s.value.toLowerCase()}`}>
                    <Icon className={`h-5 w-5 mb-1 ${formData.sentimento === s.value ? '' : s.color}`} />
                    <span className="text-xs">{s.value}</span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Nota de Avaliacao {selectedOfflineType?.dicas?.nota && <span className="text-xs text-muted-foreground ml-1">({selectedOfflineType.dicas.nota})</span>}</Label>
              <span className={`text-2xl font-bold ${getScoreColor(formData.nota).text}`}>{formData.nota}</span>
            </div>
            <Slider value={[formData.nota]} onValueChange={(v) => setFormData({ ...formData, nota: v[0] })} min={0} max={10} step={1} className="py-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="text-red-500">0 - Critico</span>
              <span className="text-yellow-500">5 - Neutro</span>
              <span className="text-green-500">10 - Excelente</span>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><DollarSign className="h-4 w-4" /> Dados Financeiros (ROI)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Custo Mensal (R$) {selectedOfflineType?.dicas?.custo_mensal && <span className="block text-muted-foreground mt-0.5">{selectedOfflineType.dicas.custo_mensal}</span>}</Label>
                <Input type="number" min="0" value={formData.custo_mensal} data-testid="custo-input"
                  onChange={(e) => setFormData({ ...formData, custo_mensal: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Receita Gerada (R$) {selectedOfflineType?.dicas?.receita_gerada && <span className="block text-muted-foreground mt-0.5">{selectedOfflineType.dicas.receita_gerada}</span>}</Label>
                <Input type="number" min="0" value={formData.receita_gerada} data-testid="receita-input"
                  onChange={(e) => setFormData({ ...formData, receita_gerada: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Conversoes {selectedOfflineType?.dicas?.conversoes && <span className="block text-muted-foreground mt-0.5">{selectedOfflineType.dicas.conversoes}</span>}</Label>
                <Input type="number" min="0" value={formData.conversoes} data-testid="conversoes-input"
                  onChange={(e) => setFormData({ ...formData, conversoes: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            {formData.custo_mensal > 0 && (
              <p className={`text-sm mt-2 ${getROIColor(((formData.receita_gerada - formData.custo_mensal) / formData.custo_mensal * 100))}`}>
                ROI Estimado: {(((formData.receita_gerada - formData.custo_mensal) / formData.custo_mensal) * 100).toFixed(1)}%
              </p>
            )}
          </div>

          {formData.ambiente === 'Offline' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs dark:bg-slate-950/30 dark:border-slate-700 dark:text-slate-300" data-testid="offline-save-reminder">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Para que esse touchpoint apareca corretamente no Brand Tracking, preencha todos os campos antes do evento. As metricas de resultado (receita, conversoes, nota) podem ser atualizadas em ate 48h depois.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving} data-testid="save-touchpoint-btn">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editingTouchpoint ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
