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
import { Users, Plus, X, Loader2, Save, Sparkles, Check, Lightbulb } from 'lucide-react';

// 12 Arquétipos de Jung
const jungArchetypes = [
  { id: 'inocente', name: 'Inocente', emoji: '😇', desc: 'Otimismo, pureza, simplicidade', traits: ['Otimista', 'Puro', 'Honesto'], brands: ['Coca-Cola', 'Disney', 'Dove'] },
  { id: 'explorador', name: 'Explorador', emoji: '🧭', desc: 'Liberdade, aventura, descoberta', traits: ['Aventureiro', 'Independente', 'Curioso'], brands: ['Jeep', 'The North Face', 'Starbucks'] },
  { id: 'sabio', name: 'Sábio', emoji: '🦉', desc: 'Conhecimento, verdade, sabedoria', traits: ['Analítico', 'Inteligente', 'Confiável'], brands: ['Google', 'BBC', 'TED'] },
  { id: 'heroi', name: 'Herói', emoji: '🦸', desc: 'Coragem, determinação, vitória', traits: ['Corajoso', 'Determinado', 'Inspirador'], brands: ['Nike', 'Adidas', 'FedEx'] },
  { id: 'fora-da-lei', name: 'Fora-da-Lei', emoji: '🏴‍☠️', desc: 'Rebeldia, revolução, liberdade', traits: ['Rebelde', 'Disruptivo', 'Ousado'], brands: ['Harley-Davidson', 'Virgin', 'Diesel'] },
  { id: 'mago', name: 'Mago', emoji: '🪄', desc: 'Transformação, visão, inovação', traits: ['Visionário', 'Carismático', 'Transformador'], brands: ['Apple', 'Tesla', 'Dyson'] },
  { id: 'cara-comum', name: 'Cara Comum', emoji: '👤', desc: 'Pertencimento, autenticidade, igualdade', traits: ['Acessível', 'Autêntico', 'Democrático'], brands: ['IKEA', 'Havaianas', 'Volkswagen'] },
  { id: 'amante', name: 'Amante', emoji: '❤️', desc: 'Paixão, prazer, intimidade', traits: ['Sensual', 'Apaixonado', 'Elegante'], brands: ['Chanel', 'Victoria\'s Secret', 'Godiva'] },
  { id: 'bobo', name: 'Bobo da Corte', emoji: '🃏', desc: 'Diversão, humor, espontaneidade', traits: ['Divertido', 'Espontâneo', 'Irreverente'], brands: ['M&M\'s', 'Old Spice', 'Fanta'] },
  { id: 'cuidador', name: 'Cuidador', emoji: '🤗', desc: 'Proteção, compaixão, serviço', traits: ['Generoso', 'Protetor', 'Empático'], brands: ['Johnson & Johnson', 'Volvo', 'WWF'] },
  { id: 'criador', name: 'Criador', emoji: '🎨', desc: 'Inovação, expressão, imaginação', traits: ['Criativo', 'Inovador', 'Original'], brands: ['Lego', 'Adobe', 'Pinterest'] },
  { id: 'governante', name: 'Governante', emoji: '👑', desc: 'Liderança, poder, controle', traits: ['Líder', 'Responsável', 'Organizado'], brands: ['Mercedes-Benz', 'Rolex', 'Microsoft'] },
];

// Combinações sugeridas
const suggestedCombinations = [
  { primary: 'heroi', secondary: 'explorador', name: 'Aventureiro Corajoso', desc: 'Marcas que inspiram conquistas através de experiências' },
  { primary: 'mago', secondary: 'criador', name: 'Inovador Visionário', desc: 'Marcas que transformam mercados com criatividade' },
  { primary: 'sabio', secondary: 'cuidador', name: 'Mentor Confiável', desc: 'Marcas que educam e protegem seus clientes' },
  { primary: 'fora-da-lei', secondary: 'bobo', name: 'Rebelde Divertido', desc: 'Marcas que desafiam normas com humor' },
  { primary: 'amante', secondary: 'criador', name: 'Artista Apaixonado', desc: 'Marcas que criam experiências sensoriais únicas' },
  { primary: 'governante', secondary: 'heroi', name: 'Líder Inspirador', desc: 'Marcas que comandam com propósito' },
];

export const PillarPersonality = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight } = useBrand();
  const [data, setData] = useState({
    arquetipo_principal: '',
    arquetipo_secundario: '',
    personalidade_customizada: '',
    atributos_desejados: [],
    atributos_indesejados: [],
    narrativa_individual: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newAtributo, setNewAtributo] = useState({ desejado: '', indesejado: '' });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) loadData();
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'personality');
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
        await updatePillar(currentBrand.brand_id, 'personality', newData);
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

  const addAtributo = (type) => {
    const field = type === 'desejado' ? 'atributos_desejados' : 'atributos_indesejados';
    const value = newAtributo[type];
    if (!value.trim()) return;
    const newList = [...(data[field] || []), value.trim()];
    const newData = { ...data, [field]: newList };
    setData(newData);
    setNewAtributo(prev => ({ ...prev, [type]: '' }));
    autoSave(newData);
  };

  const removeAtributo = (field, index) => {
    const newList = data[field].filter((_, i) => i !== index);
    const newData = { ...data, [field]: newList };
    setData(newData);
    autoSave(newData);
  };

  const selectArchetype = (archetypeId, isPrimary) => {
    const field = isPrimary ? 'arquetipo_principal' : 'arquetipo_secundario';
    const newData = { ...data, [field]: data[field] === archetypeId ? '' : archetypeId };
    setData(newData);
    autoSave(newData);
  };

  const applyCombination = (combo) => {
    const newData = { ...data, arquetipo_principal: combo.primary, arquetipo_secundario: combo.secondary };
    setData(newData);
    autoSave(newData);
    toast.success(`Combinação "${combo.name}" aplicada!`);
  };

  const handleGenerateNarrative = async () => {
    setIsGenerating(true);
    try {
      const primaryArch = jungArchetypes.find(a => a.id === data.arquetipo_principal);
      const secondaryArch = jungArchetypes.find(a => a.id === data.arquetipo_secundario);
      const context = `
        Arquétipo principal: ${primaryArch?.name || 'Não definido'} - ${primaryArch?.desc || ''}
        Arquétipo secundário: ${secondaryArch?.name || 'Não definido'} - ${secondaryArch?.desc || ''}
        Personalidade customizada: ${data.personalidade_customizada || 'Não definida'}
        Atributos desejados: ${data.atributos_desejados.join(', ')}
        Atributos indesejados: ${data.atributos_indesejados.join(', ')}
      `;
      const result = await generateInsight(context, 'personality', currentBrand.name);
      handleFieldChange('narrativa_individual', result.insight);
      toast.success('Narrativa gerada!');
    } catch (error) {
      toast.error('Erro ao gerar narrativa');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'personality', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    let filled = 0;
    if (data.arquetipo_principal) filled++;
    if (data.atributos_desejados?.length > 0) filled++;
    if (data.atributos_indesejados?.length > 0) filled++;
    if (data.narrativa_individual) filled++;
    if (data.narrativa_grupal) filled++;
    if (data.narrativa_societal) filled++;
    return Math.round((filled / 6) * 100);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  return (
    <div className="space-y-6" data-testid="pillar-personality">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Personalidade</h1>
            <p className="text-muted-foreground">Defina os arquétipos e atributos da marca</p>
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

      <Tabs defaultValue="arquetipos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="arquetipos">Arquétipos</TabsTrigger>
          <TabsTrigger value="atributos">Atributos</TabsTrigger>
          <TabsTrigger value="narrativas">Narrativas</TabsTrigger>
        </TabsList>

        <TabsContent value="arquetipos" className="space-y-6">
          {/* Arquétipo Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Arquétipo Principal</CardTitle>
              <CardDescription>Selecione a classe e o arquétipo que melhor representa a essência da marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Classes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {archetypeClasses.map((cls) => {
                  const isSelected = data.classe_principal === cls.id;
                  return (
                    <div
                      key={cls.id}
                      onClick={() => {
                        if (data.classe_principal !== cls.id) {
                          setData(prev => ({ ...prev, classe_principal: cls.id, arquetipo_principal: '' }));
                        }
                      }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected ? `${cls.borderColor} ${cls.bgLight}` : 'border-transparent bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className={`w-full h-2 rounded-full ${cls.color} mb-3`} />
                      <p className="font-bold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cls.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Arquétipos da Classe Selecionada */}
              {data.classe_principal && (
                <div className="space-y-4">
                  {(() => {
                    const selectedClass = archetypeClasses.find(c => c.id === data.classe_principal);
                    const groups = [...new Set(selectedClass.archetypes.map(a => a.group))];
                    return groups.map(group => (
                      <div key={group}>
                        <Label className="text-sm text-muted-foreground mb-2 block">{group}</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedClass.archetypes.filter(a => a.group === group).map(arch => {
                            const isSelected = data.arquetipo_principal === arch.id;
                            return (
                              <Badge
                                key={arch.id}
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                                  isSelected ? `${selectedClass.color} text-white` : 'hover:bg-muted'
                                }`}
                                onClick={() => selectArchetype(selectedClass.id, arch.id, true)}
                              >
                                {isSelected && <Check className="h-3 w-3 mr-1" />}
                                {arch.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Selected Summary */}
              {data.arquetipo_principal && (
                <div className={`p-4 rounded-lg ${archetypeClasses.find(c => c.id === data.classe_principal)?.bgLight}`}>
                  <p className="text-sm font-medium">Selecionado:</p>
                  <p className={`text-lg font-bold ${archetypeClasses.find(c => c.id === data.classe_principal)?.textColor}`}>
                    {allArchetypes.find(a => a.id === data.arquetipo_principal)?.name} 
                    <span className="font-normal text-sm ml-2">
                      ({archetypeClasses.find(c => c.id === data.classe_principal)?.name})
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Arquétipo Secundário */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Arquétipo Secundário (opcional)</CardTitle>
              <CardDescription>Um segundo arquétipo que complementa o principal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Classes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {archetypeClasses.map((cls) => {
                  const isSelected = data.classe_secundaria === cls.id;
                  return (
                    <div
                      key={cls.id}
                      onClick={() => {
                        if (data.classe_secundaria !== cls.id) {
                          setData(prev => ({ ...prev, classe_secundaria: cls.id, arquetipo_secundario: '' }));
                        }
                      }}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        isSelected ? `${cls.borderColor} ${cls.bgLight}` : 'border-transparent bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <div className={`w-full h-2 rounded-full ${cls.color} mb-3`} />
                      <p className="font-bold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cls.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Arquétipos da Classe Selecionada */}
              {data.classe_secundaria && (
                <div className="space-y-4">
                  {(() => {
                    const selectedClass = archetypeClasses.find(c => c.id === data.classe_secundaria);
                    const groups = [...new Set(selectedClass.archetypes.map(a => a.group))];
                    return groups.map(group => (
                      <div key={group}>
                        <Label className="text-sm text-muted-foreground mb-2 block">{group}</Label>
                        <div className="flex flex-wrap gap-2">
                          {selectedClass.archetypes.filter(a => a.group === group).map(arch => {
                            const isSelected = data.arquetipo_secundario === arch.id;
                            const isPrimary = data.arquetipo_principal === arch.id;
                            return (
                              <Badge
                                key={arch.id}
                                variant={isSelected ? "default" : "outline"}
                                className={`cursor-pointer px-4 py-2 text-sm transition-all ${
                                  isPrimary ? 'opacity-40 cursor-not-allowed' : ''
                                } ${
                                  isSelected ? `${selectedClass.color} text-white` : 'hover:bg-muted'
                                }`}
                                onClick={() => !isPrimary && selectArchetype(selectedClass.id, arch.id, false)}
                              >
                                {isSelected && <Check className="h-3 w-3 mr-1" />}
                                {arch.name}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Selected Summary */}
              {data.arquetipo_secundario && (
                <div className={`p-4 rounded-lg ${archetypeClasses.find(c => c.id === data.classe_secundaria)?.bgLight}`}>
                  <p className="text-sm font-medium">Selecionado:</p>
                  <p className={`text-lg font-bold ${archetypeClasses.find(c => c.id === data.classe_secundaria)?.textColor}`}>
                    {allArchetypes.find(a => a.id === data.arquetipo_secundario)?.name} 
                    <span className="font-normal text-sm ml-2">
                      ({archetypeClasses.find(c => c.id === data.classe_secundaria)?.name})
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atributos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-emerald-600">Atributos Desejados</CardTitle>
                <CardDescription>Características que a marca quer ter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAtributo.desejado}
                    onChange={(e) => setNewAtributo(prev => ({ ...prev, desejado: e.target.value }))}
                    placeholder="Ex: Inovadora, Confiável"
                    onKeyPress={(e) => e.key === 'Enter' && addAtributo('desejado')}
                    data-testid="atributo-desejado-input"
                  />
                  <Button onClick={() => addAtributo('desejado')} data-testid="add-desejado-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.atributos_desejados.map((attr, index) => (
                    <Badge key={index} className="bg-emerald-100 text-emerald-800 gap-1">
                      {attr}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeAtributo('atributos_desejados', index)} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-rose-600">Atributos Indesejados</CardTitle>
                <CardDescription>Características que a marca NÃO quer ter</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newAtributo.indesejado}
                    onChange={(e) => setNewAtributo(prev => ({ ...prev, indesejado: e.target.value }))}
                    placeholder="Ex: Arrogante, Distante"
                    onKeyPress={(e) => e.key === 'Enter' && addAtributo('indesejado')}
                    data-testid="atributo-indesejado-input"
                  />
                  <Button onClick={() => addAtributo('indesejado')} variant="outline" data-testid="add-indesejado-btn">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.atributos_indesejados.map((attr, index) => (
                    <Badge key={index} variant="outline" className="border-rose-200 text-rose-700 gap-1">
                      {attr}
                      <X className="h-3 w-3 cursor-pointer" onClick={() => removeAtributo('atributos_indesejados', index)} />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="narrativas" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Narrativas de Humanização</CardTitle>
                  <CardDescription>Como a marca se apresenta em diferentes níveis</CardDescription>
                </div>
                <Button onClick={handleGenerateNarrative} disabled={isGenerating} variant="outline" data-testid="generate-narrative-btn">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Gerar com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Narrativa Individual</Label>
                <p className="text-xs text-muted-foreground mb-2">Como a marca se relaciona com cada pessoa</p>
                <Textarea
                  value={data.narrativa_individual}
                  onChange={(e) => handleFieldChange('narrativa_individual', e.target.value)}
                  placeholder="Descreva a narrativa individual..."
                  rows={4}
                  className="font-editorial"
                  data-testid="narrativa-individual-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Narrativa Grupal</Label>
                <p className="text-xs text-muted-foreground mb-2">Como a marca se relaciona com grupos e comunidades</p>
                <Textarea
                  value={data.narrativa_grupal}
                  onChange={(e) => handleFieldChange('narrativa_grupal', e.target.value)}
                  placeholder="Descreva a narrativa grupal..."
                  rows={4}
                  data-testid="narrativa-grupal-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Narrativa Societal</Label>
                <p className="text-xs text-muted-foreground mb-2">Como a marca contribui para a sociedade</p>
                <Textarea
                  value={data.narrativa_societal}
                  onChange={(e) => handleFieldChange('narrativa_societal', e.target.value)}
                  placeholder="Descreva a narrativa societal..."
                  rows={4}
                  data-testid="narrativa-societal-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PillarPersonality;
