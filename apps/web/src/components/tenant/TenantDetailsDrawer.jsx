
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Building2, ShieldCheck, ArrowRight, Settings, LayoutGrid, HeartPulse, ShieldAlert, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { isMasterTenant } from '@/repositories/index.js';

const TenantDetailsDrawer = ({ tenant, open, onOpenChange, onEnterEnvironment }) => {
  if (!tenant) return null;

  const handleAction = (action) => {
    toast.success(`Ação "${action}" simulada com sucesso.`, {
      description: `Operação restrita ao tenant: ${tenant.tenant_id}`
    });
  };

  const isMaster = isMasterTenant(tenant.tenant_id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto custom-scrollbar p-0">
        <div className={`p-6 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md ${isMaster ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'bg-muted/30'}`}>
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-3 rounded-xl border shadow-sm shrink-0 ${isMaster ? 'bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-indigo-900/50' : 'bg-background border-border/50 text-primary'}`}>
              {isMaster ? <ShieldCheck className="w-8 h-8" /> : <Building2 className="w-8 h-8" />}
            </div>
            <div className="flex-1 overflow-hidden">
              <Badge variant="outline" className={isMaster ? 'bg-indigo-50 text-indigo-700 border-indigo-200 mb-2' : 'mb-2'}>
                {tenant.plan}
              </Badge>
              <SheetTitle className="text-xl font-bold text-foreground truncate pr-4">
                {tenant.name}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1 font-mono">
                {tenant.tenant_id}
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" onClick={() => onEnterEnvironment(tenant.tenant_id)} className="shadow-sm w-full sm:w-auto">
              Acessar Ambiente <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Health Score */}
          {!isMaster && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-primary" /> Saúde da Conta (Health Score)
                </h4>
                <span className="font-bold tabular-nums">{tenant.health_score}/100</span>
              </div>
              <Progress value={tenant.health_score} className="h-2" />
              <p className="text-xs text-muted-foreground">Medido pelo uso de módulos e adimplência.</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Status</p>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${tenant.status === 'Ativa' || tenant.status === 'Sistema' ? 'bg-green-500' : 'bg-red-500'}`} />
                {tenant.status}
              </p>
            </div>
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Perfil Atual</p>
              <p className="text-sm font-bold text-foreground">{tenant.user_profile}</p>
            </div>
            <div className="p-4 border border-border/50 rounded-xl bg-card col-span-2">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Acesso Web</p>
              <p className="text-sm font-bold text-foreground">{tenant.domain}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tenant.subdomain}</p>
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" /> Módulos Ativos ({tenant.active_modules.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {tenant.active_modules.map((mod, idx) => (
                <Badge key={idx} variant="secondary" className="bg-muted/50 font-medium">
                  {mod}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {!isMaster && (
              <>
                <Button variant="outline" className="justify-start" onClick={() => handleAction('Configurações')}>
                  <Settings className="w-4 h-4 mr-2 text-muted-foreground" /> Configurações
                </Button>
                <Button variant="outline" className="justify-start" onClick={() => handleAction('Onboarding')}>
                  <Rocket className="w-4 h-4 mr-2 text-muted-foreground" /> Ver Onboarding
                </Button>
              </>
            )}
            <Button variant="outline" className="justify-start sm:col-span-2" onClick={() => handleAction('Suporte')}>
              <ShieldAlert className="w-4 h-4 mr-2 text-muted-foreground" /> Acionar Suporte
            </Button>
          </div>

          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              Último acesso: {new Date(tenant.last_access).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TenantDetailsDrawer;
