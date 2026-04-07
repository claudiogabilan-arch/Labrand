import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Building2, Plus, Edit2, Trash2, Lightbulb } from 'lucide-react';
import { OFFLINE_TYPE_ICONS, getScoreColor, getROIColor, getSentimentIcon } from './touchpointConstants';

export default function TouchpointOffline({ touchpoints, offlineTypes, stats, onEdit, onDelete, onCreateOffline }) {
  const offlineTouchpoints = touchpoints.filter(tp => tp.ambiente === 'Offline');

  return (
    <div className="space-y-4" data-testid="offline-tab-content">
      {/* Offline Stats */}
      {offlineTouchpoints.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['palestra', 'imersao', 'tv', 'mentoria'].map(typeId => {
            const typeDef = offlineTypes.find(t => t.id === typeId);
            const count = offlineTouchpoints.filter(tp => tp.tipo_offline === typeId).length;
            const TypeIcon = OFFLINE_TYPE_ICONS[typeId] || Building2;
            return (
              <Card key={typeId}>
                <CardContent className="pt-6 text-center">
                  <TypeIcon className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{typeDef?.label || typeId}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Principle box */}
      <Card className="border-cyan-200 bg-cyan-50/30 dark:bg-cyan-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-cyan-600 mt-0.5 shrink-0" />
            <div className="text-sm text-cyan-800 dark:text-cyan-200">
              <p className="font-medium mb-1">Principio Orientador</p>
              <p>O LABrand nao mede audiencia. Mede percepcao, preferencia e conversao ao longo do tempo. Cada Touchpoint Offline bem preenchido e um dado que prova o valor da marca. O conjunto desses dados ao longo de 12 meses e o que transforma a marca em ativo mensuravel e defensavel.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offline Touchpoints List by Type */}
      {offlineTouchpoints.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="font-semibold text-lg">Nenhum touchpoint offline cadastrado</h3>
                <p className="text-muted-foreground text-sm">Registre suas acoes presenciais: palestras, imersoes, aparicoes em midia e mentorias</p>
              </div>
              <Button onClick={onCreateOffline} data-testid="create-offline-tp-btn">
                <Plus className="h-4 w-4 mr-2" /> Novo Touchpoint Offline
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {['palestra', 'imersao', 'tv', 'mentoria'].map(typeId => {
            const typeDef = offlineTypes.find(t => t.id === typeId);
            const typeTps = offlineTouchpoints.filter(tp => tp.tipo_offline === typeId);
            const TypeIcon = OFFLINE_TYPE_ICONS[typeId] || Building2;
            if (typeTps.length === 0) return null;
            return (
              <Card key={typeId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TypeIcon className="h-5 w-5 text-orange-500" />
                    {typeDef?.label || typeId} ({typeTps.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {typeTps.map(tp => {
                      const scoreColor = getScoreColor(tp.nota);
                      const sentiment = getSentimentIcon(tp.sentimento);
                      const SentimentIcon = sentiment.icon;
                      return (
                        <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border hover:border-orange-300 transition-colors" data-testid={`offline-tp-${tp.touchpoint_id}`}>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{tp.nome}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span>{tp.fase_funil}</span>
                              <span className="flex items-center gap-1"><SentimentIcon className={`h-3 w-3 ${sentiment.color}`} />{tp.sentimento}</span>
                              {tp.custo_mensal > 0 && <span>Custo: R$ {tp.custo_mensal.toLocaleString('pt-BR')}</span>}
                              {tp.receita_gerada > 0 && <span className="text-green-600">Receita: R$ {tp.receita_gerada.toLocaleString('pt-BR')}</span>}
                              {tp.conversoes > 0 && <span>{tp.conversoes} conversoes</span>}
                              {tp.roi !== 0 && <span className={getROIColor(tp.roi)}>ROI: {tp.roi}%</span>}
                              {tp.emissora && <span className="font-medium text-blue-600">{tp.emissora}</span>}
                              {tp.dia_horario && <span>{tp.dia_horario}</span>}
                            </div>
                            {tp.descricao && <p className="text-xs text-muted-foreground mt-1 truncate">{tp.descricao}</p>}
                          </div>
                          <div className="flex items-center gap-2 ml-2">
                            <div className={`w-10 h-10 rounded-full ${scoreColor.bg} flex items-center justify-center`}>
                              <span className="text-white font-bold">{tp.nota}</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tp)} data-testid={`edit-tp-${tp.touchpoint_id}`}><Edit2 className="h-3 w-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onDelete(tp.touchpoint_id)} data-testid={`delete-tp-${tp.touchpoint_id}`}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Untyped offline touchpoints */}
          {offlineTouchpoints.filter(tp => !tp.tipo_offline).length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-500" />
                  Outros Offline ({offlineTouchpoints.filter(tp => !tp.tipo_offline).length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {offlineTouchpoints.filter(tp => !tp.tipo_offline).map(tp => (
                    <div key={tp.touchpoint_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{tp.nome}</p>
                        <p className="text-xs text-muted-foreground">{tp.fase_funil}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-10 h-10 rounded-full ${getScoreColor(tp.nota).bg} flex items-center justify-center`}>
                          <span className="text-white font-bold">{tp.nota}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(tp)}><Edit2 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onDelete(tp.touchpoint_id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
