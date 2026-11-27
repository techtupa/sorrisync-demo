export const OMNICHANNEL_MANUAL_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const OMNICHANNEL_MANUAL_REPLY_WINDOW_STATUS = {
  blocked: 'blocked',
  closed: 'closed',
  open: 'open',
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const hasRecentInboundForManualReply = (messages = [], now = new Date()) => (
  messages.some((message) => {
    if (message.direction !== 'inbound') return false;
    const eventDate = parseDate(message.receivedAt || message.createdAt);
    if (!eventDate) return false;
    const elapsed = now.getTime() - eventDate.getTime();
    return elapsed >= 0 && elapsed <= OMNICHANNEL_MANUAL_REPLY_WINDOW_MS;
  })
);

const closedWindowState = {
  badgeLabel: 'Janela fechada',
  helperText: 'Este texto é um rascunho interno. Para retomar contato após 24h, use um template aprovado da Meta quando esse recurso estiver disponível.',
  isBlocked: false,
  isClosed: true,
  isOpen: false,
  label: 'Janela WhatsApp fechada',
  reason: 'Janela de atendimento não validada por mensagem inbound recente.',
  status: OMNICHANNEL_MANUAL_REPLY_WINDOW_STATUS.closed,
};

const openWindowState = {
  badgeLabel: 'Janela aberta',
  helperText: 'Resposta livre disponível enquanto houver mensagem inbound recente validando a janela WhatsApp.',
  isBlocked: false,
  isClosed: false,
  isOpen: true,
  label: 'Resposta livre disponível',
  reason: '',
  status: OMNICHANNEL_MANUAL_REPLY_WINDOW_STATUS.open,
};

const buildBlockedWindowState = (reason) => ({
  badgeLabel: 'Envio bloqueado',
  helperText: reason || 'Envio manual indisponível para esta conversa.',
  isBlocked: true,
  isClosed: false,
  isOpen: false,
  label: 'Resposta manual bloqueada',
  reason: reason || 'Envio manual indisponível para esta conversa.',
  status: OMNICHANNEL_MANUAL_REPLY_WINDOW_STATUS.blocked,
});

export const buildOmnichannelManualReplyWindowState = ({
  canManage = false,
  channelStatus = null,
  currentTenantId = '',
  messages = [],
  now = new Date(),
  selectedConversation = null,
} = {}) => {
  if (!canManage) return buildBlockedWindowState('Perfil sem permissão para enviar resposta manual.');
  if (!currentTenantId) return buildBlockedWindowState('Tenant clínico não encontrado para envio manual.');
  if (!selectedConversation) return buildBlockedWindowState('Selecione uma conversa antes de responder.');
  if (!channelStatus?.isConfigured) return buildBlockedWindowState('Canal WhatsApp oficial ainda não está ativo para envio.');
  if (!selectedConversation.channelId) return buildBlockedWindowState('Conversa sem canal válido para envio.');
  if (!selectedConversation.contactPhoneE164) return buildBlockedWindowState('Contato sem telefone válido para resposta manual.');
  if (!hasRecentInboundForManualReply(messages, now)) return closedWindowState;
  return openWindowState;
};

export const resolveOmnichannelQueueReplyWindowState = ({
  contactPhoneE164 = '',
  hasUnreadInbound = false,
  lastInboundAt = '',
  lastMessageAt = '',
  latestMessageDirection = '',
  now = new Date(),
} = {}) => {
  if (!contactPhoneE164) {
    return buildBlockedWindowState('Contato sem telefone válido para resposta manual.');
  }

  const inferredInboundAt = lastInboundAt
    || (hasUnreadInbound ? lastMessageAt : '')
    || (latestMessageDirection === 'inbound' ? lastMessageAt : '');
  const inboundDate = parseDate(inferredInboundAt);

  if (!inboundDate) return closedWindowState;

  const elapsed = now.getTime() - inboundDate.getTime();
  if (elapsed >= 0 && elapsed <= OMNICHANNEL_MANUAL_REPLY_WINDOW_MS) return openWindowState;
  return closedWindowState;
};
