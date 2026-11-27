import { mockMasterTenants } from '@/data/mockMasterControl.js';

const DEMO_CREATED_AT = '2026-06-16T12:00:00.000Z';

const buildTenantOptions = () => mockMasterTenants.map((tenant) => ({
  id: tenant.id,
  name: tenant.name,
  plan: tenant.plan_name,
  slug: tenant.id,
  status: tenant.status,
}));

const mockInvites = [
  {
    id: 'mock-r6-invite-Avery Chen',
    publicSlug: 'clinica-demo-Avery Chen-r6',
    clinicName: 'Clínica Demo Avery Chen',
    contactName: 'Avery Chen Demo',
    contactEmail: 'Avery Chen.demo@example.invalid',
    contactPhone: '+55 11 90000-0000',
    targetTenantId: 'tenant_aurora',
    targetTenantSlug: 'tenant_aurora',
    targetTenantName: 'Dr. Avery Chen',
    status: 'active',
    expiresAt: '2026-09-01T12:00:00.000Z',
    maxSubmissions: 1,
    submissionsCount: 1,
    createdAt: DEMO_CREATED_AT,
    updatedAt: DEMO_CREATED_AT,
    emailDeliveryStatus: 'not_sent',
    emailDeliveryLastSentAt: null,
    emailDeliveryCount: 0,
    hasRecoverableLink: false,
    source: 'Fallback demo',
  },
];

const mockSubmissionsByInviteId = {
  'mock-r6-invite-Avery Chen': [
    {
      submissionNumber: 1,
      source: 'public_token',
      status: 'submitted',
      submittedAt: '2026-06-16T18:10:00.000Z',
      reviewedAt: null,
      clinicName: 'Clínica Demo Avery Chen',
      responsibleName: 'Avery Chen Demo',
      responsibleRole: 'gestao_clinica',
      contactEmailMasked: 'he***@so***.local',
      contactPhoneMasked: '*******0000',
      city: 'São Paulo',
      state: 'SP',
      professionalsCount: 4,
      attendantsCount: 3,
      hasCrc: true,
      whatsappNumbersCount: 2,
      whatsappUsage: {
        purposes: ['recepcao', 'agenda', 'crc'],
        accessType: 'Número compartilhado pela equipe',
        multipleUsersSameNumber: true,
        teamOwnedNumberStatus: 'Sim',
        usesLabels: true,
        usesQuickReplies: false,
        losesConversationsWithSharedAccess: 'Ã€s vezes',
      },
      teamStructure: {
        respondersCount: 3,
        hasReceptionCrcHandoff: true,
        hasSeparatedReceptionCommercial: true,
        messageOwnershipRule: 'Gestão define responsável manualmente',
      },
      attendanceResponsibilities: {
        leads: 'Recepção',
        scheduling: 'Recepção',
        confirmations: 'Recepção',
        sensitiveIssues: 'Gestão da clínica',
        budgetFollowUp: 'CRC/comercial',
      },
      currentChannels: {
        channels: ['whatsapp', 'instagram'],
        leadSources: ['indicacao', 'instagram'],
        notes: 'Diagnóstico demo sintético.',
      },
      futureChannels: {
        channels: ['whatsapp', 'site'],
      },
      messageVolume: {
        dailyRange: '21_50',
        peakPeriods: ['manha', 'horario_almoco'],
        knowsUnansweredConversations: 'Só olhando manualmente',
      },
      operationalPains: {
        items: ['demora_na_resposta', 'sem_responsavel', 'retrabalho'],
        severity: 'Média',
      },
      desiredMetrics: {
        items: ['tempo_primeira_resposta', 'conversas_sem_responsavel'],
        primaryMetric: 'tempo_primeira_resposta',
        simplePilotStart: 'Sim, só ajudar a organizar o atendimento',
      },
      currentFlowDescription: 'A equipe responde manualmente e repassa os casos por combinação interna.',
      mainPainDescription: 'Falta clareza de responsável quando a conversa muda de pessoa.',
      pilotSuccessDescription: 'Centralizar atendimento e saber quais conversas precisam de resposta.',
      firstChannelsDescription: 'WhatsApp principal e Instagram.',
      excludedChannelsDescription: 'Números pessoais ficam fora do piloto.',
      importantRulesDescription: 'Nenhuma mensagem automática deve ser enviada nesta etapa.',
      privacyNotes: 'Confirmado no envio público.',
      mvpPriority: 'conversas_pendentes',
      successCriteria: 'equipe_organizada',
    },
  ],
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizePayload = (payload = {}) => ({
  clinicName: String(payload.clinicName || '').trim(),
  contactName: String(payload.contactName || '').trim(),
  contactEmail: String(payload.contactEmail || '').trim(),
  contactPhone: String(payload.contactPhone || '').trim(),
  targetTenantId: String(payload.targetTenantId || '').trim(),
  expiresAt: payload.expiresAt || null,
  maxSubmissions: Number(payload.maxSubmissions || 1),
});

export const listOmnichannelPilotInvitesAdmin = async () => ({
  canCreate: false,
  canRevoke: false,
  invites: clone(mockInvites),
  source: 'Fallback demo',
  tenants: buildTenantOptions(),
});

export const listOmnichannelPilotDiagnosticSubmissionsAdmin = async (inviteId) => {
  const invite = mockInvites.find((item) => item.id === inviteId);
  if (!invite) {
    throw new Error('Convite não encontrado.');
  }

  return {
    canView: false,
    invite: clone(invite),
    source: 'Fallback demo',
    submissions: clone(mockSubmissionsByInviteId[inviteId] || []),
  };
};

export const createOmnichannelPilotInviteAdmin = async (payload = {}) => {
  const normalized = normalizePayload(payload);
  if (!normalized.clinicName) {
    throw new Error('Informe o nome da clínica para criar o convite.');
  }

  const tenant = buildTenantOptions().find((item) => item.id === normalized.targetTenantId || item.slug === normalized.targetTenantId);
  const now = new Date().toISOString();
  const safeSlug = normalized.clinicName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42) || 'convite';
  const invite = {
    id: `mock-r6-invite-${Date.now()}`,
    publicSlug: `${safeSlug}-demo`,
    clinicName: normalized.clinicName,
    contactName: normalized.contactName,
    contactEmail: normalized.contactEmail,
    contactPhone: normalized.contactPhone,
    targetTenantId: tenant?.id || '',
    targetTenantSlug: tenant?.slug || '',
    targetTenantName: tenant?.name || '',
    status: 'active',
    expiresAt: normalized.expiresAt,
    maxSubmissions: Math.min(Math.max(normalized.maxSubmissions || 1, 1), 5),
    submissionsCount: 0,
    createdAt: now,
    updatedAt: now,
    emailDeliveryStatus: 'not_sent',
    emailDeliveryLastSentAt: null,
    emailDeliveryCount: 0,
    hasRecoverableLink: false,
    source: 'Fallback demo',
  };

  mockInvites.unshift(invite);

  return {
    canCreate: false,
    invite: clone(invite),
    publicUrl: '/diagnostico-omnichannel/responder/demo-convite-omnichannel-r6',
    publicUrlOnce: true,
    source: 'Fallback demo',
  };
};

export const revokeOmnichannelPilotInviteAdmin = async (inviteId) => {
  const invite = mockInvites.find((item) => item.id === inviteId);
  if (!invite) {
    throw new Error('Convite não encontrado.');
  }

  invite.status = 'revoked';
  invite.updatedAt = new Date().toISOString();

  return {
    canRevoke: false,
    invite: clone(invite),
    source: 'Fallback demo',
  };
};

export const sendOmnichannelPilotInviteEmailAdmin = async ({ inviteId, publicUrl } = {}) => {
  if (!inviteId || !publicUrl) {
    throw new Error('Convite e link público são obrigatórios para simular o envio.');
  }

  const invite = mockInvites.find((item) => item.id === inviteId);
  if (!invite) {
    throw new Error('Convite não encontrado.');
  }

  invite.emailDeliveryStatus = 'sent';
  invite.emailDeliveryLastSentAt = new Date().toISOString();
  invite.emailDeliveryCount = Number(invite.emailDeliveryCount || 0) + 1;
  invite.updatedAt = invite.emailDeliveryLastSentAt;

  return {
    emailDeliveryStatus: 'sent',
    sent: true,
    source: 'Fallback demo',
  };
};
