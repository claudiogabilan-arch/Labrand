import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Brain, Zap, Loader2, AlertTriangle, Target, Lightbulb, DollarSign, ArrowRight } from 'lucide-react';

export default function TouchpointAI({ touchpoints, aiAnalysis, analyzing, onAnalyze }) {
  return (
    <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400"><Brain className="h-5 w-5" /> Analise Inteligente com IA</CardTitle>
            <CardDescription>Recomendacoes estrategicas baseadas nos seus touchpoints</CardDescription>
          </div>
          <Button onClick={onAnalyze} disabled={analyzing || touchpoints.length === 0} className="bg-purple-600 hover:bg-purple-700">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analisando...</> : <><Zap className="h-4 w-4 mr-2" /> Analisar (3 creditos)</>}
          </Button>
        </div>
      </CardHeader>

      {aiAnalysis && aiAnalysis.diagnostico ? (
        <CardContent className="space-y-6">
          <div className="p-4 bg-white dark:bg-background rounded-lg border"><h4 className="font-semibold mb-2">Diagnostico</h4><p>{aiAnalysis.diagnostico}</p></div>

          {aiAnalysis.pontos_criticos?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /> Pontos Criticos</h4>
              <div className="space-y-2">
                {aiAnalysis.pontos_criticos.map((p, i) => (
                  <div key={i} className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200">
                    <div className="flex items-start justify-between"><div><p className="font-medium">{p.touchpoint}</p><p className="text-sm text-muted-foreground">{p.problema}</p></div><Badge variant={p.impacto === 'alto' ? 'destructive' : 'secondary'}>{p.impacto}</Badge></div>
                    <div className="mt-2 flex items-center gap-2 text-sm"><ArrowRight className="h-4 w-4 text-green-500" /><span className="text-green-700 dark:text-green-400">{p.acao_sugerida}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiAnalysis.quick_wins?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Quick Wins</h4>
              <div className="grid md:grid-cols-3 gap-2">
                {aiAnalysis.quick_wins.map((qw, i) => <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200"><span className="text-sm">{qw}</span></div>)}
              </div>
            </div>
          )}

          {aiAnalysis.otimizacao_funil && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-blue-500" /> Otimizacao do Funil</h4>
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200"><p className="font-medium text-blue-700 mb-1">Topo</p><p className="text-sm">{aiAnalysis.otimizacao_funil.topo}</p></div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200"><p className="font-medium text-purple-700 mb-1">Meio</p><p className="text-sm">{aiAnalysis.otimizacao_funil.meio}</p></div>
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200"><p className="font-medium text-green-700 mb-1">Fundo</p><p className="text-sm">{aiAnalysis.otimizacao_funil.fundo}</p></div>
              </div>
            </div>
          )}

          {aiAnalysis.sugestao_novos_touchpoints?.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-orange-500" /> Touchpoints Sugeridos</h4>
              <div className="space-y-2">
                {aiAnalysis.sugestao_novos_touchpoints.map((s, i) => (
                  <div key={i} className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 flex items-center justify-between">
                    <div><p className="font-medium">{s.nome}</p><p className="text-sm text-muted-foreground">{s.motivo}</p></div>
                    <Badge variant="outline">{s.fase}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiAnalysis.roi_insights && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
              <h4 className="font-semibold mb-2 flex items-center gap-2"><DollarSign className="h-4 w-4 text-green-500" /> Insights de ROI</h4>
              <p>{aiAnalysis.roi_insights}</p>
            </div>
          )}

          {aiAnalysis.prioridades?.length > 0 && (
            <div><h4 className="font-semibold mb-3">Prioridades</h4><ol className="list-decimal list-inside space-y-1">{aiAnalysis.prioridades.map((p, i) => <li key={i} className="text-sm">{p}</li>)}</ol></div>
          )}

          <p className="text-xs text-muted-foreground text-right">Analise realizada em {new Date(aiAnalysis.analyzed_at).toLocaleString('pt-BR')} | {aiAnalysis.touchpoints_analyzed} touchpoints analisados</p>
        </CardContent>
      ) : (
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold">Nenhuma analise realizada</h3>
            <p className="text-muted-foreground text-sm mt-1">Clique em "Analisar" para obter recomendacoes estrategicas baseadas nos seus touchpoints</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
