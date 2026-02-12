import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Loader2, TrendingUp, DollarSign, ExternalLink, Search } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (value) => {
  if (value >= 1000000000) return `R$ ${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}K`;
  return `R$ ${value}`;
};

// VCs REAIS brasileiros com dados públicos
const realInvestors = [
  { name: 'Kaszek Ventures', type: 'Venture Capital', ticket_min: 1000000, ticket_max: 50000000, stages: ['Seed', 'Series A', 'Series B'], sectors: ['Fintech', 'E-commerce', 'SaaS', 'Marketplace'], website: 'https://www.kaszek.com', description: 'Maior fundo de VC da América Latina' },
  { name: 'Valor Capital Group', type: 'Venture Capital', ticket_min: 5000000, ticket_max: 100000000, stages: ['Series A', 'Series B', 'Growth'], sectors: ['Fintech', 'Healthtech', 'Edtech', 'Logística'], website: 'https://valorcapitalgroup.com', description: 'Fundo cross-border Brasil-EUA' },
  { name: 'Canary', type: 'Venture Capital', ticket_min: 500000, ticket_max: 10000000, stages: ['Pre-Seed', 'Seed', 'Series A'], sectors: ['SaaS', 'Fintech', 'Marketplace', 'B2B'], website: 'https://canary.com.vc', description: 'Early-stage focado em startups brasileiras' },
  { name: 'Softbank Latin America Fund', type: 'Venture Capital', ticket_min: 10000000, ticket_max: 500000000, stages: ['Series B', 'Growth'], sectors: ['Fintech', 'E-commerce', 'Delivery', 'Mobilidade'], website: 'https://latinamericafund.com', description: 'Mega fundo para late-stage' },
  { name: 'MAYA Capital', type: 'Venture Capital', ticket_min: 1000000, ticket_max: 20000000, stages: ['Seed', 'Series A'], sectors: ['SaaS', 'Fintech', 'Infraestrutura', 'B2B'], website: 'https://maya.capital', description: 'Fundo liderado por Monica Saggioro' },
  { name: 'Astella Investimentos', type: 'Venture Capital', ticket_min: 2000000, ticket_max: 30000000, stages: ['Seed', 'Series A', 'Series B'], sectors: ['SaaS', 'Healthtech', 'Agtech', 'Edtech'], website: 'https://astella.com.br', description: 'Fundo multi-estágio brasileiro' },
  { name: 'Monashees', type: 'Venture Capital', ticket_min: 5000000, ticket_max: 50000000, stages: ['Series A', 'Series B'], sectors: ['Fintech', 'Healthtech', 'Edtech', 'E-commerce'], website: 'https://monashees.com.br', description: 'Um dos mais antigos VCs do Brasil' },
  { name: 'Upload Ventures', type: 'Venture Capital', ticket_min: 500000, ticket_max: 5000000, stages: ['Pre-Seed', 'Seed'], sectors: ['Deep Tech', 'SaaS', 'Climate Tech', 'Biotech'], website: 'https://upload.vc', description: 'Focado em deep tech e impacto' },
  { name: 'Atlantico', type: 'Venture Capital', ticket_min: 3000000, ticket_max: 30000000, stages: ['Seed', 'Series A'], sectors: ['Fintech', 'SaaS', 'Consumer', 'B2B'], website: 'https://atlantico.vc', description: 'Fundo focado em América Latina' },
  { name: 'QED Investors', type: 'Venture Capital', ticket_min: 5000000, ticket_max: 50000000, stages: ['Series A', 'Series B'], sectors: ['Fintech'], website: 'https://qedinvestors.com', description: 'Especializado 100% em Fintech' },
];

export default function InvestmentMatch() {
  const { currentBrand } = useBrand();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');

  const stages = ['all', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth'];
  
  const filteredInvestors = realInvestors.filter(inv => {
    const matchSearch = inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       inv.sectors.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStage = selectedStage === 'all' || inv.stages.includes(selectedStage);
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
        <p className="text-muted-foreground">Encontre fundos de investimento compatíveis com sua marca</p>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvestors.map((inv, i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow" data-testid={`investor-card-${i}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{inv.name}</CardTitle>
              <CardDescription>{inv.description}</CardDescription>
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.open(inv.website, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-2" /> Visitar Site
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvestors.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum investidor encontrado com os filtros selecionados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
