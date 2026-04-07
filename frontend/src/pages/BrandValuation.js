import { useState, useMemo, useEffect, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import {
  Loader2, ChevronRight, ChevronLeft, DollarSign, Heart, Shield, BarChart3,
  TrendingUp, Download, Save, Network, Package, Info,
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SECTORS = [
  { key: 'servicos', label: 'Servicos' },
  { key: 'saas', label: 'SaaS / Tech' },
  { key: 'varejo', label: 'Varejo' },
  { key: 'industria', label: 'Industria' },
  { key: 'saude', label: 'Saude' },
  { key: 'agro', label: 'Agro' },
  { key: 'educacao', label: 'Educacao' },
  { key: 'outro', label: 'Outro' },
];

const RBI_QUESTIONS = [
  { key: 'rbi_q1', title: 'Decisao de Compra', desc: 'Quanto a marca influencia a decisao de compra do cliente?' },
  { key: 'rbi_q2', title: 'Premio de Preco', desc: 'A marca permite cobrar mais que concorrentes equivalentes?' },
  { key: 'rbi_q3', title: 'Lealdade', desc: 'Clientes retornam por causa da marca (nao so por preco/conveniencia)?' },
  { key: 'rbi_q4', title: 'Atracao de Talentos', desc: 'A marca atrai e retem talentos melhores?' },
  { key: 'rbi_q5', title: 'Extensibilidade', desc: 'A marca pode entrar em novas categorias com credibilidade?' },
];

const BS_FACTORS = [
  { key: 'bs_clareza', title: 'Clareza', desc: 'Valores, posicionamento e proposta sao claros?' },
  { key: 'bs_comprom', title: 'Compromisso', desc: 'A organizacao investe na marca consistentemente?' },
  { key: 'bs_governa', title: 'Governanca', desc: 'Existe gestao e processos dedicados a marca?' },
  { key: 'bs_respons', title: 'Responsividade', desc: 'A marca se adapta as mudancas do mercado?' },
  { key: 'bs_autent', title: 'Autenticidade', desc: 'A marca entrega o que promete genuinamente?' },
  { key: 'bs_relev', title: 'Relevancia', desc: 'A marca e relevante para seu publico hoje?' },
  { key: 'bs_diferenc', title: 'Diferenciacao', desc: 'A marca se diferencia de forma significativa?' },
  { key: 'bs_consist', title: 'Consistencia', desc: 'A experiencia de marca e coerente em todos os pontos?' },
  { key: 'bs_presenca', title: 'Presenca', desc: 'A marca tem visibilidade e share of mind?' },
  { key: 'bs_engaj', title: 'Engajamento', desc: 'Stakeholders internos e externos sao engajados?' },
];

const SCORE_LEVELS = [
  { value: 15, label: 'Baixo', color: 'bg-red-500' },
  { value: 35, label: 'Medio-Baixo', color: 'bg-orange-500' },
  { value: 55, label: 'Medio', color: 'bg-yellow-500' },
  { value: 75, label: 'Medio-Alto', color: 'bg-blue-500' },
  { value: 92, label: 'Alto', color: 'bg-green-500' },
];

const fmt = (v) => {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
};

const STEPS = [
  { icon: DollarSign, label: 'Financeiro' },
  { icon: Heart, label: 'Brand Contribution' },
  { icon: Shield, label: 'Brand Strength' },
  { icon: BarChart3, label: 'Resultado' },
];

export default function BrandValuation() {
  const { currentBrand } = useBrand();
  const { getAuthHeaders } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [archData, setArchData] = useState(null);

  const [form, setForm] = useState({
    marca: currentBrand?.name || '',
    setor: 'outro',
    receita: '',
    ebitda: '',
    divida: '',
    crescimento: 1,
    recorrencia: 2,
    metodo: 'mult',
    rbi_q1: 35, rbi_q2: 35, rbi_q3: 35, rbi_q4: 35, rbi_q5: 35,
    bs_clareza: 50, bs_comprom: 50, bs_governa: 50, bs_respons: 50, bs_autent: 50,
    bs_relev: 50, bs_diferenc: 50, bs_consist: 50, bs_presenca: 50, bs_engaj: 50,
  });

  // Fetch architecture data and auto-fill
  const fetchArchitecture = useCallback(async () => {
    if (!currentBrand?.brand_id) return;
    try {
      const headers = getAuthHeaders();
      const { data } = await axios.get(
        `${API}/brands/${currentBrand.brand_id}/architecture`, { headers }
      );
      setArchData(data);
      // Auto-fill sector from brand industry if available
      const brand = currentBrand;
      const industryMap = {
        'tecnologia': 'saas', 'saas': 'saas', 'tech': 'saas', 'software': 'saas',
        'servicos': 'servicos', 'consultoria': 'servicos', 'agencia': 'servicos',
        'varejo': 'varejo', 'retail': 'varejo', 'ecommerce': 'varejo',
        'industria': 'industria', 'manufatura': 'industria',
        'saude': 'saude', 'health': 'saude', 'farmaceutica': 'saude',
        'agro': 'agro', 'agronegocio': 'agro', 'agricultura': 'agro',
        'educacao': 'educacao', 'education': 'educacao',
      };
      const industry = (brand.industry || '').toLowerCase().trim();
      if (industry && industryMap[industry]) {
        setForm(prev => ({ ...prev, setor: industryMap[industry] }));
      }
    } catch { /* silent */ }
  }, [currentBrand?.brand_id, currentBrand, getAuthHeaders]);

  useEffect(() => { fetchArchitecture(); }, [fetchArchitecture]);

  // Architecture summary
  const archSummary = useMemo(() => {
    if (!archData) return null;
    const products = archData.products || [];
    const avgTicket = products.length > 0
      ? products.reduce((s, p) => s + (p.ticket_medio || 0), 0) / products.length
      : 0;
    const archLabels = { mono: 'Monolitica', endo: 'Endossada', ind: 'Independente' };
    return {
      type: archLabels[archData.arch_type] || null,
      productCount: products.length,
      avgTicket,
      global: archData.global_ops,
      hq: archData.hq_country,
    };
  }, [archData]);

  const setField = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const rbiScore = useMemo(() => {
    const qs = [form.rbi_q1, form.rbi_q2, form.rbi_q3, form.rbi_q4, form.rbi_q5];
    return Math.round(qs.reduce((a, b) => a + b, 0) / 5);
  }, [form.rbi_q1, form.rbi_q2, form.rbi_q3, form.rbi_q4, form.rbi_q5]);

  const bsScore = useMemo(() => {
    const fs = BS_FACTORS.map(f => form[f.key]);
    return Math.round(fs.reduce((a, b) => a + b, 0) / fs.length);
  }, [form]);

  const margem = useMemo(() => {
    const r = parseFloat(form.receita) || 0;
    const e = parseFloat(form.ebitda) || 0;
    return r > 0 ? Math.round((e / r) * 100) : 0;
  }, [form.receita, form.ebitda]);

  const handleCalculate = async () => {
    if (!currentBrand?.brand_id) return;
    const r = parseFloat(form.receita) || 0;
    const e = parseFloat(form.ebitda) || 0;
    if (r <= 0 || e <= 0) {
      toast.error('Preencha receita e EBITDA para calcular.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        brand_id: currentBrand.brand_id,
        receita: r,
        ebitda: e,
        divida: parseFloat(form.divida) || 0,
      };
      const { data } = await axios.post(
        `${API}/brands/${currentBrand.brand_id}/valuations`,
        payload,
        { headers: getAuthHeaders() },
      );
      setResult(data);
      setStep(3);
      toast.success('Valuation calculada com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao calcular valuation');
    } finally {
      setSaving(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="text-center py-12" data-testid="brand-valuation-page">
        <p className="text-muted-foreground">Selecione uma marca para acessar o Valuation.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="brand-valuation-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading">Brand Valuation</h1>
        <p className="text-muted-foreground text-sm">Metodologia Hibrida: Multiplos financeiros + Brand Contribution + Brand Strength</p>
      </div>

      {/* Step Nav */}
      <div className="flex gap-1" data-testid="valuation-step-nav">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === step;
          const done = i < step;
          return (
            <button
              key={i}
              onClick={() => { if (i < step || (i === 3 && result)) setStep(i); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium transition-all ${
                active ? 'bg-primary text-primary-foreground shadow-sm' :
                done ? 'bg-primary/10 text-primary' :
                'bg-muted text-muted-foreground'
              }`}
              data-testid={`step-${i}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
              {done && <span className="ml-1">&#10003;</span>}
            </button>
          );
        })}
      </div>

      {/* Step 0: Financeiro */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Architecture Integration Banner */}
          {archSummary && (archSummary.type || archSummary.productCount > 0) && (
            <Card className="border-primary/20 bg-primary/5" data-testid="arch-integration-card">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Network className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Dados da Arquitetura de Marca</span>
                  <Badge variant="secondary" className="text-[10px]">Auto-importados</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {archSummary.type && (
                    <span>Tipo: <strong className="text-foreground">{archSummary.type}</strong></span>
                  )}
                  {archSummary.productCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <strong className="text-foreground">{archSummary.productCount}</strong> produtos
                    </span>
                  )}
                  {archSummary.avgTicket > 0 && (
                    <span>Ticket medio: <strong className="text-foreground">R$ {archSummary.avgTicket.toFixed(0)}</strong></span>
                  )}
                  {archSummary.global && (
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Operacoes globais
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader><CardTitle className="text-base">Identificacao</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={form.marca} onChange={e => setField('marca', e.target.value)} data-testid="val-marca" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={form.setor} onValueChange={v => setField('setor', v)}>
                  <SelectTrigger data-testid="val-setor"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SECTORS.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Dados Financeiros</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Receita Anual (R$)</Label>
                  <Input type="number" min="0" value={form.receita} onChange={e => setField('receita', e.target.value)} placeholder="0" data-testid="val-receita" />
                </div>
                <div className="space-y-2">
                  <Label>EBITDA Anual (R$)</Label>
                  <Input type="number" min="0" value={form.ebitda} onChange={e => setField('ebitda', e.target.value)} placeholder="0" data-testid="val-ebitda" />
                  <p className="text-[10px] text-muted-foreground">Lucro operacional + depreciacao + amortizacao</p>
                </div>
                <div className="space-y-2">
                  <Label>Margem EBITDA</Label>
                  <div className={`text-2xl font-bold ${margem >= 20 ? 'text-green-500' : margem >= 12 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {margem}%
                  </div>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Divida Liquida (R$)</Label>
                  <Input type="number" min="0" value={form.divida} onChange={e => setField('divida', e.target.value)} placeholder="0" data-testid="val-divida" />
                </div>
                <div className="space-y-2">
                  <Label>Crescimento de Receita</Label>
                  <Select value={String(form.crescimento)} onValueChange={v => setField('crescimento', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-1">Em queda</SelectItem>
                      <SelectItem value="0">Estagnado</SelectItem>
                      <SelectItem value="1">Moderado (5-15%)</SelectItem>
                      <SelectItem value="2">Alto (15-30%)</SelectItem>
                      <SelectItem value="3">Acelerado (&gt;30%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recorrencia de Receita</Label>
                  <Select value={String(form.recorrencia)} onValueChange={v => setField('recorrencia', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Nenhuma</SelectItem>
                      <SelectItem value="1">Baixa (&lt;20%)</SelectItem>
                      <SelectItem value="2">Moderada (20-50%)</SelectItem>
                      <SelectItem value="3">Alta (50-80%)</SelectItem>
                      <SelectItem value="4">Muito alta (&gt;80%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Metodo Principal</Label>
                  <Select value={form.metodo} onValueChange={v => setField('metodo', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mult">Multiplos de EBITDA</SelectItem>
                      <SelectItem value="rev">Multiplos de Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button onClick={() => setStep(1)} data-testid="val-next-0">
              Proximo: Brand Contribution <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 1: Brand Contribution (RBI) */}
      {step === 1 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brand Contribution Score (RBI)</CardTitle>
              <CardDescription>Quanto a marca contribui para os resultados do negocio?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {RBI_QUESTIONS.map(q => (
                <ScoreQuestion
                  key={q.key}
                  title={q.title}
                  desc={q.desc}
                  value={form[q.key]}
                  onChange={v => setField(q.key, v)}
                  testId={`val-${q.key}`}
                />
              ))}
              <Separator />
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold">{rbiScore}<span className="text-lg text-muted-foreground">/100</span></div>
                <Progress value={rbiScore} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {rbiScore < 25 ? 'Marca tem baixa contribuicao' :
                   rbiScore < 50 ? 'Contribuicao moderada' :
                   rbiScore < 75 ? 'Boa contribuicao da marca' : 'Marca e o principal ativo'}
                </p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button onClick={() => setStep(2)} data-testid="val-next-1">
              Proximo: Brand Strength <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Brand Strength (BS) */}
      {step === 2 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Brand Strength Score (BS)</CardTitle>
                  <CardDescription>10 fatores Interbrand de forca de marca</CardDescription>
                </div>
                <div className="text-3xl font-bold">{bsScore}<span className="text-sm text-muted-foreground">/100</span></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {BS_FACTORS.map(f => (
                <ScoreQuestion
                  key={f.key}
                  title={f.title}
                  desc={f.desc}
                  value={form[f.key]}
                  onChange={v => setField(f.key, v)}
                  testId={`val-${f.key}`}
                  compact
                />
              ))}
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <Button onClick={handleCalculate} disabled={saving} data-testid="val-calculate-btn">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Calcular Valuation
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div className="space-y-4">
          {/* Business Valuation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Valuation do Negocio (Enterprise Value)</CardTitle>
              <CardDescription>Multiplo aplicado: {result.multiplo_final}x EBITDA</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <ValBox label="Minimo" value={result.ev_min} color="text-muted-foreground" />
                <ValBox label="Medio" value={result.ev_mid} color="text-primary" large />
                <ValBox label="Maximo" value={result.ev_max} color="text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          {/* Brand Value */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Valor da Marca</CardTitle>
                  <CardDescription>A marca representa {result.brand_share_pct}% do valor do negocio</CardDescription>
                </div>
                <Badge className="text-lg px-3 py-1">{result.brand_share_pct}%</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <ValBox label="Minimo" value={result.brand_min} color="text-muted-foreground" />
                <ValBox label="Medio" value={result.brand_mid} color="text-primary" large />
                <ValBox label="Maximo" value={result.brand_max} color="text-muted-foreground" />
              </div>
              <Separator className="my-4" />
              {/* Visual bar */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex-1 h-6 bg-primary/20 rounded-l-lg flex items-center justify-center text-primary font-medium" style={{ width: `${result.brand_share_pct}%` }}>
                    Marca
                  </div>
                  <div className="flex-1 h-6 bg-muted rounded-r-lg flex items-center justify-center font-medium">
                    Outros ativos
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scores Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Brand Contribution (RBI)</div>
                <div className="text-3xl font-bold">{result.rbi_score}<span className="text-sm text-muted-foreground">/100</span></div>
                <Progress value={result.rbi_score} className="h-2 mt-2" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Brand Strength (BS)</div>
                <div className="text-3xl font-bold">{result.bs_score}<span className="text-sm text-muted-foreground">/100</span></div>
                <Progress value={result.bs_score} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Refazer
            </Button>
            <Button variant="outline" onClick={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `valuation-${currentBrand.name}-${new Date().toISOString().split('T')[0]}.json`;
              a.click();
            }} data-testid="val-export-btn">
              <Download className="h-4 w-4 mr-1" /> Exportar JSON
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreQuestion({ title, desc, value, onChange, testId, compact = false }) {
  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`font-medium ${compact ? 'text-sm' : ''}`}>{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
        <span className="text-sm font-bold shrink-0">{value}</span>
      </div>
      <div className="flex gap-1.5">
        {SCORE_LEVELS.map(lvl => (
          <button
            key={lvl.value}
            onClick={() => onChange(lvl.value)}
            className={`flex-1 text-[10px] py-1.5 rounded-md font-medium transition-all border ${
              value === lvl.value
                ? `${lvl.color} text-white border-transparent shadow-sm`
                : 'bg-card border-border hover:bg-muted'
            }`}
            data-testid={`${testId}-${lvl.value}`}
          >
            {lvl.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ValBox({ label, value, color = '', large = false }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase mb-1">{label}</div>
      <div className={`font-bold ${large ? 'text-2xl' : 'text-lg'} ${color}`}>{fmt(value)}</div>
    </div>
  );
}
