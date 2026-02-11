import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Loader2, TrendingUp, Building2, DollarSign, ExternalLink, Search, Filter, Briefcase } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (value) => {
  if (value >= 1000000000) return `R$ ${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value}`;
};

export default function InvestmentMatch() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [investors, setInvestors] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  const fetchData = async () => {
    if (!currentBrand) return;
    setLoading(true);
    try {
      const [invRes, oppRes] = await Promise.all([
        fetch(`${API}/api/investment/investors?brand_id=${currentBrand.brand_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/investment/opportunities`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (invRes.ok) setInvestors(await invRes.json());
      if (oppRes.ok) setOpportunities(await oppRes.json());
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentBrand]);

  const stages = ['all', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'];
  
  const filteredInvestors = investors.filter(inv => {
    const matchSearch = inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       inv.sectors.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStage = selectedStage === 'all' || inv.stages.includes(selectedStage);
    return matchSearch && matchStage;
  });

  const filteredOpportunities = opportunities.filter(opp => {
    const matchSearch = opp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       opp.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage = selectedStage === 'all' || opp.stage === selectedStage;
    return matchSearch && matchStage;
  });

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para acessar o Investment Match.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="investment-match-page">
      <div>
        <h1 className="text-2xl font-bold">Investment Match</h1>
        <p className="text-muted-foreground">Conecte sua marca com investidores ou encontre oportunidades</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou setor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="investment-search"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {stages.map(stage => (
            <Badge
              key={stage}
              variant={selectedStage === stage ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedStage(stage)}
            >
              {stage === 'all' ? 'Todos' : stage}
            </Badge>
          ))}
        </div>
      </div>

      <Tabs defaultValue="investors" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="investors" data-testid="tab-investors">
            <TrendingUp className="h-4 w-4 mr-2" /> Buscar Investidores
          </TabsTrigger>
          <TabsTrigger value="opportunities" data-testid="tab-opportunities">
            <Briefcase className="h-4 w-4 mr-2" /> Oportunidades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investors" className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredInvestors.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum investidor encontrado com os filtros selecionados.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredInvestors.map((inv, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow" data-testid={`investor-card-${i}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{inv.name}</CardTitle>
                        <CardDescription>{inv.type}</CardDescription>
                      </div>
                      {inv.match_score && (
                        <Badge variant="secondary" className="bg-green-500/20 text-green-600">
                          {inv.match_score}% match
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>Ticket: {formatCurrency(inv.ticket_min)} - {formatCurrency(inv.ticket_max)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {inv.stages.map((stage, j) => (
                          <Badge key={j} variant="outline" className="text-xs">{stage}</Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {inv.sectors.slice(0, 3).map((sector, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{sector}</Badge>
                        ))}
                        {inv.sectors.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{inv.sectors.length - 3}</Badge>
                        )}
                      </div>
                      {inv.website && (
                        <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                          <a href={inv.website} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-2" /> Visitar Site
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="mt-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma oportunidade disponível no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredOpportunities.map((opp, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow" data-testid={`opportunity-card-${i}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{opp.name}</CardTitle>
                        <CardDescription>{opp.sector}</CardDescription>
                      </div>
                      <Badge>{opp.stage}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{opp.description}</p>
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Valuation</p>
                          <p className="font-medium">{formatCurrency(opp.valuation)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Buscando</p>
                          <p className="font-medium">{formatCurrency(opp.seeking)}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-2">
                        Ver Detalhes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
