import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="not-found-page">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-primary/20 mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">Página não encontrada</h1>
        <p className="text-muted-foreground mb-8">
          A página que você procura não existe ou foi movida. Verifique o endereço ou volte para o início.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/dashboard">
            <Button className="gap-2 w-full" data-testid="go-home-btn">
              <Home className="h-4 w-4" /> Ir para o Dashboard
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={() => window.history.back()} data-testid="go-back-btn">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
