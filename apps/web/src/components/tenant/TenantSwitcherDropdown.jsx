
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu';
import { Building2, ShieldCheck, ChevronDown, Check, ExternalLink, Info } from 'lucide-react';
import TenantDetailsDrawer from './TenantDetailsDrawer.jsx';
import { toast } from 'sonner';
import { getClinicTenants, getMasterContext, isMasterTenant } from '@/repositories/index.js';

const TenantSwitcherDropdown = () => {
  const { currentTenant, availableTenants, isMasterMode, switchTenant } = useTenant();
  const navigate = useNavigate();
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [selectedTenantForDetails, setSelectedTenantForDetails] = useState(null);

  if (!currentTenant) return null;

  const clinics = getClinicTenants(availableTenants);
  const master = getMasterContext(availableTenants);

  const handleOpenDetails = (e, tenant) => {
    e.stopPropagation();
    setSelectedTenantForDetails(tenant);
    setDetailsDrawerOpen(true);
  };

  const handleSwitchFromDrawer = (tenantId) => {
    switchTenant(tenantId);
    setDetailsDrawerOpen(false);
    if (isMasterTenant(tenantId)) {
      navigate('/master-control');
    }
  };

  const handleSwitch = (tenantId) => {
    switchTenant(tenantId);
    if (isMasterTenant(tenantId)) {
      navigate('/master-control');
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={`h-10 px-3 flex items-center gap-2 border-border/50 shadow-sm transition-all hover:bg-muted/50 ${isMasterMode ? 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50' : 'bg-card'}`}>
            <div className={`p-1 rounded-md ${isMasterMode ? 'bg-indigo-100 text-indigo-700' : 'bg-primary/10 text-primary'}`}>
              {isMasterMode ? <ShieldCheck className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
            </div>
            <div className="flex flex-col items-start text-left max-w-[140px]">
              <span className="text-sm font-semibold truncate w-full">{currentTenant.name}</span>
              <span className="text-[10px] text-muted-foreground truncate w-full leading-none mt-0.5">Ambiente clínico selecionado</span>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-2">
          <div className="bg-muted/30 p-2 rounded-md mb-2 flex items-start gap-2 border border-border/50">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Cada clínica possui dados, usuários e configurações isoladas por ambiente da clínica.
            </p>
          </div>

          <DropdownMenuLabel className="font-normal text-xs text-muted-foreground uppercase tracking-wider">
            Clínicas Disponíveis
          </DropdownMenuLabel>
          <DropdownMenuGroup className="mt-1 space-y-1">
            {clinics.map(clinic => (
              <DropdownMenuItem
                key={clinic.tenant_id}
                className={`flex flex-col items-start p-2 cursor-pointer rounded-lg transition-colors ${currentTenant.tenant_id === clinic.tenant_id ? 'bg-primary/5' : ''}`}
                onClick={() => handleSwitch(clinic.tenant_id)}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium text-sm flex items-center gap-2">
                    {clinic.name}
                    {currentTenant.tenant_id === clinic.tenant_id && <Check className="w-3.5 h-3.5 text-primary" />}
                  </span>
                  <Badge variant="outline" className={`text-[10px] h-4 py-0 ${clinic.status === 'Active' ? 'border-green-200 text-green-700 bg-green-50' : 'border-red-200 text-red-700 bg-red-50'}`}>
                    {clinic.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-muted-foreground">{clinic.user_profile} • {clinic.plan}</span>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary hover:bg-primary/10" onClick={(e) => handleOpenDetails(e, clinic)}>
                    Detalhes <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          {master && (
            <>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuLabel className="font-normal text-xs text-indigo-700 uppercase tracking-wider">
                Administração da Plataforma
              </DropdownMenuLabel>
              <DropdownMenuItem
                className={`flex flex-col items-start p-2 cursor-pointer rounded-lg transition-colors mt-1 ${currentTenant.tenant_id === master.tenant_id ? 'bg-indigo-50' : 'hover:bg-indigo-50/50'}`}
                onClick={() => handleSwitch(master.tenant_id)}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-medium text-sm flex items-center gap-2 text-indigo-900">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    {master.name}
                    {currentTenant.tenant_id === master.tenant_id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </span>
                  <Badge variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50 text-[10px] h-4 py-0">
                    Admin
                  </Badge>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-indigo-700/70">{master.user_profile}</span>
                  <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-indigo-700 hover:bg-indigo-100" onClick={(e) => handleOpenDetails(e, master)}>
                    Detalhes <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <TenantDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        tenant={selectedTenantForDetails}
        onEnterEnvironment={handleSwitchFromDrawer}
      />
    </>
  );
};

export default TenantSwitcherDropdown;
