import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Target,
  Heart,
  Compass,
  Star,
  Crosshair,
  Users,
  Globe,
  BarChart3,
  ListTodo,
  ClipboardCheck,
  BookOpen,
  Settings,
  LogOut,
  Plus,
  Building2,
  Menu,
  FileText,
  DollarSign,
  Calendar,
  UserCheck,
  Palette,
  TrendingUp,
  Briefcase,
  AlertTriangle,
  Eye,
  Crown,
  Shield,
  MapPin,
  Sparkles,
  Wrench,
  Waves,
  Filter,
  Activity,
  Plug,
  Radio,
  Volume2,
  Gem,
  Share2,
  Bell,
  Check,
  Route
} from 'lucide-react';
import axios from 'axios';

// Try to use WhiteLabelContext (safe fallback if not available)
let useWhiteLabel;
try {
  useWhiteLabel = require('../contexts/WhiteLabelContext').useWhiteLabel;
} catch {
  useWhiteLabel = () => ({ config: null });
}

// Top-level items (always visible, no section)
const topItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, featureId: 'dashboard' },
  { name: 'Jornada', href: '/journey', icon: Route, featureId: 'journey' },
  { name: 'Mapa Mental', href: '/mindmap', icon: Share2, featureId: 'mindmap' },
  { name: 'BVS Score', href: '/bvs', icon: Gem, featureId: 'bvs', pro: true },
  { name: 'Executivo', href: '/executive', icon: Briefcase, featureId: 'executive', pro: true },
  { name: 'Diagnostico', href: '/maturity', icon: ClipboardCheck, featureId: 'maturity', pro: true },
  { name: 'Ferramentas', href: '/brand-tools', icon: Wrench, featureId: 'brand_tools', pro: true },
];

// Collapsible sections
const sections = [
  {
    id: 'pilares',
    label: 'Pilares de Marca',
    icon: Heart,
    items: [
      { name: 'Jeito de Ser', href: '/brand-way', icon: Heart, featureId: 'brand_way' },
      { name: 'Naming', href: '/naming', icon: Sparkles, featureId: 'naming', pro: true },
      { name: 'Start', href: '/pillars/start', icon: Target, pillar: 'start', featureId: 'start' },
      { name: 'Valores', href: '/pillars/values', icon: Heart, pillar: 'values', featureId: 'values' },
      { name: 'Propósito', href: '/pillars/purpose', icon: Compass, pillar: 'purpose', featureId: 'purpose' },
      { name: 'Promessa', href: '/pillars/promise', icon: Star, pillar: 'promise', featureId: 'promise', pro: true },
      { name: 'Posicionamento', href: '/pillars/positioning', icon: Crosshair, pillar: 'positioning', featureId: 'positioning', pro: true },
      { name: 'Personalidade', href: '/pillars/personality', icon: Users, pillar: 'personality', featureId: 'personality', pro: true },
      { name: 'Universal', href: '/pillars/universality', icon: Globe, pillar: 'universality', featureId: 'universality', pro: true },
    ]
  },
  {
    id: 'frameworks',
    label: 'Frameworks',
    icon: Activity,
    items: [
      { name: 'Saúde da Marca', href: '/brand-health', icon: Activity, featureId: 'brand_health', pro: true },
      { name: 'Ondas de Valor', href: '/value-waves', icon: Waves, featureId: 'value_waves', pro: true },
      { name: 'Funil de Marca', href: '/brand-funnel', icon: Filter, featureId: 'brand_funnel', pro: true },
      { name: 'Disaster Check', href: '/disaster-check', icon: Shield, featureId: 'disaster_check', pro: true },
      { name: 'Cultura & Pessoas', href: '/culture', icon: Users, featureId: 'culture' },
    ]
  },
  {
    id: 'competitiva',
    label: 'Análise Competitiva',
    icon: Radio,
    items: [
      { name: 'Social Listening', href: '/social-listening', icon: Radio, featureId: 'social_listening', pro: true },
      { name: 'Share of Voice', href: '/share-of-voice', icon: Volume2, featureId: 'share_of_voice', pro: true },
      { name: 'Atributos Conversão', href: '/conversion-attributes', icon: BarChart3, featureId: 'conversion_attributes', pro: true },
    ]
  },
  {
    id: 'analise',
    label: 'Análise & Risco',
    icon: AlertTriangle,
    items: [
      { name: 'Touchpoints', href: '/touchpoints', icon: MapPin, featureId: 'touchpoints' },
      { name: 'Brand Tracking', href: '/brand-tracking', icon: TrendingUp, featureId: 'brand_tracking', pro: true },
      { name: 'Risco de Marca', href: '/brand-risk', icon: AlertTriangle, featureId: 'risk', pro: true },
      { name: 'Alertas', href: '/consistency', icon: Eye, featureId: 'consistency', pro: true },
      { name: 'Concorrentes', href: '/competitors', icon: Users, featureId: 'competitors', pro: true },
      { name: 'Benchmark', href: '/benchmark', icon: BarChart3, featureId: 'benchmark', pro: true },
      { name: 'Simulador', href: '/simulator', icon: TrendingUp, featureId: 'simulator', pro: true },
      { name: 'Avaliação', href: '/valuation', icon: DollarSign, featureId: 'valuation', pro: true },
    ]
  },
  {
    id: 'inteligencia',
    label: 'Inteligência',
    icon: BarChart3,
    items: [
      { name: 'Dashboard Intel', href: '/intelligence', icon: BarChart3, featureId: 'intelligence' },
      { name: 'Integrações', href: '/integrations', icon: Plug, featureId: 'integrations', pro: true },
      { name: 'Google Analytics', href: '/google-integration', icon: Globe, featureId: 'google_integration', pro: true },
      { name: 'Meta & Google Ads', href: '/ads', icon: TrendingUp, featureId: 'ads', pro: true },
      { name: 'CRM', href: '/crm', icon: Building2, featureId: 'crm', pro: true },
      { name: 'Audiência', href: '/audience', icon: UserCheck, featureId: 'audience' },
    ]
  },
  {
    id: 'gestao',
    label: 'Gestão',
    icon: ListTodo,
    items: [
      { name: 'LaBrand Academy', href: '/academy', icon: BookOpen, featureId: 'academy' },
      { name: 'Colaboracao', href: '/collaboration', icon: Users, featureId: 'collaboration' },
      { name: 'Planejamento', href: '/planning', icon: ListTodo, featureId: 'planning' },
      { name: 'Campanhas', href: '/campaigns', icon: Calendar, featureId: 'campaigns' },
      { name: 'Decisões', href: '/scorecard', icon: ClipboardCheck, featureId: 'scorecard' },
      { name: 'Narrativas', href: '/narratives', icon: BookOpen, featureId: 'narratives' },
      { name: 'Relatórios', href: '/reports', icon: FileText, featureId: 'reports', pro: true },
    ]
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: Settings,
    items: [
      { name: 'Créditos IA', href: '/ai-credits', icon: Star, featureId: 'ai_credits' },
      { name: 'Configurações', href: '/settings', icon: Settings, featureId: 'settings' },
      { name: 'Admin', href: '/admin', icon: Shield, featureId: 'admin', adminOnly: true },
    ]
  },
];

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const { metrics, currentBrand } = useBrand();
  const { isCliente, canAccess, user } = useAuth();
  const { theme } = useTheme();
  const { config: wlConfig } = useWhiteLabel();

  // White-label styles
  const wlEnabled = wlConfig?.enabled;
  const sidebarStyle = wlEnabled && wlConfig.sidebar_color
    ? { backgroundColor: wlConfig.sidebar_color, color: wlConfig.sidebar_text_color || '#E2E8F0' }
    : {};
  const brandLogoUrl = currentBrand?.logo_url
    ? `${process.env.REACT_APP_BACKEND_URL}${currentBrand.logo_url}`
    : null;

  // Find which section contains the active page
  const getActiveSectionId = () => {
    for (const section of sections) {
      if (section.items.some(item => location.pathname === item.href)) {
        return section.id;
      }
    }
    return null;
  };

  // Initialize open sections from localStorage, auto-expand active section
  const [openSections, setOpenSections] = useState(() => {
    try {
      const saved = localStorage.getItem('labrand_sidebar_sections');
      const parsed = saved ? JSON.parse(saved) : {};
      const activeSectionId = sections.find(s => 
        s.items.some(item => location.pathname === item.href)
      )?.id;
      if (activeSectionId) parsed[activeSectionId] = true;
      return parsed;
    } catch {
      return {};
    }
  });

  // Auto-expand section when navigating
  useEffect(() => {
    const activeSectionId = getActiveSectionId();
    if (activeSectionId && !openSections[activeSectionId]) {
      setOpenSections(prev => {
        const next = { ...prev, [activeSectionId]: true };
        localStorage.setItem('labrand_sidebar_sections', JSON.stringify(next));
        return next;
      });
    }
  }, [location.pathname]);

  const toggleSection = (sectionId) => {
    setOpenSections(prev => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      localStorage.setItem('labrand_sidebar_sections', JSON.stringify(next));
      return next;
    });
  };

  const getPillarProgress = (pillar) => {
    if (!metrics?.pillars) return 0;
    return metrics.pillars[pillar] || 0;
  };

  const canShowItem = (item) => {
    if (item.adminOnly && user?.role !== 'admin' && !user?.is_admin) return false;
    return !isCliente || canAccess(item.href);
  };

  const renderNavItem = (item) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;
    const progress = item.pillar ? getPillarProgress(item.pillar) : null;

    return (
      <Link
        key={item.href}
        to={item.href}
        data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
        } ${collapsed ? 'justify-center' : ''}`}
        title={collapsed ? item.name : undefined}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-secondary' : ''}`} />
        {!collapsed && (
          <div className="flex-1 flex items-center justify-between">
            <span className="truncate">{item.name}</span>
            {progress !== null && (
              <div className="w-8">
                <Progress value={progress} className="h-1" />
              </div>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen border-r border-border/50 sidebar-transition ${
        collapsed ? 'w-16' : 'w-64'
      } ${wlEnabled && wlConfig.sidebar_color ? '' : 'bg-background'}`}
      style={sidebarStyle}
      data-testid="sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center h-14 px-4 border-b border-border/50 ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
              {wlEnabled && brandLogoUrl ? (
                <img src={brandLogoUrl} alt={currentBrand?.name || 'Brand'} className="h-7 w-auto max-w-[140px] object-contain" />
              ) : (
                <img 
                  src={theme === 'dark' ? '/logo-white.png' : '/logo-black.png'} 
                  alt="LABrand" 
                  className="h-7 w-auto"
                />
              )}
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" data-testid="logo-link">
              {wlEnabled && brandLogoUrl ? (
                <img src={brandLogoUrl} alt={currentBrand?.name || 'Brand'} className="h-7 w-7 object-contain" />
              ) : (
                <img 
                  src={theme === 'dark' ? '/icon-skull-white.png' : '/icon-skull-black.png'} 
                  alt="LABrand" 
                  className="h-7 w-7"
                />
              )}
            </Link>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              data-testid="toggle-sidebar-btn"
              aria-label="Recolher menu"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {collapsed && (
          <div className="flex justify-center py-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
              data-testid="toggle-sidebar-btn"
              aria-label="Expandir menu"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-0.5">
            {/* Top-level items */}
            {topItems.filter(canShowItem).map(renderNavItem)}

            {/* Collapsible sections */}
            {sections.map(section => {
              const visibleItems = section.items.filter(canShowItem);
              if (visibleItems.length === 0) return null;

              const isOpen = openSections[section.id];
              const hasActiveChild = visibleItems.some(item => location.pathname === item.href);
              const SectionIcon = section.icon;

              if (collapsed) {
                // When collapsed, show section items as icons only
                return visibleItems.map(renderNavItem);
              }

              return (
                <div key={section.id} className="pt-2">
                  {/* Section header - clickable */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    data-testid={`section-${section.id}`}
                    className={`flex items-center w-full px-3 py-2 rounded-lg text-xs font-medium uppercase tracking-[0.05em] transition-colors duration-200 ${
                      hasActiveChild
                        ? 'text-secondary'
                        : 'text-muted-foreground/70 hover:text-foreground'
                    }`}
                  >
                    <SectionIcon className="h-3.5 w-3.5 mr-2 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{section.label}</span>
                    <ChevronDown 
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        isOpen ? '' : '-rotate-90'
                      }`} 
                    />
                  </button>

                  {/* Section items with collapse animation */}
                  <div
                    className={`overflow-hidden transition-all duration-200 ease-in-out ${
                      isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pl-2 space-y-0.5 pt-0.5">
                      {visibleItems.map(renderNavItem)}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
};

export const Header = ({ collapsed }) => {
  const { user, logout, isEstrategista, token } = useAuth();
  const { currentBrand, brands, setCurrentBrand } = useBrand();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/notifications?limit=15`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch { /* silent */ }
  }, [token, API]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (notifId) => {
    try {
      await axios.post(`${API}/notifications/${notifId}/read`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => n.notif_id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await axios.post(`${API}/notifications/read-all`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleNotifClick = (notif) => {
    if (!notif.read) markRead(notif.notif_id);
    if (notif.link) navigate(notif.link);
    setNotifOpen(false);
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-14 bg-background/80 backdrop-blur-xl border-b border-border/50 transition-all sidebar-transition ${
        collapsed ? 'left-16' : 'left-64'
      }`}
      data-testid="header"
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Brand Selector */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9 px-3 border border-border/50 hover:border-border text-sm font-medium" data-testid="brand-selector">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[200px] truncate">
                  {currentBrand?.name || 'Selecionar Marca'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {brands.map(brand => (
                <DropdownMenuItem
                  key={brand.brand_id}
                  onClick={() => setCurrentBrand(brand)}
                  data-testid={`brand-option-${brand.brand_id}`}
                >
                  {brand.name}
                </DropdownMenuItem>
              ))}
              {brands.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => navigate('/brands/new')} data-testid="new-brand-btn">
                <Plus className="h-4 w-4 mr-2" />
                Nova Marca
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications + User Menu */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotifications(); }}
              data-testid="notification-bell"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white px-1" data-testid="notification-count">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>

            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-xl shadow-xl z-50 overflow-hidden" data-testid="notification-dropdown">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Notificacoes</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-secondary hover:underline flex items-center gap-1" data-testid="mark-all-read">
                      <Check className="h-3 w-3" /> Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma notificacao</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <button
                        key={n.notif_id}
                        onClick={() => handleNotifClick(n)}
                        data-testid={`notif-${n.notif_id}`}
                        className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${!n.read ? 'bg-secondary/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-secondary flex-shrink-0" />}
                          <div className={`flex-1 min-w-0 ${n.read ? 'ml-5' : ''}`}>
                            <p className="text-sm font-medium leading-tight truncate">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2" data-testid="user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.picture} alt={user?.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block max-w-[150px] truncate text-sm">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <Badge variant={user?.role === 'admin' || user?.is_admin ? "destructive" : isEstrategista ? "default" : "secondary"} className="mt-1 text-xs">
                  {user?.role === 'admin' || user?.is_admin ? 'Admin' : user?.role === 'estrategista' ? 'Estrategista' : 'Cliente'}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')} data-testid="settings-btn">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="logout-btn">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export const MainLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { currentBrand, brands, setCurrentBrand, fetchMetrics } = useBrand();
  const { user } = useAuth();

  useEffect(() => {
    if (currentBrand?.brand_id) {
      fetchMetrics(currentBrand.brand_id);
    }
  }, [currentBrand?.brand_id, fetchMetrics]);

  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <Header collapsed={collapsed} />
      <main
        id="main-content"
        className={`pt-14 min-h-screen sidebar-transition ${collapsed ? 'ml-16' : 'ml-64'}`}
      >
        <div className="relative px-6 md:px-8 py-8 max-w-7xl animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
