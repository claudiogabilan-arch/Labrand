import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { ClipboardCheck, Plus, X, Loader2, CheckCircle2, XCircle, Clock, Target, Lightbulb, BarChart3 } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
  validated: { label: 'Validada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  invalidated: { label: 'Invalidada', color: 'bg-rose-100 text-rose-700', icon: XCircle }
};

export const Scorecard = () => {
  const { currentBrand, fetchDecisions, createDecision, updateDecision } = useBrand();
  const [decisions, setDecisions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [newDecision, setNewDecision] = useState({
    title: '',
    contexto: '',
    hipoteses: [],
    evidencias: [],
    impacto_esperado: '',
    resultado_real: '',
    status: 'pending'
  });
  const [newHipotese, setNewHipotese] = useState('');
  const [newEvidencia, setNewEvidencia] = useState('');

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadDecisions();
    }
  }, [currentBrand?.brand_id]);

  const loadDecisions = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDecisions(currentBrand.brand_id);
      setDecisions(data || []);
    } catch (error) {
      console.error('Error loading decisions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addHipotese = () => {
    if (!newHipotese.trim()) return;
    setNewDecision(prev => ({ ...prev, hipoteses: [...prev.hipoteses, newHipotese.trim()] }));
    setNewHipotese('');
  };

  const removeHipotese = (index) => {
    setNewDecision(prev => ({ ...prev, hipoteses: prev.hipoteses.filter((_, i) => i !== index) }));
  };

  const addEvidencia = () => {
    if (!newEvidencia.trim()) return;
    setNewDecision(prev => ({ ...prev, evidencias: [...prev.evidencias, newEvidencia.trim()] }));
    setNewEvidencia('');
  };

  const removeEvidencia = (index) => {
    setNewDecision(prev => ({ ...prev, evidencias: prev.evidencias.filter((_, i) => i !== index) }));
  };

  const handleCreateDecision = async () => {
    if (!newDecision.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setIsCreating(true);
    try {
      const created = await createDecision(currentBrand.brand_id, newDecision);
      setDecisions(prev => [...prev, created]);
      setNewDecision({
        title: '',
        contexto: '',
        hipoteses: [],
        evidencias: [],
        impacto_esperado: '',
        resultado_real: '',
        status: 'pending'
      });
      setDialogOpen(false);
      toast.success('Decisão registrada!');
    } catch (error) {
      toast.error('Erro ao criar decisão');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (decisionId, newStatus) => {
    try {
      await updateDecision(currentBrand.brand_id, decisionId, { status: newStatus });
      setDecisions(prev => prev.map(d => d.decision_id === decisionId ? { ...d, status: newStatus } : d));
      toast.success('Status atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleResultadoUpdate = async (decisionId, resultado) => {
    try {
      await updateDecision(currentBrand.brand_id, decisionId, { resultado_real: resultado });
      setDecisions(prev => prev.map(d => d.decision_id === decisionId ? { ...d, resultado_real: resultado } : d));
      toast.success('Resultado atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar resultado');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  const stats = {
    total: decisions.length,
    pending: decisions.filter(d => d.status === 'pending').length,
    validated: decisions.filter(d => d.status === 'validated').length,
    invalidated: decisions.filter(d => d.status === 'invalidated').length
  };

  return (
    <div className="space-y-6" data-testid="scorecard-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Scorecard & Decisões</h1>
            <p className="text-muted-foreground">Registre e valide decisões estratégicas</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-decision-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nova Decisão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registrar Decisão</DialogTitle>
              <DialogDescription>Documente uma decisão estratégica com contexto e hipóteses</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título da Decisão *</Label>
                <Input
                  value={newDecision.title}
                  onChange={(e) => setNewDecision(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Mudança de posicionamento"
                  data-testid="decision-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Contexto</Label>
                <Textarea
                  value={newDecision.contexto}
                  onChange={(e) => setNewDecision(prev => ({ ...prev, contexto: e.target.value }))}
                  placeholder="Descreva o contexto da decisão..."
                  rows={3}
                  data-testid="decision-context-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Hipóteses</Label>
                <div className="flex gap-2">
                  <Input
                    value={newHipotese}
                    onChange={(e) => setNewHipotese(e.target.value)}
                    placeholder="Adicionar hipótese..."
                    onKeyPress={(e) => e.key === 'Enter' && addHipotese()}
                    data-testid="decision-hipotese-input"
                  />
                  <Button type="button" onClick={addHipotese} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newDecision.hipoteses.map((h, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {h}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeHipotese(i)} />
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Evidências</Label>
                <div className="flex gap-2">
                  <Input
                    value={newEvidencia}
                    onChange={(e) => setNewEvidencia(e.target.value)}
                    placeholder="Adicionar evidência..."
                    onKeyPress={(e) => e.key === 'Enter' && addEvidencia()}
                    data-testid="decision-evidencia-input"
                  />
                  <Button type="button" onClick={addEvidencia} variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newDecision.evidencias.map((e, i) => (
                    <Badge key={i} variant="outline" className="gap-1">
                      {e}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeEvidencia(i)} />
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Impacto Esperado</Label>
                <Textarea
                  value={newDecision.impacto_esperado}
                  onChange={(e) => setNewDecision(prev => ({ ...prev, impacto_esperado: e.target.value }))}
                  placeholder="Qual impacto você espera?"
                  rows={2}
                  data-testid="decision-impact-input"
                />
              </div>
              <Button onClick={handleCreateDecision} disabled={isCreating} className="w-full" data-testid="create-decision-btn">
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Registrar Decisão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.validated}</p>
                <p className="text-xs text-muted-foreground">Validadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.invalidated}</p>
                <p className="text-xs text-muted-foreground">Invalidadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Decisions List */}
      <div className="space-y-4">
        {decisions.map(decision => {
          const StatusIcon = statusConfig[decision.status]?.icon || Clock;
          return (
            <Card key={decision.decision_id} data-testid={`decision-card-${decision.decision_id}`}>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-lg">{decision.title}</h3>
                        {decision.contexto && (
                          <p className="text-sm text-muted-foreground mt-1">{decision.contexto}</p>
                        )}
                      </div>
                      <Badge className={statusConfig[decision.status]?.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[decision.status]?.label}
                      </Badge>
                    </div>

                    {decision.hipoteses?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-amber-500" />
                          Hipóteses
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {decision.hipoteses.map((h, i) => (
                            <Badge key={i} variant="secondary">{h}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {decision.evidencias?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          Evidências
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {decision.evidencias.map((e, i) => (
                            <Badge key={i} variant="outline">{e}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {decision.impacto_esperado && (
                        <div className="p-3 border rounded-lg bg-muted/30">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Impacto Esperado</p>
                          <p className="text-sm">{decision.impacto_esperado}</p>
                        </div>
                      )}
                      <div className="p-3 border rounded-lg bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Resultado Real</p>
                        <Input
                          value={decision.resultado_real || ''}
                          onChange={(e) => handleResultadoUpdate(decision.decision_id, e.target.value)}
                          placeholder="Registre o resultado..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-2">
                    <Button
                      variant={decision.status === 'validated' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(decision.decision_id, 'validated')}
                      className="flex-1 lg:flex-none"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Validar
                    </Button>
                    <Button
                      variant={decision.status === 'invalidated' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(decision.decision_id, 'invalidated')}
                      className="flex-1 lg:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Invalidar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {decisions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma decisão registrada ainda</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar primeira decisão
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Scorecard;
