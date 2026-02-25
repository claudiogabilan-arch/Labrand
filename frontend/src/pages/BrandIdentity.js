import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Palette, Type, Sparkles, Download, RefreshCw, Eye } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const archetypeStyles = {
  'Inocente': { colors: ['#FDFCFB', '#E8F5E9', '#FFF9C4', '#E3F2FD'], style: 'Leve, puro, minimalista', fonts: ['Quicksand', 'Nunito', 'Poppins'] },
  'Explorador': { colors: ['#5D4037', '#FF6F00', '#1B5E20', '#37474F'], style: 'Rústico, aventureiro, natural', fonts: ['Montserrat', 'Oswald', 'Roboto Condensed'] },
  'Sábio': { colors: ['#1A237E', '#0D47A1', '#263238', '#FFC107'], style: 'Sofisticado, intelectual, clean', fonts: ['Merriweather', 'Playfair Display', 'Lora'] },
  'Herói': { colors: ['#B71C1C', '#212121', '#FF6F00', '#1565C0'], style: 'Bold, impactante, poderoso', fonts: ['Bebas Neue', 'Anton', 'Impact'] },
  'Fora-da-lei': { colors: ['#212121', '#B71C1C', '#4A148C', '#1B1B1B'], style: 'Rebelde, disruptivo, dark', fonts: ['Rock Salt', 'Permanent Marker', 'Black Ops One'] },
  'Mago': { colors: ['#4A148C', '#1A237E', '#880E4F', '#FF6F00'], style: 'Místico, transformador, vibrante', fonts: ['Cinzel', 'Cormorant', 'Spectral'] },
  'Cara Comum': { colors: ['#5D4037', '#455A64', '#3E2723', '#607D8B'], style: 'Acessível, honesto, simples', fonts: ['Open Sans', 'Roboto', 'Source Sans Pro'] },
  'Amante': { colors: ['#880E4F', '#AD1457', '#C62828', '#4E342E'], style: 'Sensual, elegante, luxuoso', fonts: ['Playfair Display', 'Cormorant Garamond', 'Bodoni'] },
  'Bobo': { colors: ['#FF6F00', '#FFEB3B', '#00BCD4', '#E91E63'], style: 'Divertido, colorido, irreverente', fonts: ['Fredoka One', 'Baloo 2', 'Comic Neue'] },
  'Cuidador': { colors: ['#1B5E20', '#0097A7', '#2E7D32', '#00695C'], style: 'Acolhedor, sereno, natural', fonts: ['Cabin', 'Nunito', 'Catamaran'] },
  'Criador': { colors: ['#FF5722', '#795548', '#FF9800', '#3E2723'], style: 'Artístico, expressivo, único', fonts: ['Abril Fatface', 'Amatic SC', 'Caveat'] },
  'Governante': { colors: ['#0D47A1', '#212121', '#BF360C', '#1B1B1B'], style: 'Premium, autoritário, clássico', fonts: ['Cinzel', 'Trajan Pro', 'Cormorant'] }
};

export default function BrandIdentity() {
  const { currentBrand, loading: brandLoading } = useBrand();
  const { token } = useAuth();
  const [identity, setIdentity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [pillarsData, setPillarsData] = useState({});

  useEffect(() => {
    const fetchPillars = async () => {
      if (!currentBrand) return;
      try {
        const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/pillars-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPillarsData(data);
        }
      } catch (err) {
        console.error('Erro ao buscar pilares:', err);
      }
    };
    fetchPillars();
  }, [currentBrand, token]);

  const fetchIdentity = async () => {
    if (!currentBrand) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/identity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIdentity(data);
      }
    } catch (err) {
      console.error('Erro ao buscar identidade:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentity();
  }, [currentBrand]);

  const generateIdentity = async () => {
    if (!currentBrand) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/identity/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIdentity(data);
      }
    } catch (err) {
      console.error('Erro ao gerar identidade:', err);
    } finally {
      setGenerating(false);
    }
  };

  const archetype = pillars?.personality?.archetype || 'Sábio';
  const baseStyle = archetypeStyles[archetype] || archetypeStyles['Sábio'];
  const completionRate = pillars ? Object.keys(pillars).filter(k => pillars[k] && Object.keys(pillars[k]).length > 0).length / 7 * 100 : 0;

  if (brandLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para ver sugestões de identidade visual.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="brand-identity-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Identidade Visual</h1>
          <p className="text-muted-foreground">Sugestões baseadas na personalidade da sua marca</p>
        </div>
        <Button onClick={generateIdentity} disabled={generating || completionRate < 50} data-testid="generate-identity-btn">
          {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {identity ? 'Regenerar' : 'Gerar Sugestões'}
        </Button>
      </div>

      {completionRate < 50 && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Complete pelo menos 50% dos pilares da marca para gerar sugestões personalizadas de identidade visual.
              Progresso atual: {completionRate.toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="color-palette-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Paleta de Cores
            </CardTitle>
            <CardDescription>Baseada no arquétipo: <Badge variant="outline">{archetype}</Badge></CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                {(identity?.colors || baseStyle.colors).map((color, i) => (
                  <div key={i} className="flex-1 space-y-2">
                    <div 
                      className="h-20 rounded-lg shadow-inner cursor-pointer hover:scale-105 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                    <p className="text-xs text-center font-mono">{color}</p>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Dica:</strong> Use a primeira cor como primária, a segunda como secundária, 
                  e as demais como acentos e backgrounds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="typography-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" /> Tipografia
            </CardTitle>
            <CardDescription>Fontes recomendadas para sua marca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(identity?.fonts || baseStyle.fonts).map((font, i) => (
                <div key={i} className="p-4 rounded-lg bg-muted/50">
                  <p className="text-lg font-medium">{font}</p>
                  <p className="text-sm text-muted-foreground">
                    {i === 0 ? 'Títulos e headlines' : i === 1 ? 'Subtítulos e destaques' : 'Corpo de texto'}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2" data-testid="visual-style-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Estilo Visual
            </CardTitle>
            <CardDescription>Diretrizes visuais para sua marca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Tom Visual</h4>
                <p className="text-sm text-muted-foreground">{identity?.style || baseStyle.style}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Elementos Gráficos</h4>
                <p className="text-sm text-muted-foreground">
                  {identity?.elements || 'Linhas limpas, espaço em branco generoso, ícones minimalistas'}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Fotografia</h4>
                <p className="text-sm text-muted-foreground">
                  {identity?.photography || 'Imagens autênticas, iluminação natural, pessoas reais'}
                </p>
              </div>
            </div>
            {identity?.moodboard && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">Moodboard Sugerido</h4>
                <p className="text-sm text-muted-foreground">{identity.moodboard}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
