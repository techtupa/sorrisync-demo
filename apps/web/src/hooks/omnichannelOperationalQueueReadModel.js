import {
  OMNICHANNEL_CHANNEL_FILTER_ALL,
  OMNICHANNEL_QUEUE_FILTER_ALL,
  buildOmnichannelChannelContext,
  buildOmnichannelQueueContext,
} from './omnichannelChannelQueueContextReadModel.js';
import {
  resolveOmnichannelQueueReplyWindowState,
} from './omnichannelManualReplyWindowReadModel.js';
import {
  buildOmnichannelSchedulingOperationsModel,
} from './omnichannelSchedulingOperationsReadModel.js';

export const OMNICHANNEL_OPERATIONAL_QUEUE_TIME_ZONE = 'America/Sao_Paulo';

export const OMNICHANNEL_OPERATIONAL_QUEUE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'respond_now', label: 'Responder agora' },
  { id: 'closed_window', label: 'Janela fechada' },
  { id: 'open', label: 'Abertas' },
  { id: 'waiting', label: 'Aguardando' },
  { id: 'unread', label: 'Não lidas' },
  { id: 'mine', label: 'Minhas' },
  { id: 'unassigned', label: 'Sem responsável' },
  { id: 'high_priority', label: 'Prioridade alta' },
  { id: 'scheduling_attention', label: 'Agenda: atenção' },
  { id: 'unlinked', label: 'Sem vínculo CRM' },
  { id: 'resolved', label: 'Resolvidas' },
  { id: 'archived', label: 'Arquivadas' },
  { id: 'overdue', label: 'Retorno vencido' },
];

const HIGH_PRIORITIES = new Set(['high', 'urgent']);
const OPEN_STATUSES = new Set(['open', 'active']);
const WAITING_STATUSES = new Set(['waiting', 'pending']);
const RESOLVED_STATUSES = new Set(['resolved', 'closed']);
const ARCHIVED_STATUSES = new Set(['archived']);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const RECENT_HANDLING_WINDOW_MS = 48 * 60 * 60 * 1000;

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: OMNICHANNEL_OPERATIONAL_QUEUE_TIME_ZONE,
  year: 'numeric',
});

const safeText = (value, fallback = '', maxLength = 96) => {
  const rawText = typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
  const normalized = rawText.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const normalizeText = (value) => safeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const toList = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

const parseDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTimestamp = (value) => parseDate(value)?.getTime() || 0;

export const formatOmnichannelQueueDateKey = (value = new Date()) => {
  const date = parseDate(value);
  if (!date) return '';

  const parts = Object.fromEntries(
    dateKeyFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const maskOmnichannelQueuePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Não informado';

  const country = digits.length > 10 ? `+${digits.slice(0, 2)}` : '+**';
  return `${country} *****-${digits.slice(-2)}`;
};

export const formatOmnichannelQueuePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Não informado';

  if (digits.length >= 12 && digits.startsWith('55')) {
    const local = digits.slice(4);
    const prefixLength = local.length > 8 ? 5 : 4;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`;
  }

  if (digits.length >= 10 && digits.length <= 11) {
    const local = digits.slice(2);
    const prefixLength = local.length > 8 ? 5 : 4;
    return `(${digits.slice(0, 2)}) ${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`;
  }

  return value ? String(value) : 'Não informado';
};

const getConversationActivities = (activitiesByConversation, conversationId) => {
  const directActivities = activitiesByConversation?.[conversationId];
  if (Array.isArray(directActivities)) return directActivities;

  return [];
};

const resolveLatestNextActionAt = (activities) => {
  const scheduledActivities = activities
    .filter((activity) => activity?.nextActionAt || activity?.next_action_at)
    .sort((first, second) => (
      getTimestamp(second.createdAt || second.created_at || second.updatedAt || second.updated_at)
      - getTimestamp(first.createdAt || first.created_at || first.updatedAt || first.updated_at)
    ));

  return scheduledActivities[0]?.nextActionAt || scheduledActivities[0]?.next_action_at || null;
};

const hasRecentTreatment = (conversation, nowTime) => {
  const handledTime = getTimestamp(conversation.lastHandledAt || conversation.last_handled_at);
  if (!handledTime) return false;

  return nowTime - handledTime <= RECENT_HANDLING_WINDOW_MS;
};

const resolveStatusLabel = (status) => {
  if (RESOLVED_STATUSES.has(status)) return 'Resolvida';
  if (ARCHIVED_STATUSES.has(status)) return 'Arquivada';
  if (WAITING_STATUSES.has(status)) return 'Aguardando';
  return 'Aberta';
};

const resolvePriorityLabel = (priority) => {
  if (priority === 'urgent') return 'Urgente';
  if (priority === 'high') return 'Alta';
  return 'Normal';
};

export const resolveOmnichannelQueueReason = ({
  hasAnyLink,
  hasUnreadInbound,
  isDueToday,
  isHighPriority,
  isOpen,
  isOverdue,
  isResolved,
  isUnassigned,
  isWaiting,
  schedulingRequiresHuman,
  withoutRecentTreatment,
}) => {
  if (hasUnreadInbound) return 'Nova mensagem inbound não lida';
  if (schedulingRequiresHuman) return 'Agenda precisa de revisão humana';
  if (isResolved) return 'Resolvida recentemente';
  if (isOverdue) return 'Retorno vencido';
  if (isDueToday) return 'Retorno programado para hoje';
  if (isHighPriority) return 'Prioridade alta ou urgente';
  if (!hasAnyLink) return 'Sem vínculo CRM';
  if (isUnassigned) return 'Sem responsável';
  if (isOpen && withoutRecentTreatment) return 'Conversa aberta sem tratamento';
  if (isWaiting) return 'Aguardando retorno';
  return 'Sem nova ação pendente';
};

const buildAttentionReasons = ({
  hasAnyLink,
  hasUnreadInbound,
  isHighPriority,
  isStalled,
  isUnassigned,
  respondNow,
  schedulingRequiresHuman,
}) => [
  hasUnreadInbound ? 'Não lida' : '',
  schedulingRequiresHuman ? 'Agenda precisa de humano' : '',
  isUnassigned ? 'Sem responsável' : '',
  !hasAnyLink ? 'Sem vínculo CRM' : '',
  respondNow ? 'Responder agora' : '',
  isStalled ? 'Parada' : '',
  isHighPriority ? 'Alta prioridade' : '',
].filter(Boolean);

export const buildOmnichannelQueuePriorityModel = ({
  hasAnyLink,
  hasUnreadInbound,
  isArchived,
  isAssignedToMe,
  isDueToday,
  isHighPriority,
  isOpen,
  isOverdue,
  isResolved,
  isUnassigned,
  isWaiting,
  schedulingRequiresHuman = false,
  withoutRecentTreatment,
}) => {
  const isStalled = Boolean(!isResolved && !isArchived && withoutRecentTreatment);
  const respondNow = Boolean(!isResolved && !isArchived && (
    hasUnreadInbound
    || isOverdue
    || isDueToday
    || isHighPriority
    || withoutRecentTreatment
  ));
  const attentionReasons = buildAttentionReasons({
    hasAnyLink,
    hasUnreadInbound,
    isHighPriority,
    isStalled,
    isUnassigned,
    respondNow,
    schedulingRequiresHuman,
  });
  const attentionScore = [
    isArchived ? -80 : 0,
    isResolved ? -60 : 0,
    respondNow ? 100 : 0,
    hasUnreadInbound ? 90 : 0,
    schedulingRequiresHuman ? 120 : 0,
    isOverdue ? 80 : 0,
    isDueToday ? 70 : 0,
    isHighPriority ? 55 : 0,
    isUnassigned ? 38 : 0,
    !hasAnyLink ? 30 : 0,
    isStalled ? 28 : 0,
    isAssignedToMe ? 18 : 0,
    isOpen ? 12 : 0,
    isWaiting ? 8 : 0,
  ].reduce((total, value) => total + value, 0);

  return {
    attentionReasons,
    attentionScore,
    isStalled,
    primaryAttentionLabel: respondNow ? 'Responder agora' : attentionReasons[0] || 'Acompanhar',
    respondNow,
  };
};

const resolveNextManualAction = (reason) => {
  if (reason === 'Nova mensagem inbound não lida') return 'Ler entrada e decidir resposta manual';
  if (reason === 'Agenda precisa de revisão humana') return 'Assumir a conversa e revisar a Agenda';
  if (reason === 'Retorno vencido') return 'Registrar contato manual atrasado';
  if (reason === 'Retorno programado para hoje') return 'Executar retorno manual hoje';
  if (reason === 'Prioridade alta ou urgente') return 'Priorizar atendimento e registrar ação';
  if (reason === 'Sem responsável') return 'Assumir ou atribuir responsável';
  if (reason === 'Sem vínculo CRM') return 'Vincular paciente ou lead antes de continuar';
  if (reason === 'Conversa aberta sem tratamento') return 'Abrir triagem e registrar primeira ação';
  if (reason === 'Aguardando retorno') return 'Acompanhar no horário programado';
  if (reason === 'Resolvida recentemente') return 'Consultar histórico operacional';
  return 'Revisar triagem quando houver nova entrada';
};

const resolveSuggestedDestination = ({
  hasLeadLink,
  hasPatientLink,
  isResolved,
  scheduling,
}) => {
  if (scheduling?.requiresHuman) return 'Agenda pelo WhatsApp';
  if (scheduling?.hasSchedulingFlow) return scheduling.isCompleted ? 'Histórico da Agenda' : 'Agenda pelo WhatsApp';
  if (isResolved) return 'Histórico operacional';
  if (hasPatientLink) return 'CRM/Pacientes ou Agenda';
  if (hasLeadLink) return 'CRM/Pacientes';
  return 'Vincular paciente/lead';
};

const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');

const resolveLatestInteractionDirectionLabel = (direction = '') => {
  const value = safeText(direction).toLowerCase();
  if (value === 'inbound') return 'Cliente';
  if (value === 'outbound') return 'Clínica';
  return 'Interação';
};

const buildSearchText = (item) => normalizeText([
  item.contato,
  item.maskedPhone,
  item.reason,
  item.nextManualAction,
  item.linkLabel,
  item.statusLabel,
  item.priorityLabel,
  item.assignedToLabel,
  item.latestMessagePreview,
  item.latestInteractionDirectionLabel,
  item.latestMessageTypeLabel,
  item.primaryAttentionLabel,
  item.channelLabel,
  item.queueLabel,
  item.queueStateLabel,
  item.scheduling?.label,
  item.scheduling?.description,
  item.scheduling?.nextManualAction,
  item.manualReplyWindowLabel,
  item.manualReplyWindowBadgeLabel,
  ...(Array.isArray(item.attentionReasons) ? item.attentionReasons : []),
  item.suggestedDestination,
].filter(Boolean).join(' '));

const compareQueueItems = (first, second) => {
  const firstSchedulingRank = first.schedulingRequiresHuman ? 0 : 1;
  const secondSchedulingRank = second.schedulingRequiresHuman ? 0 : 1;
  if (firstSchedulingRank !== secondSchedulingRank) return firstSchedulingRank - secondSchedulingRank;

  const firstWindowRank = first.manualReplyWindowStatus === 'open'
    ? 0
    : first.manualReplyWindowStatus === 'closed'
      ? 1
      : 2;
  const secondWindowRank = second.manualReplyWindowStatus === 'open'
    ? 0
    : second.manualReplyWindowStatus === 'closed'
      ? 1
      : 2;

  if (firstWindowRank !== secondWindowRank) return firstWindowRank - secondWindowRank;

  const firstTime = getTimestamp(first.lastInteractionAt || first.lastMessageAt || first.nextActionAt || first.lastHandledAt);
  const secondTime = getTimestamp(second.lastInteractionAt || second.lastMessageAt || second.nextActionAt || second.lastHandledAt);
  if (firstTime !== secondTime) return secondTime - firstTime;

  const firstScore = first.attentionScore ?? first.sortScore;
  const secondScore = second.attentionScore ?? second.sortScore;
  return secondScore - firstScore;
};

const buildQueueItem = ({
  activitiesByConversation,
  channels,
  channelStatus,
  conversation,
  currentUserId,
  now,
  showFullPhone,
  source,
  triageResultsByConversation,
}) => {
  const nowTime = now.getTime();
  const rawStatus = safeText(conversation.status || conversation.statusLabel).toLowerCase() || 'open';
  const status = rawStatus === 'pending' ? 'waiting' : rawStatus === 'closed' ? 'resolved' : rawStatus;
  const priority = safeText(conversation.priority || conversation.priorityLabel).toLowerCase() || 'normal';
  const activities = getConversationActivities(activitiesByConversation, conversation.id);
  const scheduling = buildOmnichannelSchedulingOperationsModel(activities, { now });
  const nextActionAt = conversation.nextActionAt || conversation.next_action_at || resolveLatestNextActionAt(activities);
  const nextActionDate = parseDate(nextActionAt);
  const todayKey = formatOmnichannelQueueDateKey(now);
  const nextActionKey = nextActionDate ? formatOmnichannelQueueDateKey(nextActionDate) : '';
  const resolvedAt = conversation.resolvedAt || conversation.resolved_at;
  const resolvedKey = resolvedAt ? formatOmnichannelQueueDateKey(resolvedAt) : '';
  const isArchived = ARCHIVED_STATUSES.has(status);
  const isResolved = RESOLVED_STATUSES.has(status) || Boolean(resolvedAt);
  const isResolvedToday = isResolved && resolvedKey === todayKey;
  const isOpen = OPEN_STATUSES.has(status);
  const isWaiting = WAITING_STATUSES.has(status);
  const isHighPriority = HIGH_PRIORITIES.has(priority);
  const isOverdue = Boolean(nextActionDate && nextActionDate.getTime() < nowTime && !isResolved && !isArchived);
  const isDueToday = Boolean(nextActionDate && nextActionKey === todayKey && !isOverdue && !isResolved && !isArchived);
  const isWaitingReturn = Boolean((isWaiting || nextActionDate) && !isDueToday && !isOverdue && !isResolved && !isArchived);
  const hasPatientLink = Boolean(conversation.patientId || conversation.patient_id);
  const hasLeadLink = Boolean(conversation.leadId || conversation.lead_id);
  const hasAnyLink = hasPatientLink || hasLeadLink;
  const assignedTo = conversation.assignedTo || conversation.assigned_to || null;
  const isAssignedToMe = Boolean(currentUserId && assignedTo && assignedTo === currentUserId);
  const isUnassigned = !assignedTo;
  const hasUnreadInbound = Boolean(conversation.hasUnreadInbound || Number(conversation.unreadCount || 0) > 0);
  const latestMessageDirection = conversation.latestMessageDirection || conversation.latest_message_direction || '';
  const lastInteractionAt = conversation.lastMessageAt
    || conversation.last_message_at
    || conversation.updatedAt
    || conversation.updated_at
    || conversation.createdAt
    || conversation.created_at
    || null;
  const withoutRecentTreatment = !isResolved && !isArchived && (isOpen || isWaiting) && !hasRecentTreatment(conversation, nowTime);
  const reason = resolveOmnichannelQueueReason({
    hasAnyLink,
    hasUnreadInbound,
    isDueToday,
    isHighPriority,
    isOpen,
    isOverdue,
    isResolved,
    isUnassigned,
    isWaiting,
    schedulingRequiresHuman: scheduling.requiresHuman,
    withoutRecentTreatment,
  });
  const priorityModel = buildOmnichannelQueuePriorityModel({
    hasAnyLink,
    hasUnreadInbound,
    isArchived,
    isAssignedToMe,
    isDueToday,
    isHighPriority,
    isOpen,
    isOverdue,
    isResolved,
    isUnassigned,
    isWaiting,
    schedulingRequiresHuman: scheduling.requiresHuman,
    withoutRecentTreatment,
  });
  const linkLabel = hasPatientLink
    ? 'Vinculado a paciente'
    : hasLeadLink
      ? 'Vinculado a lead'
      : 'Sem vínculo CRM';
  const channelContext = buildOmnichannelChannelContext({
    channelStatus,
    channels,
    conversation,
  });
  const queueContext = buildOmnichannelQueueContext({
    triageResult: triageResultsByConversation?.[conversation.id] || null,
  });
  const replyAccessState = resolveOmnichannelQueueReplyWindowState({
    contactPhoneE164: conversation.contactPhoneE164 || conversation.contact_phone_e164,
    hasUnreadInbound,
    lastInboundAt: conversation.lastInboundAt || conversation.last_inbound_at,
    lastMessageAt: lastInteractionAt,
    latestMessageDirection,
    now,
  });
  const isReplyWindowOpen = replyAccessState.status === 'open';
  const respondNow = Boolean(priorityModel.respondNow && isReplyWindowOpen);
  const attentionReasons = respondNow
    ? priorityModel.attentionReasons
    : priorityModel.attentionReasons.filter((attentionReason) => attentionReason !== 'Responder agora');
  const attentionScore = respondNow
    ? priorityModel.attentionScore
    : Math.max(0, priorityModel.attentionScore - 100);
  const primaryAttentionLabel = scheduling.requiresHuman
    ? 'Revisar agenda'
    : respondNow
      ? 'Responder agora'
      : replyAccessState.status === 'closed'
        ? 'Planejar reativação'
        : attentionReasons[0] || 'Acompanhar';
  const sortScore = attentionScore;

  const item = {
    attentionReasons,
    attentionScore,
    assignedAt: conversation.assignedAt || conversation.assigned_at || null,
    assignedTo,
    assignedToLabel: assignedTo ? (isAssignedToMe ? 'Minha conversa' : 'Responsável atribuído') : 'Sem responsável',
    channelContext,
    channelFilterKey: channelContext.filterKey,
    channelLabel: channelContext.label,
    conversationId: conversation.id,
    contato: safeText(conversation.contactDisplayName || conversation.contact_display_name, 'Contato sem nome'),
    hasAnyLink,
    hasLeadLink,
    hasPatientLink,
    hasUnreadInbound,
    isArchived,
    isAssignedToMe,
    isDueToday,
    isHighPriority,
    isOpen,
    isOverdue,
    isResolved,
    isResolvedToday,
    isStalled: priorityModel.isStalled,
    isUnassigned,
    isWaiting,
    isWaitingReturn,
    lastHandledAt: conversation.lastHandledAt || conversation.last_handled_at || null,
    lastInboundAt: conversation.lastInboundAt || conversation.last_inbound_at || null,
    lastInteractionAt,
    lastMessageAt: conversation.lastMessageAt || conversation.last_message_at || conversation.updatedAt || conversation.updated_at || null,
    lastReadAt: conversation.lastReadAt || conversation.last_read_at || null,
    latestInteractionDirectionLabel: resolveLatestInteractionDirectionLabel(latestMessageDirection),
    latestMessageDirection,
    latestMessagePreview: safeText(conversation.latestMessagePreview || conversation.latest_message_preview, '', 120),
    latestMessageTypeLabel: safeText(conversation.latestMessageTypeLabel || conversation.latest_message_type_label || conversation.latestMessageType || conversation.latest_message_type, '', 40),
    linkLabel,
    manualReplyWindowBadgeLabel: replyAccessState.badgeLabel,
    manualReplyWindowHelperText: replyAccessState.helperText,
    manualReplyWindowLabel: replyAccessState.label,
    manualReplyWindowReason: replyAccessState.reason,
    manualReplyWindowStatus: replyAccessState.status,
    maskedPhone: maskOmnichannelQueuePhone(conversation.contactPhoneE164 || conversation.contact_phone_e164),
    motivoOperacional: reason,
    nextActionAt: nextActionDate ? nextActionDate.toISOString() : null,
    nextManualAction: scheduling.requiresHuman ? scheduling.nextManualAction : resolveNextManualAction(reason),
    phoneDigits: showFullPhone ? normalizePhoneDigits(conversation.contactPhoneE164 || conversation.contact_phone_e164) : '',
    phoneLabel: showFullPhone
      ? formatOmnichannelQueuePhone(conversation.contactPhoneE164 || conversation.contact_phone_e164)
      : maskOmnichannelQueuePhone(conversation.contactPhoneE164 || conversation.contact_phone_e164),
    primaryAttentionLabel,
    prioridade: priority,
    priorityLabel: conversation.priorityLabel || resolvePriorityLabel(priority),
    proximaAcao: scheduling.requiresHuman ? scheduling.nextManualAction : resolveNextManualAction(reason),
    queueContext,
    queueFilterKey: queueContext.filterKey,
    queueLabel: queueContext.label,
    queueStateLabel: queueContext.stateLabel,
    reason,
    resolvedAt: resolvedAt || null,
    respondNow,
    scheduling,
    schedulingActivityCount: scheduling.activityCount,
    schedulingHasFlow: scheduling.hasSchedulingFlow,
    schedulingRequiresHuman: scheduling.requiresHuman,
    source: conversation.source || source || 'Sem acesso',
    sortScore,
    status,
    statusLabel: conversation.statusLabel || resolveStatusLabel(status),
    suggestedDestination: resolveSuggestedDestination({
      hasLeadLink,
      hasPatientLink,
      isResolved,
      scheduling,
    }),
    unreadCount: Number(conversation.unreadCount || 0),
    withoutRecentTreatment,
  };

  return {
    ...item,
    searchText: buildSearchText(item),
  };
};

export const buildOmnichannelQueueSummary = (queueItems) => queueItems.reduce((summary, item) => ({
  total: summary.total + 1,
  abertas: summary.abertas + (item.isOpen ? 1 : 0),
  aguardando: summary.aguardando + (item.isWaiting ? 1 : 0),
  arquivadas: summary.arquivadas + (item.isArchived ? 1 : 0),
  minhas: summary.minhas + (item.isAssignedToMe ? 1 : 0),
  naoLidas: summary.naoLidas + (item.hasUnreadInbound ? 1 : 0),
  janelaFechada: summary.janelaFechada + (item.manualReplyWindowStatus === 'closed' ? 1 : 0),
  prioridadeAlta: summary.prioridadeAlta + (item.isHighPriority ? 1 : 0),
  agendaAtencao: summary.agendaAtencao + (item.schedulingRequiresHuman ? 1 : 0),
  agendaConcluida: summary.agendaConcluida + (item.scheduling?.isCompleted ? 1 : 0),
  agendaEmAndamento: summary.agendaEmAndamento + (item.scheduling?.isActive ? 1 : 0),
  resolvidas: summary.resolvidas + (item.isResolved ? 1 : 0),
  resolvidasHoje: summary.resolvidasHoje + (item.isResolvedToday ? 1 : 0),
  responderAgora: summary.responderAgora + (item.respondNow ? 1 : 0),
  retornoHoje: summary.retornoHoje + (item.isDueToday ? 1 : 0),
  retornoVencido: summary.retornoVencido + (item.isOverdue ? 1 : 0),
  semResponsavel: summary.semResponsavel + (item.isUnassigned ? 1 : 0),
  semTratamentoRecente: summary.semTratamentoRecente + (item.withoutRecentTreatment ? 1 : 0),
  semVinculo: summary.semVinculo + (!item.hasAnyLink ? 1 : 0),
}), {
  total: 0,
  abertas: 0,
  aguardando: 0,
  arquivadas: 0,
  minhas: 0,
  naoLidas: 0,
  janelaFechada: 0,
  prioridadeAlta: 0,
  agendaAtencao: 0,
  agendaConcluida: 0,
  agendaEmAndamento: 0,
  resolvidas: 0,
  resolvidasHoje: 0,
  responderAgora: 0,
  retornoHoje: 0,
  retornoVencido: 0,
  semResponsavel: 0,
  semTratamentoRecente: 0,
  semVinculo: 0,
});

const pluralizeQueueCount = (count, singular, plural) => (
  `${count} ${count === 1 ? singular : plural}`
);

const buildPriorityLane = ({
  count,
  filterId,
  helper,
  id,
  label,
}) => ({
  count,
  filterId,
  helper,
  id,
  label,
  visible: count > 0,
});

export const buildOmnichannelQueuePriorityOverview = (queueItems = []) => {
  const safeItems = toList(queueItems);
  const activeItems = safeItems.filter((item) => !item.isResolved && !item.isArchived);
  const respondNowItems = activeItems.filter((item) => item.respondNow);
  const unreadItems = activeItems.filter((item) => item.hasUnreadInbound);
  const scheduledReturnItems = activeItems.filter((item) => item.isOverdue || item.isDueToday);
  const schedulingAttentionItems = activeItems.filter((item) => item.schedulingRequiresHuman);
  const closedWindowItems = activeItems.filter((item) => item.manualReplyWindowStatus === 'closed');
  const unassignedItems = activeItems.filter((item) => item.isUnassigned);
  const unlinkedItems = activeItems.filter((item) => !item.hasAnyLink);
  const recommendation = schedulingAttentionItems[0]
    || respondNowItems[0]
    || unreadItems[0]
    || scheduledReturnItems[0]
    || unassignedItems[0]
    || unlinkedItems[0]
    || activeItems[0]
    || null;
  const visibleRiskSignals = [
    unreadItems.length ? pluralizeQueueCount(unreadItems.length, 'não lida', 'não lidas') : '',
    scheduledReturnItems.length ? pluralizeQueueCount(scheduledReturnItems.length, 'retorno pendente', 'retornos pendentes') : '',
    schedulingAttentionItems.length ? pluralizeQueueCount(schedulingAttentionItems.length, 'exceção de agenda', 'exceções de agenda') : '',
    unassignedItems.length ? pluralizeQueueCount(unassignedItems.length, 'sem responsável', 'sem responsável') : '',
    unlinkedItems.length ? pluralizeQueueCount(unlinkedItems.length, 'sem vínculo CRM', 'sem vínculo CRM') : '',
  ].filter(Boolean);
  const lanes = [
    buildPriorityLane({
      count: schedulingAttentionItems.length,
      filterId: 'scheduling_attention',
      helper: 'Fluxos da Agenda que precisam de revisão e responsável humano.',
      id: 'scheduling_attention',
      label: 'Agenda',
    }),
    buildPriorityLane({
      count: respondNowItems.length,
      filterId: 'respond_now',
      helper: 'Janela aberta e ação manual recomendada agora.',
      id: 'reply_now',
      label: 'Responder agora',
    }),
    buildPriorityLane({
      count: unreadItems.length,
      filterId: 'unread',
      helper: 'Entradas recebidas ainda sem leitura operacional.',
      id: 'unread',
      label: 'Não lidas',
    }),
    buildPriorityLane({
      count: scheduledReturnItems.length,
      filterId: scheduledReturnItems.some((item) => item.isOverdue) ? 'overdue' : 'waiting',
      helper: 'Retornos vencidos ou programados para hoje.',
      id: 'scheduled_returns',
      label: 'Retornos',
    }),
    buildPriorityLane({
      count: closedWindowItems.length,
      filterId: 'closed_window',
      helper: 'Conversas que exigem planejamento antes de reativar.',
      id: 'closed_window',
      label: 'Janela fechada',
    }),
  ];

  return {
    activeCount: activeItems.length,
    hasRecommendation: Boolean(recommendation),
    headline: schedulingAttentionItems.length
      ? `${pluralizeQueueCount(schedulingAttentionItems.length, 'fluxo da Agenda', 'fluxos da Agenda')} para revisão`
      : respondNowItems.length
      ? `${pluralizeQueueCount(respondNowItems.length, 'conversa', 'conversas')} para responder agora`
      : activeItems.length
        ? `${pluralizeQueueCount(activeItems.length, 'conversa ativa', 'conversas ativas')} para acompanhar`
        : 'Fila sem ação operacional agora',
    helper: recommendation
      ? 'Prioridade calculada localmente a partir de Agenda, leitura, janela WhatsApp, retorno, vínculo CRM e responsável.'
      : 'Quando uma conversa entrar na fila, a próxima ação aparecerá aqui.',
    isEmpty: safeItems.length === 0,
    lanes,
    recommendedActionLabel: recommendation?.nextManualAction || 'Acompanhar a fila',
    recommendedContactLabel: recommendation?.contato || 'Sem conversa recomendada',
    recommendedConversationId: recommendation?.conversationId || '',
    recommendedFilterId: recommendation?.schedulingRequiresHuman
      ? 'scheduling_attention'
      : recommendation?.respondNow
      ? 'respond_now'
      : recommendation?.hasUnreadInbound
        ? 'unread'
        : recommendation?.manualReplyWindowStatus === 'closed'
          ? 'closed_window'
          : 'all',
    recommendedReasonLabel: recommendation?.primaryAttentionLabel || recommendation?.reason || 'Acompanhar',
    recommendedSecondaryLabel: recommendation
      ? [recommendation.manualReplyWindowBadgeLabel, recommendation.assignedToLabel, recommendation.queueLabel]
        .filter(Boolean)
        .join(' · ')
      : 'Sem conversa selecionada',
    visibleRiskSignals,
  };
};

export const buildOmnichannelOperationalQueueModel = ({
  activitiesByConversation = {},
  channels = [],
  channelStatus = null,
  conversations = [],
  currentUserId = null,
  now = new Date(),
  showFullPhone = true,
  source = 'Sem acesso',
  triageResultsByConversation = {},
} = {}) => {
  const resolvedNow = parseDate(now) || new Date();
  const queueItems = toList(conversations)
    .map((conversation) => buildQueueItem({
      activitiesByConversation,
      channels,
      channelStatus,
      conversation,
      currentUserId,
      now: resolvedNow,
      showFullPhone,
      source,
      triageResultsByConversation,
    }))
    .sort(compareQueueItems);

  return {
    filters: OMNICHANNEL_OPERATIONAL_QUEUE_FILTERS,
    generatedAt: resolvedNow.toISOString(),
    priorityOverview: buildOmnichannelQueuePriorityOverview(queueItems),
    queueItems,
    summary: buildOmnichannelQueueSummary(queueItems),
  };
};

export const filterOmnichannelOperationalQueue = (
  queueItems = [],
  {
    channelFilter = OMNICHANNEL_CHANNEL_FILTER_ALL,
    filter = 'all',
    queueFilter = OMNICHANNEL_QUEUE_FILTER_ALL,
    search = '',
  } = {},
) => {
  const normalizedSearch = normalizeText(search);
  const queryDigits = normalizePhoneDigits(search);
  const canSearchPhoneDigits = queryDigits.length >= 3;
  const isShortDigitOnlySearch = Boolean(queryDigits && queryDigits.length < 3 && queryDigits === String(search || '').replace(/\D/g, ''));

  return toList(queueItems).filter((item) => {
    const matchesFilter = filter === 'all'
      || (filter === 'open' && item.isOpen)
      || (filter === 'respond_now' && item.respondNow)
      || (filter === 'closed_window' && item.manualReplyWindowStatus === 'closed')
      || (filter === 'waiting' && item.isWaiting)
      || (filter === 'unread' && item.hasUnreadInbound)
      || (filter === 'mine' && item.isAssignedToMe)
      || (filter === 'unassigned' && item.isUnassigned)
      || (filter === 'high_priority' && item.isHighPriority)
      || (filter === 'scheduling_attention' && item.schedulingRequiresHuman)
      || (filter === 'unlinked' && !item.hasAnyLink)
      || (filter === 'resolved' && item.isResolved)
      || (filter === 'archived' && item.isArchived)
      || (filter === 'overdue' && item.isOverdue);

    if (!matchesFilter) return false;
    if (channelFilter !== OMNICHANNEL_CHANNEL_FILTER_ALL && item.channelFilterKey !== channelFilter) return false;
    if (queueFilter !== OMNICHANNEL_QUEUE_FILTER_ALL && item.queueFilterKey !== queueFilter) return false;
    if (!normalizedSearch && !queryDigits) return true;

    return (!isShortDigitOnlySearch && item.searchText.includes(normalizedSearch))
      || Boolean(canSearchPhoneDigits && item.phoneDigits?.includes(queryDigits));
  });
};
