import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
  Youtube,
  ExternalLink,
  Loader2,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatFollowers = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
};

export const Audience = () => {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hasEnoughData, setHasEnoughData] = useState(false);
  const [pillarsProgress, setPillarsProgress] = useState(0);

  // Verificar progresso dos pilares
  useEffect(() => {
    const checkPillars = async () => {
      if (!currentBrand) return;
      try {
        const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const progress = data.overall_completion || 0;
          setPillarsProgress(progress);
          // Considera que tem dados suficientes se preencheu pelo menos 1 pilar (>14%)
          setHasEnoughData(progress >= 14);
        }
      } catch (err) {
        console.error('Erro ao verificar pilares:', err);
      }
    };
    checkPillars();
  }, [currentBrand, token]);

  const searchInfluencers = async () => {
    if (!currentBrand || !hasEnoughData) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/influencers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data);
        setSearched(true);
      } else {
        toast.info('Funcionalidade requer integração com redes sociais. Configure em Integrações.');
        setSearched(true);
      }
    } catch (err) {
      toast.info('Funcionalidade requer integração com redes sociais. Configure em Integrações.');
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca para ver sugestões de influenciadores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="audience-page">
      <div>
        <h1 className="text-2xl font-bold">Audiência & Influenciadores</h1>
        <p className="text-muted-foreground">Influenciadores alinhados com a cultura da sua marca</p>
      </div>

      {!hasEnoughData ? (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Complete os pilares da marca
            </CardTitle>
            <CardDescription>
              Para sugerir influenciadores alinhados com sua marca, precisamos de mais informações.
              Preencha pelo menos um dos seguintes pilares:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li><strong>Start:</strong> Setor/Indústria da marca</li>
              <li><strong>Valores:</strong> Valores centrais da marca</li>
              <li><strong>Personalidade:</strong> Arquétipo da marca</li>
              <li><strong>Posicionamento:</strong> Público-alvo</li>
            </ul>
            <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/pillars/start'}>
              Preencher Pilares
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Buscar Influenciadores
              </CardTitle>
              <CardDescription>
                Baseado nos dados da sua marca, vamos sugerir influenciadores que combinam com sua cultura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">Progresso: {pillarsProgress}%</Badge>
              </div>
              <Button onClick={searchInfluencers} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    {searched ? 'Buscar Novamente' : 'Buscar Influenciadores'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {searched && influencers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nenhum influenciador encontrado para o perfil da sua marca. 
                  Tente adicionar mais informações nos pilares.
                </p>
              </CardContent>
            </Card>
          )}

          {influencers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {influencers.map((influencer, i) => (
                <Card key={i} className="hover:shadow-lg transition-shadow">
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
                      {influencer.why && (
                        <p className="text-xs text-muted-foreground">{influencer.why}</p>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.open(influencer.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Visitar Perfil
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Audience;
