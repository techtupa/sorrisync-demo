import { getDefaultClinicTenant } from './tenantRepository.js';
import {
  buildOmnichannelActivityPayload,
  getOmnichannelActivityOutcomeLabel,
  getOmnichannelActivityTypeLabel,
} from '../omnichannelActivityContract.js';
import {
  buildOmnichannelConversationTriagePatch,
  getOmnichannelConversationPriorityLabel,
  getOmnichannelConversationStatusLabel,
} from '../omnichannelTriageContract.js';
import {
  buildOmnichannelTriageResultPayload,
  normalizeOmnichannelAutoReplyAllowlistEntry,
  normalizeOmnichannelAutoReplyAttempt,
  normalizeOmnichannelTriageFlow,
  normalizeOmnichannelTriageIntent,
  normalizeOmnichannelTriageQuestion,
  normalizeOmnichannelTriageResult,
  normalizeOmnichannelTriageSetting,
} from '../omnichannelTriageBackendContract.js';

const DEFAULT_TENANT_ID = 'tenant_aurora';

const resolveTenantId = (tenantId) => {
  return tenantId || getDefaultClinicTenant()?.tenant_id || DEFAULT_TENANT_ID;
};

const now = '2026-06-11T10:05:00-03:00';
const voiceMessageType = ['au', 'dio'].join('');

const CHANNELS_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-channel-whatsapp-Avery Chen',
      tenant_id: 'tenant_aurora',
      provider: 'whatsapp_cloud',
      displayName: 'WhatsApp · simulated channel',
      status: 'not_configured',
      phoneNumberId: null,
      wabaId: null,
      providerAccountId: null,
      createdAt: '2026-06-11T08:00:00-03:00',
      updatedAt: now,
    },
  ],
};

const CONVERSATIONS_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-conversation-aurora',
      tenant_id: 'tenant_aurora',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      patientId: '84000000-0000-4000-8000-000000000001',
      leadId: null,
      contactDisplayName: 'Casey Morgan',
      contactPhoneE164: null,
      status: 'open',
      priority: 'high',
      assignedTo: null,
      assignedAt: null,
      hasUnreadInbound: true,
      unreadCount: 3,
      lastMessageAt: '2026-06-11T09:21:00-03:00',
      latestMessagePreview: 'Could I book a first consultation late this afternoon?',
      latestMessageType: 'text',
      latestMessageTypeLabel: 'Texto',
      resolvedAt: null,
      lastHandledAt: null,
      createdAt: '2026-06-11T09:18:00-03:00',
      updatedAt: '2026-06-11T09:21:00-03:00',
    },
    {
      id: 'mock-omni-conversation-bento',
      tenant_id: 'tenant_aurora',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      patientId: null,
      leadId: null,
      contactDisplayName: 'Quinn Blake',
      contactPhoneE164: null,
      status: 'waiting',
      priority: 'normal',
      assignedTo: 'mock-user',
      assignedAt: '2026-06-11T10:12:00-03:00',
      hasUnreadInbound: false,
      unreadCount: 0,
      lastMessageAt: '2026-06-11T10:07:00-03:00',
      latestMessagePreview: 'Documento recebido',
      latestMessageType: 'document',
      latestMessageTypeLabel: 'Documento',
      resolvedAt: null,
      lastHandledAt: null,
      createdAt: '2026-06-11T10:05:00-03:00',
      updatedAt: '2026-06-11T10:07:00-03:00',
    },
  ],
};

const ASSISTANT_FEEDBACK_BY_TENANT = {
  tenant_aurora: [
    {
      assistantMode: 'provider_real',
      createdAt: '2026-06-29T10:08:00-03:00',
      draftQualityStatus: 'approved_for_human_review',
      feedbackReason: null,
      feedbackValue: 'useful',
      model: 'gpt-5.4-nano',
      playbookId: 'agendar_avaliacao',
      provider: 'openai',
      source: 'Fallback demo',
      usedAsDraft: true,
    },
    {
      assistantMode: 'provider_real',
      createdAt: '2026-06-29T10:18:00-03:00',
      draftQualityStatus: 'needs_attention',
      feedbackReason: 'missing_context',
      feedbackValue: 'not_useful',
      model: 'gpt-5.4-nano',
      playbookId: 'sem_assunto_definido',
      provider: 'openai',
      source: 'Fallback demo',
      usedAsDraft: false,
    },
    {
      assistantMode: 'provider_real',
      createdAt: '2026-06-29T10:24:00-03:00',
      draftQualityStatus: 'blocked',
      feedbackReason: 'operational_risk',
      feedbackValue: 'risky',
      model: 'gpt-5.4-nano',
      playbookId: 'duvida_preco',
      provider: 'openai',
      source: 'Fallback demo',
      usedAsDraft: false,
    },
  ],
};

const MESSAGES_BY_CONVERSATION = {
  'mock-omni-conversation-aurora': [
    {
      id: 'mock-omni-message-aurora-in',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      direction: 'inbound',
      messageType: 'text',
      contentText: 'Demo message received in the local sandbox.',
      providerMessageId: null,
      providerStatus: 'received',
      sentAt: null,
      receivedAt: '2026-06-11T09:18:00-03:00',
      createdAt: '2026-06-11T09:18:00-03:00',
    },
    {
      id: 'mock-omni-message-aurora-voice',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      direction: 'inbound',
      messageType: voiceMessageType,
      contentText: '',
      mediaAttachment: {
        available: true,
        canPreview: true,
        failureLabel: null,
        isLegacy: false,
        mediaType: voiceMessageType,
        mimeType: ['au', 'dio/ogg'].join(''),
        sizeLabel: '24 KB',
        source: 'Fallback demo',
        status: 'available',
        statusLabel: 'Disponível para visualização segura',
      },
      mediaMetadata: {
        mimeType: ['au', 'dio/ogg'].join(''),
      },
      providerMessageId: null,
      providerStatus: 'received',
      sentAt: null,
      receivedAt: '2026-06-11T09:19:00-03:00',
      createdAt: '2026-06-11T09:19:00-03:00',
    },
    {
      id: 'mock-omni-message-aurora-image',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      direction: 'inbound',
      messageType: 'image',
      contentText: '',
      mediaAttachment: {
        available: true,
        canPreview: true,
        failureLabel: null,
        isLegacy: false,
        mediaType: 'image',
        mimeType: 'image/png',
        sizeLabel: '88 KB',
        source: 'Fallback demo',
        status: 'available',
        statusLabel: 'Disponível para visualização segura',
      },
      mediaMetadata: {
        caption: 'Imagem demo recebida',
        mimeType: 'image/png',
      },
      providerMessageId: null,
      providerStatus: 'received',
      sentAt: null,
      receivedAt: '2026-06-11T09:20:00-03:00',
      createdAt: '2026-06-11T09:20:00-03:00',
    },
    {
      id: 'mock-omni-message-aurora-out',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      direction: 'outbound',
      messageType: 'text',
      contentText: 'Could I book a first consultation late this afternoon?',
      providerMessageId: null,
      providerStatus: 'recorded',
      sentAt: '2026-06-11T09:21:00-03:00',
      receivedAt: null,
      createdAt: '2026-06-11T09:21:00-03:00',
    },
  ],
  'mock-omni-conversation-bento': [
    {
      id: 'mock-omni-message-bento-in',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-bento',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      direction: 'inbound',
      messageType: 'text',
      contentText: 'Novo contato demo aguardando triagem humana.',
      providerMessageId: null,
      providerStatus: 'received',
      sentAt: null,
      receivedAt: '2026-06-11T10:05:00-03:00',
      createdAt: '2026-06-11T10:05:00-03:00',
    },
    {
      id: 'mock-omni-message-bento-document',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-bento',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      direction: 'inbound',
      messageType: 'document',
      contentText: '',
      mediaAttachment: {
        available: true,
        canPreview: true,
        failureLabel: null,
        isLegacy: false,
        mediaType: 'document',
        mimeType: 'application/pdf',
        sizeLabel: '112 KB',
        source: 'Fallback demo',
        status: 'available',
        statusLabel: 'Disponível para visualização segura',
      },
      mediaMetadata: {
        mimeType: 'application/pdf',
      },
      providerMessageId: null,
      providerStatus: 'received',
      sentAt: null,
      receivedAt: '2026-06-11T10:07:00-03:00',
      createdAt: '2026-06-11T10:07:00-03:00',
    },
  ],
};

const ACTIVITIES_BY_CONVERSATION = {
  'mock-omni-conversation-aurora': [
    {
      id: 'mock-omni-activity-aurora-scheduling-handoff',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      activityType: 'scheduling_exception',
      outcome: 'scheduling_handoff',
      noteText: 'Fluxo server-side interrompido sem alteração na Agenda.',
      nextActionAt: null,
      createdBy: null,
      createdAt: '2026-06-11T09:27:00-03:00',
      updatedAt: '2026-06-11T09:27:00-03:00',
    },
    {
      id: 'mock-omni-activity-aurora-contact',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      activityType: 'contact_attempt',
      outcome: 'waiting_patient',
      noteText: 'Registro demo interno: equipe conferiu contexto e aguarda retorno.',
      nextActionAt: null,
      createdBy: 'mock-user',
      createdAt: '2026-06-11T09:25:00-03:00',
      updatedAt: '2026-06-11T09:25:00-03:00',
    },
  ],
  'mock-omni-conversation-bento': [
    {
      id: 'mock-omni-activity-bento-return',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-bento',
      activityType: 'scheduled_return',
      outcome: 'follow_up_later',
      noteText: 'Registro demo interno: retornar manualmente no próximo período operacional.',
      nextActionAt: '2026-06-12T17:00:00.000Z',
      createdBy: 'mock-user',
      createdAt: '2026-06-11T10:10:00-03:00',
      updatedAt: '2026-06-11T10:10:00-03:00',
    },
  ],
};

const INTERNAL_NOTES_BY_CONVERSATION = {
  'mock-omni-conversation-aurora': [
    {
      id: 'mock-omni-note-aurora-1',
      tenant_id: 'tenant_aurora',
      conversationId: 'mock-omni-conversation-aurora',
      body: 'Nota demo interna: confirmar contexto antes da resposta manual.',
      createdBy: 'mock-user',
      createdAt: '2026-06-11T09:26:00-03:00',
    },
  ],
};

const EVENTS_BY_CONVERSATION = {
  'mock-omni-conversation-aurora': [
    {
      id: 'mock-omni-event-aurora-sent',
      tenant_id: 'tenant_aurora',
      messageId: 'mock-omni-message-aurora-out',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      provider: 'whatsapp_cloud',
      eventType: 'sent',
      eventTypeLabel: 'Mensagem enviada',
      providerMessageId: null,
      createdAt: '2026-06-11T09:21:10-03:00',
    },
    {
      id: 'mock-omni-event-aurora-delivered',
      tenant_id: 'tenant_aurora',
      messageId: 'mock-omni-message-aurora-out',
      channelId: 'mock-omni-channel-whatsapp-Avery Chen',
      provider: 'whatsapp_cloud',
      eventType: 'delivered',
      eventTypeLabel: 'Mensagem entregue',
      providerMessageId: null,
      createdAt: '2026-06-11T09:21:20-03:00',
    },
  ],
};

const TRIAGE_SETTINGS_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-triage-setting-Avery Chen',
      tenant_id: 'tenant_aurora',
      enabled: false,
      mode: 'preview',
      auto_reply_enabled: false,
      auto_reply_mode: 'disabled',
      auto_reply_kill_switch_enabled: true,
      auto_reply_test_label: 'Teste controlado desligado',
      welcome_message: 'Oi! Vou te ajudar a direcionar seu atendimento.',
      fallback_to_human_label: 'Encaminhamento humano manual',
      updated_at: now,
    },
  ],
};

const AUTO_REPLY_ALLOWLIST_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-auto-reply-allowlist-internal',
      tenant_id: 'tenant_aurora',
      contact_mask: '***1234',
      label: 'Contato interno de teste',
      active: false,
      updated_at: now,
    },
  ],
};

const AUTO_REPLY_ATTEMPTS_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-auto-reply-attempt-blocked',
      tenant_id: 'tenant_aurora',
      conversation_id: 'mock-omni-conversation-aurora',
      reply_type: 'triage_v0_controlled_test',
      decision: 'blocked',
      block_reason: 'auto_reply_disabled',
      payload_redacted: {
        ai_controlled_reply: {
          block_reason: 'tenant_ai_not_active_controlled',
          response_source: 'server_fallback',
          source: 'r5_9_ai_reply_bridge',
        },
        prepared_reply_available: true,
        send_plan: 'dry_run_only',
        would_send: false,
      },
      created_at: now,
    },
  ],
};

const TRIAGE_FLOWS_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-triage-flow-whatsapp-only',
      tenant_id: 'tenant_aurora',
      name: 'Fluxo demo WhatsApp-only',
      status: 'draft',
      description: 'Fluxo sintético para preview de triagem assistida sem bot automático.',
      updated_at: now,
    },
  ],
};

const TRIAGE_QUESTIONS_BY_FLOW = {
  'mock-omni-triage-flow-whatsapp-only': [
    {
      id: 'mock-omni-triage-question-is-patient',
      tenant_id: 'tenant_aurora',
      flow_id: 'mock-omni-triage-flow-whatsapp-only',
      position: 1,
      key: 'is_patient',
      label: 'Você já é paciente da clínica?',
      question_type: 'single_choice',
      options: ['Sim', 'Não', 'Não sei'],
      required: false,
      active: true,
    },
    {
      id: 'mock-omni-triage-question-reason',
      tenant_id: 'tenant_aurora',
      flow_id: 'mock-omni-triage-flow-whatsapp-only',
      position: 2,
      key: 'contact_reason',
      label: 'Qual o motivo do contato?',
      question_type: 'text',
      options: [],
      required: true,
      active: true,
    },
    {
      id: 'mock-omni-triage-question-route',
      tenant_id: 'tenant_aurora',
      flow_id: 'mock-omni-triage-flow-whatsapp-only',
      position: 3,
      key: 'routing_choice',
      label: 'Você deseja agendar, remarcar, confirmar ou falar com a equipe?',
      question_type: 'single_choice',
      options: ['Agendar', 'Remarcar', 'Confirmar', 'Falar com equipe', 'Outro'],
      required: false,
      active: true,
    },
    {
      id: 'mock-omni-triage-question-period',
      tenant_id: 'tenant_aurora',
      flow_id: 'mock-omni-triage-flow-whatsapp-only',
      position: 4,
      key: 'preferred_period',
      label: 'Qual melhor período para atendimento?',
      question_type: 'text',
      options: [],
      required: false,
      active: true,
    },
    {
      id: 'mock-omni-triage-question-handoff',
      tenant_id: 'tenant_aurora',
      flow_id: 'mock-omni-triage-flow-whatsapp-only',
      position: 5,
      key: 'handoff',
      label: 'Deseja que uma pessoa da equipe continue o atendimento?',
      question_type: 'handoff',
      options: ['Sim', 'Pode ser depois'],
      required: false,
      active: true,
    },
  ],
};

const TRIAGE_INTENTS_BY_TENANT = {
  tenant_aurora: [
    ['agendar_avaliacao', 'Agendar avaliação', 'Contato quer marcar uma avaliação ou primeira consulta.', 'reception'],
    ['remarcar_consulta', 'Remarcar consulta', 'Contato quer ajustar consulta já combinada.', 'reception'],
    ['confirmar_horario', 'Confirmar horário', 'Contato confirma presença ou horário.', 'reception'],
    ['tratamento_orcamento', 'Tratamento/orçamento', 'Contato pede orientação comercial sem dado financeiro real.', 'commercial'],
    ['retorno_pos_atendimento', 'Retorno/pós-atendimento', 'Contato precisa de retorno manual da equipe.', 'post_care'],
    ['falar_com_atendente', 'Falar com atendente', 'Contato pede pessoa da equipe.', 'human_now'],
    ['outro_assunto', 'Outro assunto', 'Sem classificação segura na leitura assistida.', 'unclassified'],
  ].map(([key, label, description, suggested_queue]) => ({
    id: `mock-omni-triage-intent-${key}`,
    tenant_id: 'tenant_aurora',
    key,
    label,
    description,
    suggested_queue,
    active: true,
    updated_at: now,
  })),
};

const TRIAGE_RESULTS_BY_TENANT = {
  tenant_aurora: [
    {
      id: 'mock-omni-triage-result-aurora',
      tenant_id: 'tenant_aurora',
      conversation_id: 'mock-omni-conversation-aurora',
      flow_id: 'mock-omni-triage-flow-whatsapp-only',
      intent_key: 'falar_com_atendente',
      suggested_queue: 'human_now',
      summary: 'Resumo demo: contato precisa de atendimento humano manual. Conferir contexto antes de responder.',
      answers: {
        motivo: 'atendimento humano manual',
        proximo_passo: 'preparar resposta manual',
      },
      handoff_required: true,
      source: 'bot_preview',
      updated_at: now,
    },
  ],
};

const statusLabels = {
  active: 'Ativo',
  archived: 'Arquivado',
  closed: 'Fechado',
  error: 'Erro de configuração',
  not_configured: 'Não configurado',
  open: 'Aberto',
  paused: 'Pausado',
  resolved: 'Resolvido',
  sandbox: 'Sandbox',
  waiting: 'Aguardando',
};

const providerLabels = {
  whatsapp_cloud: 'WhatsApp Cloud API',
};

const messageTypeLabels = {
  [voiceMessageType]: 'Áudio',
  contacts: 'Contatos',
  document: 'Documento',
  image: 'Imagem',
  location: 'Localização',
  sticker: 'Sticker',
  system: 'Sistema',
  template: 'Template',
  text: 'Texto',
  unsupported: 'Não suportado',
  video: 'Vídeo',
};

const mediaMessageTypes = new Set([voiceMessageType, 'image', 'video', 'document', 'sticker']);

const MOCK_MEDIA_PAYLOADS = {
  [voiceMessageType]: {
    content: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=',
    filename: 'arquivo-recebido.ogg',
    mimeType: ['au', 'dio/ogg'].join(''),
  },
  document: {
    content: 'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAwID4+CmVuZG9iagp0cmFpbGVyCjw8IC9Sb290IDEgMCBSID4+CiUlRU9G',
    filename: 'documento-recebido.pdf',
    mimeType: 'application/pdf',
  },
  image: {
    content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAEtAJJXIDTjwAAAABJRU5ErkJggg==',
    filename: 'imagem-recebida.png',
    mimeType: 'image/png',
  },
};

const decodeMockBase64Payload = (value) => {
  if (typeof globalThis.atob === 'function') {
    return Uint8Array.from(globalThis.atob(value), (char) => char.charCodeAt(0));
  }

  if (globalThis.Buffer) {
    return Uint8Array.from(globalThis.Buffer.from(value, 'base64'));
  }

  return value;
};

const buildMessagePreview = (message) => {
  const media = message.mediaMetadata || {};

  if (message.messageType === voiceMessageType) return 'Áudio recebido';
  if (message.messageType === 'image') return media.caption || 'Imagem recebida';
  if (message.messageType === 'video') return media.caption || 'Vídeo recebido';
  if (message.messageType === 'document') return 'Documento recebido';
  if (message.messageType === 'sticker') return 'Sticker recebido';
  if (message.messageType === 'location') return 'Localização recebida sem coordenadas exibidas';
  if (message.messageType === 'contacts') return 'Contatos recebidos';
  if (message.messageType === 'unsupported') return 'Tipo de mensagem recebido sem exibição operacional';
  return message.contentText || 'Texto recebido';
};

const withChannelLabels = (channel) => ({
  ...channel,
  displayName: channel.displayName || channel.display_name || 'Canal sem nome',
  isConfigured: channel.status === 'active',
  providerLabel: providerLabels[channel.provider] || channel.provider,
  source: 'Fallback demo',
  statusLabel: statusLabels[channel.status] || channel.status,
});

const withConversationLabels = (conversation) => {
  const messages = MESSAGES_BY_CONVERSATION[conversation.id] || [];
  const latestMessage = [...messages].sort((first, second) => (
    new Date(second.createdAt || second.receivedAt || '').getTime()
    - new Date(first.createdAt || first.receivedAt || '').getTime()
  ))[0] || null;
  const lastInbound = messages
    .filter((message) => message.direction === 'inbound')
    .map((message) => message.receivedAt || message.createdAt)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    ...conversation,
    contactDisplayName: conversation.contactDisplayName || 'Contato sem nome',
    lastInboundAt: lastInbound,
    latestMessageDirection: latestMessage?.direction || null,
    latestMessagePreview: conversation.latestMessagePreview || latestMessage?.contentText || 'Sem mensagem recente.',
    latestMessageType: conversation.latestMessageType || latestMessage?.messageType || null,
    latestMessageTypeLabel: conversation.latestMessageTypeLabel || latestMessage?.messageTypeLabel || null,
    priority: conversation.priority || 'normal',
    priorityLabel: getOmnichannelConversationPriorityLabel(conversation.priority),
    assignedTo: conversation.assignedTo || null,
    assignedAt: conversation.assignedAt || null,
    assignedToLabel: conversation.assignedTo ? 'Usuário demo' : 'Sem responsável',
    hasUnreadInbound: Boolean(conversation.hasUnreadInbound),
    lastReadAt: conversation.lastReadAt || null,
    unreadCount: Number(conversation.unreadCount || 0),
    source: 'Fallback demo',
    statusLabel: getOmnichannelConversationStatusLabel(conversation.status),
  };
};

const withMessageLabels = (message) => ({
  ...message,
  directionLabel: message.direction === 'outbound' ? 'Saída registrada' : 'Entrada recebida',
  mediaAttachment: mediaMessageTypes.has(message.messageType) ? message.mediaAttachment || {
    available: false,
    canPreview: false,
    failureLabel: 'Mídia recebida antes da habilitação de visualização segura.',
    isLegacy: true,
    mediaType: message.messageType,
    mimeType: null,
    sizeLabel: 'Tamanho não informado',
    source: 'Fallback demo',
    status: 'legacy_metadata_only',
    statusLabel: 'Mídia antiga sem visualização segura',
  } : null,
  mediaMetadata: mediaMessageTypes.has(message.messageType) ? message.mediaMetadata || null : null,
  messagePreview: buildMessagePreview(message),
  messageTypeLabel: messageTypeLabels[message.messageType] || message.messageType,
  payloadSummary: {
    media: message.mediaMetadata || null,
    provider: 'whatsapp_cloud',
  },
  source: 'Fallback demo',
});

const withActivityLabels = (activity) => ({
  ...activity,
  activityTypeLabel: getOmnichannelActivityTypeLabel(activity.activityType),
  createdByLabel: activity.createdBy ? 'Usuário demo' : 'Sistema',
  outcomeLabel: getOmnichannelActivityOutcomeLabel(activity.outcome),
  source: 'Fallback demo',
});

export const getOmnichannelChannelsByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (CHANNELS_BY_TENANT[resolvedTenantId] || []).map(withChannelLabels);
};

export const getOmnichannelConversationsByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (CONVERSATIONS_BY_TENANT[resolvedTenantId] || []).map(withConversationLabels);
};

export const getOmnichannelMessagesByConversation = (tenantId, conversationId) => {
  if (!getOmnichannelConversationByTenant(tenantId, conversationId)) return [];
  return (MESSAGES_BY_CONVERSATION[conversationId] || []).map(withMessageLabels);
};

export const getOmnichannelMessageMediaAccess = (_tenantId, messageId) => {
  const message = getOmnichannelConversationsByTenant(_tenantId)
    .flatMap(conversation => MESSAGES_BY_CONVERSATION[conversation.id] || [])
    .find((item) => item.id === messageId);
  const mediaAttachment = message?.mediaAttachment || null;

  if (!message || !mediaAttachment?.available) {
    return {
      accepted: true,
      available: false,
      mediaType: mediaAttachment?.mediaType || null,
      mimeType: mediaAttachment?.mimeType || null,
      status: mediaAttachment?.status || 'unavailable',
    };
  }

  const payload = MOCK_MEDIA_PAYLOADS[mediaAttachment.mediaType] || null;

  return {
    accepted: true,
    available: true,
    blob: payload
      ? new Blob([decodeMockBase64Payload(payload.content)], { type: payload.mimeType })
      : new Blob(['Mídia demo indisponível.'], { type: mediaAttachment.mimeType || 'application/octet-stream' }),
    filename: payload?.filename || 'arquivo-recebido.bin',
    mediaType: mediaAttachment.mediaType,
    mimeType: payload?.mimeType || mediaAttachment.mimeType,
    source: 'proxy_stream',
    status: 'available',
  };
};

export const listOmnichannelConversationActivities = (tenantId, conversationId) => {
  if (!getOmnichannelConversationByTenant(tenantId, conversationId)) return [];
  return (ACTIVITIES_BY_CONVERSATION[conversationId] || [])
    .slice()
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .map(withActivityLabels);
};

export const listOmnichannelConversationEvents = (tenantId, conversationId) => {
  if (!getOmnichannelConversationByTenant(tenantId, conversationId)) return [];
  return (EVENTS_BY_CONVERSATION[conversationId] || [])
    .slice()
    .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime())
    .map((event) => ({
      ...event,
      source: 'Fallback demo',
    }));
};

export const listOmnichannelInternalNotes = (tenantId, conversationId) => {
  if (!getOmnichannelConversationByTenant(tenantId, conversationId)) return [];
  return (INTERNAL_NOTES_BY_CONVERSATION[conversationId] || [])
    .slice()
    .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime())
    .map((note) => ({
      ...note,
      createdByLabel: note.createdBy ? 'Usuário demo' : 'Sistema',
      source: 'Fallback demo',
    }));
};

export const getOmnichannelConversationByTenant = (tenantId, conversationId) => {
  return getOmnichannelConversationsByTenant(tenantId).find((conversation) => conversation.id === conversationId) || null;
};

export const updateOmnichannelConversationTriage = (tenantId, conversationId, triagePatch) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversations = CONVERSATIONS_BY_TENANT[resolvedTenantId] || [];
  const conversationIndex = conversations.findIndex((conversation) => conversation.id === conversationId);

  if (conversationIndex === -1) {
    throw new Error('Conversa não encontrada no fallback demo deste tenant.');
  }

  const patch = buildOmnichannelConversationTriagePatch(triagePatch);
  const currentConversation = conversations[conversationIndex];
  const nextHandledAt = patch.last_handled_at || new Date().toISOString();
  const hasPatientPatch = Object.prototype.hasOwnProperty.call(patch, 'patient_id');
  const hasLeadPatch = Object.prototype.hasOwnProperty.call(patch, 'lead_id');
  const hasResolvedPatch = Object.prototype.hasOwnProperty.call(patch, 'resolved_at');

  const nextConversation = {
    ...currentConversation,
    leadId: hasLeadPatch ? patch.lead_id : currentConversation.leadId,
    patientId: hasPatientPatch ? patch.patient_id : currentConversation.patientId,
    priority: patch.priority || currentConversation.priority || 'normal',
    resolvedAt: hasResolvedPatch ? patch.resolved_at : currentConversation.resolvedAt,
    status: patch.status || currentConversation.status,
    lastHandledAt: nextHandledAt,
    updatedAt: nextHandledAt,
  };

  conversations[conversationIndex] = nextConversation;

  return withConversationLabels(nextConversation);
};

const updateConversationAfterActivity = (tenantId, conversationId, activityPayload) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversations = CONVERSATIONS_BY_TENANT[resolvedTenantId] || [];
  const conversationIndex = conversations.findIndex((conversation) => conversation.id === conversationId);

  if (conversationIndex === -1) {
    throw new Error('Conversa não encontrada no fallback demo deste tenant.');
  }

  const lastHandledAt = new Date().toISOString();
  const currentConversation = conversations[conversationIndex];
  const nextConversation = {
    ...currentConversation,
    lastHandledAt,
    updatedAt: lastHandledAt,
  };

  if (activityPayload.activity_type === 'resolved' || activityPayload.outcome === 'resolved') {
    nextConversation.status = 'resolved';
    nextConversation.resolvedAt = lastHandledAt;
  } else if (activityPayload.activity_type === 'reopened') {
    nextConversation.status = 'open';
    nextConversation.resolvedAt = null;
  } else if (activityPayload.next_action_at) {
    nextConversation.status = 'waiting';
    nextConversation.resolvedAt = null;
  }

  conversations[conversationIndex] = nextConversation;
  return withConversationLabels(nextConversation);
};

export const addOmnichannelConversationActivity = (tenantId, conversationId, activityInput = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversation = getOmnichannelConversationByTenant(resolvedTenantId, conversationId);

  if (!conversation) {
    throw new Error('Conversa não encontrada no fallback demo deste tenant.');
  }

  const activityPayload = buildOmnichannelActivityPayload(activityInput);
  const timestamp = new Date().toISOString();
  const nextActivity = {
    id: `mock-omni-activity-${timestamp}`,
    tenant_id: resolvedTenantId,
    conversationId,
    activityType: activityPayload.activity_type,
    outcome: activityPayload.outcome,
    noteText: activityPayload.note_text || '',
    nextActionAt: activityPayload.next_action_at,
    createdBy: 'mock-user',
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  ACTIVITIES_BY_CONVERSATION[conversationId] = [
    nextActivity,
    ...(ACTIVITIES_BY_CONVERSATION[conversationId] || []),
  ];

  return {
    activity: withActivityLabels(nextActivity),
    conversation: updateConversationAfterActivity(resolvedTenantId, conversationId, activityPayload),
  };
};

export const scheduleOmnichannelConversationNextAction = (tenantId, conversationId, nextActionAt, noteText = '') => {
  return addOmnichannelConversationActivity(tenantId, conversationId, {
    activityType: 'scheduled_return',
    nextActionAt,
    noteText,
    outcome: 'follow_up_later',
  });
};

export const markOmnichannelConversationResolved = (tenantId, conversationId, noteText = '') => {
  return addOmnichannelConversationActivity(tenantId, conversationId, {
    activityType: 'resolved',
    noteText,
    outcome: 'resolved',
  });
};

export const reopenOmnichannelConversation = (tenantId, conversationId, noteText = '') => {
  return addOmnichannelConversationActivity(tenantId, conversationId, {
    activityType: 'reopened',
    noteText,
    outcome: 'status_open',
  });
};

export const assignOmnichannelConversationToMe = (tenantId, conversationId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversations = CONVERSATIONS_BY_TENANT[resolvedTenantId] || [];
  const conversationIndex = conversations.findIndex((conversation) => conversation.id === conversationId);

  if (conversationIndex === -1) {
    throw new Error('Conversa não encontrada no fallback demo deste tenant.');
  }

  const timestamp = new Date().toISOString();
  conversations[conversationIndex] = {
    ...conversations[conversationIndex],
    assignedAt: timestamp,
    assignedTo: 'mock-user',
    lastHandledAt: timestamp,
    updatedAt: timestamp,
  };

  return withConversationLabels(conversations[conversationIndex]);
};

export const unassignOmnichannelConversation = (tenantId, conversationId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversations = CONVERSATIONS_BY_TENANT[resolvedTenantId] || [];
  const conversationIndex = conversations.findIndex((conversation) => conversation.id === conversationId);

  if (conversationIndex === -1) {
    throw new Error('Conversa não encontrada no fallback demo deste tenant.');
  }

  const timestamp = new Date().toISOString();
  conversations[conversationIndex] = {
    ...conversations[conversationIndex],
    assignedAt: null,
    assignedTo: null,
    lastHandledAt: timestamp,
    updatedAt: timestamp,
  };

  return withConversationLabels(conversations[conversationIndex]);
};

export const markOmnichannelConversationRead = (tenantId, conversationId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversations = CONVERSATIONS_BY_TENANT[resolvedTenantId] || [];
  const conversationIndex = conversations.findIndex((conversation) => conversation.id === conversationId);
  const timestamp = new Date().toISOString();

  if (conversationIndex !== -1) {
    conversations[conversationIndex] = {
      ...conversations[conversationIndex],
      hasUnreadInbound: false,
      lastReadAt: timestamp,
      unreadCount: 0,
    };
  }

  return {
    conversationId,
    lastReadAt: timestamp,
    tenant_id: resolvedTenantId,
    userId: 'mock-user',
  };
};

export const addOmnichannelInternalNote = (tenantId, conversationId, body) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const noteBody = String(body || '').replace(/\s+/g, ' ').trim().slice(0, 800);

  if (!noteBody) {
    throw new Error('Escreva uma nota interna antes de salvar.');
  }

  const timestamp = new Date().toISOString();
  const note = {
    id: `mock-omni-note-${timestamp}`,
    tenant_id: resolvedTenantId,
    body: noteBody,
    conversationId,
    createdBy: 'mock-user',
    createdAt: timestamp,
  };

  INTERNAL_NOTES_BY_CONVERSATION[conversationId] = [
    ...(INTERNAL_NOTES_BY_CONVERSATION[conversationId] || []),
    note,
  ];

  return {
    ...note,
    createdByLabel: 'Usuário demo',
    source: 'Fallback demo',
  };
};

export const updateOmnichannelConversationStatus = (tenantId, conversationId, status) => {
  return updateOmnichannelConversationTriage(tenantId, conversationId, { status });
};

export const updateOmnichannelConversationPriority = (tenantId, conversationId, priority) => {
  return updateOmnichannelConversationTriage(tenantId, conversationId, { priority });
};

export const linkOmnichannelConversationToPatient = (tenantId, conversationId, patientId) => {
  return updateOmnichannelConversationTriage(tenantId, conversationId, { patientId });
};

export const linkOmnichannelConversationToLead = (tenantId, conversationId, leadId) => {
  return updateOmnichannelConversationTriage(tenantId, conversationId, { leadId });
};

export const unlinkOmnichannelConversationContext = (tenantId, conversationId) => {
  return updateOmnichannelConversationTriage(tenantId, conversationId, {
    clearLead: true,
    clearPatient: true,
  });
};

export const sendOmnichannelManualReply = () => {
  throw new Error('Envio manual indisponível no fallback demo. Nenhuma mensagem real foi enviada.');
};

export const generateOmnichannelAttendanceAssistantDraft = () => ({
  accepted: true,
  canUseDraft: true,
  contextLabels: [
    'Contexto seguro aplicado',
    'Mensagens textuais recentes sanitizadas',
    'Status da conversa',
    'Prioridade operacional',
  ],
  contextPackSignals: [
    'Janela WhatsApp aberta',
    'Sem vínculo CRM',
    'Intenção conservadora',
  ],
  contextPackSource: 'mock_sanitized_context_pack',
  contextPackSummary: 'Contexto seguro aplicado em fallback demo: janela aberta, sem vínculo CRM e sem histórico anterior sanitizado.',
  contextPackTruncated: false,
  contextInputCharsBucket: 'unknown',
  detectedIntent: {
    id: 'ambiguous',
    label: 'Mensagem inicial ou assunto indefinido',
    reason: 'A leitura segura demo mantém a resposta conservadora.',
  },
  draftQualityFlags: [],
  draftQualityReasons: [],
  draftQualityStatus: 'approved_for_human_review',
  hasEnoughText: true,
  inputCharsBucket: 'unknown',
  maxOutputTokensBucket: 'unknown',
  mode: 'mock',
  model: 'local-rule-based',
  playbookAllowedNextStep: 'Ler a conversa e escolher o próximo passo humano com segurança.',
  playbookId: 'sem_assunto_definido',
  playbookLabel: 'Assunto indefinido',
  playbookObjective: 'Manter resposta conservadora quando a intenção não está clara.',
  playbookProhibitedClaims: [
    'Não presumir agenda, preço, diagnóstico ou vínculo.',
    'Não pedir dados sensíveis.',
  ],
  playbookRecommendedNextStep: 'Ler a conversa e escolher o próximo passo humano com segurança.',
  playbookTone: 'conservador e humano',
  tenantPlaybookPolicy: {
    configured: false,
    fallbackApplied: false,
    requestedPlaybookId: 'sem_assunto_definido',
    selectedAllowed: true,
    selectedPlaybookId: 'sem_assunto_definido',
    source: 'mock_default_catalog',
    summary: 'Catálogo seguro demo aplicado.',
  },
  provider: 'mock',
  providerAbortReason: 'unknown',
  providerElapsedMsBucket: 'not_measured',
  providerFetchAborted: false,
  providerFetchSettled: false,
  providerRubricBlockedCategories: [],
  providerRubricBlockedReason: 'none',
  providerRubricDecision: 'approved',
  providerRequestStarted: false,
  conversationStateAcknowledged: false,
  conversationStateAligned: false,
  conversationStateKnownFacts: [],
  conversationStateLatestAnsweredField: 'unknown',
  conversationStateMissingFacts: [],
  conversationStateNextExpectedField: 'unknown',
  conversationStateRiskFlags: [],
  conversationStateShouldAvoidRepeatingQuestion: false,
  conversationInterpretationAcknowledged: false,
  conversationInterpretationAligned: false,
  conversationInterpretationInferredIntent: 'unknown',
  conversationInterpretationLatestAnsweredField: 'unknown',
  conversationInterpretationNextExpectedField: 'unknown',
  conversationInterpretationShouldAvoidRepeatingQuestion: false,
  providerPlaybookAcknowledged: false,
  providerPlaybookAligned: false,
  providerPlaybookId: 'unknown',
  replyBriefAcknowledged: false,
  replyBriefAligned: false,
  replyExpectedQuestion: '',
  replyPrimaryGoal: 'unknown',
  replySafetyChecks: [],
  replyStrategy: 'unknown',
  replyContinuityAcknowledged: false,
  replyContinuityAligned: false,
  replyContinuityAcknowledgement: 'unknown',
  replyContinuityNextMove: 'unknown',
  providerTimeoutMsBucket: 'unknown',
  providerTimeoutSource: 'unknown',
  redactionCount: 0,
  requestPayloadSizeBucket: 'unknown',
  responseFormatMode: 'unknown',
  replyPlan: {
    humanReviewRequired: true,
    intent: 'local_human_review',
    nextAction: 'Ler a conversa e escolher o próximo passo humano com segurança.',
    nextQuestion: '',
    playbookId: 'sem_assunto_definido',
    source: 'mock_sanitized_playbook',
    tone: 'conservador e humano',
    sent: false,
  },
  replyContinuity: {
    acknowledgement: 'acknowledge_patient_message',
    guardrails: [
      'human_review_required',
      'sent_false',
      'do_not_claim_message_was_sent',
      'do_not_confirm_schedule',
    ],
    humanReviewFocus: 'sem_assunto_definido_review',
    nextMove: 'advance_to_human_review',
    shouldAskFollowUp: false,
    source: 'mock_sanitized_playbook',
    sent: false,
  },
  replyDraft: 'Olá! Recebemos sua mensagem. A equipe vai analisar o assunto e responder com o próximo passo.',
  safeSummary: 'Sugestão segura demo para validação humana no atendimento.',
  safetyNotes: [
    'Nada é enviado sem revisão humana.',
    'Revise o rascunho antes de responder.',
    'O assistente não confirma horários, valores ou procedimentos.',
  ],
  safeToUseAsDraft: true,
  sent: false,
  source: 'mock_fallback',
  stateLabel: 'Assistente seguro',
  suggestedNextStep: {
    description: 'Ler a conversa e escolher o próximo passo humano com segurança.',
    label: 'Ler conversa antes de responder',
  },
  tenantSettingsSource: 'fallback',
  tenantSettingsStatus: 'not_used',
});

export const recordOmnichannelAttendanceAssistantFeedback = (tenantId, conversationId, input = {}) => ({
  accepted: true,
  createdAt: new Date().toISOString(),
  feedbackReason: input.feedbackReason || input.feedback_reason || null,
  feedbackValue: input.feedbackValue || input.feedback_value || 'useful',
  sent: false,
  tenantId: resolveTenantId(tenantId),
  conversationId,
  usedAsDraft: Boolean(input.usedAsDraft ?? input.used_as_draft ?? false),
});

export const listOmnichannelAttendanceAssistantFeedback = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (ASSISTANT_FEEDBACK_BY_TENANT[resolvedTenantId] || [])
    .map((feedback) => ({
      ...feedback,
      source: 'Fallback demo',
    }));
};

export const listOmnichannelTriageSettings = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (TRIAGE_SETTINGS_BY_TENANT[resolvedTenantId] || [])
    .map((setting) => normalizeOmnichannelTriageSetting({
      ...setting,
      source: 'Fallback demo',
    }))
    .filter(Boolean);
};

export const getOmnichannelTriageSettings = (tenantId) => {
  return listOmnichannelTriageSettings(tenantId)[0] || null;
};

export const listOmnichannelAutoReplyTestAllowlist = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (AUTO_REPLY_ALLOWLIST_BY_TENANT[resolvedTenantId] || [])
    .map((entry) => normalizeOmnichannelAutoReplyAllowlistEntry({
      ...entry,
      source: 'Fallback demo',
    }))
    .filter(Boolean);
};

export const listOmnichannelAutoReplyAttempts = (tenantId, options = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const conversationId = String(
    typeof options === 'string' ? options : options?.conversationId || '',
  ).trim();
  const requestedLimit = Number(typeof options === 'object' ? options?.limit : 20);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 20;

  return (AUTO_REPLY_ATTEMPTS_BY_TENANT[resolvedTenantId] || [])
    .filter((attempt) => !conversationId || attempt.conversationId === conversationId || attempt.conversation_id === conversationId)
    .slice(0, limit)
    .map((attempt) => normalizeOmnichannelAutoReplyAttempt({
      ...attempt,
      source: 'Fallback demo',
    }))
    .filter(Boolean);
};

export const listOmnichannelTriageFlows = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (TRIAGE_FLOWS_BY_TENANT[resolvedTenantId] || [])
    .map((flow) => normalizeOmnichannelTriageFlow({
      ...flow,
      source: 'Fallback demo',
    }))
    .filter(Boolean);
};

export const listOmnichannelTriageQuestions = (tenantId, flowId = null) => {
  const flows = listOmnichannelTriageFlows(tenantId);
  const allowedFlowIds = new Set(flows.map((flow) => flow.id));
  const questions = Object.entries(TRIAGE_QUESTIONS_BY_FLOW)
    .filter(([currentFlowId]) => (!flowId || currentFlowId === flowId) && allowedFlowIds.has(currentFlowId))
    .flatMap(([, currentQuestions]) => currentQuestions);

  return questions
    .map((question) => normalizeOmnichannelTriageQuestion({
      ...question,
      source: 'Fallback demo',
    }))
    .filter(Boolean)
    .sort((first, second) => first.position - second.position);
};

export const listOmnichannelTriageIntents = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (TRIAGE_INTENTS_BY_TENANT[resolvedTenantId] || [])
    .map((intent) => normalizeOmnichannelTriageIntent({
      ...intent,
      source: 'Fallback demo',
    }))
    .filter(Boolean);
};

export const getConversationTriageResult = (tenantId, conversationId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const result = (TRIAGE_RESULTS_BY_TENANT[resolvedTenantId] || [])
    .find((currentResult) => currentResult.conversation_id === conversationId);

  return result ? normalizeOmnichannelTriageResult({
    ...result,
    sourceLabel: 'Fallback demo',
  }) : null;
};

export const upsertConversationTriageResult = (tenantId, conversationId, input = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const payload = buildOmnichannelTriageResultPayload(input);
  const timestamp = new Date().toISOString();
  const tenantResults = TRIAGE_RESULTS_BY_TENANT[resolvedTenantId] || [];
  const existingIndex = tenantResults.findIndex((result) => result.conversation_id === conversationId);
  const nextResult = {
    ...(existingIndex >= 0 ? tenantResults[existingIndex] : {
      id: `mock-omni-triage-result-${timestamp}`,
      tenant_id: resolvedTenantId,
      conversation_id: conversationId,
      created_at: timestamp,
    }),
    ...payload,
    updated_at: timestamp,
  };

  if (existingIndex >= 0) {
    tenantResults[existingIndex] = nextResult;
  } else {
    tenantResults.unshift(nextResult);
  }

  TRIAGE_RESULTS_BY_TENANT[resolvedTenantId] = tenantResults;

  return normalizeOmnichannelTriageResult({
    ...nextResult,
    sourceLabel: 'Fallback demo',
  });
};

export const listOmnichannelTriageManagementSignals = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return (TRIAGE_RESULTS_BY_TENANT[resolvedTenantId] || [])
    .map((result) => normalizeOmnichannelTriageResult({
      ...result,
      sourceLabel: 'Fallback demo',
    }))
    .filter(Boolean);
};

export const getOmnichannelChannelStatus = (tenantId) => {
  const channels = getOmnichannelChannelsByTenant(tenantId);
  const channel = channels[0] || null;

  return {
    channel,
    isConfigured: Boolean(channel?.isConfigured),
    source: channel?.source || 'Fallback demo',
    status: channel?.status || 'not_configured',
    statusLabel: channel?.statusLabel || 'Não configurado',
  };
};
