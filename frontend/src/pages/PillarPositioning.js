import { useState, useEffect, useCallback, useRef } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Crosshair, Plus, X, Loader2, Save, Sparkles, Map, GitBranch } from 'lucide-react';

export const PillarPositioning = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight } = useBrand();
  const [data, setData] = useState({
    mapa_diferenciacao: [],
    substitutos: [],
    declaracao_posicionamento: '',
    para_quem: '',
    categoria: '',
    diferencial: '',
    razao_credibilidade: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newConcorrente, setNewConcorrente] = useState({ concorrente: '', atributo: '', posicao: '' });
  const [newSubstituto, setNewSubstituto] = useState({ nome: '', categoria: '', ameaca: '' });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) loadData();
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'positioning');
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
        await updatePillar(currentBrand.brand_id, 'positioning', newData);
      } catch (error) {
        console.error('Autosave error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [currentBrand?.brand_id, updatePillar]);

  const handleFieldChange = (field, value) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    autoSave(newData);
  };

  const addConcorrente = () => {
    if (!newConcorrente.concorrente.trim()) return;
    const newList = [...data.mapa_diferenciacao, { ...newConcorrente }];
    const newData = { ...data, mapa_diferenciacao: newList };
    setData(newData);
    setNewConcorrente({ concorrente: '', atributo: '', posicao: '' });
    autoSave(newData);
  };

  const removeConcorrente = (index) => {
    const newList = data.mapa_diferenciacao.filter((_, i) => i !== index);
    const newData = { ...data, mapa_diferenciacao: newList };
    setData(newData);
    autoSave(newData);
  };

  const addSubstituto = () => {
    if (!newSubstituto.nome.trim()) return;
    const newList = [...data.substitutos, { ...newSubstituto }];
    const newData = { ...data, substitutos: newList };
    setData(newData);
    setNewSubstituto({ nome: '', categoria: '', ameaca: '' });
    autoSave(newData);
  };

  const removeSubstituto = (index) => {
    const newList = data.substitutos.filter((_, i) => i !== index);
    const newData = { ...data, substitutos: newList };
    setData(newData);
    autoSave(newData);
  };

  const handleGeneratePositioning = async () => {
    setIsGenerating(true);
    try {
      const context = `
        Para quem: ${data.para_quem}
        Categoria: ${data.categoria}
        Diferencial: ${data.diferencial}
        Razão de credibilidade: ${data.razao_credibilidade}
        Concorrentes: ${data.mapa_diferenciacao.map(c => c.concorrente).join(', ')}
      `;
      const result = await generateInsight(context, 'positioning', currentBrand.name);
      handleFieldChange('declaracao_posicionamento', result.insight);
      toast.success('Declaração de posicionamento gerada!');
    } catch (error) {
      toast.error('Erro ao gerar posicionamento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'positioning', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    const fields = ['para_quem', 'categoria', 'diferencial', 'razao_credibilidade', 'declaracao_posicionamento'];
    let filled = 0;
    fields.forEach(f => { if (data[f]) filled++; });
    if (data.mapa_diferenciacao?.length > 0) filled++;
    return Math.round((filled / 6) * 100);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  return (
    <div className="space-y-6" data-testid="pillar-positioning">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Crosshair className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Posicionamento</h1>
            <p className="text-muted-foreground">Defina a posição única da marca no mercado</p>
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

      <Tabs defaultValue="declaracao" className="space-y-6">
        <TabsList>
          <TabsTrigger value="declaracao">Declaração</TabsTrigger>
          <TabsTrigger value="mapa">Mapa Competitivo</TabsTrigger>
          <TabsTrigger value="substitutos">Substitutos</TabsTrigger>
        </TabsList>

        <TabsContent value="declaracao" className="space-y-6">
          {/* Positioning Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Para quem?</CardTitle>
                <CardDescription>Público-alvo principal</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.para_quem}
                  onChange={(e) => handleFieldChange('para_quem', e.target.value)}
                  placeholder="Descreva o público-alvo..."
                  rows={3}
                  data-testid="para-quem-input"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Categoria</CardTitle>
                <CardDescription>Em qual categoria a marca compete</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.categoria}
                  onChange={(e) => handleFieldChange('categoria', e.target.value)}
                  placeholder="Defina a categoria..."
                  rows={3}
                  data-testid="categoria-input"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Diferencial</CardTitle>
                <CardDescription>O que torna a marca única</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.diferencial}
                  onChange={(e) => handleFieldChange('diferencial', e.target.value)}
                  placeholder="Qual é o diferencial único..."
                  rows={3}
                  data-testid="diferencial-input"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Razão de Credibilidade</CardTitle>
                <CardDescription>Por que acreditar na promessa</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.razao_credibilidade}
                  onChange={(e) => handleFieldChange('razao_credibilidade', e.target.value)}
                  placeholder="O que sustenta a promessa..."
                  rows={3}
                  data-testid="credibilidade-input"
                />
              </CardContent>
            </Card>
          </div>

          {/* Positioning Statement */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Declaração de Posicionamento</CardTitle>
                  <CardDescription>Síntese do posicionamento da marca</CardDescription>
                </div>
                <Button onClick={handleGeneratePositioning} disabled={isGenerating} variant="outline" data-testid="generate-positioning-btn">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Gerar com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                value={data.declaracao_posicionamento}
                onChange={(e) => handleFieldChange('declaracao_posicionamento', e.target.value)}
                placeholder="Para [público-alvo], [marca] é a [categoria] que [diferencial], porque [razão de credibilidade]."
                rows={4}
                className="text-lg font-editorial"
                data-testid="declaracao-posicionamento-input"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mapa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Map className="h-5 w-5" />
                Mapa de Diferenciação
              </CardTitle>
              <CardDescription>Análise comparativa com concorrentes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Concorrente</Label>
                  <Input
                    value={newConcorrente.concorrente}
                    onChange={(e) => setNewConcorrente(prev => ({ ...prev, concorrente: e.target.value }))}
                    placeholder="Nome do concorrente"
                    data-testid="concorrente-nome-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Atributo Comparado</Label>
                  <Input
                    value={newConcorrente.atributo}
                    onChange={(e) => setNewConcorrente(prev => ({ ...prev, atributo: e.target.value }))}
                    placeholder="Ex: Preço, Qualidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Posição</Label>
                  <Input
                    value={newConcorrente.posicao}
                    onChange={(e) => setNewConcorrente(prev => ({ ...prev, posicao: e.target.value }))}
                    placeholder="Como se posiciona"
                  />
                </div>
                <Button onClick={addConcorrente} className="md:col-span-3" data-testid="add-concorrente-btn">
                  <Plus className="h-4 w-4 mr-2" />Adicionar ao Mapa
                </Button>
              </div>
              <div className="space-y-3">
                {data.mapa_diferenciacao.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge>{item.concorrente}</Badge>
                        {item.atributo && <span className="text-sm text-muted-foreground">• {item.atributo}</span>}
                      </div>
                      {item.posicao && <p className="text-sm mt-1">{item.posicao}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeConcorrente(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="substitutos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Produtos/Serviços Substitutos
              </CardTitle>
              <CardDescription>Alternativas que podem substituir a oferta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Substituto</Label>
                  <Input
                    value={newSubstituto.nome}
                    onChange={(e) => setNewSubstituto(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do substituto"
                    data-testid="substituto-nome-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    value={newSubstituto.categoria}
                    onChange={(e) => setNewSubstituto(prev => ({ ...prev, categoria: e.target.value }))}
                    placeholder="Categoria do substituto"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nível de Ameaça</Label>
                  <Input
                    value={newSubstituto.ameaca}
                    onChange={(e) => setNewSubstituto(prev => ({ ...prev, ameaca: e.target.value }))}
                    placeholder="Alto, Médio, Baixo"
                  />
                </div>
                <Button onClick={addSubstituto} className="md:col-span-3" data-testid="add-substituto-btn">
                  <Plus className="h-4 w-4 mr-2" />Adicionar Substituto
                </Button>
              </div>
              <div className="space-y-3">
                {data.substitutos.map((item, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.nome}</p>
                        {item.categoria && <Badge variant="outline">{item.categoria}</Badge>}
                        {item.ameaca && (
                          <Badge variant={item.ameaca.toLowerCase() === 'alto' ? 'destructive' : item.ameaca.toLowerCase() === 'medio' ? 'default' : 'secondary'}>
                            {item.ameaca}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSubstituto(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PillarPositioning;
