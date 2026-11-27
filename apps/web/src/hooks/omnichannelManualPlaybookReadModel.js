export const OMNICHANNEL_MANUAL_PLAYBOOK_AUTO = 'auto';

export const OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS = [
  { id: OMNICHANNEL_MANUAL_PLAYBOOK_AUTO, label: 'Detectar pelo contexto' },
  { id: 'new_lead', label: 'Novo lead / primeira conversa' },
  { id: 'scheduling', label: 'Agendamento' },
  { id: 'appointment_confirmation', label: 'Confirmação de consulta' },
  { id: 'reactivation', label: 'Reativação de paciente' },
  { id: 'follow_up', label: 'Retorno/follow-up' },
  { id: 'post_care', label: 'Pós-atendimento' },
  { id: 'unlinked_crm', label: 'Conversa sem vínculo CRM' },
];

const DEFAULT_PLAYBOOK_ID = 'new_lead';
const PLAYBOOK_LABEL_BY_ID = new Map(
  OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS.map((option) => [option.id, option.label]),
);

const toList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const normalizeText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const includesAny = (value, terms = []) => {
  const normalized = normalizeText(value);
  return terms.some((term) => normalized.includes(normalizeText(term)));
};

const findNavigationAction = (navigationActions, actionIds = []) => {
  const actions = navigationActions?.allActions || [
    navigationActions?.primaryAction,
    ...(navigationActions?.secondaryActions || []),
  ].filter(Boolean);

  return actions.find((action) => actionIds.includes(action?.id)) || null;
};

const findPrimaryAction = (primaryActions, actionIds = []) => toList(primaryActions)
  .find((action) => actionIds.includes(action?.id)) || null;

const hasConversationCrmReference = ({ conversation, selectedQueueItem }) => Boolean(
  selectedQueueItem?.hasAnyLink
  || selectedQueueItem?.hasPatientLink
  || selectedQueueItem?.hasLeadLink
  || conversation?.patientId
  || conversation?.patient_id
  || conversation?.leadId
  || conversation?.lead_id
);

export const resolveOmnichannelSuggestedPlaybook = ({
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  nextAppointment = null,
  selectedPlaybookId = OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  selectedQueueItem = null,
} = {}) => {
  if (!conversation) return 'none';
  if (selectedPlaybookId && selectedPlaybookId !== OMNICHANNEL_MANUAL_PLAYBOOK_AUTO) {
    return selectedPlaybookId;
  }

  const reason = [
    selectedQueueItem?.reason,
    selectedQueueItem?.motivoOperacional,
    selectedQueueItem?.nextManualAction,
    selectedQueueItem?.primaryAttentionLabel,
    selectedQueueItem?.suggestedDestination,
    selectedQueueItem?.statusLabel,
    conversation.status,
  ].filter(Boolean).join(' ');
  const isResolved = Boolean(
    selectedQueueItem?.isResolved
    || conversation.resolvedAt
    || conversation.resolved_at
    || ['resolved', 'closed'].includes(String(conversation.status || '').toLowerCase()),
  );
  const hasFollowUp = Boolean(
    selectedQueueItem?.isOverdue
    || selectedQueueItem?.isDueToday
    || includesAny(reason, ['retorno', 'follow-up', 'follow up', 'aguardando']),
  );
  const hasAgendaConfirmation = Boolean(
    nextAppointment
    || includesAny(reason, ['confirmar consulta', 'confirmacao', 'confirmação', 'consulta confirmada']),
  );
  const hasAgendaIntent = Boolean(
    includesAny(reason, ['agenda', 'agend', 'horario', 'horário', 'disponibilidade'])
  );
  const hasStalledSignal = Boolean(
    selectedQueueItem?.withoutRecentTreatment
    || selectedQueueItem?.isStalled
    || includesAny(reason, ['parada', 'sem tratamento', 'reativ'])
  );
  const hasResolvedCrmLink = Boolean(linkedPatient || linkedLead);
  const hasCrmReference = hasConversationCrmReference({ conversation, selectedQueueItem });

  if (isResolved) return 'post_care';
  if (hasFollowUp) return 'follow_up';
  if (hasAgendaConfirmation) return 'appointment_confirmation';
  if (!hasResolvedCrmLink && !hasCrmReference) return 'unlinked_crm';
  if (hasAgendaIntent) return 'scheduling';
  if (hasStalledSignal) return 'reactivation';
  return DEFAULT_PLAYBOOK_ID;
};

const createText = (id, text) => ({
  dataAction: 'use-playbook-text',
  id,
  label: 'Usar texto',
  text,
});

const createOpenAction = (sourceAction, fallback = {}) => {
  if (!sourceAction?.href && sourceAction?.type !== 'focus') return null;

  const isFocus = sourceAction.type === 'focus';
  return {
    actionType: isFocus ? 'focus' : 'open',
    dataAction: fallback.dataAction || (isFocus ? 'focus-playbook-crm' : 'open-playbook-link'),
    href: sourceAction.href || '',
    iconType: sourceAction.iconType || fallback.iconType || 'crm',
    id: fallback.id || `playbook-${sourceAction.id}`,
    label: fallback.label || sourceAction.label,
  };
};

const createPrimaryAction = (sourceAction, fallback = {}) => sourceAction ? ({
  actionType: 'primary_action',
  contactActionId: sourceAction.id,
  dataAction: fallback.dataAction || `playbook-${sourceAction.id}`,
  disabledReason: sourceAction.disabledReason || '',
  id: fallback.id || `playbook-${sourceAction.id}`,
  label: fallback.label || sourceAction.label,
}) : null;

export const buildOmnichannelPlaybookActions = ({
  navigationActions = null,
  primaryActions = [],
  playbookId = DEFAULT_PLAYBOOK_ID,
} = {}) => {
  const patientAction = findNavigationAction(navigationActions, ['open-patient']);
  const leadAction = findNavigationAction(navigationActions, ['open-lead']);
  const agendaAction = findNavigationAction(navigationActions, ['open-appointment']);
  const agendaTodayAction = findNavigationAction(navigationActions, ['open-agenda-today']);
  const crmFocusAction = findNavigationAction(navigationActions, ['focus-crm-controls']);
  const assignAction = findPrimaryAction(primaryActions, ['assign-to-me']);
  const markReadAction = findPrimaryAction(primaryActions, ['mark-read']);
  const copyPhoneAction = findPrimaryAction(primaryActions, ['copy-phone']);
  const crmAction = leadAction || crmFocusAction || {
    href: '/pacientes',
    iconType: 'crm',
    id: 'open-crm',
    label: 'Abrir CRM/Leads',
  };
  const agendaFallbackAction = agendaAction || agendaTodayAction || {
    href: '/agenda',
    iconType: 'agenda',
    id: 'open-agenda',
    label: 'Abrir agenda',
  };
  const actionCatalog = {
    assign: createPrimaryAction(assignAction, {
      dataAction: 'playbook-assign-to-me',
      id: 'playbook-assign',
      label: 'Assumir atendimento',
    }),
    copy_phone: createPrimaryAction(copyPhoneAction, {
      dataAction: 'playbook-copy-phone',
      id: 'playbook-copy-phone',
      label: 'Copiar telefone',
    }),
    mark_read: createPrimaryAction(markReadAction, {
      dataAction: 'playbook-mark-read',
      id: 'playbook-mark-read',
      label: 'Marcar lida',
    }),
    open_agenda: createOpenAction(agendaFallbackAction, {
      dataAction: agendaAction ? 'open-playbook-agenda' : 'open-playbook-agenda-today',
      iconType: 'agenda',
      id: agendaAction ? 'playbook-open-agenda' : 'playbook-open-agenda-today',
      label: agendaAction ? 'Abrir agenda' : 'Agenda de hoje',
    }),
    open_crm: createOpenAction(crmAction, {
      dataAction: crmFocusAction && !leadAction ? 'focus-playbook-crm' : 'open-playbook-crm',
      iconType: leadAction ? 'lead' : 'crm',
      id: leadAction ? 'playbook-open-lead' : 'playbook-open-crm',
      label: leadAction ? 'Abrir CRM/Leads' : 'Abrir CRM',
    }),
    open_patient: createOpenAction(patientAction, {
      dataAction: 'open-playbook-patient',
      iconType: 'patient',
      id: 'playbook-open-patient',
      label: 'Abrir paciente',
    }),
  };
  const actionIdsByPlaybook = {
    appointment_confirmation: ['open_agenda', 'open_patient', 'mark_read'],
    follow_up: ['open_patient', 'open_crm', 'open_agenda', 'mark_read'],
    new_lead: ['open_crm', 'open_agenda', 'copy_phone'],
    post_care: ['open_patient', 'open_agenda', 'copy_phone'],
    reactivation: ['open_patient', 'open_crm', 'open_agenda', 'copy_phone'],
    scheduling: ['open_agenda', 'open_crm', 'copy_phone'],
    unlinked_crm: ['open_crm', 'copy_phone', 'assign'],
  };

  return (actionIdsByPlaybook[playbookId] || actionIdsByPlaybook[DEFAULT_PLAYBOOK_ID])
    .map((id) => actionCatalog[id])
    .filter(Boolean)
    .slice(0, 3);
};

const PLAYBOOK_DEFINITIONS = {
  appointment_confirmation: {
    objective: 'Confirmar presença e orientar chegada mantendo tom humano.',
    steps: [
      'Confirmar data e horário antes de responder.',
      'Orientar chegada e informações objetivas.',
      'Pedir confirmação de presença.',
      'Manter o envio manual pelo botão Enviar.',
    ],
    suggestedTexts: [
      createText('playbook-confirmation-text-1', 'Olá! Passando para confirmar sua consulta. Você consegue confirmar presença por aqui?'),
      createText('playbook-confirmation-text-2', 'Sua consulta está em nossa agenda. Se precisar ajustar o horário, me avise por aqui para conferirmos as opções.'),
      createText('playbook-confirmation-text-3', 'Para sua chegada, recomendo vir com alguns minutos de antecedência. Posso confirmar sua presença?'),
    ],
    title: 'Confirmação de consulta',
  },
  follow_up: {
    objective: 'Retomar uma conversa aberta e oferecer o próximo passo sem pressão.',
    steps: [
      'Retomar o contexto com uma frase curta.',
      'Perguntar se a pessoa ainda precisa de ajuda.',
      'Oferecer próximo passo manual.',
      'Abrir CRM ou Agenda somente se necessário.',
    ],
    suggestedTexts: [
      createText('playbook-follow-up-text-1', 'Estou retomando seu atendimento conforme combinado. Você ainda deseja seguir com o próximo passo?'),
      createText('playbook-follow-up-text-2', 'Oi! Passando para saber se você ainda precisa de ajuda com esse atendimento. Posso te orientar por aqui.'),
    ],
    title: 'Retorno/follow-up',
  },
  new_lead: {
    objective: 'Acolher o contato, entender a necessidade e preparar um encaminhamento manual.',
    steps: [
      'Acolher a pessoa e confirmar o motivo do contato.',
      'Pedir nome e informação objetiva sem dado sensível.',
      'Entender se busca avaliação, retorno ou agendamento.',
      'Sugerir próximo passo manual.',
    ],
    suggestedTexts: [
      createText('playbook-new-lead-text-1', 'Olá! Recebemos sua mensagem por aqui. Pode me contar o que você procura para eu te orientar no próximo passo?'),
      createText('playbook-new-lead-text-2', 'Claro, posso te ajudar. Para começar, pode me confirmar seu nome e o motivo do contato?'),
      createText('playbook-new-lead-text-3', 'Vou te orientar por aqui. Você procura uma avaliação, um retorno ou quer verificar horários disponíveis?'),
    ],
    title: 'Novo lead / primeira conversa',
  },
  post_care: {
    objective: 'Acompanhar o contato após atendimento sem criar tarefa persistida.',
    steps: [
      'Perguntar como foi o atendimento.',
      'Verificar se ficou alguma dúvida.',
      'Orientar retorno quando fizer sentido.',
      'Registrar próximo passo apenas pelos controles existentes.',
    ],
    suggestedTexts: [
      createText('playbook-post-care-text-1', 'Olá! Passando para saber como foi seu atendimento e se ficou alguma dúvida para seguirmos por aqui.'),
      createText('playbook-post-care-text-2', 'Tudo certo após o atendimento? Se precisar de alguma orientação, pode me chamar por aqui.'),
    ],
    title: 'Pós-atendimento',
  },
  reactivation: {
    objective: 'Retomar contato de cuidado sem promessa comercial agressiva.',
    steps: [
      'Retomar a conversa de forma acolhedora.',
      'Lembrar o contexto de cuidado sem expor dado sensível.',
      'Oferecer avaliação ou retorno manual.',
      'Abrir CRM ou Agenda apenas para consulta.',
    ],
    suggestedTexts: [
      createText('playbook-reactivation-text-1', 'Olá! Estou retomando seu contato para saber se ainda faz sentido seguirmos com uma avaliação ou retorno.'),
      createText('playbook-reactivation-text-2', 'Passando para saber se você gostaria de retomar seu atendimento. Posso verificar o melhor próximo passo por aqui.'),
    ],
    title: 'Reativação de paciente',
  },
  scheduling: {
    objective: 'Conduzir a conversa para uma consulta manual na Agenda.',
    steps: [
      'Perguntar preferência de dia ou período.',
      'Abrir Agenda para conferir disponibilidade.',
      'Combinar horário de forma objetiva.',
      'Preparar confirmação sem agendar automaticamente.',
    ],
    suggestedTexts: [
      createText('playbook-scheduling-text-1', 'Consigo te ajudar com o agendamento. Você tem preferência por algum dia ou período?'),
      createText('playbook-scheduling-text-2', 'Vou conferir a disponibilidade da agenda e te retorno com as opções por aqui.'),
    ],
    title: 'Agendamento',
  },
  unlinked_crm: {
    objective: 'Coletar dados básicos e orientar vínculo manual no CRM.',
    steps: [
      'Pedir nome e motivo do contato.',
      'Evitar dado sensível no texto sugerido.',
      'Usar os controles manuais para localizar ou criar lead.',
      'Não criar paciente, lead ou agendamento automaticamente.',
    ],
    suggestedTexts: [
      createText('playbook-unlinked-text-1', 'Para eu localizar seu atendimento, pode me confirmar seu nome e o motivo do contato?'),
      createText('playbook-unlinked-text-2', 'Vou te ajudar por aqui. Antes, preciso confirmar algumas informações básicas para seguir com segurança.'),
    ],
    title: 'Conversa sem vínculo CRM',
  },
};

export const buildOmnichannelManualPlaybooks = ({
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  navigationActions = null,
  nextAppointment = null,
  primaryActions = [],
  selectedPlaybookId = OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  selectedQueueItem = null,
} = {}) => {
  const playbookId = resolveOmnichannelSuggestedPlaybook({
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedPlaybookId,
    selectedQueueItem,
  });
  const resolvedPlaybookId = PLAYBOOK_DEFINITIONS[playbookId] ? playbookId : DEFAULT_PLAYBOOK_ID;
  const definition = PLAYBOOK_DEFINITIONS[resolvedPlaybookId];
  const actions = buildOmnichannelPlaybookActions({
    navigationActions,
    playbookId: resolvedPlaybookId,
    primaryActions,
  });

  return {
    ...definition,
    actions,
    detectedPlaybookId: resolvedPlaybookId,
    emptyActionState: actions.length ? '' : 'Sem ação manual disponível para este contexto e perfil.',
    modeLabel: PLAYBOOK_LABEL_BY_ID.get(resolvedPlaybookId) || definition.title,
    selectedPlaybookId: selectedPlaybookId || OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
    suggestedTexts: definition.suggestedTexts.slice(0, 3),
  };
};
