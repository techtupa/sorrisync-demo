import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  resolvePublicOmnichannelPilotInvite as resolveMockPublicOmnichannelPilotInvite,
  submitPublicOmnichannelPilotDiagnostic as submitMockPublicOmnichannelPilotDiagnostic,
} from '../mock/publicOmnichannelDiagnosticRepository.js';
import {
  buildOmnichannelDiagnosticPayload,
  validateOmnichannelDiagnosticForSubmit,
} from '../omnichannelDiagnosticContract.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);
const unavailableMessage = 'Formulário indisponível temporariamente.';
const publicMessages = new Set([
  unavailableMessage,
  'Tempo mínimo de preenchimento não atingido.',
  'Convite inválido ou indisponível.',
  'Este convite foi revogado.',
  'Este convite expirou.',
  'Este convite já recebeu uma resposta.',
  'Payload acima do limite permitido.',
  'Remova dados sensíveis antes de enviar.',
  'Preencha os campos obrigatórios antes de enviar.',
  'Informe um e-mail válido.',
  'Não foi possível confirmar este envio.',
]);
const safeError = error => new Error(publicMessages.has(error?.message) ? error.message : unavailableMessage);
const isUuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const mapInviteResponse = (row = null) => {
  if (!row) {
    return {
      inviteState: 'invalid',
      publicSlug: null,
      clinicName: '',
      contactName: '',
      expiresAt: null,
      hasTargetTenant: false,
      submissionsCount: 0,
      remainingSubmissions: 0,
      message: 'Convite inválido ou indisponível.',
      source: 'supabase',
    };
  }

  return {
    inviteState: row.invite_state || 'invalid',
    publicSlug: row.public_slug || null,
    clinicName: row.clinic_name || '',
    contactName: row.contact_name || '',
    expiresAt: row.expires_at || null,
    hasTargetTenant: Boolean(row.has_target_tenant),
    submissionsCount: Number(row.submissions_count || 0),
    remainingSubmissions: Number(row.remaining_submissions || 0),
    message: row.message || 'Convite inválido ou indisponível.',
    source: 'supabase',
  };
};

const mapSubmissionResponse = (row = null) => {
  if (!isUuid(row?.submission_id) || row.status !== 'submitted' ||
      !['active', 'used'].includes(row.invite_state) || typeof row.submitted_at !== 'string' || !Number.isFinite(Date.parse(row.submitted_at))) {
    throw new Error(unavailableMessage);
  }
  return {
    submissionId: row.submission_id,
    status: row.status,
    inviteState: row.invite_state,
    submittedAt: row.submitted_at,
    source: 'supabase',
  };
};

export const resolvePublicOmnichannelPilotInvite = async (publicToken) => {
  const normalizedToken = String(publicToken || '').trim();
  if (!normalizedToken) {
    return mapInviteResponse();
  }

  if (!hasSupabase()) {
    return resolveMockPublicOmnichannelPilotInvite(normalizedToken);
  }

  try {
    const { data, error } = await supabase.rpc('resolve_omnichannel_pilot_invite', {
      public_token: normalizedToken,
    });
    if (error) throw safeError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return mapInviteResponse(row);
  } catch (error) {
    throw safeError(error);
  }
};

export const submitPublicOmnichannelPilotDiagnostic = async ({
  publicToken,
  form,
  honeypot = '',
  startedAt,
  requestId,
}) => {
  const normalizedToken = String(publicToken || '').trim();
  if (!normalizedToken) {
    throw new Error('Convite inválido ou indisponível.');
  }

  const validation = validateOmnichannelDiagnosticForSubmit(form, { requirePrivacyConfirmation: true });
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }
  if (!isUuid(requestId)) {
    throw new Error('Não foi possível preparar o envio com segurança.');
  }

  if (!hasSupabase()) {
    return submitMockPublicOmnichannelPilotDiagnostic({
      publicToken: normalizedToken,
      form,
      honeypot,
      startedAt,
    });
  }

  try {
    const { data, error } = await supabase.rpc('submit_omnichannel_pilot_diagnostic', {
      public_token: normalizedToken,
      payload: { ...buildOmnichannelDiagnosticPayload(form, { status: 'submitted' }), request_id: requestId },
      honeypot: String(honeypot || ''),
      started_at: startedAt || null,
    });
    if (error) throw safeError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return mapSubmissionResponse(row);
  } catch (error) {
    throw safeError(error);
  }
};
