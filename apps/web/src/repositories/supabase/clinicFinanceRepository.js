import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { buildClinicFinanceReadModel, mapClinicFinanceEntry } from '../clinicFinanceReadModel.js';
import { validateClinicFinancePayment, clinicFinancePaymentErrorMessage } from '../clinicFinancePaymentContract.js';
import {
  clinicFinanceMutationErrorMessage,
  isClinicFinanceCancellationReason,
  validateClinicFinanceMutationDraft,
} from '../clinicFinanceMutationContract.js';
import {
  clinicFinanceSettlementErrorMessage,
  validateClinicFinanceSettlementInput,
  validateClinicFinanceSettlementReversalInput,
} from '../clinicFinanceSettlementContract.js';
import {
  cancelClinicPayableByTenant as cancelMockClinicPayableByTenant,
  cancelClinicReceivableByTenant as cancelMockClinicReceivableByTenant,
  createClinicPayableByTenant as createMockClinicPayableByTenant,
  createClinicReceivableByTenant as createMockClinicReceivableByTenant,
  getClinicFinanceReadModelByTenant as getMockClinicFinanceReadModelByTenant,
  getClinicPayablesByTenant as getMockClinicPayablesByTenant,
  getClinicReceivablesByTenant as getMockClinicReceivablesByTenant,
  updateClinicPayableByTenant as updateMockClinicPayableByTenant,
  updateClinicReceivableByTenant as updateMockClinicReceivableByTenant,
  reverseClinicPayableSettlementByTenant as reverseMockClinicPayableSettlementByTenant,
  reverseClinicReceivableSettlementByTenant as reverseMockClinicReceivableSettlementByTenant,
  settleClinicPayableByTenant as settleMockClinicPayableByTenant,
  settleClinicReceivableByTenant as settleMockClinicReceivableByTenant,
} from '../mock/clinicFinanceRepository.js';

const clinicFinanceRpcNames = Object.freeze({
  receivable: Object.freeze({
    create: 'create_clinic_receivable',
    update: 'update_clinic_receivable',
    cancel: 'cancel_clinic_receivable',
  }),
  payable: Object.freeze({
    create: 'create_clinic_payable',
    update: 'update_clinic_payable',
    cancel: 'cancel_clinic_payable',
  }),
});

const clinicFinanceSettlementRpcNames = Object.freeze({
  receivable: Object.freeze({ settle: 'settle_clinic_receivable', reverse: 'reverse_clinic_receivable_settlement' }),
  payable: Object.freeze({ settle: 'settle_clinic_payable', reverse: 'reverse_clinic_payable_settlement' }),
});

const requireTenant = (tenantId) => {
  if (!tenantId) {
    const error = new Error('Tenant atual ausente para leitura financeira.');
    error.code = 'TENANT_REQUIRED';
    throw error;
  }
};

const requireManage = ({ tenantId, canManage }) => {
  requireTenant(tenantId);
  if (!canManage) {
    const error = new Error('SS_FINANCE_MANAGE_PERMISSION_DENIED');
    error.code = '42501';
    throw error;
  }
};

const unwrapMutation = (response, entryType) => {
  if (response.error) {
    response.error.userMessage = clinicFinanceMutationErrorMessage(response.error);
    throw response.error;
  }
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row) throw new Error('SS_FINANCE_EMPTY_MUTATION_RESULT');
  return {
    entry: mapClinicFinanceEntry(row, entryType, 'supabase'),
    mutationResult: row.mutation_result || 'changed',
  };
};

const createEntry = async ({ tenantId, canManage, entryType, draft }) => {
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinanceMutationDraft(entryType, draft, { mode: 'create' });
  if (!validation.valid) {
    const error = new Error(validation.errors.join(' '));
    error.code = '22023';
    error.userMessage = validation.errors[0];
    throw error;
  }
  const value = validation.value;
  const response = await supabase.rpc(clinicFinanceRpcNames[entryType].create, {
    p_tenant_id: tenantId,
    p_request_id: value.requestId,
    p_description: value.description,
    p_category_label: value.categoryLabel,
    p_counterparty_label: value.counterpartyLabel,
    p_amount_cents: value.amountCents,
    p_currency: value.currency,
    p_due_date: value.dueDate,
    p_competence_month: value.competenceMonth,
    p_status: value.status,
  });
  return unwrapMutation(response, entryType);
};

const updateEntry = async ({ tenantId, canManage, entryType, entryId, expectedUpdatedAt, draft }) => {
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinanceMutationDraft(entryType, { ...draft, expectedUpdatedAt }, { mode: 'update' });
  if (!validation.valid) {
    const error = new Error(validation.errors.join(' '));
    error.code = '22023';
    error.userMessage = validation.errors[0];
    throw error;
  }
  const value = validation.value;
  const response = await supabase.rpc(clinicFinanceRpcNames[entryType].update, {
    p_tenant_id: tenantId,
    p_entry_id: entryId,
    p_expected_updated_at: value.expectedUpdatedAt,
    p_description: value.description,
    p_category_label: value.categoryLabel,
    p_counterparty_label: value.counterpartyLabel,
    p_amount_cents: value.amountCents,
    p_currency: value.currency,
    p_due_date: value.dueDate,
    p_competence_month: value.competenceMonth,
  });
  return unwrapMutation(response, entryType);
};

const cancelEntry = async ({ tenantId, canManage, entryType, entryId, expectedUpdatedAt, reasonCode }) => {
  requireManage({ tenantId, canManage });
  if (!entryId || !expectedUpdatedAt || !isClinicFinanceCancellationReason(reasonCode)) {
    const error = new Error('SS_FINANCE_INVALID_CANCELLATION');
    error.code = '22023';
    throw error;
  }
  const response = await supabase.rpc(clinicFinanceRpcNames[entryType].cancel, {
    p_tenant_id: tenantId,
    p_entry_id: entryId,
    p_expected_updated_at: expectedUpdatedAt,
    p_reason_code: reasonCode,
  });
  return unwrapMutation(response, entryType);
};

const unwrapSettlementMutation = (response) => {
  if (response.error) {
    response.error.userMessage = clinicFinanceSettlementErrorMessage(response.error);
    throw response.error;
  }
  const row = Array.isArray(response.data) ? response.data[0] : response.data;
  if (!row) throw new Error('SS_FINANCE_EMPTY_SETTLEMENT_RESULT');
  return {
    eventId: row.event_id,
    eventType: row.event_type,
    entryId: row.entry_id,
    entryStatus: row.entry_status,
    settlementDate: row.settlement_date || null,
    updatedAt: row.updated_at,
    mutationResult: row.mutation_result || 'changed',
  };
};

const paymentMutation = async ({ tenantId, canManage, entryType, entry, requestId, settlementDate, amountCents, paymentEventId, reversalReasonCode }) => {
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinancePayment({ entry, requestId, settlementDate, amountCents, paymentEventId, reversalReasonCode });
  if (!validation.valid) throw Object.assign(new Error('SS_FINANCE_INVALID_PAYMENT_INPUT'), { userMessage: validation.errors[0] });
  const reversing = Boolean(paymentEventId);
  try {
    const { data, error } = await supabase.rpc(`${reversing ? 'reverse' : 'record'}_clinic_${entryType}_payment`, {
      p_entry_id: entry.id, p_expected_tenant_id: tenantId, p_expected_updated_at: entry.updatedAt, p_request_id: requestId,
      ...(reversing ? { p_payment_event_id: paymentEventId, p_reversal_reason_code: reversalReasonCode } : { p_settlement_date: settlementDate, p_amount_cents: amountCents }),
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.entry_id !== entry.id || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(row.event_id || '') ||
      row.event_type !== (reversing ? 'reversed' : 'settled') || !['changed', 'idempotent'].includes(row.mutation_result) ||
      !Number.isFinite(Date.parse(row.updated_at)) || !row.balance || !['quantified', 'legacy_full'].includes(row.balance.quality) ||
      !Number.isSafeInteger(row.balance.remaining_amount_cents) || row.balance.remaining_amount_cents < 0 || row.balance.remaining_amount_cents > entry.amountCents ||
      !['open', 'scheduled', 'overdue', 'paid', 'draft', 'canceled'].includes(row.entry_status) || (!reversing && row.amount_cents !== amountCents) ||
      (reversing && row.reverses_event_id !== paymentEventId)) throw Error('SS_FINANCE_INVALID_RECEIPT');
    return { eventId: row.event_id, entryId: row.entry_id, eventType: row.event_type, entryStatus: row.entry_status,
      amountCents: row.amount_cents, updatedAt: row.updated_at, settlementDate: row.settlement_date, mutationResult: row.mutation_result, balance: row.balance };
  } catch (error) {
    const message = clinicFinancePaymentErrorMessage(error);
    throw Object.assign(new Error(message), { userMessage: message });
  }
};

const settleEntry = async ({ tenantId, canManage, entryType, entry, requestId, settlementDate, amountCents }) => {
  if (amountCents !== undefined) return paymentMutation({ tenantId, canManage, entryType, entry, requestId, settlementDate, amountCents });
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinanceSettlementInput({ entry, requestId, settlementDate });
  if (!validation.valid) {
    const error = new Error(validation.errors.join(' '));
    error.code = '22023';
    error.userMessage = validation.errors[0];
    throw error;
  }
  const value = validation.value;
  return unwrapSettlementMutation(await supabase.rpc(clinicFinanceSettlementRpcNames[entryType].settle, {
    p_entry_id: value.entryId,
    p_expected_updated_at: value.expectedUpdatedAt,
    p_request_id: value.requestId,
    p_settlement_date: value.settlementDate,
  }));
};

const reverseSettlement = async ({ tenantId, canManage, entryType, entry, requestId, reversalReasonCode, paymentEventId }) => {
  if (paymentEventId) return paymentMutation({ tenantId, canManage, entryType, entry, requestId, reversalReasonCode, paymentEventId });
  requireManage({ tenantId, canManage });
  const validation = validateClinicFinanceSettlementReversalInput({ entry, requestId, reversalReasonCode });
  if (!validation.valid) {
    const error = new Error(validation.errors.join(' '));
    error.code = '22023';
    error.userMessage = validation.errors[0];
    throw error;
  }
  const value = validation.value;
  return unwrapSettlementMutation(await supabase.rpc(clinicFinanceSettlementRpcNames[entryType].reverse, {
    p_entry_id: value.entryId,
    p_expected_updated_at: value.expectedUpdatedAt,
    p_request_id: value.requestId,
    p_reversal_reason_code: value.reversalReasonCode,
  }));
};

const fetchRows = async (tenantId) => {
  requireTenant(tenantId);
  const { data, error } = await supabase.rpc('get_clinic_finance_balances', { p_tenant_id: tenantId });
  if (error) throw Object.assign(new Error('Leitura financeira indisponível.'), { code: error.code });
  if (!data?.snapshot_complete || !Array.isArray(data.receivableRows) || !Array.isArray(data.payableRows) || !Array.isArray(data.settlementRows)
    || [...data.receivableRows, ...data.payableRows].some(row => !row.payment_balance || !['quantified', 'legacy_full', 'legacy_untracked', 'inconsistent'].includes(row.payment_balance.quality))) {
    throw new Error('Leitura financeira indisponível.');
  }
  return data;
};

export const fetchClinicFinanceReadModelByTenant = async (tenantId) => {
  if (!isSupabaseConfigured || !supabase) return getMockClinicFinanceReadModelByTenant(tenantId);
  return buildClinicFinanceReadModel(tenantId, { ...await fetchRows(tenantId), source: 'supabase' });
};

export const fetchClinicReceivablesByTenant = async (tenantId) => {
  if (!isSupabaseConfigured || !supabase) return getMockClinicReceivablesByTenant(tenantId);
  const { receivableRows, settlementRows } = await fetchRows(tenantId);
  return buildClinicFinanceReadModel(tenantId, {
    receivableRows,
    settlementRows,
    source: 'supabase',
  }).receivables;
};

export const fetchClinicPayablesByTenant = async (tenantId) => {
  if (!isSupabaseConfigured || !supabase) return getMockClinicPayablesByTenant(tenantId);
  const { payableRows, settlementRows } = await fetchRows(tenantId);
  return buildClinicFinanceReadModel(tenantId, {
    payableRows,
    settlementRows,
    source: 'supabase',
  }).payables;
};

export const createClinicReceivableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return createMockClinicReceivableByTenant(input);
  return createEntry({ ...input, entryType: 'receivable' });
};

export const createClinicPayableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return createMockClinicPayableByTenant(input);
  return createEntry({ ...input, entryType: 'payable' });
};

export const updateClinicReceivableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return updateMockClinicReceivableByTenant(input);
  return updateEntry({ ...input, entryType: 'receivable' });
};

export const updateClinicPayableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return updateMockClinicPayableByTenant(input);
  return updateEntry({ ...input, entryType: 'payable' });
};

export const cancelClinicReceivableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return cancelMockClinicReceivableByTenant(input);
  return cancelEntry({ ...input, entryType: 'receivable' });
};

export const cancelClinicPayableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return cancelMockClinicPayableByTenant(input);
  return cancelEntry({ ...input, entryType: 'payable' });
};

export const settleClinicReceivableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return settleMockClinicReceivableByTenant(input);
  return settleEntry({ ...input, entryType: 'receivable' });
};

export const settleClinicPayableByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return settleMockClinicPayableByTenant(input);
  return settleEntry({ ...input, entryType: 'payable' });
};

export const reverseClinicReceivableSettlementByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return reverseMockClinicReceivableSettlementByTenant(input);
  return reverseSettlement({ ...input, entryType: 'receivable' });
};

export const reverseClinicPayableSettlementByTenant = async (input) => {
  if (!isSupabaseConfigured || !supabase) return reverseMockClinicPayableSettlementByTenant(input);
  return reverseSettlement({ ...input, entryType: 'payable' });
};
