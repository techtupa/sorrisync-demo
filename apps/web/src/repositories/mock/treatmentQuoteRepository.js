import { getServicesByTenant } from '../../data/mockServices.js';
import {
  buildTreatmentQuoteShareReadModel,
  buildTreatmentQuoteReadModel,
  validateTreatmentQuoteDecision,
  validateTreatmentQuoteIssue,
} from '../treatmentQuoteContract.js';

const quotesByPatient = new Map();
const operationRequests = new Map();
const shareLinksByQuote = new Map();
const now = () => new Date().toISOString();
const scopeKey = (tenantId, patientId) => `${tenantId}:${patientId}`;
const requestKey = (tenantId, operation, requestId) => `${tenantId}:${operation}:${requestId}`;

const generateShareToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `ssq_${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};
const hashShareToken = async (token) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
const effectiveShareStatus = (link) => !link
  ? 'none'
  : link.status === 'active' && new Date(link.expiresAt).getTime() <= Date.now()
    ? 'expired'
    : link.status;
const shareRow = (link, mutationResult = null, oneTimeToken = null) => link ? ({
  stored_status: link.status,
  effective_status: effectiveShareStatus(link),
  expires_at: link.expiresAt,
  created_at: link.createdAt,
  revoked_at: link.revokedAt,
  consumed_at: link.consumedAt,
  decision_code: link.decisionCode,
  quote_decision_source: link.quoteDecisionSource,
  mutation_result: mutationResult,
  one_time_token: oneTimeToken,
}) : null;
const latestShareLink = (quoteId) => (shareLinksByQuote.get(quoteId) || [])[0] || null;
const findQuote = (tenantId, quoteId) => [...quotesByPatient.entries()]
  .filter(([scope]) => scope.startsWith(`${tenantId}:`))
  .flatMap(([, quotes]) => quotes)
  .find((entry) => entry.id === quoteId);

export const getMockAcceptedTreatmentQuoteItem = ({ tenantId, treatmentPlanId, treatmentPlanItemId }) => {
  const quote = [...quotesByPatient.entries()]
    .filter(([scope]) => scope.startsWith(`${tenantId}:`))
    .flatMap(([, quotes]) => quotes)
    .find((entry) => entry.treatmentPlanId === treatmentPlanId && entry.status === 'accepted');
  const item = quote?.items.find((entry) => entry.treatmentPlanItemId === treatmentPlanItemId);
  return quote && item ? { quote, item } : null;
};
const invalidateMockShareLink = (quoteId) => {
  const link = latestShareLink(quoteId);
  if (link?.status === 'active') {
    link.status = 'revoked';
    link.revokedAt = now();
  }
};

const fail = (code, userMessage) => {
  const error = new Error(code);
  error.code = code;
  error.userMessage = userMessage;
  throw error;
};

const rowsFor = (quotes) => quotes.flatMap((quote) => quote.items.map((item) => ({
  quote_id: quote.id,
  treatment_plan_id: quote.treatmentPlanId,
  version_number: quote.versionNumber,
  quote_status: quote.status,
  valid_until: quote.validUntil,
  currency: 'BRL',
  issued_at: quote.issuedAt,
  issued_by_display_name: quote.issuedByDisplayName,
  accepted_at: quote.acceptedAt,
  accepted_by_display_name: quote.acceptedByDisplayName,
  acceptance_channel: quote.acceptanceChannel,
  declined_at: quote.declinedAt,
  declined_by_display_name: quote.declinedByDisplayName,
  decline_reason_code: quote.declineReasonCode,
  cancelled_at: quote.cancelledAt,
  cancelled_by_display_name: quote.cancelledByDisplayName,
  cancellation_reason_code: quote.cancellationReasonCode,
  quote_total_cents: quote.items.reduce((total, entry) => total + entry.unitPriceCents, 0),
  quote_item_id: item.id,
  treatment_plan_item_id: item.treatmentPlanItemId,
  service_label_snapshot: item.serviceLabel,
  tooth_code: item.toothCode,
  surface_code: item.surfaceCode,
  unit_price_cents: item.unitPriceCents,
  mutation_result: quote.mutationResult || null,
})));

const candidateRows = (tenantId, activePlan) => {
  const services = getServicesByTenant(tenantId);
  return (activePlan?.items || [])
    .filter((item) => item.status === 'planned')
    .map((item) => {
      const service = services.find((entry) => entry.id === item.serviceId);
      const canSuggest = service?.priceType === 'Valor fixo'
        && service?.useInBudget === true
        && Number.isFinite(Number(service?.priceVisual));
      return {
        treatment_plan_item_id: item.id,
        service_label: item.serviceName,
        tooth_code: item.toothCode,
        surface_code: item.surfaceCode,
        default_unit_price_cents: canSuggest ? Math.round(Number(service.priceVisual) * 100) : null,
      };
    });
};

export const getMockPatientTreatmentQuotes = async ({
  tenantId, patientId, activePlan = null, canRead = true, includeCandidates = false,
}) => {
  if (!canRead) fail('SS_TREATMENT_QUOTE_ACCESS_DENIED', 'Seu perfil não possui acesso aos orçamentos deste plano.');
  return buildTreatmentQuoteReadModel(
    rowsFor(quotesByPatient.get(scopeKey(tenantId, patientId)) || []),
    includeCandidates ? candidateRows(tenantId, activePlan) : [],
  );
};

export const issueMockTreatmentPlanQuote = async ({
  tenantId, patientId, activePlan, treatmentPlanId, requestId, validUntil = null, items, canManage = true,
}) => {
  if (!canManage) fail('SS_TREATMENT_QUOTE_ACCESS_DENIED', 'Seu perfil não possui acesso aos orçamentos deste plano.');
  const validation = validateTreatmentQuoteIssue({ treatmentPlanId, validUntil, items });
  if (!validation.valid) fail('SS_TREATMENT_QUOTE_INPUT_INVALID', validation.message);
  if (!activePlan || activePlan.id !== treatmentPlanId || activePlan.status !== 'active') {
    fail('SS_TREATMENT_QUOTE_PLAN_NOT_ACTIVE', 'O plano mudou. Atualize a tela e revise o orçamento.');
  }

  const key = scopeKey(tenantId, patientId);
  const quotes = quotesByPatient.get(key) || [];
  const normalizedPayload = JSON.stringify({
    treatmentPlanId, validUntil: validUntil || null,
    items: items.map((item) => [item.treatmentPlanItemId, Number(item.unitPriceCents)]).sort(),
  });
  const replayKey = requestKey(tenantId, 'issue', requestId);
  const replay = operationRequests.get(replayKey);
  if (replay) {
    if (replay.payload !== normalizedPayload) fail('SS_TREATMENT_QUOTE_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
    const quote = quotes.find((entry) => entry.id === replay.quoteId);
    quote.mutationResult = 'idempotent';
    return buildTreatmentQuoteReadModel(rowsFor([quote]), []).quotes[0];
  }
  if (quotes.some((quote) => quote.treatmentPlanId === treatmentPlanId && quote.status === 'accepted')) {
    fail('SS_TREATMENT_QUOTE_PLAN_ACCEPTED', 'Este plano já possui um orçamento aceito.');
  }
  if (quotes.some((quote) => quote.treatmentPlanId === treatmentPlanId && quote.status === 'issued')) {
    fail('SS_TREATMENT_QUOTE_ALREADY_ISSUED', 'Já existe um orçamento emitido para este plano.');
  }

  const plannedItems = new Map(activePlan.items.filter((item) => item.status === 'planned').map((item) => [item.id, item]));
  const snapshotItems = items.map((item) => {
    const planItem = plannedItems.get(item.treatmentPlanItemId);
    if (!planItem) fail('SS_TREATMENT_QUOTE_ITEM_NOT_ELIGIBLE', 'Um item do plano não está mais elegível.');
    return {
      id: crypto.randomUUID(), treatmentPlanItemId: planItem.id, serviceLabel: planItem.serviceName,
      toothCode: planItem.toothCode || null, surfaceCode: planItem.surfaceCode || null,
      unitPriceCents: Number(item.unitPriceCents),
    };
  });
  const quote = {
    id: crypto.randomUUID(), treatmentPlanId,
    versionNumber: Math.max(0, ...quotes.filter((entry) => entry.treatmentPlanId === treatmentPlanId).map((entry) => entry.versionNumber)) + 1,
    status: 'issued', validUntil: validUntil || null, issuedAt: now(), issuedByDisplayName: 'Dentista demo',
    acceptedAt: null, acceptedByDisplayName: null, acceptanceChannel: null,
    declinedAt: null, declinedByDisplayName: null, declineReasonCode: null,
    cancelledAt: null, cancelledByDisplayName: null, cancellationReasonCode: null,
    mutationResult: 'changed', items: snapshotItems,
  };
  quotes.unshift(quote);
  quotesByPatient.set(key, quotes);
  operationRequests.set(replayKey, { quoteId: quote.id, payload: normalizedPayload });
  return buildTreatmentQuoteReadModel(rowsFor([quote]), []).quotes[0];
};

const decideMock = ({ tenantId, quoteId, requestId, operation, code, canManage }) => {
  if (!canManage) fail('SS_TREATMENT_QUOTE_ACCESS_DENIED', 'Seu perfil não possui acesso aos orçamentos deste plano.');
  const validation = validateTreatmentQuoteDecision({ quoteId, code, operation });
  if (!validation.valid) fail('SS_TREATMENT_QUOTE_INPUT_INVALID', validation.message);
  const quote = [...quotesByPatient.entries()]
    .filter(([scope]) => scope.startsWith(`${tenantId}:`))
    .flatMap(([, quotes]) => quotes)
    .find((entry) => entry.id === quoteId);
  if (!quote) fail('SS_TREATMENT_QUOTE_ACCESS_DENIED', 'Seu perfil não possui acesso aos orçamentos deste plano.');
  const replayKey = requestKey(tenantId, operation, requestId);
  const replay = operationRequests.get(replayKey);
  const nextStatus = operation === 'accept' ? 'accepted' : operation === 'decline' ? 'declined' : 'cancelled';
  if (replay) {
    if (replay.quoteId !== quoteId || replay.code !== code || quote.status !== nextStatus) {
      fail('SS_TREATMENT_QUOTE_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
    }
    quote.mutationResult = 'idempotent';
    return buildTreatmentQuoteReadModel(rowsFor([quote]), []).quotes[0];
  }
  if (quote.status !== 'issued') fail('SS_TREATMENT_QUOTE_ALREADY_TERMINAL', 'Este orçamento já possui uma decisão definitiva.');
  if (operation === 'accept' && quote.validUntil && quote.validUntil < new Date().toISOString().slice(0, 10)) {
    fail('SS_TREATMENT_QUOTE_EXPIRED', 'Este orçamento venceu e não pode ser aceito.');
  }
  quote.status = nextStatus;
  quote.mutationResult = 'changed';
  if (operation === 'accept') {
    quote.acceptedAt = now(); quote.acceptedByDisplayName = 'Dentista demo'; quote.acceptanceChannel = code;
  } else if (operation === 'decline') {
    quote.declinedAt = now(); quote.declinedByDisplayName = 'Dentista demo'; quote.declineReasonCode = code;
  } else {
    quote.cancelledAt = now(); quote.cancelledByDisplayName = 'Dentista demo'; quote.cancellationReasonCode = code;
  }
  invalidateMockShareLink(quoteId);
  operationRequests.set(replayKey, { quoteId, code });
  return buildTreatmentQuoteReadModel(rowsFor([quote]), []).quotes[0];
};

export const acceptMockTreatmentPlanQuote = (input) => decideMock({ ...input, operation: 'accept', code: input.acceptanceChannel });
export const declineMockTreatmentPlanQuote = (input) => decideMock({ ...input, operation: 'decline', code: input.declineReasonCode });
export const cancelMockTreatmentPlanQuote = (input) => decideMock({ ...input, operation: 'cancel', code: input.cancellationReasonCode });

export const getMockTreatmentQuoteShareStatusByQuote = async ({ tenantId, quoteId, canRead = true }) => {
  if (!canRead || !findQuote(tenantId, quoteId)) fail('SS_TREATMENT_SHARE_ACCESS_DENIED', 'Seu perfil não possui acesso ao compartilhamento deste orçamento.');
  return buildTreatmentQuoteShareReadModel(shareRow(latestShareLink(quoteId)));
};

export const createMockTreatmentQuoteShareLinkByQuote = async ({ tenantId, quoteId, requestId, canManage = true }) => {
  if (!canManage) fail('SS_TREATMENT_SHARE_ACCESS_DENIED', 'Seu perfil não possui acesso ao compartilhamento deste orçamento.');
  const quote = findQuote(tenantId, quoteId);
  if (!quote || quote.status !== 'issued') fail('SS_TREATMENT_SHARE_QUOTE_NOT_ISSUED', 'Somente orçamentos emitidos podem ser compartilhados.');
  if (quote.validUntil && quote.validUntil < new Date().toISOString().slice(0, 10)) fail('SS_TREATMENT_SHARE_QUOTE_EXPIRED', 'Este orçamento venceu.');
  const replayKey = requestKey(tenantId, 'share-create', requestId);
  const replay = operationRequests.get(replayKey);
  if (replay) return buildTreatmentQuoteShareReadModel(shareRow(replay.link, 'idempotent', null));
  if (latestShareLink(quoteId)?.status === 'active') fail('SS_TREATMENT_SHARE_ALREADY_ACTIVE', 'Já existe um link ativo.');
  const token = generateShareToken();
  const createdAt = now();
  const maximumExpiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const quoteExpiration = quote.validUntil ? new Date(`${quote.validUntil}T23:59:59-03:00`).getTime() : maximumExpiration;
  const link = {
    id: crypto.randomUUID(), tenantId, quoteId, tokenHash: await hashShareToken(token),
    status: 'active', expiresAt: new Date(Math.min(maximumExpiration, quoteExpiration)).toISOString(),
    createdAt, revokedAt: null, consumedAt: null, decisionCode: null, quoteDecisionSource: null,
    reissuedFromId: null,
  };
  shareLinksByQuote.set(quoteId, [link, ...(shareLinksByQuote.get(quoteId) || [])]);
  operationRequests.set(replayKey, { link });
  return buildTreatmentQuoteShareReadModel(shareRow(link, 'changed', token));
};

export const revokeMockTreatmentQuoteShareLinkByQuote = async ({ tenantId, quoteId, requestId, canManage = true }) => {
  if (!canManage) fail('SS_TREATMENT_SHARE_ACCESS_DENIED', 'Seu perfil não possui acesso ao compartilhamento deste orçamento.');
  const replayKey = requestKey(tenantId, 'share-revoke', requestId);
  const replay = operationRequests.get(replayKey);
  if (replay) return buildTreatmentQuoteShareReadModel(shareRow(replay.link, 'idempotent', null));
  const link = latestShareLink(quoteId);
  if (!link || link.status !== 'active') fail('SS_TREATMENT_SHARE_NO_ACTIVE_LINK', 'Não há link ativo para revogar.');
  link.status = 'revoked'; link.revokedAt = now();
  operationRequests.set(replayKey, { link });
  return buildTreatmentQuoteShareReadModel(shareRow(link, 'changed', null));
};

export const reissueMockTreatmentQuoteShareLinkByQuote = async ({ tenantId, quoteId, requestId, canManage = true }) => {
  if (!canManage) fail('SS_TREATMENT_SHARE_ACCESS_DENIED', 'Seu perfil não possui acesso ao compartilhamento deste orçamento.');
  const quote = findQuote(tenantId, quoteId);
  if (!quote || quote.status !== 'issued') fail('SS_TREATMENT_SHARE_QUOTE_NOT_ISSUED', 'Somente orçamentos emitidos podem ser compartilhados.');
  if (quote.validUntil && quote.validUntil < new Date().toISOString().slice(0, 10)) fail('SS_TREATMENT_SHARE_QUOTE_EXPIRED', 'Este orçamento venceu.');
  const replayKey = requestKey(tenantId, 'share-reissue', requestId);
  const replay = operationRequests.get(replayKey);
  if (replay) return buildTreatmentQuoteShareReadModel(shareRow(replay.link, 'idempotent', null));
  const previous = latestShareLink(quoteId);
  if (!previous || previous.status === 'consumed') fail('SS_TREATMENT_SHARE_REISSUE_UNAVAILABLE', 'Este link não pode ser reemitido.');
  if (previous.status === 'active') { previous.status = 'revoked'; previous.revokedAt = now(); }
  const token = generateShareToken();
  const createdAt = now();
  const maximumExpiration = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const quoteExpiration = quote.validUntil ? new Date(`${quote.validUntil}T23:59:59-03:00`).getTime() : maximumExpiration;
  const link = {
    id: crypto.randomUUID(), tenantId, quoteId, tokenHash: await hashShareToken(token),
    status: 'active', expiresAt: new Date(Math.min(maximumExpiration, quoteExpiration)).toISOString(),
    createdAt, revokedAt: null, consumedAt: null, decisionCode: null, quoteDecisionSource: null,
    reissuedFromId: previous.id,
  };
  shareLinksByQuote.set(quoteId, [link, ...(shareLinksByQuote.get(quoteId) || [])]);
  operationRequests.set(replayKey, { link });
  return buildTreatmentQuoteShareReadModel(shareRow(link, 'changed', token));
};

export const resetMockTreatmentQuotes = () => {
  quotesByPatient.clear();
  operationRequests.clear();
  shareLinksByQuote.clear();
};
