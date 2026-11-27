export const CLINIC_FINANCE_CANCELLATION_REASONS = Object.freeze([
  'duplicate_entry',
  'incorrect_amount',
  'incorrect_due_date',
  'no_longer_applicable',
  'registration_error',
]);

export const CLINIC_FINANCE_CANCELLATION_REASON_LABELS = Object.freeze({
  duplicate_entry: 'Lançamento duplicado',
  incorrect_amount: 'Valor incorreto',
  incorrect_due_date: 'Vencimento incorreto',
  no_longer_applicable: 'Lançamento não é mais aplicável',
  registration_error: 'Erro de cadastro',
});

export const CLINIC_FINANCE_INITIAL_STATUSES = Object.freeze({
  receivable: Object.freeze(['draft', 'open']),
  payable: Object.freeze(['draft', 'scheduled']),
});

export const CLINIC_FINANCE_MUTABLE_STATUSES = Object.freeze({
  receivable: Object.freeze(['draft', 'open', 'overdue']),
  payable: Object.freeze(['draft', 'scheduled', 'overdue']),
});

const SENSITIVE_CONTENT_PATTERN = /(https?:\/\/|patient|paciente|cpf|cnpj|\brg\b|e-?mail|telefone|whatsapp|phone|banco|bank|cart[aã]o|card|pix|boleto|gateway|stripe|fiscal|nfse|nota fiscal|invoice|storage|arquivo|documento|prontuario|prontu[aá]rio)/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}-01$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clean = (value) => String(value ?? '').trim();
const isExactDate = (dateKey) => {
  if (!DATE_PATTERN.test(dateKey)) return false;
  const value = new Date(`${dateKey}T12:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === dateKey;
};

export const createClinicFinanceRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  throw new Error('Não foi possível gerar a chave segura desta operação.');
};

export const normalizeClinicFinanceMutationDraft = (draft = {}) => ({
  description: clean(draft.description),
  categoryLabel: clean(draft.categoryLabel),
  counterpartyLabel: clean(draft.counterpartyLabel),
  amountCents: Number.isSafeInteger(Number(draft.amountCents)) ? Number(draft.amountCents) : 0,
  currency: clean(draft.currency || 'BRL').toUpperCase(),
  dueDate: clean(draft.dueDate),
  competenceMonth: clean(draft.competenceMonth),
  status: clean(draft.status).toLowerCase(),
  requestId: clean(draft.requestId),
  expectedUpdatedAt: clean(draft.expectedUpdatedAt),
});

export const validateClinicFinanceMutationDraft = (entryType, draft, { mode = 'create' } = {}) => {
  const normalized = normalizeClinicFinanceMutationDraft(draft);
  const errors = [];

  if (!['receivable', 'payable'].includes(entryType)) errors.push('Tipo de lançamento inválido.');
  if (normalized.description.length < 2 || normalized.description.length > 240) errors.push('A descrição deve ter entre 2 e 240 caracteres.');
  if (normalized.categoryLabel.length < 2 || normalized.categoryLabel.length > 80) errors.push('A categoria deve ter entre 2 e 80 caracteres.');
  if (normalized.counterpartyLabel.length < 2 || normalized.counterpartyLabel.length > 80) errors.push('A identificação operacional deve ter entre 2 e 80 caracteres.');
  if (![normalized.description, normalized.categoryLabel, normalized.counterpartyLabel].every((value) => !SENSITIVE_CONTENT_PATTERN.test(value))) {
    errors.push('Use somente informações operacionais, sem dados pessoais, bancários, fiscais ou documentais.');
  }
  if (!Number.isSafeInteger(normalized.amountCents) || normalized.amountCents <= 0 || normalized.amountCents > 999999999) errors.push('Informe um valor positivo dentro do limite operacional.');
  if (normalized.currency !== 'BRL') errors.push('A moeda permitida nesta etapa é BRL.');
  if (!isExactDate(normalized.dueDate)) errors.push('Informe um vencimento válido.');
  if (!MONTH_PATTERN.test(normalized.competenceMonth) || !isExactDate(normalized.competenceMonth)) errors.push('Informe uma competência mensal válida.');

  if (mode === 'create') {
    if (!UUID_PATTERN.test(normalized.requestId)) errors.push('A chave UUID da operação é obrigatória.');
    if (!CLINIC_FINANCE_INITIAL_STATUSES[entryType]?.includes(normalized.status)) errors.push('Status inicial não permitido.');
  } else if (!normalized.expectedUpdatedAt || Number.isNaN(Date.parse(normalized.expectedUpdatedAt))) {
    errors.push('Atualize a tela antes de editar este lançamento.');
  }

  return { valid: errors.length === 0, errors, value: normalized };
};

export const isClinicFinanceEntryMutable = (entry) => Boolean(
  entry
  && !entry.hasActivePayments
  && entry.balanceQuality !== 'inconsistent'
  && CLINIC_FINANCE_MUTABLE_STATUSES[entry.type]?.includes(entry.status),
);

export const isClinicFinanceCancellationReason = (reasonCode) => (
  CLINIC_FINANCE_CANCELLATION_REASONS.includes(clean(reasonCode).toLowerCase())
);

export const clinicFinanceMutationErrorMessage = (error) => {
  const message = String(error?.message || error?.code || '');
  if (/STALE_STATE|40001/.test(message)) return 'Este lançamento foi alterado em outra sessão. Atualize a tela e tente novamente.';
  if (/PERMISSION_DENIED|42501/.test(message)) return 'Seu perfil não possui permissão para esta operação.';
  if (/IMMUTABLE|55000/.test(message)) return 'Este lançamento não pode mais ser alterado.';
  if (/REQUEST_ID_CONFLICT|23505/.test(message)) return 'A chave desta operação já foi usada com dados diferentes.';
  if (/INVALID|22023/.test(message)) return 'Revise os campos operacionais informados.';
  if (/NOT_FOUND|P0002/.test(message)) return 'O lançamento não foi encontrado neste tenant.';
  return 'Não foi possível concluir a operação financeira. Nenhuma alteração foi presumida.';
};
