import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { 
  Shield, AlertTriangle, CheckCircle2, Clock, Plus, Trash2,
  Loader2, FileText, Palette, Users, MessageCircle, Globe, 
  Rocket, ChevronRight, Download
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_ICONS = {
  brand_identity: Palette,
  naming_legal: Shield,
  market_validation: Users,
  communication: MessageCircle,
  digital_presence: Globe,
  crisis_preparation: AlertTriangle,
  launch_operations: Rocket
};

const STATUS_COLORS = {
  in_progress: "bg-blue-500",
  almost_ready: "bg-amber-500",
  completed: "bg-green-500"
};

const RISK_COLORS = {
  green: "bg-green-500 text-green-50",
  yellow: "bg-amber-500 text-amber-50",
  orange: "bg-orange-500 text-orange-50",
  red: "bg-red-500 text-red-50"
};

export default function DisasterCheck() {
  const { token } = useAuth();
  const { currentBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState(null);
  const [checks, setChecks] = useState([]);
  const [selectedCheck, setSelectedCheck] = useState(null);
  const [report, setReport] = useState(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [newCheck, setNewCheck] = useState({ name: '', launch_type: 'brand', launch_date: '', notes: '' });

  useEffect(() => {
    loadTemplate();
  }, []);

  useEffect(() => {
    if (currentBrand) loadChecks();
  }, [currentBrand]);

  const loadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/disaster-check/template`);
      setTemplate(res.data);
    } catch (error) {
      console.error('Error loading template');
    }
  };

  const loadChecks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/disaster-checks`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setChecks(res.data.checks || []);
    } catch (error) {
      console.error('Error loading checks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCheck = async () => {
    try {
      const res = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/disaster-checks`,
        newCheck,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Disaster Check criado!');
      setCreateDialog(false);
      setNewCheck({ name: '', launch_type: 'brand', launch_date: '', notes: '' });
      loadChecks();
      setSelectedCheck(res.data.check);
    } catch (error) {
      toast.error('Erro ao criar check');
    }
  };

  const handleSelectCheck = async (check) => {
    setSelectedCheck(check);
    // Load report
    try {
      const res = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/disaster-checks/${check.check_id}/report`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setReport(res.data);
    } catch (error) {
      console.error('Error loading report');
    }
  };

  const handleToggleItem = async (categoryId, itemId, completed) => {
    if (!selectedCheck) return;
    
    try {
      const res = await axios.put(
        `${API}/brands/${currentBrand.brand_id}/disaster-checks/${selectedCheck.check_id}/item?category_id=${categoryId}`,
        { item_id: itemId, completed },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update local state
      setSelectedCheck(prev => ({
        ...prev,
        completion_percentage: res.data.completion_percentage,
        risk_score: res.data.risk_score,
        status: res.data.status,
        checklist: {
          ...prev.checklist,
          [categoryId]: {
            ...prev.checklist[categoryId],
            items: {
              ...prev.checklist[categoryId].items,
              [itemId]: { completed, notes: '' }
            }
          }
        }
      }));
      
      // Update report
      handleSelectCheck({ ...selectedCheck, check_id: selectedCheck.check_id });
    } catch (error) {
      toast.error('Erro ao atualizar item');
    }
  };

  const handleDeleteCheck = async (checkId) => {
    if (!window.confirm('Excluir este Disaster Check?')) return;
    
    try {
      await axios.delete(
        `${API}/brands/${currentBrand.brand_id}/disaster-checks/${checkId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      toast.success('Check excluído');
      setSelectedCheck(null);
      setReport(null);
      loadChecks();
    } catch (error) {
      toast.error('Erro ao excluir check');
    }
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca primeiro</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="disaster-check-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Disaster Check</h1>
            <p className="text-muted-foreground">Verificação de risco antes de lançamentos</p>
          </div>
        </div>
        <Button onClick={() => setCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Check
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Checks List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Seus Checks</CardTitle>
          </CardHeader>
          <CardContent>
            {checks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum check criado</p>
                <p className="text-sm">Crie um para verificar riscos de lançamento</p>
              </div>
            ) : (
              <div className="space-y-2">
                {checks.map(check => (
                  <div
                    key={check.check_id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedCheck?.check_id === check.check_id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleSelectCheck(check)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium truncate">{check.name}</span>
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[check.status]}`} />
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{check.completion_percentage}% completo</span>
                      <Badge variant="outline">{check.launch_type}</Badge>
                    </div>
                    <Progress value={check.completion_percentage} className="h-1 mt-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check Details */}
        <Card className="lg:col-span-2">
          {!selectedCheck ? (
            <CardContent className="py-16 text-center text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Selecione um check para ver os detalhes</p>
              <p className="text-sm">Ou crie um novo check de lançamento</p>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedCheck.name}</CardTitle>
                    <CardDescription>
                      {template?.launch_types?.find(t => t.id === selectedCheck.launch_type)?.name}
                      {selectedCheck.launch_date && ` - ${new Date(selectedCheck.launch_date).toLocaleDateString('pt-BR')}`}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={RISK_COLORS[report?.recommendation?.status || 'red']}>
                      Risco: {selectedCheck.risk_score}%
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleDeleteCheck(selectedCheck.check_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Recommendation */}
                {report?.recommendation && (
                  <Card className={`border-2 ${RISK_COLORS[report.recommendation.status]}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        {report.recommendation.status === 'green' ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <AlertTriangle className="h-6 w-6" />
                        )}
                        <div>
                          <p className="font-bold">{report.recommendation.title}</p>
                          <p className="text-sm opacity-90">{report.recommendation.message}</p>
                          <p className="text-sm font-medium mt-2">{report.recommendation.action}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Critical Items */}
                {report?.critical_items?.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Itens Críticos Pendentes
                    </h4>
                    <ul className="space-y-1">
                      {report.critical_items.slice(0, 5).map((item, idx) => (
                        <li key={idx} className="text-sm text-red-700 dark:text-red-300">
                          • {item.item} <span className="opacity-60">({item.category})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Categories Summary */}
                {report?.categories_summary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {report.categories_summary.map(cat => {
                      const Icon = CATEGORY_ICONS[cat.id] || Shield;
                      return (
                        <div key={cat.id} className="p-3 border rounded-lg text-center">
                          <Icon className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground truncate">{cat.name}</p>
                          <p className="text-lg font-bold">{cat.percentage}%</p>
                          <p className="text-xs text-muted-foreground">{cat.completed}/{cat.total}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Checklist */}
                <Tabs defaultValue={Object.keys(template?.categories || {})[0]}>
                  <TabsList className="flex-wrap h-auto">
                    {Object.entries(template?.categories || {}).map(([catId, cat]) => (
                      <TabsTrigger key={catId} value={catId} className="text-xs">
                        {cat.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(template?.categories || {}).map(([catId, cat]) => {
                    const Icon = CATEGORY_ICONS[catId] || Shield;
                    const catData = selectedCheck.checklist?.[catId]?.items || {};
                    
                    return (
                      <TabsContent key={catId} value={catId}>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b">
                            <Icon className="h-5 w-5 text-primary" />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          {cat.items.map(item => {
                            const isCompleted = catData[item.id]?.completed || false;
                            return (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 p-2 rounded hover:bg-muted/50"
                              >
                                <Checkbox
                                  id={`${catId}-${item.id}`}
                                  checked={isCompleted}
                                  onCheckedChange={(checked) => handleToggleItem(catId, item.id, checked)}
                                />
                                <div className="flex-1">
                                  <label
                                    htmlFor={`${catId}-${item.id}`}
                                    className={`text-sm cursor-pointer ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
                                  >
                                    {item.text}
                                  </label>
                                  {item.weight >= 3 && !isCompleted && (
                                    <Badge variant="destructive" className="ml-2 text-xs">Crítico</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Disaster Check</DialogTitle>
            <DialogDescription>
              Crie um checklist para verificar riscos antes de um lançamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Check</Label>
              <Input
                placeholder="Ex: Lançamento Produto X"
                value={newCheck.name}
                onChange={(e) => setNewCheck({...newCheck, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Lançamento</Label>
              <Select
                value={newCheck.launch_type}
                onValueChange={(v) => setNewCheck({...newCheck, launch_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {template?.launch_types?.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Lançamento (opcional)</Label>
              <Input
                type="date"
                value={newCheck.launch_date}
                onChange={(e) => setNewCheck({...newCheck, launch_date: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreateCheck} disabled={!newCheck.name}>Criar Check</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
