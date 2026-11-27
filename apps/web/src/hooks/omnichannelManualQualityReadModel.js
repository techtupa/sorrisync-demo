export const OMNICHANNEL_QUALITY_CHECKLIST_ITEMS = [
  { id: 'understood-request', label: 'Entendi o pedido do contato.' },
  { id: 'checked-crm-link', label: 'Conferi se há paciente/lead vinculado.' },
  { id: 'checked-agenda-next-step', label: 'Verifiquei Agenda ou próximo passo.' },
  { id: 'used-playbook-when-needed', label: 'Usei playbook quando necessário.' },
  { id: 'clear-next-step', label: 'A resposta tem próximo passo claro.' },
];

const toText = (value = '') => String(value || '').trim();

const isHighPriority = ({ conversation, selectedQueueItem }) => {
  const priority = String(selectedQueueItem?.prioridade || selectedQueueItem?.priority || conversation?.priority || '').toLowerCase();
  return ['high', 'urgent', 'alta', 'urgente'].includes(priority);
};

const hasCrmLink = ({ conversation, linkedLead, linkedPatient, selectedQueueItem }) => Boolean(
  linkedPatient
  || linkedLead
  || conversation?.patientId
  || conversation?.patient_id
  || conversation?.leadId
  || conversation?.lead_id
  || selectedQueueItem?.hasAnyLink
  || selectedQueueItem?.hasPatientLink
  || selectedQueueItem?.hasLeadLink
);

const hasResponsible = ({ conversation, selectedQueueItem }) => Boolean(
  conversation?.assignedTo
  || conversation?.assigned_to
  || selectedQueueItem?.assignedTo
  || selectedQueueItem?.assigned_to
  || (selectedQueueItem?.assignedToLabel && !/sem respons/i.test(selectedQueueItem.assignedToLabel))
);

const hasPlannedNextAction = ({ conversation, contextualNextAction, selectedQueueItem }) => Boolean(
  conversation?.nextActionAt
  || conversation?.next_action_at
  || selectedQueueItem?.nextActionAt
  || selectedQueueItem?.next_action_at
  || selectedQueueItem?.nextManualAction
  || selectedQueueItem?.next_manual_action
  || contextualNextAction?.href
  || contextualNextAction?.replyText
);

export const buildOmnichannelQualityChecklist = ({ checkedItems = {} } = {}) => {
  const checkedSet = new Set(
    Array.isArray(checkedItems)
      ? checkedItems
      : Object.entries(checkedItems || {}).filter(([, checked]) => Boolean(checked)).map(([id]) => id),
  );
  const items = OMNICHANNEL_QUALITY_CHECKLIST_ITEMS.map((item) => ({
    ...item,
    checked: checkedSet.has(item.id),
  }));
  const checkedCount = items.filter((item) => item.checked).length;

  return {
    checkedCount,
    items,
    progressLabel: `${checkedCount}/${items.length} itens conferidos`,
    totalCount: items.length,
  };
};

export const buildOmnichannelReplyReview = ({ replyText = '' } = {}) => {
  const hasDraft = Boolean(toText(replyText));

  return {
    hasDraft,
    items: hasDraft ? [
      'Mensagem clara?',
      'Próximo passo combinado?',
      'Tom humano?',
      'Agenda/CRM conferidos?',
    ] : [],
    title: 'Revisão rápida',
  };
};

export const buildOmnichannelQualityGaps = ({
  canReadAgenda = false,
  canReadCrm = false,
  contextualNextAction = null,
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  manualReplyDraft = '',
  nextAppointment = null,
  selectedQueueItem = null,
} = {}) => {
  if (!conversation) return [];

  const linkedToCrm = hasCrmLink({ conversation, linkedLead, linkedPatient, selectedQueueItem });
  const responsible = hasResponsible({ conversation, selectedQueueItem });
  const hasNextAction = hasPlannedNextAction({ conversation, contextualNextAction, selectedQueueItem });
  const hasUnreadInbound = Boolean(conversation.hasUnreadInbound || selectedQueueItem?.hasUnreadInbound);
  const highPriority = isHighPriority({ conversation, selectedQueueItem });
  const hasReplyDraft = Boolean(toText(manualReplyDraft));
  const gaps = [];

  if (hasUnreadInbound) {
    gaps.push({
      actionLabel: 'Preparar resposta',
      actionType: 'prepare_reply',
      dataAction: 'prepare-quality-reply',
      description: 'Há mensagem recebida ainda não lida ou pendente de resposta manual.',
      id: 'unread-conversation',
      label: 'Conversa não lida',
      replyText: 'Oi! Estou verificando sua mensagem para te orientar no próximo passo.',
    });
  }

  if (highPriority) {
    gaps.push({
      actionLabel: 'Usar playbook',
      actionType: 'focus_playbook',
      dataAction: 'focus-quality-playbook',
      description: 'A fila marca esta conversa como alta prioridade ou urgente.',
      id: 'high-priority',
      label: 'Prioridade alta',
    });
  }

  if (!responsible) {
    gaps.push({
      actionLabel: 'Ver controles do atendimento',
      actionType: 'focus_attendance',
      dataAction: 'focus-quality-attendance',
      description: 'A conversa ainda não tem responsável operacional visível.',
      id: 'unassigned',
      label: 'Sem responsável',
    });
  }

  if (canReadCrm && !linkedToCrm) {
    gaps.push({
      actionLabel: 'Abrir vínculos CRM',
      actionType: 'focus_crm',
      dataAction: 'focus-quality-crm',
      description: 'Não há paciente ou lead vinculado ao atendimento atual.',
      id: 'unlinked-crm',
      label: 'Sem vínculo CRM',
    });
  }

  if (!hasReplyDraft) {
    gaps.push({
      actionLabel: 'Preparar resposta',
      actionType: 'prepare_reply',
      dataAction: 'prepare-quality-reply',
      description: 'O campo de resposta ainda está vazio.',
      id: 'blank-reply',
      label: 'Resposta em branco',
      replyText: 'Olá! Vou te ajudar por aqui. Pode me confirmar o melhor próximo passo para seguirmos?',
    });
  }

  if (canReadAgenda && linkedToCrm && !nextAppointment) {
    gaps.push({
      actionLabel: 'Abrir agenda',
      actionType: 'open_agenda',
      dataAction: 'focus-quality-agenda',
      description: 'Não há consulta carregada para este contato no contexto atual.',
      href: '/agenda',
      id: 'missing-agenda',
      label: 'Sem agenda vinculada',
    });
  }

  if (!hasNextAction) {
    gaps.push({
      actionLabel: 'Usar playbook',
      actionType: 'focus_playbook',
      dataAction: 'focus-quality-playbook',
      description: 'Não há próximo passo operacional claro no contexto carregado.',
      id: 'missing-next-action',
      label: 'Sem próxima ação',
    });
  }

  return gaps.slice(0, 3);
};

export const resolveOmnichannelManualClosureState = ({
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  manualReplyDraft = '',
  nextAppointment = null,
  qualityGaps = [],
  selectedQueueItem = null,
} = {}) => {
  if (!conversation) {
    return {
      actionLabel: 'Selecionar conversa',
      actionType: 'none',
      dataAction: 'focus-quality-playbook',
      description: 'Escolha uma conversa para revisar qualidade e fechamento manual.',
      id: 'no-conversation',
      title: 'Selecione uma conversa',
    };
  }

  const gapIds = new Set(qualityGaps.map((gap) => gap.id));
  const linkedToCrm = hasCrmLink({ conversation, linkedLead, linkedPatient, selectedQueueItem });
  const hasReplyDraft = Boolean(toText(manualReplyDraft));
  const status = String(conversation.status || selectedQueueItem?.status || '').toLowerCase();

  if (gapIds.has('unread-conversation') || selectedQueueItem?.respondNow || !hasReplyDraft) {
    return {
      actionLabel: 'Preparar resposta',
      actionType: 'prepare_reply',
      dataAction: 'prepare-quality-reply',
      description: 'Revise a mensagem recebida, prepare uma resposta e combine o próximo passo.',
      id: 'respond-now',
      replyText: 'Olá! Estou acompanhando sua mensagem e já te oriento no próximo passo.',
      title: 'Precisa responder agora',
    };
  }

  if (status === 'waiting' || status === 'pending') {
    return {
      actionLabel: 'Revisar playbook',
      actionType: 'focus_playbook',
      dataAction: 'focus-quality-playbook',
      description: 'A conversa parece aguardar retorno do paciente. Use o playbook para retomar sem automação.',
      id: 'waiting-patient',
      title: 'Aguardando paciente',
    };
  }

  if (!linkedToCrm) {
    return {
      actionLabel: 'Abrir vínculos CRM',
      actionType: 'focus_crm',
      dataAction: 'focus-quality-crm',
      description: 'Antes de encerrar o atendimento, confira se o contato precisa de vínculo manual no CRM.',
      id: 'missing-crm-link',
      title: 'Sem vínculo CRM',
    };
  }

  if (!nextAppointment) {
    return {
      actionLabel: 'Abrir agenda',
      actionType: 'open_agenda',
      dataAction: 'focus-quality-agenda',
      description: 'Se o próximo passo envolver horário, confira a Agenda manualmente antes de responder.',
      href: '/agenda',
      id: 'send-to-agenda',
      title: 'Encaminhar para agenda',
    };
  }

  return {
    actionLabel: 'Ver controles do atendimento',
    actionType: 'focus_attendance',
    dataAction: 'focus-quality-attendance',
    description: 'O contexto principal está conferido. Registre acompanhamento apenas pelos controles já existentes, se necessário.',
    id: 'external-follow-up',
    title: 'Registrar acompanhamento fora daqui',
  };
};
