import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, ChevronDown, Monitor, Building2, Edit2, Trash2 } from 'lucide-react';
import { FUNNEL_PHASES, OFFLINE_TYPE_ICONS, getScoreColor, getROIColor, getSentimentIcon } from './touchpointConstants';

export default function TouchpointFunnel({ byPhase, onEdit, onDelete }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Visualizacao do Funil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {FUNNEL_PHASES.map((phase, index) => {
            const phaseData = byPhase[phase] || [];
            const widthPercent = 100 - (index * 15);
            return (
              <div key={phase} className="relative">
                <div className={`mx-auto rounded-lg p-4 ${index === 0 ? 'bg-blue-100 dark:bg-blue-950/30' : index === 1 ? 'bg-purple-100 dark:bg-purple-950/30' : 'bg-green-100 dark:bg-green-950/30'}`} style={{ width: `${widthPercent}%` }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      {index === 0 && <TrendingUp className="h-4 w-4 text-blue-500" />}
                      {index === 1 && <Minus className="h-4 w-4 text-purple-500" />}
                      {index === 2 && <TrendingDown className="h-4 w-4 text-green-500" />}
                      {phase}
                    </h3>
                    <Badge variant="secondary">{phaseData.length} touchpoints</Badge>
                  </div>
                  {phaseData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum touchpoint nesta fase</p>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {phaseData.map(tp => {
                        const scoreColor = getScoreColor(tp.nota);
                        const sentiment = getSentimentIcon(tp.sentimento);
                        const SentimentIcon = sentiment.icon;
                        const TypeIcon = tp.tipo_offline ? (OFFLINE_TYPE_ICONS[tp.tipo_offline] || Building2) : null;
                        return (
                          <div key={tp.touchpoint_id} className="bg-white dark:bg-background rounded-lg p-3 border shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{tp.nome}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    {tp.ambiente === 'Online' ? <Monitor className="h-3 w-3 mr-1" /> : TypeIcon ? <TypeIcon className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                                    {tp.ambiente}
                                  </Badge>
                                  <SentimentIcon className={`h-4 w-4 ${sentiment.color}`} />
                                  {tp.roi !== undefined && tp.roi !== 0 && <span className={`text-xs ${getROIColor(tp.roi)}`}>ROI: {tp.roi}%</span>}
                                </div>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <div className={`w-10 h-10 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                                  <span className="text-white font-bold">{tp.nota}</span>
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(tp)}><Edit2 className="h-3 w-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => onDelete(tp.touchpoint_id)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {index < 2 && <div className="flex justify-center py-1"><ChevronDown className="h-6 w-6 text-muted-foreground" /></div>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
