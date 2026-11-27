import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { getTenantsByUser, isMasterTenant } from '@/repositories/index.js';
import { toast } from 'sonner';

const TenantContext = createContext(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export const TenantProvider = ({ children }) => {
  const {
    user,
    currentTenantId,
    currentTenant: authCurrentTenant,
    currentProfile,
    availableTenants: authAvailableTenants,
    isSupabaseMode,
    switchTenant: switchAuthTenant,
    loading: authLoading
  } = useAuth();

  const availableTenants = useMemo(() => {
    if (isSupabaseMode) {
      return authAvailableTenants || [];
    }

    if (authAvailableTenants?.length) {
      return authAvailableTenants;
    }

    return getTenantsByUser(user?.id || 'usr_1');
  }, [authAvailableTenants, isSupabaseMode, user?.id]);

  const currentTenant = useMemo(() => {
    return authCurrentTenant
      || availableTenants.find(t => t.tenant_id === currentTenantId)
      || (!isSupabaseMode ? availableTenants[0] : null)
      || null;
  }, [authCurrentTenant, availableTenants, currentTenantId, isSupabaseMode]);

  const isMasterMode = isMasterTenant(currentTenant?.tenant_id);

  const switchTenant = (tenantId) => {
    const newTenant = availableTenants.find(t => t.tenant_id === tenantId);
    if (!newTenant) return;

    switchAuthTenant(newTenant.tenant_id);

    toast.success('Clinic switched: ' + newTenant.name);
  };

  const value = {
    currentTenant,
    currentTenantId,
    availableTenants,
    isMasterMode,
    switchTenant,
    userProfile: currentProfile || currentTenant?.user_profile || 'Usuário',
    loading: authLoading
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
