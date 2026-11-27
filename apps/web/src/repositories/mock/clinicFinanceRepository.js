import {
  CLINIC_PAYABLE_STATUSES,
  CLINIC_RECEIVABLE_STATUSES,
  buildClinicFinanceReadModel,
  buildClinicFinanceSummary,
  mapClinicFinanceEntry,
  todayInSaoPaulo,
} from '../clinicFinanceReadModel.js';
import {
  isClinicFinanceCancellationReason,
  validateClinicFinanceMutationDraft,
} from '../clinicFinanceMutationContract.js';
import {
  validateClinicFinanceSettlementInput,
  validateClinicFinanceSettlementReversalInput,
} from '../clinicFinanceSettlementContract.js';
import { deriveClinicFinanceBalance } from '../clinicFinanceBalance.js';
import { validateClinicFinancePayment } from '../clinicFinancePaymentContract.js';

export {
  CLINIC_PAYABLE_STATUSES,
  CLINIC_RECEIVABLE_STATUSES,
  buildClinicFinanceReadModel,
  buildClinicFinanceSummary,
  mapClinicFinanceEntry,
};

const DEFAULT_TENANT_ID = 'tenant_harbor';
const states = new Map();
const auditTrail = new Map();
let clockSequence = 0;

const addDays = (dateKey, days) => {
  const value = new Date(`${dateKey}T12:00:00-03:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const nextTimestamp = () => new Date(Date.now() + (++clockSequence * 1000)).toISOString();
const cloneRows = (rows) => rows.map((row) => ({ ...row }));

const buildMockRows = (tenantId) => {
  const today = todayInSaoPaulo();
  const competenceMonth = `${today.slice(0, 7)}-01`;

  return {
    receivableRows: [
      {
        id: `${tenantId}-finance-receivable-overdue`, status: 'overdue', amount_cents: 123400, currency: 'BRL', due_date: addDays(today, -7), competence_month: competenceMonth,
        category_label: 'Fictional operating income', counterparty_label: 'Fictional counterparty', description: 'Overdue fictional receivable.', created_at: `${today}T12:00:00.000Z`, updated_at: `${today}T12:00:00.000Z`, request_id: null,
      },
      {
        id: `${tenantId}-finance-receivable-future`, status: 'open', amount_cents: 256700, currency: 'BRL', due_date: addDays(today, 12), competence_month: competenceMonth,
        category_label: 'Fictional projected income', counterparty_label: 'Fictional operation', description: 'Upcoming fictional receivable.', created_at: `${today}T12:00:00.000Z`, updated_at: `${today}T12:00:00.000Z`, request_id: null,
      },
    ],
    payableRows: [
      {
        id: `${tenantId}-finance-payable-overdue`, status: 'overdue', amount_cents: 65400, currency: 'BRL', due_date: addDays(today, -5), competence_month: competenceMonth,
        category_label: 'Fictional operating expense', counterparty_label: 'Fictional supplies vendor', description: 'Overdue fictional payable.', created_at: `${today}T12:00:00.000Z`, updated_at: `${today}T12:00:00.000Z`, request_id: null,
      },
      {
        id: `${tenantId}-finance-payable-future`, status: 'scheduled', amount_cents: 98700, currency: 'BRL', due_date: addDays(today, 9), competence_month: competenceMonth,
        category_label: 'Fictional operating supplies', counterparty_label: 'Fictional vendor activity', description: 'Upcoming fictional payable.', created_at: `${today}T12:00:00.000Z`, updated_at: `${today}T12:00:00.000Z`, request_id: null,
      },
    ],
    settlementRows: [],
  };
};

const ensureState = (tenantId) => {
  const resolvedTenantId = tenantId || DEFAULT_TENANT_ID;
  if (!states.has(resolvedTenantId)) states.set(resolvedTenantId, buildMockRows(resolvedTenantId));
  if (!auditTrail.has(resolvedTenantId)) auditTrail.set(resolvedTenantId, []);
  return states.get(resolvedTenantId);
};

const fail = (code, message = code) => {
  const error = new Error(message);
  error.code = code;
  throw error;
};

const requireManage = ({ tenantId, canManage }) => {
  if (!tenantId) fail('TENANT_REQUIRED', 'Tenant atual ausente para operação financeira.');
  if (!canManage) fail('42501', 'SS_FINANCE_MANAGE_PERMISSION_DENIED');
};

const recordAudit = (tenantId, actionCode, entryType, previousStatus, nextStatus, result, changes = {}) => {
  ensureState(tenantId);
  auditTrail.get(tenantId).push({
    action_code: actionCode,
    entry_type: entryType,
    previous_status: previousStatus,
    next_status: nextStatus,
    category_changed: Boolean(changes.categoryChanged),
    counterparty_changed: Boolean(changes.counterpartyChanged),
    amount_changed: Boolean(changes.amountChanged),
    due_date_changed: Boolean(changes.dueDateChanged),
    competence_changed: Boolean(changes.competenceChanged),
    ...(changes.cancellationReasonCode ? { cancellation_reason_code: changes.cancellationReasonCode } : {}),
    ...(changes.settlementDatePresent ? { settlement_date_present: true } : {}),
    ...(changes.reversalReasonCode ? { reversal_reason_code: changes.reversalReasonCode } : {}),
    result,
  });
};

const entryRows = (state, entryType) => (entryType === 'receivable' ? state.receivableRows : state.payableRows);
const entryPrefix = (entryType) => (entryType === 'receivable' ? 'manual-rec' : 'manual-pay');

const mapMutationResult = (row, entryType, mutationResult) => ({
  entry: mapClinicFinanceEntry(row, entryType, 'mock'),
  mutationResult,
});

const mapSettlementResult = (row, event, mutationResult, entryStatus = row.status) => ({
  entryId: row.id,
  entryStatus,
  updatedAt: row.updated_at,
  eventId: event.id,
  eventType: event.event_type,
  settlementDate: event.settlement_date || null,
  mutationResult,
});

const sameDraft = (row, value) => (
  row.status === value.status
  && row.amount_cents === value.amountCents
  && row.currency === value.currency
  && row.due_date === value.dueDate
  && row.competence_month === value.competenceMonth
  && row.category_label === value.categoryLabel
  && row.counterparty_label === value.counterpartyLabel
  && row.description === value.description
);

const createEntry = async ({ tenantId, canManage, entryType, draft }) => {
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinanceMutationDraft(entryType, draft, { mode: 'create' });
  if (!validation.valid) fail('22023', validation.errors.join(' '));
  const value = validation.value;
  const rows = entryRows(ensureState(tenantId), entryType);
  const existing = rows.find((row) => row.request_id === value.requestId);
  const actionCode = `${entryType}_created`;

  if (existing) {
    if (!sameDraft(existing, value)) fail('23505', 'SS_FINANCE_REQUEST_ID_CONFLICT');
    recordAudit(tenantId, actionCode, entryType, existing.status, existing.status, 'idempotent');
    return mapMutationResult(existing, entryType, 'idempotent');
  }

  const timestamp = nextTimestamp();
  const row = {
    id: `${tenantId}-${entryPrefix(entryType)}-${value.requestId}`,
    reference_code: `${entryPrefix(entryType)}-${value.requestId}`,
    request_id: value.requestId,
    status: value.status,
    amount_cents: value.amountCents,
    currency: value.currency,
    due_date: value.dueDate,
    competence_month: value.competenceMonth,
    category_label: value.categoryLabel,
    counterparty_label: value.counterpartyLabel,
    description: value.description,
    created_at: timestamp,
    updated_at: timestamp,
  };
  rows.push(row);
  recordAudit(tenantId, actionCode, entryType, 'none', row.status, 'changed');
  return mapMutationResult(row, entryType, 'changed');
};

const updateEntry = async ({ tenantId, canManage, entryType, entryId, expectedUpdatedAt, draft }) => {
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinanceMutationDraft(entryType, { ...draft, expectedUpdatedAt }, { mode: 'update' });
  if (!validation.valid) fail('22023', validation.errors.join(' '));
  const value = validation.value;
  const rows = entryRows(ensureState(tenantId), entryType);
  const row = rows.find((candidate) => candidate.id === entryId);
  if (!row) fail('P0002', 'SS_FINANCE_ENTRY_NOT_FOUND');
  if (['paid', 'canceled'].includes(row.status)) fail('55000', 'SS_FINANCE_ENTRY_IMMUTABLE');
  const balance = deriveClinicFinanceBalance(row, entryType, ensureState(tenantId).settlementRows);
  if (balance.active_count > 0 || balance.quality === 'inconsistent') fail('55000', 'SS_FINANCE_ACTIVE_PAYMENT_IMMUTABLE');

  const comparable = { ...value, status: row.status };
  if (sameDraft(row, comparable)) {
    recordAudit(tenantId, `${entryType}_updated`, entryType, row.status, row.status, 'idempotent');
    return mapMutationResult(row, entryType, 'idempotent');
  }
  if (row.updated_at !== value.expectedUpdatedAt) fail('40001', 'SS_FINANCE_STALE_STATE');

  const previous = { ...row };
  Object.assign(row, {
    amount_cents: value.amountCents,
    currency: value.currency,
    due_date: value.dueDate,
    competence_month: value.competenceMonth,
    category_label: value.categoryLabel,
    counterparty_label: value.counterpartyLabel,
    description: value.description,
    updated_at: nextTimestamp(),
  });
  recordAudit(tenantId, `${entryType}_updated`, entryType, previous.status, row.status, 'changed', {
    categoryChanged: previous.category_label !== row.category_label,
    counterpartyChanged: previous.counterparty_label !== row.counterparty_label,
    amountChanged: previous.amount_cents !== row.amount_cents,
    dueDateChanged: previous.due_date !== row.due_date,
    competenceChanged: previous.competence_month !== row.competence_month,
  });
  return mapMutationResult(row, entryType, 'changed');
};

const cancelEntry = async ({ tenantId, canManage, entryType, entryId, expectedUpdatedAt, reasonCode }) => {
  requireManage({ tenantId, canManage });
  if (!entryId || !expectedUpdatedAt || !isClinicFinanceCancellationReason(reasonCode)) fail('22023', 'SS_FINANCE_INVALID_CANCELLATION');
  const rows = entryRows(ensureState(tenantId), entryType);
  const row = rows.find((candidate) => candidate.id === entryId);
  if (!row) fail('P0002', 'SS_FINANCE_ENTRY_NOT_FOUND');
  if (row.status === 'paid') fail('55000', 'SS_FINANCE_PAID_ENTRY_IMMUTABLE');
  const balance = deriveClinicFinanceBalance(row, entryType, ensureState(tenantId).settlementRows);
  if (balance.active_count > 0 || balance.quality === 'inconsistent') fail('55000', 'SS_FINANCE_ACTIVE_PAYMENT_IMMUTABLE');
  if (row.status === 'canceled') {
    recordAudit(tenantId, `${entryType}_canceled`, entryType, row.status, row.status, 'idempotent', { cancellationReasonCode: reasonCode });
    return mapMutationResult(row, entryType, 'idempotent');
  }
  if (row.updated_at !== expectedUpdatedAt) fail('40001', 'SS_FINANCE_STALE_STATE');

  const previousStatus = row.status;
  row.status = 'canceled';
  row.updated_at = nextTimestamp();
  recordAudit(tenantId, `${entryType}_canceled`, entryType, previousStatus, row.status, 'changed', { cancellationReasonCode: reasonCode });
  return mapMutationResult(row, entryType, 'changed');
};

const settlementEntryId = (event, entryType) => (entryType === 'receivable' ? event.receivable_id : event.payable_id);

const paymentInMemory = async ({ tenantId, canManage, entryType, entry, requestId, settlementDate, amountCents, paymentEventId, reversalReasonCode, reversing = false }) => {
  requireManage({ tenantId, canManage });
  const legacy = reversing ? !paymentEventId : amountCents === undefined;
  const validation = legacy ? (reversing ? validateClinicFinanceSettlementReversalInput({ entry, requestId, reversalReasonCode }) : validateClinicFinanceSettlementInput({ entry, requestId, settlementDate })) : validateClinicFinancePayment({ entry, requestId, settlementDate, amountCents, paymentEventId, reversalReasonCode });
  if (!validation.valid) fail('22023', validation.errors.join(' '));
  const state = ensureState(tenantId), row = entryRows(state, entryType).find(item => item.id === entry.id);
  if (!row) fail('P0002', 'SS_FINANCE_ENTRY_NOT_FOUND');
  const kind = legacy ? (reversing ? 'legacy_reverse' : 'legacy_record') : (reversing ? 'reverse' : 'record');
  const existing = state.settlementRows.find(event => event.request_id === requestId);
  const result = (event, mutationResult) => ({ ...mapSettlementResult(row, event, mutationResult), amountCents: event.amount_cents ?? null, balance: deriveClinicFinanceBalance(row, entryType, state.settlementRows) });
  if (existing) {
    if (existing.entry_type !== entryType || settlementEntryId(existing, entryType) !== row.id || existing.request_kind !== kind || (!reversing && existing.settlement_date !== settlementDate) || (!legacy && !reversing && existing.amount_cents !== amountCents) || (reversing && existing.reversal_reason_code !== reversalReasonCode) || (!legacy && reversing && existing.reverses_event_id !== paymentEventId)) fail('23505', 'SS_FINANCE_REQUEST_ID_CONFLICT');
    return result(existing, 'idempotent');
  }
  if (row.updated_at !== entry.updatedAt) fail('40001', 'SS_FINANCE_STALE_STATE');
  const balance = deriveClinicFinanceBalance(row, entryType, state.settlementRows);
  if (balance.quality === 'inconsistent') fail('55000', 'SS_FINANCE_BALANCE_INCONSISTENT');
  let target, amount, nextStatus;
  if (reversing) {
    if (!balance.can_reverse) fail('55000', 'SS_FINANCE_SETTLEMENT_NOT_REVERSIBLE');
    const reversedIds = new Set(state.settlementRows.filter(event => event.event_type === 'reversed').map(event => event.reverses_event_id));
    const active = state.settlementRows.filter(event => event.event_type === 'settled' && event.entry_type === entryType && settlementEntryId(event, entryType) === row.id && !reversedIds.has(event.id));
    if (legacy && (row.status !== 'paid' || active.length !== 1 || (active[0].amount_cents != null && active[0].amount_cents !== row.amount_cents))) fail('55000', 'SS_FINANCE_LEGACY_PARTIAL_UNSUPPORTED');
    target = legacy ? active[0] : active.find(event => event.id === paymentEventId);
    if (!target) fail('55000', 'SS_FINANCE_SETTLEMENT_NOT_REVERSIBLE');
    amount = target.amount_cents ?? null;
    nextStatus = legacy || amount == null ? target.previous_status : row.status !== 'paid' ? row.status : row.due_date < todayInSaoPaulo() ? 'overdue' : entryType === 'receivable' ? 'open' : 'scheduled';
  } else {
    if (!balance.can_record) fail('55000', 'SS_FINANCE_ENTRY_NOT_SETTLEMENT_ELIGIBLE');
    if (legacy && balance.active_count) fail('55000', 'SS_FINANCE_LEGACY_PARTIAL_UNSUPPORTED');
    amount = legacy ? row.amount_cents : amountCents;
    if (amount > balance.remaining_amount_cents) fail('22023', 'SS_FINANCE_AMOUNT_EXCEEDS_BALANCE');
    nextStatus = balance.paid_amount_cents + amount === row.amount_cents ? 'paid' : row.status;
  }
  const event = { id: crypto.randomUUID(), entry_type: entryType, receivable_id: entryType === 'receivable' ? row.id : null, payable_id: entryType === 'payable' ? row.id : null,
    event_type: reversing ? 'reversed' : 'settled', request_id: requestId, request_kind: kind, amount_cents: amount,
    settlement_date: reversing ? null : settlementDate, reverses_event_id: target?.id || null, previous_status: row.status, next_status: nextStatus,
    reversal_reason_code: reversing ? reversalReasonCode : null, created_at: nextTimestamp() };
  state.settlementRows.push(event); row.status = nextStatus; row.updated_at = nextTimestamp();
  recordAudit(tenantId, entryType + (reversing ? '_settlement_reversed' : '_settled'), entryType, event.previous_status, nextStatus, 'changed', reversing ? { reversalReasonCode } : { settlementDatePresent: true });
  return result(event, 'changed');
};
const settleEntry = input => paymentInMemory(input);
const reverseSettlement = input => paymentInMemory({ ...input, reversing: true });

export const getClinicFinanceReadModelByTenant = (tenantId = DEFAULT_TENANT_ID) => {
  const resolvedTenantId = tenantId || DEFAULT_TENANT_ID;
  const state = ensureState(resolvedTenantId);
  return buildClinicFinanceReadModel(resolvedTenantId, {
    receivableRows: cloneRows(state.receivableRows),
    payableRows: cloneRows(state.payableRows),
    settlementRows: cloneRows(state.settlementRows),
    source: 'mock',
  });
};

export const getClinicReceivablesByTenant = (tenantId) => getClinicFinanceReadModelByTenant(tenantId).receivables;
export const getClinicPayablesByTenant = (tenantId) => getClinicFinanceReadModelByTenant(tenantId).payables;

export const createClinicReceivableByTenant = (input) => createEntry({ ...input, entryType: 'receivable' });
export const createClinicPayableByTenant = (input) => createEntry({ ...input, entryType: 'payable' });
export const updateClinicReceivableByTenant = (input) => updateEntry({ ...input, entryType: 'receivable' });
export const updateClinicPayableByTenant = (input) => updateEntry({ ...input, entryType: 'payable' });
export const cancelClinicReceivableByTenant = (input) => cancelEntry({ ...input, entryType: 'receivable' });
export const cancelClinicPayableByTenant = (input) => cancelEntry({ ...input, entryType: 'payable' });
export const settleClinicReceivableByTenant = (input) => settleEntry({ ...input, entryType: 'receivable' });
export const settleClinicPayableByTenant = (input) => settleEntry({ ...input, entryType: 'payable' });
export const reverseClinicReceivableSettlementByTenant = (input) => reverseSettlement({ ...input, entryType: 'receivable' });
export const reverseClinicPayableSettlementByTenant = (input) => reverseSettlement({ ...input, entryType: 'payable' });

export const getMockClinicFinanceMutationAuditTrail = (tenantId) => (
  (auditTrail.get(tenantId) || []).map((entry) => ({ ...entry }))
);

export const getMockClinicFinanceSettlementEvents = (tenantId) => (
  cloneRows(ensureState(tenantId).settlementRows)
);

export const resetMockClinicFinanceMutations = () => {
  states.clear();
  auditTrail.clear();
  clockSequence = 0;
};
