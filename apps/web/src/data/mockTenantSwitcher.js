const modules = ['Schedule', 'Patient CRM', 'Clinical record', 'Omnichannel', 'Finance', 'Inventory'];
export const mockTenants = [
  { id: 'aurora', tenant_id: 'tenant_aurora', name: 'Aurora Dental Studio', plan: 'Premium', status: 'Active', domain: 'aurora.example.invalid', subdomain: 'aurora', user_profile: 'Clinic manager', active_modules: modules, metadata: { specialty: 'General dentistry' } },
  { id: 'harbor', tenant_id: 'tenant_harbor', name: 'Harbor Dental Clinic', plan: 'Professional', status: 'Active', domain: 'harbor.example.invalid', subdomain: 'harbor', user_profile: 'Read-only reviewer', active_modules: modules, metadata: { specialty: 'General dentistry' } },
];
export const getTenantsByUser = () => mockTenants;
export const getTenantById = id => mockTenants.find(tenant => tenant.tenant_id === id) || mockTenants[0];
export const mockTenantSwitchEvents = [];
export const getTenantSwitchHistory = () => mockTenantSwitchEvents;
export const getAvailableProfiles = () => [{ id: 'clinic_admin', name: 'Clinic manager', type: 'clinic' }];
