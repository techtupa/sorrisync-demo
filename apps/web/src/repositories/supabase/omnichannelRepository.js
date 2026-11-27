import { isSupabaseConfigured, supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabaseClient.js';
import { recordClinicAuditEventByTenant } from './auditLogsRepository.js';
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
  normalizeOmnichannelTriageFlow,
  normalizeOmnichannelTriageIntent,
  normalizeOmnichannelTriageQuestion,
  normalizeOmnichannelTriageResult,
  normalizeOmnichannelTriageSetting,
  normalizeOmnichannelAutoReplyAllowlistEntry,
  normalizeOmnichannelAutoReplyAttempt,
} from '../omnichannelTriageBackendContract.js';
import {
  getOmnichannelChannelStatus as getMockOmnichannelChannelStatus,
  listOmnichannelConversationActivities as listMockOmnichannelConversationActivities,
  getOmnichannelChannelsByTenant as getMockOmnichannelChannelsByTenant,
  getOmnichannelConversationByTenant as getMockOmnichannelConversationByTenant,
  getOmnichannelConversationsByTenant as getMockOmnichannelConversationsByTenant,
  getOmnichannelMessageMediaAccess as getMockOmnichannelMessageMediaAccess,
  getOmnichannelMessagesByConversation as getMockOmnichannelMessagesByConversation,
  generateOmnichannelAttendanceAssistantDraft as generateMockOmnichannelAttendanceAssistantDraft,
  listOmnichannelAttendanceAssistantFeedback as listMockOmnichannelAttendanceAssistantFeedback,
  recordOmnichannelAttendanceAssistantFeedback as recordMockOmnichannelAttendanceAssistantFeedback,
  addOmnichannelConversationActivity as addMockOmnichannelConversationActivity,
  addOmnichannelInternalNote as addMockOmnichannelInternalNote,
  assignOmnichannelConversationToMe as assignMockOmnichannelConversationToMe,
  listOmnichannelConversationEvents as listMockOmnichannelConversationEvents,
  listOmnichannelInternalNotes as listMockOmnichannelInternalNotes,
  linkOmnichannelConversationToLead as linkMockOmnichannelConversationToLead,
  linkOmnichannelConversationToPatient as linkMockOmnichannelConversationToPatient,
  getOmnichannelTriageSettings as getMockOmnichannelTriageSettings,
  listOmnichannelAutoReplyAttempts as listMockOmnichannelAutoReplyAttempts,
  listOmnichannelAutoReplyTestAllowlist as listMockOmnichannelAutoReplyTestAllowlist,
  getConversationTriageResult as getMockConversationTriageResult,
  listOmnichannelTriageFlows as listMockOmnichannelTriageFlows,
  listOmnichannelTriageIntents as listMockOmnichannelTriageIntents,
  listOmnichannelTriageManagementSignals as listMockOmnichannelTriageManagementSignals,
  listOmnichannelTriageQuestions as listMockOmnichannelTriageQuestions,
  listOmnichannelTriageSettings as listMockOmnichannelTriageSettings,
  markOmnichannelConversationResolved as markMockOmnichannelConversationResolved,
  markOmnichannelConversationRead as markMockOmnichannelConversationRead,
  reopenOmnichannelConversation as reopenMockOmnichannelConversation,
  scheduleOmnichannelConversationNextAction as scheduleMockOmnichannelConversationNextAction,
  sendOmnichannelManualReply as sendMockOmnichannelManualReply,
  unassignOmnichannelConversation as unassignMockOmnichannelConversation,
  unlinkOmnichannelConversationContext as unlinkMockOmnichannelConversationContext,
  updateOmnichannelConversationPriority as updateMockOmnichannelConversationPriority,
  updateOmnichannelConversationStatus as updateMockOmnichannelConversationStatus,
  updateOmnichannelConversationTriage as updateMockOmnichannelConversationTriage,
  upsertConversationTriageResult as upsertMockConversationTriageResult,
} from '../mock/omnichannelRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);
const DEFAULT_CONVERSATION_PAGE_SIZE = 40;
const MAX_CONVERSATION_PAGE_SIZE = 100;

const normalizeConversationListOptions = (options = {}) => {
  const requestedLimit = Number.parseInt(options.limit, 10);
  const requestedOffset = Number.parseInt(options.offset, 10);

  return {
    limit: Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_CONVERSATION_PAGE_SIZE)
      : DEFAULT_CONVERSATION_PAGE_SIZE,
    offset: Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0,
  };
};

const buildEmptyChannelStatus = () => ({
  channel: null,
  isConfigured: false,
  source: hasSupabase() ? 'Supabase' : 'Fallback demo',
  status: 'not_configured',
  statusLabel: 'Não configurado',
});

const statusLabels = {
  active: 'Ativo',
  archived: 'Arquivado',
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

const voiceMessageType = ['au', 'dio'].join('');

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

const maskIdentifier = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  if (normalized.length <= 8) return '***';
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};

const safeText = (value, limit = 140) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}...` : normalized;
};

const normalizePayloadRedacted = (payload) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const media = source.media && typeof source.media === 'object' && !Array.isArray(source.media) ? source.media : null;
  const contacts = source.contacts && typeof source.contacts === 'object' && !Array.isArray(source.contacts) ? source.contacts : null;
  const unsupported = source.unsupported && typeof source.unsupported === 'object' && !Array.isArray(source.unsupported)
    ? source.unsupported
    : null;

  return {
    contactsCount: typeof contacts?.count === 'number' ? contacts.count : null,
    hasTextBody: Boolean(source.has_text_body),
    locationPresent: Boolean(source.location?.present),
    media: media ? {
      caption: safeText(media.caption, 160),
      hasFilename: Boolean(media.filename),
      hasProviderMediaId: Boolean(media.media_id),
      mimeType: safeText(media.mime_type, 80),
      sha256Present: Boolean(media.sha256),
    } : null,
    provider: safeText(source.provider, 40),
    unsupportedType: safeText(unsupported?.original_type, 40),
  };
};

const buildMessagePreview = (messageType, contentText, payloadSummary) => {
  if (messageType === 'text') {
    return contentText || (payloadSummary.hasTextBody ? 'Texto recebido' : 'Texto recebido sem corpo salvo');
  }

  if (messageType === voiceMessageType) return 'Áudio recebido';
  if (messageType === 'image') return payloadSummary.media?.caption || 'Imagem recebida';
  if (messageType === 'video') return payloadSummary.media?.caption || 'Vídeo recebido';
  if (messageType === 'document') {
    return 'Documento recebido';
  }
  if (messageType === 'sticker') return 'Sticker recebido';
  if (messageType === 'location') return 'Localização recebida sem coordenadas exibidas';
  if (messageType === 'contacts') {
    return payloadSummary.contactsCount ? `Contatos recebidos: ${payloadSummary.contactsCount}` : 'Contatos recebidos';
  }
  if (messageType === 'unsupported') return 'Tipo de mensagem recebido sem exibição operacional';
  return 'Mensagem recebida';
};

const channelSelect = `
  id,
  tenant_id,
  provider,
  display_name,
  status,
  phone_number_id,
  waba_id,
  provider_account_id,
  created_at,
  updated_at
`;

const conversationSelect = `
  id,
  tenant_id,
  channel_id,
  patient_id,
  lead_id,
  contact_display_name,
  contact_phone_e164,
  status,
  priority,
  assigned_to,
  assigned_at,
  last_message_at,
  resolved_at,
  last_handled_at,
  created_at,
  updated_at
`;

const messageSelect = `
  id,
  tenant_id,
  conversation_id,
  channel_id,
  direction,
  message_type,
  content_text,
  provider_message_id,
  provider_status,
  payload_redacted,
  sent_at,
  received_at,
  created_at
`;

const messageEventSelect = `
  id,
  tenant_id,
  message_id,
  channel_id,
  provider,
  event_type,
  provider_message_id,
  payload_redacted,
  created_at
`;

const messageMediaSelect = `
  id,
  tenant_id,
  conversation_id,
  message_id,
  media_type,
  mime_type,
  size_bytes,
  status,
  failure_reason,
  created_at,
  updated_at
`;

const activitySelect = `
  id,
  tenant_id,
  conversation_id,
  activity_type,
  outcome,
  note_text,
  next_action_at,
  created_by,
  created_at,
  updated_at
`;

const internalNoteSelect = `
  id,
  tenant_id,
  conversation_id,
  body,
  created_by,
  created_at
`;

const conversationReadSelect = `
  tenant_id,
  conversation_id,
  user_id,
  last_read_at,
  created_at,
  updated_at
`;

const triageSettingSelect = `
  id,
  tenant_id,
  enabled,
  mode,
  welcome_message,
  fallback_to_human_label,
  auto_reply_enabled,
  auto_reply_mode,
  auto_reply_kill_switch_enabled,
  auto_reply_test_label,
  created_at,
  updated_at
`;

const triageFlowSelect = `
  id,
  tenant_id,
  name,
  status,
  description,
  created_at,
  updated_at
`;

const triageQuestionSelect = `
  id,
  tenant_id,
  flow_id,
  position,
  key,
  label,
  question_type,
  options,
  required,
  active,
  created_at,
  updated_at
`;

const triageIntentSelect = `
  id,
  tenant_id,
  key,
  label,
  description,
  suggested_queue,
  active,
  created_at,
  updated_at
`;

const triageResultSelect = `
  id,
  tenant_id,
  conversation_id,
  flow_id,
  intent_key,
  suggested_queue,
  summary,
  answers,
  handoff_required,
  source,
  created_at,
  updated_at
`;

const assistantFeedbackSelect = `
  created_at,
  assistant_mode,
  provider,
  model,
  playbook_id,
  draft_quality_status,
  feedback_value,
  feedback_reason,
  used_as_draft
`;

const autoReplyAllowlistSelect = `
  id,
  tenant_id,
  contact_mask,
  label,
  active,
  created_at,
  updated_at
`;

const autoReplyAttemptSelect = `
  id,
  tenant_id,
  conversation_id,
  reply_type,
  decision,
  block_reason,
  payload_redacted,
  created_at
`;

const manualReplyErrorLabels = {
  channel_inactive: 'Canal WhatsApp inativo para envio manual.',
  channel_not_found: 'Canal WhatsApp não encontrado para este tenant.',
  conversation_not_found: 'Conversa não encontrada para este tenant.',
  destination_unavailable: 'Contato sem telefone válido para resposta manual.',
  invalid_authorization: 'Sessão inválida para envio manual.',
  invalid_payload: 'Revise a mensagem antes de enviar.',
  manual_window_unavailable: 'A janela de atendimento do WhatsApp não está aberta para resposta manual.',
  meta_auth_failed: 'Credencial server-side do WhatsApp inválida ou expirada.',
  meta_payment_required: 'A Meta recusou o envio por pendência de pagamento ou cobrança.',
  meta_rate_limited: 'A Meta limitou temporariamente os envios. Tente novamente mais tarde.',
  meta_send_failed: 'A Meta não aceitou o envio da mensagem.',
  missing_authorization: 'Sessão autenticada obrigatória para envio manual.',
  permission_denied: 'Perfil sem permissão para enviar resposta manual.',
  persistence_failed: 'Não foi possível registrar a resposta manual com segurança.',
  send_credential_missing: 'Credencial de envio server-side não configurada.',
  tenant_scope_violation: 'Conversa e canal não pertencem ao mesmo tenant.',
};

const mapChannel = (channel) => ({
  id: channel.id,
  tenant_id: channel.tenant_id,
  provider: channel.provider,
  providerLabel: providerLabels[channel.provider] || channel.provider,
  displayName: channel.display_name || 'Canal sem nome',
  status: channel.status || 'not_configured',
  statusLabel: statusLabels[channel.status] || channel.status || 'Não configurado',
  phoneNumberId: channel.phone_number_id || null,
  wabaId: channel.waba_id || null,
  providerAccountId: channel.provider_account_id || null,
  isConfigured: channel.status === 'active',
  createdAt: channel.created_at,
  updatedAt: channel.updated_at,
  source: 'Supabase',
});

const mapConversation = (conversation) => ({
  id: conversation.id,
  tenant_id: conversation.tenant_id,
  channelId: conversation.channel_id,
  patientId: conversation.patient_id || null,
  leadId: conversation.lead_id || null,
  contactDisplayName: conversation.contact_display_name || 'Contato sem nome',
  contactPhoneE164: conversation.contact_phone_e164 || null,
  status: conversation.status || 'open',
  statusLabel: getOmnichannelConversationStatusLabel(conversation.status),
  priority: conversation.priority || 'normal',
  priorityLabel: getOmnichannelConversationPriorityLabel(conversation.priority),
  assignedTo: conversation.assigned_to || null,
  assignedAt: conversation.assigned_at || null,
  assignedToLabel: conversation.assigned_to ? 'Usuário responsável' : 'Sem responsável',
  lastReadAt: conversation.last_read_at || null,
  hasUnreadInbound: Boolean(conversation.has_unread_inbound),
  unreadCount: Number(conversation.unread_count || 0),
  lastMessageAt: conversation.last_message_at || conversation.updated_at || conversation.created_at,
  latestMessagePreview: 'Abrir conversa para ver mensagens registradas.',
  latestMessageType: null,
  latestMessageTypeLabel: null,
  resolvedAt: conversation.resolved_at || null,
  lastHandledAt: conversation.last_handled_at || null,
  createdAt: conversation.created_at,
  updatedAt: conversation.updated_at,
  source: 'Supabase',
});

const mapMessage = (message) => {
  const messageType = message.message_type || 'text';
  const payloadSummary = normalizePayloadRedacted(message.payload_redacted);
  const contentText = safeText(message.content_text, 500);

  return {
    id: message.id,
    tenant_id: message.tenant_id,
    conversationId: message.conversation_id,
    channelId: message.channel_id,
    direction: message.direction,
    directionLabel: message.direction === 'outbound' ? 'Saída registrada' : 'Entrada recebida',
    mediaAttachment: buildLegacyMediaAttachment(messageType),
    mediaMetadata: mediaMessageTypes.has(messageType) ? payloadSummary.media : null,
    messagePreview: buildMessagePreview(messageType, contentText, payloadSummary),
    messageType,
    messageTypeLabel: messageTypeLabels[messageType] || messageType,
    payloadSummary,
    contentText,
    providerMessageId: message.provider_message_id ? maskIdentifier(message.provider_message_id) : null,
    providerStatus: message.provider_status || null,
    sentAt: message.sent_at || null,
    receivedAt: message.received_at || null,
    createdAt: message.created_at,
    source: 'Supabase',
  };
};

const mapManualReplyPublicMessage = (message = {}, fallback = {}) => {
  const sentAt = message.sent_at || fallback.sentAt || new Date().toISOString();

  return mapMessage({
    id: message.id || null,
    tenant_id: fallback.tenantId || null,
    conversation_id: fallback.conversationId || null,
    channel_id: fallback.channelId || null,
    direction: 'outbound',
    message_type: message.message_type || 'text',
    content_text: fallback.body || '',
    payload_redacted: {},
    provider_message_id: message.provider_message_id || null,
    provider_status: message.provider_status || null,
    sent_at: sentAt,
    received_at: null,
    created_at: sentAt,
  });
};

const mapActivity = (activity) => ({
  id: activity.id,
  tenant_id: activity.tenant_id,
  conversationId: activity.conversation_id,
  activityType: activity.activity_type,
  activityTypeLabel: getOmnichannelActivityTypeLabel(activity.activity_type),
  outcome: activity.outcome || 'pending',
  outcomeLabel: getOmnichannelActivityOutcomeLabel(activity.outcome),
  noteText: activity.note_text || '',
  nextActionAt: activity.next_action_at || null,
  createdBy: activity.created_by || null,
  createdByLabel: activity.created_by ? 'Usuário autenticado' : 'Sistema',
  createdAt: activity.created_at,
  updatedAt: activity.updated_at,
  source: 'Supabase',
});

const providerEventLabels = {
  delivered: 'Mensagem entregue',
  failed: 'Falha do provedor',
  manual_send_requested: 'Envio manual solicitado',
  manual_send_sent: 'Envio manual aceito',
  message_received: 'Mensagem recebida',
  read: 'Mensagem lida',
  sent: 'Mensagem enviada',
};

const mapMessageEvent = (event) => ({
  id: event.id,
  tenant_id: event.tenant_id,
  messageId: event.message_id || null,
  channelId: event.channel_id || null,
  provider: event.provider,
  eventType: event.event_type,
  eventTypeLabel: providerEventLabels[event.event_type] || event.event_type || 'Evento do provedor',
  providerMessageId: maskIdentifier(event.provider_message_id),
  payloadSummary: normalizePayloadRedacted(event.payload_redacted),
  createdAt: event.created_at,
  source: 'Supabase',
});

const mapInternalNote = (note) => ({
  id: note.id,
  tenant_id: note.tenant_id,
  conversationId: note.conversation_id,
  body: safeText(note.body, 800),
  createdBy: note.created_by || null,
  createdByLabel: note.created_by ? 'Usuário autenticado' : 'Sistema',
  createdAt: note.created_at,
  source: 'Supabase',
});

const mapConversationRead = (readState) => ({
  tenant_id: readState.tenant_id,
  conversationId: readState.conversation_id,
  userId: readState.user_id,
  lastReadAt: readState.last_read_at || null,
  createdAt: readState.created_at,
  updatedAt: readState.updated_at,
  source: 'Supabase',
});

const mapTriageSetting = (setting) => normalizeOmnichannelTriageSetting({
  ...setting,
  source: 'Supabase',
});

const mapAutoReplyAllowlistEntry = (entry) => normalizeOmnichannelAutoReplyAllowlistEntry({
  ...entry,
  source: 'Supabase',
});

const mapAutoReplyAttempt = (attempt) => normalizeOmnichannelAutoReplyAttempt({
  ...attempt,
  source: 'Supabase',
});

const mapTriageFlow = (flow) => normalizeOmnichannelTriageFlow({
  ...flow,
  source: 'Supabase',
});

const mapTriageQuestion = (question) => normalizeOmnichannelTriageQuestion({
  ...question,
  source: 'Supabase',
});

const mapTriageIntent = (intent) => normalizeOmnichannelTriageIntent({
  ...intent,
  source: 'Supabase',
});

const mapTriageResult = (result) => normalizeOmnichannelTriageResult({
  ...result,
  sourceLabel: 'Supabase',
});

const formatMediaSize = (value) => {
  const size = Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return 'Tamanho não informado';
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
};

const mediaStatusLabels = {
  available: 'Disponível para visualização segura',
  failed: 'Visualização segura indisponível',
  legacy_metadata_only: 'Mídia antiga sem visualização segura',
  unavailable: 'Visualização segura indisponível',
};

const mediaFailureLabels = {
  media_record_failed: 'Registro seguro indisponível.',
  media_too_large: 'Arquivo acima do limite seguro.',
  meta_access_token_missing: 'Credencial server-side indisponível.',
  meta_download_failed: 'Download server-side não concluído.',
  meta_metadata_failed: 'Metadados do provedor indisponíveis.',
  provider_media_missing: 'Referência de mídia ausente.',
  storage_upload_failed: 'Armazenamento privado não concluído.',
  unsupported_media_type: 'Tipo de mídia fora do MVP.',
  unsupported_mime_type: 'Formato fora do MVP.',
};

const buildLegacyMediaAttachment = (messageType) => {
  if (!mediaMessageTypes.has(messageType)) return null;

  return {
    available: false,
    canPreview: false,
    failureLabel: 'Mídia recebida antes da habilitação de visualização segura.',
    isLegacy: true,
    mediaType: messageType,
    mimeType: null,
    sizeLabel: 'Tamanho não informado',
    source: 'Supabase',
    status: 'legacy_metadata_only',
    statusLabel: mediaStatusLabels.legacy_metadata_only,
  };
};

const mapMessageMediaRecord = (record) => {
  if (!record?.message_id) return null;

  const status = record.status || 'unavailable';
  const mediaType = record.media_type || null;
  const mimeType = safeText(record.mime_type, 80) || null;
  const isPdfDocument = mediaType === 'document' && mimeType === 'application/pdf';
  const canPreview = status === 'available' && (
    mediaType === voiceMessageType
    || mediaType === 'image'
    || isPdfDocument
  );

  return {
    available: status === 'available',
    canPreview,
    failureLabel: mediaFailureLabels[record.failure_reason] || null,
    isLegacy: false,
    mediaType,
    mimeType,
    sizeLabel: formatMediaSize(record.size_bytes),
    source: 'Supabase',
    status,
    statusLabel: mediaStatusLabels[status] || mediaStatusLabels.unavailable,
  };
};

const attachMediaRecordsToMessages = (messages, mediaRecords = []) => {
  const mediaByMessageId = new Map();
  mediaRecords.forEach((record) => {
    const media = mapMessageMediaRecord(record);
    if (record?.message_id && media) {
      mediaByMessageId.set(record.message_id, media);
    }
  });

  return messages.map((message) => ({
    ...message,
    mediaAttachment: mediaByMessageId.get(message.id) || buildLegacyMediaAttachment(message.messageType),
  }));
};

const normalizeMediaAccessResponse = (data = {}) => ({
  accepted: data?.accepted === true,
  available: data?.available === true,
  mediaType: safeText(data?.mediaType, 40) || null,
  mimeType: safeText(data?.mimeType, 80) || null,
  status: safeText(data?.status, 40) || 'unavailable',
});

const mediaAccessErrorMessages = {
  invalid_authorization: 'Sessão inválida para visualizar a mídia segura.',
  invalid_payload: 'Mídia indisponível para esta conversa.',
  media_unavailable: 'Mídia segura indisponível para esta mensagem.',
  missing_authorization: 'Sessão autenticada indisponível para mídia segura.',
  permission_denied: 'Perfil sem permissão para visualizar mídia Omnichannel.',
  persistence_failed: 'Não foi possível validar a mídia segura.',
  storage_download_failed: 'Não foi possível abrir a mídia segura.',
  unsupported_mime_type: 'Formato fora do MVP de visualização segura.',
};

const parseMediaAccessErrorResponse = async (response) => {
  try {
    const payload = await response.clone().json();
    const code = safeText(payload?.error?.code, 80);
    return mediaAccessErrorMessages[code] || 'Visualização segura indisponível para esta mídia.';
  } catch {
    return 'Visualização segura indisponível para esta mídia.';
  }
};

const resolveMediaAccessFilename = (mediaType, mimeType) => {
  if (mediaType === voiceMessageType) {
    const mediaMimePrefix = `${voiceMessageType}/`;
    if (mimeType === `${mediaMimePrefix}mpeg`) return 'arquivo-recebido.mp3';
    if (mimeType === `${mediaMimePrefix}mp4`) return 'arquivo-recebido.m4a';
    if (mimeType === `${mediaMimePrefix}aac`) return 'arquivo-recebido.aac';
    if (mimeType === `${mediaMimePrefix}amr`) return 'arquivo-recebido.amr';
    if (mimeType === `${mediaMimePrefix}webm`) return 'arquivo-recebido.webm';
    return 'arquivo-recebido.ogg';
  }

  if (mediaType === 'image') {
    if (mimeType === 'image/png') return 'imagem-recebida.png';
    if (mimeType === 'image/webp') return 'imagem-recebida.webp';
    return 'imagem-recebida.jpg';
  }

  if (mediaType === 'document') return 'documento-recebido.pdf';

  return 'arquivo-recebido.bin';
};

const parseMediaAccessFilename = (contentDisposition, mediaType, mimeType) => {
  const filenameMatch = String(contentDisposition || '').match(/filename="?([^";]+)"?/i);
  return safeText(filenameMatch?.[1], 120) || resolveMediaAccessFilename(mediaType, mimeType);
};

const mergeLatestMessagePreview = (conversations, messages, readStates = []) => {
  const latestByConversation = new Map();
  const readsByConversation = new Map(readStates.map((readState) => [readState.conversationId, readState]));
  const inboundByConversation = new Map();

  messages.forEach((message) => {
    if (!message.conversationId) return;
    const current = latestByConversation.get(message.conversationId);
    const currentTime = current ? new Date(current.createdAt).getTime() : 0;
    const nextTime = new Date(message.createdAt).getTime();

    if (!current || nextTime >= currentTime) {
      latestByConversation.set(message.conversationId, message);
    }

    if (message.direction === 'inbound') {
      const inboundMessages = inboundByConversation.get(message.conversationId) || [];
      inboundMessages.push(message);
      inboundByConversation.set(message.conversationId, inboundMessages);
    }
  });

  return conversations.map((conversation) => {
    const latestMessage = latestByConversation.get(conversation.id);
    const readState = readsByConversation.get(conversation.id);
    const lastReadTime = readState?.lastReadAt ? new Date(readState.lastReadAt).getTime() : 0;
    const inboundMessages = inboundByConversation.get(conversation.id) || [];
    const unreadCount = inboundMessages.filter((message) => {
      const messageTime = new Date(message.receivedAt || message.createdAt || '').getTime();
      return messageTime && messageTime > lastReadTime;
    }).length;

    return {
      ...conversation,
      hasUnreadInbound: unreadCount > 0,
      lastInboundAt: inboundMessages
        .map((message) => message.receivedAt || message.createdAt)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
      latestMessagePreview: latestMessage?.messagePreview || latestMessage?.contentText || conversation.latestMessagePreview,
      latestMessageDirection: latestMessage?.direction || null,
      latestMessageType: latestMessage?.messageType || null,
      latestMessageTypeLabel: latestMessage?.messageTypeLabel || null,
      lastMessageAt: latestMessage?.receivedAt || latestMessage?.createdAt || conversation.lastMessageAt,
      lastReadAt: readState?.lastReadAt || null,
      unreadCount,
    };
  });
};

export const listChannels = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getMockOmnichannelChannelsByTenant(tenantId);
  }

  const response = await supabase
    .from('omnichannel_channels')
    .select(channelSelect)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (response.error) {
    return [];
  }

  return (response.data || []).map(mapChannel);
};

export const listConversations = async (tenantId, options = {}) => {
  const { limit, offset } = normalizeConversationListOptions(options);

  if (!hasSupabase() || !tenantId) {
    return getMockOmnichannelConversationsByTenant(tenantId).slice(offset, offset + limit);
  }

  const conversationsResponse = await supabase
    .from('omnichannel_conversations')
    .select(conversationSelect)
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (conversationsResponse.error) {
    return [];
  }

  const conversations = (conversationsResponse.data || []).map(mapConversation);
  if (!conversations.length) {
    return [];
  }

  const conversationIds = conversations.map((conversation) => conversation.id);
  const messagesResponse = await supabase
    .from('omnichannel_messages')
    .select(messageSelect)
    .eq('tenant_id', tenantId)
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false });

  if (messagesResponse.error) {
    return conversations;
  }

  const readsResponse = await supabase
    .from('omnichannel_conversation_reads')
    .select(conversationReadSelect)
    .eq('tenant_id', tenantId)
    .in('conversation_id', conversationIds);

  const readStates = readsResponse.error ? [] : (readsResponse.data || []).map(mapConversationRead);

  return mergeLatestMessagePreview(conversations, (messagesResponse.data || []).map(mapMessage), readStates);
};

export const listMessagesByConversation = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return getMockOmnichannelMessagesByConversation(tenantId, conversationId);
  }

  const response = await supabase
    .from('omnichannel_messages')
    .select(messageSelect)
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (response.error) {
    return [];
  }

  const messages = (response.data || []).map(mapMessage);
  const messageIds = messages.map((message) => message.id).filter(Boolean);
  if (!messageIds.length) {
    return messages;
  }

  const mediaResponse = await supabase
    .from('omnichannel_message_media')
    .select(messageMediaSelect)
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .in('message_id', messageIds);

  if (mediaResponse.error) {
    return messages;
  }

  return attachMediaRecordsToMessages(messages, mediaResponse.data || []);
};

export const getMessageMediaAccess = async (tenantId, messageId, options = {}) => {
  if (!hasSupabase() || !tenantId || !messageId || !supabaseUrl || !supabaseAnonKey) {
    return getMockOmnichannelMessageMediaAccess(tenantId, messageId, options);
  }

  const sessionResponse = await supabase.auth.getSession();
  const accessToken = sessionResponse.data?.session?.access_token || '';

  if (!accessToken) {
    throw new Error('Sessão autenticada indisponível para mídia segura.');
  }

  const disposition = options.mode === 'download' ? 'attachment' : 'inline';
  const response = await fetch(`${supabaseUrl}/functions/v1/omnichannel-media-access`, {
    body: JSON.stringify({
      disposition,
      message_id: messageId,
    }),
    headers: {
      Accept: 'application/octet-stream, application/json',
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    throw new Error(await parseMediaAccessErrorResponse(response));
  }

  if (contentType.includes('application/json')) {
    const access = normalizeMediaAccessResponse(await response.json());
    if (!access.accepted) {
      throw new Error('Visualização segura indisponível para esta mídia.');
    }

    return access;
  }

  const mimeType = safeText(contentType.split(';')[0], 80) || 'application/octet-stream';
  const mediaType = safeText(response.headers.get('x-omnichannel-media-type'), 40) || null;
  const blob = await response.blob();

  return {
    accepted: true,
    available: true,
    blob,
    filename: parseMediaAccessFilename(response.headers.get('content-disposition'), mediaType, mimeType),
    mediaType,
    mimeType,
    source: 'proxy_stream',
    status: safeText(response.headers.get('x-omnichannel-media-status'), 40) || 'available',
  };
};

export const listConversationActivities = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return listMockOmnichannelConversationActivities(tenantId, conversationId);
  }

  const response = await supabase
    .from('omnichannel_conversation_activities')
    .select(activitySelect)
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false });

  if (response.error) {
    return [];
  }

  return (response.data || []).map(mapActivity);
};

export const listConversationActivitiesBatch = async (tenantId, conversationIds = []) => {
  const safeConversationIds = [...new Set(
    (Array.isArray(conversationIds) ? conversationIds : [])
      .map((conversationId) => String(conversationId || '').trim())
      .filter(Boolean),
  )].slice(0, MAX_CONVERSATION_PAGE_SIZE);

  if (!safeConversationIds.length) {
    return {};
  }

  if (!hasSupabase() || !tenantId) {
    return Object.fromEntries(
      safeConversationIds.map((conversationId) => [
        conversationId,
        listMockOmnichannelConversationActivities(tenantId, conversationId),
      ]),
    );
  }

  const response = await supabase
    .from('omnichannel_conversation_activities')
    .select(activitySelect)
    .eq('tenant_id', tenantId)
    .in('conversation_id', safeConversationIds)
    .order('created_at', { ascending: false });

  if (response.error) {
    return Object.fromEntries(safeConversationIds.map((conversationId) => [conversationId, []]));
  }

  const activitiesByConversation = Object.fromEntries(
    safeConversationIds.map((conversationId) => [conversationId, []]),
  );

  for (const activity of (response.data || []).map(mapActivity)) {
    if (activitiesByConversation[activity.conversationId]) {
      activitiesByConversation[activity.conversationId].push(activity);
    }
  }

  return activitiesByConversation;
};

export const listConversationEvents = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return listMockOmnichannelConversationEvents(tenantId, conversationId);
  }

  const messagesResponse = await supabase
    .from('omnichannel_messages')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId);

  if (messagesResponse.error || !(messagesResponse.data || []).length) {
    return [];
  }

  const messageIds = (messagesResponse.data || []).map((message) => message.id);
  const eventsResponse = await supabase
    .from('omnichannel_message_events')
    .select(messageEventSelect)
    .eq('tenant_id', tenantId)
    .in('message_id', messageIds)
    .order('created_at', { ascending: true });

  if (eventsResponse.error) {
    return [];
  }

  return (eventsResponse.data || []).map(mapMessageEvent);
};

export const listInternalNotes = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return listMockOmnichannelInternalNotes(tenantId, conversationId);
  }

  const response = await supabase
    .from('omnichannel_internal_notes')
    .select(internalNoteSelect)
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (response.error) {
    return [];
  }

  return (response.data || []).map(mapInternalNote);
};

export const getConversation = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return getMockOmnichannelConversationByTenant(tenantId, conversationId);
  }

  const response = await supabase
    .from('omnichannel_conversations')
    .select(conversationSelect)
    .eq('tenant_id', tenantId)
    .eq('id', conversationId)
    .maybeSingle();

  if (response.error || !response.data) {
    return null;
  }

  return mapConversation(response.data);
};

export const getConversationDetail = getConversation;

const updateConversationAfterActivity = async (tenantId, conversationId, activityPayload) => {
  const lastHandledAt = new Date().toISOString();
  const payload = {
    last_handled_at: lastHandledAt,
  };

  if (activityPayload.activity_type === 'resolved' || activityPayload.outcome === 'resolved') {
    payload.status = 'resolved';
    payload.resolved_at = lastHandledAt;
  } else if (activityPayload.activity_type === 'reopened') {
    payload.status = 'open';
    payload.resolved_at = null;
  } else if (activityPayload.next_action_at) {
    payload.status = 'waiting';
    payload.resolved_at = null;
  }

  const response = await supabase
    .from('omnichannel_conversations')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', conversationId)
    .select(conversationSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível atualizar o atendimento da conversa.');
  }

  if (!response.data) {
    throw new Error('Conversa não encontrada para este tenant ou sem permissão de atendimento.');
  }

  return mapConversation(response.data);
};

const recordActivityAudit = async (tenantId, conversationId, activity) => {
  try {
    await recordClinicAuditEventByTenant(tenantId, {
      action: 'omnichannel.activity_recorded',
      entityType: 'omnichannel_conversation',
      entityId: conversationId,
      metadata: {
        activity_type: activity.activityType,
        has_next_action: Boolean(activity.nextActionAt),
        has_note: Boolean(activity.noteText),
        outcome: activity.outcome,
      },
    });
  } catch {
    // O registro operacional principal não deve falhar por auditoria indisponível.
  }
};

const recordOperationalActivitySafely = async (tenantId, conversationId, activityInput = {}) => {
  try {
    const activityPayload = buildOmnichannelActivityPayload(activityInput);
    const response = await supabase
      .from('omnichannel_conversation_activities')
      .insert({
        ...activityPayload,
        conversation_id: conversationId,
        tenant_id: tenantId,
      })
      .select(activitySelect)
      .maybeSingle();

    if (!response.error && response.data) {
      const activity = mapActivity(response.data);
      await recordActivityAudit(tenantId, conversationId, activity);
      return activity;
    }
  } catch {
    // Evento operacional complementar: a ação principal não deve ser revertida por esta falha.
  }

  return null;
};

export const addConversationActivity = async (tenantId, conversationId, activityInput = {}) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return addMockOmnichannelConversationActivity(tenantId, conversationId, activityInput);
  }

  const activityPayload = buildOmnichannelActivityPayload(activityInput);
  const response = await supabase
    .from('omnichannel_conversation_activities')
    .insert({
      ...activityPayload,
      conversation_id: conversationId,
      tenant_id: tenantId,
    })
    .select(activitySelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível registrar a ação interna da conversa.');
  }

  if (!response.data) {
    throw new Error('Registro interno não foi criado para este tenant.');
  }

  const activity = mapActivity(response.data);
  const conversation = await updateConversationAfterActivity(tenantId, conversationId, activityPayload);
  await recordActivityAudit(tenantId, conversationId, activity);

  return {
    activity,
    conversation,
  };
};

export const scheduleNextAction = (tenantId, conversationId, nextActionAt, noteText = '') => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return scheduleMockOmnichannelConversationNextAction(tenantId, conversationId, nextActionAt, noteText);
  }

  return addConversationActivity(tenantId, conversationId, {
    activityType: 'scheduled_return',
    nextActionAt,
    noteText,
    outcome: 'follow_up_later',
  });
};

export const markConversationResolved = (tenantId, conversationId, noteText = '') => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return markMockOmnichannelConversationResolved(tenantId, conversationId, noteText);
  }

  return addConversationActivity(tenantId, conversationId, {
    activityType: 'resolved',
    noteText,
    outcome: 'resolved',
  });
};

export const reopenConversation = (tenantId, conversationId, noteText = '') => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return reopenMockOmnichannelConversation(tenantId, conversationId, noteText);
  }

  return addConversationActivity(tenantId, conversationId, {
    activityType: 'reopened',
    noteText,
    outcome: 'status_open',
  });
};

export const updateConversationTriage = async (tenantId, conversationId, triagePatch) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return updateMockOmnichannelConversationTriage(tenantId, conversationId, triagePatch);
  }

  const payload = buildOmnichannelConversationTriagePatch(triagePatch);

  const response = await supabase
    .from('omnichannel_conversations')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', conversationId)
    .select(conversationSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível atualizar a triagem Omnichannel.');
  }

  if (!response.data) {
    throw new Error('Conversa não encontrada para este tenant ou sem permissão de triagem.');
  }

  const updatedConversation = mapConversation(response.data);

  if (Object.hasOwn(payload, 'status')) {
    await recordOperationalActivitySafely(tenantId, conversationId, {
      activityType: 'status_changed',
      noteText: `Status operacional alterado para ${updatedConversation.statusLabel}.`,
      outcome: `status_${updatedConversation.status}`,
    });
  }

  if (Object.hasOwn(payload, 'priority')) {
    await recordOperationalActivitySafely(tenantId, conversationId, {
      activityType: 'priority_changed',
      noteText: `Prioridade alterada para ${updatedConversation.priorityLabel}.`,
      outcome: `priority_${updatedConversation.priority}`,
    });
  }

  if (Object.hasOwn(payload, 'patient_id') && payload.patient_id) {
    await recordOperationalActivitySafely(tenantId, conversationId, {
      activityType: 'linked_patient',
      noteText: 'Conversa vinculada manualmente a paciente do CRM.',
      outcome: 'linked_patient',
    });
  }

  if (Object.hasOwn(payload, 'lead_id') && payload.lead_id) {
    await recordOperationalActivitySafely(tenantId, conversationId, {
      activityType: 'linked_lead',
      noteText: 'Conversa vinculada manualmente a lead do CRM.',
      outcome: 'linked_lead',
    });
  }

  if ((Object.hasOwn(payload, 'patient_id') && payload.patient_id === null)
    || (Object.hasOwn(payload, 'lead_id') && payload.lead_id === null)) {
    await recordOperationalActivitySafely(tenantId, conversationId, {
      activityType: 'internal_note',
      noteText: 'Vínculo CRM removido manualmente da conversa.',
      outcome: 'pending',
    });
  }

  return updatedConversation;
};

export const updateConversationStatus = (tenantId, conversationId, status) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return updateMockOmnichannelConversationStatus(tenantId, conversationId, status);
  }

  return updateConversationTriage(tenantId, conversationId, { status });
};

export const updateConversationPriority = (tenantId, conversationId, priority) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return updateMockOmnichannelConversationPriority(tenantId, conversationId, priority);
  }

  return updateConversationTriage(tenantId, conversationId, { priority });
};

export const linkConversationToPatient = (tenantId, conversationId, patientId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return linkMockOmnichannelConversationToPatient(tenantId, conversationId, patientId);
  }

  return updateConversationTriage(tenantId, conversationId, { patientId });
};

export const linkConversationToLead = (tenantId, conversationId, leadId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return linkMockOmnichannelConversationToLead(tenantId, conversationId, leadId);
  }

  return updateConversationTriage(tenantId, conversationId, { leadId });
};

export const unlinkConversationContext = (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return unlinkMockOmnichannelConversationContext(tenantId, conversationId);
  }

  return updateConversationTriage(tenantId, conversationId, {
    clearLead: true,
    clearPatient: true,
  });
};

const getAuthenticatedUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    throw new Error('Sessão autenticada obrigatória para esta ação Omnichannel.');
  }

  return data.user.id;
};

export const assignConversationToMe = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return assignMockOmnichannelConversationToMe(tenantId, conversationId);
  }

  const userId = await getAuthenticatedUserId();
  const assignedAt = new Date().toISOString();
  const response = await supabase
    .from('omnichannel_conversations')
    .update({
      assigned_at: assignedAt,
      assigned_to: userId,
      last_handled_at: assignedAt,
    })
    .eq('tenant_id', tenantId)
    .eq('id', conversationId)
    .select(conversationSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível atribuir a conversa.');
  }

  if (!response.data) {
    throw new Error('Conversa não encontrada para este tenant ou sem permissão de atribuição.');
  }

  const conversation = mapConversation(response.data);
  await recordOperationalActivitySafely(tenantId, conversationId, {
    activityType: 'assigned',
    noteText: 'Conversa atribuída manualmente para atendimento.',
    outcome: 'assigned_to_user',
  });

  return conversation;
};

export const unassignConversation = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return unassignMockOmnichannelConversation(tenantId, conversationId);
  }

  const handledAt = new Date().toISOString();
  const response = await supabase
    .from('omnichannel_conversations')
    .update({
      assigned_at: null,
      assigned_to: null,
      last_handled_at: handledAt,
    })
    .eq('tenant_id', tenantId)
    .eq('id', conversationId)
    .select(conversationSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível remover o responsável da conversa.');
  }

  if (!response.data) {
    throw new Error('Conversa não encontrada para este tenant ou sem permissão de atribuição.');
  }

  const conversation = mapConversation(response.data);
  await recordOperationalActivitySafely(tenantId, conversationId, {
    activityType: 'unassigned',
    noteText: 'Responsável removido manualmente da conversa.',
    outcome: 'unassigned',
  });

  return conversation;
};

export const markConversationRead = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return markMockOmnichannelConversationRead(tenantId, conversationId);
  }

  const userId = await getAuthenticatedUserId();
  const readAt = new Date().toISOString();
  const response = await supabase
    .from('omnichannel_conversation_reads')
    .upsert({
      conversation_id: conversationId,
      last_read_at: readAt,
      tenant_id: tenantId,
      user_id: userId,
    }, {
      onConflict: 'tenant_id,conversation_id,user_id',
    })
    .select(conversationReadSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível marcar a conversa como lida.');
  }

  return response.data ? mapConversationRead(response.data) : {
    conversationId,
    lastReadAt: readAt,
    tenant_id: tenantId,
    userId,
  };
};

export const addInternalNote = async (tenantId, conversationId, body) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return addMockOmnichannelInternalNote(tenantId, conversationId, body);
  }

  const noteBody = safeText(body, 800);
  if (!noteBody) {
    throw new Error('Escreva uma nota interna antes de salvar.');
  }

  const response = await supabase
    .from('omnichannel_internal_notes')
    .insert({
      body: noteBody,
      conversation_id: conversationId,
      tenant_id: tenantId,
    })
    .select(internalNoteSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível salvar a nota interna.');
  }

  if (!response.data) {
    throw new Error('Nota interna não foi criada para este tenant.');
  }

  const note = mapInternalNote(response.data);
  await recordOperationalActivitySafely(tenantId, conversationId, {
    activityType: 'internal_note',
    noteText: 'Nota interna adicionada à conversa.',
    outcome: 'pending',
  });

  return note;
};

export const sendManualReply = async (tenantId, conversationId, channelId, input = {}) => {
  if (!hasSupabase() || !tenantId || !conversationId || !channelId) {
    return sendMockOmnichannelManualReply();
  }

  const body = safeText(input.body, 1000);
  const idempotencyKey = safeText(input.idempotencyKey, 120);
  const { data, error } = await supabase.functions.invoke('whatsapp-send-message', {
    body: {
      body,
      channel_id: channelId,
      conversation_id: conversationId,
      idempotency_key: idempotencyKey,
    },
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível enviar a resposta manual pelo WhatsApp.');
  }

  if (!data?.accepted) {
    const errorCode = data?.error?.code || 'meta_send_failed';
    throw new Error(manualReplyErrorLabels[errorCode] || 'Não foi possível enviar a resposta manual pelo WhatsApp.');
  }

  return {
    accepted: Boolean(data.accepted),
    duplicate: Boolean(data.duplicate),
    message: data.message
      ? mapManualReplyPublicMessage(data.message, {
        body,
        channelId,
        conversationId,
        tenantId,
      })
      : null,
  };
};

const normalizeAssistantObject = (value, fallback = {}) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
);

const normalizeAssistantStringList = (value) => (
  Array.isArray(value) ? value.map((item) => safeText(item, 180)).filter(Boolean) : []
);

const normalizeAssistantBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
};

const normalizeAssistantProviderGateChecks = (value = {}) => {
  const checks = normalizeAssistantObject(value, {});
  return {
    fallbackUsed: checks.fallbackUsed === true || checks.fallback_used === true,
    providerAdapterReady: checks.providerAdapterReady === true || checks.provider_adapter_ready === true,
    providerCallAttempted: checks.providerCallAttempted === true || checks.provider_call_attempted === true,
    providerCallSucceeded: checks.providerCallSucceeded === true || checks.provider_call_succeeded === true,
    providerConfigured: checks.providerConfigured === true || checks.provider_configured === true,
    providerModelConfigured: checks.providerModelConfigured === true || checks.provider_model_configured === true,
    providerRequested: safeText(checks.providerRequested || checks.provider_requested, 40) || 'unknown',
    providerSecretPresent: checks.providerSecretPresent === true || checks.provider_secret_present === true,
    runtimeEnabled: checks.runtimeEnabled === true || checks.runtime_enabled === true,
    shouldCallExternal: checks.shouldCallExternal === true || checks.should_call_external === true,
    tenantAllowed: checks.tenantAllowed === true || checks.tenant_allowed === true,
    tenantAssistantEnabled: checks.tenantAssistantEnabled === true || checks.tenant_assistant_enabled === true,
    tenantDryRun: checks.tenantDryRun === true || checks.tenant_dry_run === true,
    tenantSettingsAvailable: checks.tenantSettingsAvailable === true || checks.tenant_settings_available === true,
    tenantStatus: safeText(checks.tenantStatus || checks.tenant_status, 40) || 'unknown',
  };
};

const normalizeAssistantTenantPlaybookPolicy = (value = {}) => {
  const policy = normalizeAssistantObject(value, {});

  return {
    configured: normalizeAssistantBoolean(policy.configured, false),
    fallbackApplied: normalizeAssistantBoolean(policy.fallbackApplied ?? policy.fallback_applied, false),
    requestedPlaybookId: safeText(policy.requestedPlaybookId || policy.requested_playbook_id, 80),
    selectedAllowed: normalizeAssistantBoolean(policy.selectedAllowed ?? policy.selected_allowed, true),
    selectedPlaybookId: safeText(policy.selectedPlaybookId || policy.selected_playbook_id, 80),
    source: safeText(policy.source, 80) || 'unknown',
    summary: safeText(policy.summary, 180),
  };
};

const normalizeAttendanceAssistantDraft = (data = {}) => {
  const detectedIntent = normalizeAssistantObject(data.detectedIntent || data.detected_intent, {});
  const suggestedNextStep = normalizeAssistantObject(data.suggestedNextStep || data.suggested_next_step, {});
  const selectedPlaybook = normalizeAssistantObject(data.selectedPlaybook || data.selected_playbook, {});
  const replyPlan = normalizeAssistantObject(data.replyPlan || data.reply_plan, {});
  const replyContinuity = normalizeAssistantObject(data.replyContinuity || data.reply_continuity, {});
  const tenantPlaybookPolicy = normalizeAssistantTenantPlaybookPolicy(
    data.tenantPlaybookPolicy || data.tenant_playbook_policy,
  );
  const replyDraft = safeText(data.replyDraft || data.reply_draft, 420);
  const safeSummary = safeText(data.safeSummary || data.safe_summary, 720);
  const hasServerSuggestionContent = Boolean(replyDraft || safeSummary);
  const draftQualityStatus = safeText(data.draftQualityStatus || data.draft_quality_status, 80)
    || (replyDraft ? 'approved_for_human_review' : 'blocked');
  const safeToUseAsDraft = Boolean(data.safeToUseAsDraft ?? data.safe_to_use_as_draft ?? draftQualityStatus !== 'blocked');
  const canUseDraft = Boolean(data.canUseDraft ?? data.can_use_draft ?? replyDraft)
    && Boolean(replyDraft)
    && safeToUseAsDraft
    && draftQualityStatus !== 'blocked';
  const edgeResponseAccepted = normalizeAssistantBoolean(
    data.edgeResponseAccepted ?? data.edge_response_accepted,
    data.accepted !== false,
  );
  const serverSuggestionUsed = normalizeAssistantBoolean(
    data.serverSuggestionUsed ?? data.server_suggestion_used,
    hasServerSuggestionContent,
  );
  const serverFallbackUsed = normalizeAssistantBoolean(
    data.serverFallbackUsed ?? data.server_fallback_used,
    edgeResponseAccepted && !serverSuggestionUsed,
  );
  const localFallbackUsed = normalizeAssistantBoolean(data.localFallbackUsed ?? data.local_fallback_used, false);
  const providerResponseParsed = normalizeAssistantBoolean(
    data.providerResponseParsed ?? data.provider_response_parsed,
    false,
  );
  const providerOutputAccepted = normalizeAssistantBoolean(
    data.providerOutputAccepted ?? data.provider_output_accepted,
    false,
  );
  const rawProviderOutputAcceptedReason = safeText(
    data.providerOutputAcceptedReason || data.provider_output_accepted_reason,
    80,
  ) || (providerOutputAccepted ? 'accepted' : 'unknown');
  const rawProviderParseSource = safeText(data.providerParseSource || data.provider_parse_source, 80) || 'unknown';
  const rawProviderParseStatus = safeText(
    data.providerParseStatus || data.provider_parse_status,
    80,
  ) || (providerResponseParsed ? 'parsed' : 'unknown');
  const providerSchemaMismatchFields = Array.isArray(
    data.providerSchemaMismatchFields || data.provider_schema_mismatch_fields,
  )
    ? (data.providerSchemaMismatchFields || data.provider_schema_mismatch_fields)
      .map((field) => safeText(field, 80))
      .filter(Boolean)
      .slice(0, 12)
    : [];
  const providerSuggestionUsed = normalizeAssistantBoolean(
    data.providerSuggestionUsed ?? data.provider_suggestion_used,
    false,
  );
  const providerSuggestionAccepted = normalizeAssistantBoolean(
    data.providerSuggestionAccepted ?? data.provider_suggestion_accepted,
    providerSuggestionUsed,
  );
  const providerSuggestionBlockedByRubric = normalizeAssistantBoolean(
    data.providerSuggestionBlockedByRubric ?? data.provider_suggestion_blocked_by_rubric,
    false,
  );
  const providerRubricDecision = safeText(
    data.providerRubricDecision || data.provider_rubric_decision,
    80,
  ) || (providerSuggestionBlockedByRubric
    ? 'metadata_not_propagated'
    : providerSuggestionUsed
      ? 'approved'
      : 'not_evaluated');
  const rawProviderRubricBlockedReason = safeText(
    data.providerRubricBlockedReason || data.provider_rubric_blocked_reason,
    80,
  ) || (providerSuggestionBlockedByRubric ? 'metadata_not_propagated' : 'none');
  const providerRubricBlockedReason = providerSuggestionBlockedByRubric
    && ['unknown', 'provider_blocked_reason'].includes(rawProviderRubricBlockedReason)
    ? 'metadata_not_propagated'
    : rawProviderRubricBlockedReason;
  const providerRubricBlockedCategories = Array.isArray(
    data.providerRubricBlockedCategories || data.provider_rubric_blocked_categories,
  )
    ? (data.providerRubricBlockedCategories || data.provider_rubric_blocked_categories)
      .map((category) => safeText(category, 80))
      .filter(Boolean)
      .slice(0, 12)
    : providerSuggestionBlockedByRubric
      ? ['metadata_not_propagated']
      : [];
  const normalizedProviderGateChecks = normalizeAssistantProviderGateChecks(data.providerGateChecks || data.provider_gate_checks);
  const responseMode = safeText(data.responseMode || data.response_mode, 80) || safeText(data.mode, 80) || 'unknown';
  const responseSource = safeText(data.responseSource || data.response_source, 80) || safeText(data.source, 80) || 'unknown';
  const finalDraftSource = safeText(data.finalDraftSource || data.final_draft_source, 80)
    || (providerSuggestionUsed
      || (normalizedProviderGateChecks.providerCallSucceeded && responseMode === 'provider_real' && responseSource === 'server_provider')
      ? 'provider'
      : serverFallbackUsed
        ? 'server_fallback'
        : localFallbackUsed
          ? 'local_fallback'
          : 'none');
  const providerSucceededWithServerFallback =
    normalizedProviderGateChecks.providerCallSucceeded === true
    && finalDraftSource === 'server_fallback';
  const providerOutputAcceptedReason =
    providerSucceededWithServerFallback && rawProviderOutputAcceptedReason === 'unknown'
      ? 'metadata_missing'
      : providerSucceededWithServerFallback
        && providerSuggestionBlockedByRubric
        && rawProviderOutputAcceptedReason === 'accepted'
        ? 'valid_schema_but_blocked_by_rubric'
      : rawProviderOutputAcceptedReason;
  const providerParseSource =
    providerSucceededWithServerFallback && rawProviderParseSource === 'unknown'
      ? 'metadata_not_propagated'
      : rawProviderParseSource;
  const providerParseStatus =
    providerSucceededWithServerFallback && rawProviderParseStatus === 'unknown'
      ? 'metadata_missing'
      : rawProviderParseStatus;
  const rawProviderSuggestionFallbackReason = safeText(
    data.providerSuggestionFallbackReason || data.provider_suggestion_fallback_reason,
    80,
  ) || (providerSuggestionUsed
    ? 'none'
    : providerSucceededWithServerFallback ? 'metadata_not_propagated' : 'unknown');
  const providerSuggestionFallbackReason = rawProviderSuggestionFallbackReason === 'provider_blocked_reason'
    ? 'blocked_by_rubric'
    : rawProviderSuggestionFallbackReason;
  const conversationStateAcknowledged = normalizeAssistantBoolean(
    data.conversationStateAcknowledged ?? data.conversation_state_acknowledged,
    false,
  );
  const conversationStateAligned = normalizeAssistantBoolean(
    data.conversationStateAligned ?? data.conversation_state_aligned,
    false,
  );
  const conversationStateKnownFacts = normalizeAssistantStringList(
    data.conversationStateKnownFacts || data.conversation_state_known_facts,
  ).slice(0, 8);
  const conversationStateMissingFacts = normalizeAssistantStringList(
    data.conversationStateMissingFacts || data.conversation_state_missing_facts,
  ).slice(0, 6);
  const conversationStateRiskFlags = normalizeAssistantStringList(
    data.conversationStateRiskFlags || data.conversation_state_risk_flags,
  ).slice(0, 6);
  const conversationStateNextExpectedField = safeText(
    data.conversationStateNextExpectedField || data.conversation_state_next_expected_field,
    80,
  ) || 'unknown';
  const conversationStateLatestAnsweredField = safeText(
    data.conversationStateLatestAnsweredField || data.conversation_state_latest_answered_field,
    80,
  ) || 'unknown';
  const conversationStateShouldAvoidRepeatingQuestion = normalizeAssistantBoolean(
    data.conversationStateShouldAvoidRepeatingQuestion
      ?? data.conversation_state_should_avoid_repeating_question,
    false,
  );
  const conversationInterpretationAcknowledged = normalizeAssistantBoolean(
    data.conversationInterpretationAcknowledged ?? data.conversation_interpretation_acknowledged,
    false,
  );
  const conversationInterpretationAligned = normalizeAssistantBoolean(
    data.conversationInterpretationAligned ?? data.conversation_interpretation_aligned,
    false,
  );
  const conversationInterpretationInferredIntent = safeText(
    data.conversationInterpretationInferredIntent || data.conversation_interpretation_inferred_intent,
    80,
  ) || 'unknown';
  const conversationInterpretationLatestAnsweredField = safeText(
    data.conversationInterpretationLatestAnsweredField
      || data.conversation_interpretation_latest_answered_field,
    80,
  ) || 'unknown';
  const conversationInterpretationNextExpectedField = safeText(
    data.conversationInterpretationNextExpectedField || data.conversation_interpretation_next_expected_field,
    80,
  ) || 'unknown';
  const conversationInterpretationShouldAvoidRepeatingQuestion = normalizeAssistantBoolean(
    data.conversationInterpretationShouldAvoidRepeatingQuestion
      ?? data.conversation_interpretation_should_avoid_repeating_question,
    false,
  );
  const providerPlaybookAcknowledged = normalizeAssistantBoolean(
    data.providerPlaybookAcknowledged ?? data.provider_playbook_acknowledged,
    false,
  );
  const providerPlaybookAligned = normalizeAssistantBoolean(
    data.providerPlaybookAligned ?? data.provider_playbook_aligned,
    false,
  );
  const providerPlaybookId = safeText(data.providerPlaybookId || data.provider_playbook_id, 80) || 'unknown';
  const replyBriefAcknowledged = normalizeAssistantBoolean(
    data.replyBriefAcknowledged ?? data.reply_brief_acknowledged,
    false,
  );
  const replyBriefAligned = normalizeAssistantBoolean(
    data.replyBriefAligned ?? data.reply_brief_aligned,
    false,
  );
  const replyExpectedQuestion = safeText(data.replyExpectedQuestion || data.reply_expected_question, 180);
  const replyPrimaryGoal = safeText(data.replyPrimaryGoal || data.reply_primary_goal, 80) || 'unknown';
  const replySafetyChecks = Array.isArray(data.replySafetyChecks || data.reply_safety_checks)
    ? (data.replySafetyChecks || data.reply_safety_checks)
      .map((check) => safeText(check, 80))
      .filter(Boolean)
      .slice(0, 8)
    : [];
  const replyStrategy = safeText(data.replyStrategy || data.reply_strategy, 80) || 'unknown';
  const replyContinuityAcknowledged = normalizeAssistantBoolean(
    data.replyContinuityAcknowledged ?? data.reply_continuity_acknowledged,
    false,
  );
  const replyContinuityAligned = normalizeAssistantBoolean(
    data.replyContinuityAligned ?? data.reply_continuity_aligned,
    false,
  );
  const replyContinuityAcknowledgement = safeText(
    data.replyContinuityAcknowledgement || data.reply_continuity_acknowledgement,
    80,
  ) || 'unknown';
  const replyContinuityNextMove = safeText(
    data.replyContinuityNextMove || data.reply_continuity_next_move,
    80,
  ) || 'unknown';
  const providerDiagnosticsSource = safeText(
    data.providerDiagnosticsSource || data.provider_diagnostics_source,
    80,
  ) || (edgeResponseAccepted ? 'edge' : 'unknown');
  const providerGateChecksSource = safeText(
    data.providerGateChecksSource || data.provider_gate_checks_source,
    80,
  ) || providerDiagnosticsSource;

  return {
    accepted: data.accepted !== false,
    blockedReason: safeText(data.blockedReason || data.blocked_reason, 120),
    canUseDraft,
    confidence: Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : 0,
    contextLabels: normalizeAssistantStringList(data.contextLabels || data.context_labels),
    contextPackSignals: normalizeAssistantStringList(data.contextPackSignals || data.context_pack_signals),
    contextPackSource: safeText(data.contextPackSource || data.context_pack_source, 80),
    contextPackSummary: safeText(data.contextPackSummary || data.context_pack_summary, 260),
    contextPackTruncated: normalizeAssistantBoolean(data.contextPackTruncated ?? data.context_pack_truncated, false),
    detectedIntent: {
      id: safeText(detectedIntent.id, 80) || 'ambiguous',
      label: safeText(detectedIntent.label, 160) || 'Mensagem inicial ou assunto indefinido',
      reason: safeText(detectedIntent.reason, 240) || 'A leitura segura manteve a resposta conservadora.',
    },
    draftQualityFlags: normalizeAssistantStringList(data.draftQualityFlags || data.draft_quality_flags),
    draftQualityReasons: normalizeAssistantStringList(data.draftQualityReasons || data.draft_quality_reasons),
    draftQualityStatus,
    edgeConversationResolved: normalizeAssistantBoolean(data.edgeConversationResolved ?? data.edge_conversation_resolved, false),
    edgeNoSuggestionReason: safeText(data.edgeNoSuggestionReason || data.edge_no_suggestion_reason, 100) || 'unknown',
    edgeResponseAccepted,
    edgeResponseUsed: normalizeAssistantBoolean(
      data.edgeResponseUsed ?? data.edge_response_used,
      edgeResponseAccepted && serverSuggestionUsed,
    ),
    edgeSettingsRead: normalizeAssistantBoolean(data.edgeSettingsRead ?? data.edge_settings_read, false),
    edgeSettingsReadSource: safeText(data.edgeSettingsReadSource || data.edge_settings_read_source, 80) || 'unknown',
    edgeSettingsReadStatus: safeText(data.edgeSettingsReadStatus || data.edge_settings_read_status, 80) || 'unknown',
    edgeTenantResolved: normalizeAssistantBoolean(data.edgeTenantResolved ?? data.edge_tenant_resolved, false),
    hasEnoughText: Boolean(data.hasEnoughText ?? data.has_enough_text ?? data.replyDraft ?? data.reply_draft),
    mode: safeText(data.mode, 40) || 'off',
    model: safeText(data.model, 80) || 'local-rule-based',
    playbookAllowedNextStep: safeText(
      data.playbookAllowedNextStep
        || data.playbook_allowed_next_step
        || selectedPlaybook.allowedNextStep
        || selectedPlaybook.allowed_next_step,
      180,
    ),
    playbookId: safeText(
      data.playbookId
        || data.playbook_id
        || selectedPlaybook.playbookId
        || selectedPlaybook.playbook_id,
      80,
    ),
    playbookLabel: safeText(
      data.playbookLabel
        || data.playbook_label
        || selectedPlaybook.playbookLabel
        || selectedPlaybook.playbook_label
        || selectedPlaybook.label,
      140,
    ),
    playbookObjective: safeText(
      data.playbookObjective
        || data.playbook_objective
        || selectedPlaybook.objective,
      220,
    ),
    playbookProhibitedClaims: normalizeAssistantStringList(
      data.playbookProhibitedClaims
        || data.playbook_prohibited_claims
        || selectedPlaybook.prohibitedClaims
        || selectedPlaybook.prohibited_claims,
    ),
    playbookRecommendedNextStep: safeText(
      data.playbookRecommendedNextStep
        || data.playbook_recommended_next_step
        || selectedPlaybook.recommendedNextStep
        || selectedPlaybook.recommended_next_step,
      180,
    ),
    playbookTone: safeText(data.playbookTone || data.playbook_tone || selectedPlaybook.tone, 120),
    provider: safeText(data.provider, 40) || 'off',
    contextInputCharsBucket: safeText(data.contextInputCharsBucket || data.context_input_chars_bucket, 80) || 'unknown',
    inputCharsBucket: safeText(data.inputCharsBucket || data.input_chars_bucket, 80) || 'unknown',
    maxOutputTokensBucket: safeText(data.maxOutputTokensBucket || data.max_output_tokens_bucket, 80) || 'unknown',
    providerAbortReason: safeText(data.providerAbortReason || data.provider_abort_reason, 80) || 'unknown',
    providerDiagnosticsSource,
    providerEndpointFamily: safeText(data.providerEndpointFamily || data.provider_endpoint_family, 80) || 'unknown',
    providerElapsedMsBucket: safeText(data.providerElapsedMsBucket || data.provider_elapsed_ms_bucket, 80) || 'not_measured',
    providerFetchAborted: normalizeAssistantBoolean(data.providerFetchAborted ?? data.provider_fetch_aborted, false),
    providerFetchSettled: normalizeAssistantBoolean(data.providerFetchSettled ?? data.provider_fetch_settled, false),
    providerFailureKind: safeText(data.providerFailureKind || data.provider_failure_kind, 80) || 'provider_not_called',
    providerFailureRetryable: typeof (data.providerFailureRetryable ?? data.provider_failure_retryable) === 'boolean'
      ? (data.providerFailureRetryable ?? data.provider_failure_retryable)
      : null,
    providerFailureStage: safeText(data.providerFailureStage || data.provider_failure_stage, 80) || 'unknown',
    providerFailureStatus: safeText(data.providerFailureStatus || data.provider_failure_status, 80) || 'unknown',
    providerGateChecks: normalizedProviderGateChecks,
    providerGateChecksAreServerSide: normalizeAssistantBoolean(
      data.providerGateChecksAreServerSide ?? data.provider_gate_checks_are_server_side,
      providerGateChecksSource === 'edge',
    ),
    providerGateChecksSource,
    providerHttpStatus: Number.isFinite(Number(data.providerHttpStatus ?? data.provider_http_status))
      ? Number(data.providerHttpStatus ?? data.provider_http_status)
      : null,
    providerModelLabel: safeText(data.providerModelLabel || data.provider_model_label, 80)
      || safeText(data.model, 80)
      || 'unknown',
    providerRequestStarted: normalizeAssistantBoolean(data.providerRequestStarted ?? data.provider_request_started, false),
    providerOutputAcceptedReason,
    providerOutputAccepted,
    providerParseSource,
    providerParseStatus,
    providerResponseParsed,
    providerSchemaMismatchFields,
    providerRubricBlockedCategories,
    providerRubricBlockedReason,
    providerRubricDecision,
    providerSecretCheckName: safeText(data.providerSecretCheckName || data.provider_secret_check_name, 80) || 'not_checked',
    providerSuggestionAccepted,
    providerSuggestionBlockedByRubric,
    providerSuggestionFallbackReason,
    providerSuggestionUsed,
    conversationStateAcknowledged,
    conversationStateAligned,
    conversationStateKnownFacts,
    conversationStateLatestAnsweredField,
    conversationStateMissingFacts,
    conversationStateNextExpectedField,
    conversationStateRiskFlags,
    conversationStateShouldAvoidRepeatingQuestion,
    conversationInterpretationAcknowledged,
    conversationInterpretationAligned,
    conversationInterpretationInferredIntent,
    conversationInterpretationLatestAnsweredField,
    conversationInterpretationNextExpectedField,
    conversationInterpretationShouldAvoidRepeatingQuestion,
    providerPlaybookAcknowledged,
    providerPlaybookAligned,
    providerPlaybookId,
    replyBriefAcknowledged,
    replyBriefAligned,
    replyExpectedQuestion,
    replyPrimaryGoal,
    replySafetyChecks,
    replyStrategy,
    replyContinuityAcknowledged,
    replyContinuityAligned,
    replyContinuityAcknowledgement,
    replyContinuityNextMove,
    providerSkipReason: safeText(data.providerSkipReason || data.provider_skip_reason, 80) || 'unknown',
    providerTimeoutMsBucket: safeText(data.providerTimeoutMsBucket || data.provider_timeout_ms_bucket, 80) || 'unknown',
    providerTimeoutSource: safeText(data.providerTimeoutSource || data.provider_timeout_source, 80) || 'unknown',
    allowedTenantSource: safeText(data.allowedTenantSource || data.allowed_tenant_source, 80) || 'unknown',
    redactionCount: Number.isFinite(Number(data.redactionCount ?? data.redaction_count))
      ? Number(data.redactionCount ?? data.redaction_count)
      : 0,
    replyPlan: {
      humanReviewRequired: normalizeAssistantBoolean(
        replyPlan.humanReviewRequired ?? replyPlan.human_review_required,
        true,
      ),
      intent: safeText(replyPlan.intent, 80) || 'clarify_patient_goal',
      nextAction: safeText(replyPlan.nextAction || replyPlan.next_action, 220),
      nextQuestion: safeText(replyPlan.nextQuestion || replyPlan.next_question, 180),
      playbookId: safeText(replyPlan.playbookId || replyPlan.playbook_id, 80),
      source: safeText(replyPlan.source, 80) || 'playbook_conversation_cues',
      tone: safeText(replyPlan.tone, 120),
      sent: false,
    },
    replyContinuity: {
      acknowledgement: safeText(replyContinuity.acknowledgement, 80) || 'acknowledge_patient_message',
      guardrails: normalizeAssistantStringList(replyContinuity.guardrails).slice(0, 8),
      humanReviewFocus: safeText(
        replyContinuity.humanReviewFocus || replyContinuity.human_review_focus,
        80,
      ) || 'general_review',
      nextMove: safeText(replyContinuity.nextMove || replyContinuity.next_move, 80) || 'advance_to_human_review',
      shouldAskFollowUp: normalizeAssistantBoolean(
        replyContinuity.shouldAskFollowUp ?? replyContinuity.should_ask_follow_up,
        false,
      ),
      source: safeText(replyContinuity.source, 80) || 'dialog_state_reply_plan',
      sent: false,
    },
    replyDraft,
    safeSummary,
    safetyNotes: normalizeAssistantStringList(data.safetyNotes || data.safety_notes),
    safeToUseAsDraft,
    sent: false,
    finalDraftOriginLabel: safeText(data.finalDraftOriginLabel || data.final_draft_origin_label, 80)
      || (finalDraftSource === 'provider'
        ? 'Gerado por IA real'
        : finalDraftSource === 'server_fallback'
          ? 'Fallback seguro do servidor'
          : finalDraftSource === 'local_fallback'
            ? 'Fallback local'
            : 'Sem rascunho'),
    finalDraftSource,
    localFallbackUsed,
    responseMode,
    responseSource,
    requestPayloadSizeBucket: safeText(data.requestPayloadSizeBucket || data.request_payload_size_bucket, 80) || 'unknown',
    responseFormatMode: safeText(data.responseFormatMode || data.response_format_mode, 80) || 'unknown',
    serverFallbackUsed,
    serverSuggestionUsed,
    source: safeText(data.source, 80) || 'server_off',
    stateLabel: safeText(data.stateLabel || data.state_label, 120) || 'Assistente seguro',
    suggestedNextStep: {
      description: safeText(suggestedNextStep.description, 240) || 'Ler a conversa e escolher o próximo passo humano com segurança.',
      label: safeText(suggestedNextStep.label, 160) || 'Ler conversa antes de responder',
    },
    tenantPlaybookPolicy,
    tenantSettingsSource: safeText(data.tenantSettingsSource || data.tenant_settings_source, 80) || 'fallback',
    tenantSettingsStatus: safeText(data.tenantSettingsStatus || data.tenant_settings_status, 80) || 'not_used',
  };
};

export const generateAttendanceAssistantDraft = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return generateMockOmnichannelAttendanceAssistantDraft(tenantId, conversationId);
  }

  const { data, error } = await supabase.functions.invoke('omnichannel-attendance-assistant', {
    body: {
      conversation_id: safeText(conversationId, 120),
    },
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível gerar a sugestão segura do assistente.');
  }

  if (data?.accepted === false) {
    throw new Error('Sugestão segura indisponível para esta conversa.');
  }

  return normalizeAttendanceAssistantDraft(data);
};

const normalizeAttendanceAssistantFeedback = (data = {}, fallback = {}) => {
  const feedback = data.feedback && typeof data.feedback === 'object' ? data.feedback : data;

  return {
    accepted: data.accepted !== false,
    createdAt: safeText(feedback.createdAt || feedback.created_at, 80) || null,
    feedbackReason: safeText(
      feedback.feedbackReason
        || feedback.feedback_reason
        || fallback.feedbackReason
        || fallback.feedback_reason,
      80,
    ) || null,
    feedbackValue: safeText(
      feedback.feedbackValue
        || feedback.feedback_value
        || fallback.feedbackValue
        || fallback.feedback_value,
      40,
    ),
    sent: false,
    usedAsDraft: Boolean(
      feedback.usedAsDraft
        ?? feedback.used_as_draft
        ?? fallback.usedAsDraft
        ?? fallback.used_as_draft
        ?? false,
    ),
  };
};

const mapAttendanceAssistantFeedbackMetric = (row = {}) => ({
  assistantMode: safeText(row.assistant_mode, 40),
  createdAt: safeText(row.created_at, 80) || null,
  draftQualityStatus: safeText(row.draft_quality_status, 80),
  feedbackReason: safeText(row.feedback_reason, 80) || null,
  feedbackValue: safeText(row.feedback_value, 40),
  model: safeText(row.model, 80),
  playbookId: safeText(row.playbook_id, 80),
  provider: safeText(row.provider, 40),
  source: 'Supabase',
  usedAsDraft: Boolean(row.used_as_draft),
});

const buildAttendanceAssistantFeedbackRequest = (conversationId, input = {}) => ({
  action: 'record_feedback',
  assistant_mode: safeText(input.assistantMode || input.assistant_mode || input.mode, 40),
  conversation_id: safeText(conversationId, 120),
  draft_quality_status: safeText(input.draftQualityStatus || input.draft_quality_status, 80),
  feedback_reason: safeText(input.feedbackReason || input.feedback_reason, 80),
  feedback_value: safeText(input.feedbackValue || input.feedback_value, 40),
  generated_at: safeText(input.generatedAt || input.generated_at, 80),
  model: safeText(input.model, 80),
  playbook_id: safeText(input.playbookId || input.playbook_id, 80),
  provider: safeText(input.provider, 40),
  used_as_draft: Boolean(input.usedAsDraft ?? input.used_as_draft ?? false),
});

export const recordAttendanceAssistantFeedback = async (tenantId, conversationId, input = {}) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return recordMockOmnichannelAttendanceAssistantFeedback(tenantId, conversationId, input);
  }

  const body = buildAttendanceAssistantFeedbackRequest(conversationId, input);

  const { data, error } = await supabase.functions.invoke('omnichannel-attendance-assistant', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Não foi possível registrar o feedback do assistente.');
  }

  if (data?.accepted === false) {
    throw new Error('Feedback do assistente indisponível para esta conversa.');
  }

  return normalizeAttendanceAssistantFeedback(data, body);
};

export const listAttendanceAssistantFeedback = async (tenantId, options = {}) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelAttendanceAssistantFeedback(tenantId);
  }

  const limit = Math.min(Math.max(Number(options.limit || 500), 1), 500);
  let query = supabase
    .from('omnichannel_assistant_feedback')
    .select(assistantFeedbackSelect)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.since) {
    query = query.gte('created_at', safeText(options.since, 80));
  }

  const response = await query;

  if (response.error) {
    return listMockOmnichannelAttendanceAssistantFeedback(tenantId);
  }

  return (response.data || []).map(mapAttendanceAssistantFeedbackMetric).filter(Boolean);
};

export const listOmnichannelTriageSettings = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelTriageSettings(tenantId);
  }

  const response = await supabase
    .from('omnichannel_triage_settings')
    .select(triageSettingSelect)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (response.error) {
    return listMockOmnichannelTriageSettings(tenantId);
  }

  return (response.data || []).map(mapTriageSetting).filter(Boolean);
};

export const getOmnichannelTriageSettings = async (tenantId) => {
  const settings = await listOmnichannelTriageSettings(tenantId);
  return settings[0] || getMockOmnichannelTriageSettings(tenantId);
};

export const listOmnichannelAutoReplyTestAllowlist = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelAutoReplyTestAllowlist(tenantId);
  }

  const response = await supabase
    .from('omnichannel_auto_reply_test_allowlist')
    .select(autoReplyAllowlistSelect)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (response.error) {
    return listMockOmnichannelAutoReplyTestAllowlist(tenantId);
  }

  return (response.data || []).map(mapAutoReplyAllowlistEntry).filter(Boolean);
};

export const listOmnichannelAutoReplyAttempts = async (tenantId, options = {}) => {
  const conversationId = String(
    typeof options === 'string' ? options : options?.conversationId || '',
  ).trim();
  const requestedLimit = Number(typeof options === 'object' ? options?.limit : 20);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50)
    : 20;

  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelAutoReplyAttempts(tenantId, { conversationId, limit });
  }

  let query = supabase
    .from('omnichannel_auto_reply_attempts')
    .select(autoReplyAttemptSelect)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (conversationId) {
    query = query.eq('conversation_id', conversationId);
  }

  const response = await query;

  if (response.error) {
    return listMockOmnichannelAutoReplyAttempts(tenantId, { conversationId, limit });
  }

  return (response.data || []).map(mapAutoReplyAttempt).filter(Boolean);
};

export const listOmnichannelTriageFlows = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelTriageFlows(tenantId);
  }

  const response = await supabase
    .from('omnichannel_triage_flows')
    .select(triageFlowSelect)
    .eq('tenant_id', tenantId)
    .order('status', { ascending: true })
    .order('updated_at', { ascending: false });

  if (response.error) {
    return listMockOmnichannelTriageFlows(tenantId);
  }

  return (response.data || []).map(mapTriageFlow).filter(Boolean);
};

export const listOmnichannelTriageQuestions = async (tenantId, flowId = null) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelTriageQuestions(tenantId, flowId);
  }

  let query = supabase
    .from('omnichannel_triage_questions')
    .select(triageQuestionSelect)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('position', { ascending: true });

  if (flowId) {
    query = query.eq('flow_id', flowId);
  }

  const response = await query;

  if (response.error) {
    return listMockOmnichannelTriageQuestions(tenantId, flowId);
  }

  return (response.data || []).map(mapTriageQuestion).filter(Boolean);
};

export const listOmnichannelTriageIntents = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelTriageIntents(tenantId);
  }

  const response = await supabase
    .from('omnichannel_triage_intents')
    .select(triageIntentSelect)
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .order('label', { ascending: true });

  if (response.error) {
    return listMockOmnichannelTriageIntents(tenantId);
  }

  return (response.data || []).map(mapTriageIntent).filter(Boolean);
};

export const getConversationTriageResult = async (tenantId, conversationId) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return getMockConversationTriageResult(tenantId, conversationId);
  }

  const response = await supabase
    .from('omnichannel_conversation_triage_results')
    .select(triageResultSelect)
    .eq('tenant_id', tenantId)
    .eq('conversation_id', conversationId)
    .maybeSingle();

  if (response.error) {
    return getMockConversationTriageResult(tenantId, conversationId);
  }

  return response.data ? mapTriageResult(response.data) : null;
};

export const listConversationTriageResults = async (tenantId, conversationIds = []) => {
  const safeConversationIds = [...new Set(
    (Array.isArray(conversationIds) ? conversationIds : [])
      .map((conversationId) => String(conversationId || '').trim())
      .filter(Boolean),
  )].slice(0, MAX_CONVERSATION_PAGE_SIZE);

  if (!safeConversationIds.length) {
    return {};
  }

  if (!hasSupabase() || !tenantId) {
    return Object.fromEntries(
      safeConversationIds
        .map((conversationId) => [
          conversationId,
          getMockConversationTriageResult(tenantId, conversationId),
        ])
        .filter(([, result]) => Boolean(result)),
    );
  }

  const response = await supabase
    .from('omnichannel_conversation_triage_results')
    .select(triageResultSelect)
    .eq('tenant_id', tenantId)
    .in('conversation_id', safeConversationIds);

  if (response.error) {
    return {};
  }

  return Object.fromEntries(
    (response.data || [])
      .map(mapTriageResult)
      .filter(Boolean)
      .map((result) => [result.conversationId, result]),
  );
};

export const upsertConversationTriageResult = async (tenantId, conversationId, input = {}) => {
  if (!hasSupabase() || !tenantId || !conversationId) {
    return upsertMockConversationTriageResult(tenantId, conversationId, input);
  }

  const userId = await getAuthenticatedUserId();
  const payload = buildOmnichannelTriageResultPayload(input);
  const response = await supabase
    .from('omnichannel_conversation_triage_results')
    .upsert({
      ...payload,
      conversation_id: conversationId,
      created_by: userId,
      tenant_id: tenantId,
    }, {
      onConflict: 'tenant_id,conversation_id',
    })
    .select(triageResultSelect)
    .maybeSingle();

  if (response.error) {
    throw new Error(response.error.message || 'Não foi possível salvar o resultado de triagem.');
  }

  if (!response.data) {
    throw new Error('Resultado de triagem não foi salvo para este tenant.');
  }

  await recordOperationalActivitySafely(tenantId, conversationId, {
    activityType: 'internal_note',
    noteText: 'Resultado de triagem assistida salvo manualmente. Não enviado ao WhatsApp.',
    outcome: 'pending',
  });

  return mapTriageResult(response.data);
};

export const listOmnichannelTriageManagementSignals = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOmnichannelTriageManagementSignals(tenantId);
  }

  const response = await supabase
    .from('omnichannel_conversation_triage_results')
    .select(triageResultSelect)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (response.error) {
    return listMockOmnichannelTriageManagementSignals(tenantId);
  }

  return (response.data || []).map(mapTriageResult).filter(Boolean);
};

export const getChannelStatus = async (tenantId) => {
  const channels = await listChannels(tenantId);
  const channel = channels[0] || null;

  if (!channel) {
    return buildEmptyChannelStatus();
  }

  return {
    channel,
    isConfigured: Boolean(channel.isConfigured),
    source: channel.source,
    status: channel.status,
    statusLabel: channel.statusLabel,
  };
};

export const omnichannelRepository = {
  addInternalNote,
  addConversationActivity,
  assignConversationToMe,
  getChannelStatus,
  getConversation,
  getConversationDetail,
  getConversationTriageResult,
  getMessageMediaAccess,
  getOmnichannelTriageSettings,
  generateAttendanceAssistantDraft,
  listAttendanceAssistantFeedback,
  listOmnichannelAutoReplyAttempts,
  listOmnichannelAutoReplyTestAllowlist,
  linkConversationToLead,
  linkConversationToPatient,
  listChannels,
  listConversationActivities,
  listConversationActivitiesBatch,
  listConversationEvents,
  listConversationTriageResults,
  listConversations,
  listInternalNotes,
  listMessagesByConversation,
  listOmnichannelTriageFlows,
  listOmnichannelTriageIntents,
  listOmnichannelTriageManagementSignals,
  listOmnichannelTriageQuestions,
  listOmnichannelTriageSettings,
  markConversationRead,
  markConversationResolved,
  scheduleNextAction,
  sendManualReply,
  unassignConversation,
  unlinkConversationContext,
  updateConversationPriority,
  updateConversationStatus,
  updateConversationTriage,
  upsertConversationTriageResult,
};
