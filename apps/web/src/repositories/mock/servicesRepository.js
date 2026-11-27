import {
  getServicesByTenant as getMockServicesByTenant,
  getCategoriesByTenant as getMockCategoriesByTenant,
  getPackagesByTenant as getMockPackagesByTenant,
  getHistoryByTenant as getMockHistoryByTenant,
} from '../../data/mockServices.js';
import { getDefaultClinicTenant } from './tenantRepository.js';

const resolveTenantId = (tenantId) => tenantId || getDefaultClinicTenant()?.tenant_id;
const ACTIVE_SERVICE_STATUSES = new Set(['Ativo', 'active']);

const isPublicServiceForLanding = (service) => {
  const showOnHome = Boolean(service?.showOnHome || service?.show_on_home);
  return showOnHome && ACTIVE_SERVICE_STATUSES.has(service?.status);
};

// Mock repository today. Later this adapter can call Supabase while preserving these signatures.
export const getServicesByTenant = (tenantId) => {
  return getMockServicesByTenant(resolveTenantId(tenantId));
};

export const getServiceCategoriesByTenant = (tenantId) => {
  return getMockCategoriesByTenant(resolveTenantId(tenantId));
};

export const getServicePackagesByTenant = (tenantId) => {
  return getMockPackagesByTenant(resolveTenantId(tenantId));
};

export const getServiceHistoryByTenant = (tenantId) => {
  return getMockHistoryByTenant(resolveTenantId(tenantId));
};

export const getPublicServicesForLanding = (tenantId) => {
  return getServicesByTenant(tenantId).filter(isPublicServiceForLanding);
};
