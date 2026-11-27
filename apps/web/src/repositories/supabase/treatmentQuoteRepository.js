import { supabase } from '@/lib/supabaseClient.js';
import {
  buildPublicTreatmentQuoteReadModel,
  buildTreatmentQuoteShareReadModel,
  buildTreatmentQuoteReadModel,
  treatmentQuoteShareErrorMessage,
  treatmentQuoteErrorMessage,
  validatePublicTreatmentQuoteDecision,
  validateTreatmentQuoteDecision,
  validateTreatmentQuoteIssue,
} from '../treatmentQuoteContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requireUuid = (value, optional = false) => {
  if (optional && !value) return;
  if (!uuidPattern.test(String(value || ''))) {
    const error = new Error('SS_TREATMENT_QUOTE_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = treatmentQuoteErrorMessage(error);
    throw error;
  }
};

const unwrapRows = (response) => {
  if (response.error) {
    response.error.userMessage = treatmentQuoteErrorMessage(response.error);
    throw response.error;
  }
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchPatientTreatmentQuotes = async ({ patientId, treatmentPlanId = null, includeCandidates = false }) => {
  requireUuid(patientId);
  requireUuid(treatmentPlanId, true);
  const quoteRequest = supabase.rpc('get_patient_treatment_quotes', { p_patient_id: patientId });
  const candidateRequest = includeCandidates && treatmentPlanId
    ? supabase.rpc('get_treatment_quote_candidates', { p_treatment_plan_id: treatmentPlanId })
    : Promise.resolve({ data: [], error: null });
  const [quoteResponse, candidateResponse] = await Promise.all([quoteRequest, candidateRequest]);
  return buildTreatmentQuoteReadModel(unwrapRows(quoteResponse), unwrapRows(candidateResponse));
};

export const issueTreatmentPlanQuote = async ({ treatmentPlanId, requestId, validUntil = null, items }) => {
  requireUuid(treatmentPlanId);
  requireUuid(requestId);
  const validation = validateTreatmentQuoteIssue({ treatmentPlanId, validUntil, items });
  if (!validation.valid) {
    const error = new Error('SS_TREATMENT_QUOTE_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  const rows = unwrapRows(await supabase.rpc('issue_treatment_plan_quote', {
    p_treatment_plan_id: treatmentPlanId,
    p_request_id: requestId,
    p_valid_until: validUntil || null,
    p_items: items.map((item) => ({
      treatment_plan_item_id: item.treatmentPlanItemId,
      unit_price_cents: Number(item.unitPriceCents),
    })),
  }));
  return buildTreatmentQuoteReadModel(rows, []).quotes[0] || null;
};

const decide = async ({ operation, rpcName, quoteId, requestId, code, codeParameter }) => {
  requireUuid(quoteId);
  requireUuid(requestId);
  const validation = validateTreatmentQuoteDecision({ quoteId, code, operation });
  if (!validation.valid) {
    const error = new Error('SS_TREATMENT_QUOTE_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  const rows = unwrapRows(await supabase.rpc(rpcName, {
    p_quote_id: quoteId,
    p_request_id: requestId,
    [codeParameter]: code,
  }));
  return buildTreatmentQuoteReadModel(rows, []).quotes[0] || null;
};

export const acceptTreatmentPlanQuote = (input) => decide({
  ...input, operation: 'accept', rpcName: 'accept_treatment_plan_quote',
  code: input.acceptanceChannel, codeParameter: 'p_acceptance_channel',
});
export const declineTreatmentPlanQuote = (input) => decide({
  ...input, operation: 'decline', rpcName: 'decline_treatment_plan_quote',
  code: input.declineReasonCode, codeParameter: 'p_decline_reason_code',
});
export const cancelTreatmentPlanQuote = (input) => decide({
  ...input, operation: 'cancel', rpcName: 'cancel_treatment_plan_quote',
  code: input.cancellationReasonCode, codeParameter: 'p_cancellation_reason_code',
});

const unwrapShareRow = (response) => {
  if (response.error) {
    response.error.userMessage = treatmentQuoteShareErrorMessage(response.error);
    throw response.error;
  }
  return buildTreatmentQuoteShareReadModel(Array.isArray(response.data) ? response.data[0] : null);
};

export const fetchTreatmentQuoteShareStatus = async ({ quoteId }) => {
  requireUuid(quoteId);
  return unwrapShareRow(await supabase.rpc('get_treatment_quote_share_status', { p_quote_id: quoteId }));
};

const mutateShareLink = async ({ quoteId, requestId, rpcName }) => {
  requireUuid(quoteId);
  requireUuid(requestId);
  return unwrapShareRow(await supabase.rpc(rpcName, { p_quote_id: quoteId, p_request_id: requestId }));
};

export const createTreatmentQuoteShareLinkByQuote = (input) => mutateShareLink({
  ...input, rpcName: 'create_treatment_quote_share_link',
});
export const revokeTreatmentQuoteShareLinkByQuote = (input) => mutateShareLink({
  ...input, rpcName: 'revoke_treatment_quote_share_link',
});
export const reissueTreatmentQuoteShareLinkByQuote = (input) => mutateShareLink({
  ...input, rpcName: 'reissue_treatment_quote_share_link',
});

export const resolvePublicTreatmentQuoteByToken = async ({ token }) => {
  const { data, error } = await supabase.rpc('resolve_public_treatment_quote', { p_token: String(token || '') });
  if (error) return buildPublicTreatmentQuoteReadModel({ valid: false, effective_status: 'unavailable' });
  return buildPublicTreatmentQuoteReadModel(data || {});
};

export const decidePublicTreatmentQuoteByToken = async ({
  token, requestId, decisionCode, declineReasonCode = null, acknowledgement, acknowledgementVersion,
}) => {
  requireUuid(requestId);
  if (!validatePublicTreatmentQuoteDecision({ decisionCode, declineReasonCode, acknowledgement, acknowledgementVersion })) {
    return { valid: false, status: 'unavailable', mutationResult: null, decisionCode: null, decisionAt: null };
  }
  const { data, error } = await supabase.rpc('decide_public_treatment_quote', {
    p_token: String(token || ''),
    p_request_id: requestId,
    p_decision_code: decisionCode,
    p_decline_reason_code: declineReasonCode,
    p_acknowledgement: acknowledgement,
    p_acknowledgement_version: acknowledgementVersion,
  });
  if (error || !data?.valid) return {
    valid: false,
    status: data?.effective_status === 'already_decided' ? 'already_decided' : 'unavailable',
    mutationResult: null,
    decisionCode: null,
    decisionAt: null,
  };
  return {
    valid: true,
    status: data.effective_status || 'already_decided',
    mutationResult: data.mutation_result || null,
    decisionCode: data.decision_code || null,
    decisionAt: data.decision_at || null,
  };
};
