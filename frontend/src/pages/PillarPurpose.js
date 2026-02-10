import { useState, useEffect, useCallback, useRef } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Compass, 
  Plus, 
  X, 
  Loader2, 
  Sparkles, 
  Save,
  Brain,
  Heart,
  Zap,
  Target
} from 'lucide-react';

export const PillarPurpose = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight } = useBrand();
  const [data, setData] = useState({
    habilidades: [],
    curiosidade: [],
    paixao: [],
    impacto: [],
    declaracao_proposito: '',
    impacto_curto_prazo: '',
    impacto_medio_prazo: '',
    impacto_longo_prazo: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newItems, setNewItems] = useState({
    habilidades: '',
    curiosidade: '',
    paixao: '',
    impacto: ''
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
      const pillarData = await fetchPillar(currentBrand.brand_id, 'purpose');
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
        await updatePillar(currentBrand.brand_id, 'purpose', newData);
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

  const handleGeneratePurpose = async () => {
    setIsGenerating(true);
    try {
      const context = `
        Habilidades únicas: ${data.habilidades.join(', ')}
        Curiosidades e interesses: ${data.curiosidade.join(', ')}
        Paixões: ${data.paixao.join(', ')}
        Impacto desejado: ${data.impacto.join(', ')}
      `;
      const result = await generateInsight(context, 'purpose', currentBrand.name);
      handleFieldChange('declaracao_proposito', result.insight);
      toast.success('Declaração de propósito gerada!');
    } catch (error) {
      toast.error('Erro ao gerar propósito');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'purpose', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    const lists = ['habilidades', 'curiosidade', 'paixao', 'impacto'];
    const texts = ['declaracao_proposito', 'impacto_curto_prazo', 'impacto_medio_prazo', 'impacto_longo_prazo'];
    let filled = 0;
    const total = lists.length + texts.length;
    lists.forEach(f => { if (data[f]?.length > 0) filled++; });
    texts.forEach(f => { if (data[f]) filled++; });
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

  const quadrants = [
    { key: 'habilidades', label: 'Habilidades', icon: Brain, color: 'bg-blue-500', description: 'O que você faz bem?' },
    { key: 'curiosidade', label: 'Curiosidade', icon: Zap, color: 'bg-purple-500', description: 'O que te fascina?' },
    { key: 'paixao', label: 'Paixão', icon: Heart, color: 'bg-rose-500', description: 'O que te move?' },
    { key: 'impacto', label: 'Impacto', icon: Target, color: 'bg-emerald-500', description: 'O que o mundo precisa?' }
  ];

  return (
    <div className="space-y-6" data-testid="pillar-purpose">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
            <Compass className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Propósito</h1>
            <p className="text-muted-foreground">Descubra o propósito autêntico da marca</p>
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

      {/* Ikigai Quadrants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quadrants.map((quadrant) => {
          const Icon = quadrant.icon;
          return (
            <Card key={quadrant.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg ${quadrant.color} flex items-center justify-center`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {quadrant.label}
                </CardTitle>
                <CardDescription>{quadrant.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={newItems[quadrant.key]}
                    onChange={(e) => setNewItems(prev => ({ ...prev, [quadrant.key]: e.target.value }))}
                    placeholder={`Adicionar ${quadrant.label.toLowerCase()}...`}
                    onKeyPress={(e) => e.key === 'Enter' && addListItem(quadrant.key)}
                    data-testid={`${quadrant.key}-input`}
                  />
                  <Button size="icon" onClick={() => addListItem(quadrant.key)} data-testid={`add-${quadrant.key}-btn`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[60px]">
                  {data[quadrant.key].map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeListItem(quadrant.key, index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Purpose Declaration */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Declaração de Propósito</CardTitle>
              <CardDescription>
                A razão de existir da marca além do lucro
              </CardDescription>
            </div>
            <Button 
              onClick={handleGeneratePurpose} 
              disabled={isGenerating}
              variant="outline"
              data-testid="generate-purpose-btn"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar com IA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.declaracao_proposito}
            onChange={(e) => handleFieldChange('declaracao_proposito', e.target.value)}
            placeholder="Existimos para..."
            rows={4}
            className="text-lg font-editorial"
            data-testid="declaracao-proposito-input"
          />
        </CardContent>
      </Card>

      {/* Impact Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gráfico de Impacto</CardTitle>
          <CardDescription>
            Defina o impacto esperado em diferentes horizontes de tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                Curto Prazo (1 ano)
              </Label>
              <Textarea
                value={data.impacto_curto_prazo}
                onChange={(e) => handleFieldChange('impacto_curto_prazo', e.target.value)}
                placeholder="O que queremos alcançar..."
                rows={4}
                data-testid="impacto-curto-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                Médio Prazo (3 anos)
              </Label>
              <Textarea
                value={data.impacto_medio_prazo}
                onChange={(e) => handleFieldChange('impacto_medio_prazo', e.target.value)}
                placeholder="O que queremos alcançar..."
                rows={4}
                data-testid="impacto-medio-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Longo Prazo (5+ anos)
              </Label>
              <Textarea
                value={data.impacto_longo_prazo}
                onChange={(e) => handleFieldChange('impacto_longo_prazo', e.target.value)}
                placeholder="O que queremos alcançar..."
                rows={4}
                data-testid="impacto-longo-input"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PillarPurpose;
