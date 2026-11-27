export const TREATMENT_QUOTE_STATUSES = Object.freeze(['issued', 'accepted', 'declined', 'cancelled']);
export const TREATMENT_QUOTE_STATUS_LABELS = Object.freeze({
  issued: 'Emitido',
  accepted: 'Aceito',
  declined: 'Recusado',
  cancelled: 'Cancelado',
});

export const TREATMENT_QUOTE_ACCEPTANCE_CHANNELS = Object.freeze(['in_person', 'phone', 'external_message']);
export const TREATMENT_QUOTE_ACCEPTANCE_CHANNEL_LABELS = Object.freeze({
  in_person: 'Presencialmente',
  phone: 'Telefone',
  external_message: 'Mensagem externa',
});

export const TREATMENT_QUOTE_DECLINE_REASONS = Object.freeze([
  'financial_reason', 'timing', 'not_interested', 'wants_revision', 'decided_elsewhere',
]);
export const TREATMENT_QUOTE_DECLINE_REASON_LABELS = Object.freeze({
  financial_reason: 'Motivo financeiro',
  timing: 'Momento inadequado',
  not_interested: 'Não tem interesse',
  wants_revision: 'Deseja revisar o orçamento',
  decided_elsewhere: 'Optou por outro local',
});

export const TREATMENT_QUOTE_CANCELLATION_REASONS = Object.freeze([
  'registration_error', 'pricing_correction', 'treatment_plan_changed', 'patient_requested_revision',
]);
export const TREATMENT_QUOTE_CANCELLATION_REASON_LABELS = Object.freeze({
  registration_error: 'Erro de registro',
  pricing_correction: 'Correção de valores',
  treatment_plan_changed: 'Plano de tratamento alterado',
  patient_requested_revision: 'Paciente solicitou revisão',
});

export const TREATMENT_QUOTE_SHARE_STATUSES = Object.freeze(['active', 'expired', 'revoked', 'consumed', 'none']);
export const TREATMENT_QUOTE_SHARE_STATUS_LABELS = Object.freeze({
  active: 'Link ativo',
  expired: 'Link expirado',
  revoked: 'Link revogado',
  consumed: 'Link consumido',
  none: 'Sem link',
});
export const TREATMENT_QUOTE_PUBLIC_ACKNOWLEDGEMENT_VERSION = 'treatment_quote_public_decision_v1';

const integerCents = (value) => Number.isSafeInteger(Number(value))
  && Number(value) >= 0
  && Number(value) <= 999999999;

export const formatTreatmentQuoteMoney = (value) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
}).format(Number(value || 0) / 100);

export const parseTreatmentQuoteMoney = (value) => {
  const text = String(value ?? '').trim();
  const grouped = /^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text);
  const normalized = (grouped ? text.replace(/\./g, '') : text).replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number(normalized) * 100);
  return integerCents(cents) ? cents : null;
};

export const validateTreatmentQuoteIssue = ({ treatmentPlanId, validUntil = null, items = [] } = {}) => {
  if (!treatmentPlanId || !Array.isArray(items) || items.length < 1 || items.length > 100) {
    return { valid: false, message: 'Selecione ao menos um item planejado para o orçamento.' };
  }
  const itemIds = new Set();
  for (const item of items) {
    if (!item?.treatmentPlanItemId || !integerCents(item.unitPriceCents) || itemIds.has(item.treatmentPlanItemId)) {
      return { valid: false, message: 'Revise os itens selecionados e informe valores válidos em reais.' };
    }
    itemIds.add(item.treatmentPlanItemId);
  }
  if (validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) {
    return { valid: false, message: 'Informe uma data de validade válida.' };
  }
  return { valid: true, message: '' };
};

export const validateTreatmentQuoteDecision = ({ quoteId, code, operation } = {}) => {
  const allowed = operation === 'accept'
    ? TREATMENT_QUOTE_ACCEPTANCE_CHANNELS
    : operation === 'decline'
      ? TREATMENT_QUOTE_DECLINE_REASONS
      : operation === 'cancel'
        ? TREATMENT_QUOTE_CANCELLATION_REASONS
        : [];
  if (!quoteId || !allowed.includes(String(code || ''))) {
    return { valid: false, message: 'Selecione uma opção válida antes de confirmar.' };
  }
  return { valid: true, message: '' };
};

const normalizeQuoteItem = (row) => ({
  id: row.quote_item_id,
  treatmentPlanItemId: row.treatment_plan_item_id,
  serviceLabel: row.service_label_snapshot || 'Serviço indisponível',
  toothCode: row.tooth_code || null,
  surfaceCode: row.surface_code || null,
  unitPriceCents: Number(row.unit_price_cents),
});

export const buildTreatmentQuoteReadModel = (rows = [], candidateRows = []) => {
  const quotesById = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.quote_id) continue;
    if (!quotesById.has(row.quote_id)) {
      quotesById.set(row.quote_id, {
        id: row.quote_id,
        treatmentPlanId: row.treatment_plan_id,
        versionNumber: Number(row.version_number),
        status: row.quote_status,
        validUntil: row.valid_until || null,
        currency: row.currency || 'BRL',
        issuedAt: row.issued_at,
        issuedByDisplayName: row.issued_by_display_name || 'Profissional da clínica',
        acceptedAt: row.accepted_at || null,
        acceptedByDisplayName: row.accepted_by_display_name || null,
        acceptanceChannel: row.acceptance_channel || null,
        declinedAt: row.declined_at || null,
        declinedByDisplayName: row.declined_by_display_name || null,
        declineReasonCode: row.decline_reason_code || null,
        cancelledAt: row.cancelled_at || null,
        cancelledByDisplayName: row.cancelled_by_display_name || null,
        cancellationReasonCode: row.cancellation_reason_code || null,
        totalCents: Number(row.quote_total_cents),
        mutationResult: row.mutation_result || null,
        items: [],
      });
    }
    if (row.quote_item_id) quotesById.get(row.quote_id).items.push(normalizeQuoteItem(row));
  }
  const quotes = [...quotesById.values()].sort((left, right) => (
    new Date(right.issuedAt).getTime() - new Date(left.issuedAt).getTime()
    || right.versionNumber - left.versionNumber
  ));
  const candidates = (Array.isArray(candidateRows) ? candidateRows : [])
    .filter((row) => row?.treatment_plan_item_id && row?.service_label)
    .map((row) => ({
      treatmentPlanItemId: row.treatment_plan_item_id,
      serviceLabel: row.service_label,
      toothCode: row.tooth_code || null,
      surfaceCode: row.surface_code || null,
      defaultUnitPriceCents: row.default_unit_price_cents == null ? null : Number(row.default_unit_price_cents),
    }));
  return {
    quotes,
    issuedQuote: quotes.find((quote) => quote.status === 'issued') || null,
    acceptedQuote: quotes.find((quote) => quote.status === 'accepted') || null,
    candidates,
  };
};

export const buildTreatmentQuoteShareReadModel = (row = null) => ({
  status: row?.effective_status || 'none',
  storedStatus: row?.stored_status || null,
  expiresAt: row?.expires_at || null,
  createdAt: row?.created_at || null,
  revokedAt: row?.revoked_at || null,
  consumedAt: row?.consumed_at || null,
  decisionCode: row?.decision_code || null,
  quoteDecisionSource: row?.quote_decision_source || null,
  mutationResult: row?.mutation_result || null,
  oneTimeToken: row?.one_time_token || null,
});

export const buildTreatmentQuoteShareUrl = (token, origin = globalThis?.location?.origin || '') => {
  const normalizedToken = String(token || '').trim();
  if (!/^ssq_[a-f0-9]{64}$/.test(normalizedToken)) return '';
  return `${String(origin || '').replace(/\/$/, '')}/orcamento-publico#token=${normalizedToken}`;
};

export const buildPublicTreatmentQuoteReadModel = (payload = {}) => {
  if (!payload?.valid) return {
    valid: false,
    status: payload?.effective_status === 'already_decided' ? 'already_decided' : 'unavailable',
    quote: null,
  };
  const items = (Array.isArray(payload.items) ? payload.items : [])
    .filter((item) => item?.service_label_snapshot && integerCents(item?.unit_price_cents))
    .map((item) => ({
      serviceLabel: String(item.service_label_snapshot).slice(0, 160),
      toothCode: item.tooth_code || null,
      surfaceCode: item.surface_code || null,
      unitPriceCents: Number(item.unit_price_cents),
    }));
  return {
    valid: true,
    status: 'active',
    quote: {
      clinicPublicName: String(payload.clinic_public_name || 'Clínica SorriSync').slice(0, 120),
      versionNumber: Number(payload.quote_version),
      issuedAt: payload.issued_at || null,
      validUntil: payload.valid_until || null,
      currency: payload.currency === 'BRL' ? 'BRL' : 'BRL',
      items,
      totalCents: integerCents(payload.total_cents) ? Number(payload.total_cents) : items.reduce((total, item) => total + item.unitPriceCents, 0),
      disclaimerVersion: payload.disclaimer_version || TREATMENT_QUOTE_PUBLIC_ACKNOWLEDGEMENT_VERSION,
    },
  };
};

export const validatePublicTreatmentQuoteDecision = ({ decisionCode, declineReasonCode = null, acknowledgement, acknowledgementVersion } = {}) => {
  const validDecision = decisionCode === 'accepted' || decisionCode === 'declined';
  const validReason = decisionCode === 'accepted'
    ? declineReasonCode == null
    : TREATMENT_QUOTE_DECLINE_REASONS.includes(declineReasonCode);
  return Boolean(validDecision
    && validReason
    && acknowledgement === true
    && acknowledgementVersion === TREATMENT_QUOTE_PUBLIC_ACKNOWLEDGEMENT_VERSION);
};

export const treatmentQuoteShareErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('SS_TREATMENT_SHARE_ALREADY_ACTIVE')) return 'Já existe um link ativo. Revogue ou reemita o link atual.';
  if (code.includes('SS_TREATMENT_SHARE_QUOTE_EXPIRED')) return 'Este orçamento venceu e não pode receber um novo link.';
  if (code.includes('SS_TREATMENT_SHARE_QUOTE_NOT_ISSUED')) return 'Somente orçamentos emitidos podem ser compartilhados.';
  if (code.includes('SS_TREATMENT_SHARE_NO_ACTIVE_LINK')) return 'Não há link ativo para revogar.';
  if (code.includes('SS_TREATMENT_SHARE_REISSUE_UNAVAILABLE')) return 'Este link não pode ser reemitido.';
  if (code.includes('SS_TREATMENT_SHARE_ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui acesso ao compartilhamento deste orçamento.';
  return 'Não foi possível concluir a operação com o link seguro agora.';
};

export const treatmentQuoteErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('SS_TREATMENT_QUOTE_ALREADY_ISSUED')) return 'Já existe um orçamento emitido para este plano. Registre uma decisão antes de criar outra versão.';
  if (code.includes('SS_TREATMENT_QUOTE_PLAN_ACCEPTED')) return 'Este plano já possui um orçamento aceito e não permite nova versão.';
  if (code.includes('SS_TREATMENT_QUOTE_EXPIRED')) return 'Este orçamento venceu e não pode ser aceito.';
  if (code.includes('SS_TREATMENT_QUOTE_ALREADY_TERMINAL')) return 'Este orçamento já possui uma decisão definitiva.';
  if (code.includes('SS_TREATMENT_QUOTE_ITEM_NOT_ELIGIBLE') || code.includes('SS_TREATMENT_QUOTE_PLAN_NOT_ACTIVE')) return 'O plano ou um dos itens mudou. Atualize a tela e revise o orçamento.';
  if (code.includes('SS_TREATMENT_QUOTE_REQUEST_ID_CONFLICT')) return 'Esta solicitação já foi usada em outra operação.';
  if (code.includes('SS_TREATMENT_QUOTE_CONCURRENT_CONFLICT') || code === '23505') return 'A operação entrou em conflito com outra atualização. Atualize e tente novamente.';
  if (code.includes('SS_TREATMENT_QUOTE_INPUT_INVALID') || code.includes('SS_TREATMENT_QUOTE_DUPLICATE_ITEM') || code === '22023') return 'Os dados do orçamento são inválidos.';
  if (code.includes('SS_TREATMENT_QUOTE_ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui acesso aos orçamentos deste plano.';
  return 'Não foi possível concluir a operação no orçamento agora.';
};
