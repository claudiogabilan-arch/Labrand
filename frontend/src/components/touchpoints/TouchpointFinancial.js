import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { DollarSign, Target, TrendingUp, Building2 } from 'lucide-react';
import { OFFLINE_TYPE_ICONS, getROIColor } from './touchpointConstants';

export default function TouchpointFinancial({ touchpoints, financial }) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><DollarSign className="h-8 w-8 mx-auto mb-2 text-red-500" /><p className="text-2xl font-bold">R$ {(financial.total_custo || 0).toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">Investimento Mensal</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><DollarSign className="h-8 w-8 mx-auto mb-2 text-green-500" /><p className="text-2xl font-bold">R$ {(financial.total_receita || 0).toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">Receita Gerada</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Target className="h-8 w-8 mx-auto mb-2 text-blue-500" /><p className="text-2xl font-bold">{financial.total_conversoes || 0}</p><p className="text-sm text-muted-foreground">Conversoes</p></CardContent></Card>
        <Card className={`border-2 ${financial.roi_geral >= 0 ? 'border-green-300' : 'border-red-300'}`}><CardContent className="pt-6 text-center"><TrendingUp className={`h-8 w-8 mx-auto mb-2 ${getROIColor(financial.roi_geral || 0)}`} /><p className={`text-2xl font-bold ${getROIColor(financial.roi_geral || 0)}`}>{financial.roi_geral || 0}%</p><p className="text-sm text-muted-foreground">ROI Geral</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>ROI por Touchpoint</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {touchpoints.filter(tp => tp.custo_mensal > 0).sort((a, b) => b.roi - a.roi).map(tp => {
              const TypeIcon = tp.tipo_offline ? (OFFLINE_TYPE_ICONS[tp.tipo_offline] || Building2) : null;
              return (
                <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium flex items-center gap-1.5">
                      {TypeIcon && <TypeIcon className="h-4 w-4 text-orange-500" />}
                      {tp.nome}
                      {tp.ambiente === 'Offline' && <Badge variant="outline" className="text-xs ml-1">Offline</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">Custo: R$ {tp.custo_mensal.toLocaleString('pt-BR')} | Receita: R$ {tp.receita_gerada.toLocaleString('pt-BR')}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${getROIColor(tp.roi)}`}>{tp.roi}%</p>
                    <p className="text-xs text-muted-foreground">{tp.conversoes} conversoes</p>
                  </div>
                </div>
              );
            })}
            {touchpoints.filter(tp => tp.custo_mensal > 0).length === 0 && (
              <p className="text-center text-muted-foreground py-8">Adicione dados financeiros aos touchpoints para ver o ROI</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
