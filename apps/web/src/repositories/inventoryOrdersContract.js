import { inventoryDecimalHundredths, validateInventoryPurchaseInput, inventoryPurchaseErrorMessage } from './inventoryPurchasesContract.js';
import { normalizeInventoryUnitCode } from './inventoryManualOperationsContract.js';

export const INVENTORY_ORDER_STATUS = { open: 'Em aberto', partial: 'Parcialmente recebido', received: 'Recebido', canceled: 'Cancelado' };
export const formatInventoryOrderQuantity = (value) => {
  try { const n = BigInt(value); const fraction = String(n % 100n).padStart(2, '0').replace(/0+$/, ''); return `${(n / 100n).toLocaleString('pt-BR')}${fraction ? `,${fraction}` : ''}`; }
  catch { return '—'; }
};
export const validateInventoryOrder = (input, items, suppliers) => {
  if (!suppliers.some(s => s.id === input.supplierId && s.lifecycle_status === 'active')) return { valid: false, message: 'Selecione um fornecedor ativo.' };
  if (!Array.isArray(input.lines) || !input.lines.length || input.lines.length > 50) return { valid: false, message: 'Informe entre 1 e 50 itens distintos.' };
  const seen = new Set(), lines = [];
  for (const row of input.lines) {
    const item = items.find(i => i.id === row.itemId), q = inventoryDecimalHundredths(row.quantity);
    const unit = normalizeInventoryUnitCode(item?.unit_code || item?.unit);
    if (!item || item.lifecycle_status !== 'active' || seen.has(item.id) || !unit) return { valid: false, message: 'Selecione itens ativos distintos.' };
    if (q === null || q < 1n || q > 99999999999n || (!['gram', 'milliliter'].includes(unit) && q % 100n)) return { valid: false, message: 'Revise a quantidade e a precisão da unidade.' };
    seen.add(item.id); lines.push({ item_id: item.id, unit_code: unit, quantity_hundredths: Number(q) });
  }
  return { valid: true, value: { supplierId: input.supplierId, lines: lines.sort((a,b) => a.item_id.localeCompare(b.item_id)) } };
};
export const validateInventoryOrderDelivery = (order, rows, items, suppliers) => {
  if (!order || !['open', 'partial'].includes(order.status)) return { valid: false, message: 'O pedido não permite novas entregas. Atualize a consulta.' };
  const lines = rows.filter(row => String(row.quantity).trim() !== '' && inventoryDecimalHundredths(row.quantity) !== 0n);
  for (const row of lines) {
    const expected = order.lines.find(l => l.item_id === row.itemId), item = items.find(i => i.id === row.itemId), q = inventoryDecimalHundredths(row.quantity);
    if (!expected || normalizeInventoryUnitCode(item?.unit_code || item?.unit) !== expected.unit_code) return { valid: false, message: 'O item ou sua unidade não corresponde ao pedido. Atualize a consulta.' };
    if (q !== null && q > BigInt(expected.remaining_hundredths)) return { valid: false, message: 'A quantidade recebida excede o restante do pedido.' };
  }
  return validateInventoryPurchaseInput({ supplierId: order.supplier_id, lines }, items, suppliers);
};
export const inventoryOrderErrorMessage = (error) => {
  if (error?.message === 'SS_INVENTORY_REPLENISHMENT_CHANGED') return 'A reposição mudou. Revise os valores atualizados antes de confirmar.';
  if (/SS_INVENTORY_ORDER_EXCESS/.test(error?.message || '')) return 'A entrega excede o restante do pedido. Atualize e revise as quantidades.';
  if (/SS_INVENTORY_ORDER_LINE_MISMATCH/.test(error?.message || '')) return 'O item, unidade ou recebimento não corresponde ao pedido.';
  if (/SS_INVENTORY_ORDER_NOT_ACCESSIBLE/.test(error?.message || '')) return 'Pedido indisponível para esta clínica ou sessão.';
  return inventoryPurchaseErrorMessage(error);
};
