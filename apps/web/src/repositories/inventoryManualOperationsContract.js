export const INVENTORY_UNITS = Object.freeze([
  'unit',
  'package',
  'box',
  'bottle',
  'pair',
  'milliliter',
  'gram',
]);

export const INVENTORY_UNIT_LABELS = Object.freeze({
  unit: 'Unidade',
  package: 'Pacote',
  box: 'Caixa',
  bottle: 'Frasco',
  pair: 'Par',
  milliliter: 'Mililitro',
  gram: 'Grama',
});

export const INVENTORY_MOVEMENT_TYPES = Object.freeze([
  'entry',
  'consumption',
  'adjustment_increase',
  'adjustment_decrease',
]);

export const INVENTORY_MOVEMENT_TYPE_LABELS = Object.freeze({
  entry: 'Entrada',
  consumption: 'Consumo',
  adjustment_increase: 'Ajuste de aumento',
  adjustment_decrease: 'Ajuste de redução',
});

export const INVENTORY_REASON_OPTIONS = Object.freeze({
  entry: Object.freeze([
    { value: 'manual_receipt', label: 'Recebimento manual' },
    { value: 'initial_stock', label: 'Estoque inicial' },
    { value: 'return_to_stock', label: 'Retorno ao estoque' },
  ]),
  consumption: Object.freeze([
    { value: 'operational_use', label: 'Uso operacional' },
    { value: 'damaged_item', label: 'Item danificado' },
    { value: 'expired_item', label: 'Item expirado' },
  ]),
  adjustment_increase: Object.freeze([
    { value: 'inventory_count', label: 'Contagem de inventário' },
    { value: 'registration_correction', label: 'Correção de cadastro' },
  ]),
  adjustment_decrease: Object.freeze([
    { value: 'inventory_count', label: 'Contagem de inventário' },
    { value: 'registration_correction', label: 'Correção de cadastro' },
  ]),
});

const INDIVISIBLE_UNITS = new Set(['unit', 'package', 'box', 'bottle', 'pair']);
const ITEM_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,63}$/;
const LEGACY_UNIT_ALIASES = Object.freeze({
  unidade: 'unit', unidades: 'unit', un: 'unit', seringa: 'unit', seringas: 'unit', rolo: 'unit', rolos: 'unit',
  pacote: 'package', pacotes: 'package', fardo: 'package', fardos: 'package', caixa: 'box', caixas: 'box',
  frasco: 'bottle', frascos: 'bottle', par: 'pair', pares: 'pair',
  mililitro: 'milliliter', mililitros: 'milliliter', ml: 'milliliter',
  grama: 'gram', gramas: 'gram', g: 'gram',
});

export const normalizeInventoryUnitCode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (INVENTORY_UNITS.includes(normalized)) return normalized;
  return LEGACY_UNIT_ALIASES[normalized] || normalized;
};

export const createInventoryRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    return (token === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

export const normalizeInventoryItemInput = (input = {}) => ({
  displayName: String(input.displayName || '').trim(),
  itemCode: String(input.itemCode || '').trim().toLowerCase(),
  categoryId: String(input.categoryId || '').trim(),
  unit: normalizeInventoryUnitCode(input.unit),
  minimumQuantity: Number(input.minimumQuantity),
});

export const validateInventoryItemInput = (input = {}) => {
  const normalized = normalizeInventoryItemInput(input);
  if (normalized.displayName.length < 2 || normalized.displayName.length > 140) {
    return { valid: false, message: 'Informe um nome entre 2 e 140 caracteres.' };
  }
  if (!ITEM_CODE_PATTERN.test(normalized.itemCode)) {
    return { valid: false, message: 'Use um código com letras minúsculas, números, hífen ou sublinhado.' };
  }
  if (!normalized.categoryId) {
    return { valid: false, message: 'Selecione uma categoria ativa.' };
  }
  if (!INVENTORY_UNITS.includes(normalized.unit)) {
    return { valid: false, message: 'Selecione uma unidade válida.' };
  }
  if (!Number.isFinite(normalized.minimumQuantity) || normalized.minimumQuantity < 0 || normalized.minimumQuantity > 999999999.99) {
    return { valid: false, message: 'O estoque mínimo não pode ser negativo.' };
  }
  if (Math.round(normalized.minimumQuantity * 100) / 100 !== normalized.minimumQuantity) {
    return { valid: false, message: 'Use no máximo duas casas decimais.' };
  }
  if (INDIVISIBLE_UNITS.has(normalized.unit) && !Number.isInteger(normalized.minimumQuantity)) {
    return { valid: false, message: 'Esta unidade aceita somente quantidades inteiras.' };
  }
  return { valid: true, value: normalized };
};

export const validateInventoryMovementInput = ({ item, movementType, reasonCode, quantity } = {}) => {
  const normalizedType = String(movementType || '').trim().toLowerCase();
  const normalizedReason = String(reasonCode || '').trim().toLowerCase();
  const normalizedQuantity = Number(quantity);
  const unit = normalizeInventoryUnitCode(item?.unit_code || item?.unit);
  if (!item?.id || item.lifecycle_status !== 'active') {
    return { valid: false, message: 'Somente itens ativos podem receber movimentações.' };
  }
  if (!INVENTORY_MOVEMENT_TYPES.includes(normalizedType)) {
    return { valid: false, message: 'Selecione um tipo de movimentação válido.' };
  }
  if (!(INVENTORY_REASON_OPTIONS[normalizedType] || []).some((reason) => reason.value === normalizedReason)) {
    return { valid: false, message: 'Selecione um motivo compatível com a movimentação.' };
  }
  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0 || normalizedQuantity > 999999999.99) {
    return { valid: false, message: 'A quantidade deve ser maior que zero.' };
  }
  if (Math.round(normalizedQuantity * 100) / 100 !== normalizedQuantity) {
    return { valid: false, message: 'Use no máximo duas casas decimais.' };
  }
  if (INDIVISIBLE_UNITS.has(unit) && !Number.isInteger(normalizedQuantity)) {
    return { valid: false, message: 'Esta unidade aceita somente quantidades inteiras.' };
  }
  const isReduction = ['consumption', 'adjustment_decrease'].includes(normalizedType);
  const projectedQuantity = Number(item.current_quantity || 0) + (isReduction ? -normalizedQuantity : normalizedQuantity);
  if (projectedQuantity < 0) {
    return { valid: false, message: 'A movimentação não pode deixar o estoque negativo.' };
  }
  return {
    valid: true,
    value: {
      movementType: normalizedType,
      reasonCode: normalizedReason,
      quantity: normalizedQuantity,
      unit,
      projectedQuantity,
    },
  };
};

export const inventoryOperationErrorMessage = (error) => {
  const message = `${error?.code || ''} ${error?.message || error || ''}`;
  if (/SS_INVENTORY_STALE_STATE|40001/i.test(message)) return 'O item foi alterado em outra sessão. Atualize a tela e tente novamente.';
  if (/SS_INVENTORY_INSUFFICIENT_STOCK|23514/i.test(message)) return 'A quantidade excede o saldo disponível.';
  if (/SS_INVENTORY_ITEM_INACTIVE/i.test(message)) return 'O item está inativo e não aceita alterações.';
  if (/SS_INVENTORY_CATEGORY_NOT_AVAILABLE|23503/i.test(message)) return 'A categoria não está disponível para esta clínica.';
  if (/SS_INVENTORY_UNIT_MISMATCH/i.test(message)) return 'A unidade informada não corresponde à unidade do item.';
  if (/SS_INVENTORY_MANAGE_PERMISSION_DENIED|42501/i.test(message)) return 'Seu perfil não possui permissão para alterar o estoque.';
  if (/SS_INVENTORY_REQUEST_ID_CONFLICT|23505/i.test(message)) return 'A solicitação já foi usada com dados diferentes.';
  if (/SS_INVENTORY_INVALID/i.test(message)) return 'Revise os dados informados para continuar.';
  return 'Não foi possível concluir a operação de estoque.';
};
