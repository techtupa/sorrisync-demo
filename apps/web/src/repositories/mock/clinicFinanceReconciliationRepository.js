import { getClinicFinanceReadModelByTenant, getMockClinicFinanceSettlementEvents } from './clinicFinanceRepository.js';
import { compareReconciliation, validateReconciliationDraft } from '../clinicFinanceReconciliationContract.js';

const states = new Map();
const state = tenant => { if (!states.has(tenant)) states.set(tenant, []); return states.get(tenant); };
const fail = code => { throw Error('SS_RECON_' + code); };
const base = (tenant, entry) => getClinicFinanceReadModelByTenant(tenant)[entry.type === 'receivable' ? 'receivables' : 'payables'].find(e => e.id === entry.id);
const heads = rows => rows.filter(e => !rows.some(next => next.previous_event_id === e.id));
const effective = (e, rows, payments) => rows.some(n => n.previous_event_id === e.id) ? 'superseded' : e.action === 'undone' ? 'undone'
  : e.paymentIds.some(id => payments.some(r => r.reverses_event_id === id)) ? 'invalidated' : e.amount_matches && e.date_matches ? 'matched' : 'divergent';
const project = (e, rows, payments) => {
  const selected = e.paymentIds.map(id => payment(payments.find(p => p.id === id), rows, payments));
  const sum = selected.length ? selected.reduce((n, p) => n + p.amount_cents, 0) : null;
  return { ...e, selected_amount_cents: sum, difference_amount_cents: sum == null ? null : sum - e.reference_amount_cents, state: effective(e, rows, payments), payments: selected };
};
const payment = (p, rows, payments) => ({ ...p, active: p.event_type === 'settled' && !payments.some(r => r.reverses_event_id === p.id),
  claimed_by: heads(rows).find(e => ['matched', 'divergent'].includes(effective(e, rows, payments)) && e.paymentIds.includes(p.id))?.conference_id || null });
const version = (entry, rows) => { let h = 2166136261; for (const c of entry.updatedAt + ':' + rows.length) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return (h >>> 0).toString(16).padStart(8, '0').repeat(4); };
export const fetchMockClinicReconciliationDetail = ({ tenantId, entry, cursor, canManage }) => {
  const current = base(tenantId, entry); if (!current) fail('PERMISSION_DENIED');
  const all = state(tenantId), rows = all.filter(e => e.entry_id === entry.id && e.entry_type === entry.type);
  const payments = getMockClinicFinanceSettlementEvents(tenantId), own = payments.filter(p => p.entry_type === entry.type && (p.receivable_id || p.payable_id) === entry.id);
  const v = version(current, rows); if (cursor && cursor.version !== v) fail('STALE_STATE');
  const po = cursor?.payments || 0, ho = cursor?.history || 0;
  return { snapshot_complete: true, version: v, entry: current, source: 'mock', can_manage: Boolean(canManage), payment_count: own.length, history_count: rows.length,
    payments_offset: po, history_offset: ho, payments: own.slice(po, po + 50).map(p => payment(p, all, payments)),
    conferences: [...rows].reverse().slice(ho, ho + 50).map(e => project(e, all, payments)) };
};
export const mutateMockClinicReconciliation = ({ tenantId, entry, action, requestId, head, draft, canManage }) => {
  if (!canManage || entry.tenantId !== tenantId) fail('PERMISSION_DENIED');
  const all = state(tenantId), payments = getMockClinicFinanceSettlementEvents(tenantId), current = base(tenantId, entry);
  if (!current) fail('PERMISSION_DENIED');
  const kind = { register: 'registered', correct: 'corrected', undo: 'undone' }[action];
  const intent = JSON.stringify([action, entry.id, entry.type, head?.id || null, action === 'undo' ? null : draft]);
  const existing = all.find(e => e.requestId === requestId);
  if (existing) { if (existing.intent !== intent) fail('REQUEST_CONFLICT'); return { event: project(existing, all, payments), current: project(heads(all).find(e => e.conference_id === existing.conference_id), all, payments), mutation_result: 'idempotent' }; }
  if (current.updatedAt !== entry.updatedAt || (head && (!all.some(e => e.id === head.id && e.entry_id === entry.id && e.entry_type === entry.type) || !heads(all).some(e => e.id === head.id) || head.action === 'undone'))) fail('STALE_STATE');
  if (!kind || (action === 'register' && head) || (action !== 'register' && !head)) fail('INVALID_INPUT');
  const cid = head?.conference_id || crypto.randomUUID(), owned = payments.filter(p => p.entry_type === entry.type && (p.receivable_id || p.payable_id) === entry.id).map(p => payment(p, all, payments));
  if (action !== 'undo') {
    const validation = validateReconciliationDraft(draft, owned, head?.conference_id); if (!validation.valid || !['open', 'scheduled', 'overdue', 'paid'].includes(current.status) || current.balanceQuality === 'inconsistent') fail('INELIGIBLE');
    draft = validation.value;
    if (heads(all).some(e => e.conference_id !== cid && e.entry_type === entry.type && e.reference_code === draft.referenceCode && ['matched', 'divergent'].includes(effective(e, all, payments)))) fail('REFERENCE_IN_USE');
  }
  const result = action === 'undo' ? { amountMatches: head.amount_matches, dateMatches: head.date_matches } : compareReconciliation(owned.filter(p => draft.paymentIds.includes(p.id)), draft.referenceDate, draft.referenceAmountCents);
  const e = { id: action === 'register' ? cid : crypto.randomUUID(), conference_id: cid, previous_event_id: head?.id || null, entry_id: entry.id, entry_type: entry.type, action: kind,
    reference_code: action === 'undo' ? head.reference_code : draft.referenceCode, reference_date: action === 'undo' ? head.reference_date : draft.referenceDate,
    reference_amount_cents: action === 'undo' ? head.reference_amount_cents : draft.referenceAmountCents, amount_matches: result.amountMatches, date_matches: result.dateMatches,
    created_at: new Date().toISOString(), paymentIds: action === 'undo' ? [] : draft.paymentIds, requestId, intent };
  all.push(e); return { event: project(e, all, payments), current: project(e, all, payments), mutation_result: 'changed' };
};
export const resetMockClinicReconciliation = () => states.clear();
