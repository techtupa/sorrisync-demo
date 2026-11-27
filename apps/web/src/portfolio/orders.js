import { getMockInventoryReadModelByTenant, recordMockInventoryMovementByTenant } from '../repositories/mock/inventoryRepository.js';
import { isPortfolioManager } from './clinic.js';

const orderId = 'portfolio-po-101';
const itemId = 'inv_1';
const ledger = new Map();
const attempts = new Map();
let inFlight = false;

const refuse = message => { throw Object.assign(new Error(message), { code: 'PT409' }); };

function state(tenantId) {
  if (!isPortfolioManager(tenantId)) return null;
  if (!ledger.has(tenantId)) {
    const inventory = getMockInventoryReadModelByTenant(tenantId);
    const item = inventory.items.find(row => row.id === itemId);
    ledger.set(tenantId, {
      order: { id: orderId, order_code: 'PO-101', supplier_id: 'sup_2', supplier_name: 'Harborline Dental Supply',
        status: 'partial', version: 1, created_at: new Date().toISOString(),
        lines: [{ item_id: itemId, item_name: item.name, unit_code: item.unit_code, ordered_hundredths: 2000,
          received_hundredths: 800, remaining_hundredths: 1200, canceled_hundredths: 0, gross_hundredths: 800, reversed_hundredths: 0 }],
      },
      purchases: [],
    });
  }
  return ledger.get(tenantId);
}
export const fetchInventoryOrdersByTenant = async tenantId => {
  const value = state(tenantId);
  return { orders: value ? [structuredClone(value.order)] : [], next_cursor: null };
};
export const fetchInventoryOrderByTenant = async (tenantId, id) => {
  const value = state(tenantId);
  if (!value || id !== orderId) refuse('SS_INVENTORY_ORDER_NOT_FOUND');
  return { ...structuredClone(value), next_cursor: null };
};
export async function mutateInventoryOrderByTenant(tenantId, operation, input) {
  const data = state(tenantId);
  if (!data || operation !== 'receive' || input.orderId !== orderId) refuse('SS_INVENTORY_ORDER_LINE_MISMATCH');
  const signature = JSON.stringify([input.expectedOrderVersion, input.lines]);
  const prior = attempts.get(input.requestId);
  if (prior) {
    if (prior.signature !== signature) refuse('SS_INVENTORY_ORDER_LINE_MISMATCH');
    return structuredClone(prior.result);
  }
  const order = data.order;
  if (inFlight || order.version !== input.expectedOrderVersion) refuse('SS_INVENTORY_ORDER_VERSION_CONFLICT');
  const line = order.lines[0];
  const delivery = input.lines?.[0];
  if (input.lines?.length !== 1 || delivery.item_id !== itemId || delivery.unit_code !== line.unit_code
      || !Number.isSafeInteger(delivery.quantity_hundredths) || delivery.quantity_hundredths <= 0
      || !Number.isSafeInteger(delivery.unit_cost_cents) || delivery.unit_cost_cents <= 0) refuse('SS_INVENTORY_ORDER_LINE_MISMATCH');
  const quantity = delivery.quantity_hundredths;
  if (quantity > line.remaining_hundredths) refuse('SS_INVENTORY_ORDER_EXCESS');
  inFlight = true;
  try {
    await recordMockInventoryMovementByTenant(tenantId, itemId, {
      requestId: input.requestId, quantity: quantity / 100, movementType: 'entry', reasonCode: 'manual_receipt',
    }, { canManage: true });
    line.received_hundredths += quantity;
    line.gross_hundredths += quantity;
    line.remaining_hundredths -= quantity;
    order.version += 1;
    order.status = line.remaining_hundredths > 0 ? 'partial' : 'received';
    data.purchases.push({ id: input.requestId, status: 'received', created_at: new Date().toISOString(),
      order_id: orderId, supplier_name: order.supplier_name,
      total_cents: Math.round(quantity * delivery.unit_cost_cents / 100),
      lines: [{ ...delivery, item_name: line.item_name }] });
    const result = { order: structuredClone(order) };
    attempts.set(input.requestId, { signature, result });
    return structuredClone(result);
  } finally {
    inFlight = false;
  }
}
