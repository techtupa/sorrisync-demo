const cleanText = (value, fallback = '', maxLength = 140) => {
  const rawText = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = rawText
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized || fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const TRIAGE_CONFIG_INTENTS = Object.freeze([
  { id: 'schedule_evaluation', key: 'agendar_avaliacao', label: 'Agendar avaliação', queueId: 'reception' },
  { id: 'reschedule_appointment', key: 'remarcar_consulta', label: 'Remarcar consulta', queueId: 'reception' },
  { id: 'confirm_appointment', key: 'confirmar_horario', label: 'Confirmar horário', queueId: 'reception' },
  { id: 'treatment_budget', key: 'tratamento_orcamento', label: 'Tratamento/orçamento', queueId: 'commercial' },
  { id: 'follow_up', key: 'retorno_pos_atendimento', label: 'Retorno/pós-atendimento', queueId: 'post_care' },
  { id: 'human_attendant', key: 'falar_com_atendente', label: 'Falar com atendente', queueId: 'human_now' },
  { id: 'other', key: 'outro_assunto', label: 'Outro assunto', queueId: 'unclassified' },
]);

const TRIAGE_CONFIG_QUESTIONS = Object.freeze([
  { id: 'is-patient', label: 'Você já é paciente da clínica?' },
  { id: 'name', label: 'Qual seu nome?' },
  { id: 'contact-reason', label: 'Qual o motivo do contato?' },
  { id: 'routing-choice', label: 'Você deseja agendar, remarcar, confirmar ou falar com a equipe?' },
  { id: 'preferred-period', label: 'Qual melhor período para atendimento?' },
  { id: 'human-now', label: 'Quer falar com uma atendente agora?' },
]);

const TRIAGE_CONFIG_QUEUES = Object.freeze([
  { id: 'reception', label: 'Recepção', description: 'Agenda, remarcação e confirmação operacional.' },
  { id: 'commercial', label: 'CRC/Comercial', description: 'Tratamento, orçamento e avaliação comercial.' },
  { id: 'post_care', label: 'Pós-atendimento', description: 'Retorno, acompanhamento e pós-consulta.' },
  { id: 'human_now', label: 'Humano imediato', description: 'Contato pede pessoa da equipe ou exige cuidado manual.' },
  { id: 'unclassified', label: 'Sem classificação', description: 'Sem sinal suficiente para classificar com segurança.' },
]);

const FUTURE_CONTRACT_ITEMS = Object.freeze([
  'Configuração segura de perguntas e filas.',
  'Resultado de triagem por conversa com intenção, fila e handoff.',
  'RLS e permissões clínicas antes de qualquer automação.',
  'Fronteira server-side para decidir bot ou humano.',
]);

const toList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const queueLabelById = (queueId) => (
  TRIAGE_CONFIG_QUEUES.find((queue) => queue.id === queueId)?.label || 'Sem classificação'
);

const normalizePersistedIntent = (intent) => ({
  id: cleanText(intent.id || intent.key, 'intent', 80),
  key: cleanText(intent.key || intent.id, 'outro_assunto', 80),
  label: cleanText(intent.label, 'Outro assunto', 80),
  queueId: cleanText(intent.suggestedQueue || intent.suggested_queue || intent.queueId, 'unclassified', 80),
  queueLabel: cleanText(intent.queueLabel, queueLabelById(intent.suggestedQueue || intent.suggested_queue || intent.queueId), 80),
});

const normalizePersistedQuestion = (question, index = 0) => ({
  id: cleanText(question.id || question.key, `question-${index + 1}`, 80),
  key: cleanText(question.key, `question-${index + 1}`, 80),
  label: cleanText(question.label, 'Pergunta segura de triagem', 160),
  order: Number(question.position || question.order || index + 1),
  questionType: cleanText(question.questionType || question.question_type, 'text', 40),
});

export const buildOmnichannelTriageIntentCatalog = (intents = []) => {
  const persistedIntents = toList(intents).map(normalizePersistedIntent);

  if (persistedIntents.length) {
    return persistedIntents;
  }

  return TRIAGE_CONFIG_INTENTS.map((intent) => ({
    ...intent,
    queueLabel: queueLabelById(intent.queueId),
  }));
};

export const buildOmnichannelTriageQuestionCatalog = (questions = []) => {
  const persistedQuestions = toList(questions).map(normalizePersistedQuestion);

  if (persistedQuestions.length) {
    return persistedQuestions.sort((first, second) => first.order - second.order);
  }

  return TRIAGE_CONFIG_QUESTIONS.map((question, index) => ({
    ...question,
    order: index + 1,
  }));
};

export const buildOmnichannelTriageQueueCatalog = () => TRIAGE_CONFIG_QUEUES.map((queue) => ({ ...queue }));

export const buildOmnichannelTriageConfigModel = ({
  flows = [],
  intents: persistedIntents = [],
  questions: persistedQuestions = [],
  result = null,
  settings = null,
  sourceLabel = 'Sem acesso',
} = {}) => {
  const hasPersistedContract = Boolean(settings)
    || toList(flows).length > 0
    || toList(persistedIntents).length > 0
    || toList(persistedQuestions).length > 0;
  const intents = buildOmnichannelTriageIntentCatalog(persistedIntents);
  const questions = buildOmnichannelTriageQuestionCatalog(persistedQuestions);
  const queues = buildOmnichannelTriageQueueCatalog();
  const activeFlow = toList(flows).find((flow) => flow.status === 'active')
    || toList(flows)[0]
    || null;
  const persistenceLabel = hasPersistedContract
    ? 'Configuração segura do atendimento'
    : 'Sem persistência de configuração';
  const stateLabel = hasPersistedContract ? 'Configuração segura' : 'Prévia segura';

  return {
    activeFlow,
    automationLabel: 'Bot automático não ativado',
    description: hasPersistedContract
      ? 'Catálogo seguro para orientar o pré-atendimento WhatsApp-only sem ativar bot automático e sem disparar mensagens.'
      : 'Catálogo de apoio para orientar o pré-atendimento WhatsApp-only sem salvar configuração e sem disparar mensagens.',
    futureContractItems: FUTURE_CONTRACT_ITEMS.map((label, index) => ({
      id: `future-contract-${index + 1}`,
      label,
    })),
    handoff: {
      description: 'Resumo manual para recepção ou CRC revisar antes de responder ou salvar nota interna.',
      label: settings?.fallbackToHumanLabel || 'Encaminhamento humano manual',
    },
    intents,
    modeLabel: 'Pré-atendimento WhatsApp-only',
    persistenceLabel,
    previewBadges: [
      { id: 'preview', label: stateLabel },
      { id: 'bot-off', label: 'Bot automático não ativado' },
      { id: hasPersistedContract ? 'tenant-scoped' : 'no-persistence', label: persistenceLabel },
    ],
    questions,
    queues,
    result,
    safetyNotes: [
      { id: 'manual-only', label: 'Não envia automaticamente.' },
      { id: 'human-handoff', label: 'Encaminhamento humano manual.' },
      { id: 'no-sensitive-data', label: 'Perguntas não solicitam dado pessoal, clínico ou de cobrança sensível.' },
    ],
    settings,
    sourceLabel: cleanText(sourceLabel, 'Sem acesso', 48),
    stateLabel,
    title: 'Configuração visual da triagem',
  };
};
