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
import { 
  Target, 
  Plus, 
  X, 
  Loader2, 
  Sparkles, 
  Save,
  AlertTriangle,
  TrendingUp,
  Users as UsersIcon,
  FileText,
  Lightbulb
} from 'lucide-react';

export const PillarStart = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight } = useBrand();
  const [data, setData] = useState({
    desafio: '',
    background: '',
    urgencia: '',
    cenario_competitivo: '',
    players: [],
    regulamentacoes: [],
    tendencias: [],
    publicos_interesse: [],
    incertezas: [],
    cenarios: { C1: '', C2: '', C3: '', C4: '' }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newItems, setNewItems] = useState({
    players: '',
    regulamentacoes: '',
    tendencias: '',
    publicos_interesse: '',
    incertezas: ''
  });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadData();
    }
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'start');
      if (pillarData && Object.keys(pillarData).length > 0) {
        setData(prev => ({
          ...prev,
          ...pillarData,
          cenarios: pillarData.cenarios || { C1: '', C2: '', C3: '', C4: '' }
        }));
      }
    } catch (error) {
      console.error('Error loading pillar:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSave = useCallback(async (newData) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await updatePillar(currentBrand.brand_id, 'start', newData);
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

  const handleCenarioChange = (key, value) => {
    const newCenarios = { ...data.cenarios, [key]: value };
    const newData = { ...data, cenarios: newCenarios };
    setData(newData);
    autoSave(newData);
  };

  const addListItem = (field) => {
    if (!newItems[field].trim()) return;
    const newList = [...(data[field] || []), newItems[field].trim()];
    const newData = { ...data, [field]: newList };
    setData(newData);
    setNewItems(prev => ({ ...prev, [field]: '' }));
    autoSave(newData);
  };

  const removeListItem = (field, index) => {
    const newList = data[field].filter((_, i) => i !== index);
    const newData = { ...data, [field]: newList };
    setData(newData);
    autoSave(newData);
  };

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    try {
      const context = `
        Desafio: ${data.desafio}
        Background: ${data.background}
        Urgência: ${data.urgencia}
        Cenário Competitivo: ${data.cenario_competitivo}
        Players: ${data.players.join(', ')}
        Tendências: ${data.tendencias.join(', ')}
        Públicos: ${data.publicos_interesse.join(', ')}
      `;
      const result = await generateInsight(context, 'start', currentBrand.name);
      toast.success('Insight gerado!');
      // Add insight to incertezas or show in a modal
      const newIncertezas = [...data.incertezas, `[IA] ${result.insight.slice(0, 200)}...`];
      handleFieldChange('incertezas', newIncertezas);
    } catch (error) {
      toast.error('Erro ao gerar insight');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'start', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    const fields = ['desafio', 'background', 'urgencia', 'cenario_competitivo'];
    const listFields = ['players', 'tendencias', 'publicos_interesse'];
    let filled = 0;
    let total = fields.length + listFields.length + 4; // +4 for scenarios

    fields.forEach(f => { if (data[f]) filled++; });
    listFields.forEach(f => { if (data[f]?.length > 0) filled++; });
    Object.values(data.cenarios || {}).forEach(v => { if (v) filled++; });

    return Math.round((filled / total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="pillar-start">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Start</h1>
            <p className="text-muted-foreground">Diagnóstico inicial e mapeamento de cenários</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Progress value={calculateProgress()} className="w-24 h-2" />
            <span className="text-sm text-muted-foreground">{calculateProgress()}%</span>
          </div>
          {isSaving && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Salvando...
            </Badge>
          )}
          <Button onClick={handleSave} disabled={isSaving} data-testid="save-btn">
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="canvas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="canvas" data-testid="tab-canvas">Canvas</TabsTrigger>
          <TabsTrigger value="cenarios" data-testid="tab-cenarios">Cenários</TabsTrigger>
          <TabsTrigger value="incertezas" data-testid="tab-incertezas">Incertezas</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Desafio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Desafio
                </CardTitle>
                <CardDescription>Qual é o principal desafio da marca?</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.desafio}
                  onChange={(e) => handleFieldChange('desafio', e.target.value)}
                  placeholder="Descreva o desafio principal..."
                  rows={4}
                  data-testid="desafio-input"
                />
              </CardContent>
            </Card>

            {/* Background */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Background
                </CardTitle>
                <CardDescription>Contexto histórico da marca</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.background}
                  onChange={(e) => handleFieldChange('background', e.target.value)}
                  placeholder="Conte a história e contexto..."
                  rows={4}
                  data-testid="background-input"
                />
              </CardContent>
            </Card>

            {/* Urgência */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-rose-500" />
                  Urgência
                </CardTitle>
                <CardDescription>Nível de urgência e prazos</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.urgencia}
                  onChange={(e) => handleFieldChange('urgencia', e.target.value)}
                  placeholder="Defina a urgência e motivações..."
                  rows={4}
                  data-testid="urgencia-input"
                />
              </CardContent>
            </Card>

            {/* Cenário Competitivo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UsersIcon className="h-5 w-5 text-purple-500" />
                  Cenário Competitivo
                </CardTitle>
                <CardDescription>Análise do ambiente competitivo</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={data.cenario_competitivo}
                  onChange={(e) => handleFieldChange('cenario_competitivo', e.target.value)}
                  placeholder="Descreva o cenário competitivo..."
                  rows={4}
                  data-testid="cenario-competitivo-input"
                />
              </CardContent>
            </Card>
          </div>

          {/* Lists Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Players */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Players</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newItems.players}
                    onChange={(e) => setNewItems(prev => ({ ...prev, players: e.target.value }))}
                    placeholder="Adicionar player..."
                    onKeyPress={(e) => e.key === 'Enter' && addListItem('players')}
                    data-testid="players-input"
                  />
                  <Button size="icon" onClick={() => addListItem('players')} data-testid="add-player-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.players.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeListItem('players', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tendências */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Tendências</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newItems.tendencias}
                    onChange={(e) => setNewItems(prev => ({ ...prev, tendencias: e.target.value }))}
                    placeholder="Adicionar tendência..."
                    onKeyPress={(e) => e.key === 'Enter' && addListItem('tendencias')}
                    data-testid="tendencias-input"
                  />
                  <Button size="icon" onClick={() => addListItem('tendencias')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.tendencias.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeListItem('tendencias', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Públicos de Interesse */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Públicos de Interesse</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newItems.publicos_interesse}
                    onChange={(e) => setNewItems(prev => ({ ...prev, publicos_interesse: e.target.value }))}
                    placeholder="Adicionar público..."
                    onKeyPress={(e) => e.key === 'Enter' && addListItem('publicos_interesse')}
                    data-testid="publicos-input"
                  />
                  <Button size="icon" onClick={() => addListItem('publicos_interesse')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.publicos_interesse.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeListItem('publicos_interesse', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cenarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cenários Futuros (C1 - C4)</CardTitle>
              <CardDescription>
                Mapeie possíveis cenários futuros para a marca
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['C1', 'C2', 'C3', 'C4'].map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="font-semibold">Cenário {key}</Label>
                    <Textarea
                      value={data.cenarios[key] || ''}
                      onChange={(e) => handleCenarioChange(key, e.target.value)}
                      placeholder={`Descreva o cenário ${key}...`}
                      rows={4}
                      data-testid={`cenario-${key.toLowerCase()}-input`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incertezas" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Incertezas e Insights
                  </CardTitle>
                  <CardDescription>
                    Registre incertezas e gere insights com IA
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleGenerateInsight} 
                  disabled={isGenerating}
                  variant="outline"
                  data-testid="generate-insight-btn"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Gerar Insight com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newItems.incertezas}
                  onChange={(e) => setNewItems(prev => ({ ...prev, incertezas: e.target.value }))}
                  placeholder="Adicionar incerteza ou pergunta..."
                  onKeyPress={(e) => e.key === 'Enter' && addListItem('incertezas')}
                  data-testid="incertezas-input"
                />
                <Button onClick={() => addListItem('incertezas')} data-testid="add-incerteza-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {data.incertezas.map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.startsWith('[IA]') ? 'bg-amber-50 border-amber-200' : 'bg-muted/50'
                    }`}
                  >
                    <span className="flex-1 text-sm">{item}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => removeListItem('incertezas', index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {data.incertezas.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma incerteza registrada ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PillarStart;
