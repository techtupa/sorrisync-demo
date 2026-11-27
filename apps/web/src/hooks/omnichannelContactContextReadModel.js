const TIME_ZONE = 'America/Sao_Paulo';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const MAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BRAZIL_DOCUMENT_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const WHITESPACE_PATTERN = /[\r\n\t]+/g;

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: TIME_ZONE,
});

const safeText = (value, fallback = 'Não informado', maxLength = 120) => {
  const rawText = typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
  const normalized = rawText
    .replace(WHITESPACE_PATTERN, ' ')
    .replace(UUID_IN_TEXT_PATTERN, '')
    .replace(MAIL_PATTERN, '')
    .replace(BRAZIL_DOCUMENT_PATTERN, '')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const toDate = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toTimestamp = (value) => toDate(value)?.getTime() || 0;

const getAppointmentStart = (appointment) => (
  appointment?.startsAt
  || appointment?.starts_at
  || appointment?.startAt
  || appointment?.start_at
  || appointment?.date
  || appointment?.scheduledAt
  || appointment?.scheduled_at
);

const getAppointmentPatientId = (appointment) => (
  appointment?.patientId
  || appointment?.patient_id
  || appointment?.crmPatientId
  || appointment?.crm_patient_id
  || ''
);

const isAppointmentLinkedToPatient = (appointment, linkedPatient) => {
  if (!appointment || !linkedPatient?.id) return false;

  return getAppointmentPatientId(appointment) === linkedPatient.id;
};

const formatDateTime = (value) => {
  const date = toDate(value);
  if (!date) return 'Sem horário';

  return dateTimeFormatter.format(date);
};

const getStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'waiting' || normalized === 'pending') return 'Aguardando';
  if (normalized === 'resolved' || normalized === 'closed') return 'Resolvida';
  if (normalized === 'archived') return 'Arquivada';
  return 'Aberta';
};

const hasCrmLink = ({ conversation, linkedLead, linkedPatient, selectedQueueItem }) => Boolean(
  linkedPatient
  || linkedLead
  || selectedQueueItem?.hasAnyLink
  || selectedQueueItem?.hasPatientLink
  || selectedQueueItem?.hasLeadLink
  || conversation?.patientId
  || conversation?.patient_id
  || conversation?.leadId
  || conversation?.lead_id
);

const findNavigationAction = (navigationActions, actionIds = []) => {
  const actions = [
    ...(navigationActions?.allActions || []),
    navigationActions?.primaryAction,
    ...(navigationActions?.secondaryActions || []),
  ].filter(Boolean);

  return actions.find((action) => actionIds.includes(action?.id)) || null;
};

export const maskOmnichannelContactPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Não informado';

  const country = digits.length > 10 ? `+${digits.slice(0, 2)}` : '+**';
  return `${country} *****-${digits.slice(-2)}`;
};

export const formatOmnichannelContactPhone = (value) => {
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

export const buildOmnichannelContactAgendaSummary = ({
  appointments = [],
  canReadAgenda = false,
  linkedPatient = null,
  nextAppointment = null,
  now = new Date(),
} = {}) => {
  const safeAppointments = Array.isArray(appointments) ? appointments.filter((appointment) => appointment && typeof appointment === 'object') : [];
  const linkedAppointments = linkedPatient?.id
    ? safeAppointments.filter((appointment) => isAppointmentLinkedToPatient(appointment, linkedPatient))
    : [];
  const nowTime = toTimestamp(now) || Date.now();
  const sortedAppointments = linkedAppointments
    .slice()
    .sort((first, second) => toTimestamp(getAppointmentStart(first)) - toTimestamp(getAppointmentStart(second)));
  const resolvedNextAppointment = nextAppointment || sortedAppointments.find((appointment) => (
    toTimestamp(getAppointmentStart(appointment)) >= nowTime
  )) || null;
  const lastAppointment = sortedAppointments
    .filter((appointment) => toTimestamp(getAppointmentStart(appointment)) < nowTime)
    .at(-1) || null;

  if (!canReadAgenda) {
    return {
      actionIds: [],
      description: 'Agenda é contexto adicional e não é requisito para operar o WhatsApp.',
      lastAppointmentLabel: '',
      nextAppointmentLabel: '',
      stateLabel: 'Contexto Agenda opcional',
      title: 'Agenda',
    };
  }

  if (resolvedNextAppointment) {
    return {
      actionIds: ['open-appointment', 'open-agenda-today'],
      description: safeText(
        resolvedNextAppointment.procedure
        || resolvedNextAppointment.service
        || resolvedNextAppointment.title
        || resolvedNextAppointment.type,
        'Consulta carregada para este contato.',
      ),
      lastAppointmentLabel: lastAppointment ? `Última consulta: ${formatDateTime(getAppointmentStart(lastAppointment))}` : '',
      nextAppointmentLabel: `Próxima consulta: ${formatDateTime(getAppointmentStart(resolvedNextAppointment))}`,
      stateLabel: 'Consulta carregada',
      title: 'Agenda',
    };
  }

  if (lastAppointment) {
    return {
      actionIds: ['open-agenda-today'],
      description: 'Sem próxima consulta carregada para este contato.',
      lastAppointmentLabel: `Última consulta: ${formatDateTime(getAppointmentStart(lastAppointment))}`,
      nextAppointmentLabel: '',
      stateLabel: 'Histórico carregado',
      title: 'Agenda',
    };
  }

  return {
    actionIds: ['open-agenda-today'],
    description: 'Sem consulta carregada para este contato.',
    lastAppointmentLabel: '',
    nextAppointmentLabel: '',
    stateLabel: 'Sem consulta carregada',
    title: 'Agenda',
  };
};

export const buildOmnichannelManualPendingSignals = ({
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  selectedQueueItem = null,
} = {}) => {
  if (!conversation) {
    return [{
      actionId: 'select-conversation',
      description: 'Selecione uma conversa para ver pendências manuais.',
      id: 'select-conversation',
      label: 'Selecionar conversa',
    }];
  }

  const signals = [];
  const hasAnyLink = hasCrmLink({
    conversation,
    linkedLead,
    linkedPatient,
    selectedQueueItem,
  });

  if (selectedQueueItem?.hasUnreadInbound || conversation.hasUnreadInbound) {
    signals.push({
      actionId: 'mark-read',
      description: 'Ler a entrada e marcar como lida somente após conferência manual.',
      id: 'unread',
      label: 'Não lida',
    });
  }

  if (selectedQueueItem?.isOverdue || selectedQueueItem?.isDueToday) {
    signals.push({
      actionId: 'prepare-reply',
      description: selectedQueueItem?.isOverdue
        ? 'Retorno manual vencido.'
        : 'Retorno manual previsto para hoje.',
      id: 'return',
      label: 'Retorno/follow-up',
    });
  }

  if (selectedQueueItem?.isUnassigned || !conversation.assignedTo) {
    signals.push({
      actionId: 'assign-to-me',
      description: 'Conversa sem responsável definido.',
      id: 'unassigned',
      label: 'Sem responsável',
    });
  }

  if (!hasAnyLink) {
    signals.push({
      actionId: 'focus-crm-controls',
      description: 'Sem paciente ou lead vinculado no contexto carregado.',
      id: 'unlinked-crm',
      label: 'Sem vínculo CRM',
    });
  }

  if (selectedQueueItem?.isStalled || selectedQueueItem?.withoutRecentTreatment) {
    signals.push({
      actionId: 'prepare-reply',
      description: 'Conversa aberta sem tratamento recente.',
      id: 'stalled',
      label: 'Parada',
    });
  }

  if (selectedQueueItem?.isHighPriority || ['high', 'urgent'].includes(String(conversation.priority || '').toLowerCase())) {
    signals.push({
      actionId: 'prepare-reply',
      description: 'Prioridade alta definida na fila.',
      id: 'high-priority',
      label: 'Prioridade alta',
    });
  }

  return signals.slice(0, 3);
};

export const resolveOmnichannelPrimaryActions = ({
  canManage = false,
  canReadAgenda = false,
  canReadCrm = false,
  canSendManualReply = false,
  conversation = null,
  navigationActions = null,
  nextAction = null,
} = {}) => {
  const patientAction = findNavigationAction(navigationActions, ['open-patient']);
  const leadAction = findNavigationAction(navigationActions, ['open-lead']);
  const appointmentAction = findNavigationAction(navigationActions, ['open-appointment', 'open-agenda-today']);
  const focusCrmAction = findNavigationAction(navigationActions, ['focus-crm-controls']);
  const hasConversation = Boolean(conversation);
  const hasPhone = Boolean(conversation?.contactPhoneE164);

  return [
    {
      dataAction: 'contact-context-assign',
      disabledReason: canManage ? '' : 'Exige permissão de gestão da conversa.',
      enabled: Boolean(hasConversation && canManage),
      id: 'assign-to-me',
      label: 'Assumir',
      type: 'mutate_existing',
    },
    {
      dataAction: 'contact-context-mark-read',
      disabledReason: conversation?.hasUnreadInbound ? '' : 'Sem mensagem inbound não lida.',
      enabled: Boolean(hasConversation && conversation?.hasUnreadInbound),
      id: 'mark-read',
      label: 'Marcar lida',
      type: 'mutate_existing',
    },
    {
      dataAction: 'contact-context-open-patient',
      disabledReason: patientAction ? '' : 'Paciente não resolvido na lista carregada.',
      enabled: Boolean(canReadCrm && patientAction?.href),
      href: patientAction?.href || '',
      id: 'open-patient',
      label: patientAction?.label || 'Abrir paciente',
      type: 'open',
    },
    {
      dataAction: 'contact-context-open-crm',
      disabledReason: canReadCrm ? '' : 'Exige permissão de CRM.',
      enabled: Boolean(canReadCrm),
      href: leadAction?.href || '/pacientes',
      id: leadAction ? 'open-lead' : 'open-crm',
      label: leadAction?.label || focusCrmAction?.label || 'Abrir CRM/Leads',
      type: leadAction?.href ? 'open' : 'focus',
    },
    {
      dataAction: 'contact-context-open-agenda',
      disabledReason: canReadAgenda ? '' : 'Exige permissão de Agenda.',
      enabled: Boolean(canReadAgenda),
      href: appointmentAction?.href || '/agenda',
      id: appointmentAction?.id || 'open-agenda',
      label: appointmentAction?.label || 'Abrir agenda',
      type: 'open',
    },
    {
      dataAction: 'contact-context-prepare-reply',
      disabledReason: canSendManualReply ? '' : 'Resposta manual indisponível para este perfil.',
      enabled: Boolean(canSendManualReply && nextAction?.replyText),
      id: 'prepare-reply',
      label: 'Preparar resposta',
      text: nextAction?.replyText || '',
      type: 'fill_reply',
    },
    {
      dataAction: 'contact-context-use-script',
      disabledReason: hasConversation ? '' : 'Selecione uma conversa.',
      enabled: hasConversation,
      id: 'use-script',
      label: 'Usar playbook',
      type: 'focus_script',
    },
    {
      dataAction: 'contact-context-copy-phone',
      disabledReason: hasPhone ? '' : 'Telefone não informado.',
      enabled: hasPhone,
      id: 'copy-phone',
      label: 'Copiar telefone',
      type: 'copy_phone',
    },
  ];
};

export const buildOmnichannelContactContextModel = ({
  appointments = [],
  canManage = false,
  canReadAgenda = false,
  canReadCrm = false,
  canSendManualReply = false,
  channel = null,
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  navigationActions = null,
  nextAction = null,
  nextAppointment = null,
  now = new Date(),
  selectedQueueItem = null,
  showFullPhone = true,
  source = '',
} = {}) => {
  const contactType = linkedPatient ? 'Paciente' : linkedLead ? 'Lead' : 'Contato sem vínculo';
  const contactName = safeText(
    linkedPatient?.name
    || linkedLead?.name
    || conversation?.contactDisplayName
    || selectedQueueItem?.contato,
    'Contato sem nome',
  );
  const phone = conversation?.contactPhoneE164 || selectedQueueItem?.phone || '';
  const responsibleLabel = safeText(
    conversation?.assignedToLabel
    || selectedQueueItem?.assignedToLabel,
    'Sem responsável',
  );
  const crmSummary = linkedPatient
    ? {
      actionIds: ['open-patient'],
      description: safeText(linkedPatient.status, 'Cadastro operacional carregado.'),
      label: safeText(linkedPatient.name, 'Paciente vinculado'),
      stateLabel: 'Paciente vinculado',
    }
    : linkedLead
      ? {
        actionIds: ['open-lead'],
        description: safeText([linkedLead.status, linkedLead.priority].filter(Boolean).join(' · '), 'Lead carregado no funil.'),
        label: safeText(linkedLead.name, 'Lead vinculado'),
        stateLabel: 'Lead vinculado',
      }
      : {
        actionIds: ['focus-crm-controls', 'open-crm'],
        description: 'WhatsApp conectado. Sem vínculo CRM nesta conversa.',
        label: 'Contato sem vínculo CRM',
        stateLabel: 'Sem vínculo CRM',
      };
  const agenda = buildOmnichannelContactAgendaSummary({
    appointments,
    canReadAgenda,
    linkedPatient,
    nextAppointment,
    now,
  });
  const pendingSignals = buildOmnichannelManualPendingSignals({
    conversation,
    linkedLead,
    linkedPatient,
    selectedQueueItem,
  });
  const primaryActions = resolveOmnichannelPrimaryActions({
    canManage,
    canReadAgenda,
    canReadCrm,
    canSendManualReply,
    conversation,
    navigationActions,
    nextAction,
  });

  return {
    agenda,
    contact: {
      channelLabel: safeText(channel?.displayName || channel?.providerLabel, 'WhatsApp oficial'),
      lastInteractionLabel: formatDateTime(conversation?.lastMessageAt || selectedQueueItem?.lastMessageAt),
      name: contactName,
      nextManualActionLabel: safeText(nextAction?.title || selectedQueueItem?.nextManualAction, 'Seguir atendimento manual'),
      phoneLabel: showFullPhone ? formatOmnichannelContactPhone(phone) : maskOmnichannelContactPhone(phone),
      responsibleLabel,
      sourceLabel: safeText(source, 'Fonte não informada'),
      statusLabel: getStatusLabel(conversation?.status || selectedQueueItem?.status),
      type: contactType,
    },
    crm: crmSummary,
    pendingSignals,
    primaryActions,
  };
};
