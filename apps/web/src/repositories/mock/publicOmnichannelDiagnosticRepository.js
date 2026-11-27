import {
  buildOmnichannelDiagnosticPayload,
} from '../omnichannelDiagnosticContract.js';

const DEMO_TOKEN = 'demo-convite-omnichannel-r6';

const createInvite = () => ({
  inviteState: 'available',
  publicSlug: 'demo-convite-r6',
  clinicName: 'Clinica convite demo',
  contactName: 'Contato responsavel demo',
  expiresAt: '2026-09-01T12:00:00.000Z',
  hasTargetTenant: true,
  submissionsCount: 0,
  remainingSubmissions: 1,
  message: 'Convite disponivel para resposta.',
  source: 'mock',
});

const inviteByToken = new Map([[DEMO_TOKEN, createInvite()]]);
const submissionsByToken = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));

export const resolvePublicOmnichannelPilotInvite = async (publicToken) => {
  const normalizedToken = String(publicToken || '').trim();
  const invite = inviteByToken.get(normalizedToken);

  if (!invite) {
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
      source: 'mock',
    };
  }

  return clone(invite);
};

export const submitPublicOmnichannelPilotDiagnostic = async ({
  publicToken,
  form,
  honeypot = '',
  startedAt,
}) => {
  const normalizedToken = String(publicToken || '').trim();
  const invite = inviteByToken.get(normalizedToken);

  if (!invite || invite.inviteState !== 'available') {
    throw new Error('Convite inválido ou indisponível.');
  }

  if (String(honeypot || '').trim()) {
    throw new Error('Formulário indisponível temporariamente.');
  }

  if (!startedAt) {
    throw new Error('Tempo mínimo de preenchimento não atingido.');
  }

  const submittedAt = new Date().toISOString();
  const payload = buildOmnichannelDiagnosticPayload(form, { status: 'submitted' });
  submissionsByToken.set(normalizedToken, {
    id: `mock-public-omnichannel-diagnostic-${Date.now()}`,
    payload,
    submittedAt,
  });

  inviteByToken.set(normalizedToken, {
    ...invite,
    inviteState: 'used',
    submissionsCount: 1,
    remainingSubmissions: 0,
    message: 'Este convite ja recebeu uma resposta.',
  });

  return {
    submissionId: submissionsByToken.get(normalizedToken).id,
    status: 'submitted',
    inviteState: 'used',
    submittedAt,
    source: 'mock',
  };
};
