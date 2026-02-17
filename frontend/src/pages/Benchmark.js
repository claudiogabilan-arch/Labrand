import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Loader2, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

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

  useEffect(() => {
    const fetchData = async () => {
      if (!currentBrand) return;
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/benchmark`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) setData(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentBrand, token]);

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

  const sector = data?.sector || 'default';
  const benchmark = SECTOR_BENCHMARKS[sector.toLowerCase()] || SECTOR_BENCHMARKS.default;
  const brandStrength = data?.brand_strength || 0;
  const rbi = data?.rbi || 0;
  const percentile = data?.percentile || 50;

  return (
    <TooltipProvider>
      <div className="space-y-6" data-testid="benchmark-page">
        <div>
          <h1 className="text-2xl font-bold">Benchmark Setorial</h1>
          <p className="text-muted-foreground">Comparação com o setor: <Badge variant="outline">{sector}</Badge></p>
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
      </div>
    </TooltipProvider>
  );
}
