import { useState } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Users, 
  Instagram,
  Youtube,
  Search,
  ExternalLink,
  Loader2
} from 'lucide-react';

// Influenciadores REAIS do Brasil - Instagram e YouTube
const realInfluencers = [
  // Instagram
  { id: 1, name: 'Bianca Andrade (Boca Rosa)', handle: '@bianca', platform: 'instagram', followers: 18400000, niche: 'Beleza/Empreendedorismo', url: 'https://instagram.com/bianca' },
  { id: 2, name: 'Camila Coelho', handle: '@camilacoelho', platform: 'instagram', followers: 10200000, niche: 'Moda/Lifestyle', url: 'https://instagram.com/camilacoelho' },
  { id: 3, name: 'Thássia Naves', handle: '@thassianaves', platform: 'instagram', followers: 4000000, niche: 'Moda/Viagens', url: 'https://instagram.com/thassianaves' },
  { id: 4, name: 'Carlinhos Maia', handle: '@carlosmaia', platform: 'instagram', followers: 26000000, niche: 'Humor/Lifestyle', url: 'https://instagram.com/carlosmaia' },
  { id: 5, name: 'Virgínia Fonseca', handle: '@virginia', platform: 'instagram', followers: 50000000, niche: 'Lifestyle/Família', url: 'https://instagram.com/virginia' },
  { id: 6, name: 'Jade Picon', handle: '@jadepicon', platform: 'instagram', followers: 22000000, niche: 'Moda/Entretenimento', url: 'https://instagram.com/jadepicon' },
  // YouTube
  { id: 7, name: 'Whindersson Nunes', handle: '@waborges', platform: 'youtube', followers: 45000000, niche: 'Humor/Entretenimento', url: 'https://youtube.com/@waborges' },
  { id: 8, name: 'Felipe Neto', handle: '@felipeneto', platform: 'youtube', followers: 46000000, niche: 'Entretenimento/Opinião', url: 'https://youtube.com/@felipeneto' },
  { id: 9, name: 'Luccas Neto', handle: '@LuccasNeto', platform: 'youtube', followers: 40000000, niche: 'Infantil/Família', url: 'https://youtube.com/@LuccasNeto' },
  { id: 10, name: 'Marília Mendonça (Legado)', handle: '@MariliaMendoncaCantora', platform: 'youtube', followers: 32000000, niche: 'Música Sertaneja', url: 'https://youtube.com/@MariliaMendoncaCantora' },
  { id: 11, name: 'Manual do Mundo', handle: '@iberaborges', platform: 'youtube', followers: 18000000, niche: 'Educação/Ciência', url: 'https://youtube.com/@iberaborges' },
  { id: 12, name: 'Casimiro', handle: '@CazeTVDois', platform: 'youtube', followers: 13000000, niche: 'Esportes/Entretenimento', url: 'https://youtube.com/@CazeTVDois' },
];

const formatFollowers = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

export const Audience = () => {
  const { currentBrand } = useBrand();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  const filteredInfluencers = realInfluencers.filter(inf => {
    const matchSearch = inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       inf.niche.toLowerCase().includes(searchQuery.toLowerCase());
    const matchPlatform = selectedPlatform === 'all' || inf.platform === selectedPlatform;
    return matchSearch && matchPlatform;
  });

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca para ver sugestões de audiência.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audience-page">
      <div>
        <h1 className="text-2xl font-bold">Audiência & Influenciadores</h1>
        <p className="text-muted-foreground">Encontre influenciadores reais para sua marca</p>
      </div>

      <Tabs defaultValue="influencers">
        <TabsList>
          <TabsTrigger value="influencers">
            <Users className="h-4 w-4 mr-2" /> Influenciadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="influencers" className="mt-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou nicho..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="influencer-search"
              />
            </div>
            <div className="flex gap-2">
              <Badge
                variant={selectedPlatform === 'all' ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSelectedPlatform('all')}
              >
                Todos
              </Badge>
              <Badge
                variant={selectedPlatform === 'instagram' ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSelectedPlatform('instagram')}
              >
                <Instagram className="h-3 w-3 mr-1" /> Instagram
              </Badge>
              <Badge
                variant={selectedPlatform === 'youtube' ? 'default' : 'outline'}
                className="cursor-pointer px-4 py-2"
                onClick={() => setSelectedPlatform('youtube')}
              >
                <Youtube className="h-3 w-3 mr-1" /> YouTube
              </Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredInfluencers.map((influencer) => (
              <Card key={influencer.id} className="hover:shadow-lg transition-shadow" data-testid={`influencer-${influencer.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{influencer.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        {influencer.platform === 'instagram' ? (
                          <Instagram className="h-3 w-3" />
                        ) : (
                          <Youtube className="h-3 w-3" />
                        )}
                        {influencer.handle}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {formatFollowers(influencer.followers)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Badge variant="outline">{influencer.niche}</Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.open(influencer.url, '_blank')}
                      data-testid={`visit-${influencer.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Visitar Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredInfluencers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhum influenciador encontrado com os filtros selecionados.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Audience;
