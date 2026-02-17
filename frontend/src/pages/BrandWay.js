import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  Loader2, Sparkles, Target, Heart, MessageSquare, 
  Users, Shield, Save, Plus, X, Lightbulb, CheckCircle2
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DIMENSIONS = [
  { id: 'proposito', title: 'Propósito', icon: Target, description: 'Por que a empresa existe além do lucro' },
  { id: 'valores', title: 'Valores', icon: Heart, description: 'Princípios que guiam todas as decisões' },
  { id: 'personalidade', title: 'Personalidade', icon: Users, description: 'Traços de caráter e arquétipos da marca' },
  { id: 'tom_voz', title: 'Tom de Voz', icon: MessageSquare, description: 'Como a marca se comunica' },
  { id: 'comportamentos', title: 'Comportamentos', icon: Shield, description: 'Como a marca age no dia a dia' },
  { id: 'promessa', title: 'Promessa', icon: CheckCircle2, description: 'O que entrega ao cliente' },
];

export default function BrandWay() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('proposito');
  
  const [data, setData] = useState({
    proposito: { declaracao: '', impacto: '', evidencias: [] },
    valores: { lista: [], descricoes: {} },
    personalidade: { arquetipo_principal: '', arquetipo_secundario: '', atributos: [] },
    tom_voz: { estilo: '', exemplos_fazer: [], exemplos_evitar: [] },
    comportamentos: { internos: [], externos: [], rituais: [] },
    promessa: { declaracao: '', funcional: '', emocional: '', aspiracional: '' }
  });

  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadData();
    }
  }, [currentBrand]);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/brand-way`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && Object.keys(response.data).length > 0) {
        setData(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.log('No existing data');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API}/brands/${currentBrand.brand_id}/brand-way`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Dados salvos com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const generateAISuggestions = async (dimension) => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/ai/brand-way`,
        { 
          brand_id: currentBrand.brand_id, 
          brand_name: currentBrand.name,
          industry: currentBrand.industry,
          dimension,
          current_data: data
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.suggestions) {
        toast.success('Sugestões geradas! Revise e edite conforme necessário.');
        // Merge suggestions into data
        setData(prev => ({
          ...prev,
          [dimension]: { ...prev[dimension], ...response.data.suggestions }
        }));
      }
    } catch (error) {
      toast.error('Erro ao gerar sugestões');
    } finally {
      setGenerating(false);
    }
  };

  const addItemToList = (dimension, field) => {
    if (!newItem.trim()) return;
    setData(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [field]: [...(prev[dimension][field] || []), newItem.trim()]
      }
    }));
    setNewItem('');
  };

  const removeItemFromList = (dimension, field, index) => {
    setData(prev => ({
      ...prev,
      [dimension]: {
        ...prev[dimension],
        [field]: prev[dimension][field].filter((_, i) => i !== index)
      }
    }));
  };

  const updateField = (dimension, field, value) => {
    setData(prev => ({
      ...prev,
      [dimension]: { ...prev[dimension], [field]: value }
    }));
  };

  const calculateProgress = () => {
    let filled = 0;
    let total = 6;
    
    if (data.proposito.declaracao) filled++;
    if (data.valores.lista?.length > 0) filled++;
    if (data.personalidade.arquetipo_principal) filled++;
    if (data.tom_voz.estilo) filled++;
    if (data.comportamentos.internos?.length > 0) filled++;
    if (data.promessa.declaracao) filled++;
    
    return Math.round((filled / total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="brand-way-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Jeito de Ser da Marca</h1>
          <p className="text-muted-foreground">
            Defina a identidade e DNA da sua marca em 6 dimensões
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Progresso: {calculateProgress()}%
          </div>
          <Progress value={calculateProgress()} className="w-32 h-2" />
          <Button onClick={saveData} disabled={saving} data-testid="save-brand-way">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-1">
          {DIMENSIONS.map(dim => (
            <TabsTrigger key={dim.id} value={dim.id} className="text-xs md:text-sm">
              <dim.icon className="h-4 w-4 mr-1 hidden md:inline" />
              {dim.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Propósito */}
        <TabsContent value="proposito">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Propósito
                  </CardTitle>
                  <CardDescription>Por que sua empresa existe além do lucro?</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateAISuggestions('proposito')}
                  disabled={generating}
                  data-testid="ai-suggest-proposito"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Sugerir com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Declaração de Propósito</Label>
                <Textarea
                  placeholder="Ex: Existimos para democratizar o acesso à educação de qualidade..."
                  value={data.proposito.declaracao}
                  onChange={(e) => updateField('proposito', 'declaracao', e.target.value)}
                  className="min-h-[100px]"
                  data-testid="proposito-declaracao"
                />
              </div>
              <div>
                <Label>Impacto que Geramos</Label>
                <Textarea
                  placeholder="Qual transformação sua empresa gera no mundo?"
                  value={data.proposito.impacto}
                  onChange={(e) => updateField('proposito', 'impacto', e.target.value)}
                  data-testid="proposito-impacto"
                />
              </div>
              <div>
                <Label>Evidências do Propósito</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Adicione uma evidência..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItemToList('proposito', 'evidencias')}
                  />
                  <Button size="icon" variant="outline" onClick={() => addItemToList('proposito', 'evidencias')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.proposito.evidencias?.map((item, i) => (
                    <Badge key={i} variant="secondary" className="pr-1">
                      {item}
                      <button onClick={() => removeItemFromList('proposito', 'evidencias', i)} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Valores */}
        <TabsContent value="valores">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Valores
                  </CardTitle>
                  <CardDescription>Princípios inegociáveis que guiam todas as decisões</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateAISuggestions('valores')}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Sugerir com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Valores da Marca (máx. 5)</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ex: Transparência, Inovação, Excelência..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && data.valores.lista?.length < 5 && addItemToList('valores', 'lista')}
                    disabled={data.valores.lista?.length >= 5}
                  />
                  <Button 
                    size="icon" 
                    variant="outline" 
                    onClick={() => addItemToList('valores', 'lista')}
                    disabled={data.valores.lista?.length >= 5}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {data.valores.lista?.map((valor, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <Badge variant="default" className="mt-1">{i + 1}</Badge>
                      <div className="flex-1">
                        <div className="font-medium flex items-center justify-between">
                          {valor}
                          <button onClick={() => removeItemFromList('valores', 'lista', i)}>
                            <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                        <Input
                          placeholder="Descreva o que este valor significa na prática..."
                          value={data.valores.descricoes?.[valor] || ''}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            valores: {
                              ...prev.valores,
                              descricoes: { ...prev.valores.descricoes, [valor]: e.target.value }
                            }
                          }))}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Personalidade */}
        <TabsContent value="personalidade">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    Personalidade
                  </CardTitle>
                  <CardDescription>Se sua marca fosse uma pessoa, como seria?</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateAISuggestions('personalidade')}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Sugerir com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Arquétipo Principal</Label>
                  <Input
                    placeholder="Ex: O Sábio, O Herói, O Criador..."
                    value={data.personalidade.arquetipo_principal}
                    onChange={(e) => updateField('personalidade', 'arquetipo_principal', e.target.value)}
                    data-testid="personalidade-arquetipo"
                  />
                </div>
                <div>
                  <Label>Arquétipo Secundário</Label>
                  <Input
                    placeholder="Ex: O Explorador, O Cuidador..."
                    value={data.personalidade.arquetipo_secundario}
                    onChange={(e) => updateField('personalidade', 'arquetipo_secundario', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Atributos de Personalidade</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ex: Confiante, Acessível, Inovador..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItemToList('personalidade', 'atributos')}
                  />
                  <Button size="icon" variant="outline" onClick={() => addItemToList('personalidade', 'atributos')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.personalidade.atributos?.map((item, i) => (
                    <Badge key={i} variant="outline" className="pr-1">
                      {item}
                      <button onClick={() => removeItemFromList('personalidade', 'atributos', i)} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tom de Voz */}
        <TabsContent value="tom_voz">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    Tom de Voz
                  </CardTitle>
                  <CardDescription>Como sua marca se comunica com o mundo</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateAISuggestions('tom_voz')}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Sugerir com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Estilo de Comunicação</Label>
                <Textarea
                  placeholder="Descreva como sua marca fala: formal ou informal? Técnica ou acessível? Séria ou bem-humorada?"
                  value={data.tom_voz.estilo}
                  onChange={(e) => updateField('tom_voz', 'estilo', e.target.value)}
                  data-testid="tom-voz-estilo"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-green-600">O que FAZEMOS</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Ex: Usamos linguagem simples..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItemToList('tom_voz', 'exemplos_fazer')}
                    />
                    <Button size="icon" variant="outline" onClick={() => addItemToList('tom_voz', 'exemplos_fazer')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {data.tom_voz.exemplos_fazer?.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        {item}
                        <button onClick={() => removeItemFromList('tom_voz', 'exemplos_fazer', i)} className="ml-auto">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-red-600">O que NÃO fazemos</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Ex: Nunca usamos gírias..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItemToList('tom_voz', 'exemplos_evitar')}
                    />
                    <Button size="icon" variant="outline" onClick={() => addItemToList('tom_voz', 'exemplos_evitar')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {data.tom_voz.exemplos_evitar?.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <X className="h-4 w-4 text-red-600" />
                        {item}
                        <button onClick={() => removeItemFromList('tom_voz', 'exemplos_evitar', i)} className="ml-auto">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comportamentos */}
        <TabsContent value="comportamentos">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-500" />
                    Comportamentos
                  </CardTitle>
                  <CardDescription>Como a marca age no dia a dia</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateAISuggestions('comportamentos')}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Sugerir com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Comportamentos Internos (com colaboradores)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Ex: Feedback constante e construtivo..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItemToList('comportamentos', 'internos')}
                    />
                    <Button size="icon" variant="outline" onClick={() => addItemToList('comportamentos', 'internos')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {data.comportamentos.internos?.map((item, i) => (
                      <Badge key={i} variant="secondary" className="mr-1 mb-1">
                        {item}
                        <button onClick={() => removeItemFromList('comportamentos', 'internos', i)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Comportamentos Externos (com clientes)</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Ex: Resposta em até 24h..."
                      value={newItem}
                      onChange={(e) => setNewItem(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItemToList('comportamentos', 'externos')}
                    />
                    <Button size="icon" variant="outline" onClick={() => addItemToList('comportamentos', 'externos')}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {data.comportamentos.externos?.map((item, i) => (
                      <Badge key={i} variant="secondary" className="mr-1 mb-1">
                        {item}
                        <button onClick={() => removeItemFromList('comportamentos', 'externos', i)} className="ml-1">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <Label>Rituais da Marca</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Ex: Reunião semanal de alinhamento, celebração de conquistas..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addItemToList('comportamentos', 'rituais')}
                  />
                  <Button size="icon" variant="outline" onClick={() => addItemToList('comportamentos', 'rituais')}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.comportamentos.rituais?.map((item, i) => (
                    <Badge key={i} variant="outline" className="pr-1">
                      {item}
                      <button onClick={() => removeItemFromList('comportamentos', 'rituais', i)} className="ml-1">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promessa */}
        <TabsContent value="promessa">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Promessa de Marca
                  </CardTitle>
                  <CardDescription>O que sua marca entrega ao cliente</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => generateAISuggestions('promessa')}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Sugerir com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Declaração de Promessa</Label>
                <Textarea
                  placeholder="A promessa central que sua marca faz ao cliente..."
                  value={data.promessa.declaracao}
                  onChange={(e) => updateField('promessa', 'declaracao', e.target.value)}
                  className="min-h-[80px]"
                  data-testid="promessa-declaracao"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Entrega Funcional</Label>
                  <Textarea
                    placeholder="O que o cliente recebe concretamente?"
                    value={data.promessa.funcional}
                    onChange={(e) => updateField('promessa', 'funcional', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Entrega Emocional</Label>
                  <Textarea
                    placeholder="Como o cliente se sente?"
                    value={data.promessa.emocional}
                    onChange={(e) => updateField('promessa', 'emocional', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Entrega Aspiracional</Label>
                  <Textarea
                    placeholder="O que o cliente pode se tornar?"
                    value={data.promessa.aspiracional}
                    onChange={(e) => updateField('promessa', 'aspiracional', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Insights Section */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Dica do Mentor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O "Jeito de Ser" é o DNA da sua marca. Preencha cada dimensão com autenticidade - 
            não existe certo ou errado, existe o que é verdadeiro para sua empresa. 
            Use o botão "Sugerir com IA" para receber inspirações, mas sempre adapte à sua realidade.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
