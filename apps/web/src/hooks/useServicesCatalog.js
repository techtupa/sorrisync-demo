import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  fetchServiceCatalogByTenant,
  getServiceCategoriesByTenant,
  getServiceHistoryByTenant,
  getServicePackagesByTenant,
  getServicesByTenant,
} from '@/repositories/index.js';

const getFallbackCatalog = (tenantId) => ({
  services: getServicesByTenant(tenantId),
  categories: getServiceCategoriesByTenant(tenantId),
  packages: getServicePackagesByTenant(tenantId),
  history: getServiceHistoryByTenant(tenantId),
});

export const useServicesCatalog = () => {
  const { currentTenantId } = useAuth();
  const [state, setState] = useState(() => ({
    tenantId: currentTenantId,
    catalog: getFallbackCatalog(currentTenantId),
  }));
  const [loading, setLoading] = useState(false);
  const fallbackCatalog = getFallbackCatalog(currentTenantId);
  const catalog = state.tenantId === currentTenantId ? state.catalog : fallbackCatalog;

  useEffect(() => {
    let active = true;

    setState({
      tenantId: currentTenantId,
      catalog: getFallbackCatalog(currentTenantId),
    });
    setLoading(true);

    fetchServiceCatalogByTenant(currentTenantId)
      .then((nextCatalog) => {
        if (active && nextCatalog) {
          setState({
            tenantId: currentTenantId,
            catalog: nextCatalog,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState({
            tenantId: currentTenantId,
            catalog: getFallbackCatalog(currentTenantId),
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentTenantId]);

  return {
    ...catalog,
    loading,
  };
};
