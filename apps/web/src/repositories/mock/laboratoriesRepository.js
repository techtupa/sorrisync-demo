import {
  getLabsByTenant as getMockLabsByTenant,
  getLabOrdersByTenant as getMockLabOrdersByTenant,
  getCostsByTenant as getMockCostsByTenant,
  getDocumentsByTenant as getMockDocumentsByTenant,
  getLabHistoryByTenant as getMockLabHistoryByTenant,
  getAlertsByTenant as getMockAlertsByTenant,
  getScheduleImpactsByTenant as getMockScheduleImpactsByTenant,
} from '@/data/mockLaboratories.js';
import { getDefaultClinicTenant } from './tenantRepository.js';

const resolveTenantId = (tenantId) => tenantId || getDefaultClinicTenant()?.tenant_id || 'tenant_aurora';

// Mock repository today. Keep components away from src/data and preserve signatures for a later Supabase adapter.
export const getLaboratoriesByTenant = (tenantId) => {
  return getMockLabsByTenant(resolveTenantId(tenantId));
};

export const getLabOrdersByTenant = (tenantId) => {
  return getMockLabOrdersByTenant(resolveTenantId(tenantId));
};

export const getLabCostsByTenant = (tenantId) => {
  return getMockCostsByTenant(resolveTenantId(tenantId));
};

export const getLabDocumentsByTenant = (tenantId) => {
  return getMockDocumentsByTenant(resolveTenantId(tenantId));
};

export const getLabHistoryByTenant = (tenantId) => {
  return getMockLabHistoryByTenant(resolveTenantId(tenantId));
};

export const getLabDeliveryAlertsByTenant = (tenantId) => {
  return getMockAlertsByTenant(resolveTenantId(tenantId));
};

export const getLabScheduleImpactsByTenant = (tenantId) => {
  return getMockScheduleImpactsByTenant(resolveTenantId(tenantId));
};

export const getLaboratoriesSummaryByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const laboratories = getLaboratoriesByTenant(resolvedTenantId);
  const orders = getLabOrdersByTenant(resolvedTenantId);
  const costs = getLabCostsByTenant(resolvedTenantId);
  const documents = getLabDocumentsByTenant(resolvedTenantId);
  const history = getLabHistoryByTenant(resolvedTenantId);
  const deliveryAlerts = getLabDeliveryAlertsByTenant(resolvedTenantId);
  const scheduleImpacts = getLabScheduleImpactsByTenant(resolvedTenantId);

  return {
    tenantId: resolvedTenantId,
    laboratoriesCount: laboratories.length,
    preferredLaboratoriesCount: laboratories.filter((laboratory) => laboratory.status === 'Preferencial').length,
    activeOrdersCount: orders.filter((order) => !['Entregue', 'Cancelado', 'Rascunho'].includes(order.status)).length,
    delayedOrdersCount: orders.filter((order) => order.status === 'Atrasado').length,
    readyOrdersCount: orders.filter((order) => order.status === 'Pronto para retirada').length,
    monthlyCost: costs.reduce((total, cost) => total + cost.amount, 0),
    documentsCount: documents.length,
    historyEventsCount: history.length,
    deliveryAlertsCount: deliveryAlerts.length,
    scheduleImpactsCount: scheduleImpacts.length,
  };
};
