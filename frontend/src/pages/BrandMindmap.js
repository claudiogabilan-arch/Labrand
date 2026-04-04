import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Loader2, Download, Maximize2, X, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const API = process.env.REACT_APP_BACKEND_URL;

const PILLAR_META = {
  start:         { label: 'Start',           color: '#3B82F6', route: '/pillars/start',         icon: 'S',  desc: 'Definicao inicial e essencia da marca' },
  values:        { label: 'Valores',         color: '#EF4444', route: '/pillars/values',        icon: 'V',  desc: 'Valores fundamentais que guiam a marca' },
  purpose:       { label: 'Proposito',       color: '#22C55E', route: '/pillars/purpose',       icon: 'P',  desc: 'A razao de existir da marca' },
  promise:       { label: 'Promessa',        color: '#F59E0B', route: '/pillars/promise',       icon: 'Pr', desc: 'A promessa entregue ao publico' },
  positioning:   { label: 'Posicionamento',  color: '#06B6D4', route: '/pillars/positioning',   icon: 'Po', desc: 'Como a marca se diferencia no mercado' },
  personality:   { label: 'Personalidade',   color: '#8B5CF6', route: '/pillars/personality',   icon: 'Pe', desc: 'Tom de voz e carater da marca' },
  universality:  { label: 'Universal',       color: '#EC4899', route: '/pillars/universality',  icon: 'U',  desc: 'Consistencia em todos os pontos de contato' },
};

const METADATA_KEYS = new Set(['completion', 'updated_at', 'created_at', 'brand_id', 'pillar_type', '_id', 'type']);

const PILLAR_ORDER = ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality'];

// Extract displayable text from a value (handles nested objects/arrays)
function extractDisplayText(value, maxLen = 40) {
  if (!value) return '';
  if (typeof value === 'string') return value.length > maxLen ? value.substring(0, maxLen) + '...' : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    // Array of strings
    if (typeof value[0] === 'string') {
      const joined = value.slice(0, 2).join(', ');
      return value.length > 2 ? joined + ` (+${value.length - 2})` : joined;
    }
    // Array of objects - try to extract text from common keys
    const textItems = value.map(item => extractObjectLabel(item)).filter(Boolean);
    if (textItems.length === 0) return '';
    const joined = textItems.slice(0, 2).join(', ');
    return textItems.length > 2 ? joined + ` (+${textItems.length - 2})` : joined;
  }
  if (typeof value === 'object') {
    return extractObjectLabel(value) || '';
  }
  return '';
}

// Extract a human-readable label from an object
function extractObjectLabel(obj) {
  if (!obj || typeof obj !== 'object') return '';
  // Try common label keys
  for (const key of ['name', 'nome', 'title', 'titulo', 'label', 'value', 'valor', 'declaracao', 'descricao', 'description', 'text', 'texto']) {
    if (typeof obj[key] === 'string' && obj[key].trim()) {
      return obj[key].trim().length > 35 ? obj[key].trim().substring(0, 35) + '...' : obj[key].trim();
    }
  }
  // Try first string value
  for (const val of Object.values(obj)) {
    if (typeof val === 'string' && val.trim() && val.length < 60) return val.trim();
  }
  return '';
}

// Check if a value is displayable
function isDisplayable(key, value) {
  if (METADATA_KEYS.has(key)) return false;
  if (!value) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    if (typeof value[0] === 'string') return true;
    // Array of objects - check if we can extract labels
    return value.some(item => extractObjectLabel(item));
  }
  if (typeof value === 'object') return !!extractObjectLabel(value);
  return true;
}

export default function BrandMindmap() {
  const navigate = useNavigate();
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [pillarsData, setPillarsData] = useState({});
  const [metrics, setMetrics] = useState(null);

  const handleExportPNG = async () => {
    setExporting(true);
    try {
      const el = document.querySelector('[data-testid="mindmap-canvas"]');
      if (!el) { toast.error('Mindmap nao encontrado'); return; }
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fafafa', useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `mindmap-${currentBrand?.name || 'marca'}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Mindmap exportado!');
    } catch { toast.error('Erro ao exportar'); }
    finally { setExporting(false); }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => {
      document.body.style.overflow = prev ? '' : 'hidden';
      return !prev;
    });
  };

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && isFullscreen) toggleFullscreen(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  const handleNodeClick = useCallback((_event, node) => {
    const pillarKey = node.id.split('-')[0];
    if (pillarKey === 'brand') return;

    const meta = PILLAR_META[pillarKey];
    if (!meta) return;

    // If clicking on a pillar node, show detail panel
    if (PILLAR_ORDER.includes(node.id)) {
      setSelectedPillar(node.id);
    } else {
      // Sub-item click → navigate directly
      navigate(meta.route);
    }
  }, [navigate]);

  const buildMindmap = useCallback(async () => {
    if (!currentBrand) return;
    setLoading(true);

    try {
      const [summaryRes, metricsRes] = await Promise.all([
        fetch(`${API}/api/brands/${currentBrand.brand_id}/pillars-summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/brands/${currentBrand.brand_id}/metrics`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const data = summaryRes.ok ? await summaryRes.json() : {};
      const met = metricsRes.ok ? await metricsRes.json() : null;
      setPillarsData(data);
      setMetrics(met);

      const newNodes = [];
      const newEdges = [];

      // Central brand node
      newNodes.push({
        id: 'brand',
        position: { x: 400, y: 300 },
        data: {
          label: (
            <div className="text-center cursor-default">
              <div className="text-base font-bold tracking-tight">{currentBrand.name}</div>
              <div className="text-[11px] mt-1 opacity-80">{data.completion || 0}% completo</div>
            </div>
          )
        },
        style: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: 130,
          height: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          fontSize: '14px',
        },
      });

      // Pillars in a circle
      const radius = 250;
      const cx = 400, cy = 300;

      PILLAR_ORDER.forEach((pillar, index) => {
        const meta = PILLAR_META[pillar];
        const angle = (index * 2 * Math.PI / PILLAR_ORDER.length) - Math.PI / 2;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);

        const pillarContent = data[pillar] || {};
        const hasData = Object.keys(pillarContent).length > 0;
        const completion = met?.pillars?.[pillar] || 0;

        newNodes.push({
          id: pillar,
          position: { x: x - 65, y: y - 35 },
          data: {
            label: (
              <div className="text-center cursor-pointer select-none">
                <div className="text-xs font-bold uppercase tracking-wider mb-0.5">{meta.label}</div>
                <div className="text-[10px] opacity-75">{completion}%</div>
                {/* Mini progress bar */}
                <div className="w-full h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${completion}%`, backgroundColor: 'rgba(255,255,255,0.7)' }}
                  />
                </div>
              </div>
            )
          },
          style: {
            background: hasData ? meta.color : '#CBD5E1',
            color: hasData ? 'white' : '#64748B',
            border: hasData ? `3px solid ${meta.color}` : '2px dashed #94A3B8',
            borderRadius: '14px',
            padding: '14px 18px',
            fontSize: '12px',
            width: 130,
            boxShadow: hasData ? `0 4px 20px ${meta.color}40` : 'none',
            transition: 'transform 0.2s, box-shadow 0.2s',
          },
        });

        newEdges.push({
          id: `brand-${pillar}`,
          source: 'brand',
          target: pillar,
          style: { stroke: hasData ? meta.color : '#CBD5E1', strokeWidth: hasData ? 2.5 : 1.5 },
          animated: hasData,
          markerEnd: { type: MarkerType.ArrowClosed, color: hasData ? meta.color : '#CBD5E1', width: 12, height: 12 },
        });

        // Sub-items (max 3 per pillar for cleanliness)
        if (hasData) {
          const items = Object.entries(pillarContent).filter(([k, v]) => isDisplayable(k, v));

          const maxItems = 3;
          const displayItems = items.slice(0, maxItems);
          const spread = 0.35;

          displayItems.forEach(([key, value], idx) => {
            const itemAngle = angle + (idx - (displayItems.length - 1) / 2) * spread;
            const itemR = radius + 120;
            const ix = cx + itemR * Math.cos(itemAngle);
            const iy = cy + itemR * Math.sin(itemAngle);

            const displayValue = extractDisplayText(value, 25);

            const nodeId = `${pillar}-${key}`;
            newNodes.push({
              id: nodeId,
              position: { x: ix - 55, y: iy - 18 },
              data: {
                label: (
                  <div className="cursor-pointer select-none">
                    <div className="text-[10px] font-semibold capitalize text-foreground">{key.replace(/_/g, ' ')}</div>
                    {displayValue && <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{displayValue}</div>}
                  </div>
                )
              },
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: `2px solid ${meta.color}50`,
                borderRadius: '10px',
                padding: '8px 12px',
                fontSize: '11px',
                maxWidth: 140,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              },
            });

            newEdges.push({
              id: `${pillar}-${nodeId}`,
              source: pillar,
              target: nodeId,
              style: { stroke: `${meta.color}60`, strokeWidth: 1.5, strokeDasharray: '4 2' },
            });
          });
        }
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (err) {
      console.error('Erro ao construir mindmap:', err);
    } finally {
      setLoading(false);
    }
  }, [currentBrand, token, setNodes, setEdges]);

  useEffect(() => { buildMindmap(); }, [buildMindmap]);

  // Detail panel data
  const detailMeta = selectedPillar ? PILLAR_META[selectedPillar] : null;
  const detailData = selectedPillar ? (pillarsData[selectedPillar] || {}) : {};
  const detailCompletion = selectedPillar && metrics?.pillars ? (metrics.pillars[selectedPillar] || 0) : 0;
  const detailItems = useMemo(() => {
    if (!detailData) return [];
    return Object.entries(detailData).filter(([k, v]) => isDisplayable(k, v));
  }, [detailData]);

  if (!currentBrand) {
    return (
      <div className="text-center py-12" data-testid="brand-mindmap-page">
        <p className="text-muted-foreground">Selecione uma marca para visualizar o mapa mental.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" data-testid="brand-mindmap-page">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const mindmapFlow = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.3}
      maxZoom={2}
      attributionPosition="bottom-left"
      proOptions={{ hideAttribution: true }}
    >
      <Controls showInteractive={false} />
      <Background color="#e2e8f0" gap={24} size={1} />
    </ReactFlow>
  );

  // Fullscreen mode
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8fafc]" data-testid="mindmap-fullscreen">
        <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur-sm rounded-xl p-4 shadow-lg border">
          <h1 className="text-xl font-bold">{currentBrand.name}</h1>
          <p className="text-sm text-muted-foreground">Mapa Estrategico da Marca</p>
        </div>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPNG} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            PNG
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <X className="h-4 w-4 mr-1" />
            Sair
          </Button>
        </div>
        {/* Detail panel in fullscreen */}
        {selectedPillar && detailMeta && (
          <DetailPanel
            meta={detailMeta}
            items={detailItems}
            completion={detailCompletion}
            onNavigate={() => navigate(detailMeta.route)}
            onClose={() => setSelectedPillar(null)}
          />
        )}
        <div className="h-screen" data-testid="mindmap-canvas">
          {mindmapFlow}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="brand-mindmap-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Mapa Mental da Marca</h1>
          <p className="text-muted-foreground text-sm">Clique nos pilares para ver detalhes ou navegar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPNG} disabled={exporting} data-testid="export-mindmap-btn">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Exportar
          </Button>
          <Button size="sm" onClick={toggleFullscreen} data-testid="fullscreen-mindmap-btn">
            <Maximize2 className="h-4 w-4 mr-1" />
            Tela Cheia
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Mindmap */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-0">
            <div style={{ height: '70vh', background: '#f8fafc' }} data-testid="mindmap-canvas">
              {mindmapFlow}
            </div>
          </CardContent>
        </Card>

        {/* Detail Panel */}
        {selectedPillar && detailMeta && (
          <DetailPanel
            meta={detailMeta}
            items={detailItems}
            completion={detailCompletion}
            onNavigate={() => navigate(detailMeta.route)}
            onClose={() => setSelectedPillar(null)}
            isInline
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {PILLAR_ORDER.map((p) => (
          <button
            key={p}
            onClick={() => { setSelectedPillar(p); }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted transition-colors"
            data-testid={`legend-${p}`}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PILLAR_META[p].color }} />
            <span>{PILLAR_META[p].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailPanel({ meta, items, completion, onNavigate, onClose, isInline = false }) {
  return (
    <div
      className={`${isInline
        ? 'w-80 shrink-0'
        : 'absolute right-4 top-16 bottom-4 w-80 z-20'
      }`}
      data-testid="mindmap-detail-panel"
    >
      <Card className="h-full flex flex-col shadow-lg">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: meta.color }}
              >
                {meta.icon}
              </div>
              <div>
                <h3 className="font-bold text-base">{meta.label}</h3>
                <p className="text-xs text-muted-foreground">{meta.desc}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" data-testid="close-detail-panel">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold">{completion}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${completion}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>

          {/* Content items */}
          {items.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Conteudo</h4>
              {items.map(([key, value]) => (
                <div
                  key={key}
                  className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="text-xs font-semibold capitalize mb-0.5" style={{ color: meta.color }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {extractDisplayText(value, 200)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">Nenhum conteudo ainda</p>
              <p className="text-xs mt-1">Clique abaixo para comecar a preencher</p>
            </div>
          )}

          {/* Navigate button */}
          <Button onClick={onNavigate} className="w-full mt-auto" style={{ backgroundColor: meta.color }} data-testid="navigate-to-pillar-btn">
            <span>Ir para {meta.label}</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
