export const CLINIC_RECEIVABLE_STATUSES = Object.freeze(['draft', 'open', 'paid', 'overdue', 'canceled']);
export const CLINIC_PAYABLE_STATUSES = Object.freeze(['draft', 'scheduled', 'paid', 'overdue', 'canceled']);
import { deriveClinicFinanceBalance } from './clinicFinanceBalance.js';

export const CLINIC_FINANCE_STATUS_LABELS = Object.freeze({
  draft: 'Rascunho',
  open: 'Em aberto',
  scheduled: 'Agendado',
  paid: 'Pago',
  overdue: 'Vencido',
  canceled: 'Cancelado',
  unknown: 'Status não reconhecido',
});

const SENSITIVE_TEXT_PATTERN = /https?:\/\/|patient|paciente|cpf|cnpj|rg|e-?mail|telefone|whatsapp|phone|banco|bank|cart[aã]o|card|pix|boleto|gateway|stripe|fiscal|nfse|nota|invoice|storage|arquivo|documento|prontuario|prontu[aá]rio|payload|credencial|credential|token|secret|senha|password/i;

const cleanText = (value, maxLength = 120) => (
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : ''
);

const normalizePtBrDemoText = (value) => value
  .replace(/\bRecebivel\b/g, 'Recebível')
  .replace(/\bOperacao\b/g, 'Operação')
  .replace(/\bsintetico\b/g, 'sintético')
  .replace(/\bservico\b/g, 'serviço')
  .replace(/\bvinculo\b/g, 'vínculo')
  .replace(/\bidentificavel\b/g, 'identificável');

const sanitizeLabel = (value, fallback) => {
  const cleaned = normalizePtBrDemoText(cleanText(value, 80));
  return cleaned && !SENSITIVE_TEXT_PATTERN.test(cleaned) ? cleaned : fallback;
};

const sanitizeDescription = (value) => {
  const cleaned = normalizePtBrDemoText(cleanText(value, 240));
  return cleaned && !SENSITIVE_TEXT_PATTERN.test(cleaned) ? cleaned : null;
};

const normalizeDate = (value) => {
  const cleaned = cleanText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(cleaned) ? cleaned : null;
};

const normalizeTimestamp = (value) => {
  const parsed = Date.parse(value);
  // O token de concorrência do PostgreSQL tem microssegundos; Date perde essa precisão.
  return Number.isFinite(parsed) ? (typeof value === 'string' ? value : new Date(parsed).toISOString()) : null;
};

const normalizeAmountCents = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

export const mapClinicFinanceSettlementEvent = (row = {}) => ({
  id: cleanText(row.id, 80),
  entryType: cleanText(row.entry_type, 20),
  receivableId: cleanText(row.receivable_id, 80) || null,
  payableId: cleanText(row.payable_id, 80) || null,
  eventType: ['settled', 'reversed'].includes(cleanText(row.event_type, 20)) ? cleanText(row.event_type, 20) : 'unknown',
  settlementDate: normalizeDate(row.settlement_date),
  reversesEventId: cleanText(row.reverses_event_id, 80) || null,
  previousStatus: cleanText(row.previous_status, 20),
  nextStatus: cleanText(row.next_status, 20),
  reversalReasonCode: cleanText(row.reversal_reason_code, 50) || null,
  createdAt: normalizeTimestamp(row.created_at),
  amountCents: row.amount_cents == null ? null : (Number.isSafeInteger(row.amount_cents) && row.amount_cents > 0 ? row.amount_cents : null),
});

export const todayInSaoPaulo = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(value);

const addDays = (dateKey, days) => {
  const value = new Date(`${dateKey}T12:00:00-03:00`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export const mapClinicFinanceEntry = (row = {}, type = 'receivable', source = 'supabase', today = todayInSaoPaulo(), settlementRows = []) => {
  const allowedStatuses = type === 'payable' ? CLINIC_PAYABLE_STATUSES : CLINIC_RECEIVABLE_STATUSES;
  const rawStatus = cleanText(row.status, 40).toLowerCase();
  const status = allowedStatuses.includes(rawStatus) ? rawStatus : 'unknown';
  const dueDate = normalizeDate(row.due_date);
  const isOpen = type === 'payable'
    ? ['draft', 'scheduled', 'overdue'].includes(status)
    : ['draft', 'open', 'overdue'].includes(status);
  const isOverdue = isOpen && Boolean(dueDate && dueDate < today);
  const effectiveStatus = isOverdue ? 'overdue' : status;
  const amountCents = normalizeAmountCents(row.amount_cents);
  const settlementHistory = settlementRows
    .map(mapClinicFinanceSettlementEvent)
    .filter((event) => event.entryType === type && (type === 'receivable' ? event.receivableId : event.payableId) === cleanText(row.id, 80))
    .sort((first, second) => String(first.createdAt).localeCompare(String(second.createdAt)) || first.id.localeCompare(second.id));
  const reversedIds = new Set(settlementHistory.filter((event) => event.eventType === 'reversed').map((event) => event.reversesEventId));
  const activeSettlement = [...settlementHistory].reverse().find((event) => event.eventType === 'settled' && !reversedIds.has(event.id)) || null;
  const paymentBalance = row.payment_balance || deriveClinicFinanceBalance({ ...row, amount_cents: amountCents }, type, settlementRows);
  const hasBalance = paymentBalance.quality !== 'inconsistent' && Number.isSafeInteger(paymentBalance.remaining_amount_cents);
  const canSettle = type === 'receivable'
    ? ['open', 'overdue'].includes(status)
    : ['scheduled', 'overdue'].includes(status);

  return {
    id: cleanText(row.id, 80),
    type,
    status,
    effectiveStatus,
    statusLabel: CLINIC_FINANCE_STATUS_LABELS[effectiveStatus] || CLINIC_FINANCE_STATUS_LABELS.unknown,
    statusKnown: status !== 'unknown',
    amountCents,
    remainingAmountCents: hasBalance ? paymentBalance.remaining_amount_cents : null,
    paidAmountCents: paymentBalance.paid_amount_cents,
    balanceQuality: paymentBalance.quality,
    isPartial: Boolean(paymentBalance.is_partial),
    hasActivePayments: Number(paymentBalance.active_count) > 0,
    canRecordPayment: Boolean(hasBalance && paymentBalance.can_record),
    canReversePayment: Boolean(hasBalance && paymentBalance.can_reverse),
    paymentSettledDate: paymentBalance.settled_date || null,
    activePaymentEvents: settlementHistory.filter(event => event.eventType === 'settled' && !reversedIds.has(event.id)),
    amount: amountCents / 100,
    currency: row.currency === 'BRL' ? 'BRL' : 'BRL',
    dueDate,
    competenceMonth: normalizeDate(row.competence_month),
    categoryLabel: sanitizeLabel(row.category_label, 'Categoria operacional'),
    counterpartyLabel: sanitizeLabel(row.counterparty_label, 'Contraparte operacional'),
    description: sanitizeDescription(row.description),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    settlementDate: activeSettlement?.settlementDate || null,
    settlementEventId: activeSettlement?.id || null,
    settlementHistory,
    canSettle: canSettle && row.currency === 'BRL',
    canReverse: status === 'paid' && Boolean(activeSettlement),
    isOverdue,
    isOpen,
    source,
    readOnly: true,
  };
};

const sumCents = (entries) => {
  let sum = 0;
  for (const entry of entries) {
    const value = Object.hasOwn(entry, 'remainingAmountCents') ? entry.remainingAmountCents : entry.amountCents;
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(sum + value)) return null;
    sum += value;
  }
  return sum;
};

export const buildClinicFinanceSummary = ({ receivables = [], payables = [], today = todayInSaoPaulo() } = {}) => {
  const upcomingLimit = addDays(today, 30);
  const receivablesOpen = receivables.filter((entry) => entry.isOpen);
  const payablesOpen = payables.filter((entry) => entry.isOpen);
  const receivablesOverdue = receivables.filter((entry) => entry.isOverdue);
  const payablesOverdue = payables.filter((entry) => entry.isOverdue);
  const upcomingReceivables = receivablesOpen.filter((entry) => !entry.isOverdue && entry.dueDate >= today && entry.dueDate <= upcomingLimit);
  const upcomingPayables = payablesOpen.filter((entry) => !entry.isOverdue && entry.dueDate >= today && entry.dueDate <= upcomingLimit);

  return {
    receivableOpenCents: sumCents(receivablesOpen),
    payableOpenCents: sumCents(payablesOpen),
    receivableOverdueCents: sumCents(receivablesOverdue),
    payableOverdueCents: sumCents(payablesOverdue),
    upcomingReceivableCents: sumCents(upcomingReceivables),
    upcomingPayableCents: sumCents(upcomingPayables),
    operationalBalanceCents: sumCents(receivablesOpen) == null || sumCents(payablesOpen) == null ? null : sumCents(receivablesOpen) - sumCents(payablesOpen),
    receivablesCount: receivables.length,
    payablesCount: payables.length,
    receivablesOverdueCount: receivablesOverdue.length,
    payablesOverdueCount: payablesOverdue.length,
    statusCounts: [...receivables, ...payables].reduce((counts, entry) => {
      counts[entry.effectiveStatus] = (counts[entry.effectiveStatus] || 0) + 1;
      return counts;
    }, {}),
  };
};

const sortEntries = (entries) => [...entries].sort((first, second) => (
  String(first.dueDate || '').localeCompare(String(second.dueDate || ''))
  || String(first.categoryLabel || '').localeCompare(String(second.categoryLabel || ''), 'pt-BR')
  || String(first.id || '').localeCompare(String(second.id || ''))
));

export const createEmptyClinicFinanceReadModel = (tenantId = null, source = 'unavailable') => ({
  tenantId,
  source,
  receivables: [],
  payables: [],
  settlementEvents: [],
  summary: buildClinicFinanceSummary(),
  readOnly: true,
  writesEnabled: false,
  exportEnabled: false,
  masterBillingScope: false,
});

export const buildClinicFinanceReadModel = (tenantId, {
  receivableRows = [],
  payableRows = [],
  settlementRows = [],
  source = 'supabase',
  today = todayInSaoPaulo(),
} = {}) => {
  const receivables = sortEntries(receivableRows.map((row) => ({ ...mapClinicFinanceEntry(row, 'receivable', source, today, settlementRows), tenantId })));
  const payables = sortEntries(payableRows.map((row) => ({ ...mapClinicFinanceEntry(row, 'payable', source, today, settlementRows), tenantId })));

  return {
    ...createEmptyClinicFinanceReadModel(tenantId, source),
    receivables,
    payables,
    settlementEvents: settlementRows.map(mapClinicFinanceSettlementEvent),
    summary: buildClinicFinanceSummary({ receivables, payables, today }),
  };
};

export const filterClinicFinanceEntries = (entries = [], {
  search = '',
  status = 'all',
  duePeriod = 'all',
  today = todayInSaoPaulo(),
} = {}) => {
  const query = cleanText(search, 80).toLocaleLowerCase('pt-BR');
  const upcomingLimit = addDays(today, 30);

  return entries.filter((entry) => {
    const matchesSearch = !query || [entry.categoryLabel, entry.counterpartyLabel, entry.description]
      .filter(Boolean)
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(query));
    const matchesStatus = status === 'all'
      || (status === 'open' ? entry.isOpen && !entry.isOverdue : entry.effectiveStatus === status);
    const matchesPeriod = duePeriod === 'all'
      || (duePeriod === 'overdue' && entry.isOverdue)
      || (duePeriod === 'next30' && !entry.isOverdue && entry.dueDate >= today && entry.dueDate <= upcomingLimit)
      || (duePeriod === 'future' && entry.dueDate > upcomingLimit);
    return matchesSearch && matchesStatus && matchesPeriod;
  });
};

export const loadClinicFinanceReadModel = async ({
  tenantId,
  canRead,
  isSupabaseMode,
  fetchSupabase,
  fetchMock,
}) => {
  if (!tenantId || !canRead) {
    return { data: createEmptyClinicFinanceReadModel(tenantId), error: null, permissionDenied: !canRead };
  }

  if (!isSupabaseMode) {
    return { data: await fetchMock(tenantId), error: null, permissionDenied: false };
  }

  try {
    return { data: await fetchSupabase(tenantId), error: null, permissionDenied: false };
  } catch (error) {
    const code = String(error?.code || error?.status || 'READ_ERROR');
    const permissionDenied = code === '42501' || code === '401' || code === '403';
    return {
      data: createEmptyClinicFinanceReadModel(tenantId),
      error: permissionDenied ? 'A leitura financeira não foi autorizada para este perfil.' : 'Não foi possível ler o Financeiro da Clínica no Supabase.',
      permissionDenied,
    };
  }
};
