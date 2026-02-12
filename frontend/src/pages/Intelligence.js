import { useState } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Search,
  Globe,
  Link2,
  AlertCircle
} from 'lucide-react';

export const Intelligence = () => {
  const { currentBrand } = useBrand();

  if (!currentBrand) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Selecione uma marca para ver o dashboard de inteligência.</p>
      </div>
    );
  }

  // Verificar se Google Analytics está conectado (viria do backend)
  const isGoogleConnected = currentBrand.google_tokens ? true : false;

  return (
    <div className="space-y-6" data-testid="intelligence-page">
      <div>
        <h1 className="text-2xl font-bold">Intelligence Dashboard</h1>
        <p className="text-muted-foreground">Métricas e insights da sua marca</p>
      </div>

      {!isGoogleConnected ? (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertCircle className="h-5 w-5" />
              Conecte suas fontes de dados
            </CardTitle>
            <CardDescription>
              Para visualizar métricas reais, conecte o Google Analytics e Search Console nas Configurações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => window.location.href = '/settings'}>
              <Link2 className="h-4 w-4 mr-2" />
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Share of Search
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {isGoogleConnected ? '--' : 'Conecte Google'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Participação nas buscas do segmento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Tráfego Direto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {isGoogleConnected ? '--' : 'Conecte Google'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Visitantes que acessam diretamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Menções
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {isGoogleConnected ? '--' : 'Em breve'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Menções da marca na web
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Sentimento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {isGoogleConnected ? '--' : 'Em breve'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Análise de sentimento das menções
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona o Intelligence Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">1. Conecte suas fontes</h4>
              <p className="text-sm text-muted-foreground">
                Vá em Configurações e conecte Google Analytics e Search Console para importar dados reais.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">2. Aguarde a sincronização</h4>
              <p className="text-sm text-muted-foreground">
                Após conectar, os dados serão sincronizados automaticamente nas próximas horas.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">3. Analise os insights</h4>
              <p className="text-sm text-muted-foreground">
                Visualize métricas, tendências e receba recomendações personalizadas para sua marca.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Intelligence;
