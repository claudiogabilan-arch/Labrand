import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePlan } from '../contexts/PlanContext';
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
  Eye
} from 'lucide-react';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Executivo', href: '/executive', icon: Briefcase },
  { name: 'Diagnóstico', href: '/maturity', icon: ClipboardCheck },
  { type: 'divider', label: 'Pilares de Marca' },
  { name: 'Jeito de Ser', href: '/brand-way', icon: Heart },
  { name: 'Start', href: '/pillars/start', icon: Target, pillar: 'start' },
  { name: 'Valores', href: '/pillars/values', icon: Heart, pillar: 'values' },
  { name: 'Propósito', href: '/pillars/purpose', icon: Compass, pillar: 'purpose' },
  { name: 'Promessa', href: '/pillars/promise', icon: Star, pillar: 'promise' },
  { name: 'Posicionamento', href: '/pillars/positioning', icon: Crosshair, pillar: 'positioning' },
  { name: 'Personalidade', href: '/pillars/personality', icon: Users, pillar: 'personality' },
  { name: 'Universal', href: '/pillars/universality', icon: Globe, pillar: 'universality' },
  { type: 'divider', label: 'Análise & Risco' },
  { name: 'Risco de Marca', href: '/brand-risk', icon: AlertTriangle },
  { name: 'Alertas Consistência', href: '/consistency', icon: Eye },
  { name: 'Concorrentes', href: '/competitors', icon: Users },
  { name: 'Benchmark Setorial', href: '/benchmark', icon: BarChart3 },
  { name: 'Simulador', href: '/simulator', icon: TrendingUp },
  { name: 'Avaliação de Marca', href: '/valuation', icon: DollarSign },
  { type: 'divider', label: 'Inteligência' },
  { name: 'Google Analytics', href: '/google-integration', icon: BarChart3 },
  { name: 'Audiência', href: '/audience', icon: UserCheck },
  { type: 'divider', label: 'Gestão' },
  { name: 'Intelligence', href: '/intelligence', icon: Target },
  { name: 'Planejamento', href: '/planning', icon: ListTodo },
  { name: 'Campanhas', href: '/campaigns', icon: Calendar },
  { name: 'Decisões', href: '/scorecard', icon: ClipboardCheck },
  { name: 'Narrativas', href: '/narratives', icon: BookOpen },
  { name: 'Relatórios', href: '/reports', icon: FileText },
  { type: 'divider', label: 'Sistema' },
  { name: 'Créditos IA', href: '/ai-credits', icon: Star },
  { name: 'Planos', href: '/plans', icon: DollarSign },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export const Sidebar = ({ collapsed, setCollapsed }) => {
  const location = useLocation();
  const { metrics } = useBrand();
  const { isCliente, canAccess } = useAuth();
  const { theme } = useTheme();

  const getPillarProgress = (pillar) => {
    if (!metrics?.pillars) return 0;
    return metrics.pillars[pillar] || 0;
  };

  // Filter navigation items based on user role
  const filteredNavItems = navigationItems.filter(item => {
    if (item.type === 'divider') return true;
    return !isCliente || canAccess(item.href);
  });

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-card border-r sidebar-transition ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      data-testid="sidebar"
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className={`flex items-center h-16 px-4 border-b ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <Link to="/dashboard" className="flex items-center gap-2" data-testid="logo-link">
              <img 
                src={theme === 'dark' ? '/logo-white.png' : '/logo-black.png'} 
                alt="LABrand" 
                className="h-8 w-auto"
              />
            </Link>
          )}
          {collapsed && (
            <Link to="/dashboard" data-testid="logo-link">
              <img 
                src={theme === 'dark' ? '/icon-skull-white.png' : '/icon-skull-black.png'} 
                alt="LABrand" 
                className="h-8 w-8"
              />
            </Link>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="h-8 w-8"
              data-testid="toggle-sidebar-btn"
              aria-label="Recolher menu"
            >
              <ChevronLeft className="h-4 w-4" />
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
        <ScrollArea className="flex-1 py-4">
          <nav className="px-2 space-y-1">
            {filteredNavItems.map((item, index) => {
              if (item.type === 'divider') {
                return (
                  <div key={index} className={`pt-4 pb-2 ${collapsed ? 'hidden' : ''}`}>
                    <span className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              const progress = item.pillar ? getPillarProgress(item.pillar) : null;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${collapsed ? 'justify-center' : ''}`}
                  title={collapsed ? item.name : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span>{item.name}</span>
                      {progress !== null && (
                        <div className="w-8">
                          <Progress value={progress} className="h-1" />
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
      </div>
    </aside>
  );
};

export const Header = ({ collapsed }) => {
  const { user, logout, isEstrategista } = useAuth();
  const { currentBrand, brands, setCurrentBrand } = useBrand();
  const navigate = useNavigate();

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
      className={`fixed top-0 right-0 z-30 h-16 bg-card/80 backdrop-blur-sm border-b transition-all ${
        collapsed ? 'left-16' : 'left-64'
      }`}
      data-testid="header"
    >
      <div className="flex items-center justify-between h-full px-6">
        {/* Brand Selector */}
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="brand-selector">
                <Building2 className="h-4 w-4" />
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

        {/* User Menu */}
        <div className="flex items-center gap-4">
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
                <Badge variant={isEstrategista ? "default" : "secondary"} className="mt-1 text-xs">
                  {user?.role === 'estrategista' ? 'Estrategista' : 'Cliente'}
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
  const { currentBrand, fetchBrands, brands, setCurrentBrand, fetchMetrics } = useBrand();
  const { user } = useAuth();
  const initialized = useRef(false);

  useEffect(() => {
    if (user && !initialized.current) {
      initialized.current = true;
      fetchBrands().then(brandsList => {
        if (brandsList.length > 0 && !currentBrand) {
          setCurrentBrand(brandsList[0]);
        }
      });
    }
  }, [user, fetchBrands, currentBrand, setCurrentBrand]);

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
        className={`pt-16 min-h-screen transition-all ${collapsed ? 'ml-16' : 'ml-64'}`}
      >
        <div className="p-6 md:p-8 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
