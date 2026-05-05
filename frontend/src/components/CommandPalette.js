import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBrand } from '../contexts/BrandContext';
import { useAuth } from '../contexts/AuthContext';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from './ui/command';
import {
  Building2, LayoutDashboard, Share2, Gem, Target, Compass, Sparkles, Palette,
  BookOpen, Network, Activity, Waves, AlertTriangle, Shield, Eye, Users,
  BarChart3, Volume2, Bell, Crosshair, Filter, MapPin, Route, Calendar,
  ClipboardList, Check, TrendingUp, FlaskConical, DollarSign, FileText,
  Briefcase, Crown, UserCheck, Globe, Megaphone, Plug, HeartHandshake,
  GraduationCap, MessageSquare, Wrench, Star, Settings, Plus, Clock,
} from 'lucide-react';

/**
 * Page registry mirrors the sidebar grouping from Layout.js.
 * Kept in sync intentionally — this is the single source of truth
 * the palette uses, no need to import from Layout (avoids circular).
 */
const PAGES = [
  // Top-level
  { group: 'Construção', name: 'Dashboard',         href: '/dashboard',       icon: LayoutDashboard },
  { group: 'Construção', name: 'Mapa Mental',       href: '/mindmap',         icon: Share2 },
  { group: 'Construção', name: 'Score Geral',       href: '/bvs',             icon: Gem },
  // Construção
  { group: 'Construção', name: 'Pilares',           href: '/pillars/start',   icon: Target },
  { group: 'Construção', name: 'Jeito de Ser',      href: '/brand-way',       icon: Compass },
  { group: 'Construção', name: 'Naming',            href: '/naming',          icon: Sparkles },
  { group: 'Construção', name: 'Identidade',        href: '/identity',        icon: Palette },
  { group: 'Construção', name: 'Narrativas',        href: '/narratives',      icon: BookOpen },
  { group: 'Construção', name: 'Arquitetura',       href: '/brand-architecture', icon: Network },
  // Diagnóstico
  { group: 'Diagnóstico', name: 'Maturidade',       href: '/maturity',        icon: Activity },
  { group: 'Diagnóstico', name: 'Saúde da Marca',   href: '/brand-health',    icon: Waves },
  { group: 'Diagnóstico', name: 'Risco de Marca',   href: '/brand-risk',      icon: AlertTriangle },
  { group: 'Diagnóstico', name: 'Disaster Check',   href: '/disaster-check',  icon: Shield },
  { group: 'Diagnóstico', name: 'Alertas',          href: '/consistency',     icon: Eye },
  // Mercado
  { group: 'Mercado',     name: 'Concorrentes',     href: '/competitors',     icon: Users },
  { group: 'Mercado',     name: 'Benchmark',        href: '/benchmark',       icon: BarChart3 },
  { group: 'Mercado',     name: 'Share of Voice',   href: '/share-of-voice',  icon: Volume2 },
  { group: 'Mercado',     name: 'Social Listening', href: '/social-listening', icon: Bell },
  { group: 'Mercado',     name: 'Atributos de Conversão', href: '/conversion-attributes', icon: Crosshair },
  { group: 'Mercado',     name: 'Funil de Marca',   href: '/brand-funnel',    icon: Filter },
  // Execução
  { group: 'Execução',    name: 'Touchpoints',      href: '/touchpoints',     icon: MapPin },
  { group: 'Execução',    name: 'Jornada',          href: '/journey',         icon: Route },
  { group: 'Execução',    name: 'Campanhas',        href: '/campaigns',       icon: Calendar },
  { group: 'Execução',    name: 'Planejamento',     href: '/planning',        icon: ClipboardList },
  { group: 'Execução',    name: 'Decisões',         href: '/scorecard',       icon: Check },
  { group: 'Execução',    name: 'Brand Tracking',   href: '/brand-tracking',  icon: TrendingUp },
  { group: 'Execução',    name: 'Simulador',        href: '/simulator',       icon: FlaskConical },
  { group: 'Execução',    name: 'Valuation',        href: '/valuation',       icon: DollarSign },
  { group: 'Execução',    name: 'Relatórios',       href: '/reports',         icon: FileText },
  // Inteligência
  { group: 'Inteligência', name: 'Dashboard Executivo', href: '/executive',   icon: Briefcase },
  { group: 'Inteligência', name: 'Dashboard Intel',  href: '/intelligence',   icon: Crown },
  { group: 'Inteligência', name: 'Audiência',        href: '/audience',       icon: UserCheck },
  { group: 'Inteligência', name: 'Google Analytics', href: '/google-integration', icon: Globe },
  { group: 'Inteligência', name: 'Ads',              href: '/ads',            icon: Megaphone },
  { group: 'Inteligência', name: 'CRM',              href: '/crm',            icon: Building2 },
  { group: 'Inteligência', name: 'Integrações',      href: '/integrations',   icon: Plug },
  { group: 'Inteligência', name: 'Cultura & Pessoas', href: '/culture',       icon: HeartHandshake },
  { group: 'Inteligência', name: 'Academy',          href: '/academy',        icon: GraduationCap },
  { group: 'Inteligência', name: 'Colaboração',      href: '/collaboration',  icon: MessageSquare },
  // Sistema
  { group: 'Sistema',      name: 'Ferramentas',      href: '/brand-tools',    icon: Wrench },
  { group: 'Sistema',      name: 'Histórico',        href: '/history',        icon: Clock },
  { group: 'Sistema',      name: 'Créditos IA',      href: '/ai-credits',     icon: Star },
  { group: 'Sistema',      name: 'Configurações',    href: '/settings',       icon: Settings },
];

const QUICK_ACTIONS = [
  { id: 'create-brand',    name: 'Criar nova marca',          icon: Plus,    href: '/brands/new' },
  { id: 'new-task',        name: 'Nova tarefa',                icon: Plus,    href: '/planning',  emit: 'shortcut:create' },
  { id: 'new-decision',    name: 'Nova decisão',               icon: Plus,    href: '/scorecard', emit: 'shortcut:create' },
  { id: 'new-touchpoint',  name: 'Novo touchpoint',            icon: Plus,    href: '/touchpoints', emit: 'shortcut:create' },
  { id: 'new-campaign',    name: 'Nova campanha',              icon: Plus,    href: '/campaigns', emit: 'shortcut:create' },
  { id: 'gen-report',      name: 'Gerar relatório',            icon: FileText, href: '/reports' },
  { id: 'view-history',    name: 'Ver histórico de alterações', icon: Clock,  href: '/history' },
  { id: 'open-settings',   name: 'Abrir configurações',        icon: Settings, href: '/settings' },
];

export function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { brands, currentBrand, setCurrentBrand } = useBrand();
  const { isCliente, canAccess } = useAuth();

  const visiblePages = useMemo(() => {
    return PAGES.filter(p => !isCliente || canAccess(p.href));
  }, [isCliente, canAccess]);

  const groupedPages = useMemo(() => {
    const map = new Map();
    for (const p of visiblePages) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group).push(p);
    }
    return Array.from(map.entries());
  }, [visiblePages]);

  const handleSelect = (cb) => () => {
    onOpenChange(false);
    // defer to allow dialog to close before navigation
    setTimeout(cb, 0);
  };

  const handleAction = (action) => handleSelect(() => {
    if (action.emit) {
      navigate(action.href);
      // dispatch on next tick so the page mounts
      setTimeout(() => window.dispatchEvent(new CustomEvent(action.emit, { detail: { source: action.id } })), 80);
    } else {
      navigate(action.href);
    }
  });

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar marca, página ou ação…" data-testid="command-palette-input" />
      <CommandList data-testid="command-palette-list">
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        {brands && brands.length > 0 && (
          <CommandGroup heading="Trocar de marca">
            {brands.map(brand => (
              <CommandItem
                key={brand.brand_id}
                value={`marca ${brand.name}`}
                onSelect={handleSelect(() => setCurrentBrand(brand))}
                data-testid={`palette-brand-${brand.brand_id}`}
              >
                <Building2 className="text-muted-foreground" />
                <span>{brand.name}</span>
                {currentBrand?.brand_id === brand.brand_id && (
                  <CommandShortcut>atual</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {groupedPages.map(([group, items]) => (
          <CommandGroup key={group} heading={`Ir para — ${group}`}>
            {items.map(page => {
              const Icon = page.icon;
              return (
                <CommandItem
                  key={page.href}
                  value={`${group} ${page.name} ${page.href}`}
                  onSelect={handleSelect(() => navigate(page.href))}
                  data-testid={`palette-page-${page.href.replace(/\//g, '-')}`}
                >
                  <Icon className="text-muted-foreground" />
                  <span>{page.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        <CommandSeparator />

        <CommandGroup heading="Ações rápidas">
          {QUICK_ACTIONS.map(action => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.id}
                value={`acao ${action.name}`}
                onSelect={handleAction(action)}
                data-testid={`palette-action-${action.id}`}
              >
                <Icon className="text-muted-foreground" />
                <span>{action.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
