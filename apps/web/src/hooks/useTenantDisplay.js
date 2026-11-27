import { useAuth } from '@/contexts/AuthContext.jsx';
import { getTenantDisplayData } from '@/repositories/index.js';

export const useTenantDisplay = () => {
  const { currentTenantId, currentTenant } = useAuth();
  return getTenantDisplayData(currentTenantId, currentTenant);
};
