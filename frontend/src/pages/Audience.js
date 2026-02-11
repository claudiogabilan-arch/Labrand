import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, 
  UserCheck,
  TrendingUp,
  Instagram,
  Youtube,
  Twitter,
  Sparkles,
  Search,
  Filter,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Star,
  Loader2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Mock influencer data - in production this would come from an API
const mockInfluencers = [
  { id: 1, name: 'Ana Silva', handle: '@anasilva', platform: 'instagram', followers: 850000, engagement: 4.2, niche: 'Lifestyle', avatar: 'https://i.pravatar.cc/150?img=1', fit_score: 92 },
  { id: 2, name: 'Pedro Santos', handle: '@pedrosantos', platform: 'youtube', followers: 1200000, engagement: 3.8, niche: 'Tecnologia', avatar: 'https://i.pravatar.cc/150?img=2', fit_score: 88 },
  { id: 3, name: 'Julia Costa', handle: '@juliacosta', platform: 'instagram', followers: 450000, engagement: 5.1, niche: 'Moda', avatar: 'https://i.pravatar.cc/150?img=3', fit_score: 85 },
  { id: 4, name: 'Lucas Oliveira', handle: '@lucasoliveira', platform: 'twitter', followers: 320000, engagement: 6.2, niche: 'Negócios', avatar: 'https://i.pravatar.cc/150?img=4', fit_score: 81 },
  { id: 5, name: 'Marina Lima', handle: '@marinalima', platform: 'youtube', followers: 980000, engagement: 4.5, niche: 'Educação', avatar: 'https://i.pravatar.cc/150?img=5', fit_score: 79 },
  { id: 6, name: 'Rafael Mendes', handle: '@rafaelmendes', platform: 'instagram', followers: 670000, engagement: 3.9, niche: 'Fitness', avatar: 'https://i.pravatar.cc/150?img=6', fit_score: 76 },
];

const audienceSegments = [
  { id: 1, name: 'Millennials Urbanos', size: 45, description: '25-34 anos, grandes cidades, alta renda', interests: ['Tecnologia', 'Sustentabilidade', 'Experiências'] },
  { id: 2, name: 'Gen Z Digital', size: 28, description: '18-24 anos, nativos digitais', interests: ['Redes Sociais', 'Gaming', 'Moda'] },
  { id: 3, name: 'Profissionais C-Level', size: 15, description: '35-50 anos, tomadores de decisão', interests: ['Negócios', 'Inovação', 'Networking'] },
  { id: 4, name: 'Famílias Modernas', size: 12, description: '30-45 anos, com filhos', interests: ['Educação', 'Saúde', 'Segurança'] },
];

export const Audience = () => {
  const { currentBrand } = useBrand();
  const { getAuthHeaders } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [influencers, setInfluencers] = useState(mockInfluencers);
  const [aiInsights, setAiInsights] = useState(null);

  const filteredInfluencers = influencers.filter(inf => {
    const matchesSearch = inf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         inf.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         inf.niche.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = selectedPlatform === 'all' || inf.platform === selectedPlatform;
    return matchesSearch && matchesPlatform;
  });

  const formatFollowers = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num;
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />;
      case 'youtube': return <Youtube className="h-4 w-4 text-red-500" />;
      case 'twitter': return <Twitter className="h-4 w-4 text-blue-400" />;
      default: return <Users className="h-4 w-4" />;
    }
  };

  const generateAIInsights = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post(`${API}/ai/insights`, {
        context: `Marca: ${currentBrand?.name}, Setor: ${currentBrand?.industry}. Analise o perfil de audiência ideal e sugira estratégias de engajamento com influenciadores.`,
        pillar: 'audience',
        brand_name: currentBrand?.name
      }, {
        headers: getAuthHeaders(),
        withCredentials: true
      });
      setAiInsights(response.data.insight);
      toast.success('Insights gerados!');
    } catch (error) {
      toast.error('Erro ao gerar insights');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para continuar</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audience-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500 flex items-center justify-center">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Inteligência de Audiência</h1>
            <p className="text-muted-foreground">Analise seu público e descubra influenciadores</p>
          </div>
        </div>
        <Button onClick={generateAIInsights} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          Gerar Insights com IA
        </Button>
      </div>

      {/* AI Insights */}
      {aiInsights && (
        <Card className="border-violet-200 bg-violet-50 dark:bg-violet-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-violet-500 mt-1" />
              <div>
                <p className="font-medium text-violet-900 dark:text-violet-100">Insights de IA</p>
                <p className="text-sm text-violet-700 dark:text-violet-300 mt-1 whitespace-pre-wrap">{aiInsights}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="segments">Segmentos de Audiência</TabsTrigger>
          <TabsTrigger value="influencers">Influenciadores Sugeridos</TabsTrigger>
        </TabsList>

        {/* Audience Segments */}
        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {audienceSegments.map(segment => (
              <Card key={segment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{segment.name}</CardTitle>
                    <Badge variant="secondary" className="text-lg font-bold">
                      {segment.size}%
                    </Badge>
                  </div>
                  <CardDescription>{segment.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Progress value={segment.size} className="h-2" />
                    <div className="flex flex-wrap gap-2">
                      {segment.interests.map(interest => (
                        <Badge key={interest} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Audience Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Eye className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">2.4M</p>
                <p className="text-sm text-muted-foreground">Alcance Potencial</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Heart className="h-8 w-8 mx-auto text-rose-500 mb-2" />
                <p className="text-2xl font-bold">4.8%</p>
                <p className="text-sm text-muted-foreground">Engajamento Médio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageCircle className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">12.5K</p>
                <p className="text-sm text-muted-foreground">Menções/Mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Share2 className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-bold">8.2K</p>
                <p className="text-sm text-muted-foreground">Compartilhamentos</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Influencers */}
        <TabsContent value="influencers" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar influenciadores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'instagram', 'youtube', 'twitter'].map(platform => (
                <Button
                  key={platform}
                  variant={selectedPlatform === platform ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPlatform(platform)}
                >
                  {platform === 'all' ? 'Todos' : getPlatformIcon(platform)}
                </Button>
              ))}
            </div>
          </div>

          {/* Influencer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInfluencers.map(influencer => (
              <Card key={influencer.id} className="hover:shadow-lg transition-all">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <img 
                      src={influencer.avatar} 
                      alt={influencer.name}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{influencer.name}</h3>
                        {getPlatformIcon(influencer.platform)}
                      </div>
                      <p className="text-sm text-muted-foreground">{influencer.handle}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{influencer.niche}</Badge>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold">{influencer.fit_score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Fit Score</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatFollowers(influencer.followers)}</p>
                      <p className="text-xs text-muted-foreground">Seguidores</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{influencer.engagement}%</p>
                      <p className="text-xs text-muted-foreground">Engajamento</p>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full mt-4" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Perfil
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Audience;
