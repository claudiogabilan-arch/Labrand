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
import { toast } from 'sonner';
import { 
  Heart, 
  Plus, 
  X, 
  Loader2, 
  Sparkles, 
  Save,
  ArrowRight,
  Lightbulb
} from 'lucide-react';

export const PillarValues = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight } = useBrand();
  const [data, setData] = useState({
    valores: [],
    necessidades: [],
    cruzamento: [],
    insights_ia: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newValor, setNewValor] = useState({ nome: '', descricao: '', prioridade: 'media' });
  const [newNecessidade, setNewNecessidade] = useState({ nome: '', publico: '', descricao: '' });
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (currentBrand?.brand_id) {
      loadData();
    }
  }, [currentBrand?.brand_id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const pillarData = await fetchPillar(currentBrand.brand_id, 'values');
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
        await updatePillar(currentBrand.brand_id, 'values', newData);
      } catch (error) {
        console.error('Autosave error:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1500);
  }, [currentBrand?.brand_id, updatePillar]);

  const addValor = () => {
    if (!newValor.nome.trim()) return;
    const newValores = [...data.valores, { ...newValor }];
    const newData = { ...data, valores: newValores };
    setData(newData);
    setNewValor({ nome: '', descricao: '', prioridade: 'media' });
    autoSave(newData);
  };

  const removeValor = (index) => {
    const newValores = data.valores.filter((_, i) => i !== index);
    const newData = { ...data, valores: newValores };
    setData(newData);
    autoSave(newData);
  };

  const addNecessidade = () => {
    if (!newNecessidade.nome.trim()) return;
    const newNecessidades = [...data.necessidades, { ...newNecessidade }];
    const newData = { ...data, necessidades: newNecessidades };
    setData(newData);
    setNewNecessidade({ nome: '', publico: '', descricao: '' });
    autoSave(newData);
  };

  const removeNecessidade = (index) => {
    const newNecessidades = data.necessidades.filter((_, i) => i !== index);
    const newData = { ...data, necessidades: newNecessidades };
    setData(newData);
    autoSave(newData);
  };

  const createCruzamento = (valorIndex, necessidadeIndex) => {
    const valor = data.valores[valorIndex];
    const necessidade = data.necessidades[necessidadeIndex];
    const exists = data.cruzamento.some(
      c => c.valor === valor.nome && c.necessidade === necessidade.nome
    );
    if (exists) {
      toast.info('Este cruzamento já existe');
      return;
    }
    const newCruzamento = [...data.cruzamento, {
      valor: valor.nome,
      necessidade: necessidade.nome,
      insight: ''
    }];
    const newData = { ...data, cruzamento: newCruzamento };
    setData(newData);
    autoSave(newData);
    toast.success('Cruzamento criado!');
  };

  const updateCruzamentoInsight = (index, insight) => {
    const newCruzamento = [...data.cruzamento];
    newCruzamento[index] = { ...newCruzamento[index], insight };
    const newData = { ...data, cruzamento: newCruzamento };
    setData(newData);
    autoSave(newData);
  };

  const removeCruzamento = (index) => {
    const newCruzamento = data.cruzamento.filter((_, i) => i !== index);
    const newData = { ...data, cruzamento: newCruzamento };
    setData(newData);
    autoSave(newData);
  };

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      const context = `
        Valores da marca: ${data.valores.map(v => v.nome).join(', ')}
        Necessidades dos públicos: ${data.necessidades.map(n => `${n.nome} (${n.publico})`).join(', ')}
        Cruzamentos existentes: ${data.cruzamento.map(c => `${c.valor} x ${c.necessidade}`).join(', ')}
      `;
      const result = await generateInsight(context, 'values', currentBrand.name);
      const newInsights = [...data.insights_ia, result.insight];
      const newData = { ...data, insights_ia: newInsights };
      setData(newData);
      autoSave(newData);
      toast.success('Insights gerados com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar insights');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePillar(currentBrand.brand_id, 'values', data);
      toast.success('Salvo com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  const calculateProgress = () => {
    let score = 0;
    if (data.valores.length > 0) score += 50;
    if (data.necessidades.length > 0) score += 50;
    return score;
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
    <div className="space-y-6" data-testid="pillar-values">
      <PillarNavigation />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500 flex items-center justify-center">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Valores</h1>
            <p className="text-muted-foreground">Valores da marca e necessidades dos públicos</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Valores da Marca</CardTitle>
            <CardDescription>Defina os valores fundamentais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>Nome do Valor</Label>
                <Input
                  value={newValor.nome}
                  onChange={(e) => setNewValor(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Inovação"
                  data-testid="valor-nome-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={newValor.descricao}
                  onChange={(e) => setNewValor(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descreva o valor..."
                  rows={2}
                  data-testid="valor-descricao-input"
                />
              </div>
              <Button onClick={addValor} className="w-full" data-testid="add-valor-btn">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Valor
              </Button>
            </div>
            <div className="space-y-2">
              {data.valores.map((valor, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                  <div className="flex-1">
                    <p className="font-medium">{valor.nome}</p>
                    {valor.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">{valor.descricao}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeValor(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Necessidades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Necessidades dos Públicos</CardTitle>
            <CardDescription>Identifique as necessidades emergentes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label>Necessidade</Label>
                <Input
                  value={newNecessidade.nome}
                  onChange={(e) => setNewNecessidade(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Praticidade"
                  data-testid="necessidade-nome-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Público</Label>
                <Input
                  value={newNecessidade.publico}
                  onChange={(e) => setNewNecessidade(prev => ({ ...prev, publico: e.target.value }))}
                  placeholder="Ex: Jovens profissionais"
                  data-testid="necessidade-publico-input"
                />
              </div>
              <Button onClick={addNecessidade} className="w-full" data-testid="add-necessidade-btn">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Necessidade
              </Button>
            </div>
            <div className="space-y-2">
              {data.necessidades.map((necessidade, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-card">
                  <div className="flex-1">
                    <p className="font-medium">{necessidade.nome}</p>
                    {necessidade.publico && (
                      <Badge variant="outline" className="mt-1">{necessidade.publico}</Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeNecessidade(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cruzamento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                Cruzamento Valores x Necessidades
              </CardTitle>
              <CardDescription>
                Clique em um valor e uma necessidade para criar um cruzamento
              </CardDescription>
            </div>
            <Button 
              onClick={handleGenerateInsights} 
              disabled={isGenerating || data.cruzamento.length === 0}
              variant="outline"
              data-testid="generate-insights-btn"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Insights com IA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.valores.length > 0 && data.necessidades.length > 0 ? (
            <div className="space-y-6">
              {/* Matrix */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 border bg-muted text-left text-sm">Valores / Necessidades</th>
                      {data.necessidades.map((n, i) => (
                        <th key={i} className="p-2 border bg-muted text-center text-sm">
                          {n.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.valores.map((v, vi) => (
                      <tr key={vi}>
                        <td className="p-2 border font-medium text-sm">{v.nome}</td>
                        {data.necessidades.map((n, ni) => {
                          const hasCruzamento = data.cruzamento.some(
                            c => c.valor === v.nome && c.necessidade === n.nome
                          );
                          return (
                            <td 
                              key={ni} 
                              className={`p-2 border text-center cursor-pointer transition-colors ${
                                hasCruzamento 
                                  ? 'bg-primary/10 text-primary' 
                                  : 'hover:bg-muted'
                              }`}
                              onClick={() => createCruzamento(vi, ni)}
                            >
                              {hasCruzamento ? '✓' : '+'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cruzamentos List */}
              {data.cruzamento.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Cruzamentos Criados</h4>
                  {data.cruzamento.map((c, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-card space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge>{c.valor}</Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline">{c.necessidade}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeCruzamento(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={c.insight}
                        onChange={(e) => updateCruzamentoInsight(index, e.target.value)}
                        placeholder="Registre o insight deste cruzamento..."
                        rows={2}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Adicione valores e necessidades para criar cruzamentos
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      {data.insights_ia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.insights_ia.map((insight, index) => (
                <div key={index} className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                  <p className="text-sm whitespace-pre-wrap">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PillarValues;
