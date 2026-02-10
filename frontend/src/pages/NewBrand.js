import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Loader2, Building2, ArrowLeft } from 'lucide-react';

const industries = [
  'Tecnologia',
  'Saúde',
  'Educação',
  'Varejo',
  'Alimentação',
  'Moda',
  'Serviços Financeiros',
  'Entretenimento',
  'Imobiliário',
  'Consultoria',
  'Marketing',
  'Indústria',
  'Outro'
];

export const NewBrand = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const { createBrand, setCurrentBrand } = useBrand();
  const navigate = useNavigate();

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
        industry: industry || null
      });
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
    <div className="max-w-2xl mx-auto space-y-6" data-testid="new-brand-page">
      <Button 
        variant="ghost" 
        onClick={() => navigate(-1)}
        className="gap-2"
        data-testid="back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="font-heading text-2xl">Nova Marca</CardTitle>
              <CardDescription>
                Cadastre uma nova marca para começar a construir sua estratégia
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
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
                data-testid="create-brand-submit-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Marca'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewBrand;
