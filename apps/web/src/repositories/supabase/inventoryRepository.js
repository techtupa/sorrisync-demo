import { supabase } from '../../lib/supabaseClient.js';
import { INVENTORY_UNIT_LABELS, normalizeInventoryUnitCode } from '../inventoryManualOperationsContract.js';
import { inventoryCostSnapshotIsValid } from '../inventoryCostsContract.js';

const CATEGORY_FIELDS = 'id, tenant_id, category_code, display_name, description, status, sort_order, color_token';
const ITEM_FIELDS = 'id, tenant_id, category_id, preferred_supplier_id, item_code, display_name, description, unit_label, storage_location_label, current_quantity, minimum_quantity, status, request_id, created_at, updated_at';
const SUPPLIER_FIELDS = 'id, tenant_id, supplier_code, display_name, category_label, city_label, status, is_preferred, created_at, updated_at';
const MOVEMENT_FIELDS = 'id, tenant_id, item_id, movement_code, movement_type, quantity_delta, resulting_quantity, reason_label, reason_code, unit_code, source_type, request_id, occurred_at, created_at';

const COLOR_TOKENS = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

const asNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatMovementType = (movementType, quantityDelta) => {
  if (movementType === 'purchase_receipt') return 'Recebimento de compra';
  if (movementType === 'purchase_reversal') return 'Estorno de recebimento';
  if (movementType === 'adjustment_increase') return 'Ajuste de aumento';
  if (movementType === 'adjustment_decrease') return 'Ajuste de redução';
  if (movementType === 'consumption') return 'Consumo';
  if (movementType === 'entry') return 'Entrada';
  if (['manual_in', 'initial_balance'].includes(movementType) || quantityDelta > 0) {
    return 'Entrada';
  }

  if (['manual_out', 'usage'].includes(movementType) || quantityDelta < 0) {
    return 'Saída';
  }

  return 'Ajuste';
};

const formatSupplierStatus = (status) => {
  if (status === 'active') return 'Ativo';
  if (status === 'evaluating') return 'Em avaliação';
  return 'Inativo';
};

const formatMovementOrigin = (sourceType) => {
  if (sourceType === 'manual_purchase') return 'Compra manual';
  if (sourceType === 'manual') return 'Registro manual';
  if (sourceType === 'inventory_foundation') return 'Carga de fundação';
  if (sourceType === 'planned_reference') return 'Referência planejada';
  return 'Registro operacional';
};

const getOperationalItemStatus = (item) => {
  if (item.status !== 'active') return 'Inativo';

  const currentQuantity = asNumber(item.current_quantity);
  const minimumQuantity = asNumber(item.minimum_quantity);

  if (currentQuantity === 0) return 'Crítico';
  if (minimumQuantity > 0 && currentQuantity <= minimumQuantity / 2) return 'Crítico';
  if (minimumQuantity > 0 && currentQuantity < minimumQuantity) return 'Estoque baixo';
  return 'Normal';
};

const getSuggestedReplenishment = (currentQuantity, minimumQuantity) => {
  return Math.max(0, Math.ceil(asNumber(minimumQuantity) - asNumber(currentQuantity)));
};

const throwIfQueryFailed = (result, tableName) => {
  if (result.error) {
    throw new Error(`Não foi possível ler ${tableName} no Supabase.`);
  }

  return result.data ?? [];
};

const rpcRow = async (client, functionName, payload) => {
  if (!client) throw new Error('Supabase não configurado para a operação de estoque.');
  const result = await client.rpc(functionName, payload);
  if (result.error) {
    const error = new Error(result.error.message || 'Falha na operação de estoque.');
    error.code = result.error.code;
    throw error;
  }
  const rows = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
  if (rows.length !== 1) throw new Error('A operação de estoque retornou um resultado inesperado.');
  return rows[0];
};

export const buildInventoryReadModel = ({
  tenantId,
  categories = [],
  items = [],
  suppliers = [],
  movements = [],
  source = 'supabase',
}) => {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));

  const mappedItems = items.map((item) => {
    const category = categoryById.get(item.category_id);
    const supplier = supplierById.get(item.preferred_supplier_id);
    const currentQuantity = asNumber(item.current_quantity);
    const minimumQuantity = asNumber(item.minimum_quantity);

    return {
      id: item.id,
      name: item.display_name,
      description: item.description || 'Sem descrição operacional.',
      item_code: item.item_code,
      category_id: item.category_id,
      category_name: category?.display_name || 'Sem categoria',
      supplier_id: item.preferred_supplier_id,
      supplier_name: supplier?.display_name || 'Sem fornecedor preferencial',
      current_quantity: currentQuantity,
      minimum_quantity: minimumQuantity,
      unit: INVENTORY_UNIT_LABELS[normalizeInventoryUnitCode(item.unit_label)] || item.unit_label || 'Unidade',
      unit_code: normalizeInventoryUnitCode(item.unit_label) || 'unit',
      lifecycle_status: item.status,
      status: getOperationalItemStatus(item),
      storage_location: item.storage_location_label || 'Local não informado',
      suggested_replenishment: getSuggestedReplenishment(currentQuantity, minimumQuantity),
      created_at: item.created_at,
      updated_at: item.updated_at,
      request_id: item.request_id,
    };
  });

  const mappedMovements = movements.map((movement) => {
    const item = mappedItems.find((candidate) => candidate.id === movement.item_id);
    const quantityDelta = asNumber(movement.quantity_delta);
    const type = formatMovementType(movement.movement_type, quantityDelta);
    const absoluteQuantity = Math.abs(quantityDelta);
    const resultingQuantity = asNumber(movement.resulting_quantity);

    return {
      id: movement.id,
      title: movement.reason_label || `${type} de estoque`,
      type,
      item: item?.name || 'Item não identificado',
      category: item?.category_name || 'Sem categoria',
      date: movement.occurred_at || movement.created_at,
      details: `${absoluteQuantity} ${item?.unit || 'unidade(s)'}; saldo resultante: ${resultingQuantity}.`,
      origin: formatMovementOrigin(movement.source_type),
      movement_code: movement.movement_code,
      item_id: movement.item_id,
      movement_type: movement.movement_type,
      reason_code: movement.reason_code,
      unit_code: movement.unit_code || item?.unit_code || item?.unit,
      quantity_delta: quantityDelta,
      resulting_quantity: resultingQuantity,
      request_id: movement.request_id,
    };
  });

  const itemCount = mappedItems.length;
  const movementsByItem = new Map();
  for (const movement of mappedMovements) {
    const itemMovements = movementsByItem.get(movement.item_id) || [];
    itemMovements.push(movement);
    movementsByItem.set(movement.item_id, itemMovements);
  }
  for (const item of mappedItems) {
    const itemMovements = movementsByItem.get(item.id) || [];
    item.stock_state = item.current_quantity === 0
      ? 'zero'
      : item.current_quantity < item.minimum_quantity ? 'below_minimum' : 'adequate';
    item.last_movement_at = itemMovements[0]?.date || null;
    item.entry_count = itemMovements.filter((movement) => ['entry', 'manual_in', 'initial_balance'].includes(movement.movement_type)).length;
    item.consumption_count = itemMovements.filter((movement) => ['consumption', 'manual_out', 'usage'].includes(movement.movement_type)).length;
  }
  const mappedCategories = categories.map((category, index) => {
    const categoryItems = mappedItems.filter((item) => item.category_id === category.id);
    const alerts = categoryItems.filter((item) => ['Crítico', 'Estoque baixo'].includes(item.status)).length;

    return {
      id: category.id,
      name: category.display_name,
      description: category.description || 'Categoria operacional do estoque.',
      status: category.status === 'active' ? 'Ativa' : 'Inativa',
      count: categoryItems.length,
      alerts,
      consumption: alerts > 0 ? 'Atenção' : 'Estável',
      usage_share: itemCount > 0 ? Math.round((categoryItems.length / itemCount) * 100) : 0,
      color: category.color_token || COLOR_TOKENS[index % COLOR_TOKENS.length],
    };
  });

  const mappedSuppliers = suppliers.map((supplier) => {
    const suppliedItems = mappedItems.filter((item) => item.supplier_id === supplier.id);
    const suppliedItemIds = new Set(suppliedItems.map((item) => item.id));
    const recentReplenishments = movements.filter((movement) => (
      suppliedItemIds.has(movement.item_id) && asNumber(movement.quantity_delta) > 0
    )).length;

    return {
      id: supplier.id,
      supplier_code: supplier.supplier_code,
      lifecycle_status: supplier.status,
      name: supplier.display_name,
      category: supplier.category_label || 'Fornecedor operacional',
      status: formatSupplierStatus(supplier.status),
      contact: 'Contato não disponível nesta leitura',
      city: supplier.city_label || 'Cidade não informada',
      recent_replenishments: recentReplenishments,
      is_preferred: Boolean(supplier.is_preferred),
      items_supplied: suppliedItems.length,
      created_at: supplier.created_at,
      updated_at: supplier.updated_at,
    };
  });

  const alerts = mappedItems
    .filter((item) => ['Crítico', 'Estoque baixo'].includes(item.status))
    .map((item) => ({
      id: `stock-alert-${item.id}`,
      item_id: item.id,
      item_name: item.name,
      category: item.category_name,
      supplier_name: item.supplier_name,
      current: item.current_quantity,
      min: item.minimum_quantity,
      status: 'Aberto',
      priority: item.status === 'Crítico' ? 'Alta' : 'Média',
      suggested_replenishment: item.suggested_replenishment,
    }));

  return {
    tenantId,
    source,
    categories: mappedCategories,
    items: mappedItems,
    suppliers: mappedSuppliers,
    movements: mappedMovements,
    alerts,
    purchaseOrders: [],
    summary: {
      itemsCount: mappedItems.length,
      categoriesCount: mappedCategories.length,
      suppliersCount: mappedSuppliers.length,
      activeSuppliersCount: mappedSuppliers.filter((supplier) => supplier.status === 'Ativo').length,
      purchaseOrdersCount: 0,
      openAlertsCount: alerts.length,
      criticalItemsCount: mappedItems.filter((item) => item.status === 'Crítico').length,
      lowStockItemsCount: mappedItems.filter((item) => item.status === 'Estoque baixo').length,
      healthyItemsCount: mappedItems.filter((item) => item.status === 'Normal').length,
      inactiveItemsCount: mappedItems.filter((item) => item.status === 'Inativo').length,
      movementsCount: mappedMovements.length,
    },
  };
};

export const createInventoryItemByTenant = async (tenantId, input, { client = supabase } = {}) => rpcRow(
  client,
  'create_inventory_item',
  {
    p_tenant_id: tenantId,
    p_request_id: input.requestId,
    p_display_name: input.displayName,
    p_item_code: input.itemCode,
    p_category_id: input.categoryId,
    p_unit: input.unit,
    p_minimum_quantity: input.minimumQuantity,
  },
);

export const updateInventoryItemByTenant = async (tenantId, itemId, input, { client = supabase } = {}) => rpcRow(
  client,
  'update_inventory_item',
  {
    p_tenant_id: tenantId,
    p_item_id: itemId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_display_name: input.displayName,
    p_item_code: input.itemCode,
    p_category_id: input.categoryId,
    p_unit: input.unit,
    p_minimum_quantity: input.minimumQuantity,
  },
);

export const deactivateInventoryItemByTenant = async (tenantId, itemId, expectedUpdatedAt, { client = supabase } = {}) => rpcRow(
  client,
  'deactivate_inventory_item',
  {
    p_tenant_id: tenantId,
    p_item_id: itemId,
    p_expected_updated_at: expectedUpdatedAt,
  },
);

export const recordInventoryMovementByTenant = async (tenantId, itemId, input, { client = supabase } = {}) => rpcRow(
  client,
  'record_inventory_movement',
  {
    p_tenant_id: tenantId,
    p_item_id: itemId,
    p_request_id: input.requestId,
    p_movement_type: input.movementType,
    p_reason_code: input.reasonCode,
    p_unit: input.unit,
    p_quantity: input.quantity,
  },
);

export const fetchInventoryReadModelByTenant = async (tenantId, { client = supabase } = {}) => {
  if (!tenantId) {
    throw new Error('Tenant ativo não identificado para a leitura do estoque.');
  }

  if (!client) {
    throw new Error('Supabase não configurado para a leitura do estoque.');
  }

  const [categoriesResult, itemsResult, suppliersResult, movementsResult] = await Promise.all([
    client.from('inventory_categories').select(CATEGORY_FIELDS).eq('tenant_id', tenantId).order('sort_order', { ascending: true }),
    client.from('inventory_items').select(ITEM_FIELDS).eq('tenant_id', tenantId).order('display_name', { ascending: true }),
    client.from('inventory_suppliers').select(SUPPLIER_FIELDS).eq('tenant_id', tenantId).order('display_name', { ascending: true }),
    client.from('inventory_movements').select(MOVEMENT_FIELDS).eq('tenant_id', tenantId).order('occurred_at', { ascending: false }).limit(100),
  ]);

  return buildInventoryReadModel({
    tenantId,
    categories: throwIfQueryFailed(categoriesResult, 'as categorias de estoque'),
    items: throwIfQueryFailed(itemsResult, 'os itens de estoque'),
    suppliers: throwIfQueryFailed(suppliersResult, 'os fornecedores de estoque'),
    movements: throwIfQueryFailed(movementsResult, 'as movimentações de estoque'),
    source: 'supabase',
  });
};

export const saveInventorySupplierByTenant = (tenantId, input, { client = supabase } = {}) => rpcRow(
  client, 'save_inventory_supplier', {
    p_tenant_selector: tenantId, p_request_id: input.requestId,
    p_supplier_id: input.supplierId || null, p_expected_updated_at: input.expectedUpdatedAt || null,
    p_display_name: input.displayName, p_status: input.status ?? null,
  },
);

export const recordInventoryPurchaseByTenant = (tenantId, input, { client = supabase } = {}) => rpcRow(
  client, 'record_inventory_purchase', {
    p_tenant_selector: tenantId, p_request_id: input.requestId,
    p_supplier_id: input.supplierId, p_lines: input.lines,
  },
);

export const reverseInventoryPurchaseByTenant = (tenantId, input, { client = supabase } = {}) => rpcRow(
  client, 'reverse_inventory_purchase', {
    p_tenant_selector: tenantId, p_request_id: input.requestId, p_purchase_id: input.purchaseId,
    p_expected_version: input.expectedVersion, p_reason_code: 'registered_by_mistake',
  },
);

export const fetchInventoryPurchasesByTenant = async (tenantId, { client = supabase, cursor = null } = {}) => {
  if (!tenantId || !client) throw new Error('Clínica ou conexão indisponível para consultar compras.');
  const result = await client.rpc('list_inventory_purchases', { p_tenant_selector: tenantId, p_cursor: cursor });
  if (result.error) { const error = new Error(result.error.message); error.code = result.error.code; throw error; }
  return result.data;
};



const orderRpc = async (name, tenantId, args, client) => {
  if (!tenantId || !client) throw new Error('Clínica ou conexão indisponível para consultar pedidos.');
  const { data, error } = await client.rpc(name, { p_tenant_selector: tenantId, ...args });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  if (!data || typeof data !== 'object') throw new Error('Resposta de pedidos indisponível. Recupere a mesma solicitação.');
  return data;
};
export const fetchInventoryOrdersByTenant = (tenantId, cursor = null, { client = supabase } = {}) => orderRpc('list_inventory_purchase_orders', tenantId, { p_cursor: cursor }, client);
export const fetchInventoryOrderByTenant = (tenantId, orderId, cursor = null, { client = supabase } = {}) => orderRpc('get_inventory_purchase_order', tenantId, { p_order_id: orderId, p_cursor: cursor }, client);
export const fetchInventoryReplenishmentByTenant = async (tenantId, { cursor = null, itemId = null, client = supabase } = {}) => {
  const data = await orderRpc('list_inventory_replenishment', tenantId, { p_after_item_id: cursor, p_item_id: itemId }, client);
  const quantity = value => typeof value === 'string' && /^\d+$/.test(value);
  if (!Array.isArray(data.items) || (data.next_cursor !== null && typeof data.next_cursor !== 'string')
    || data.items.some(item => !item || typeof item.item_id !== 'string' || typeof item.item_name !== 'string'
      || (itemId && item.item_id !== itemId) || !/^[a-f0-9]{32}$/.test(item.revision)
      || !quantity(item.current_hundredths) || !quantity(item.minimum_hundredths)
      || ['open_hundredths', 'shortage_hundredths', 'suggested_hundredths'].some(key => item[key] !== null && !quantity(item[key])))) {
    throw new Error('Resposta de reposição indisponível.');
  }
  return data;
};
export const mutateInventoryOrderByTenant = async (tenantId, operation, input, { client = supabase } = {}) => {
  const routes = { create: 'create_inventory_purchase_order', receive: 'receive_inventory_purchase_order', cancel: 'cancel_inventory_purchase_order', reverse: 'reverse_inventory_purchase_order_receipt' };
  if (!routes[operation]) throw new Error('Operação de pedido indisponível.');
  const args = { p_request_id: input.requestId };
  if (operation === 'create') Object.assign(args, { p_supplier_id: input.supplierId, p_lines: input.lines });
  else Object.assign(args, { p_order_id: input.orderId, p_expected_version: input.expectedOrderVersion });
  if (operation === 'receive') args.p_lines = input.lines;
  if (operation === 'reverse') Object.assign(args, { p_purchase_id: input.purchaseId, p_purchase_version: input.expectedVersion });
  const assisted = operation === 'create' && input.replenishmentRevision != null;
  if (assisted) args.p_expected_revision = input.replenishmentRevision;
  const result = await orderRpc(assisted ? 'create_inventory_replenishment_order' : routes[operation], tenantId, args, client);
  if (!result.order?.id || !result.order?.version || !Array.isArray(result.order?.lines) || (['receive','reverse'].includes(operation) && !result.purchase?.id)) throw new Error('Resposta incompleta. Recupere a mesma solicitação de pedido.');
  return result;
};

const costRpc = async (name, tenantId, args, client) => {
  if (!tenantId || !client) throw new Error('Clínica ou conexão indisponível para consultar custos.');
  const { data, error } = await client.rpc(name, { p_tenant_selector: tenantId, ...args });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Resposta de custos não confirmada.');
  return data;
};
export const fetchInventoryCostOverviewByTenant = async (tenantId, { client = supabase } = {}) => {
  const data = await costRpc('get_inventory_cost_overview', tenantId, {}, client);
  if (typeof data.available !== 'boolean' || !['positive_items','known_items','unknown_items','inactive_items'].every(k => Number.isSafeInteger(data[k]) && data[k]>=0)
    || data.known_items+data.unknown_items!==data.positive_items
    || data.inactive_items>data.positive_items
    || (data.available && (typeof data.value_scaled!=='string' || !/^\d+$/.test(data.value_scaled)))) throw new Error('Cobertura da valoração indisponível.');
  return data;
};
export const fetchInventoryItemCostByTenant = async (tenantId, itemId, cursor = null, revision = null, { client = supabase } = {}) => {
  const data = await costRpc('get_inventory_item_cost', tenantId, { p_item_id: itemId, p_before_revision: cursor, p_expected_revision: revision }, client);
  if (!inventoryCostSnapshotIsValid(data.snapshot,itemId) || !Array.isArray(data.events)
    || data.events.some(e => typeof e.id!=='string' || typeof e.revision!=='string' || !/^\d+$/.test(e.revision)
      || typeof e.quantity_after!=='string' || !/^\d+$/.test(e.quantity_after) || typeof e.unit_code!=='string'
      || (e.value_after!==null && (typeof e.value_after!=='string' || !/^\d+$/.test(e.value_after)))
      || !Number.isFinite(Date.parse(e.created_at)))) throw new Error('Detalhe da valoração indisponível.');
  return data;
};
export const setInventoryItemCostBasisByTenant = async (tenantId, input, { client = supabase } = {}) => {
  const data = await costRpc('set_inventory_item_cost_basis', tenantId, { p_item_id: input.itemId, p_request_id: input.requestId,
    p_expected_revision: input.expectedRevision, p_expected_updated_at: input.expectedUpdatedAt, p_unit_cost_cents: input.unitCostCents }, client);
  if (data.item_id!==input.itemId || data.request_id!==input.requestId || typeof data.event_id!=='string'
    || !/^\d+$/.test(data.revision || '') || typeof data.value_scaled!=='string' || !/^\d+$/.test(data.value_scaled)) throw new Error('Definição de custo não confirmada. Recupere a mesma solicitação.');
  return data;
};
