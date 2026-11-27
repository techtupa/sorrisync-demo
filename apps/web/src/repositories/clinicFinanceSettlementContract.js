import { todayInSaoPaulo } from './clinicFinanceReadModel.js';

export const CLINIC_FINANCE_REVERSAL_REASONS = Object.freeze([
  'registered_by_mistake',
  'wrong_entry',
  'duplicate_settlement',
  'settlement_not_confirmed',
]);

export const CLINIC_FINANCE_REVERSAL_REASON_LABELS = Object.freeze({
  registered_by_mistake: 'Baixa registrada por engano',
  wrong_entry: 'Lançamento incorreto',
  duplicate_settlement: 'Baixa duplicada',
  settlement_not_confirmed: 'Pagamento ou recebimento não confirmado',
});

export const CLINIC_FINANCE_SETTLEMENT_ELIGIBLE_STATUSES = Object.freeze({
  receivable: Object.freeze(['open', 'overdue']),
  payable: Object.freeze(['scheduled', 'overdue']),
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const clean = (value) => String(value ?? '').trim();
const isExactDate = (value) => {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

export const createClinicFinanceSettlementRequestId = () => {
  try { return globalThis.crypto?.randomUUID?.() || null; } catch { return null; }
};

export const isClinicFinanceSettlementEligible = (entry) => Boolean(
  entry
  && entry.currency === 'BRL'
  && CLINIC_FINANCE_SETTLEMENT_ELIGIBLE_STATUSES[entry.type]?.includes(entry.status),
);

export const isClinicFinanceSettlementReversible = (entry) => Boolean(
  entry?.status === 'paid' && entry?.settlementEventId && entry?.settlementDate,
);

export const isClinicFinanceReversalReason = (reasonCode) => (
  CLINIC_FINANCE_REVERSAL_REASONS.includes(clean(reasonCode).toLowerCase())
);

export const validateClinicFinanceSettlementInput = ({ entry, expectedUpdatedAt, requestId, settlementDate }) => {
  const errors = [];
  const normalized = {
    entryId: clean(entry?.id),
    expectedUpdatedAt: clean(expectedUpdatedAt || entry?.updatedAt),
    requestId: clean(requestId),
    settlementDate: clean(settlementDate),
  };
  if (!isClinicFinanceSettlementEligible(entry)) errors.push('Este lançamento não está elegível para baixa integral.');
  if (!normalized.entryId) errors.push('O lançamento é obrigatório.');
  if (!normalized.expectedUpdatedAt || Number.isNaN(Date.parse(normalized.expectedUpdatedAt))) errors.push('Atualize a tela antes de registrar a baixa.');
  if (!UUID_PATTERN.test(normalized.requestId)) errors.push('A chave UUID da baixa é obrigatória.');
  if (!isExactDate(normalized.settlementDate) || normalized.settlementDate > todayInSaoPaulo()) errors.push('Informe uma data de baixa válida e não futura.');
  return { valid: errors.length === 0, errors, value: normalized };
};

export const validateClinicFinanceSettlementReversalInput = ({ entry, expectedUpdatedAt, requestId, reversalReasonCode }) => {
  const errors = [];
  const normalized = {
    entryId: clean(entry?.id),
    expectedUpdatedAt: clean(expectedUpdatedAt || entry?.updatedAt),
    requestId: clean(requestId),
    reversalReasonCode: clean(reversalReasonCode).toLowerCase(),
  };
  if (!isClinicFinanceSettlementReversible(entry)) errors.push('Este lançamento não possui baixa ativa para estorno.');
  if (!normalized.expectedUpdatedAt || Number.isNaN(Date.parse(normalized.expectedUpdatedAt))) errors.push('Atualize a tela antes de estornar a baixa.');
  if (!UUID_PATTERN.test(normalized.requestId)) errors.push('A chave UUID do estorno é obrigatória.');
  if (!isClinicFinanceReversalReason(normalized.reversalReasonCode)) errors.push('Selecione um motivo de estorno válido.');
  return { valid: errors.length === 0, errors, value: normalized };
};

export const clinicFinanceSettlementErrorMessage = (error) => {
  const message = String(error?.message || error?.code || '');
  if (/STALE_STATE|40001/.test(message)) return 'Este lançamento foi alterado em outra sessão. Atualize a tela e tente novamente.';
  if (/PERMISSION_DENIED|42501/.test(message)) return 'Seu perfil não possui permissão para esta operação.';
  if (/REQUEST_ID_CONFLICT|23505/.test(message)) return 'A chave desta operação já foi usada com dados diferentes.';
  if (/NOT_SETTLEMENT_ELIGIBLE|NOT_REVERSIBLE|IMMUTABLE|55000/.test(message)) return 'O estado atual deste lançamento não permite a operação.';
  if (/INVALID|22023/.test(message)) return 'Revise os dados operacionais informados.';
  if (/NOT_FOUND|P0002/.test(message)) return 'O lançamento ou a baixa ativa não foi encontrado neste tenant.';
  return 'Não foi possível concluir a operação. Nenhuma movimentação financeira foi presumida.';
};
