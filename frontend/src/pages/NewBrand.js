import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
  Loader2, Building2, ArrowLeft, ArrowRight, ShoppingBag, Cloud,
  Heart, GraduationCap, Landmark, Factory, FileEdit, ChevronDown, Check
} from 'lucide-react';
import { SECTOR_TEMPLATES } from '../constants/sectorTemplates';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ICON_MAP = {
  ShoppingBag, Cloud, Heart, GraduationCap, Landmark, Factory, FileEdit
};

const industries = [
  'Tecnologia', 'Saúde', 'Educação', 'Varejo', 'Alimentação',
  'Moda', 'Serviços Financeiros', 'Entretenimento', 'Imobiliário',
  'Consultoria', 'Marketing', 'Indústria', 'Outro'
];

const SECTOR_TO_INDUSTRY = {
  varejo: 'Varejo',
  saas_b2b: 'Tecnologia',
  saude: 'Saúde',
  educacao: 'Educação',
  servicos_financeiros: 'Serviços Financeiros',
  industria: 'Indústria',
};

export const NewBrand = () => {
  const [step, setStep] = useState(0); // 0=template, 1=details
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const { createBrand, setCurrentBrand } = useBrand();
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    if (template.id !== 'blank' && SECTOR_TO_INDUSTRY[template.id]) {
      setIndustry(SECTOR_TO_INDUSTRY[template.id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome da marca é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      const newBrand = await createBrand({
        name: name.trim(),
        description: description.trim() || null,
        industry: industry || null,
        template_applied: selectedTemplate?.id || null
      });

      // Apply template to PillarStart if not blank
      if (selectedTemplate && selectedTemplate.id !== 'blank' && selectedTemplate.pillarStart) {
        try {
          await axios.put(
            `${API}/brands/${newBrand.brand_id}/pillars/start`,
            selectedTemplate.pillarStart,
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } catch (err) {
          console.error('Template apply error:', err);
          // Non-blocking: brand created, template just didn't apply
        }
      }

      setCurrentBrand(newBrand);
      toast.success('Marca criada com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar marca');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="new-brand-page">
      <Button variant="ghost" onClick={() => step === 0 ? navigate(-1) : setStep(0)} className="gap-2" data-testid="back-btn">
        <ArrowLeft className="h-4 w-4" />
        {step === 0 ? 'Voltar' : 'Escolher template'}
      </Button>

      {/* Step 0: Template Selection */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Nova Marca</h1>
              <p className="text-muted-foreground">Escolha um template por setor para acelerar o preenchimento</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="template-grid">
            {SECTOR_TEMPLATES.map((template) => {
              const Icon = ICON_MAP[template.icon] || FileEdit;
              const isSelected = selectedTemplate?.id === template.id;
              return (
                <Card
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'
                  } ${template.id === 'blank' ? 'border-dashed' : ''}`}
                  data-testid={`template-${template.id}`}
                >
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-heading font-semibold mt-3 text-sm">{template.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Preview of selected template */}
          {selectedTemplate && selectedTemplate.id !== 'blank' && selectedTemplate.pillarStart && (
            <Card className="border-primary/30 bg-primary/5" data-testid="template-preview">
              <CardContent className="pt-4 pb-4">
                <button
                  onClick={() => setPreviewOpen(!previewOpen)}
                  className="flex items-center gap-2 w-full text-left"
                  data-testid="preview-toggle"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${previewOpen ? '' : '-rotate-90'}`} />
                  <span className="text-sm font-medium">Veja o que será preenchido no Pilar Start</span>
                </button>
                {previewOpen && (
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Players</p>
                      <p className="text-muted-foreground">{selectedTemplate.pillarStart.players.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Tendências</p>
                      <p className="text-muted-foreground">{selectedTemplate.pillarStart.tendencias.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Públicos</p>
                      <p className="text-muted-foreground">{selectedTemplate.pillarStart.publicos_interesse.join(', ')}</p>
                    </div>
                    <div>
                      <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Cenário Competitivo</p>
                      <p className="text-muted-foreground">{selectedTemplate.pillarStart.cenario_competitivo}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            className="w-full"
            onClick={() => setStep(1)}
            disabled={!selectedTemplate}
            data-testid="continue-to-details-btn"
          >
            Continuar <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step 1: Brand Details */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-heading text-2xl">Dados da Marca</CardTitle>
                <CardDescription>
                  {selectedTemplate && selectedTemplate.id !== 'blank'
                    ? `Template: ${selectedTemplate.name} — o Pilar Start será pré-preenchido`
                    : 'Preencha os dados básicos da marca'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Marca *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Minha Empresa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="brand-name-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Setor / Indústria</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry" data-testid="industry-select">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Breve descrição da marca..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  data-testid="brand-description-input"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(0)} disabled={isLoading}>
                  Voltar
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1" data-testid="create-brand-submit-btn">
                  {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando...</>
                  ) : (
                    'Criar Marca'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NewBrand;
