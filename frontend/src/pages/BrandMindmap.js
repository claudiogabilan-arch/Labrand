import { useState, useEffect, useCallback } from 'react';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, ZoomIn, Maximize2, Minimize2, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const nodeColors = {
  brand: '#1a1a1a',
  start: '#3b82f6',
  values: '#ef4444',
  purpose: '#22c55e',
  promise: '#f59e0b',
  positioning: '#06b6d4',
  personality: '#8b5cf6',
  universality: '#ec4899',
  item: '#6b7280'
};

const pillarNames = {
  start: 'Start',
  values: 'Valores',
  purpose: 'Propósito',
  promise: 'Promessa',
  positioning: 'Posicionamento',
  personality: 'Personalidade',
  universality: 'Universal'
};

export default function BrandMindmap() {
  const { currentBrand } = useBrand();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);
  const buildMindmap = useCallback(async () => {
    if (!currentBrand) return;
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/brands/${currentBrand.brand_id}/pillars-summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) return;
      const data = await res.json();

      const newNodes = [];
      const newEdges = [];

      // Nó central - Marca
      newNodes.push({
        id: 'brand',
        position: { x: 400, y: 50 },
        data: { 
          label: (
            <div className="text-center">
              <div className="font-bold text-lg">{currentBrand.name}</div>
              <div className="text-xs opacity-70">{data.completion}% completo</div>
            </div>
          )
        },
        style: {
          background: nodeColors.brand,
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '16px 24px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }
      });

      // Pilares em círculo ao redor
      const pillarTypes = ['start', 'values', 'purpose', 'promise', 'positioning', 'personality', 'universality'];
      const radius = 220;
      const centerX = 400;
      const centerY = 280;

      pillarTypes.forEach((pillar, index) => {
        const angle = (index * 2 * Math.PI / pillarTypes.length) - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        const pillarData = data[pillar] || {};
        const hasData = Object.keys(pillarData).length > 0;
        const itemCount = Object.values(pillarData).filter(v => v && (typeof v === 'string' ? v.trim() : true)).length;

        newNodes.push({
          id: pillar,
          position: { x: x - 60, y: y - 25 },
          data: {
            label: (
              <div className="text-center">
                <div className="font-semibold">{pillarNames[pillar]}</div>
                {hasData && <div className="text-xs opacity-80">{itemCount} itens</div>}
              </div>
            )
          },
          style: {
            background: hasData ? nodeColors[pillar] : '#e5e7eb',
            color: hasData ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            boxShadow: hasData ? '0 3px 8px rgba(0,0,0,0.12)' : 'none',
            opacity: hasData ? 1 : 0.6
          }
        });

        newEdges.push({
          id: `brand-${pillar}`,
          source: 'brand',
          target: pillar,
          style: { stroke: hasData ? nodeColors[pillar] : '#d1d5db', strokeWidth: hasData ? 2 : 1 },
          animated: hasData
        });

        // Subitens do pilar
        if (hasData) {
          const items = Object.entries(pillarData).filter(([k, v]) => {
            if (k === 'completion') return false;
            if (!v) return false;
            if (typeof v === 'string') return v.trim().length > 0;
            if (Array.isArray(v)) return v.length > 0;
            return true;
          });

          items.slice(0, 4).forEach(([ key, value], itemIndex) => {
            const itemAngle = angle + (itemIndex - items.length / 2 + 0.5) * 0.3;
            const itemRadius = radius + 100;
            const itemX = centerX + itemRadius * Math.cos(itemAngle);
            const itemY = centerY + itemRadius * Math.sin(itemAngle);

            let displayValue = '';
            if (typeof value === 'string') {
              displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
            } else if (Array.isArray(value)) {
              displayValue = value.slice(0, 2).join(', ');
              if (value.length > 2) displayValue += '...';
            }

            const nodeId = `${pillar}-${key}`;
            newNodes.push({
              id: nodeId,
              position: { x: itemX - 50, y: itemY - 15 },
              data: {
                label: (
                  <div className="text-xs">
                    <div className="font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                    {displayValue && <div className="opacity-70 truncate max-w-[120px]">{displayValue}</div>}
                  </div>
                )
              },
              style: {
                background: 'white',
                color: '#374151',
                border: `2px solid ${nodeColors[pillar]}`,
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '11px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }
            });

            newEdges.push({
              id: `${pillar}-${nodeId}`,
              source: pillar,
              target: nodeId,
              style: { stroke: nodeColors[pillar], strokeWidth: 1.5 }
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

  useEffect(() => {
    buildMindmap();
  }, [buildMindmap]);

  if (!currentBrand) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Selecione uma marca para visualizar o mindmap.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const mindmapContent = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={1.5}
      attributionPosition="bottom-left"
    >
      <Controls />
      <Background color="#e5e7eb" gap={20} />
    </ReactFlow>
  );

  // Modo apresentação (tela cheia)
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-white" data-testid="mindmap-fullscreen">
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur rounded-lg p-4 shadow-lg">
            <h1 className="text-2xl font-bold">{currentBrand.name}</h1>
            <p className="text-muted-foreground">Mapa Estratégico da Marca</p>
          </div>
        </div>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button variant="outline" size="sm" onClick={buildMindmap}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <X className="h-4 w-4 mr-2" />
            Sair (ESC)
          </Button>
        </div>
        <div className="absolute bottom-4 left-4 z-10 flex gap-4 text-sm bg-white/90 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
            <span>Preenchido</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300"></div>
            <span>Pendente</span>
          </div>
        </div>
        <div style={{ height: '100vh', background: '#fafafa' }}>
          {mindmapContent}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="brand-mindmap-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mapa Mental da Marca</h1>
          <p className="text-muted-foreground">Visualização estratégica de {currentBrand.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={buildMindmap}>
            <ZoomIn className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Modo Apresentação
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div style={{ height: '70vh', background: '#fafafa' }}>
            {mindmapContent}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
          <span>Pilares preenchidos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-300"></div>
          <span>Pilares pendentes</span>
        </div>
      </div>
    </div>
  );
}
