import { normalizeInventoryUnitCode } from './inventoryManualOperationsContract.js';

export const INVENTORY_PURCHASE_MAX_LINES = 50;
export const INVENTORY_PURCHASE_MAX_TOTAL_CENTS = 999999999n;

// Decimal text -> integer hundredths. No floating-point multiplication or implicit rounding.
export const inventoryDecimalHundredths = (value) => {
  const text = String(value ?? '').trim();
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.replace(',', '.').split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};

export const inventoryLineTotalCents = (quantityHundredths, unitCostCents) =>
  (BigInt(quantityHundredths) * BigInt(unitCostCents) + 50n) / 100n;

export const validateInventoryPurchaseInput = (input, items = [], suppliers = []) => {
  const supplier = suppliers.find((s) => s.id === input.supplierId);
  if (!supplier || supplier.lifecycle_status !== 'active') return { valid: false, message: 'Selecione um fornecedor ativo.' };
  if (!Array.isArray(input.lines) || input.lines.length < 1 || input.lines.length > INVENTORY_PURCHASE_MAX_LINES) {
    return { valid: false, message: 'Informe entre 1 e 50 itens distintos.' };
  }
  const seen = new Set();
  const lines = [];
  let total = 0n;
  for (const line of input.lines) {
    const item = items.find((i) => i.id === line.itemId);
    if (!item || item.lifecycle_status !== 'active') return { valid: false, message: 'Selecione somente itens ativos.' };
    if (seen.has(item.id)) return { valid: false, message: 'Informe cada item apenas uma vez.' };
    seen.add(item.id);
    const q = inventoryDecimalHundredths(line.quantity);
    const cost = inventoryDecimalHundredths(line.unitCost);
    const unit = normalizeInventoryUnitCode(item.unit_code || item.unit);
    if (q === null || q < 1n || q > 99999999999n || (!['gram', 'milliliter'].includes(unit) && q % 100n !== 0n)) {
      return { valid: false, message: 'Revise a quantidade e a precisão permitida para a unidade do item.' };
    }
    if (cost === null || cost < 1n || cost > 99999999n) return { valid: false, message: 'Informe custo unitário entre R$ 0,01 e R$ 999.999,99.' };
    const lineTotal = inventoryLineTotalCents(q, cost);
    if (lineTotal < 1n) return { valid: false, message: 'O total de cada item precisa ser de pelo menos R$ 0,01.' };
    total += lineTotal;
    if (total > INVENTORY_PURCHASE_MAX_TOTAL_CENTS) return { valid: false, message: 'O recebimento pode totalizar no máximo R$ 9.999.999,99.' };
    lines.push({ item_id: item.id, quantity_hundredths: Number(q), unit_cost_cents: Number(cost), unit_code: unit });
  }
  return { valid: true, value: { supplierId: supplier.id, lines: lines.sort((a, b) => a.item_id.localeCompare(b.item_id)), totalCents: Number(total) } };
};

export const inventoryPurchaseErrorMessage = (error) => {
  if (/SS_INVENTORY_ORDER_ACTION_REQUIRED/.test(error?.message || '')) return 'Abra o pedido vinculado para estornar esta entrega com segurança.';
  const message = String(error?.message || '');
  if (/SS_INVENTORY_SOURCE_UNAVAILABLE/.test(message)) return 'A leitura real do estoque está indisponível. Atualize os dados antes de registrar uma nova operação.';
  if (/SS_INVENTORY_STALE_STATE/.test(message)) return 'Este registro mudou em outra sessão. Atualize, revise os dados e tente novamente.';
  if (/SS_INVENTORY_REQUEST_ID_CONFLICT/.test(message)) return 'Esta solicitação já foi usada com dados diferentes. Atualize e revise o registro.';
  if (/SS_INVENTORY_INSUFFICIENT_STOCK/.test(message)) return 'O saldo de um dos itens não permite estornar todo o recebimento. Nenhuma quantidade foi retirada.';
  if (/SS_INVENTORY_SUPPLIER_NOT_AVAILABLE/.test(message)) return 'O fornecedor não está ativo ou disponível nesta clínica. Atualize os dados.';
  if (/SS_INVENTORY_ITEM_NOT_AVAILABLE|SS_INVENTORY_UNIT_MISMATCH/.test(message)) return 'Um item mudou ou não está disponível nesta clínica. Atualize e revise os dados.';
  if (/SS_INVENTORY_STOCK_LIMIT/.test(message)) return 'O recebimento ultrapassa o limite de saldo de um item.';
  if (/SS_INVENTORY_OPERATION_UNAVAILABLE/.test(message)) return 'Outra operação está usando este registro. Aguarde e tente novamente com os mesmos dados.';
  if (/SS_INVENTORY_MANAGE_PERMISSION_DENIED/.test(message) || error?.code === '42501') return 'Seu acesso atual não permite gerenciar compras nesta clínica.';
  if (error?.code === '23514' || /SS_INVENTORY_INVALID/.test(message)) return 'Revise os campos. Use somente nomes operacionais e valores dentro dos limites informados.';
  return 'Resultado não confirmado. Mantenha os dados e tente novamente para recuperar a mesma solicitação.';
};

export const isInventoryPurchaseKnownRefusal = (error) =>
  ['PT409', '22023', '23514', '42501', 'P0001'].includes(error?.code);

export const formatInventoryPurchaseMoney = (cents) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(cents) / 100);

export const formatInventoryPurchaseDate = (value) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
