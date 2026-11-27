export const OMNICHANNEL_ATTENDANCE_ASSISTANT_EMPTY_STATE = 'Não há texto suficiente para sugerir um rascunho seguro.';

export const OMNICHANNEL_ATTENDANCE_ASSISTANT_SAFETY_NOTES = [
  'Nada é enviado sem revisão humana.',
  'Revise o rascunho antes de responder.',
  'O assistente não confirma horários, valores ou procedimentos.',
];

export const OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY = {
  approved: 'approved_for_human_review',
  attention: 'needs_attention',
  blocked: 'blocked',
};

const DRAFT_QUALITY_PRESENTATION = {
  [OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.approved]: {
    description: 'Pode preencher o composer, mantendo revisão humana obrigatória.',
    label: 'Rascunho aprovado para revisão',
    tone: 'approved',
  },
  [OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.attention]: {
    description: 'Há alertas de segurança; revise os motivos antes de enviar.',
    label: 'Atenção: revise antes de usar',
    tone: 'attention',
  },
  [OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked]: {
    description: 'Não deve preencher o composer automaticamente. Gere novamente ou responda manualmente.',
    label: 'Rascunho bloqueado',
    tone: 'blocked',
  },
};

const DRAFT_BLOCKED_REASON_PRESENTATION = {
  appointment_confirmation: 'Risco de confirmar agenda, horário ou comparecimento sem validação humana.',
  asks_sensitive_data: 'Risco de solicitar CPF, documento, cartão ou dado bancário no atendimento.',
  automatic_or_final_send: 'Risco de parecer envio automático ou decisão final sem revisão humana.',
  blocked_by_rubric: 'A rubrica de segurança não aprovou a sugestão gerada.',
  clinical_attention: 'Assunto clínico ou procedimento odontológico exige revisão humana antes de virar rascunho.',
  clinical_claim: 'Assunto clínico ou procedimento odontológico exige revisão humana antes de virar rascunho.',
  closed_whatsapp_window: 'Janela WhatsApp fechada; o texto deve ficar apenas como material interno.',
  empty_draft: 'A IA não devolveu um rascunho utilizável para revisão.',
  missing_reply_draft: 'A IA não devolveu um rascunho utilizável para revisão.',
  operational_risk: 'Risco operacional: o texto poderia prometer ação, envio ou decisão fora da revisão humana.',
  playbook_clinical_attention: 'Playbook clínico exige revisão humana e não pode orientar diagnóstico ou tratamento.',
  playbook_price_attention: 'Playbook de valores exige revisão humana antes de falar sobre preço ou orçamento.',
  price_or_payment_promise: 'Risco de prometer preço, parcelamento ou orçamento sem validação humana.',
  price_promise: 'Risco de prometer preço, parcelamento ou orçamento sem validação humana.',
  provider_invalid_output: 'A resposta da IA não veio no formato seguro esperado.',
  provider_unsafe_output: 'A sugestão da IA foi considerada insegura pela validação.',
  provider_unsafe_reply: 'A sugestão da IA foi considerada insegura pela validação.',
  reply_continuity_mismatch: 'A resposta da IA não acompanhou corretamente o ponto atual da conversa.',
  rubric_blocked: 'A rubrica de segurança não aprovou a sugestão gerada.',
  scheduling_promise: 'Risco de confirmar agenda, horário ou disponibilidade sem validação humana.',
  sensitive_data_request: 'Risco de solicitar CPF, documento, cartão ou dado bancário no atendimento.',
  window_closed_internal_only: 'Janela WhatsApp fechada; o texto deve ficar apenas como material interno.',
};

const ASSISTANT_DECISION_REASON_PRESENTATION = {
  blocked_by_rubric: 'A rubrica de segurança bloqueou o uso do texto gerado.',
  empty_draft: 'A IA não devolveu um rascunho utilizável para revisão.',
  invalid_json: 'A resposta da IA não veio no formato seguro esperado.',
  local_fallback_used: 'A tela usou fallback local porque não recebeu uma sugestão segura da Edge.',
  metadata_missing: 'Faltou metadado seguro para aceitar a sugestão da IA.',
  metadata_not_propagated: 'O servidor não informou todos os metadados; a tela manteve fallback seguro.',
  missing_output: 'A IA não devolveu saída utilizável para revisão.',
  none: 'A sugestão da IA real foi usada como rascunho revisável.',
  not_attempted: 'A IA real não foi chamada nesta leitura.',
  provider_not_called: 'A IA real não foi chamada por configuração ou gate de segurança.',
  provider_response_incomplete: 'A resposta da IA veio incompleta e não foi usada.',
  provider_response_refusal: 'A IA recusou ou não conseguiu responder no formato esperado.',
  provider_timeout: 'A chamada da IA demorou demais e foi protegida por fallback.',
  refusal: 'A IA recusou ou não conseguiu responder no formato esperado.',
  schema_mismatch: 'A resposta da IA não cumpriu o contrato seguro de campos.',
  unknown: 'O motivo seguro ainda não veio detalhado nesta leitura.',
  valid_reply_draft: 'A resposta veio em formato seguro e passou para revisão humana.',
  valid_schema_but_blocked_by_rubric: 'A resposta veio estruturada, mas a rubrica bloqueou o uso do texto.',
};

const ASSISTANT_DECISION_CONTINUITY_PRESENTATION = {
  acknowledge_patient_message: 'Reconhecer a última mensagem do paciente.',
  advance_to_human_review: 'Avançar para revisão humana.',
  ask_one_safe_follow_up: 'Fazer uma pergunta segura antes da revisão.',
  continue_safe_collection: 'Continuar a coleta leve sem repetir informação.',
  prioritize_human_review: 'Priorizar revisão humana.',
  unknown: 'Continuidade ainda não classificada.',
};

const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOCUMENT_PATTERN = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;
const PHONE_CANDIDATE_PATTERN = /(?:\+?\d[\d\s().-]{8,}\d)/g;
const URL_PATTERN = /\bhttps?:\/\/\S+/gi;
const TECHNICAL_KEY_PATTERN = /\b(?:raw_payload|payload|provider_event|provider_message_id|storage_path|provider_media_id|signed_url|signedUrl|token|secret|access_token|refresh_token)\b\s*[:=]?\s*[^,;|]*/gi;
const TECHNICAL_WORD_PATTERN = /\b(?:raw_payload|payload|provider_event|provider_message_id|storage_path|provider_media_id|signed_url|signedUrl|access_token|refresh_token|token|secret)\b/gi;
const CLINICAL_DETAIL_PATTERN = /\b(?:diagn[oó]stico|prontu[aá]rio|anamnese|receita|medica[cç][aã]o|medicamento|dor|canal|implante|extra[cç][aã]o|clareamento|aparelho|tratamento indicado|orienta[cç][aã]o cl[ií]nica)\b/gi;

const INTENTS = {
  ambiguous: {
    draft: 'Olá! Recebemos sua mensagem. A equipe vai analisar o assunto e responder com o próximo passo.',
    id: 'ambiguous',
    label: 'Mensagem inicial ou assunto indefinido',
    reason: 'A leitura segura não encontrou sinal suficiente para classificar com segurança.',
  },
  evaluation: {
    draft: 'Olá! Recebemos seu pedido de avaliação. A equipe vai acompanhar manualmente e orientar o próximo passo.',
    id: 'evaluation',
    label: 'Avaliação ou agendamento',
    reason: 'A mensagem indica interesse em avaliação, agendamento ou primeira conversa.',
  },
  reschedule: {
    draft: 'Recebemos seu pedido de remarcação. A equipe vai revisar a agenda e retornar com as opções disponíveis.',
    id: 'reschedule',
    label: 'Remarcação',
    reason: 'A mensagem indica ajuste de agenda ou mudança de consulta.',
  },
  timePreference: {
    draft: 'Recebemos sua preferência de horário. A equipe vai verificar a disponibilidade e confirmar o melhor encaixe.',
    id: 'time_preference',
    label: 'Preferência de horário',
    reason: 'A mensagem aponta preferência de período ou horário, sem confirmação automática.',
  },
};

const ASSISTANT_PLAYBOOKS = {
  agendar_avaliacao: {
    allowedNextStep: 'Conferir agenda e vínculo CRM manualmente antes de responder.',
    id: 'agendar_avaliacao',
    label: 'Agendar avaliação',
    objective: 'Conduzir interesse em avaliação sem confirmar horário automaticamente.',
    prohibitedClaims: ['Não confirmar horário ou vaga.', 'Não prometer preço ou orçamento.'],
    recommendedNextStep: 'Conferir agenda e vínculo CRM manualmente antes de responder.',
    tone: 'claro, acolhedor e conservador',
  },
  reagendar_consulta: {
    allowedNextStep: 'Revisar agenda e histórico antes de orientar opções.',
    id: 'reagendar_consulta',
    label: 'Reagendar consulta',
    objective: 'Coletar preferência de remarcação sem prometer disponibilidade.',
    prohibitedClaims: ['Não confirmar remarcação.', 'Não garantir encaixe.'],
    recommendedNextStep: 'Revisar agenda e histórico antes de orientar opções.',
    tone: 'objetivo e cuidadoso',
  },
  duvida_preco: {
    allowedNextStep: 'Orientar a pessoa para avaliação ou revisão humana do orçamento.',
    id: 'duvida_preco',
    label: 'Dúvida sobre preço',
    objective: 'Responder dúvidas de preço sem prometer valor ou orçamento fechado.',
    prohibitedClaims: ['Não informar preço fechado.', 'Não prometer parcelamento.'],
    recommendedNextStep: 'Orientar a pessoa para avaliação ou revisão humana do orçamento.',
    tone: 'transparente e conservador',
  },
  pos_atendimento: {
    allowedNextStep: 'Encaminhar para revisão humana da equipe responsável.',
    id: 'pos_atendimento',
    label: 'Pós-atendimento',
    objective: 'Direcionar relato pós-atendimento para revisão humana.',
    prohibitedClaims: ['Não diagnosticar.', 'Não indicar tratamento.'],
    recommendedNextStep: 'Encaminhar para revisão humana da equipe responsável.',
    tone: 'acolhedor e prudente',
  },
  retorno_manual: {
    allowedNextStep: 'Seguir o retorno manual registrado e revisar a conversa antes de responder.',
    id: 'retorno_manual',
    label: 'Retorno manual',
    objective: 'Apoiar continuidade de acompanhamento já registrado.',
    prohibitedClaims: ['Não dizer que o retorno foi automático.', 'Não criar promessa de prazo.'],
    recommendedNextStep: 'Seguir o retorno manual registrado e revisar a conversa antes de responder.',
    tone: 'continuidade humana e objetiva',
  },
  sem_vinculo_crm: {
    allowedNextStep: 'Identificar o contato com segurança antes de qualquer vínculo CRM.',
    id: 'sem_vinculo_crm',
    label: 'Sem vínculo CRM',
    objective: 'Pedir contexto mínimo seguro quando a conversa ainda não tem vínculo CRM.',
    prohibitedClaims: ['Não criar cadastro automaticamente.', 'Não solicitar dados sensíveis.'],
    recommendedNextStep: 'Identificar o contato com segurança antes de qualquer vínculo CRM.',
    tone: 'simples, humano e mínimo',
  },
  midia_recebida: {
    allowedNextStep: 'Revisar manualmente o conteúdo recebido antes de responder.',
    id: 'midia_recebida',
    label: 'Mídia recebida',
    objective: 'Reconhecer mídia ou anexo sem abrir, transcrever ou prometer análise automática.',
    prohibitedClaims: ['Não afirmar conteúdo da mídia.', 'Não diagnosticar por mídia.'],
    recommendedNextStep: 'Revisar manualmente o conteúdo recebido antes de responder.',
    tone: 'neutro e seguro',
  },
  janela_fechada: {
    allowedNextStep: 'Registrar acompanhamento ou aguardar recurso aprovado para reativação.',
    id: 'janela_fechada',
    label: 'Janela WhatsApp fechada',
    objective: 'Explicar que o texto é interno quando a janela de resposta livre está fechada.',
    prohibitedClaims: ['Não liberar envio livre.', 'Não iniciar nova conversa automaticamente.'],
    recommendedNextStep: 'Registrar acompanhamento ou aguardar recurso aprovado para reativação.',
    tone: 'explicativo e operacional',
  },
  urgencia_odontologica: {
    allowedNextStep: 'Priorizar revisão humana e orientar sem promessa clínica.',
    id: 'urgencia_odontologica',
    label: 'Urgência odontológica',
    objective: 'Priorizar revisão humana sem diagnóstico ou prescrição.',
    prohibitedClaims: ['Não diagnosticar urgência.', 'Não prescrever medicamento.'],
    recommendedNextStep: 'Priorizar revisão humana e orientar sem promessa clínica.',
    tone: 'prioritário, acolhedor e prudente',
  },
  sem_assunto_definido: {
    allowedNextStep: 'Ler a conversa e escolher o próximo passo humano com segurança.',
    id: 'sem_assunto_definido',
    label: 'Assunto indefinido',
    objective: 'Manter resposta conservadora quando a intenção não está clara.',
    prohibitedClaims: ['Não presumir agenda, preço, diagnóstico ou vínculo.'],
    recommendedNextStep: 'Ler a conversa e escolher o próximo passo humano com segurança.',
    tone: 'conservador e humano',
  },
};

const ASSISTANT_PLAYBOOK_DRAFTS = {
  agendar_avaliacao: 'Olá! Podemos te ajudar com a avaliação. Qual dia ou período costuma ser melhor para você? A equipe vai conferir a agenda e orientar o próximo passo com segurança.',
  duvida_preco: 'Entendemos sua dúvida sobre valores. Os valores dependem da avaliação e do orçamento feito pela equipe. Podemos te orientar sobre o próximo passo para atendimento?',
  janela_fechada: 'Janela WhatsApp fechada. Este texto é apenas uma anotação interna para revisão humana; a retomada ativa deve usar recurso aprovado quando disponível.',
  midia_recebida: 'Recebemos o arquivo enviado. A equipe vai avaliar o material com segurança e orientar o próximo passo.',
  pos_atendimento: 'Recebemos sua mensagem sobre o atendimento. A equipe responsável vai revisar com cuidado e orientar o próximo passo com segurança.',
  reagendar_consulta: 'Recebemos seu pedido de remarcação. Envie, por favor, dois períodos em que você pode comparecer. A equipe vai conferir a agenda antes de validar qualquer mudança.',
  retorno_manual: 'Olá! Estamos retomando seu atendimento. A equipe vai revisar o contexto registrado e orientar o próximo passo com você.',
  sem_assunto_definido: 'Olá! Recebemos sua mensagem. A equipe vai analisar o assunto e responder com o próximo passo.',
  sem_vinculo_crm: 'Olá! Para te atender melhor, você pode informar seu nome? A equipe vai seguir com a conversa com revisão humana.',
  urgencia_odontologica: 'Recebemos sua mensagem e ela precisa de atenção humana prioritária. A equipe deve avaliar rapidamente e orientar o próximo passo seguro.',
};

const toList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const compactWhitespace = (value = '') => String(value || '')
  .replace(/[\r\n\t]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const truncateText = (value = '', maxLength = 180) => {
  const text = compactWhitespace(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const redactPhoneCandidate = (match) => {
  const digits = String(match || '').replace(/\D/g, '');
  return digits.length >= 10 ? '[telefone removido]' : match;
};

export const sanitizeOmnichannelAttendanceAssistantText = (value = '', maxLength = 180) => {
  const rawText = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const sanitized = rawText
    .replace(TECHNICAL_KEY_PATTERN, '[dado técnico removido]')
    .replace(TECHNICAL_WORD_PATTERN, '[dado técnico removido]')
    .replace(URL_PATTERN, '[link removido]')
    .replace(UUID_IN_TEXT_PATTERN, '[id removido]')
    .replace(EMAIL_PATTERN, '[e-mail removido]')
    .replace(DOCUMENT_PATTERN, '[documento removido]')
    .replace(PHONE_CANDIDATE_PATTERN, redactPhoneCandidate)
    .replace(CLINICAL_DETAIL_PATTERN, '[conteúdo clínico removido]');

  return truncateText(sanitized, maxLength);
};

const normalizeText = (value = '') => sanitizeOmnichannelAttendanceAssistantText(value, 500)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const hasAnyTerm = (value, terms = []) => {
  const normalized = normalizeText(value);
  return terms.some((term) => normalized.includes(normalizeText(term)));
};

const getMessageText = (message = {}) => sanitizeOmnichannelAttendanceAssistantText(
  message.contentText
    || message.content_text
    || message.text
    || message.body
    || message.messagePreview
    || message.message_preview
    || '',
  220,
);

const isTextualMessage = (message = {}) => {
  const type = String(message.messageType || message.message_type || message.type || 'text').toLowerCase();
  if (!['text', 'message', ''].includes(type)) return false;
  return Boolean(getMessageText(message));
};

const resolveDirectionLabel = (direction = '') => {
  const normalized = String(direction || '').toLowerCase();
  if (normalized === 'outbound') return 'Team';
  if (normalized === 'inbound') return 'Contact';
  return 'Message';
};

const buildSafeTextualMessages = (messages = []) => toList(messages)
  .filter((message) => message && typeof message === 'object')
  .filter(isTextualMessage)
  .slice(-5)
  .map((message) => ({
    directionLabel: resolveDirectionLabel(message.direction),
    text: getMessageText(message),
  }))
  .filter((message) => message.text);

const resolveIntent = (corpus = '') => {
  if (!compactWhitespace(corpus)) return INTENTS.ambiguous;

  if (hasAnyTerm(corpus, ['remarcar', 'remarcação', 'remarcacao', 'reagendar', 'mudar horário', 'mudar horario', 'trocar horário', 'trocar horario', 'cancelar consulta'])) {
    return INTENTS.reschedule;
  }

  if (hasAnyTerm(corpus, ['avaliação', 'avaliacao', 'agendar', 'marcar consulta', 'quero consulta', 'primeira vez'])) {
    return INTENTS.evaluation;
  }

  if (hasAnyTerm(corpus, ['amanhã', 'amanha', 'manhã', 'manha', 'tarde', 'noite', 'horário', 'horario', 'período', 'periodo'])) {
    return INTENTS.timePreference;
  }

  return INTENTS.ambiguous;
};

const hasLinkedLead = ({ conversation = null, linkedLead = null, selectedQueueItem = null } = {}) => Boolean(
  linkedLead
  || conversation?.leadId
  || conversation?.lead_id
  || selectedQueueItem?.hasLeadLink
);

const hasManualReturn = ({ activities = [], selectedQueueItem = null } = {}) => Boolean(
  selectedQueueItem?.nextManualAction
  || selectedQueueItem?.isDueToday
  || selectedQueueItem?.isOverdue
  || selectedQueueItem?.isWaitingReturn
  || toList(activities).some((activity) => activity?.nextActionAt || activity?.next_action_at),
);

const hasRecentMedia = (messages = []) => toList(messages).some((message) => {
  const type = String(message?.messageType || message?.message_type || message?.type || 'text').toLowerCase();
  return Boolean(type && !['text', 'message'].includes(type));
});

const resolveLocalAssistantPlaybook = ({
  activities = [],
  conversation = null,
  intent,
  linkedLead = null,
  linkedPatient = null,
  messages = [],
  selectedQueueItem = null,
} = {}) => {
  const corpus = [
    intent?.id,
    intent?.label,
    ...buildSafeTextualMessages(messages).map((message) => message.text),
  ].filter(Boolean).join(' ');
  const isWindowClosed = selectedQueueItem?.replyAccessState?.status === 'closed';

  if (isWindowClosed) return ASSISTANT_PLAYBOOKS.janela_fechada;
  if (hasAnyTerm(corpus, ['urgencia', 'urgente', 'emergencia', 'dor forte', 'sangramento', 'trauma'])) {
    return ASSISTANT_PLAYBOOKS.urgencia_odontologica;
  }
  if (hasManualReturn({ activities, selectedQueueItem })) return ASSISTANT_PLAYBOOKS.retorno_manual;
  if (hasAnyTerm(corpus, ['preco', 'preço', 'valor', 'orcamento', 'orçamento', 'quanto custa'])) {
    return ASSISTANT_PLAYBOOKS.duvida_preco;
  }
  if (hasRecentMedia(messages)) return ASSISTANT_PLAYBOOKS.midia_recebida;
  if (hasAnyTerm(corpus, ['pos atendimento', 'pós atendimento', 'retorno de tratamento', 'procedimento'])) {
    return ASSISTANT_PLAYBOOKS.pos_atendimento;
  }
  if (intent?.id === INTENTS.reschedule.id) return ASSISTANT_PLAYBOOKS.reagendar_consulta;
  if (intent?.id === INTENTS.evaluation.id || intent?.id === INTENTS.timePreference.id) return ASSISTANT_PLAYBOOKS.agendar_avaliacao;
  if (!hasLinkedLead({ conversation, linkedLead, selectedQueueItem }) && !linkedPatient && !conversation?.patientId && !conversation?.patient_id) {
    return ASSISTANT_PLAYBOOKS.sem_vinculo_crm;
  }

  return ASSISTANT_PLAYBOOKS.sem_assunto_definido;
};

const resolveSuggestedNextStep = ({
  activities = [],
  conversation = null,
  intent,
  linkedLead = null,
  selectedQueueItem = null,
} = {}) => {
  if (hasManualReturn({ activities, selectedQueueItem })) {
    return {
      description: 'Há retorno manual já sinalizado; confirme o contexto antes de preencher a resposta.',
      label: 'Seguir retorno manual registrado',
    };
  }

  if (hasLinkedLead({ conversation, linkedLead, selectedQueueItem })) {
    return {
      description: 'Há oportunidade já rastreável no atendimento; revise o contexto seguro antes do retorno.',
      label: 'Revisar oportunidade vinculada',
    };
  }

  if (selectedQueueItem?.isUnassigned) {
    return {
      description: 'Definir responsável humano antes de avançar no atendimento.',
      label: 'Assumir atendimento humano',
    };
  }

  const status = String(conversation?.status || selectedQueueItem?.status || '').toLowerCase();
  if (['waiting', 'pending'].includes(status)) {
    return {
      description: 'Conversa em acompanhamento; retomar sem prometer horário, valor ou procedimento.',
      label: 'Retomar conversa em acompanhamento',
    };
  }

  if (intent?.id === INTENTS.evaluation.id) {
    return {
      description: 'Conferir agenda e CRM manualmente antes de orientar a pessoa.',
      label: 'Conferir agenda manualmente',
    };
  }

  if (intent?.id === INTENTS.reschedule.id) {
    return {
      description: 'Revisar agenda disponível antes de responder sobre opções.',
      label: 'Revisar agenda antes de responder',
    };
  }

  if (intent?.id === INTENTS.timePreference.id) {
    return {
      description: 'Validar disponibilidade real antes de qualquer confirmação.',
      label: 'Validar disponibilidade manualmente',
    };
  }

  return {
    description: 'Ler a conversa e escolher o próximo passo humano com segurança.',
    label: 'Ler conversa antes de responder',
  };
};

const buildSafeSummary = (safeMessages = []) => {
  if (!safeMessages.length) return OMNICHANNEL_ATTENDANCE_ASSISTANT_EMPTY_STATE;

  const fragments = safeMessages
    .slice(-3)
    .map((message) => `${message.directionLabel}: ${message.text}`);

  return `Recent messages: ${fragments.join(' / ')}`;
};

const buildContextLabels = ({
  activities = [],
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  messages = [],
  selectedQueueItem = null,
  selectedTriageResult = null,
} = {}) => [
  messages.length ? 'Mensagens textuais recentes sanitizadas' : '',
  conversation?.status || selectedQueueItem?.status ? 'Status da conversa' : '',
  conversation?.priority || selectedQueueItem?.priority || selectedQueueItem?.prioridade ? 'Prioridade operacional' : '',
  selectedTriageResult ? 'Triagem salva sem dado técnico' : '',
  activities.length ? 'Atividades internas seguras' : '',
  hasManualReturn({ activities, selectedQueueItem }) ? 'Próximo retorno manual' : '',
  hasLinkedLead({ conversation, linkedLead, selectedQueueItem }) ? 'Lead vinculado sem ID' : '',
  linkedPatient || conversation?.patientId || conversation?.patient_id ? 'Paciente vinculado sem ID' : '',
].filter(Boolean);

export const buildOmnichannelAttendanceAssistantModel = ({
  activities = [],
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  messages = [],
  selectedQueueItem = null,
  selectedTriageResult = null,
} = {}) => {
  const safeMessages = buildSafeTextualMessages(messages);
  const corpus = safeMessages.map((message) => message.text).join(' ');
  const hasEnoughText = normalizeText(corpus).replace(/\W/g, '').length >= 8;
  const detectedIntent = hasEnoughText ? resolveIntent(corpus) : INTENTS.ambiguous;
  const selectedPlaybook = resolveLocalAssistantPlaybook({
    activities,
    conversation,
    intent: detectedIntent,
    linkedLead,
    linkedPatient,
    messages,
    selectedQueueItem,
  });
  const suggestedNextStep = resolveSuggestedNextStep({
    activities,
    conversation,
    intent: detectedIntent,
    linkedLead,
    selectedQueueItem,
  });
  const replyDraft = hasEnoughText ? (ASSISTANT_PLAYBOOK_DRAFTS[selectedPlaybook.id] || detectedIntent.draft) : '';
  const draftQualityStatus = selectedPlaybook.id === 'janela_fechada'
    ? OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked
    : replyDraft
    ? OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.approved
    : OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked;
  const draftQualityPresentation = DRAFT_QUALITY_PRESENTATION[draftQualityStatus];

  return {
    canUseDraft: Boolean(replyDraft && draftQualityStatus !== OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked),
    contextLabels: buildContextLabels({
      activities,
      conversation,
      linkedLead,
      linkedPatient,
      messages: safeMessages,
      selectedQueueItem,
      selectedTriageResult,
    }),
    contextPackSignals: [
      'Contexto local sanitizado',
      selectedQueueItem?.replyAccessState?.status === 'closed' ? 'Janela WhatsApp fechada' : 'Janela WhatsApp aberta',
      `Playbook aplicado: ${selectedPlaybook.label}`,
    ].filter(Boolean),
    contextPackSource: 'local_sanitized_context_pack',
    contextPackSummary: `Contexto seguro local aplicado: últimas mensagens textuais sanitizadas e sinais operacionais visíveis no atendimento. Playbook aplicado: ${selectedPlaybook.label}.`,
    detectedIntent,
    draftQualityDescription: draftQualityPresentation.description,
    draftQualityFlags: selectedPlaybook.id === 'janela_fechada' ? ['window_closed_internal_only'] : replyDraft ? [] : ['empty_draft'],
    draftQualityLabel: draftQualityPresentation.label,
    draftQualityReasons: selectedPlaybook.id === 'janela_fechada'
      ? ['Janela WhatsApp fechada: rascunho deve ficar apenas como material interno.']
      : replyDraft ? [] : ['Rascunho vazio ou indisponível.'],
    draftQualityStatus,
    draftQualityTone: draftQualityPresentation.tone,
    emptyState: OMNICHANNEL_ATTENDANCE_ASSISTANT_EMPTY_STATE,
    hasEnoughText,
    playbookAllowedNextStep: selectedPlaybook.allowedNextStep,
    playbookId: selectedPlaybook.id,
    playbookLabel: selectedPlaybook.label,
    playbookObjective: selectedPlaybook.objective,
    playbookProhibitedClaims: selectedPlaybook.prohibitedClaims,
    playbookRecommendedNextStep: selectedPlaybook.recommendedNextStep,
    playbookTone: selectedPlaybook.tone,
    tenantPlaybookPolicy: {
      configured: false,
      fallbackApplied: false,
      hasPolicySignal: false,
      requestedPlaybookId: selectedPlaybook.id,
      requestedPlaybookLabel: selectedPlaybook.label,
      selectedAllowed: true,
      selectedPlaybookId: selectedPlaybook.id,
      selectedPlaybookLabel: selectedPlaybook.label,
      source: 'local_default_catalog',
      summary: 'Catálogo local seguro aplicado.',
      tone: 'default',
    },
    replyPlan: {
      humanReviewRequired: true,
      intent: 'local_human_review',
      nextAction: selectedPlaybook.recommendedNextStep,
      nextQuestion: '',
      playbookId: selectedPlaybook.id,
      source: 'local_sanitized_playbook',
      tone: selectedPlaybook.tone,
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
      humanReviewFocus: `${selectedPlaybook.id}_review`,
      nextMove: 'advance_to_human_review',
      shouldAskFollowUp: false,
      source: 'local_sanitized_playbook',
      sent: false,
    },
    replyDraft,
    safeSummary: buildSafeSummary(safeMessages),
    safetyNotes: OMNICHANNEL_ATTENDANCE_ASSISTANT_SAFETY_NOTES,
    safeToUseAsDraft: Boolean(replyDraft && draftQualityStatus !== OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked),
    stateLabel: 'Assistente seguro',
    suggestedNextStep,
    title: 'Assistente de Atendimento',
  };
};

const sanitizeAssistantLabel = (value = '', fallback = '', maxLength = 180) => (
  sanitizeOmnichannelAttendanceAssistantText(value || fallback, maxLength) || fallback
);

const normalizeAssistantObject = (value = {}, fallback = {}) => (
  value && typeof value === 'object' && !Array.isArray(value) ? value : fallback
);

const normalizeAssistantList = (value = []) => (
  Array.isArray(value)
    ? value.map((item) => sanitizeOmnichannelAttendanceAssistantText(item, 180)).filter(Boolean)
    : []
);

const normalizeAssistantMeta = (value = '', fallback = '') => (
  sanitizeAssistantLabel(value, fallback, 80).toLowerCase()
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

const resolveAssistantPlaybookLabel = (playbookId = '', fallback = 'Playbook seguro') => {
  const normalizedPlaybookId = sanitizeAssistantLabel(playbookId, '', 80);
  return ASSISTANT_PLAYBOOKS[normalizedPlaybookId]?.label || fallback;
};

const normalizeAssistantTenantPlaybookPolicy = (value = {}, localModel = {}) => {
  const rawPolicy = normalizeAssistantObject(value, {});
  const localPolicy = normalizeAssistantObject(localModel.tenantPlaybookPolicy, {});
  const requestedPlaybookId = sanitizeAssistantLabel(
    rawPolicy.requestedPlaybookId || rawPolicy.requested_playbook_id,
    localPolicy.requestedPlaybookId || localModel.playbookId || '',
    80,
  );
  const selectedPlaybookId = sanitizeAssistantLabel(
    rawPolicy.selectedPlaybookId || rawPolicy.selected_playbook_id,
    localPolicy.selectedPlaybookId || localModel.playbookId || requestedPlaybookId,
    80,
  );
  const configured = normalizeAssistantBoolean(rawPolicy.configured, Boolean(localPolicy.configured));
  const fallbackApplied = normalizeAssistantBoolean(
    rawPolicy.fallbackApplied ?? rawPolicy.fallback_applied,
    Boolean(localPolicy.fallbackApplied),
  );
  const selectedAllowed = normalizeAssistantBoolean(
    rawPolicy.selectedAllowed ?? rawPolicy.selected_allowed,
    localPolicy.selectedAllowed ?? true,
  );
  const source = normalizeAssistantMeta(
    rawPolicy.source,
    localPolicy.source || (configured ? 'tenant_allowed_features' : 'default_catalog'),
  );
  const requestedPlaybookLabel = resolveAssistantPlaybookLabel(
    requestedPlaybookId,
    localPolicy.requestedPlaybookLabel || localModel.playbookLabel || 'Playbook solicitado',
  );
  const selectedPlaybookLabel = resolveAssistantPlaybookLabel(
    selectedPlaybookId,
    localPolicy.selectedPlaybookLabel || localModel.playbookLabel || 'Playbook aplicado',
  );
  const summary = fallbackApplied
    ? `A configuração da clínica desativou ${requestedPlaybookLabel}; o assistente usou ${selectedPlaybookLabel} como roteiro seguro.`
    : configured
      ? 'Playbooks liberados pela configuração desta clínica foram aplicados ao rascunho.'
      : 'Catálogo padrão de playbooks seguros aplicado.';

  return {
    configured,
    fallbackApplied,
    hasPolicySignal: configured || fallbackApplied,
    requestedPlaybookId,
    requestedPlaybookLabel,
    selectedAllowed,
    selectedPlaybookId,
    selectedPlaybookLabel,
    source,
    summary,
    tone: fallbackApplied ? 'warning' : configured ? 'configured' : 'default',
  };
};

const normalizeFinalDraftSource = (value = '', fallback = 'none') => {
  const normalized = normalizeAssistantMeta(value, fallback);
  return ['provider', 'server_fallback', 'local_fallback', 'none'].includes(normalized)
    ? normalized
    : fallback;
};

const normalizeProviderGateChecks = (value = {}) => {
  const checks = normalizeAssistantObject(value, {});
  return {
    fallbackUsed: checks.fallbackUsed === true || checks.fallback_used === true,
    providerAdapterReady: checks.providerAdapterReady === true || checks.provider_adapter_ready === true,
    providerCallAttempted: checks.providerCallAttempted === true || checks.provider_call_attempted === true,
    providerCallSucceeded: checks.providerCallSucceeded === true || checks.provider_call_succeeded === true,
    providerConfigured: checks.providerConfigured === true || checks.provider_configured === true,
    providerModelConfigured: checks.providerModelConfigured === true || checks.provider_model_configured === true,
    providerRequested: normalizeAssistantMeta(checks.providerRequested || checks.provider_requested, 'unknown'),
    providerSecretPresent: checks.providerSecretPresent === true || checks.provider_secret_present === true,
    runtimeEnabled: checks.runtimeEnabled === true || checks.runtime_enabled === true,
    shouldCallExternal: checks.shouldCallExternal === true || checks.should_call_external === true,
    tenantAllowed: checks.tenantAllowed === true || checks.tenant_allowed === true,
    tenantAssistantEnabled: checks.tenantAssistantEnabled === true || checks.tenant_assistant_enabled === true,
    tenantDryRun: checks.tenantDryRun === true || checks.tenant_dry_run === true,
    tenantSettingsAvailable: checks.tenantSettingsAvailable === true || checks.tenant_settings_available === true,
    tenantStatus: normalizeAssistantMeta(checks.tenantStatus || checks.tenant_status, 'unknown'),
  };
};

const normalizeAssistantEdgeMetadata = (serverSuggestion = {}, {
  edgeResponseAccepted = false,
  edgeResponseUsed = false,
  finalDraftSource = 'none',
  fallbackSource = 'unknown',
  serverFallbackUsed = false,
  serverSuggestionUsed = false,
} = {}) => {
  const providerGateChecksSource = normalizeAssistantMeta(
    serverSuggestion.providerGateChecksSource || serverSuggestion.provider_gate_checks_source,
    fallbackSource,
  );
  const providerDiagnosticsSource = normalizeAssistantMeta(
    serverSuggestion.providerDiagnosticsSource || serverSuggestion.provider_diagnostics_source,
    providerGateChecksSource,
  );
  const providerGateChecksAreServerSide = normalizeAssistantBoolean(
    serverSuggestion.providerGateChecksAreServerSide ?? serverSuggestion.provider_gate_checks_are_server_side,
    providerGateChecksSource === 'edge' || providerDiagnosticsSource === 'edge',
  );
  const providerSuggestionUsed = normalizeAssistantBoolean(
    serverSuggestion.providerSuggestionUsed ?? serverSuggestion.provider_suggestion_used,
    finalDraftSource === 'provider',
  );
  const normalizedFinalDraftSource = normalizeFinalDraftSource(
    serverSuggestion.finalDraftSource || serverSuggestion.final_draft_source,
    providerSuggestionUsed
      ? 'provider'
      : serverFallbackUsed
        ? 'server_fallback'
        : finalDraftSource,
  );
  const normalizedProviderGateChecks = normalizeProviderGateChecks(
    serverSuggestion.providerGateChecks || serverSuggestion.provider_gate_checks,
  );
  const providerSucceededWithServerFallback =
    normalizedProviderGateChecks.providerCallSucceeded === true
    && normalizedFinalDraftSource === 'server_fallback';
  const providerSuggestionBlockedByRubric = normalizeAssistantBoolean(
    serverSuggestion.providerSuggestionBlockedByRubric ?? serverSuggestion.provider_suggestion_blocked_by_rubric,
    false,
  );
  const rawProviderRubricBlockedReason = normalizeAssistantMeta(
    serverSuggestion.providerRubricBlockedReason || serverSuggestion.provider_rubric_blocked_reason,
    providerSuggestionBlockedByRubric ? 'metadata_not_propagated' : 'none',
  );
  const providerRubricBlockedReason = providerSuggestionBlockedByRubric
    && ['unknown', 'provider_blocked_reason'].includes(rawProviderRubricBlockedReason)
    ? 'metadata_not_propagated'
    : rawProviderRubricBlockedReason;
  const providerRubricBlockedCategories = normalizeAssistantList(
    serverSuggestion.providerRubricBlockedCategories || serverSuggestion.provider_rubric_blocked_categories,
  );
  const rawProviderOutputAcceptedReason = normalizeAssistantMeta(
    serverSuggestion.providerOutputAcceptedReason || serverSuggestion.provider_output_accepted_reason,
    providerSucceededWithServerFallback && providerSuggestionBlockedByRubric
      ? 'valid_schema_but_blocked_by_rubric'
      : providerSucceededWithServerFallback ? 'metadata_missing' : 'unknown',
  );
  const rawProviderSuggestionFallbackReason = normalizeAssistantMeta(
    serverSuggestion.providerSuggestionFallbackReason || serverSuggestion.provider_suggestion_fallback_reason,
    providerSuggestionUsed
      ? 'none'
      : providerSucceededWithServerFallback ? 'metadata_not_propagated' : 'unknown',
  );
  const conversationStateAcknowledged = normalizeAssistantBoolean(
    serverSuggestion.conversationStateAcknowledged ?? serverSuggestion.conversation_state_acknowledged,
    false,
  );
  const conversationStateAligned = normalizeAssistantBoolean(
    serverSuggestion.conversationStateAligned ?? serverSuggestion.conversation_state_aligned,
    false,
  );
  const conversationStateKnownFacts = normalizeAssistantList(
    serverSuggestion.conversationStateKnownFacts || serverSuggestion.conversation_state_known_facts,
  ).slice(0, 8);
  const conversationStateMissingFacts = normalizeAssistantList(
    serverSuggestion.conversationStateMissingFacts || serverSuggestion.conversation_state_missing_facts,
  ).slice(0, 6);
  const conversationStateRiskFlags = normalizeAssistantList(
    serverSuggestion.conversationStateRiskFlags || serverSuggestion.conversation_state_risk_flags,
  ).slice(0, 6);
  const conversationStateNextExpectedField = normalizeAssistantMeta(
    serverSuggestion.conversationStateNextExpectedField || serverSuggestion.conversation_state_next_expected_field,
    'unknown',
  );
  const conversationStateLatestAnsweredField = normalizeAssistantMeta(
    serverSuggestion.conversationStateLatestAnsweredField
      || serverSuggestion.conversation_state_latest_answered_field,
    'unknown',
  );
  const conversationStateShouldAvoidRepeatingQuestion = normalizeAssistantBoolean(
    serverSuggestion.conversationStateShouldAvoidRepeatingQuestion
      ?? serverSuggestion.conversation_state_should_avoid_repeating_question,
    false,
  );
  const conversationInterpretationAcknowledged = normalizeAssistantBoolean(
    serverSuggestion.conversationInterpretationAcknowledged ?? serverSuggestion.conversation_interpretation_acknowledged,
    false,
  );
  const conversationInterpretationAligned = normalizeAssistantBoolean(
    serverSuggestion.conversationInterpretationAligned ?? serverSuggestion.conversation_interpretation_aligned,
    false,
  );
  const conversationInterpretationInferredIntent = normalizeAssistantMeta(
    serverSuggestion.conversationInterpretationInferredIntent
      || serverSuggestion.conversation_interpretation_inferred_intent,
    'unknown',
  );
  const conversationInterpretationLatestAnsweredField = normalizeAssistantMeta(
    serverSuggestion.conversationInterpretationLatestAnsweredField
      || serverSuggestion.conversation_interpretation_latest_answered_field,
    'unknown',
  );
  const conversationInterpretationNextExpectedField = normalizeAssistantMeta(
    serverSuggestion.conversationInterpretationNextExpectedField
      || serverSuggestion.conversation_interpretation_next_expected_field,
    'unknown',
  );
  const conversationInterpretationShouldAvoidRepeatingQuestion = normalizeAssistantBoolean(
    serverSuggestion.conversationInterpretationShouldAvoidRepeatingQuestion
      ?? serverSuggestion.conversation_interpretation_should_avoid_repeating_question,
    false,
  );
  const providerPlaybookAcknowledged = normalizeAssistantBoolean(
    serverSuggestion.providerPlaybookAcknowledged ?? serverSuggestion.provider_playbook_acknowledged,
    false,
  );
  const providerPlaybookAligned = normalizeAssistantBoolean(
    serverSuggestion.providerPlaybookAligned ?? serverSuggestion.provider_playbook_aligned,
    false,
  );
  const providerPlaybookId = normalizeAssistantMeta(
    serverSuggestion.providerPlaybookId || serverSuggestion.provider_playbook_id,
    'unknown',
  );
  const replyBriefAcknowledged = normalizeAssistantBoolean(
    serverSuggestion.replyBriefAcknowledged ?? serverSuggestion.reply_brief_acknowledged,
    false,
  );
  const replyBriefAligned = normalizeAssistantBoolean(
    serverSuggestion.replyBriefAligned ?? serverSuggestion.reply_brief_aligned,
    false,
  );
  const replyExpectedQuestion = normalizeAssistantMeta(
    serverSuggestion.replyExpectedQuestion || serverSuggestion.reply_expected_question,
    '',
  );
  const replyPrimaryGoal = normalizeAssistantMeta(
    serverSuggestion.replyPrimaryGoal || serverSuggestion.reply_primary_goal,
    'unknown',
  );
  const replySafetyChecks = normalizeAssistantList(
    serverSuggestion.replySafetyChecks || serverSuggestion.reply_safety_checks,
  );
  const replyStrategy = normalizeAssistantMeta(
    serverSuggestion.replyStrategy || serverSuggestion.reply_strategy,
    'unknown',
  );
  const replyContinuityAcknowledged = normalizeAssistantBoolean(
    serverSuggestion.replyContinuityAcknowledged ?? serverSuggestion.reply_continuity_acknowledged,
    false,
  );
  const replyContinuityAligned = normalizeAssistantBoolean(
    serverSuggestion.replyContinuityAligned ?? serverSuggestion.reply_continuity_aligned,
    false,
  );
  const replyContinuityAcknowledgement = normalizeAssistantMeta(
    serverSuggestion.replyContinuityAcknowledgement || serverSuggestion.reply_continuity_acknowledgement,
    'unknown',
  );
  const replyContinuityNextMove = normalizeAssistantMeta(
    serverSuggestion.replyContinuityNextMove || serverSuggestion.reply_continuity_next_move,
    'unknown',
  );

  return {
    allowedTenantSource: normalizeAssistantMeta(
      serverSuggestion.allowedTenantSource || serverSuggestion.allowed_tenant_source,
      'unknown',
    ),
    edgeConversationResolved: normalizeAssistantBoolean(
      serverSuggestion.edgeConversationResolved ?? serverSuggestion.edge_conversation_resolved,
      false,
    ),
    edgeNoSuggestionReason: normalizeAssistantMeta(
      serverSuggestion.edgeNoSuggestionReason || serverSuggestion.edge_no_suggestion_reason,
      edgeResponseUsed ? 'none' : 'unknown',
    ),
    edgeResponseAccepted,
    edgeResponseUsed,
    edgeSettingsRead: normalizeAssistantBoolean(
      serverSuggestion.edgeSettingsRead ?? serverSuggestion.edge_settings_read,
      false,
    ),
    edgeSettingsReadSource: normalizeAssistantMeta(
      serverSuggestion.edgeSettingsReadSource || serverSuggestion.edge_settings_read_source,
      'unknown',
    ),
    edgeSettingsReadStatus: normalizeAssistantMeta(
      serverSuggestion.edgeSettingsReadStatus || serverSuggestion.edge_settings_read_status,
      'unknown',
    ),
    edgeTenantResolved: normalizeAssistantBoolean(
      serverSuggestion.edgeTenantResolved ?? serverSuggestion.edge_tenant_resolved,
      false,
    ),
    localFallbackUsed: false,
    contextInputCharsBucket: normalizeAssistantMeta(
      serverSuggestion.contextInputCharsBucket || serverSuggestion.context_input_chars_bucket,
      'unknown',
    ),
    contextPackTruncated: normalizeAssistantBoolean(
      serverSuggestion.contextPackTruncated ?? serverSuggestion.context_pack_truncated,
      false,
    ),
    inputCharsBucket: normalizeAssistantMeta(
      serverSuggestion.inputCharsBucket || serverSuggestion.input_chars_bucket,
      'unknown',
    ),
    maxOutputTokensBucket: normalizeAssistantMeta(
      serverSuggestion.maxOutputTokensBucket || serverSuggestion.max_output_tokens_bucket,
      'unknown',
    ),
    providerAbortReason: normalizeAssistantMeta(
      serverSuggestion.providerAbortReason || serverSuggestion.provider_abort_reason,
      'unknown',
    ),
    providerDiagnosticsSource,
    providerEndpointFamily: normalizeAssistantMeta(
      serverSuggestion.providerEndpointFamily || serverSuggestion.provider_endpoint_family,
      'unknown',
    ),
    providerElapsedMsBucket: normalizeAssistantMeta(
      serverSuggestion.providerElapsedMsBucket || serverSuggestion.provider_elapsed_ms_bucket,
      'not_measured',
    ),
    providerFetchAborted: normalizeAssistantBoolean(
      serverSuggestion.providerFetchAborted ?? serverSuggestion.provider_fetch_aborted,
      false,
    ),
    providerFetchSettled: normalizeAssistantBoolean(
      serverSuggestion.providerFetchSettled ?? serverSuggestion.provider_fetch_settled,
      false,
    ),
    providerFailureKind: normalizeAssistantMeta(
      serverSuggestion.providerFailureKind || serverSuggestion.provider_failure_kind,
      'provider_not_called',
    ),
    providerFailureRetryable: typeof (serverSuggestion.providerFailureRetryable ?? serverSuggestion.provider_failure_retryable) === 'boolean'
      ? (serverSuggestion.providerFailureRetryable ?? serverSuggestion.provider_failure_retryable)
      : null,
    providerFailureStage: normalizeAssistantMeta(
      serverSuggestion.providerFailureStage || serverSuggestion.provider_failure_stage,
      'unknown',
    ),
    providerFailureStatus: normalizeAssistantMeta(
      serverSuggestion.providerFailureStatus || serverSuggestion.provider_failure_status,
      'unknown',
    ),
    providerGateChecksAreServerSide,
    providerGateChecksSource,
    providerHttpStatus: Number.isFinite(Number(serverSuggestion.providerHttpStatus ?? serverSuggestion.provider_http_status))
      ? Number(serverSuggestion.providerHttpStatus ?? serverSuggestion.provider_http_status)
      : null,
    providerModelLabel: sanitizeAssistantLabel(
      serverSuggestion.providerModelLabel || serverSuggestion.provider_model_label || serverSuggestion.model,
      'unknown',
      80,
    ),
    providerRequestStarted: normalizeAssistantBoolean(
      serverSuggestion.providerRequestStarted ?? serverSuggestion.provider_request_started,
      false,
    ),
    providerOutputAcceptedReason: providerSucceededWithServerFallback
      && providerSuggestionBlockedByRubric
      && rawProviderOutputAcceptedReason === 'accepted'
      ? 'valid_schema_but_blocked_by_rubric'
      : rawProviderOutputAcceptedReason,
    providerOutputAccepted: normalizeAssistantBoolean(
      serverSuggestion.providerOutputAccepted ?? serverSuggestion.provider_output_accepted,
      false,
    ),
    providerParseSource: normalizeAssistantMeta(
      serverSuggestion.providerParseSource || serverSuggestion.provider_parse_source,
      providerSucceededWithServerFallback ? 'metadata_not_propagated' : 'unknown',
    ),
    providerParseStatus: normalizeAssistantMeta(
      serverSuggestion.providerParseStatus || serverSuggestion.provider_parse_status,
      serverSuggestion.providerResponseParsed || serverSuggestion.provider_response_parsed
        ? 'parsed'
        : providerSucceededWithServerFallback ? 'metadata_missing' : 'unknown',
    ),
    providerResponseParsed: normalizeAssistantBoolean(
      serverSuggestion.providerResponseParsed ?? serverSuggestion.provider_response_parsed,
      false,
    ),
    providerSchemaMismatchFields: normalizeAssistantList(
      serverSuggestion.providerSchemaMismatchFields || serverSuggestion.provider_schema_mismatch_fields,
    ),
    providerRubricBlockedCategories: providerRubricBlockedCategories.length
      ? providerRubricBlockedCategories
      : providerSuggestionBlockedByRubric
        ? ['metadata_not_propagated']
        : [],
    providerRubricBlockedReason,
    providerRubricDecision: normalizeAssistantMeta(
      serverSuggestion.providerRubricDecision || serverSuggestion.provider_rubric_decision,
      providerSuggestionBlockedByRubric ? 'metadata_not_propagated' : providerSuggestionUsed ? 'approved' : 'not_evaluated',
    ),
    providerSecretCheckName: sanitizeAssistantLabel(
      serverSuggestion.providerSecretCheckName || serverSuggestion.provider_secret_check_name,
      'not_checked',
      80,
    ),
    providerSuggestionAccepted: normalizeAssistantBoolean(
      serverSuggestion.providerSuggestionAccepted ?? serverSuggestion.provider_suggestion_accepted,
      providerSuggestionUsed,
    ),
    providerSuggestionBlockedByRubric,
    providerSuggestionFallbackReason: normalizeAssistantMeta(
      rawProviderSuggestionFallbackReason === 'provider_blocked_reason'
        ? 'blocked_by_rubric'
        : rawProviderSuggestionFallbackReason,
      'unknown',
    ),
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
    providerTimeoutMsBucket: normalizeAssistantMeta(
      serverSuggestion.providerTimeoutMsBucket || serverSuggestion.provider_timeout_ms_bucket,
      'unknown',
    ),
    providerTimeoutSource: normalizeAssistantMeta(
      serverSuggestion.providerTimeoutSource || serverSuggestion.provider_timeout_source,
      'unknown',
    ),
    responseMode: normalizeAssistantMeta(
      serverSuggestion.responseMode || serverSuggestion.response_mode,
      normalizeAssistantMeta(serverSuggestion.mode, 'unknown'),
    ),
    responseSource: normalizeAssistantMeta(
      serverSuggestion.responseSource || serverSuggestion.response_source,
      normalizeAssistantMeta(serverSuggestion.source, 'unknown'),
    ),
    requestPayloadSizeBucket: normalizeAssistantMeta(
      serverSuggestion.requestPayloadSizeBucket || serverSuggestion.request_payload_size_bucket,
      'unknown',
    ),
    responseFormatMode: normalizeAssistantMeta(
      serverSuggestion.responseFormatMode || serverSuggestion.response_format_mode,
      'unknown',
    ),
    finalDraftOriginLabel: sanitizeAssistantLabel(
      serverSuggestion.finalDraftOriginLabel || serverSuggestion.final_draft_origin_label,
      normalizedFinalDraftSource === 'provider'
        ? 'Gerado por IA real'
        : normalizedFinalDraftSource === 'server_fallback'
          ? 'Fallback seguro do servidor'
          : normalizedFinalDraftSource === 'local_fallback'
            ? 'Fallback local'
            : 'Sem rascunho',
      80,
    ),
    finalDraftSource: normalizedFinalDraftSource,
    serverFallbackUsed: normalizedFinalDraftSource === 'server_fallback' || serverFallbackUsed,
    serverSuggestionUsed,
  };
};

const normalizeDraftQualityStatus = (value = '', fallback = OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.approved) => {
  const normalized = normalizeAssistantMeta(value, fallback);
  return Object.values(OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY).includes(normalized)
    ? normalized
    : fallback;
};

const normalizeBlockedReasonTokenList = (value = []) => normalizeAssistantList(value)
  .map((item) => normalizeAssistantMeta(item, ''))
  .filter(Boolean);

const uniqueAssistantStrings = (items = []) => Array.from(new Set(items.filter(Boolean)));
const hasAssistantRedactionMarker = (value = '') => /\[[^\]]+removido\]/i.test(String(value || ''));

export const buildOmnichannelAssistantDraftBlockedFeedback = (draft = {}) => {
  const draftQualityReasons = normalizeAssistantList(
    draft.draftQualityReasons || draft.draft_quality_reasons,
  );
  const draftQualityFlags = normalizeBlockedReasonTokenList(
    draft.draftQualityFlags || draft.draft_quality_flags,
  );
  const providerRubricBlockedCategories = normalizeBlockedReasonTokenList(
    draft.providerRubricBlockedCategories || draft.provider_rubric_blocked_categories,
  );
  const providerRubricBlockedReason = normalizeAssistantMeta(
    draft.providerRubricBlockedReason || draft.provider_rubric_blocked_reason,
    '',
  );
  const providerSuggestionFallbackReason = normalizeAssistantMeta(
    draft.providerSuggestionFallbackReason || draft.provider_suggestion_fallback_reason,
    '',
  );
  const providerOutputAcceptedReason = normalizeAssistantMeta(
    draft.providerOutputAcceptedReason || draft.provider_output_accepted_reason,
    '',
  );
  const noSuggestionReason = normalizeAssistantMeta(
    draft.edgeNoSuggestionReason || draft.edge_no_suggestion_reason,
    '',
  );
  const blockedReason = normalizeAssistantMeta(
    draft.blockedReason || draft.blocked_reason,
    '',
  );
  const mappedReasons = uniqueAssistantStrings([
    ...draftQualityFlags,
    ...providerRubricBlockedCategories,
    providerRubricBlockedReason,
    providerSuggestionFallbackReason,
    providerOutputAcceptedReason,
    noSuggestionReason,
    blockedReason,
  ])
    .map((token) => DRAFT_BLOCKED_REASON_PRESENTATION[token])
    .filter(Boolean);
  const safeDraftQualityReason = draftQualityReasons.find((reason) => !hasAssistantRedactionMarker(reason));
  const specificReason = safeDraftQualityReason || mappedReasons[0]
    || 'A rubrica não encontrou um rascunho seguro para usar agora.';

  return `Rascunho bloqueado: ${specificReason} Nada foi enviado. Gere novamente ou responda manualmente.`;
};

const normalizeAssistantPlaybook = (serverSuggestion = {}, localModel = {}) => {
  const selectedPlaybook = normalizeAssistantObject(
    serverSuggestion.selectedPlaybook || serverSuggestion.selected_playbook,
    {},
  );
  const prohibitedClaims = normalizeAssistantList(
    serverSuggestion.playbookProhibitedClaims
      || serverSuggestion.playbook_prohibited_claims
      || selectedPlaybook.prohibitedClaims
      || selectedPlaybook.prohibited_claims,
  );

  return {
    playbookAllowedNextStep: sanitizeAssistantLabel(
      serverSuggestion.playbookAllowedNextStep
        || serverSuggestion.playbook_allowed_next_step
        || selectedPlaybook.allowedNextStep
        || selectedPlaybook.allowed_next_step,
      localModel.playbookAllowedNextStep || '',
      180,
    ),
    playbookId: sanitizeAssistantLabel(
      serverSuggestion.playbookId
        || serverSuggestion.playbook_id
        || selectedPlaybook.playbookId
        || selectedPlaybook.playbook_id,
      localModel.playbookId || 'sem_assunto_definido',
      80,
    ),
    playbookLabel: sanitizeAssistantLabel(
      serverSuggestion.playbookLabel
        || serverSuggestion.playbook_label
        || selectedPlaybook.playbookLabel
        || selectedPlaybook.playbook_label
        || selectedPlaybook.label,
      localModel.playbookLabel || 'Assunto indefinido',
      140,
    ),
    playbookObjective: sanitizeAssistantLabel(
      serverSuggestion.playbookObjective
        || serverSuggestion.playbook_objective
        || selectedPlaybook.objective,
      localModel.playbookObjective || '',
      220,
    ),
    playbookProhibitedClaims: prohibitedClaims.length ? prohibitedClaims : toList(localModel.playbookProhibitedClaims),
    playbookRecommendedNextStep: sanitizeAssistantLabel(
      serverSuggestion.playbookRecommendedNextStep
        || serverSuggestion.playbook_recommended_next_step
        || selectedPlaybook.recommendedNextStep
        || selectedPlaybook.recommended_next_step,
      localModel.playbookRecommendedNextStep || '',
      180,
    ),
    playbookTone: sanitizeAssistantLabel(
      serverSuggestion.playbookTone
        || serverSuggestion.playbook_tone
        || selectedPlaybook.tone,
      localModel.playbookTone || '',
      120,
    ),
  };
};

const normalizeAssistantReplyPlan = (serverSuggestion = {}, localModel = {}) => {
  const replyPlan = normalizeAssistantObject(
    serverSuggestion.replyPlan || serverSuggestion.reply_plan,
    localModel.replyPlan || {},
  );

  return {
    humanReviewRequired: normalizeAssistantBoolean(
      replyPlan.humanReviewRequired ?? replyPlan.human_review_required,
      true,
    ),
    intent: sanitizeAssistantLabel(replyPlan.intent, localModel.replyPlan?.intent || 'local_human_review', 80),
    nextAction: sanitizeAssistantLabel(
      replyPlan.nextAction || replyPlan.next_action,
      localModel.replyPlan?.nextAction || '',
      220,
    ),
    nextQuestion: sanitizeAssistantLabel(
      replyPlan.nextQuestion || replyPlan.next_question,
      localModel.replyPlan?.nextQuestion || '',
      180,
    ),
    playbookId: sanitizeAssistantLabel(
      replyPlan.playbookId || replyPlan.playbook_id,
      localModel.replyPlan?.playbookId || localModel.playbookId || 'sem_assunto_definido',
      80,
    ),
    source: sanitizeAssistantLabel(replyPlan.source, localModel.replyPlan?.source || 'local_sanitized_playbook', 80),
    tone: sanitizeAssistantLabel(replyPlan.tone, localModel.replyPlan?.tone || localModel.playbookTone || '', 120),
    sent: false,
  };
};

const normalizeAssistantReplyContinuity = (serverSuggestion = {}, localModel = {}) => {
  const replyContinuity = normalizeAssistantObject(
    serverSuggestion.replyContinuity || serverSuggestion.reply_continuity,
    localModel.replyContinuity || {},
  );

  return {
    acknowledgement: sanitizeAssistantLabel(
      replyContinuity.acknowledgement,
      localModel.replyContinuity?.acknowledgement || 'acknowledge_patient_message',
      80,
    ),
    guardrails: normalizeAssistantList(replyContinuity.guardrails).slice(0, 8),
    humanReviewFocus: sanitizeAssistantLabel(
      replyContinuity.humanReviewFocus || replyContinuity.human_review_focus,
      localModel.replyContinuity?.humanReviewFocus || 'general_review',
      80,
    ),
    nextMove: sanitizeAssistantLabel(
      replyContinuity.nextMove || replyContinuity.next_move,
      localModel.replyContinuity?.nextMove || 'advance_to_human_review',
      80,
    ),
    shouldAskFollowUp: normalizeAssistantBoolean(
      replyContinuity.shouldAskFollowUp ?? replyContinuity.should_ask_follow_up,
      localModel.replyContinuity?.shouldAskFollowUp || false,
    ),
    source: sanitizeAssistantLabel(
      replyContinuity.source,
      localModel.replyContinuity?.source || 'local_sanitized_playbook',
      80,
    ),
    sent: false,
  };
};

const resolveDraftQualityPresentation = (status) => (
  DRAFT_QUALITY_PRESENTATION[status] || DRAFT_QUALITY_PRESENTATION[OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.approved]
);

const resolveSafeToUseAsDraft = ({
  canUseDraft,
  replyDraft,
  safeToUseAsDraft,
  status,
} = {}) => {
  if (!replyDraft || status === OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked) return false;
  if (typeof safeToUseAsDraft === 'boolean') return safeToUseAsDraft;
  return Boolean(canUseDraft ?? replyDraft);
};

const resolveAssistantDecisionReasonLabel = (...tokens) => {
  const normalizedTokens = tokens
    .map((token) => normalizeAssistantMeta(token, ''))
    .filter(Boolean);
  const matchedToken = normalizedTokens.find((token) => (
    ASSISTANT_DECISION_REASON_PRESENTATION[token]
  )) || 'unknown';

  return ASSISTANT_DECISION_REASON_PRESENTATION[matchedToken];
};

const resolveAssistantDecisionContinuityLabel = (...tokens) => {
  const normalizedTokens = tokens
    .map((token) => normalizeAssistantMeta(token, ''))
    .filter(Boolean);
  const matchedToken = normalizedTokens.find((token) => (
    ASSISTANT_DECISION_CONTINUITY_PRESENTATION[token]
  )) || 'unknown';

  return ASSISTANT_DECISION_CONTINUITY_PRESENTATION[matchedToken];
};

const buildAssistantDecisionExplanation = (model = {}) => {
  const providerSuggestionUsed = normalizeAssistantBoolean(
    model.providerSuggestionUsed,
    model.finalDraftSource === 'provider',
  );
  const providerSuggestionBlockedByRubric = normalizeAssistantBoolean(
    model.providerSuggestionBlockedByRubric,
    model.draftQualityStatus === OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked,
  );
  const serverFallbackUsed = normalizeAssistantBoolean(
    model.serverFallbackUsed,
    model.finalDraftSource === 'server_fallback',
  );
  const localFallbackUsed = normalizeAssistantBoolean(
    model.localFallbackUsed,
    model.finalDraftSource === 'local_fallback',
  );
  const finalDraftSource = normalizeFinalDraftSource(
    model.finalDraftSource,
    providerSuggestionUsed
      ? 'provider'
      : serverFallbackUsed
        ? 'server_fallback'
        : localFallbackUsed
          ? 'local_fallback'
          : 'none',
  );
  const providerFailureKind = normalizeAssistantMeta(model.providerFailureKind, '');
  const providerSkipReason = normalizeAssistantMeta(model.providerSkipReason, '');
  const providerOutputAcceptedReason = normalizeAssistantMeta(model.providerOutputAcceptedReason, '');
  const providerSuggestionFallbackReason = normalizeAssistantMeta(model.providerSuggestionFallbackReason, '');
  const providerRubricBlockedReason = normalizeAssistantMeta(model.providerRubricBlockedReason, '');
  const providerParseStatus = normalizeAssistantMeta(model.providerParseStatus, '');
  const replyContinuityNextMove = normalizeAssistantMeta(model.replyContinuityNextMove, '');
  const replyContinuityAcknowledgement = normalizeAssistantMeta(model.replyContinuityAcknowledgement, '');
  const reasonLabel = resolveAssistantDecisionReasonLabel(
    providerSuggestionFallbackReason,
    providerRubricBlockedReason,
    providerOutputAcceptedReason,
    providerFailureKind,
    providerSkipReason,
    providerParseStatus,
  );
  const continuityLabel = resolveAssistantDecisionContinuityLabel(
    replyContinuityNextMove,
    replyContinuityAcknowledgement,
  );

  if (providerSuggestionUsed && finalDraftSource === 'provider') {
    return {
      description: 'A IA real liderou a sugestão, passou pela validação segura e gerou somente um rascunho para revisão humana.',
      items: [
        { label: 'Origem final', value: 'IA real controlada' },
        { label: 'Motivo seguro', value: reasonLabel },
        { label: 'Continuidade', value: continuityLabel },
      ],
      state: 'provider_used',
      stateLabel: 'IA real usada',
      tone: 'provider_real',
    };
  }

  if (providerSuggestionBlockedByRubric) {
    return {
      description: 'A IA pode ter respondido, mas a validação segura impediu usar o texto final. O atendimento deve seguir por revisão humana ou fallback.',
      items: [
        { label: 'Origem final', value: serverFallbackUsed ? 'Fallback seguro do servidor' : 'Sem rascunho aceito' },
        { label: 'Motivo seguro', value: reasonLabel },
        { label: 'Continuidade', value: continuityLabel },
      ],
      state: 'provider_blocked',
      stateLabel: 'IA bloqueada',
      tone: 'blocked',
    };
  }

  if (serverFallbackUsed || finalDraftSource === 'server_fallback') {
    return {
      description: 'O servidor manteve uma resposta conservadora em vez de usar texto da IA real. Nada foi enviado por esta tela.',
      items: [
        { label: 'Origem final', value: 'Fallback seguro do servidor' },
        { label: 'Motivo seguro', value: reasonLabel },
        { label: 'Continuidade', value: continuityLabel },
      ],
      state: 'server_fallback',
      stateLabel: 'Fallback seguro',
      tone: 'fallback',
    };
  }

  if (localFallbackUsed || finalDraftSource === 'local_fallback') {
    return {
      description: 'A tela usou o fallback local para manter apoio operacional quando a Edge ou a IA não trouxeram sugestão segura.',
      items: [
        { label: 'Origem final', value: 'Fallback local' },
        { label: 'Motivo seguro', value: reasonLabel },
        { label: 'Continuidade', value: continuityLabel },
      ],
      state: 'local_fallback',
      stateLabel: 'Fallback local',
      tone: 'fallback',
    };
  }

  return {
    description: 'A leitura atual ainda não confirmou uso de IA real nem fallback acionável. Gere uma sugestão segura ou responda manualmente.',
    items: [
      { label: 'Origem final', value: model.mode === 'dry_run' ? 'Dry-run seguro' : 'Sem rascunho confirmado' },
      { label: 'Motivo seguro', value: reasonLabel },
      { label: 'Continuidade', value: continuityLabel },
    ],
    state: model.mode === 'dry_run' ? 'dry_run' : 'not_confirmed',
    stateLabel: model.mode === 'dry_run' ? 'Dry-run' : 'A validar',
    tone: model.mode === 'dry_run' ? 'validation' : 'fallback',
  };
};

const withAssistantDecisionExplanation = (model = {}) => ({
  ...model,
  assistantDecision: buildAssistantDecisionExplanation(model),
});

const resolveAssistantPresentation = ({
  finalDraftOriginLabel = '',
  finalDraftSource = 'none',
  mode = '',
  source = '',
  tenantSettingsSource = '',
  tenantSettingsStatus = '',
} = {}) => {
  if (
    finalDraftSource === 'provider'
    && finalDraftOriginLabel === 'Gerado por IA real'
    && tenantSettingsSource === 'database'
    && tenantSettingsStatus === 'active_controlled'
    && mode === 'provider_real'
    && source === 'server_provider'
  ) {
    return {
      draftOriginDescription: 'Texto gerado pela IA real configurada para este teste. Revise antes de usar.',
      draftOriginLabel: finalDraftOriginLabel,
      draftOriginTone: 'provider_real',
      sourceDescription: 'OpenAI real controlada; revisão humana obrigatória',
      stateLabel: 'Assistente com IA real em teste',
    };
  }

  if (tenantSettingsSource === 'database' && tenantSettingsStatus === 'validation' && mode === 'dry_run') {
    return {
      draftOriginDescription: 'Texto de dry-run tenant-aware. Não houve geração por IA real.',
      draftOriginLabel: 'Não é IA real',
      draftOriginTone: 'dry_run',
      sourceDescription: 'Dry-run tenant-aware; fallback local disponível',
      stateLabel: 'Assistente em validação',
    };
  }

  if (mode === 'dry_run') {
    return {
      draftOriginDescription: 'Texto de dry-run seguro. Não houve geração por IA real.',
      draftOriginLabel: 'Não é IA real',
      draftOriginTone: 'dry_run',
      sourceDescription: 'Dry-run seguro; fallback local disponível',
      stateLabel: 'Assistente em validação',
    };
  }

  if (finalDraftSource === 'server_fallback') {
    return {
      draftOriginDescription: 'Texto preparado por fallback seguro do servidor. Não confirma uso do texto gerado por IA real.',
      draftOriginLabel: finalDraftOriginLabel || 'Fallback seguro do servidor',
      draftOriginTone: 'dry_run',
      sourceDescription: mode === 'provider_real'
        ? 'Provider real validado; fallback seguro aplicado'
        : 'Fallback seguro do servidor',
      stateLabel: mode === 'provider_real'
        ? 'Assistente em validação com fallback'
        : 'Assistente seguro',
    };
  }

  if (
    finalDraftSource === 'provider'
    &&
    tenantSettingsSource === 'database'
    && tenantSettingsStatus === 'active_controlled'
    && mode === 'provider_real'
    && source === 'server_provider'
  ) {
    return {
      draftOriginDescription: 'Texto gerado pela IA real configurada para este teste. Revise antes de usar.',
      draftOriginLabel: 'Gerado por IA real',
      draftOriginTone: 'provider_real',
      sourceDescription: 'OpenAI real controlada; revisão humana obrigatória',
      stateLabel: 'Assistente com IA real em teste',
    };
  }

  if (source === 'mock_fallback' || tenantSettingsSource === 'fallback' || tenantSettingsSource === 'unavailable') {
    return {
      draftOriginDescription: 'Texto preparado por fallback local, sem chamada de IA real.',
      draftOriginLabel: 'Fallback local',
      draftOriginTone: 'fallback',
      sourceDescription: 'Fallback local disponível',
      stateLabel: 'Assistente local seguro',
    };
  }

  return {
    draftOriginDescription: 'Texto seguro para validação. Origem real não confirmada.',
    draftOriginLabel: 'Origem em validação',
    draftOriginTone: 'validation',
    sourceDescription: 'Sugestão segura para validação',
    stateLabel: 'Assistente seguro',
  };
};

export const buildOmnichannelAttendanceAssistantDisplayModel = ({
  localModel,
  serverSuggestion = null,
} = {}) => {
  const hasServerSuggestionPayload = Boolean(serverSuggestion && typeof serverSuggestion === 'object');
  const hasServerSuggestionContent = Boolean(serverSuggestion?.replyDraft || serverSuggestion?.safeSummary);
  const edgeResponseAccepted = hasServerSuggestionPayload && serverSuggestion.accepted !== false;

  if (!hasServerSuggestionContent) {
    const localFallbackProviderGateChecks = normalizeProviderGateChecks({
      fallbackUsed: true,
      providerCallAttempted: false,
      providerCallSucceeded: false,
    });

    if (edgeResponseAccepted) {
      const mode = normalizeAssistantMeta(serverSuggestion.mode, 'off');
      const source = normalizeAssistantMeta(serverSuggestion.source, 'server_off');
      const tenantSettingsSource = normalizeAssistantMeta(
        serverSuggestion.tenantSettingsSource || serverSuggestion.tenant_settings_source,
        'fallback',
      );
      const tenantSettingsStatus = normalizeAssistantMeta(
        serverSuggestion.tenantSettingsStatus || serverSuggestion.tenant_settings_status,
        'not_used',
      );
      const providerGateChecks = normalizeProviderGateChecks(
        serverSuggestion.providerGateChecks || serverSuggestion.provider_gate_checks,
      );
      const providerSkipReason = normalizeAssistantMeta(
        serverSuggestion.providerSkipReason || serverSuggestion.provider_skip_reason,
        'server_suggestion_empty',
      );
      const edgeMetadata = normalizeAssistantEdgeMetadata(serverSuggestion, {
        edgeResponseAccepted: true,
        edgeResponseUsed: false,
        fallbackSource: 'edge',
        serverFallbackUsed: true,
        serverSuggestionUsed: false,
      });
      const draftQualityPresentation = resolveDraftQualityPresentation(
        OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked,
      );
      const tenantPlaybookPolicy = normalizeAssistantTenantPlaybookPolicy(
        serverSuggestion.tenantPlaybookPolicy || serverSuggestion.tenant_playbook_policy,
        localModel,
      );
      const serverDraftQualityReason = normalizeAssistantList(
        serverSuggestion.draftQualityReasons || serverSuggestion.draft_quality_reasons,
      ).find((reason) => !hasAssistantRedactionMarker(reason));

      return withAssistantDecisionExplanation({
        ...localModel,
        canUseDraft: false,
        draftQualityDescription: draftQualityPresentation.description,
        draftQualityFlags: [],
        draftQualityLabel: draftQualityPresentation.label,
        draftQualityReasons: [
          serverDraftQualityReason || 'Resposta server-side sem rascunho acionável.',
        ],
        draftQualityStatus: OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked,
        draftQualityTone: draftQualityPresentation.tone,
        draftOriginDescription: 'A Edge respondeu, mas sem rascunho acionável. Responda manualmente ou gere novamente.',
        draftOriginLabel: 'Sem rascunho server-side',
        draftOriginTone: 'fallback',
        edgeInvokeStatus: 'success',
        edgeProviderGateChecks: providerGateChecks,
        ...edgeMetadata,
        effectiveProviderGateChecks: providerGateChecks,
        localFallbackProviderGateChecks,
        mode,
        provider: sanitizeAssistantLabel(serverSuggestion.provider, 'off', 40),
        providerGateChecks,
        providerSkipReason,
        replyDraft: '',
        safeSummary: sanitizeAssistantLabel(serverSuggestion.safeSummary, '', 720),
        safeToUseAsDraft: false,
        sent: false,
        source,
        sourceDescription: 'Resposta da Edge sem sugestão acionável',
        stateLabel: 'Assistente sem rascunho',
        tenantPlaybookPolicy,
        tenantSettingsSource,
        tenantSettingsStatus,
        usedServerSuggestion: false,
      });
    }

    return withAssistantDecisionExplanation({
      ...localModel,
      canUseDraft: Boolean(localModel.replyDraft && localModel.safeToUseAsDraft),
      draftOriginDescription: 'Texto preparado por fallback local, sem chamada de IA real.',
      draftOriginLabel: 'Fallback local',
      draftOriginTone: 'fallback',
      sourceDescription: 'Fallback local disponível',
      edgeInvokeStatus: 'unknown',
      edgeProviderGateChecks: normalizeProviderGateChecks(),
      edgeResponseAccepted: false,
      edgeResponseUsed: false,
      edgeConversationResolved: false,
      edgeNoSuggestionReason: 'unknown',
      edgeSettingsRead: false,
      edgeSettingsReadSource: 'unknown',
      edgeSettingsReadStatus: 'unknown',
      edgeTenantResolved: false,
      effectiveProviderGateChecks: localFallbackProviderGateChecks,
      localFallbackProviderGateChecks,
      localFallbackUsed: true,
      allowedTenantSource: 'not_checked',
      providerDiagnosticsSource: 'local_fallback',
      providerEndpointFamily: 'unknown',
      providerFailureKind: 'provider_not_called',
      providerFailureRetryable: null,
      providerFailureStage: 'unknown',
      providerFailureStatus: 'provider_not_called',
      providerGateChecks: localFallbackProviderGateChecks,
      providerGateChecksAreServerSide: false,
      providerGateChecksSource: 'local_fallback',
      providerHttpStatus: null,
      providerModelLabel: 'local-rule-based',
      providerOutputAcceptedReason: 'local_fallback_used',
      providerOutputAccepted: false,
      providerParseSource: 'none',
      providerParseStatus: 'not_attempted',
      providerResponseParsed: false,
      providerSchemaMismatchFields: [],
      providerRubricBlockedCategories: [],
      providerRubricBlockedReason: 'none',
      providerRubricDecision: 'not_evaluated',
      providerSecretCheckName: 'not_checked',
      providerSuggestionAccepted: false,
      providerSuggestionBlockedByRubric: false,
      providerSuggestionFallbackReason: 'local_fallback_used',
      providerSuggestionUsed: false,
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
      providerSkipReason: 'local_fallback_used',
      responseMode: localModel.mode || 'unknown',
      responseSource: localModel.source || 'unknown',
      finalDraftOriginLabel: 'Fallback local',
      finalDraftSource: 'local_fallback',
      serverFallbackUsed: false,
      serverSuggestionUsed: false,
      tenantSettingsSource: 'fallback',
      tenantSettingsStatus: 'not_used',
      usedServerSuggestion: false,
    });
  }

  const detectedIntent = normalizeAssistantObject(serverSuggestion.detectedIntent, localModel.detectedIntent);
  const suggestedNextStep = normalizeAssistantObject(serverSuggestion.suggestedNextStep, localModel.suggestedNextStep);
  const mode = normalizeAssistantMeta(serverSuggestion.mode, 'off');
  const source = normalizeAssistantMeta(serverSuggestion.source, 'server_off');
  const tenantSettingsSource = normalizeAssistantMeta(serverSuggestion.tenantSettingsSource || serverSuggestion.tenant_settings_source, 'fallback');
  const tenantSettingsStatus = normalizeAssistantMeta(serverSuggestion.tenantSettingsStatus || serverSuggestion.tenant_settings_status, 'not_used');
  const providerGateChecks = normalizeProviderGateChecks(serverSuggestion.providerGateChecks || serverSuggestion.provider_gate_checks);
  const providerSkipReason = normalizeAssistantMeta(serverSuggestion.providerSkipReason || serverSuggestion.provider_skip_reason, 'unknown');
  const edgeProviderGateChecks = providerGateChecks;
  const localFallbackProviderGateChecks = normalizeProviderGateChecks();
  const inferredFinalDraftSource = normalizeFinalDraftSource(
    serverSuggestion.finalDraftSource || serverSuggestion.final_draft_source,
    mode === 'dry_run'
      ? 'none'
      : providerGateChecks.providerCallSucceeded === true
      && mode === 'provider_real'
      && source === 'server_provider'
        ? 'provider'
        : 'server_fallback',
  );
  const edgeMetadata = normalizeAssistantEdgeMetadata(serverSuggestion, {
    edgeResponseAccepted: true,
    edgeResponseUsed: true,
    finalDraftSource: inferredFinalDraftSource,
    fallbackSource: 'edge',
    serverFallbackUsed: inferredFinalDraftSource === 'server_fallback',
    serverSuggestionUsed: inferredFinalDraftSource !== 'none',
  });
  const presentation = resolveAssistantPresentation({
    finalDraftOriginLabel: edgeMetadata.finalDraftOriginLabel,
    finalDraftSource: edgeMetadata.finalDraftSource,
    mode,
    source,
    tenantSettingsSource,
    tenantSettingsStatus,
  });
  const replyDraft = sanitizeAssistantLabel(serverSuggestion.replyDraft, localModel.replyDraft, 420);
  const safeSummary = sanitizeAssistantLabel(serverSuggestion.safeSummary, localModel.safeSummary, 720);
  const safetyNotes = normalizeAssistantList(serverSuggestion.safetyNotes);
  const contextLabels = normalizeAssistantList(serverSuggestion.contextLabels);
  const contextPackSignals = normalizeAssistantList(serverSuggestion.contextPackSignals || serverSuggestion.context_pack_signals);
  const draftQualityStatus = normalizeDraftQualityStatus(
    serverSuggestion.draftQualityStatus || serverSuggestion.draft_quality_status,
    replyDraft
      ? OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.approved
      : OMNICHANNEL_ATTENDANCE_ASSISTANT_DRAFT_QUALITY.blocked,
  );
  const draftQualityPresentation = resolveDraftQualityPresentation(draftQualityStatus);
  const draftQualityFlags = normalizeAssistantList(serverSuggestion.draftQualityFlags || serverSuggestion.draft_quality_flags);
  const draftQualityReasons = normalizeAssistantList(serverSuggestion.draftQualityReasons || serverSuggestion.draft_quality_reasons);
  const draftBlockedFeedback = buildOmnichannelAssistantDraftBlockedFeedback({
    ...serverSuggestion,
    draftQualityFlags,
    draftQualityReasons,
    ...edgeMetadata,
  });
  const safeToUseAsDraft = resolveSafeToUseAsDraft({
    canUseDraft: serverSuggestion.canUseDraft ?? serverSuggestion.can_use_draft,
    replyDraft,
    safeToUseAsDraft: serverSuggestion.safeToUseAsDraft ?? serverSuggestion.safe_to_use_as_draft,
    status: draftQualityStatus,
  });
  const contextPackSummary = sanitizeAssistantLabel(
    serverSuggestion.contextPackSummary || serverSuggestion.context_pack_summary,
    localModel.contextPackSummary || '',
    260,
  );
  const playbook = normalizeAssistantPlaybook(serverSuggestion, localModel);
  const replyPlan = normalizeAssistantReplyPlan(serverSuggestion, localModel);
  const replyContinuity = normalizeAssistantReplyContinuity(serverSuggestion, localModel);
  const tenantPlaybookPolicy = normalizeAssistantTenantPlaybookPolicy(
    serverSuggestion.tenantPlaybookPolicy || serverSuggestion.tenant_playbook_policy,
    {
      ...localModel,
      ...playbook,
    },
  );

  return withAssistantDecisionExplanation({
    ...localModel,
    canUseDraft: Boolean(replyDraft && safeToUseAsDraft),
    contextLabels: contextLabels.length ? contextLabels : localModel.contextLabels,
    contextPackSignals: contextPackSignals.length ? contextPackSignals : localModel.contextPackSignals,
    contextPackSource: sanitizeAssistantLabel(
      serverSuggestion.contextPackSource || serverSuggestion.context_pack_source,
      localModel.contextPackSource || '',
      80,
    ),
    contextPackSummary,
    detectedIntent: {
      id: sanitizeAssistantLabel(detectedIntent.id, localModel.detectedIntent?.id || 'ambiguous', 80),
      label: sanitizeAssistantLabel(detectedIntent.label, localModel.detectedIntent?.label, 160),
      reason: sanitizeAssistantLabel(detectedIntent.reason, localModel.detectedIntent?.reason, 260),
    },
    draftQualityDescription: draftQualityPresentation.description,
    draftBlockedFeedback,
    draftQualityFlags,
    draftQualityLabel: draftQualityPresentation.label,
    draftQualityReasons,
    draftQualityStatus,
    draftQualityTone: draftQualityPresentation.tone,
    edgeInvokeStatus: 'success',
    edgeProviderGateChecks,
    ...edgeMetadata,
    effectiveProviderGateChecks: providerGateChecks,
    hasEnoughText: Boolean(replyDraft || safeSummary),
    localFallbackProviderGateChecks,
    mode,
    ...playbook,
    replyPlan,
    replyContinuity,
    provider: sanitizeAssistantLabel(serverSuggestion.provider, 'off', 40),
    providerGateChecks,
    providerSkipReason,
    redactionCount: Number.isFinite(Number(serverSuggestion.redactionCount)) ? Number(serverSuggestion.redactionCount) : 0,
    replyDraft,
    safeSummary,
    safetyNotes: safetyNotes.length ? safetyNotes : localModel.safetyNotes,
    safeToUseAsDraft,
    sent: false,
    source,
    draftOriginDescription: presentation.draftOriginDescription,
    draftOriginLabel: presentation.draftOriginLabel,
    draftOriginTone: presentation.draftOriginTone,
    sourceDescription: presentation.sourceDescription,
    stateLabel: presentation.stateLabel,
    suggestedNextStep: {
      description: sanitizeAssistantLabel(suggestedNextStep.description, localModel.suggestedNextStep?.description, 260),
      label: sanitizeAssistantLabel(suggestedNextStep.label, localModel.suggestedNextStep?.label, 160),
    },
    tenantPlaybookPolicy,
    tenantSettingsSource,
    tenantSettingsStatus,
    usedServerSuggestion: true,
  });
};
