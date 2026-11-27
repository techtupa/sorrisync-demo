const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BRAZIL_DOCUMENT_PATTERN = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{8,}\d)/g;

export const OMNICHANNEL_COLLABORATION_ACTIONS = Object.freeze({
  addNote: 'add_note',
  assign: 'assign',
  markRead: 'mark_read',
  triage: 'triage',
  unassign: 'unassign',
  updatePriority: 'update_priority',
  updateStatus: 'update_status',
});

export const OMNICHANNEL_COLLABORATION_STATUS_LABELS = Object.freeze({
  archived: 'Arquivada',
  open: 'Aberta',
  resolved: 'Resolvida',
  waiting: 'Acompanhamento/retorno manual',
});

const STATUS_HELPERS = Object.freeze({
  archived: 'Retirada da fila operacional sem criar automação.',
  open: 'Conversa aberta para atendimento manual.',
  resolved: 'Atendimento finalizado manualmente pela equipe.',
  waiting: 'Usa o enum existente waiting para acompanhamento ou retorno manual.',
});

const SAFE_ACTIVITY_TYPES = new Set([
  'assigned',
  'internal_note',
  'priority_changed',
  'reopened',
  'resolved',
  'scheduled_return',
  'status_changed',
  'unassigned',
]);

const toList = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

const parseDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getTimestamp = (value) => parseDate(value)?.getTime() || 0;

const sanitizeSensitiveText = (value) => String(value || '')
  .replace(UUID_IN_TEXT_PATTERN, 'identificador oculto')
  .replace(EMAIL_PATTERN, 'email oculto')
  .replace(BRAZIL_DOCUMENT_PATTERN, 'documento oculto')
  .replace(PHONE_PATTERN, 'telefone oculto');

const safeText = (value, fallback = '', maxLength = 96) => {
  const rawText = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = sanitizeSensitiveText(rawText)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const resolveActiveAction = (activeAction) => safeText(activeAction, '', 32);

const buildFeedback = (feedback) => {
  if (!feedback?.message) return null;

  return {
    actionId: safeText(feedback.actionId, 'triagem', 32),
    message: safeText(feedback.message, 'Ação colaborativa registrada.', 120),
    type: feedback.type === 'error' ? 'error' : 'success',
  };
};

const buildStatusOptions = () => Object.entries(OMNICHANNEL_COLLABORATION_STATUS_LABELS).map(([value, label]) => ({
  helper: STATUS_HELPERS[value],
  label,
  value,
}));

const buildHistoryItems = (activities) => toList(activities)
  .filter((activity) => {
    const type = safeText(activity.activityType || activity.activity_type, '', 48);
    return SAFE_ACTIVITY_TYPES.has(type);
  })
  .sort((first, second) => getTimestamp(second.createdAt || second.created_at) - getTimestamp(first.createdAt || first.created_at))
  .slice(0, 4)
  .map((activity, index) => {
    const type = safeText(activity.activityType || activity.activity_type, '', 48);
    const createdAt = parseDate(activity.createdAt || activity.created_at);

    return {
      createdAt: createdAt ? createdAt.toISOString() : null,
      createdAtLabel: createdAt ? createdAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data não informada',
      id: `collaboration-history-${index + 1}`,
      label: safeText(activity.activityTypeLabel || type, 'Ação operacional', 64),
      outcomeLabel: safeText(activity.outcomeLabel || activity.outcome, 'Registro operacional', 64),
      sourceLabel: safeText(activity.source, 'Fonte operacional', 48),
    };
  });

export const buildOmnichannelCollaborationModel = ({
  activeAction = '',
  activities = [],
  canManage = false,
  conversation = null,
  feedback = null,
  notes = [],
} = {}) => {
  const activeActionId = resolveActiveAction(activeAction);
  const hasConversation = Boolean(conversation?.id);
  const assigned = Boolean(conversation?.assignedTo);
  const unreadCount = Number(conversation?.unreadCount || 0);
  const hasUnreadInbound = Boolean(conversation?.hasUnreadInbound || unreadCount > 0);
  const statusValue = OMNICHANNEL_COLLABORATION_STATUS_LABELS[conversation?.status]
    ? conversation.status
    : 'open';
  const safeNotes = toList(notes);
  const latestNote = safeNotes
    .slice()
    .sort((first, second) => getTimestamp(second.createdAt || second.created_at) - getTimestamp(first.createdAt || first.created_at))[0];

  return {
    assignment: {
      canAssign: hasConversation && canManage && !activeActionId,
      canUnassign: hasConversation && canManage && assigned && !activeActionId,
      helper: assigned
        ? 'Responsável definido pelo contrato existente de atendimento.'
        : 'Sem responsável operacional definido.',
      isAssigning: activeActionId === OMNICHANNEL_COLLABORATION_ACTIONS.assign,
      isUnassigning: activeActionId === OMNICHANNEL_COLLABORATION_ACTIONS.unassign,
      label: safeText(conversation?.assignedToLabel, assigned ? 'Responsável atribuído' : 'Sem responsável', 64),
    },
    feedback: buildFeedback(feedback),
    hasConversation,
    history: {
      helper: 'Histórico operacional seguro; não inclui corpo bruto de nota interna nem detalhe técnico.',
      items: buildHistoryItems(activities),
    },
    notes: {
      canAdd: hasConversation && canManage && activeActionId !== OMNICHANNEL_COLLABORATION_ACTIONS.addNote,
      count: safeNotes.length,
      helper: 'Notas são internas da clínica e não aparecem como mensagem enviada ao paciente.',
      isSaving: activeActionId === OMNICHANNEL_COLLABORATION_ACTIONS.addNote,
      latestLabel: latestNote
        ? `Última nota interna em ${parseDate(latestNote.createdAt || latestNote.created_at)?.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) || 'data não informada'}`
        : 'Nenhuma nota interna registrada.',
    },
    readState: {
      canMarkRead: hasConversation && hasUnreadInbound && activeActionId !== OMNICHANNEL_COLLABORATION_ACTIONS.markRead,
      helper: hasUnreadInbound ? 'Há entrada pendente de leitura manual.' : 'Sem entrada inbound pendente.',
      isMarkingRead: activeActionId === OMNICHANNEL_COLLABORATION_ACTIONS.markRead,
      label: hasUnreadInbound ? `${unreadCount || 1} não lida` : 'Lida',
      unreadCount: unreadCount || (hasUnreadInbound ? 1 : 0),
    },
    status: {
      canUpdate: hasConversation && canManage && activeActionId !== OMNICHANNEL_COLLABORATION_ACTIONS.updateStatus,
      helper: STATUS_HELPERS[statusValue],
      isUpdating: activeActionId === OMNICHANNEL_COLLABORATION_ACTIONS.updateStatus,
      label: OMNICHANNEL_COLLABORATION_STATUS_LABELS[statusValue],
      options: buildStatusOptions(),
      value: statusValue,
    },
  };
};
