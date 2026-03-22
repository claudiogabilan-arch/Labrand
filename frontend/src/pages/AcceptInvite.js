import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Users, CheckCircle2, XCircle } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const { refreshBrands } = useBrand();
  const [status, setStatus] = useState('loading'); // loading, success, error, needLogin
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      setStatus('needLogin');
      return;
    }
    acceptInvite();
  }, [user, token]);

  const acceptInvite = async () => {
    try {
      const response = await axios.post(`${API}/team/accept/${token}`, {}, {
        headers: getAuthHeaders()
      });
      setInviteData(response.data);
      setStatus('success');
      // Clear pending invite from localStorage
      localStorage.removeItem('pending_invite');
      // Refresh brands list so the new team brand appears
      await refreshBrands();
    } catch (error) {
      setError(error.response?.data?.detail || 'Erro ao aceitar convite');
      setStatus('error');
      localStorage.removeItem('pending_invite');
    }
  };

  const handleLoginRedirect = () => {
    // Store invite token to accept after login
    localStorage.setItem('pending_invite', token);
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Convite de Equipe</CardTitle>
          <CardDescription>LaBrand - Brand OS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Processando convite...</p>
            </div>
          )}

          {status === 'needLogin' && (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Você precisa estar logado para aceitar este convite.
              </p>
              <Button onClick={handleLoginRedirect} className="w-full">
                Fazer Login
              </Button>
              <p className="text-xs text-muted-foreground">
                Não tem conta? Você será redirecionado para criar uma.
              </p>
            </div>
          )}

          {status === 'success' && inviteData && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Bem-vindo à equipe!</h3>
                <p className="text-muted-foreground mt-2">
                  Você agora faz parte da equipe <strong>{inviteData.brand_name}</strong>
                </p>
              </div>
              <Badge variant="outline" className="mx-auto">
                {inviteData.role === 'admin' ? 'Administrador' : 'Editor'}
              </Badge>
              <Button onClick={() => navigate('/dashboard')} className="w-full">
                Ir para o Dashboard
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-red-600">Erro no convite</h3>
                <p className="text-muted-foreground mt-2">{error}</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                Ir para o Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
