
import React from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, LogOut, User, ArrowRight, Building2, Palette, LifeBuoy, Code2, PlayCircle } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TenantSwitcherDropdown from '@/components/tenant/TenantSwitcherDropdown.jsx';
import { toast } from 'sonner';
import { ROUTE_SCOPES, getRouteScope } from '@/lib/routeContext.js';
import { useTenantDisplay } from '@/hooks/useTenantDisplay.js';
import { SORRISYNC_SYMBOL } from '@/lib/brandAssets.js';

const Header = () => {
  const { user, logout, getUserRole } = useAuth();
  const { currentTenant } = useTenant();
  const tenantDisplay = useTenantDisplay();
  const navigate = useNavigate();
  const location = useLocation();
  const roleData = getUserRole();
  const routeScope = getRouteScope(location.pathname);

  const handleMockLogout = () => {
    toast.success('Resetting the demo session…');
    setTimeout(() => {
      logout();
      navigate('/login');
    }, 1000);
  };

  const handleMockAction = (msg) => {
    toast.info(msg || 'Action recorded in the local demo.');
  };

  const isMasterArea = routeScope === ROUTE_SCOPES.MASTER;
  const isDemoMode = location.pathname.startsWith('/demo-mode');
  const isCodexMode = location.pathname.startsWith('/codex-supabase');
  const isTechnicalArea = routeScope === ROUTE_SCOPES.TECHNICAL;

  return (
    <>

      <header className={`portfolio-header sticky top-0 z-30 backdrop-blur-md border-b border-border/50 lg:ml-[280px] shadow-sm ${isMasterArea ? 'bg-foreground/95 text-background' : 'bg-card/90'}`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 lg:pl-8">

          {/* Left: Mobile Logo (Hidden on Desktop) */}
          <div className={`lg:hidden flex items-center gap-2 ${isMasterArea ? 'pl-11' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm overflow-hidden border border-border/50">
              <img src={SORRISYNC_SYMBOL} alt="" className="w-full h-full object-cover" />
            </div>
            <span className={`font-bold tracking-tight ${isMasterArea ? 'text-background' : 'text-foreground'}`}>SorriSync</span>
          </div>

          {/* Center: Context Aware Info (Desktop) */}
          <div className="hidden lg:flex items-center gap-4 flex-1">
            {isMasterArea ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-background/10 text-background border-background/20">SorriSync Master</Badge>
                <span className="text-sm text-background/70">Perfil: Master SaaS</span>
                <span className="text-sm text-background/70">|</span>
                <span className="text-sm text-background/70">Visão Global da Plataforma</span>
              </div>
            ) : isTechnicalArea ? (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {isDemoMode ? <PlayCircle className="w-3 h-3 mr-1"/> : <Code2 className="w-3 h-3 mr-1"/>}
                  {isCodexMode ? 'Codex + Supabase' : 'Demo Frontend'}
                </Badge>
                <span className="text-sm text-muted-foreground">Backend futuro</span>
                <span className="text-sm text-muted-foreground">|</span>
                <span className="text-sm text-muted-foreground">Supabase planejado</span>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Clínica: {tenantDisplay.displayName}</Badge>
                <span className="text-sm text-muted-foreground">Plano: {tenantDisplay.planLabel}</span>
                <span className="text-sm text-muted-foreground">|</span>
                <span className="text-sm text-muted-foreground">Perfil: {currentTenant?.user_profile || roleData?.name || 'Clinic administrator'}</span>
              </div>
            )}
          </div>

          {/* Right: Actions, Tenant Switcher & Profile */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/evidence" className="portfolio-evidence rounded-md px-2 py-2 text-sm font-semibold text-primary hover:underline"><span className="hidden sm:inline">Skills evidence</span><span className="sm:hidden">Evidence</span></Link>

            {/* Tenant Switcher Context */}
            {!isMasterArea && (
              <div className="block border-r border-border/50 pr-4 mr-1">
                <TenantSwitcherDropdown />
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Open notifications" variant="ghost" size="icon" className={`portfolio-aux relative transition-colors rounded-full ${isMasterArea ? 'text-background/70 hover:text-background hover:bg-background/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2 right-2.5 w-2 h-2 bg-destructive border-2 border-card rounded-full"></span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0">
                <div className="p-3 border-b border-border/50 flex items-center justify-between bg-muted/30">
                  <span className="font-semibold text-sm text-foreground">Notifications</span>
                  <Badge variant="secondary" className="text-[10px]">3 new</Badge>
                </div>
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  {[
                    { title: 'Overdue invoice', time: '10 minutes ago', unread: true },
                    { title: 'New Instagram lead', time: '1 hour ago', unread: true },
                    { title: 'Appointment canceled', time: '2 hours ago', unread: true }
                  ].map((n, i) => (
                    <div key={i} className={`p-3 border-b border-border/50 text-sm hover:bg-muted/50 cursor-pointer transition-colors ${n.unread ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-medium ${n.unread ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</span>
                        {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                  ))}
                </div>
                <div className="p-2 bg-muted/30">
                  <Button variant="ghost" className="w-full text-xs justify-center text-primary hover:text-primary/80" onClick={() => navigate('/central-operacional')}>
                    View operations center <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button aria-label="Open profile menu" variant="ghost" className="portfolio-aux relative h-9 w-9 sm:h-10 sm:w-10 rounded-full p-0 overflow-hidden ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-border/50 shadow-sm">
                  <div className={`w-full h-full flex items-center justify-center font-semibold text-sm shadow-inner ${isMasterArea ? 'bg-background text-foreground' : 'bg-gradient-to-tr from-primary to-secondary text-primary-foreground'}`}>
                    {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'HM'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3">
                  <div className="flex flex-col space-y-1.5">
                    <p className="text-sm font-bold leading-none text-foreground">{user?.name || 'User'}</p>
                    <p className="text-xs font-medium text-muted-foreground leading-none">
                      {isMasterArea ? 'Master SaaS' : (currentTenant?.user_profile || roleData?.name || 'Clinic administrator')}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/user-profile')} className="cursor-pointer py-2">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>My profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="cursor-pointer py-2">
                  <Palette className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Preferences</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMockAction('Use the clinic switcher to change clinics.')} className="cursor-pointer py-2">
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Switch clinic</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/ajuda-suporte')} className="cursor-pointer py-2">
                  <LifeBuoy className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Help and support</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMockLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer py-2">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span className="font-medium">Reset demo session</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
