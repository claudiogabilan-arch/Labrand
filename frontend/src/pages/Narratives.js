import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { BookOpen, Plus, X, Loader2, Clock, FileText, Scroll, Heart, Eye, Target, Calendar } from 'lucide-react';

export const Narratives = () => {
  const { currentBrand, fetchNarratives, createNarrative, updateNarrative } = useBrand();
  const [narratives, setNarratives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const [activeTab, setActiveTab] = useState('manifesto');
  const [newNarrative, setNewNarrative] = useState({
    tipo: 'historia',
    title: '',
    content: '',
    missao: '',
    visao: '',
    valores: [],
    marcos: []
  });
  const [newValor, setNewValor] = useState('');
  const [newMarco, setNewMarco] = useState({ data: '', titulo: '', descricao: '' });

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadNarratives();
    }
  }, [currentBrand?.brand_id]);

  const loadNarratives = async () => {
    setIsLoading(true);
    try {
      const data = await fetchNarratives(currentBrand.brand_id);
      setNarratives(data || []);
    } catch (error) {
      console.error('Error loading narratives:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addValor = () => {
    if (!newValor.trim()) return;
    setNewNarrative(prev => ({ ...prev, valores: [...prev.valores, newValor.trim()] }));
    setNewValor('');
  };

  const removeValor = (index) => {
    setNewNarrative(prev => ({ ...prev, valores: prev.valores.filter((_, i) => i !== index) }));
  };

  const addMarco = () => {
    if (!newMarco.titulo.trim()) return;
    setNewNarrative(prev => ({ ...prev, marcos: [...prev.marcos, { ...newMarco }] }));
    setNewMarco({ data: '', titulo: '', descricao: '' });
  };

  const removeMarco = (index) => {
    setNewNarrative(prev => ({ ...prev, marcos: prev.marcos.filter((_, i) => i !== index) }));
  };

  const handleCreateNarrative = async () => {
    if (!newNarrative.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }
    setIsCreating(true);
    try {
      const created = await createNarrative(currentBrand.brand_id, newNarrative);
      setNarratives(prev => [...prev, created]);
      setNewNarrative({
        tipo: 'historia',
        title: '',
        content: '',
        missao: '',
        visao: '',
        valores: [],
        marcos: []
      });
      setDialogOpen(false);
      toast.success('Narrativa criada!');
    } catch (error) {
      toast.error('Erro ao criar narrativa');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateNarrative = async (narrativeId, data) => {
    try {
      await updateNarrative(currentBrand.brand_id, narrativeId, data);
      setNarratives(prev => prev.map(n => n.narrative_id === narrativeId ? { ...n, ...data } : n));
      toast.success('Narrativa atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar narrativa');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentBrand) {
    return <div className="text-center py-12"><p className="text-muted-foreground">Selecione uma marca para continuar</p></div>;
  }

  const manifesto = narratives.find(n => n.tipo === 'manifesto');
  const historias = narratives.filter(n => n.tipo === 'historia');
  const contos = narratives.filter(n => n.tipo === 'conto');

  return (
    <div className="space-y-6" data-testid="narratives-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">História & Narrativas</h1>
            <p className="text-muted-foreground">Construa a história e manifesto da marca</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-narrative-btn">
              <Plus className="h-4 w-4 mr-2" />
              Nova Narrativa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Narrativa</DialogTitle>
              <DialogDescription>Crie uma nova história ou conto para a marca</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'manifesto', label: 'Manifesto', icon: Scroll },
                    { value: 'historia', label: 'História', icon: Clock },
                    { value: 'conto', label: 'Conto', icon: FileText }
                  ].map(tipo => {
                    const Icon = tipo.icon;
                    return (
                      <Button
                        key={tipo.value}
                        variant={newNarrative.tipo === tipo.value ? 'default' : 'outline'}
                        onClick={() => setNewNarrative(prev => ({ ...prev, tipo: tipo.value }))}
                        className="flex-1"
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {tipo.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newNarrative.title}
                  onChange={(e) => setNewNarrative(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título da narrativa"
                  data-testid="narrative-title-input"
                />
              </div>

              {newNarrative.tipo === 'manifesto' && (
                <>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Missão
                    </Label>
                    <Textarea
                      value={newNarrative.missao}
                      onChange={(e) => setNewNarrative(prev => ({ ...prev, missao: e.target.value }))}
                      placeholder="A missão da marca..."
                      rows={2}
                      data-testid="narrative-missao-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Visão
                    </Label>
                    <Textarea
                      value={newNarrative.visao}
                      onChange={(e) => setNewNarrative(prev => ({ ...prev, visao: e.target.value }))}
                      placeholder="A visão da marca..."
                      rows={2}
                      data-testid="narrative-visao-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Valores
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={newValor}
                        onChange={(e) => setNewValor(e.target.value)}
                        placeholder="Adicionar valor..."
                        onKeyPress={(e) => e.key === 'Enter' && addValor()}
                      />
                      <Button type="button" onClick={addValor} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newNarrative.valores.map((v, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {v}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => removeValor(i)} />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Conteúdo</Label>
                <Textarea
                  value={newNarrative.content}
                  onChange={(e) => setNewNarrative(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Escreva a narrativa..."
                  rows={6}
                  className="font-editorial"
                  data-testid="narrative-content-input"
                />
              </div>

              {newNarrative.tipo === 'historia' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Marcos da Linha do Tempo
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="date"
                      value={newMarco.data}
                      onChange={(e) => setNewMarco(prev => ({ ...prev, data: e.target.value }))}
                    />
                    <Input
                      value={newMarco.titulo}
                      onChange={(e) => setNewMarco(prev => ({ ...prev, titulo: e.target.value }))}
                      placeholder="Título do marco"
                    />
                    <Button type="button" onClick={addMarco} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {newNarrative.marcos.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 border rounded bg-muted/30">
                        <Badge variant="outline">{m.data || 'Sem data'}</Badge>
                        <span className="flex-1 text-sm">{m.titulo}</span>
                        <X className="h-4 w-4 cursor-pointer" onClick={() => removeMarco(i)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleCreateNarrative} disabled={isCreating} className="w-full" data-testid="create-narrative-btn">
                {isCreating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar Narrativa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="manifesto">Manifesto</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="contos">Contos & Histórias</TabsTrigger>
        </TabsList>

        <TabsContent value="manifesto" className="space-y-6">
          {manifesto ? (
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="font-editorial text-2xl">{manifesto.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {manifesto.missao && (
                  <div className="p-6 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="h-5 w-5 text-blue-600" />
                      <h3 className="font-heading font-semibold text-blue-900">Missão</h3>
                    </div>
                    <p className="font-editorial text-lg text-blue-800">{manifesto.missao}</p>
                  </div>
                )}
                {manifesto.visao && (
                  <div className="p-6 rounded-xl bg-purple-50 border border-purple-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-5 w-5 text-purple-600" />
                      <h3 className="font-heading font-semibold text-purple-900">Visão</h3>
                    </div>
                    <p className="font-editorial text-lg text-purple-800">{manifesto.visao}</p>
                  </div>
                )}
                {manifesto.valores?.length > 0 && (
                  <div className="p-6 rounded-xl bg-rose-50 border border-rose-100">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart className="h-5 w-5 text-rose-600" />
                      <h3 className="font-heading font-semibold text-rose-900">Valores</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {manifesto.valores.map((v, i) => (
                        <Badge key={i} className="bg-rose-200 text-rose-800 text-base px-4 py-1">{v}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {manifesto.content && (
                  <div className="p-6 border rounded-xl">
                    <p className="font-editorial text-lg leading-relaxed whitespace-pre-wrap">{manifesto.content}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Scroll className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum manifesto criado ainda</p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  setNewNarrative(prev => ({ ...prev, tipo: 'manifesto' }));
                  setDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Manifesto
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          {historias.length > 0 ? (
            <div className="relative">
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {historias.flatMap(h => h.marcos || []).sort((a, b) => new Date(a.data) - new Date(b.data)).map((marco, index) => (
                  <div key={index} className="relative flex gap-6 ml-4">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10">
                      <Clock className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <Card className="flex-1">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {marco.data ? new Date(marco.data).toLocaleDateString('pt-BR') : 'Sem data'}
                            </Badge>
                            <h4 className="font-heading font-semibold">{marco.titulo}</h4>
                            {marco.descricao && <p className="text-sm text-muted-foreground mt-1">{marco.descricao}</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum marco na linha do tempo</p>
                <Button variant="outline" className="mt-4" onClick={() => {
                  setNewNarrative(prev => ({ ...prev, tipo: 'historia' }));
                  setDialogOpen(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar História
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="contos" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...historias, ...contos].map(narrative => (
              <Card key={narrative.narrative_id} className="card-hover">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {narrative.tipo === 'historia' ? 'História' : 'Conto'}
                      </Badge>
                      <CardTitle className="font-heading">{narrative.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {narrative.content && (
                    <p className="text-sm text-muted-foreground line-clamp-4 font-editorial">
                      {narrative.content}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {historias.length === 0 && contos.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma história ou conto criado</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Narratives;
