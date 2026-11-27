import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  fetchPatientCrmOptionsByTenant,
  getPatientCrmOptionsByTenant,
} from '@/repositories/index.js';

export const usePatientCrmOptions = () => {
  const { currentTenantId } = useAuth();
  const [state, setState] = useState(() => ({
    tenantId: currentTenantId,
    options: getPatientCrmOptionsByTenant(currentTenantId),
  }));

  const fallbackOptions = getPatientCrmOptionsByTenant(currentTenantId);
  const options = state.tenantId === currentTenantId ? state.options : fallbackOptions;

  useEffect(() => {
    let active = true;

    setState({
      tenantId: currentTenantId,
      options: getPatientCrmOptionsByTenant(currentTenantId),
    });

    fetchPatientCrmOptionsByTenant(currentTenantId)
      .then((nextOptions) => {
        if (active && nextOptions) {
          setState({
            tenantId: currentTenantId,
            options: nextOptions,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState({
            tenantId: currentTenantId,
            options: getPatientCrmOptionsByTenant(currentTenantId),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [currentTenantId]);

  return options;
};
