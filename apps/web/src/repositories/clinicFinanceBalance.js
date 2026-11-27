// Espelho puro para demo/testes. Supabase entrega projeção autorizada do servidor.
export const deriveClinicFinanceBalance = (row, type, rows = []) => {
  const related = rows.filter(event => event.entry_type === type && (type === 'receivable' ? event.receivable_id : event.payable_id) === row.id);
  const reversed = new Set(related.filter(event => event.event_type === 'reversed').map(event => event.reverses_event_id));
  const active = related.filter(event => event.event_type === 'settled' && !reversed.has(event.id));
  const legacy = active.filter(event => event.amount_cents == null).length;
  const sum = active.reduce((total, event) => total + (event.amount_cents || 0), 0);
  const eligible = (type === 'receivable' ? ['open', 'overdue'] : ['scheduled', 'overdue']).includes(row.status);
  let quality = 'inconsistent', paid = null, remaining = null;
  if (row.currency === 'BRL' && Number.isSafeInteger(row.amount_cents) && row.amount_cents > 0 && row.amount_cents <= 999999999 && Number.isSafeInteger(sum)) {
    if (legacy === 1 && active.length === 1 && row.status === 'paid') { quality = 'legacy_full'; remaining = 0; }
    else if (!active.length) {
      if (row.status === 'paid') { quality = 'legacy_untracked'; remaining = 0; }
      else if (['draft', 'open', 'scheduled', 'overdue', 'canceled'].includes(row.status)) { quality = 'quantified'; paid = 0; remaining = row.status === 'canceled' ? 0 : row.amount_cents; }
    } else if (!legacy && active.every(event => Number.isSafeInteger(event.amount_cents) && event.amount_cents > 0) && sum <= row.amount_cents && ((sum === row.amount_cents && row.status === 'paid') || (sum < row.amount_cents && eligible))) {
      quality = 'quantified'; paid = sum; remaining = row.amount_cents - sum;
    }
  }
  return { quality, paid_amount_cents: paid, remaining_amount_cents: remaining, active_count: active.length,
    is_partial: paid > 0 && remaining > 0, can_record: quality === 'quantified' && remaining > 0 && eligible,
    can_reverse: ['quantified', 'legacy_full'].includes(quality) && active.length > 0,
    settled_date: remaining === 0 ? active.map(event => event.settlement_date).filter(Boolean).sort().at(-1) || null : null };
};
