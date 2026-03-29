import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ClickUpCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const brandId = searchParams.get('state');

    if (!code || !brandId) {
      setStatus('error');
      setError('Parâmetros inválidos no callback');
      return;
    }

    const exchangeToken = async () => {
      try {
        await axios.post(
          `${API}/integrations/clickup/callback`,
          { code, brand_id: brandId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStatus('success');
        setTimeout(() => navigate('/planning'), 2000);
      } catch (err) {
        setStatus('error');
        setError(err.response?.data?.detail || 'Erro ao conectar com ClickUp');
      }
    };

    if (token) {
      exchangeToken();
    } else {
      setStatus('error');
      setError('Você precisa estar logado para conectar o ClickUp');
    }
  }, [searchParams, token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full" data-testid="clickup-callback-card">
        <CardContent className="flex flex-col items-center text-center py-12 space-y-4">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="text-xl font-semibold">Conectando ClickUp...</h2>
              <p className="text-muted-foreground">Trocando código por token de acesso</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h2 className="text-xl font-semibold">ClickUp Conectado!</h2>
              <p className="text-muted-foreground">Redirecionando para o Planejamento...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold">Erro na Conexão</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => navigate('/planning')} data-testid="clickup-callback-back-btn">
                Voltar ao Planejamento
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
