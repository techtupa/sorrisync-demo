import {
  mockTenants,
  getAvailableProfiles as getMockAvailableProfiles,
  getTenantSwitchHistory as getMockTenantSwitchHistory,
} from '@/data/mockTenantSwitcher.js';

const DEFAULT_CLINIC_TENANT_ID = 'tenant_aurora';
const MASTER_TENANT_ID = 'master_control';

// Mock repository today. Keep these function signatures stable for a future Supabase-backed adapter.
export const getTenants = () => mockTenants;

export const getTenantsByUser = () => getTenants();

export const getDefaultClinicTenant = () => {
  return mockTenants.find((tenant) => tenant.tenant_id === DEFAULT_CLINIC_TENANT_ID)
    || mockTenants.find((tenant) => tenant.tenant_id !== MASTER_TENANT_ID)
    || null;
};

export const getTenantById = (tenantId) => {
  return mockTenants.find((tenant) => tenant.tenant_id === tenantId) || getDefaultClinicTenant();
};

export const isMasterTenant = (tenantId) => tenantId === MASTER_TENANT_ID;

export const isClinicTenant = (tenantId) => {
  return Boolean(tenantId)
    && !isMasterTenant(tenantId)
    && mockTenants.some((tenant) => tenant.tenant_id === tenantId);
};

export const getClinicTenants = (tenants = mockTenants) => {
  return tenants.filter((tenant) => Boolean(tenant?.tenant_id) && !isMasterTenant(tenant.tenant_id));
};

export const getMasterContext = (tenants = mockTenants) => {
  return tenants.find((tenant) => tenant.tenant_id === MASTER_TENANT_ID) || null;
};

export const getTenantSwitchHistory = () => getMockTenantSwitchHistory();

export const getAvailableProfiles = () => getMockAvailableProfiles();
