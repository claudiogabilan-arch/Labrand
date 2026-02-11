import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Heart, Compass, Users, BarChart3, Calendar, DollarSign, FileText, Settings } from 'lucide-react';

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Bem-vindo ao LABrand!',
    description: 'Seu sistema completo de gestão de marca. Vamos fazer um tour rápido pelas principais funcionalidades.',
    icon: Sparkles,
    color: 'bg-primary'
  },
  {
    id: 'pillars',
    title: '7 Pilares de Marca',
    description: 'Construa sua marca do zero através de 7 pilares estratégicos: Start (diagnóstico), Valores, Propósito, Promessa, Posicionamento, Personalidade e Universal.',
    icon: Target,
    color: 'bg-blue-500',
    tips: ['Comece pelo Start para diagnosticar sua marca', 'Preencha na ordem para melhor resultado', 'Use a IA para gerar insights']
  },
  {
    id: 'personality',
    title: 'Personalidade de Marca',
    description: 'Escolha entre os 12 arquétipos de Jung para definir a personalidade da sua marca. Combine arquétipos para criar uma identidade única.',
    icon: Heart,
    color: 'bg-pink-500',
    tips: ['Selecione 1 arquétipo principal', 'Adicione 1 secundário opcional', 'Use combinações sugeridas']
  },
  {
    id: 'audience',
    title: 'Inteligência de Audiência',
    description: 'Analise segmentos de público e descubra influenciadores que podem se conectar com sua marca.',
    icon: Users,
    color: 'bg-violet-500',
    tips: ['Veja segmentos por interesse', 'Filtre influenciadores por plataforma', 'Gere insights com IA']
  },
  {
    id: 'campaigns',
    title: 'Calendário de Campanhas',
    description: 'Planeje suas campanhas com datas, orçamentos e objetivos. Visualize tudo em um calendário mensal.',
    icon: Calendar,
    color: 'bg-rose-500',
    tips: ['Defina tipo de campanha', 'Adicione orçamento', 'Acompanhe campanhas ativas']
  },
  {
    id: 'valuation',
    title: 'Avaliação de Marca',
    description: 'Calcule o valor da sua marca usando a metodologia Interbrand com análise financeira, Role of Brand e Brand Strength.',
    icon: DollarSign,
    color: 'bg-emerald-500',
    tips: ['Preencha dados financeiros', 'Avalie 10 fatores de força', 'Receba recomendações']
  },
  {
    id: 'reports',
    title: 'Relatórios',
    description: 'Exporte relatórios em PDF com todos os dados da sua marca para apresentações e documentação.',
    icon: FileText,
    color: 'bg-amber-500',
    tips: ['Escolha tipo de relatório', 'Baixe em PDF', 'Compartilhe com equipe']
  },
  {
    id: 'settings',
    title: 'Configurações',
    description: 'Gerencie suas marcas, integre com Google Analytics/Drive, escolha entre tema claro ou escuro.',
    icon: Settings,
    color: 'bg-gray-500',
    tips: ['Crie múltiplas marcas', 'Conecte Google APIs', 'Personalize a interface']
  }
];

export const Tutorial = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === tutorialSteps.length - 1;

  const handleFinish = () => {
    localStorage.setItem('labrand_tutorial_complete', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute right-2 top-2"
          onClick={handleFinish}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <CardHeader className="text-center pt-8">
          <div className={`w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-4`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl">{step.title}</CardTitle>
          <CardDescription className="text-base">{step.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {step.tips && (
            <div className="space-y-2">
              {step.tips.map((tip, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Progress */}
          <div className="flex items-center justify-center gap-1 pt-4">
            {tutorialSteps.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentStep ? 'bg-primary w-4' : idx < currentStep ? 'bg-primary/50' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={() => setCurrentStep(prev => prev - 1)} className="flex-1">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button onClick={isLast ? handleFinish : () => setCurrentStep(prev => prev + 1)} className="flex-1">
              {isLast ? 'Começar!' : 'Próximo'}
              {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Tutorial;
