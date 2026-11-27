import {
  INTERESTS,
  ORIGINS,
  RESPONSIBLES,
  STATUSES,
  filterPatients as filterMockPatients,
  getInsights as getMockInsights,
  getOriginDistribution as getMockOriginDistribution,
  getPatientsByStatus as getMockPatientsByStatus,
  getPatientsByTenant as getMockPatientsByTenant,
  getUpcomingActions as getMockUpcomingActions,
} from '../../data/mockPatients.js';
import { getDefaultClinicTenant } from './tenantRepository.js';

const DEFAULT_TENANT_ID = 'tenant_aurora';

const resolveTenantId = (tenantId) => {
  return tenantId || getDefaultClinicTenant()?.tenant_id || DEFAULT_TENANT_ID;
};

// Mock data today. Keep signatures stable so Supabase can replace the source without changing the UI.
export { INTERESTS, ORIGINS, RESPONSIBLES, STATUSES };

export const getPatientsByTenant = (tenantId) => {
  return getMockPatientsByTenant(resolveTenantId(tenantId));
};

export const getPatientsByStatus = (status, tenantId) => {
  return getMockPatientsByStatus(status, resolveTenantId(tenantId));
};

export const filterPatients = (patients, filters = {}) => {
  return filterMockPatients(patients, {
    search: '',
    status: '',
    origin: '',
    interest: '',
    responsible: '',
    ...filters,
  });
};

export const getPatientInsightsByTenant = (tenantId) => {
  return getMockInsights(resolveTenantId(tenantId));
};

export const getOriginDistributionByTenant = () => {
  return getMockOriginDistribution();
};

export const getUpcomingPatientActionsByTenant = (tenantId) => {
  return getMockUpcomingActions(resolveTenantId(tenantId));
};
