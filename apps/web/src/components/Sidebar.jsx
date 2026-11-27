import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  LayoutDashboard,
  Home,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Plug,
  Grid3x3,
  Settings,
  ShieldCheck,
  Menu,
  X,
  LockKeyhole,
  Rocket,
  LifeBuoy,
  Inbox,
  Layers,
  BarChart3,
  FolderOpen,
  Package,
  Beaker,
  MonitorSmartphone,
  PhoneCall,
  ShieldAlert,
  PlayCircle,
  Code2,
  Building2,
  CheckSquare,
  MessagesSquare,
  FileHeart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SORRISYNC_SYMBOL } from '@/lib/brandAssets.js';
import { PORTAL_SHELL_GROUPS, getAuthorizedMenuItems, getFirstAuthorizedRoute } from '@/lib/portalShellAccess.js';

const ADMIN_SAAS_GROUP = 'SaaS administration';

const ICONS_BY_KEY = {
  LayoutDashboard,
  Home,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Plug,
  Grid3x3,
  Settings,
  ShieldCheck,
  LockKeyhole,
  Rocket,
  LifeBuoy,
  Inbox,
  Layers,
  BarChart3,
  FolderOpen,
  Package,
  Beaker,
  MonitorSmartphone,
  PhoneCall,
  ShieldAlert,
  PlayCircle,
  Code2,
  Building2,
  CheckSquare,
  MessagesSquare,
  FileHeart,
};

const getIconForItem = (item) => ICONS_BY_KEY[item.iconKey] || LayoutDashboard;

const buildMenuGroups = (authorizedMenuItems) => {
  return PORTAL_SHELL_GROUPS
    .filter((groupLabel) => groupLabel !== ADMIN_SAAS_GROUP)
    .map((groupLabel) => ({
      label: groupLabel,
      items: authorizedMenuItems
        .filter((item) => item.group === groupLabel)
        .map((item) => ({ ...item, icon: getIconForItem(item) })),
    }))
    .filter((group) => group.items.length > 0);
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const location = useLocation();
  const authContext = useAuth();
  const authorizedMenuItems = getAuthorizedMenuItems(authContext);
  const homeRoute = getFirstAuthorizedRoute(authContext) || '/tenant-selection';
  const menuGroups = buildMenuGroups(authorizedMenuItems);
  const adminSaasItems = authorizedMenuItems
    .filter((item) => item.group === ADMIN_SAAS_GROUP)
    .map((item) => ({ ...item, icon: getIconForItem(item) }));
  const masterTab = new URLSearchParams(location.search).get('tab');
  const isQualityDiagnosticsActive = location.pathname === '/master-control' && masterTab === 'testes';
  const isMasterControlActive = location.pathname === '/master-control' && !isQualityDiagnosticsActive;
  const isMasterRoute = location.pathname === '/master-control';

  const isItemActive = (item) => {
    if (item.path === '/master-control?tab=testes') {
      return isQualityDiagnosticsActive;
    }

    if (item.path === '/master-control') {
      return isMasterControlActive;
    }

    return location.pathname === item.path;
  };

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'fixed z-50 bg-card/80 backdrop-blur-sm border shadow-sm lg:hidden',
          isMasterRoute ? 'left-3 top-2' : 'left-4 top-12 sm:top-14',
        )}
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-[280px] bg-card border-r border-border/50 z-40 transition-transform duration-300 shadow-sm flex flex-col pt-8 sm:pt-0',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 pt-6 pb-6 border-b border-border/50 mb-2">
          <Link to={homeRoute} className="flex items-center gap-3 mb-1" onClick={() => setIsOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-premium-glow overflow-hidden border border-border/50">
              <img src={SORRISYNC_SYMBOL} alt="" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight leading-none">SorriSync</h1>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
                Dental practice platform
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <div className="mb-2 px-3 flex items-center gap-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{group.label}</p>
                <div className="h-px bg-border/50 flex-1"></div>
              </div>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isItemActive(item);
                  const Icon = item.icon;
                  const isDemoMode = item.path === '/demo-mode' || item.path === '/demo-export';
                  const isCodexMode = item.path === '/codex-supabase';

                  let linkClasses = 'text-muted-foreground hover:bg-muted/80 hover:text-foreground';
                  let iconClasses = 'group-hover:text-foreground';
                  let activeIndicatorColor = 'bg-primary';

                  if (isActive && !isDemoMode && !isCodexMode) {
                    linkClasses = 'bg-primary/10 text-primary font-semibold';
                    iconClasses = 'text-primary';
                  } else if (isActive && isDemoMode) {
                    linkClasses = 'bg-[hsl(var(--demo-primary))]/10 text-[hsl(var(--demo-primary))] font-semibold';
                    iconClasses = 'text-[hsl(var(--demo-primary))]';
                    activeIndicatorColor = 'bg-[hsl(var(--demo-primary))]';
                  } else if (isDemoMode) {
                    linkClasses = 'text-[hsl(var(--demo-primary))]/80 hover:bg-[hsl(var(--demo-primary))]/10 hover:text-[hsl(var(--demo-primary))]';
                    iconClasses = 'text-[hsl(var(--demo-primary))]/80 group-hover:text-[hsl(var(--demo-primary))]';
                  } else if (isActive && isCodexMode) {
                    linkClasses = 'bg-[hsl(var(--codex-accent))]/10 text-[hsl(var(--codex-accent))] font-semibold';
                    iconClasses = 'text-[hsl(var(--codex-accent))]';
                    activeIndicatorColor = 'bg-[hsl(var(--codex-accent))]';
                  } else if (isCodexMode) {
                    linkClasses = 'text-[hsl(var(--codex-accent))]/80 hover:bg-[hsl(var(--codex-accent))]/10 hover:text-[hsl(var(--codex-accent))]';
                    iconClasses = 'text-[hsl(var(--codex-accent))]/80 group-hover:text-[hsl(var(--codex-accent))]';
                  }

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                          linkClasses
                        )}
                      >
                        {isActive && (
                          <div className={cn('absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full', activeIndicatorColor)} />
                        )}
                        <Icon className={cn('w-5 h-5 flex-shrink-0 transition-colors', iconClasses)} strokeWidth={isActive ? 2 : 1.5} />
                        <span className="text-sm truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* Master Admin Section */}
          {adminSaasItems.length > 0 && (
            <div className="mt-2 pt-6 border-t border-border/50 mb-6">
              <div className="mb-2 px-3 flex items-center gap-2">
                <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">SaaS administration</p>
                <div className="h-px bg-border/50 flex-1"></div>
              </div>
              <ul className="space-y-1">
                {adminSaasItems.map((item) => {
                  const isActive = isItemActive(item);
                  const Icon = item.icon;

                  return (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative',
                          isActive
                            ? 'bg-foreground text-background font-semibold'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        )}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-background rounded-r-full" />
                        )}
                        <Icon className={cn('w-5 h-5 flex-shrink-0 transition-colors', isActive ? 'text-background' : 'group-hover:text-foreground')} strokeWidth={isActive ? 2 : 1.5} />
                        <span className="text-sm truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 mt-auto border-t border-border/50 bg-muted/10">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              Sistema Operacional
            </span>
            <span className="font-medium">v2.4.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
