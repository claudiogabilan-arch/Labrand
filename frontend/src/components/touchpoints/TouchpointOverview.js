import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Monitor, Building2, AlertTriangle, CheckCircle2, PieChart, Edit2, Trash2 } from 'lucide-react';
import { FUNNEL_PHASES, OFFLINE_TYPE_ICONS, getScoreColor, getROIColor, getSentimentIcon } from './touchpointConstants';

export default function TouchpointOverview({
  touchpoints, stats, financial, heatmap, topCritical, topExcellent, onEdit, onDelete
}) {
  const onlineTouchpoints = touchpoints.filter(tp => tp.ambiente === 'Online');
  const offlineTouchpoints = touchpoints.filter(tp => tp.ambiente === 'Offline');

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.total || 0}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className={`text-3xl font-bold ${getScoreColor(stats.avg_score || 0).text}`}>{stats.avg_score || 0}</p><p className="text-sm text-muted-foreground">Media</p></CardContent></Card>
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20"><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-green-600">{stats.excellent || 0}</p><p className="text-sm text-muted-foreground">Excelentes</p></CardContent></Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20"><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-yellow-600">{stats.attention || 0}</p><p className="text-sm text-muted-foreground">Atencao</p></CardContent></Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20"><CardContent className="pt-6 text-center"><p className="text-3xl font-bold text-red-600">{stats.critical || 0}</p><p className="text-sm text-muted-foreground">Criticos</p></CardContent></Card>
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"><CardContent className="pt-6 text-center"><p className={`text-3xl font-bold ${getROIColor(financial.roi_geral || 0)}`}>{financial.roi_geral || 0}%</p><p className="text-sm text-muted-foreground">ROI Geral</p></CardContent></Card>
      </div>

      {/* Online vs Offline */}
      {touchpoints.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-blue-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Monitor className="h-4 w-4 text-blue-500" /> Online ({stats.total_online || 0})</CardTitle></CardHeader>
            <CardContent>
              {onlineTouchpoints.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum touchpoint online</p> : (
                <div className="space-y-1">
                  {onlineTouchpoints.slice(0, 5).map(tp => (
                    <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 rounded border text-sm">
                      <span className="truncate flex-1">{tp.nome}</span>
                      <div className={`w-7 h-7 rounded-full ${getScoreColor(tp.nota).bg} flex items-center justify-center`}>
                        <span className="text-white text-xs font-bold">{tp.nota}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="border-orange-200">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building2 className="h-4 w-4 text-orange-500" /> Offline ({stats.total_offline || 0})</CardTitle></CardHeader>
            <CardContent>
              {offlineTouchpoints.length === 0 ? <p className="text-sm text-muted-foreground text-center py-2">Nenhum touchpoint offline</p> : (
                <div className="space-y-1">
                  {offlineTouchpoints.slice(0, 5).map(tp => {
                    const TypeIcon = OFFLINE_TYPE_ICONS[tp.tipo_offline] || Building2;
                    return (
                      <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 rounded border text-sm">
                        <span className="truncate flex-1 flex items-center gap-1.5"><TypeIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />{tp.nome}</span>
                        <div className={`w-7 h-7 rounded-full ${getScoreColor(tp.nota).bg} flex items-center justify-center`}>
                          <span className="text-white text-xs font-bold">{tp.nota}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" /> Heatmap da Jornada</CardTitle>
          <CardDescription>Saude dos touchpoints por fase do funil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {FUNNEL_PHASES.map((phase) => {
              const data = heatmap[phase] || {};
              const scoreColor = getScoreColor(data.avg_score || 0);
              return (
                <div key={phase} className={`p-4 rounded-lg border-2 ${data.critical > 0 ? 'border-red-300 bg-red-50/50 dark:bg-red-950/20' : data.avg_score >= 7 ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{phase}</h4>
                    <Badge variant="outline">{data.count || 0}</Badge>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                      <span className="text-white font-bold text-xl">{data.avg_score || 0}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={(data.avg_score || 0) * 10} className="h-2 mb-2" />
                      <div className="flex justify-between text-xs">
                        {data.critical > 0 && <span className="text-red-500">{data.critical} criticos</span>}
                        <span className={getROIColor(data.roi || 0)}>ROI: {data.roi || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top 5 Lists */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Top 5 Criticos</CardTitle></CardHeader>
          <CardContent>
            {topCritical.length === 0 ? <p className="text-center text-muted-foreground py-4">Nenhum touchpoint critico!</p> : (
              <div className="space-y-2">
                {topCritical.map(tp => (
                  <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{tp.nota}</Badge>
                      <span className="font-medium">{tp.nome}</span>
                      {tp.ambiente === 'Offline' && <Badge variant="outline" className="text-xs">Offline</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{tp.fase_funil}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardHeader><CardTitle className="text-green-600 flex items-center gap-2"><CheckCircle2 className="h-5 w-5" /> Top 5 Melhores</CardTitle></CardHeader>
          <CardContent>
            {topExcellent.length === 0 ? <p className="text-center text-muted-foreground py-4">Adicione touchpoints para ver os melhores</p> : (
              <div className="space-y-2">
                {topExcellent.map(tp => (
                  <div key={tp.touchpoint_id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500">{tp.nota}</Badge>
                      <span className="font-medium">{tp.nome}</span>
                      {tp.ambiente === 'Offline' && <Badge variant="outline" className="text-xs">Offline</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{tp.fase_funil}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
