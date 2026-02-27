import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Slider } from '../components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Loader2, TrendingUp, TrendingDown, Minus, Info, Plus, Users, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// Dados de benchmark por setor (médias de mercado)
const SECTOR_BENCHMARKS = {
  'tecnologia': { brandStrength: 68, rbi: 45, valuation_multiplier: 8.5 },
  'saúde': { brandStrength: 72, rbi: 55, valuation_multiplier: 6.2 },
  'educação': { brandStrength: 65, rbi: 50, valuation_multiplier: 5.8 },
  'varejo': { brandStrength: 58, rbi: 35, valuation_multiplier: 4.2 },
  'serviços financeiros': { brandStrength: 75, rbi: 60, valuation_multiplier: 7.5 },
  'indústria': { brandStrength: 55, rbi: 30, valuation_multiplier: 3.8 },
  'consultoria': { brandStrength: 70, rbi: 65, valuation_multiplier: 6.0 },
  'default': { brandStrength: 60, rbi: 40, valuation_multiplier: 5.0 }
};

const InfoTooltip = ({ content }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <Info className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help" />
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-sm">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const PositionBadge = ({ value, benchmark }) => {
  const diff = value - benchmark;
  if (diff >= 10) return <Badge className="bg-green-600">Acima da média</Badge>;
  if (diff <= -10) return <Badge variant="destructive">Abaixo da média</Badge>;
  return <Badge variant="secondary">Na média</Badge>;
};

export default function Benchmark() {
  const { currentBrand, pillars } = useBrand();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', segment: '', region: '' });
  const [editingGroup, setEditingGroup] = useState(null);
  const [newCompetitor, setNewCompetitor] = useState({ name: '', strength: 50, rbi: 50 });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBrand) return;
      setLoading(true);
      try {
        const [benchRes, groupsRes] = await Promise.all([
          fetch(`${API}/api/brands/${currentBrand.brand_id}/benchmark`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API}/api/brands/${currentBrand.brand_id}/competitor-groups`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        if (benchRes.ok) setData(await benchRes.json());
        if (groupsRes.ok) {
          const gData = await groupsRes.json();
          setGroups(gData.groups || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentBrand, token]);

  const handleCreateGroup = async () => {
    if (!newGroup.name) return;
    try {
      const res = await axios.post(
        `${API}/api/brands/${currentBrand.brand_id}/competitor-groups?name=${encodeURIComponent(newGroup.name)}&segment=${encodeURIComponent(newGroup.segment)}&region=${encodeURIComponent(newGroup.region)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setGroups([...groups, res.data]);
      setShowNewGroup(false);
      setNewGroup({ name: '', segment: '', region: '' });
      toast.success('Grupo criado com sucesso!');
    } catch (err) {
      toast.error('Erro ao criar grupo. Tente novamente.');
    }
  };

  const handleAddCompetitor = async () => {
    if (!editingGroup || !newCompetitor.name) return;
    const updated = [...(editingGroup.competitors || []), { ...newCompetitor, id: Date.now() }];
    try {
      await axios.put(
        `${API}/api/brands/${currentBrand.brand_id}/competitor-groups/${editingGroup.group_id}`,
        updated,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }}
      );
      setGroups(groups.map(g => g.group_id === editingGroup.group_id ? { ...g, competitors: updated } : g));
      setEditingGroup({ ...editingGroup, competitors: updated });
      setNewCompetitor({ name: '', strength: 50, rbi: 50 });
      toast.success('Concorrente adicionado!');
    } catch (err) {
      toast.error('Erro ao adicionar concorrente. Tente novamente.');
    }
  };

  const handleRemoveCompetitor = async (compId) => {
    const updated = editingGroup.competitors.filter(c => c.id !== compId);
    try {
      await axios.put(
        `${API}/api/brands/${currentBrand.brand_id}/competitor-groups/${editingGroup.group_id}`,
        updated,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }}
      );
      setGroups(groups.map(g => g.group_id === editingGroup.group_id ? { ...g, competitors: updated } : g));
      setEditingGroup({ ...editingGroup, competitors: updated });
    } catch (err) {
      toast.error('Erro ao remover concorrente. Tente novamente.');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      await axios.delete(
        `${API}/api/brands/${currentBrand.brand_id}/competitor-groups/${groupId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setGroups(groups.filter(g => g.group_id !== groupId));
      toast.success('Grupo removido com sucesso');
    } catch (err) {
      toast.error('Erro ao remover grupo. Tente novamente.');
    }
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca para ver o benchmark.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const sector = data?.sector || 'Não definido';
  const benchmark = SECTOR_BENCHMARKS[sector.toLowerCase()] || SECTOR_BENCHMARKS.default;
  const brandStrength = data?.brand_strength || 0;
  const rbi = data?.rbi;
  const percentile = data?.percentile || 0;
  const hasData = data?.has_data !== false;

  if (!hasData) {
    return (
      <TooltipProvider>
        <div className="space-y-6" data-testid="benchmark-page">
          <div>
            <h1 className="text-2xl font-bold">Benchmark Setorial</h1>
            <p className="text-muted-foreground">Comparação com o setor</p>
          </div>
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Sem dados para benchmark</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {data?.message || "Preencha os pilares da marca para gerar o benchmark setorial."}
              </p>
              <Button onClick={() => window.location.href = '/pillars/start'}>
                Preencher Pilares
              </Button>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6" data-testid="benchmark-page">
        <div>
          <h1 className="text-2xl font-bold">Benchmark Setorial</h1>
          <p className="text-muted-foreground">Comparação com o setor: <Badge variant="outline">{sector}</Badge></p>
          <p className="text-xs text-muted-foreground mt-1">
            {data?.message || `Baseado em ${data?.pillars_filled || 0}/${data?.pillars_total || 7} pilares preenchidos`}
          </p>
        </div>

        {/* Percentil */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Posição no Mercado
              <InfoTooltip content="Indica em qual percentil sua marca se encontra em relação às demais do setor. Percentil 75 significa que você está melhor que 75% das marcas." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <span className="text-6xl font-bold">{percentile}º</span>
              <span className="text-2xl text-muted-foreground ml-2">percentil</span>
            </div>
            <p className="text-center text-muted-foreground mt-2">
              Sua marca está à frente de {percentile}% das marcas do setor
            </p>
          </CardContent>
        </Card>

        {/* Comparativos */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Brand Strength Score
                  <InfoTooltip content="Mede a consistência e força dos pilares estratégicos da marca. Impacta diretamente a capacidade de comando de preço premium e retenção de clientes." />
                </span>
                <PositionBadge value={brandStrength} benchmark={benchmark.brandStrength} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Sua marca</span>
                  <span className="font-bold">{brandStrength}</span>
                </div>
                <Progress value={brandStrength} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Média do setor</span>
                  <span>{benchmark.brandStrength}</span>
                </div>
                <Progress value={benchmark.brandStrength} className="h-3 opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {brandStrength >= benchmark.brandStrength 
                  ? `+${brandStrength - benchmark.brandStrength} pontos acima da média`
                  : `${benchmark.brandStrength - brandStrength} pontos abaixo da média`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Role of Brand Index (RBI)
                  <InfoTooltip content="Percentual da decisão de compra atribuída à marca. Quanto maior, mais a marca influencia a escolha do cliente, reduzindo dependência de preço." />
                </span>
                <PositionBadge value={rbi} benchmark={benchmark.rbi} />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Sua marca</span>
                  <span className="font-bold">{rbi}%</span>
                </div>
                <Progress value={rbi} className="h-3" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Média do setor</span>
                  <span>{benchmark.rbi}%</span>
                </div>
                <Progress value={benchmark.rbi} className="h-3 opacity-50" />
              </div>
              <p className="text-sm text-muted-foreground">
                {rbi >= benchmark.rbi 
                  ? `+${rbi - benchmark.rbi}% acima da média`
                  : `${benchmark.rbi - rbi}% abaixo da média`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Implicação Estratégica */}
        <Card>
          <CardHeader>
            <CardTitle>Implicação Estratégica</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {brandStrength < benchmark.brandStrength && (
                <li className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <TrendingDown className="h-5 w-5 text-red-500 mt-0.5" />
                  <span>Brand Strength abaixo da média setorial indica vulnerabilidade competitiva. Priorize fortalecimento dos pilares estratégicos.</span>
                </li>
              )}
              {rbi < benchmark.rbi && (
                <li className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <Minus className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <span>RBI abaixo da média sugere dependência excessiva de preço. Investir em diferenciação de marca pode aumentar margem.</span>
                </li>
              )}
              {brandStrength >= benchmark.brandStrength && rbi >= benchmark.rbi && (
                <li className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                  <span>Marca acima da média do setor. Considere estratégias de expansão e premium pricing.</span>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Competitor Groups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Grupos de Concorrentes
                </CardTitle>
                <CardDescription>Compare sua marca com concorrentes específicos</CardDescription>
              </div>
              <Button onClick={() => setShowNewGroup(true)}>
                <Plus className="h-4 w-4 mr-2" /> Novo Grupo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Crie grupos de concorrentes para comparações personalizadas
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groups.map(group => (
                  <Card key={group.group_id} className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{group.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setEditingGroup(group)}>
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteGroup(group.group_id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      {(group.segment || group.region) && (
                        <div className="flex gap-2">
                          {group.segment && <Badge variant="outline" className="text-xs">{group.segment}</Badge>}
                          {group.region && <Badge variant="outline" className="text-xs">{group.region}</Badge>}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="pt-2">
                      {(group.competitors || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum concorrente</p>
                      ) : (
                        <div className="space-y-2">
                          {/* My brand */}
                          <div className="flex items-center justify-between p-2 bg-primary/10 rounded">
                            <span className="font-medium text-sm">{data?.brand_name || 'Minha marca'}</span>
                            <div className="flex gap-3 text-xs">
                              <span>Força: {brandStrength}</span>
                              <span>RBI: {rbi}%</span>
                            </div>
                          </div>
                          {/* Competitors */}
                          {group.competitors.map(comp => (
                            <div key={comp.id} className="flex items-center justify-between p-2 bg-muted rounded">
                              <span className="text-sm">{comp.name}</span>
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>Força: {comp.strength}</span>
                                <span>RBI: {comp.rbi}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* New Group Dialog */}
        <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Grupo de Concorrentes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Grupo *</Label>
                <Input 
                  placeholder="Ex: Concorrentes Diretos SP"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Segmento</Label>
                  <Input 
                    placeholder="Ex: Premium"
                    value={newGroup.segment}
                    onChange={(e) => setNewGroup({...newGroup, segment: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Região</Label>
                  <Input 
                    placeholder="Ex: São Paulo"
                    value={newGroup.region}
                    onChange={(e) => setNewGroup({...newGroup, region: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewGroup(false)}>Cancelar</Button>
              <Button onClick={handleCreateGroup}>Criar Grupo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar: {editingGroup?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Add competitor form */}
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <Label>Adicionar Concorrente</Label>
                <Input 
                  placeholder="Nome do concorrente"
                  value={newCompetitor.name}
                  onChange={(e) => setNewCompetitor({...newCompetitor, name: e.target.value})}
                />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Brand Strength</span>
                    <span>{newCompetitor.strength}</span>
                  </div>
                  <Slider 
                    value={[newCompetitor.strength]} 
                    onValueChange={([v]) => setNewCompetitor({...newCompetitor, strength: v})}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>RBI (%)</span>
                    <span>{newCompetitor.rbi}%</span>
                  </div>
                  <Slider 
                    value={[newCompetitor.rbi]} 
                    onValueChange={([v]) => setNewCompetitor({...newCompetitor, rbi: v})}
                    max={100}
                  />
                </div>
                <Button onClick={handleAddCompetitor} className="w-full" size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>
              </div>

              {/* Competitors list */}
              <div className="space-y-2">
                <Label>Concorrentes no grupo</Label>
                {(editingGroup?.competitors || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum concorrente ainda</p>
                ) : (
                  <div className="space-y-2">
                    {editingGroup?.competitors.map(comp => (
                      <div key={comp.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-medium">{comp.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">
                            {comp.strength} | {comp.rbi}%
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveCompetitor(comp.id)}>
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setEditingGroup(null)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
