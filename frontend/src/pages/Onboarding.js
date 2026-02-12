import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { id: 'user_type', title: 'Tipo de Usuário', description: 'Como você utilizará o LABrand?' },
  { id: 'sector', title: 'Setor', description: 'Em qual setor sua marca atua?' },
  { id: 'revenue', title: 'Faturamento', description: 'Qual o faturamento anual aproximado?' },
  { id: 'maturity', title: 'Maturidade', description: 'Qual o estágio de maturidade da marca?' },
  { id: 'objective', title: 'Objetivo', description: 'Qual seu principal objetivo com o LABrand?' },
];

const SECTORS = [
  'Tecnologia', 'Saúde', 'Educação', 'Varejo', 'Serviços Financeiros',
  'Indústria', 'Agronegócio', 'Logística', 'Construção', 'Alimentício',
  'Moda', 'Beleza', 'Entretenimento', 'Consultoria', 'Outro'
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    user_type: '',
    sector: '',
    revenue_range: '',
    brand_maturity: '',
    main_objective: ''
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    const currentField = STEPS[currentStep].id;
    const fieldMap = {
      'user_type': 'user_type',
      'sector': 'sector', 
      'revenue': 'revenue_range',
      'maturity': 'brand_maturity',
      'objective': 'main_objective'
    };
    
    if (!data[fieldMap[currentField]]) {
      toast.error('Selecione uma opção para continuar');
      return;
    }
    
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/user/onboarding`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Onboarding concluído! Bem-vindo ao LABrand.');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Erro ao salvar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'user_type':
        return (
          <Select value={data.user_type} onValueChange={(v) => setData({...data, user_type: v})}>
            <SelectTrigger className="w-full" data-testid="onboarding-user-type">
              <SelectValue placeholder="Selecione seu perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="estrategista">Estrategista de Marca</SelectItem>
              <SelectItem value="agencia">Agência de Branding</SelectItem>
              <SelectItem value="grupo_empresarial">Grupo Empresarial</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'sector':
        return (
          <Select value={data.sector} onValueChange={(v) => setData({...data, sector: v})}>
            <SelectTrigger className="w-full" data-testid="onboarding-sector">
              <SelectValue placeholder="Selecione o setor" />
            </SelectTrigger>
            <SelectContent>
              {SECTORS.map(sector => (
                <SelectItem key={sector} value={sector.toLowerCase()}>{sector}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'revenue':
        return (
          <Select value={data.revenue_range} onValueChange={(v) => setData({...data, revenue_range: v})}>
            <SelectTrigger className="w-full" data-testid="onboarding-revenue">
              <SelectValue placeholder="Selecione a faixa de faturamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ate_1m">Até R$ 1 milhão/ano</SelectItem>
              <SelectItem value="1m_10m">R$ 1 milhão - R$ 10 milhões/ano</SelectItem>
              <SelectItem value="10m_50m">R$ 10 milhões - R$ 50 milhões/ano</SelectItem>
              <SelectItem value="50m_plus">Acima de R$ 50 milhões/ano</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'maturity':
        return (
          <Select value={data.brand_maturity} onValueChange={(v) => setData({...data, brand_maturity: v})}>
            <SelectTrigger className="w-full" data-testid="onboarding-maturity">
              <SelectValue placeholder="Selecione o estágio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inicial">Inicial - Marca em construção</SelectItem>
              <SelectItem value="estruturada">Estruturada - Marca definida, buscando consistência</SelectItem>
              <SelectItem value="avancada">Avançada - Marca consolidada, foco em otimização</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'objective':
        return (
          <Select value={data.main_objective} onValueChange={(v) => setData({...data, main_objective: v})}>
            <SelectTrigger className="w-full" data-testid="onboarding-objective">
              <SelectValue placeholder="Selecione seu objetivo principal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="valuation">Valuation - Mensurar o valor da marca</SelectItem>
              <SelectItem value="estruturacao">Estruturação - Definir pilares estratégicos</SelectItem>
              <SelectItem value="captacao">Captação - Preparar para investidores</SelectItem>
              <SelectItem value="governanca">Governança - Gestão executiva da marca</SelectItem>
            </SelectContent>
          </Select>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {STEPS.length}
            </span>
            <span className="text-sm font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <CardTitle className="mt-6">{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderStepContent()}
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            )}
            <Button 
              onClick={handleNext} 
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
