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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Star, Plus, X, Loader2, Save, Handshake, Gift, Smile, Trophy, Target, Sparkle } from 'lucide-react';

export const PillarPromise = () => {
  const { currentBrand, fetchPillar, updatePillar } = useBrand();
  const [data, setData] = useState({
    identificacao: '',
    qualidade: '',
    entrega_funcional: '',
    entrega_simbolica: '',
    entrega_aspiracional: '',
    entrega_emocional: '',
    atributos_experiencia: [],
    parcerias: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newAtributo, setNewAtributo] = useState({ nome: '', descricao: '' });
  const [newParceria, setNewParceria] = useState({ nome: '', tipo: '', descricao: '' });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) loadData();
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'promise');
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
        await updatePillar(currentBrand.brand_id, 'promise', newData);
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

  const addAtributo = () => {
    if (!newAtributo.nome.trim()) return;
    const newList = [...data.atributos_experiencia, { ...newAtributo }];
    const newData = { ...data, atributos_experiencia: newList };
    setData(newData);
    setNewAtributo({ nome: '', descricao: '' });
    autoSave(newData);
  };

  const removeAtributo = (index) => {
    const newList = data.atributos_experiencia.filter((_, i) => i !== index);
    const newData = { ...data, atributos_experiencia: newList };
    setData(newData);
    autoSave(newData);
  };

  const addParceria = () => {
    if (!newParceria.nome.trim()) return;
    const newList = [...data.parcerias, { ...newParceria }];
    const newData = { ...data, parcerias: newList };
    setData(newData);
    setNewParceria({ nome: '', tipo: '', descricao: '' });
    autoSave(newData);
  };

  const removeParceria = (index) => {
    const newList = data.parcerias.filter((_, i) => i !== index);
    const newData = { ...data, parcerias: newList };
    setData(newData);
    autoSave(newData);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'promise', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    const fields = ['identificacao', 'qualidade', 'entrega_funcional', 'entrega_simbolica', 'entrega_aspiracional', 'entrega_emocional'];
    let filled = 0;
    fields.forEach(f => { if (data[f]) filled++; });
    if (data.atributos_experiencia?.length > 0) filled++;
    if (data.parcerias?.length > 0) filled++;
    return Math.round((filled / 8) * 100);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  const promiseDimensions = [
    { key: 'identificacao', label: 'Identificação', icon: Target, description: 'Como o cliente se identifica com a marca' },
    { key: 'qualidade', label: 'Qualidade', icon: Trophy, description: 'Padrão de qualidade prometido' },
    { key: 'entrega_funcional', label: 'Entrega Funcional', icon: Gift, description: 'Benefícios práticos e tangíveis' },
    { key: 'entrega_simbolica', label: 'Entrega Simbólica', icon: Sparkle, description: 'Significado e status' },
    { key: 'entrega_aspiracional', label: 'Entrega Aspiracional', icon: Star, description: 'Sonhos e aspirações' },
    { key: 'entrega_emocional', label: 'Entrega Emocional', icon: Smile, description: 'Sentimentos e conexão emocional' }
  ];

  return (
    <div className="space-y-6" data-testid="pillar-promise">
      <PillarNavigation />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Promessa</h1>
            <p className="text-muted-foreground">Defina a promessa da marca aos clientes</p>
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

      <Tabs defaultValue="matriz" className="space-y-6">
        <TabsList>
          <TabsTrigger value="matriz">Matriz de Promessa</TabsTrigger>
          <TabsTrigger value="experiencia">Experiência</TabsTrigger>
          <TabsTrigger value="parcerias">Parcerias</TabsTrigger>
        </TabsList>

        <TabsContent value="matriz" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promiseDimensions.map((dim) => {
              const Icon = dim.icon;
              return (
                <Card key={dim.key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Icon className="h-5 w-5 text-purple-500" />
                      {dim.label}
                    </CardTitle>
                    <CardDescription>{dim.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={data[dim.key]}
                      onChange={(e) => handleFieldChange(dim.key, e.target.value)}
                      placeholder={`Descreva a ${dim.label.toLowerCase()}...`}
                      rows={4}
                      data-testid={`${dim.key}-input`}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="experiencia" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Malha de Experiência</CardTitle>
              <CardDescription>Atributos que compõem a experiência da marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Atributo</Label>
                  <Input
                    value={newAtributo.nome}
                    onChange={(e) => setNewAtributo(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: Atendimento personalizado"
                    data-testid="atributo-nome-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={newAtributo.descricao}
                    onChange={(e) => setNewAtributo(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Como este atributo se manifesta"
                  />
                </div>
                <Button onClick={addAtributo} className="md:col-span-2" data-testid="add-atributo-btn">
                  <Plus className="h-4 w-4 mr-2" />Adicionar Atributo
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.atributos_experiencia.map((attr, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{attr.nome}</p>
                        {attr.descricao && <p className="text-sm text-muted-foreground mt-1">{attr.descricao}</p>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAtributo(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parcerias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                Parcerias Estratégicas
              </CardTitle>
              <CardDescription>Parcerias que fortalecem a promessa da marca</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label>Parceiro</Label>
                  <Input
                    value={newParceria.nome}
                    onChange={(e) => setNewParceria(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do parceiro"
                    data-testid="parceria-nome-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Input
                    value={newParceria.tipo}
                    onChange={(e) => setNewParceria(prev => ({ ...prev, tipo: e.target.value }))}
                    placeholder="Ex: Fornecedor, Co-branding"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={newParceria.descricao}
                    onChange={(e) => setNewParceria(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Benefício da parceria"
                  />
                </div>
                <Button onClick={addParceria} className="md:col-span-3" data-testid="add-parceria-btn">
                  <Plus className="h-4 w-4 mr-2" />Adicionar Parceria
                </Button>
              </div>
              <div className="space-y-3">
                {data.parcerias.map((parceria, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{parceria.nome}</p>
                        {parceria.tipo && <Badge variant="outline">{parceria.tipo}</Badge>}
                      </div>
                      {parceria.descricao && <p className="text-sm text-muted-foreground mt-1">{parceria.descricao}</p>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeParceria(index)}>
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

export default PillarPromise;
