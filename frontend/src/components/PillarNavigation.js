import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const PILLARS = [
  { path: '/pillars/start', label: 'Start', short: 'S' },
  { path: '/pillars/values', label: 'Valores', short: 'V' },
  { path: '/pillars/purpose', label: 'Proposito', short: 'P' },
  { path: '/pillars/promise', label: 'Promessa', short: 'Pr' },
  { path: '/pillars/positioning', label: 'Posicionamento', short: 'Po' },
  { path: '/pillars/personality', label: 'Personalidade', short: 'Pe' },
  { path: '/pillars/universality', label: 'Universalidade', short: 'U' },
];

export function PillarNavigation({ completedPillars = [] }) {
  const navigate = useNavigate();
  const location = useLocation();

  const currentIdx = PILLARS.findIndex(p => location.pathname === p.path);
  const prevPillar = currentIdx > 0 ? PILLARS[currentIdx - 1] : null;
  const nextPillar = currentIdx < PILLARS.length - 1 ? PILLARS[currentIdx + 1] : null;

  return (
    <div className="mb-6" data-testid="pillar-navigation">
      {/* Progress Steps */}
      <div className="flex items-center gap-0 overflow-x-auto pb-3 mb-3">
        {PILLARS.map((p, i) => {
          const active = i === currentIdx;
          const done = completedPillars.includes(p.path) || i < currentIdx;
          return (
            <div key={p.path} className="flex items-center">
              {i > 0 && (
                <div className={`w-6 h-0.5 mx-0.5 flex-shrink-0 ${done || active ? 'bg-secondary' : 'bg-border'}`} />
              )}
              <button
                onClick={() => navigate(p.path)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active ? 'bg-secondary/10 text-secondary border border-secondary/30' :
                  done ? 'text-foreground hover:bg-muted' :
                  'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                data-testid={`pillar-nav-${p.short}`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                  done ? 'bg-foreground text-background' :
                  active ? 'border-2 border-secondary text-secondary' :
                  'border border-border text-muted-foreground'
                }`}>
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Prev / Next */}
      <div className="flex items-center justify-between">
        {prevPillar ? (
          <Button variant="ghost" size="sm" onClick={() => navigate(prevPillar.path)} className="text-xs" data-testid="pillar-prev">
            <ChevronLeft className="h-3.5 w-3.5 mr-1" /> {prevPillar.label}
          </Button>
        ) : <span />}
        <span className="text-xs text-muted-foreground">Pilar {currentIdx + 1} de {PILLARS.length}</span>
        {nextPillar ? (
          <Button variant="ghost" size="sm" onClick={() => navigate(nextPillar.path)} className="text-xs" data-testid="pillar-next">
            {nextPillar.label} <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        ) : <span />}
      </div>
    </div>
  );
}
