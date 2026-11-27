import { supabase } from '@/lib/supabaseClient.js';
import { mapClinicFinanceEntry } from '../clinicFinanceReadModel.js';
import { validateReconciliationReceipt } from '../clinicFinanceReconciliationContract.js';

export const fetchClinicFinanceReconciliationDetail = async ({ tenantId, entry, cursor = null }) => {
  const { data, error } = await supabase.rpc('get_clinic_finance_reconciliation_detail', { p_expected_tenant_id: tenantId, p_entry_type: entry.type, p_entry_id: entry.id, p_cursor: cursor });
  if (error) throw Object.assign(Error(error.message || 'SS_RECON_UNAVAILABLE'), { code: error.code });
  if (!data?.snapshot_complete || !/^[a-f0-9]{32}$/.test(data.version) || data.entry?.id !== entry.id || !data.entry.payment_balance
    || !Array.isArray(data.payments) || !Array.isArray(data.conferences) || typeof data.can_manage !== 'boolean') throw Error('SS_RECON_INVALID_RECEIPT');
  const rows = data.payments.map(p => ({ ...p, entry_type: entry.type, [entry.type + '_id']: entry.id }));
  return { ...data, entry: { ...mapClinicFinanceEntry(data.entry, entry.type, 'supabase', undefined, rows), tenantId }, source: 'supabase' };
};
export const mutateClinicFinanceReconciliation = async ({ tenantId, entry, action, requestId, head, draft }) => {
  if (!['register', 'correct', 'undo'].includes(action) || (action === 'register' ? head : !head)) throw Error('SS_RECON_INVALID_INPUT');
  const args = { p_entry_type: entry.type, p_entry_id: entry.id, p_expected_tenant_id: tenantId, p_expected_updated_at: entry.updatedAt, p_request_id: requestId };
  if (head) args.p_expected_head_id = head.id;
  if (action !== 'undo') Object.assign(args, { p_reference_code: draft.referenceCode, p_reference_date: draft.referenceDate, p_reference_amount_cents: draft.referenceAmountCents, p_payment_event_ids: draft.paymentIds });
  const { data, error } = await supabase.rpc(({ register: 'register_clinic_finance_reconciliation', correct: 'correct_clinic_finance_reconciliation', undo: 'undo_clinic_finance_reconciliation' })[action], args);
  if (error) throw Object.assign(Error(error.message || 'SS_RECON_UNAVAILABLE'), { code: error.code });
  return validateReconciliationReceipt(data, entry);
};
