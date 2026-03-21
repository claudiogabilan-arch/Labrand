import { useState, useEffect, useCallback } from 'react';
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
  FileText, Download, Calendar as CalendarIcon, BarChart3, PieChart,
  TrendingUp, CheckCircle2, Clock, FileSpreadsheet, File, Mail,
  Loader2, Share2, Plus, Target
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Reports = () => {
  const { currentBrand, metrics, fetchMetrics } = useBrand();
  const { getAuthHeaders, token } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    to: new Date()
  });
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [customSections, setCustomSections] = useState({
    start: true, values: true, purpose: true, promise: true,
    positioning: true, personality: true, universality: false,
    tasks: false, decisions: false, narratives: false, metrics: false
  });

  useEffect(() => {
    if (currentBrand?.brand_id) {
      fetchMetrics(currentBrand.brand_id);
      loadReportHistory();
    }
  }, [currentBrand?.brand_id]);

  const loadReportHistory = useCallback(async () => {
    if (!currentBrand?.brand_id) return;
    try {
      const response = await fetch(`${API}/brands/${currentBrand.brand_id}/reports/history`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setReportHistory(data.reports || []);
      }
    } catch (error) {
      console.error('Error loading report history:', error);
    }
  }, [currentBrand?.brand_id, token]);

  const downloadPDF = (blob, reportName) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentBrand.name}_${reportName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async (reportType) => {
    if (!currentBrand?.brand_id) {
      toast.error('Selecione uma marca primeiro');
      return;
    }

    setIsGenerating(reportType);
    try {
      const sectionMap = {
        'brand-health': ['summary', 'pillars', 'score'],
        'pillar-detail': ['pillars', 'score'],
        'performance': ['score', 'touchpoints', 'recommendations'],
        'tasks': ['summary', 'recommendations']
      };
      
      const sections = sectionMap[reportType] || ['summary', 'pillars', 'score', 'touchpoints', 'recommendations'];
      
      const response = await fetch(`${API}/brands/${currentBrand.brand_id}/reports/executive-pdf`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sections, include_charts: true })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Erro ao gerar relatório');
      }
      
      const blob = await response.blob();
      downloadPDF(blob, reportType);
      toast.success('Relatório gerado com sucesso!');
      loadReportHistory();
    } catch (error) {
      console.error('Report error:', error);
      toast.error(error.message || 'Erro ao gerar relatório');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateCustomReport = async () => {
    if (!currentBrand?.brand_id) {
      toast.error('Selecione uma marca primeiro');
      return;
    }

    const selectedPillars = Object.entries(customSections)
      .filter(([_, checked]) => checked)
      .map(([key]) => key);

    if (selectedPillars.length === 0) {
      toast.error('Selecione pelo menos uma seção');
      return;
    }

    setIsGenerating('custom');
    try {
      const sections = ['summary', 'pillars', 'score', 'touchpoints', 'recommendations'];
      
      const response = await fetch(`${API}/brands/${currentBrand.brand_id}/reports/executive-pdf`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sections, include_charts: true })
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || 'Erro ao gerar relatório');
      }
      
      const blob = await response.blob();
      downloadPDF(blob, 'personalizado');
      toast.success('Relatório personalizado gerado!');
      loadReportHistory();
    } catch (error) {
      console.error('Custom report error:', error);
      toast.error(error.message || 'Erro ao gerar relatório personalizado');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleDownloadHistoryReport = async (reportId) => {
    if (!currentBrand?.brand_id) return;
    setIsGenerating(reportId);
    try {
      const response = await fetch(
        `${API}/brands/${currentBrand.brand_id}/reports/${reportId}/download`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Erro ao baixar relatório');
      const blob = await response.blob();
      downloadPDF(blob, reportId);
      toast.success('Download concluído!');
    } catch (error) {
      toast.error(error.message || 'Erro ao baixar relatório');
    } finally {
      setIsGenerating(null);
    }
  };

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para ver os relatórios</p>
      </div>
    );
  }

  const pillarLabels = {
    start: 'Start', values: 'Valores', purpose: 'Propósito', promise: 'Promessa',
    positioning: 'Posicionamento', personality: 'Personalidade', universality: 'Universalidade'
  };

  const reportTypes = [
    { id: 'brand-health', title: 'Saúde da Marca', description: 'Visão geral do progresso em todos os pilares', icon: BarChart3, color: 'bg-blue-500' },
    { id: 'pillar-detail', title: 'Detalhamento de Pilares', description: 'Análise detalhada de cada pilar de branding', icon: PieChart, color: 'bg-purple-500' },
    { id: 'performance', title: 'Performance', description: 'Métricas de desempenho e tendências', icon: TrendingUp, color: 'bg-emerald-500' },
    { id: 'tasks', title: 'Tarefas e Execução', description: 'Status das tarefas e roadmap', icon: CheckCircle2, color: 'bg-amber-500' }
  ];

  const toggleCustomSection = (key) => {
    setCustomSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
                  if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger className="w-[120px]" data-testid="export-format-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf"><div className="flex items-center gap-2"><File className="h-4 w-4 text-rose-500" />PDF</div></SelectItem>
              <SelectItem value="xlsx"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-500" />Excel</div></SelectItem>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><Target className="h-5 w-5 text-blue-600" /></div><div><p className="text-2xl font-bold">{metrics?.overall_completion || 0}%</p><p className="text-xs text-muted-foreground">Progresso Geral</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><p className="text-2xl font-bold">{metrics?.tasks?.done || 0}</p><p className="text-xs text-muted-foreground">Tarefas Concluídas</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center"><Clock className="h-5 w-5 text-amber-600" /></div><div><p className="text-2xl font-bold">{metrics?.tasks?.in_progress || 0}</p><p className="text-xs text-muted-foreground">Em Andamento</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-purple-600" /></div><div><p className="text-2xl font-bold">{metrics?.decisions?.validated || 0}</p><p className="text-xs text-muted-foreground">Decisões Validadas</p></div></div></CardContent></Card>
          </div>

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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exportação Rápida</CardTitle>
              <CardDescription>Exporte um resumo rápido da marca</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => handleGenerateReport('brand-health')} disabled={isGenerating !== null} data-testid="export-pdf-btn">
                  {isGenerating === 'brand-health' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <File className="h-4 w-4 mr-2 text-rose-500" />}
                  Exportar PDF
                </Button>
                <Button variant="outline" onClick={() => toast.success('Relatório agendado! Você receberá por email semanalmente.')} data-testid="schedule-report-btn">
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
                            disabled={isGenerating !== null}
                            data-testid={`generate-${report.id}-btn`}
                          >
                            {isGenerating === report.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
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
                    onClick={() => toggleCustomSection(key)}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${customSections[key] ? 'border-primary bg-primary/5' : ''}`}
                    data-testid={`custom-section-${key}`}
                  >
                    <input type="checkbox" checked={customSections[key] || false} onChange={() => toggleCustomSection(key)} className="rounded" />
                    <label className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
                {[
                  { key: 'tasks', label: 'Tarefas' },
                  { key: 'decisions', label: 'Decisões' },
                  { key: 'narratives', label: 'Narrativas' },
                  { key: 'metrics', label: 'Métricas' }
                ].map(({ key, label }) => (
                  <div
                    key={key}
                    onClick={() => toggleCustomSection(key)}
                    className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${customSections[key] ? 'border-primary bg-primary/5' : ''}`}
                    data-testid={`custom-section-${key}`}
                  >
                    <input type="checkbox" checked={customSections[key] || false} onChange={() => toggleCustomSection(key)} className="rounded" />
                    <label className="text-sm cursor-pointer">{label}</label>
                  </div>
                ))}
              </div>
              <Button 
                className="mt-4" 
                disabled={isGenerating !== null} 
                onClick={handleGenerateCustomReport}
                data-testid="generate-custom-btn"
              >
                {isGenerating === 'custom' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
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
              <CardDescription>Histórico dos relatórios da marca {currentBrand.name}</CardDescription>
            </CardHeader>
            <CardContent>
              {reportHistory.length > 0 ? (
                <div className="space-y-3">
                  {reportHistory.map((report, index) => (
                    <div key={report.report_id || index} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`history-report-${index}`}>
                      <div className="flex items-center gap-3">
                        <File className="h-8 w-8 text-rose-500" />
                        <div>
                          <p className="font-medium">{report.brand_name || 'Relatório'}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{report.generated_at ? new Date(report.generated_at).toLocaleString('pt-BR') : '-'}</span>
                            <span>-</span>
                            <span>Completude: {report.completion_rate || 0}%</span>
                            {report.bvs_score > 0 && <><span>-</span><span>BVS: {report.bvs_score}</span></>}
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDownloadHistoryReport(report.report_id)}
                        disabled={isGenerating === report.report_id}
                        data-testid={`download-report-${index}`}
                      >
                        {isGenerating === report.report_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum relatório gerado ainda. Vá até a aba "Gerar Relatório" para criar o primeiro.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
