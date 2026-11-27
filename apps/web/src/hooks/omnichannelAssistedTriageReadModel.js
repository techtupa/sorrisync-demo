import {
  getOmnichannelTriageQueueLabel,
  normalizeOmnichannelTriageIntentKey,
  normalizeOmnichannelTriageQueueKey,
} from '../repositories/omnichannelTriageBackendContract.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOCUMENT_PATTERN = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{8,}\d)/g;

const cleanText = (value, fallback = '', maxLength = 140) => {
  const rawText = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = rawText
    .replace(UUID_IN_TEXT_PATTERN, '')
    .replace(EMAIL_PATTERN, '')
    .replace(DOCUMENT_PATTERN, '')
    .replace(PHONE_PATTERN, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const normalizeText = (value) => cleanText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const toList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const hasAnyTerm = (text, terms = []) => {
  const normalized = normalizeText(text);
  return terms.some((term) => normalized.includes(term));
};

const buildMessageTextCorpus = (messages = [], conversation = null, selectedQueueItem = null) => [
  cleanText(conversation?.contactDisplayName, '', 80),
  cleanText(conversation?.latestMessagePreview, '', 160),
  cleanText(selectedQueueItem?.reason || selectedQueueItem?.motivoOperacional, '', 120),
  cleanText(selectedQueueItem?.nextManualAction, '', 120),
  ...toList(messages)
    .filter((message) => message.direction === 'inbound')
    .slice(-4)
    .map((message) => cleanText(message.contentText || message.messagePreview, '', 180)),
].filter(Boolean).join(' ');

const TRIAGE_INTENTS = Object.freeze({
  schedule_evaluation: {
    id: 'schedule_evaluation',
    label: 'Agendar avaliação',
  },
  reschedule_appointment: {
    id: 'reschedule_appointment',
    label: 'Remarcar consulta',
  },
  confirm_appointment: {
    id: 'confirm_appointment',
    label: 'Confirmar horário',
  },
  treatment_budget: {
    id: 'treatment_budget',
    label: 'Saber sobre tratamento/orçamento',
  },
  follow_up: {
    id: 'follow_up',
    label: 'Retorno/pós-atendimento',
  },
  human_attendant: {
    id: 'human_attendant',
    label: 'Falar com atendente',
  },
  other: {
    id: 'other',
    label: 'Outro assunto',
  },
});

const TRIAGE_QUEUES = Object.freeze({
  reception: {
    id: 'reception',
    label: 'Recepção',
  },
  commercial: {
    id: 'commercial',
    label: 'CRC/Comercial',
  },
  post_care: {
    id: 'post_care',
    label: 'Pós-atendimento',
  },
  human_now: {
    id: 'human_now',
    label: 'Humano imediato',
  },
  unclassified: {
    id: 'unclassified',
    label: 'Sem classificação',
  },
});

export const resolveOmnichannelTriageIntent = ({
  conversation = null,
  messages = [],
  selectedQueueItem = null,
} = {}) => {
  if (!conversation && !selectedQueueItem) {
    return {
      ...TRIAGE_INTENTS.other,
      confidenceLabel: 'Sem conversa selecionada',
      reason: 'Selecione uma conversa para sugerir triagem.',
    };
  }

  const corpus = buildMessageTextCorpus(messages, conversation, selectedQueueItem);
  const unreadOrUrgent = Boolean(
    selectedQueueItem?.hasUnreadInbound
    || selectedQueueItem?.isHighPriority
    || selectedQueueItem?.priority === 'urgent'
    || selectedQueueItem?.prioridade === 'urgent',
  );

  if (hasAnyTerm(corpus, ['atendente', 'humano', 'pessoa', 'equipe', 'falar com', 'me liga', 'urgente'])) {
    return {
      ...TRIAGE_INTENTS.human_attendant,
      confidenceLabel: 'Sinal direto',
      reason: 'O contato pede atendimento humano ou prioridade imediata.',
    };
  }

  if (selectedQueueItem?.isOverdue || selectedQueueItem?.isDueToday || selectedQueueItem?.isWaitingReturn
    || hasAnyTerm(corpus, ['retorno', 'pos atendimento', 'pós atendimento', 'acompanhar', 'follow up', 'depois da consulta'])) {
    return {
      ...TRIAGE_INTENTS.follow_up,
      confidenceLabel: 'Sinal operacional',
      reason: 'Há retorno manual, conversa parada ou pós-atendimento no contexto.',
    };
  }

  if (hasAnyTerm(corpus, ['remarcar', 'reagendar', 'mudar horario', 'mudar horário', 'trocar horario', 'trocar horário', 'cancelar consulta'])) {
    return {
      ...TRIAGE_INTENTS.reschedule_appointment,
      confidenceLabel: 'Sinal de agenda',
      reason: 'A mensagem indica ajuste em consulta já marcada.',
    };
  }

  if (hasAnyTerm(corpus, ['confirmar', 'confirmo', 'confirmacao', 'confirmação', 'horario confirmado', 'horário confirmado'])) {
    return {
      ...TRIAGE_INTENTS.confirm_appointment,
      confidenceLabel: 'Sinal de confirmação',
      reason: 'A conversa indica confirmação de horário.',
    };
  }

  if (hasAnyTerm(corpus, ['orcamento', 'orçamento', 'tratamento', 'aparelho', 'implante', 'clareamento', 'avaliar opcoes', 'avaliar opções'])) {
    return {
      ...TRIAGE_INTENTS.treatment_budget,
      confidenceLabel: 'Sinal comercial',
      reason: 'O contato quer entender tratamento ou orçamento.',
    };
  }

  if (hasAnyTerm(corpus, ['agendar', 'marcar', 'avaliacao', 'avaliação', 'consulta', 'primeira vez', 'quero ir'])) {
    return {
      ...TRIAGE_INTENTS.schedule_evaluation,
      confidenceLabel: 'Sinal de agenda',
      reason: 'A conversa sugere intenção de agendamento.',
    };
  }

  if (unreadOrUrgent) {
    return {
      ...TRIAGE_INTENTS.human_attendant,
      confidenceLabel: 'Sinal da fila',
      reason: 'A fila indica entrada não lida, prioridade alta ou atendimento imediato.',
    };
  }

  return {
    ...TRIAGE_INTENTS.other,
    confidenceLabel: 'Contexto insuficiente',
    reason: 'Não há sinal suficiente para classificar com segurança.',
  };
};

export const resolveOmnichannelTriageQueue = ({
  intent = null,
  selectedQueueItem = null,
} = {}) => {
  const intentId = intent?.id || TRIAGE_INTENTS.other.id;

  if (intentId === TRIAGE_INTENTS.human_attendant.id || selectedQueueItem?.isHighPriority || selectedQueueItem?.priority === 'urgent') {
    return {
      ...TRIAGE_QUEUES.human_now,
      reason: 'Encaminhar para atendimento humano antes de qualquer automação futura.',
    };
  }

  if (intentId === TRIAGE_INTENTS.follow_up.id) {
    return {
      ...TRIAGE_QUEUES.post_care,
      reason: 'Conversa parece ligada a retorno ou pós-atendimento.',
    };
  }

  if (intentId === TRIAGE_INTENTS.treatment_budget.id) {
    return {
      ...TRIAGE_QUEUES.commercial,
      reason: 'Contato com sinal comercial para CRC.',
    };
  }

  if ([TRIAGE_INTENTS.schedule_evaluation.id, TRIAGE_INTENTS.reschedule_appointment.id, TRIAGE_INTENTS.confirm_appointment.id].includes(intentId)) {
    return {
      ...TRIAGE_QUEUES.reception,
      reason: 'Contato ligado a agenda e confirmação operacional.',
    };
  }

  return {
    ...TRIAGE_QUEUES.unclassified,
    reason: 'Sem classificação segura na leitura atual.',
  };
};

export const buildOmnichannelTriageQuestions = ({
  intent = null,
  linkedLead = null,
  linkedPatient = null,
  queue = null,
} = {}) => {
  const questions = [
    'Você já é paciente da clínica?',
    'Qual o motivo do contato?',
  ];

  if (!linkedPatient && !linkedLead) {
    questions.push('Pode me informar seu nome?');
  }

  const intentId = intent?.id || TRIAGE_INTENTS.other.id;
  if ([TRIAGE_INTENTS.schedule_evaluation.id, TRIAGE_INTENTS.reschedule_appointment.id, TRIAGE_INTENTS.confirm_appointment.id].includes(intentId)
    || queue?.id === TRIAGE_QUEUES.reception.id) {
    questions.push('Qual melhor período para atendimento?');
  } else {
    questions.push('Você quer agendar, remarcar, confirmar ou falar com a equipe?');
  }

  if (queue?.id === TRIAGE_QUEUES.human_now.id || intentId === TRIAGE_INTENTS.other.id) {
    questions.push('Deseja falar com atendente agora?');
  }

  return [...new Set(questions)].slice(0, 4).map((question, index) => ({
    id: `triage-question-${index + 1}`,
    label: question,
  }));
};

const resolveKnownContextLabel = ({ linkedLead = null, linkedPatient = null, nextAppointment = null } = {}) => {
  if (linkedPatient && nextAppointment) return 'Paciente vinculado com agenda carregada';
  if (linkedPatient) return 'Paciente vinculado';
  if (linkedLead) return 'Lead vinculado';
  return 'Contato sem vínculo CRM';
};

export const buildOmnichannelHumanHandoffSummary = ({
  intent = null,
  linkedLead = null,
  linkedPatient = null,
  nextAppointment = null,
  queue = null,
  questions = [],
  selectedQueueItem = null,
} = {}) => {
  const pendingItems = [];

  if (!linkedPatient && !linkedLead) pendingItems.push('Confirmar nome e vínculo CRM antes de evoluir atendimento.');
  if (!nextAppointment && queue?.id === TRIAGE_QUEUES.reception.id) pendingItems.push('Conferir agenda antes de prometer horário.');
  if (selectedQueueItem?.hasUnreadInbound) pendingItems.push('Ler a última entrada antes de responder.');
  if (selectedQueueItem?.isUnassigned) pendingItems.push('Definir responsável humano para seguir o atendimento.');

  const safePendingItems = pendingItems.length ? pendingItems.slice(0, 3) : ['Sem pendência crítica além da conferência manual da conversa.'];
  const nextManualAction = queue?.id === TRIAGE_QUEUES.human_now.id
    ? 'Encaminhar para humano agora.'
    : 'Preparar resposta manual e revisar antes de enviar.';
  const lines = [
    `Motivo provável: ${cleanText(intent?.label, TRIAGE_INTENTS.other.label, 64)}.`,
    `Fila sugerida: ${cleanText(queue?.label, TRIAGE_QUEUES.unclassified.label, 64)}.`,
    `Known context: ${resolveKnownContextLabel({ linkedLead, linkedPatient, nextAppointment })}.`,
    `Pendências: ${safePendingItems.join(' ')}`,
    `Próxima ação manual: ${nextManualAction}`,
  ];

  return {
    lines,
    pendingItems: safePendingItems,
    questions: toList(questions).map((question) => cleanText(question.label || question, '', 120)).filter(Boolean),
    text: lines.join('\n'),
    title: 'Resumo para recepção/CRC',
  };
};

const buildSuggestedReplyText = ({ intent, questions = [], queue } = {}) => {
  const firstQuestion = questions[0]?.label || 'Qual o motivo do contato?';
  return [
    'Olá! Vamos te ajudar por aqui.',
    `Para direcionar para ${cleanText(queue?.label, 'a equipe', 48)}, preciso confirmar algumas informações.`,
    firstQuestion,
    'Se preferir, também posso encaminhar para uma pessoa da equipe continuar o atendimento.',
  ].join('\n');
};

export const buildOmnichannelTriageModel = ({
  canManage = false,
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  messages = [],
  nextAppointment = null,
  selectedQueueItem = null,
  sourceLabel = 'Sem acesso',
} = {}) => {
  const intent = resolveOmnichannelTriageIntent({
    conversation,
    messages,
    selectedQueueItem,
  });
  const queue = resolveOmnichannelTriageQueue({
    intent,
    selectedQueueItem,
  });
  const questions = buildOmnichannelTriageQuestions({
    intent,
    linkedLead,
    linkedPatient,
    queue,
  });
  const handoffSummary = buildOmnichannelHumanHandoffSummary({
    intent,
    linkedLead,
    linkedPatient,
    nextAppointment,
    queue,
    questions,
    selectedQueueItem,
  });
  const replyText = buildSuggestedReplyText({
    intent,
    questions,
    queue,
  });
  const backendIntentKey = normalizeOmnichannelTriageIntentKey(intent.id);
  const backendQueueKey = normalizeOmnichannelTriageQueueKey(queue.id);

  return {
    backendIntentKey,
    backendQueueKey,
    canPrepareReply: Boolean(conversation && replyText),
    canSaveInternalNote: Boolean(canManage && conversation && handoffSummary.text),
    description: 'Sugestão baseada no contexto carregado. Não envia automaticamente e não cria histórico de triagem.',
    disclaimer: 'Triagem v0 assistida — não envia mensagens automaticamente.',
    enabled: Boolean(conversation || selectedQueueItem),
    handoffSummary,
    intent,
    queue,
    questions,
    replyText,
    saveNoteLabel: 'Usar resumo como nota interna',
    sourceLabel: cleanText(sourceLabel, 'Sem acesso', 48),
    stateLabel: 'Assistida segura',
    title: 'Triagem assistida',
  };
};

const classifyQueueItemForManagement = (item = {}) => {
  const intent = resolveOmnichannelTriageIntent({
    conversation: item,
    messages: [],
    selectedQueueItem: item,
  });
  const queue = resolveOmnichannelTriageQueue({
    intent,
    selectedQueueItem: item,
  });

  return {
    intent,
    queue,
  };
};

const toCount = (value) => {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const buildOmnichannelManagementTriageSignals = ({
  canReadOmnichannel = true,
  queueItems = [],
  sourceLabel = 'Sem acesso',
  triageResults = [],
} = {}) => {
  const items = toList(queueItems).filter((item) => !item.isResolved && !item.isArchived);
  const persistedResults = toList(triageResults);
  const counts = {
    commercial: 0,
    humanNow: 0,
    postCare: 0,
    reception: 0,
    unclassified: 0,
  };

  items.forEach((item) => {
    const { queue } = classifyQueueItemForManagement(item);
    if (queue.id === TRIAGE_QUEUES.reception.id) counts.reception += 1;
    else if (queue.id === TRIAGE_QUEUES.commercial.id) counts.commercial += 1;
    else if (queue.id === TRIAGE_QUEUES.post_care.id) counts.postCare += 1;
    else if (queue.id === TRIAGE_QUEUES.human_now.id) counts.humanNow += 1;
    else counts.unclassified += 1;
  });

  if (!canReadOmnichannel) {
    return {
      helper: 'Perfil sem acesso à fila Omnichannel.',
      historicityLabel: 'Triagem assistida ainda não gera métricas históricas.',
      signals: [],
      sourceLabel: cleanText(sourceLabel, 'Sem acesso', 48),
      stateLabel: 'Sem acesso',
      totalCurrentQueue: 0,
    };
  }

  if (persistedResults.length) {
    const resultConversationIds = new Set(persistedResults.map((result) => result.conversationId).filter(Boolean));
    const persistedCounts = {
      commercial: 0,
      humanNow: 0,
      postCare: 0,
      reception: 0,
      unclassified: 0,
    };
    let withIntent = 0;
    let handoffPending = 0;

    persistedResults.forEach((result) => {
      if (result.intentKey) withIntent += 1;
      if (result.handoffRequired) handoffPending += 1;

      const queueKey = normalizeOmnichannelTriageQueueKey(result.suggestedQueue);
      if (queueKey === TRIAGE_QUEUES.reception.id) persistedCounts.reception += 1;
      else if (queueKey === TRIAGE_QUEUES.commercial.id) persistedCounts.commercial += 1;
      else if (queueKey === TRIAGE_QUEUES.post_care.id) persistedCounts.postCare += 1;
      else if (queueKey === TRIAGE_QUEUES.human_now.id) persistedCounts.humanNow += 1;
      else persistedCounts.unclassified += 1;
    });

    const unclassifiedLabel = getOmnichannelTriageQueueLabel('unclassified');

    return {
      helper: 'Sinais derivados de resultados de triagem salvos por clique explícito ou validação segura; não medem bot, taxa, SLA ou produtividade.',
      historicityLabel: 'Resultados persistidos por conversa; triagem v0 não enviou mensagem, sem taxa histórica, SLA, ranking ou bot automático ativo.',
      signals: [
        {
          count: toCount(Math.max(0, items.length - resultConversationIds.size)),
          id: 'without-triage-result',
          label: 'Sem triagem salva',
        },
        {
          count: toCount(withIntent),
          id: 'with-intent',
          label: 'Com intenção',
        },
        {
          count: toCount(handoffPending),
          id: 'handoff-pending',
          label: 'Handoff pendente',
        },
        {
          count: toCount(persistedCounts.reception),
          id: 'reception',
          label: 'Recepção',
        },
        {
          count: toCount(persistedCounts.commercial + persistedCounts.postCare + persistedCounts.humanNow + persistedCounts.unclassified),
          id: 'other-queues',
          label: `Outras filas/${unclassifiedLabel}`,
        },
      ],
      sourceLabel: cleanText(sourceLabel, 'Sem acesso', 48),
      stateLabel: 'Resultados salvos por conversa',
      totalCurrentQueue: items.length,
    };
  }

  return {
    helper: 'Sinais derivados da fila carregada agora; não representam histórico, taxa ou produtividade.',
    historicityLabel: 'Triagem assistida ainda não gera métricas históricas.',
    signals: [
      {
        count: toCount(counts.humanNow),
        id: 'human-now',
        label: 'Humano imediato',
      },
      {
        count: toCount(counts.reception),
        id: 'reception',
        label: 'Recepção',
      },
      {
        count: toCount(counts.commercial),
        id: 'commercial',
        label: 'CRC/Comercial',
      },
      {
        count: toCount(counts.postCare),
        id: 'post-care',
        label: 'Pós-atendimento',
      },
      {
        count: toCount(counts.unclassified),
        id: 'unclassified',
        label: 'Sem classificação',
      },
    ],
    sourceLabel: cleanText(sourceLabel, 'Sem acesso', 48),
    stateLabel: items.length ? 'Estimativa da leitura atual' : 'Sem fila carregada',
    totalCurrentQueue: items.length,
  };
};
