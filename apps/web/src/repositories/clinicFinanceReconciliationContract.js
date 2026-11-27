const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const assertReconciliationMutationContext = ({ tenantId, entry, canManage, requestId, action, head, isSupabaseMode }) => {
  if (!canManage || !tenantId || (isSupabaseMode && !uuid(tenantId)) || entry?.tenantId !== tenantId) throw Error('SS_RECON_PERMISSION_DENIED');
  if (!entry.id || (isSupabaseMode && !uuid(entry.id)) || !['receivable', 'payable'].includes(entry.type) || !entry.updatedAt || !uuid(requestId)
    || !['register', 'correct', 'undo'].includes(action) || (action === 'register' ? head : !uuid(head?.id))) throw Error('SS_RECON_INVALID_INPUT');
};
export const normalizeReconciliationReference = value => String(value ?? '').trim().toUpperCase();
export const validReconciliationReference = value => /^[A-Z][A-Z0-9._/-]{2,39}$/.test(value) && !/[0-9]{11}/.test(value);
export const reconciliationToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
export const parseReconciliationAmount = value => {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) return null;
  const [integer, fraction = ''] = text.replaceAll('.', '').split(',');
  const amount = Number(integer) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 999999999 ? amount : null;
};
export const compareReconciliation = (payments, date, amount) => {
  if (!payments?.length || payments.some(p => !Number.isSafeInteger(p.amount_cents) || p.amount_cents <= 0) || !Number.isSafeInteger(amount)) return null;
  const sum = payments.reduce((n, p) => n + p.amount_cents, 0);
  if (!Number.isSafeInteger(sum)) return null;
  const amountMatches = sum === amount, dateMatches = payments.every(p => p.settlement_date === date);
  return { sum, difference: sum - amount, amountMatches, dateMatches, state: amountMatches && dateMatches ? 'matched' : 'divergent' };
};
export const validateReconciliationDraft = ({ referenceCode, referenceDate, referenceAmountCents, paymentIds }, payments, conferenceId = null) => {
  const code = normalizeReconciliationReference(referenceCode), errors = [];
  if (!validReconciliationReference(code)) errors.push('Use um código operacional de 3 a 40 caracteres, sem dados pessoais ou bancários.');
  const date = typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate) ? new Date(`${referenceDate}T12:00:00Z`) : null;
  if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== referenceDate || referenceDate > reconciliationToday()) errors.push('Informe uma data válida e não futura.');
  if (!Number.isSafeInteger(referenceAmountCents) || referenceAmountCents < 0 || referenceAmountCents > 999999999) errors.push('Informe um valor válido de zero até o limite operacional.');
  if (!Array.isArray(paymentIds) || paymentIds.length < 1 || paymentIds.length > 50 || new Set(paymentIds).size !== paymentIds.length || paymentIds.some(id => !uuid(id))) errors.push('Selecione de 1 a 50 registros diferentes.');
  else if (paymentIds.some(id => !payments.some(p => p.id === id && p.active && Number.isSafeInteger(p.amount_cents) && p.amount_cents > 0 && (!p.claimed_by || p.claimed_by === conferenceId)))) errors.push('Atualize o histórico e selecione somente registros ativos disponíveis.');
  return { valid: errors.length === 0, errors, value: { referenceCode: code, referenceDate, referenceAmountCents, paymentIds: [...(paymentIds || [])].sort() } };
};
export const reconciliationStates = { matched: 'Conciliada', divergent: 'Divergente', invalidated: 'Invalidada por estorno', undone: 'Desfeita', superseded: 'Versão anterior' };
export const validateReconciliationReceipt = (receipt, entry) => {
  const valid = event => event && uuid(event.id) && uuid(event.conference_id) && event.entry_id === entry.id && event.entry_type === entry.type
    && ['registered', 'corrected', 'undone'].includes(event.action) && Object.hasOwn(reconciliationStates, event.state)
    && typeof event.amount_matches === 'boolean' && typeof event.date_matches === 'boolean' && validReconciliationReference(event.reference_code)
    && Number.isSafeInteger(event.reference_amount_cents) && event.reference_amount_cents >= 0 && event.reference_amount_cents <= 999999999
    && /^\d{4}-\d{2}-\d{2}$/.test(event.reference_date) && Number.isFinite(Date.parse(event.created_at))
    && Array.isArray(event.payments) && event.payments.length <= 50 && (event.action === 'undone' ? event.payments.length === 0 : event.payments.length > 0)
    && event.payments.every(p => uuid(p.id) && p.event_type === 'settled' && Number.isSafeInteger(p.amount_cents) && p.amount_cents > 0 && typeof p.active === 'boolean')
    && (event.state !== 'matched' || (event.amount_matches && event.date_matches));
  if (!receipt || !['changed', 'idempotent'].includes(receipt.mutation_result) || !valid(receipt.event) || !valid(receipt.current)
    || receipt.event.conference_id !== receipt.current.conference_id) throw Error('SS_RECON_INVALID_RECEIPT');
  return receipt;
};
export const reconciliationErrorMessage = error => {
  const code = [error?.message, error?.code].filter(Boolean).join(' ');
  if (/PERMISSION|TENANT_CONTEXT/.test(code)) return 'A clínica ou sua permissão não permite esta conferência.';
  if (/STALE_STATE|PT409|40001/.test(code)) return 'O lançamento ou a conferência mudou. Atualize o histórico antes de tentar novamente.';
  if (/REFERENCE_IN_USE/.test(code)) return 'Esta referência já está em uma conferência vigente da clínica nesta direção.';
  if (/PAYMENT_IN_USE/.test(code)) return 'Um registro selecionado já pertence a outra conferência vigente.';
  if (/REQUEST_CONFLICT/.test(code)) return 'Esta tentativa já foi usada com dados diferentes. Confira o histórico.';
  if (/INELIGIBLE/.test(code)) return 'A seleção não está mais disponível. Confira os registros ativos e os estornos.';
  if (/INVALID_RECEIPT/.test(code)) return 'Não foi possível confirmar a conferência. Confira o histórico antes de iniciar outra tentativa.';
  if (/INVALID_INPUT|22023/.test(code)) return 'Revise a referência, a data, o valor e os registros selecionados.';
  return 'Conferências temporariamente indisponíveis. Nenhuma alteração foi presumida.';
};
