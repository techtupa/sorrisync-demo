import { todayInSaoPaulo } from './clinicFinanceReadModel.js';
import { isClinicFinanceReversalReason } from './clinicFinanceSettlementContract.js';
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const parseClinicFinanceAmount = value => {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null;
  const [integer, decimal = ''] = text.replaceAll('.', '').split(',');
  const cents = Number(integer) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents >= 1 && cents <= 999999999 ? cents : null;
};
export const validateClinicFinancePayment = ({ entry, requestId, amountCents, settlementDate, paymentEventId, reversalReasonCode }) => {
  const errors = [];
  if (!entry?.id || !entry.updatedAt || !Number.isFinite(Date.parse(entry.updatedAt))) errors.push('Atualize o lançamento antes de continuar.');
  if (!uuid(requestId)) errors.push('Não foi possível preparar a operação com segurança.');
  if (paymentEventId) {
    if (!entry?.canReversePayment || !entry.activePaymentEvents?.some(event => event.id === paymentEventId) || !isClinicFinanceReversalReason(reversalReasonCode)) errors.push('Selecione um registro ativo e um motivo de estorno válido.');
  } else {
    if (!entry?.canRecordPayment) errors.push('O lançamento não permite um novo registro.');
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > entry?.remainingAmountCents) errors.push('Informe um valor positivo de até o saldo restante.');
    const date = typeof settlementDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(settlementDate) ? new Date(`${settlementDate}T12:00:00Z`) : null;
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== settlementDate || settlementDate > todayInSaoPaulo()) errors.push('Informe uma data válida e não futura.');
  }
  return { valid: errors.length === 0, errors };
};
export const clinicFinancePaymentErrorMessage = error => {
  const code = String(error?.message || error?.code || '');
  if (/INVALID_RECEIPT/.test(code)) return 'Não foi possível confirmar a operação. Confira o histórico antes de iniciar outra tentativa.';
  if (/STALE_STATE|40001/.test(code)) return 'O lançamento mudou em outra sessão. Atualize o saldo e confira o histórico antes de tentar novamente.';
  if (/PERMISSION_DENIED|42501|TENANT_CONTEXT/.test(code)) return 'O contexto da clínica ou sua permissão não permite esta operação.';
  if (/REQUEST_ID_CONFLICT|23505/.test(code)) return 'Esta tentativa já foi usada com dados diferentes. Atualize o histórico.';
  if (/BALANCE_INCONSISTENT/.test(code)) return 'Não foi possível confirmar o saldo deste lançamento. Nenhum ajuste automático foi realizado.';
  if (/EXCEEDS_BALANCE|INVALID|22023/.test(code)) return 'Revise o valor, a data e o saldo restante.';
  if (/IMMUTABLE|NOT_REVERSIBLE|NOT_SETTLEMENT_ELIGIBLE|LEGACY_PARTIAL|55000/.test(code)) return 'O estado atual não permite a operação. Atualize o histórico e confira os registros ativos.';
  return 'Não foi possível confirmar a operação. Confira o histórico antes de iniciar outra tentativa.';
};
