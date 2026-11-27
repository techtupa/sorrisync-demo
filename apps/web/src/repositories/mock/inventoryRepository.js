import {
  getInventoryItemsByTenant as getMockInventoryItemsByTenant,
  getCategoriesByTenant as getMockCategoriesByTenant,
  getSuppliersByTenant as getMockSuppliersByTenant,
  getAlertsByTenant as getMockAlertsByTenant,
  getPurchaseOrdersByTenant as getMockPurchaseOrdersByTenant,
  getHistoryEventsByTenant as getMockHistoryEventsByTenant,
} from '../../data/mockInventory.js';
import {
  INVENTORY_MOVEMENT_TYPE_LABELS,
  INVENTORY_REASON_OPTIONS,
  INVENTORY_UNIT_LABELS,
  createInventoryRequestId,
  normalizeInventoryUnitCode,
  validateInventoryItemInput,
  validateInventoryMovementInput,
} from '../inventoryManualOperationsContract.js';

const DEFAULT_INVENTORY_TENANT_ID = 'tenant_aurora';
const resolveTenantId = (tenantId) => tenantId || DEFAULT_INVENTORY_TENANT_ID;

// Mock repository today. Keep components away from src/data so this adapter can later use Supabase.
export const getInventoryItemsByTenant = (tenantId) => {
  return getMockInventoryItemsByTenant(resolveTenantId(tenantId));
};

export const getInventoryCategoriesByTenant = (tenantId) => {
  return getMockCategoriesByTenant(resolveTenantId(tenantId));
};

export const getSuppliersByTenant = (tenantId) => {
  return getMockSuppliersByTenant(resolveTenantId(tenantId));
};

export const getPurchaseOrdersByTenant = (tenantId) => {
  return getMockPurchaseOrdersByTenant(resolveTenantId(tenantId));
};

export const getStockAlertsByTenant = (tenantId) => {
  return getMockAlertsByTenant(resolveTenantId(tenantId));
};

export const getInventoryMovementsByTenant = (tenantId) => {
  return getMockHistoryEventsByTenant(resolveTenantId(tenantId));
};

export const getInventorySummaryByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const items = getInventoryItemsByTenant(resolvedTenantId);
  const categories = getInventoryCategoriesByTenant(resolvedTenantId);
  const suppliers = getSuppliersByTenant(resolvedTenantId);
  const alerts = getStockAlertsByTenant(resolvedTenantId);
  const purchaseOrders = getPurchaseOrdersByTenant(resolvedTenantId);
  const movements = getInventoryMovementsByTenant(resolvedTenantId);

  return {
    tenantId: resolvedTenantId,
    itemsCount: items.length,
    categoriesCount: categories.length,
    suppliersCount: suppliers.length,
    activeSuppliersCount: suppliers.filter((supplier) => supplier.status === 'Ativo').length,
    purchaseOrdersCount: purchaseOrders.length,
    openAlertsCount: alerts.filter((alert) => alert.status === 'Aberto').length,
    criticalItemsCount: items.filter((item) => item.status === 'Crítico').length,
    lowStockItemsCount: items.filter((item) => item.status === 'Estoque baixo').length,
    healthyItemsCount: items.filter((item) => item.status === 'Normal').length,
    movementsCount: movements.length,
  };
};

const cloneForTenant = (rows, tenantId) => rows.map((row) => ({ ...row, tenant_id: tenantId }));

const buildInitialMockInventoryReadModelByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const sourceTenantId = resolvedTenantId;

  const items = cloneForTenant(getMockInventoryItemsByTenant(sourceTenantId), resolvedTenantId)
    .map((item) => ({
      ...item,
      item_code: item.item_code || item.id,
      description: item.description || 'Item sintético para demonstração.',
      lifecycle_status: item.status === 'Inativo' ? 'inactive' : 'active',
      unit_code: normalizeInventoryUnitCode(item.unit) || 'unit',
      updated_at: item.updated_at || new Date(0).toISOString(),
    }));
  const categories = cloneForTenant(getMockCategoriesByTenant(sourceTenantId), resolvedTenantId)
    .map((category) => ({ ...category, status: category.status || 'Ativa' }));
  const suppliers = cloneForTenant(getMockSuppliersByTenant(sourceTenantId), resolvedTenantId).map(s => ({ ...s, lifecycle_status: s.status === 'Ativo' ? 'active' : 'inactive', supplier_code: s.id }));
  const alerts = cloneForTenant(getMockAlertsByTenant(sourceTenantId), resolvedTenantId);
  const purchaseOrders = cloneForTenant(getMockPurchaseOrdersByTenant(sourceTenantId), resolvedTenantId);
  const movements = cloneForTenant(getMockHistoryEventsByTenant(sourceTenantId), resolvedTenantId)
    .map((movement) => ({
      ...movement,
      movement_code: movement.movement_code || movement.id,
      origin: 'Registro demo',
    }));

  return {
    tenantId: resolvedTenantId,
    source: 'mock',
    items,
    categories,
    suppliers,
    alerts,
    purchaseOrders,
    movements,
    summary: {
      itemsCount: items.length,
      categoriesCount: categories.length,
      suppliersCount: suppliers.length,
      activeSuppliersCount: suppliers.filter((supplier) => supplier.status === 'Ativo').length,
      purchaseOrdersCount: purchaseOrders.length,
      openAlertsCount: alerts.filter((alert) => alert.status === 'Aberto').length,
      criticalItemsCount: items.filter((item) => item.status === 'Crítico').length,
      lowStockItemsCount: items.filter((item) => item.status === 'Estoque baixo').length,
      healthyItemsCount: items.filter((item) => item.status === 'Normal').length,
      inactiveItemsCount: items.filter((item) => item.status === 'Inativo').length,
      movementsCount: movements.length,
    },
  };
};

const mockInventoryStateByTenant = new Map();
const mockItemLocks = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));
const mockError = (code) => Object.assign(new Error(code), { code });
const ensureMockState = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  if (!mockInventoryStateByTenant.has(resolvedTenantId)) {
    mockInventoryStateByTenant.set(resolvedTenantId, {
      ...buildInitialMockInventoryReadModelByTenant(resolvedTenantId),
      itemRequests: new Map(),
      movementRequests: new Map(),
    });
  }
  return mockInventoryStateByTenant.get(resolvedTenantId);
};

const refreshMockDerivedState = (state) => {
  state.alerts = state.items
    .filter((item) => item.lifecycle_status === 'active' && Number(item.current_quantity) < Number(item.minimum_quantity))
    .map((item) => ({
      id: `stock-alert-${item.id}`,
      item_id: item.id,
      item_name: item.name,
      category: item.category_name,
      current: Number(item.current_quantity),
      min: Number(item.minimum_quantity),
      status: 'Aberto',
      priority: Number(item.current_quantity) === 0 ? 'Alta' : 'Média',
      suggested_replenishment: Math.max(0, Number(item.minimum_quantity) - Number(item.current_quantity)),
    }));
  state.summary = {
    ...state.summary,
    itemsCount: state.items.length,
    openAlertsCount: state.alerts.length,
    criticalItemsCount: state.items.filter((item) => item.status === 'Crítico').length,
    lowStockItemsCount: state.items.filter((item) => item.status === 'Estoque baixo').length,
    healthyItemsCount: state.items.filter((item) => item.status === 'Normal').length,
    inactiveItemsCount: state.items.filter((item) => item.lifecycle_status === 'inactive').length,
    movementsCount: state.movements.length,
  };
};

const assertMockManage = (options = {}) => {
  if (options.canManage === false) throw mockError('SS_INVENTORY_MANAGE_PERMISSION_DENIED');
};

const updateMockItemStockState = (item) => {
  item.stock_state = Number(item.current_quantity) === 0
    ? 'zero'
    : Number(item.current_quantity) < Number(item.minimum_quantity) ? 'below_minimum' : 'adequate';
  item.status = item.lifecycle_status === 'inactive'
    ? 'Inativo'
    : item.stock_state === 'zero' ? 'Crítico' : item.stock_state === 'below_minimum' ? 'Estoque baixo' : 'Normal';
};

const withMockItemLock = async (tenantId, itemId, operation) => {
  const lockKey = `${tenantId}:${itemId}`;
  const previous = mockItemLocks.get(lockKey) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  const queued = previous.then(() => current);
  mockItemLocks.set(lockKey, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (mockItemLocks.get(lockKey) === queued) mockItemLocks.delete(lockKey);
  }
};

export const getMockInventoryReadModelByTenant = (tenantId) => {
  const state = ensureMockState(tenantId);
  const { itemRequests: _itemRequests, movementRequests: _movementRequests, ...readModel } = state;
  return clone(readModel);
};

export const createMockInventoryItemByTenant = async (tenantId, input, options = {}) => {
  assertMockManage(options);
  const validation = validateInventoryItemInput(input);
  if (!validation.valid || !input.requestId) throw mockError('SS_INVENTORY_INVALID_ITEM_INPUT');
  const state = ensureMockState(tenantId);
  const existingId = state.itemRequests.get(input.requestId);
  if (existingId) return { ...clone(state.items.find((item) => item.id === existingId)), mutation_result: 'idempotent' };
  const category = state.categories.find((candidate) => candidate.id === validation.value.categoryId && candidate.status !== 'Inativa');
  if (!category) throw mockError('SS_INVENTORY_CATEGORY_NOT_AVAILABLE');
  if (state.items.some((item) => item.item_code === validation.value.itemCode)) throw mockError('SS_INVENTORY_REQUEST_ID_CONFLICT');
  const timestamp = new Date().toISOString();
  const item = {
    id: createInventoryRequestId(),
    tenant_id: resolveTenantId(tenantId),
    category_id: category.id,
    category_name: category.name,
    item_code: validation.value.itemCode,
    name: validation.value.displayName,
    description: 'Sem descrição operacional.',
    current_quantity: 0,
    minimum_quantity: validation.value.minimumQuantity,
    unit: INVENTORY_UNIT_LABELS[validation.value.unit],
    unit_code: validation.value.unit,
    lifecycle_status: 'active',
    status: validation.value.minimumQuantity > 0 ? 'Crítico' : 'Normal',
    supplier_name: 'Sem fornecedor preferencial',
    storage_location: 'Local não informado',
    suggested_replenishment: validation.value.minimumQuantity,
    stock_state: 'zero',
    last_movement_at: null,
    entry_count: 0,
    consumption_count: 0,
    created_at: timestamp,
    updated_at: timestamp,
    request_id: input.requestId,
  };
  state.items.push(item);
  state.itemRequests.set(input.requestId, item.id);
  refreshMockDerivedState(state);
  return { ...clone(item), mutation_result: 'changed' };
};

export const updateMockInventoryItemByTenant = async (tenantId, itemId, input, options = {}) => {
  assertMockManage(options);
  const validation = validateInventoryItemInput(input);
  if (!validation.valid || !input.expectedUpdatedAt) throw mockError('SS_INVENTORY_INVALID_ITEM_INPUT');
  return withMockItemLock(tenantId, itemId, async () => {
    const state = ensureMockState(tenantId);
    const item = state.items.find((candidate) => candidate.id === itemId);
    if (!item) throw mockError('SS_INVENTORY_ITEM_NOT_FOUND');
    if (item.lifecycle_status !== 'active') throw mockError('SS_INVENTORY_ITEM_INACTIVE');
    if (item.updated_at !== input.expectedUpdatedAt) throw mockError('SS_INVENTORY_STALE_STATE');
    const category = state.categories.find((candidate) => candidate.id === validation.value.categoryId && candidate.status !== 'Inativa');
    if (!category) throw mockError('SS_INVENTORY_CATEGORY_NOT_AVAILABLE');
    Object.assign(item, {
      name: validation.value.displayName,
      item_code: validation.value.itemCode,
      category_id: category.id,
      category_name: category.name,
      unit: INVENTORY_UNIT_LABELS[validation.value.unit],
      unit_code: validation.value.unit,
      minimum_quantity: validation.value.minimumQuantity,
      updated_at: new Date(Date.now() + 1).toISOString(),
    });
    updateMockItemStockState(item);
    refreshMockDerivedState(state);
    return { ...clone(item), mutation_result: 'changed' };
  });
};

export const deactivateMockInventoryItemByTenant = async (tenantId, itemId, expectedUpdatedAt, options = {}) => {
  assertMockManage(options);
  return withMockItemLock(tenantId, itemId, async () => {
    const state = ensureMockState(tenantId);
    const item = state.items.find((candidate) => candidate.id === itemId);
    if (!item) throw mockError('SS_INVENTORY_ITEM_NOT_FOUND');
    if (item.lifecycle_status !== 'active') throw mockError('SS_INVENTORY_ITEM_INACTIVE');
    if (item.updated_at !== expectedUpdatedAt) throw mockError('SS_INVENTORY_STALE_STATE');
    item.lifecycle_status = 'inactive';
    item.status = 'Inativo';
    item.updated_at = new Date(Date.now() + 1).toISOString();
    refreshMockDerivedState(state);
    return { ...clone(item), mutation_result: 'changed' };
  });
};

export const recordMockInventoryMovementByTenant = async (tenantId, itemId, input, options = {}) => {
  assertMockManage(options);
  if (!input.requestId) throw mockError('SS_INVENTORY_INVALID_MOVEMENT_INPUT');
  return withMockItemLock(tenantId, itemId, async () => {
    const state = ensureMockState(tenantId);
    const existingId = state.movementRequests.get(input.requestId);
    if (existingId) {
      const existing = state.movements.find((movement) => movement.id === existingId);
      return { ...clone(existing), movement_id: existing.id, item_id: itemId, mutation_result: 'idempotent' };
    }
    const item = state.items.find((candidate) => candidate.id === itemId);
    const validation = validateInventoryMovementInput({
      item,
      movementType: input.movementType,
      reasonCode: input.reasonCode,
      quantity: input.quantity,
    });
    if (!validation.valid) {
      throw mockError(validation.message.includes('negativo') ? 'SS_INVENTORY_INSUFFICIENT_STOCK' : 'SS_INVENTORY_INVALID_MOVEMENT_INPUT');
    }
    const isReduction = ['consumption', 'adjustment_decrease'].includes(validation.value.movementType);
    const delta = isReduction ? -validation.value.quantity : validation.value.quantity;
    const timestamp = new Date(Date.now() + 1).toISOString();
    item.current_quantity = validation.value.projectedQuantity;
    item.updated_at = timestamp;
    updateMockItemStockState(item);
    const reason = INVENTORY_REASON_OPTIONS[validation.value.movementType].find((candidate) => candidate.value === validation.value.reasonCode);
    const movement = {
      id: createInventoryRequestId(),
      tenant_id: resolveTenantId(tenantId),
      item_id: item.id,
      title: reason.label,
      type: INVENTORY_MOVEMENT_TYPE_LABELS[validation.value.movementType],
      item: item.name,
      category: item.category_name,
      date: timestamp,
      details: `${Math.abs(delta)} ${item.unit}; saldo resultante: ${item.current_quantity}.`,
      origin: 'Registro manual',
      movement_code: `manual-${input.requestId.replaceAll('-', '')}`,
      movement_type: validation.value.movementType,
      reason_code: validation.value.reasonCode,
      unit_code: validation.value.unit,
      quantity_delta: delta,
      resulting_quantity: item.current_quantity,
      request_id: input.requestId,
    };
    state.movements.unshift(movement);
    state.movementRequests.set(input.requestId, movement.id);
    item.last_movement_at = timestamp;
    if (validation.value.movementType === 'entry') item.entry_count = Number(item.entry_count || 0) + 1;
    if (validation.value.movementType === 'consumption') item.consumption_count = Number(item.consumption_count || 0) + 1;
    refreshMockDerivedState(state);
    return {
      ...clone(movement),
      movement_id: movement.id,
      item_updated_at: item.updated_at,
      mutation_result: 'changed',
    };
  });
};
