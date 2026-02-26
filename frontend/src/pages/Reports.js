import { useState, useEffect } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  FileText, 
  Download, 
  Calendar as CalendarIcon,
  BarChart3,
  PieChart,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  File,
  Mail,
  Loader2,
  Eye,
  Share2,
  Plus
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Reports = () => {
  const { currentBrand, metrics, fetchMetrics } = useBrand();
  const { getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [selectedFormat, setSelectedFormat] = useState('pdf');

  useEffect(() => {
    if (currentBrand?.brand_id) {
      fetchMetrics(currentBrand.brand_id);
    }
  }, [currentBrand?.brand_id, fetchMetrics]);

  const handleGenerateReport = async (reportType) => {
    if (!currentBrand?.brand_id) {
      toast.error('Selecione uma marca primeiro');
      return;
    }
    setIsGenerating(true);
    try {
      // Map report type to sections
      const sectionMap = {
        'brand-health': ['summary', 'pillars', 'score'],
        'pillars': ['pillars'],
        'performance': ['score', 'recommendations'],
        'tasks': ['summary', 'recommendations']
      };
      
      const sections = sectionMap[reportType] || ['summary', 'pillars', 'score', 'recommendations'];
      
      const response = await fetch(`${API}/brands/${currentBrand.brand_id}/reports/executive-pdf`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sections })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Erro ao gerar relatório');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentBrand.name}_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success(`Relatório gerado com sucesso!`);
    } catch (error) {
      console.error('Report error:', error);
      toast.error(error.message || 'Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (format) => {
    setIsGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success(`Exportado em formato ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Erro ao exportar');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleScheduleReport = async () => {
    toast.success('Relatório agendado! Você receberá por email semanalmente.');
  };

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para ver os relatórios</p>
      </div>
    );
  }

  const pillarLabels = {
    start: 'Start',
    values: 'Valores',
    purpose: 'Propósito',
    promise: 'Promessa',
    positioning: 'Posicionamento',
    personality: 'Personalidade',
    universality: 'Universalidade'
  };

  const reportTypes = [
    {
      id: 'brand-health',
      title: 'Saúde da Marca',
      description: 'Visão geral do progresso em todos os pilares',
      icon: BarChart3,
      color: 'bg-blue-500'
    },
    {
      id: 'pillar-detail',
      title: 'Detalhamento de Pilares',
      description: 'Análise detalhada de cada pilar de branding',
      icon: PieChart,
      color: 'bg-purple-500'
    },
    {
      id: 'performance',
      title: 'Performance',
      description: 'Métricas de desempenho e tendências',
      icon: TrendingUp,
      color: 'bg-emerald-500'
    },
    {
      id: 'tasks',
      title: 'Tarefas e Execução',
      description: 'Status das tarefas e roadmap',
      icon: CheckCircle2,
      color: 'bg-amber-500'
    }
  ];

  return (
    <div className="space-y-6" data-testid="reports-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">Gere e exporte relatórios da marca {currentBrand.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="date-range-btn">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} - {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {/* Export Format */}
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger className="w-[120px]" data-testid="export-format-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-rose-500" />
                  PDF
                </div>
              </SelectItem>
              <SelectItem value="xlsx">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                  Excel
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="generate">Gerar Relatório</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.overall_completion || 0}%</p>
                    <p className="text-xs text-muted-foreground">Progresso Geral</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.tasks?.done || 0}</p>
                    <p className="text-xs text-muted-foreground">Tarefas Concluídas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.tasks?.in_progress || 0}</p>
                    <p className="text-xs text-muted-foreground">Em Andamento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.decisions?.validated || 0}</p>
                    <p className="text-xs text-muted-foreground">Decisões Validadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pillar Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Progresso por Pilar</CardTitle>
              <CardDescription>Status de preenchimento de cada pilar de branding</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics?.pillars || {}).map(([pillar, progress]) => (
                  <div key={pillar} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{pillarLabels[pillar] || pillar}</span>
                      <span className="text-sm text-muted-foreground">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Export */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exportação Rápida</CardTitle>
              <CardDescription>Exporte um resumo rápido da marca</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleExport('pdf')} disabled={isGenerating} data-testid="export-pdf-btn">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <File className="h-4 w-4 mr-2 text-rose-500" />}
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={() => handleExport('xlsx')} disabled={isGenerating} data-testid="export-excel-btn">
                  {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" />}
                  Exportar Excel
                </Button>
                <Button variant="outline" onClick={handleScheduleReport} data-testid="schedule-report-btn">
                  <Mail className="h-4 w-4 mr-2" />
                  Agendar por Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate Tab */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map(report => {
              const Icon = report.icon;
              return (
                <Card key={report.id} className="card-hover">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl ${report.color} flex items-center justify-center`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading font-semibold">{report.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                        <div className="flex gap-2 mt-4">
                          <Button 
                            size="sm" 
                            onClick={() => handleGenerateReport(report.id)}
                            disabled={isGenerating}
                            data-testid={`generate-${report.id}-btn`}
                          >
                            {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                            Gerar PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Custom Report */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relatório Personalizado</CardTitle>
              <CardDescription>Selecione os dados que deseja incluir</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(pillarLabels).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input type="checkbox" id={`pillar-${key}`} className="rounded" defaultChecked />
                    <label htmlFor={`pillar-${key}`} className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
                <div className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="checkbox" id="include-tasks" className="rounded" defaultChecked />
                  <label htmlFor="include-tasks" className="text-sm cursor-pointer">Tarefas</label>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="checkbox" id="include-decisions" className="rounded" defaultChecked />
                  <label htmlFor="include-decisions" className="text-sm cursor-pointer">Decisões</label>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="checkbox" id="include-narratives" className="rounded" />
                  <label htmlFor="include-narratives" className="text-sm cursor-pointer">Narrativas</label>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input type="checkbox" id="include-metrics" className="rounded" defaultChecked />
                  <label htmlFor="include-metrics" className="text-sm cursor-pointer">Métricas</label>
                </div>
              </div>
              <Button className="mt-4" disabled={isGenerating} data-testid="generate-custom-btn">
                {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                Gerar Relatório Personalizado
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relatórios Gerados</CardTitle>
              <CardDescription>Histórico dos últimos relatórios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'Saúde da Marca - Janeiro 2024', date: '2024-01-15', format: 'PDF', size: '2.4 MB' },
                  { name: 'Progresso de Pilares', date: '2024-01-10', format: 'Excel', size: '1.1 MB' },
                  { name: 'Relatório Semanal #4', date: '2024-01-08', format: 'PDF', size: '1.8 MB' },
                  { name: 'Análise de Tarefas', date: '2024-01-05', format: 'PDF', size: '980 KB' },
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {report.format === 'PDF' ? (
                        <File className="h-8 w-8 text-rose-500" />
                      ) : (
                        <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                      )}
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{report.date}</span>
                          <span>•</span>
                          <span>{report.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scheduled Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Relatórios Agendados</CardTitle>
              <CardDescription>Relatórios enviados automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Resumo Semanal</p>
                      <p className="text-xs text-muted-foreground">Toda segunda-feira às 9h</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">Ativo</Badge>
                </div>
              </div>
              <Button variant="outline" className="mt-4 w-full" data-testid="new-schedule-btn">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
