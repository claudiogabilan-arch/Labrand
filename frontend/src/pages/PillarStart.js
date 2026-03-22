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
  Lightbulb,
  User,
  Package,
  Briefcase,
  Heart,
  Rocket,
  Building2,
  HandHeart,
  Music,
  CheckCircle2,
  ArrowRight,
  MapPin
} from 'lucide-react';

import { PillarNavigation } from '../components/PillarNavigation';

// Definição das finalidades de marca
const BRAND_PURPOSES = [
  { id: 'influencer', label: 'Influencer/Creator', icon: User, color: 'bg-pink-500', description: 'Personal branding e criação de conteúdo' },
  { id: 'produto', label: 'Produto', icon: Package, color: 'bg-blue-500', description: 'Marca de produto físico ou digital' },
  { id: 'servico', label: 'Serviço', icon: Briefcase, color: 'bg-green-500', description: 'Prestação de serviços B2B ou B2C' },
  { id: 'comunidade', label: 'Comunidade', icon: Heart, color: 'bg-purple-500', description: 'Movimentos, clubes, associações' },
  { id: 'startup', label: 'Startup', icon: Rocket, color: 'bg-orange-500', description: 'Empresa em fase inicial de crescimento' },
  { id: 'corporativo', label: 'Corporativo', icon: Building2, color: 'bg-slate-500', description: 'Empresa estabelecida no mercado' },
  { id: 'ong', label: 'ONG/Social', icon: HandHeart, color: 'bg-teal-500', description: 'Organização sem fins lucrativos' },
  { id: 'artista', label: 'Artista/Entretenimento', icon: Music, color: 'bg-red-500', description: 'Músicos, artistas, entretenimento' },
];

// Trilhas de módulos por finalidade
const TRACK_RECOMMENDATIONS = {
  influencer: {
    priority: ['personalidade', 'tom_voz', 'audiencia', 'narrativas', 'proposito'],
    description: 'Foco em construir uma marca pessoal autêntica e engajadora',
    tips: [
      'Defina seu arquétipo de personalidade para criar consistência',
      'Estabeleça um tom de voz único que ressoe com sua audiência',
      'Mapeie sua audiência ideal e onde encontrá-la',
      'Crie narrativas que conectem sua história pessoal ao valor que entrega'
    ]
  },
  produto: {
    priority: ['posicionamento', 'promessa', 'valores', 'valuation', 'benchmark'],
    description: 'Foco em diferenciação de mercado e proposta de valor clara',
    tips: [
      'Posicione seu produto claramente contra concorrentes',
      'Defina uma promessa de marca que seja entregável e memorável',
      'Use o benchmark para entender seu espaço competitivo',
      'Calcule o valuation para decisões estratégicas de pricing'
    ]
  },
  servico: {
    priority: ['valores', 'proposito', 'comportamentos', 'promessa', 'audiencia'],
    description: 'Foco em confiança, experiência do cliente e relacionamento',
    tips: [
      'Valores fortes são essenciais para serviços - clientes compram confiança',
      'Defina comportamentos claros para toda a equipe',
      'A promessa de serviço deve ser experiencial, não apenas funcional',
      'Mapeie a jornada emocional do seu cliente'
    ]
  },
  comunidade: {
    priority: ['proposito', 'valores', 'narrativas', 'jeito_de_ser', 'comportamentos'],
    description: 'Foco em propósito compartilhado e senso de pertencimento',
    tips: [
      'O propósito é o coração de uma comunidade - seja inspirador',
      'Valores compartilhados criam identidade de grupo',
      'Narrativas fortalecem o senso de pertencimento',
      'Rituais e comportamentos definem a cultura da comunidade'
    ]
  },
  startup: {
    priority: ['posicionamento', 'valuation', 'proposito', 'promessa', 'benchmark'],
    description: 'Foco em diferenciação, escalabilidade e atração de investimento',
    tips: [
      'Posicionamento claro é crucial para se destacar em mercados disputados',
      'Valuation ajuda a preparar para rodadas de investimento',
      'Propósito forte atrai talentos e investidores alinhados',
      'Use benchmark para validar oportunidade de mercado'
    ]
  },
  corporativo: {
    priority: ['valores', 'jeito_de_ser', 'comportamentos', 'valuation', 'benchmark'],
    description: 'Foco em cultura organizacional, governança e valor de marca',
    tips: [
      'Valores bem definidos guiam decisões em toda a organização',
      'O "Jeito de Ser" cria consistência em todas as interações',
      'Comportamentos codificam a cultura desejada',
      'Valuation demonstra o impacto estratégico da marca'
    ]
  },
  ong: {
    priority: ['proposito', 'narrativas', 'valores', 'audiencia', 'comportamentos'],
    description: 'Foco em causa, impacto social e engajamento de stakeholders',
    tips: [
      'Propósito é tudo para uma ONG - seja claro e inspirador',
      'Narrativas de impacto são essenciais para captação',
      'Valores devem refletir a mudança que você quer ver',
      'Mapeie todos os stakeholders: doadores, beneficiários, parceiros'
    ]
  },
  artista: {
    priority: ['personalidade', 'narrativas', 'tom_voz', 'audiencia', 'promessa'],
    description: 'Foco em autenticidade artística e conexão emocional',
    tips: [
      'Sua personalidade É sua marca - seja autêntico',
      'Narrativas contam sua jornada artística',
      'Tom de voz deve refletir sua arte',
      'Conecte-se emocionalmente com sua audiência'
    ]
  }
};

const MODULE_LABELS = {
  proposito: 'Propósito',
  valores: 'Valores', 
  personalidade: 'Personalidade',
  tom_voz: 'Tom de Voz',
  posicionamento: 'Posicionamento',
  promessa: 'Promessa',
  comportamentos: 'Comportamentos',
  audiencia: 'Audiência',
  narrativas: 'Narrativas',
  valuation: 'Valuation',
  benchmark: 'Benchmark',
  jeito_de_ser: 'Jeito de Ser'
};

const MODULE_ROUTES = {
  proposito: '/pillars/purpose',
  valores: '/pillars/values',
  personalidade: '/pillars/personality',
  tom_voz: '/brand-way',
  posicionamento: '/pillars/positioning',
  promessa: '/pillars/promise',
  comportamentos: '/brand-way',
  audiencia: '/audience',
  narrativas: '/narratives',
  valuation: '/valuation',
  benchmark: '/benchmark',
  jeito_de_ser: '/brand-way'
};

export const PillarStart = () => {
  const { currentBrand, fetchPillar, updatePillar, generateInsight } = useBrand();
  const [data, setData] = useState({
    finalidade_marca: '',
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
  const [activeTab, setActiveTab] = useState('finalidade');
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

  // Se já tem finalidade definida, ir direto para canvas
  useEffect(() => {
    if (data.finalidade_marca && activeTab === 'finalidade') {
      // Manter na aba finalidade para permitir alteração
    }
  }, [data.finalidade_marca]);

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
        // Se já tem finalidade, mostrar o roadmap
        if (pillarData.finalidade_marca) {
          setActiveTab('roadmap');
        }
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

  const handlePurposeSelect = (purposeId) => {
    const newData = { ...data, finalidade_marca: purposeId };
    setData(newData);
    autoSave(newData);
    toast.success('Finalidade selecionada! Veja seu roadmap personalizado.');
    setActiveTab('roadmap');
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
        Finalidade: ${data.finalidade_marca}
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
    const fields = ['finalidade_marca', 'desafio', 'background', 'urgencia', 'cenario_competitivo'];
    const listFields = ['players', 'tendencias', 'publicos_interesse'];
    let filled = 0;
    let total = fields.length + listFields.length + 4;

    fields.forEach(f => { if (data[f]) filled++; });
    listFields.forEach(f => { if (data[f]?.length > 0) filled++; });
    Object.values(data.cenarios || {}).forEach(v => { if (v) filled++; });

    return Math.round((filled / total) * 100);
  };

  const selectedPurpose = BRAND_PURPOSES.find(p => p.id === data.finalidade_marca);
  const trackData = TRACK_RECOMMENDATIONS[data.finalidade_marca];

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
      <PillarNavigation />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
            <Target className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Pilar Start</h1>
            <p className="text-muted-foreground">Diagnóstico inicial e definição de trilha</p>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="finalidade" data-testid="tab-finalidade">
            <MapPin className="h-4 w-4 mr-2" />
            Finalidade
          </TabsTrigger>
          <TabsTrigger value="roadmap" data-testid="tab-roadmap" disabled={!data.finalidade_marca}>
            <Target className="h-4 w-4 mr-2" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="canvas" data-testid="tab-canvas">Canvas</TabsTrigger>
          <TabsTrigger value="cenarios" data-testid="tab-cenarios">Cenários</TabsTrigger>
          <TabsTrigger value="incertezas" data-testid="tab-incertezas">Incertezas</TabsTrigger>
        </TabsList>

        {/* FINALIDADE TAB */}
        <TabsContent value="finalidade" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Qual é a finalidade da sua marca?</CardTitle>
              <CardDescription>
                Selecione o tipo que melhor descreve sua marca. Isso nos ajudará a criar uma trilha personalizada de módulos prioritários.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {BRAND_PURPOSES.map((purpose) => {
                  const Icon = purpose.icon;
                  const isSelected = data.finalidade_marca === purpose.id;
                  return (
                    <button
                      key={purpose.id}
                      onClick={() => handlePurposeSelect(purpose.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-md ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      data-testid={`purpose-${purpose.id}`}
                    >
                      <div className={`w-10 h-10 rounded-lg ${purpose.color} flex items-center justify-center mb-3`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-semibold mb-1">{purpose.label}</h3>
                      <p className="text-sm text-muted-foreground">{purpose.description}</p>
                      {isSelected && (
                        <Badge className="mt-2" variant="default">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Selecionado
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ROADMAP TAB */}
        <TabsContent value="roadmap" className="space-y-6">
          {selectedPurpose && trackData && (
            <>
              {/* Header da Trilha */}
              <Card className={`border-2 ${selectedPurpose.color.replace('bg-', 'border-')}/30`}>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${selectedPurpose.color} flex items-center justify-center`}>
                      <selectedPurpose.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Trilha: {selectedPurpose.label}</CardTitle>
                      <CardDescription className="text-base">{trackData.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Roadmap Visual */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Seu Roadmap Personalizado
                  </CardTitle>
                  <CardDescription>
                    Siga esta ordem de módulos para máximo impacto na sua marca
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {trackData.priority.map((moduleId, index) => (
                      <div key={moduleId} className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-primary' : index < 3 ? 'bg-primary/70' : 'bg-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <a 
                            href={MODULE_ROUTES[moduleId]}
                            className="font-medium hover:text-primary transition-colors flex items-center gap-2"
                          >
                            {MODULE_LABELS[moduleId]}
                            <ArrowRight className="h-4 w-4" />
                          </a>
                          {index === 0 && (
                            <Badge variant="secondary" className="mt-1">Comece aqui</Badge>
                          )}
                        </div>
                        {index < trackData.priority.length - 1 && (
                          <div className="hidden sm:block w-px h-8 bg-border absolute left-5 mt-12" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dicas da Trilha */}
              <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Lightbulb className="h-5 w-5" />
                    Dicas para {selectedPurpose.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {trackData.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <span className="text-amber-900 dark:text-amber-100">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button 
                  size="lg" 
                  onClick={() => window.location.href = MODULE_ROUTES[trackData.priority[0]]}
                  className="gap-2"
                >
                  Começar Trilha
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        {/* CANVAS TAB - Original content */}
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
                      item.startsWith('[IA]') ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' : 'bg-muted/50'
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
