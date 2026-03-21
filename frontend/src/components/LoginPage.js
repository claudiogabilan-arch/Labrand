import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, User, ArrowRight, Building2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [userType, setUserType] = useState('');
  const [activeTab, setActiveTab] = useState('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Digite seu email');
      return;
    }
    setResetLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: resetEmail });
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar email de recuperação');
    } finally {
      setResetLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userData = await login(email, password);
      toast.success('Login realizado com sucesso!');
      if (!userData.onboarding_completed) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!userType) {
      toast.error('Selecione o tipo de usuário');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/auth/register`, {
        email, password, name, role: 'estrategista', user_type: userType
      });
      
      if (response.data.requires_verification) {
        toast.success('Código de verificação enviado para seu email!');
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, { replace: true });
      } else {
        // Fallback para usuários já verificados
        const { token: newToken, ...userData } = response.data;
        localStorage.setItem('labrand_token', newToken);
        navigate('/onboarding', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Pure Black Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 items-center justify-center relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img 
            src="/logo-white.png" 
            alt="LABrand" 
            className="h-20 w-auto"
          />
          <div className="w-16 h-px bg-white/20 mt-2" />
          <p className="text-white/40 text-sm font-light tracking-widest uppercase mt-2">Brand Builder for Equity</p>
        </div>
      </div>

      {/* Right Panel - Pure White Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[400px] space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <img 
              src="/logo-black.png" 
              alt="LABrand" 
              className="h-10 w-auto"
            />
          </div>

          <Card className="border-0 shadow-none bg-transparent" data-testid="auth-card">
            <CardHeader className="space-y-2 pb-6 px-0">
              <CardTitle className="font-heading text-2xl font-bold text-zinc-900">
                {activeTab === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
              </CardTitle>
              <CardDescription className="text-zinc-500">
                {activeTab === 'login' 
                  ? 'Entre na sua conta para continuar' 
                  : 'Preencha os dados para criar sua conta'}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6 bg-zinc-100 p-1 rounded-lg">
                  <TabsTrigger value="login" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm rounded-md text-zinc-500 text-sm font-medium" data-testid="login-tab">Entrar</TabsTrigger>
                  <TabsTrigger value="register" className="data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm rounded-md text-zinc-500 text-sm font-medium" data-testid="register-tab">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-zinc-700 text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 h-11 bg-white"
                          required
                          data-testid="login-email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-zinc-700 text-sm font-medium">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10 border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900/10 h-11 bg-white"
                          required
                          data-testid="login-password-input"
                        />
                      </div>
                      <div className="text-right">
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(true)}
                          className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
                          data-testid="forgot-password-link"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 font-medium" 
                      disabled={isLoading}
                      data-testid="login-submit-btn"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="Seu nome"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="register-name-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                          required
                          data-testid="register-email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="pl-10"
                          required
                          minLength={6}
                          data-testid="register-password-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-type">Tipo de Usuário</Label>
                      <Select value={userType} onValueChange={setUserType} required>
                        <SelectTrigger data-testid="user-type-select">
                          <SelectValue placeholder="Selecione seu perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="estrategista">Estrategista</SelectItem>
                          <SelectItem value="agencia">Agência</SelectItem>
                          <SelectItem value="grupo_empresarial">Grupo Empresarial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white h-11 font-medium" 
                      disabled={isLoading || !userType}
                      data-testid="register-submit-btn"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando conta...
                        </>
                      ) : (
                        'Criar conta'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Google OAuth - Emergent Auth */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-zinc-400 tracking-wider">ou continue com</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full h-11 border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-medium"
                onClick={loginWithGoogle}
                disabled={isLoading}
                data-testid="google-login-btn"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continuar com Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Esqueci a Senha */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar senha</DialogTitle>
            <DialogDescription>
              Digite seu email e enviaremos instruções para redefinir sua senha.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                data-testid="reset-email-input"
              />
            </div>
            <Button type="submit" className="w-full" disabled={resetLoading}>
              {resetLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar email de recuperação'
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
