import { useState, useEffect, useCallback, useRef } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { PillarNavigation } from '../components/PillarNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Slider } from '../components/ui/slider';
import { toast } from 'sonner';
import { Globe, Plus, X, Loader2, Save, Eye, Users, AlertTriangle, CheckCircle2 } from 'lucide-react';

const accessibilityItems = [
  { id: 'contraste', label: 'Alto contraste de cores', category: 'Visual' },
  { id: 'fontes', label: 'Fontes legíveis e escaláveis', category: 'Visual' },
  { id: 'alt_text', label: 'Textos alternativos em imagens', category: 'Visual' },
  { id: 'screen_reader', label: 'Compatibilidade com leitores de tela', category: 'Tecnologia' },
  { id: 'keyboard', label: 'Navegação por teclado', category: 'Tecnologia' },
  { id: 'captions', label: 'Legendas em vídeos', category: 'Conteúdo' },
  { id: 'plain_language', label: 'Linguagem simples e clara', category: 'Conteúdo' },
  { id: 'multiple_formats', label: 'Conteúdo em múltiplos formatos', category: 'Conteúdo' }
];

const inclusionItems = [
  { id: 'diversidade', label: 'Representatividade visual diversa', category: 'Imagem' },
  { id: 'linguagem_inclusiva', label: 'Linguagem inclusiva e neutra', category: 'Comunicação' },
  { id: 'precos_acessiveis', label: 'Opções de preço acessíveis', category: 'Produto' },
  { id: 'localizacao', label: 'Múltiplos idiomas/regionalizações', category: 'Alcance' },
  { id: 'comunidade', label: 'Engajamento com comunidades diversas', category: 'Relacionamento' },
  { id: 'fornecedores', label: 'Cadeia de fornecedores inclusiva', category: 'Operação' }
];

export const PillarUniversality = () => {
  const { currentBrand, fetchPillar, updatePillar } = useBrand();
  const [data, setData] = useState({
    checklist_acessibilidade: [],
    checklist_inclusao: [],
    plano_crises: [],
    viabilidade_curto: 50,
    viabilidade_medio: 50,
    viabilidade_longo: 50
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCrise, setNewCrise] = useState({ tipo: '', descricao: '', acao: '' });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) loadData();
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'universality');
      if (pillarData && Object.keys(pillarData).length > 0) {
        setData(prev => ({ ...prev, ...pillarData }));
      }
    } catch (error) {
      console.error('Error loading pillar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSave = useCallback(async (newData) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updatePillar(currentBrand.brand_id, 'universality', newData);
      } catch (error) {
        console.error('Autosave error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [currentBrand?.brand_id, updatePillar]);

  const toggleChecklistItem = (type, itemId) => {
    const field = type === 'acessibilidade' ? 'checklist_acessibilidade' : 'checklist_inclusao';
    const currentList = data[field] || [];
    const existingIndex = currentList.findIndex(i => i.id === itemId);
    
    let newList;
    if (existingIndex >= 0) {
      newList = currentList.map((item, idx) => 
        idx === existingIndex ? { ...item, checked: !item.checked } : item
      );
    } else {
      newList = [...currentList, { id: itemId, checked: true }];
    }
    
    const newData = { ...data, [field]: newList };
    setData(newData);
    autoSave(newData);
  };

  const isItemChecked = (type, itemId) => {
    const field = type === 'acessibilidade' ? 'checklist_acessibilidade' : 'checklist_inclusao';
    const item = (data[field] || []).find(i => i.id === itemId);
    return item?.checked || false;
  };

  const handleViabilidadeChange = (field, value) => {
    const newData = { ...data, [field]: value[0] };
    setData(newData);
    autoSave(newData);
  };

  const addCrise = () => {
    if (!newCrise.tipo.trim()) return;
    const newList = [...(data.plano_crises || []), { ...newCrise }];
    const newData = { ...data, plano_crises: newList };
    setData(newData);
    setNewCrise({ tipo: '', descricao: '', acao: '' });
    autoSave(newData);
  };

  const removeCrise = (index) => {
    const newList = data.plano_crises.filter((_, i) => i !== index);
    const newData = { ...data, plano_crises: newList };
    setData(newData);
    autoSave(newData);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'universality', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    const accessChecked = (data.checklist_acessibilidade || []).filter(i => i.checked).length;
    const inclusionChecked = (data.checklist_inclusao || []).filter(i => i.checked).length;
    const totalChecklist = accessibilityItems.length + inclusionItems.length;
    const checklistScore = ((accessChecked + inclusionChecked) / totalChecklist) * 50;
    const crisisScore = data.plano_crises?.length > 0 ? 25 : 0;
    const viabilityScore = 25;
    return Math.round(checklistScore + crisisScore + viabilityScore);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  return (
    <div className="space-y-6" data-testid="pillar-universality">
      <PillarNavigation />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Universalidade</h1>
            <p className="text-muted-foreground">Acessibilidade, inclusão e gestão de crises</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Progress value={calculateProgress()} className="w-24 h-2" />
            <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
          </div>
          {isSaving && <Badge variant="outline" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Salvando...</Badge>}
          <Button onClick={handleSave} disabled={isSaving} data-testid="save-btn"><Save className="h-4 w-4 mr-2" />Salvar</Button>
        </div>
      </div>

      <Tabs defaultValue="acessibilidade" className="space-y-6">
        <TabsList>
          <TabsTrigger value="acessibilidade">Acessibilidade</TabsTrigger>
          <TabsTrigger value="inclusao">Inclusão</TabsTrigger>
          <TabsTrigger value="crises">Gestão de Crises</TabsTrigger>
          <TabsTrigger value="viabilidade">Viabilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="acessibilidade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Checklist de Acessibilidade
              </CardTitle>
              <CardDescription>Garanta que sua marca seja acessível a todos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Visual', 'Tecnologia', 'Conteúdo'].map(category => (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-3">{category}</h4>
                    <div className="space-y-3">
                      {accessibilityItems.filter(i => i.category === category).map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                          <Checkbox
                            id={item.id}
                            checked={isItemChecked('acessibilidade', item.id)}
                            onCheckedChange={() => toggleChecklistItem('acessibilidade', item.id)}
                            data-testid={`access-${item.id}`}
                          />
                          <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                            {item.label}
                          </Label>
                          {isItemChecked('acessibilidade', item.id) && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inclusao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Checklist de Inclusão
              </CardTitle>
              <CardDescription>Garanta que sua marca seja inclusiva</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Imagem', 'Comunicação', 'Produto', 'Alcance', 'Relacionamento', 'Operação'].map(category => {
                  const items = inclusionItems.filter(i => i.category === category);
                  if (items.length === 0) return null;
                  return (
                    <div key={category}>
                      <h4 className="font-medium text-sm text-muted-foreground mb-3">{category}</h4>
                      <div className="space-y-3">
                        {items.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                            <Checkbox
                              id={item.id}
                              checked={isItemChecked('inclusao', item.id)}
                              onCheckedChange={() => toggleChecklistItem('inclusao', item.id)}
                              data-testid={`inclusion-${item.id}`}
                            />
                            <Label htmlFor={item.id} className="flex-1 cursor-pointer">
                              {item.label}
                            </Label>
                            {isItemChecked('inclusao', item.id) && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crises" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Planejamento de Crises
              </CardTitle>
              <CardDescription>Antecipe cenários de crise e defina ações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Tipo de Crise</Label>
                  <Input
                    value={newCrise.tipo}
                    onChange={(e) => setNewCrise(prev => ({ ...prev, tipo: e.target.value }))}
                    placeholder="Ex: Reputação, Produto"
                    data-testid="crise-tipo-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição do Cenário</Label>
                  <Input
                    value={newCrise.descricao}
                    onChange={(e) => setNewCrise(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva o cenário de crise"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ação de Resposta</Label>
                  <Input
                    value={newCrise.acao}
                    onChange={(e) => setNewCrise(prev => ({ ...prev, acao: e.target.value }))}
                    placeholder="Como responder"
                  />
                </div>
                <Button onClick={addCrise} className="md:col-span-3" data-testid="add-crise-btn">
                  <Plus className="h-4 w-4 mr-2" />Adicionar Cenário de Crise
                </Button>
              </div>
              <div className="space-y-3">
                {(data.plano_crises || []).map((crise, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-amber-200 text-amber-700">{crise.tipo}</Badge>
                        </div>
                        {crise.descricao && <p className="text-sm mt-2">{crise.descricao}</p>}
                        {crise.acao && (
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-medium">Ação:</span> {crise.acao}
                          </p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeCrise(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viabilidade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Viabilidade Universal</CardTitle>
              <CardDescription>Avalie a viabilidade de implementação em diferentes horizontes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    Curto Prazo (1 ano)
                  </Label>
                  <span className="font-medium">{data.viabilidade_curto}%</span>
                </div>
                <Slider
                  value={[data.viabilidade_curto]}
                  onValueChange={(value) => handleViabilidadeChange('viabilidade_curto', value)}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="viabilidade-curto-slider"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    Médio Prazo (3 anos)
                  </Label>
                  <span className="font-medium">{data.viabilidade_medio}%</span>
                </div>
                <Slider
                  value={[data.viabilidade_medio]}
                  onValueChange={(value) => handleViabilidadeChange('viabilidade_medio', value)}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="viabilidade-medio-slider"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Longo Prazo (5+ anos)
                  </Label>
                  <span className="font-medium">{data.viabilidade_longo}%</span>
                </div>
                <Slider
                  value={[data.viabilidade_longo]}
                  onValueChange={(value) => handleViabilidadeChange('viabilidade_longo', value)}
                  max={100}
                  step={5}
                  className="w-full"
                  data-testid="viabilidade-longo-slider"
                />
              </div>

              {/* Visual Summary */}
              <div className="p-6 border rounded-xl bg-muted/30">
                <h4 className="font-medium mb-4">Resumo de Viabilidade</h4>
                <div className="flex items-end gap-4 h-32">
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-emerald-500 rounded-t-lg transition-all"
                      style={{ height: `${data.viabilidade_curto}%` }}
                    />
                    <span className="text-xs mt-2">Curto</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-amber-500 rounded-t-lg transition-all"
                      style={{ height: `${data.viabilidade_medio}%` }}
                    />
                    <span className="text-xs mt-2">Médio</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500 rounded-t-lg transition-all"
                      style={{ height: `${data.viabilidade_longo}%` }}
                    />
                    <span className="text-xs mt-2">Longo</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PillarUniversality;
