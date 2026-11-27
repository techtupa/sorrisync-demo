import {
  getOmnichannelAutoReplyBlockReasonLabel,
  getOmnichannelTriageIntentLabel,
  getOmnichannelTriageQueueLabel,
  normalizeOmnichannelTriageIntentKey,
  normalizeOmnichannelTriageQueueKey,
} from '../repositories/omnichannelTriageBackendContract.js';

const FIXED_AUTO_REPLY_PREVIEWS = {
  agendar_avaliacao: 'Olá! Recebemos sua mensagem. Para te direcionar melhor, você quer agendar uma avaliação?',
  confirmar_horario: 'Recebemos sua mensagem sobre confirmação de horário. A equipe vai verificar e te responder.',
  falar_com_atendente: 'Claro. Vou direcionar sua mensagem para uma atendente.',
  outro_assunto: 'Recebemos sua mensagem e vamos direcionar para a equipe adequada.',
  remarcar_consulta: 'Entendi. Vou encaminhar sua solicitação de remarcação para a equipe da recepção.',
  retorno_pos_atendimento: 'Obrigado pelo contato. Vou encaminhar sua mensagem para a equipe acompanhar seu retorno.',
  tratamento_orcamento: 'Recebemos seu interesse. Vou encaminhar para a equipe responsável te orientar sobre o próximo passo.',
};

const PREVIEW_ALLOWED_MODES = new Set(['preview', 'assistive', 'controlled_test']);

const toArray = (value) => (Array.isArray(value) ? value : []);

const AUTO_REPLY_OBSERVABILITY_REASON_LABELS = {
  auto_reply_disabled: 'Auto-resposta desligada',
  base_decision_not_previewed: 'Decisão base não liberou resposta',
  bot_send_blocked: 'Envio bloqueado por segurança',
  bot_send_default_off: 'Envio do bot desligado por padrão',
  bot_send_failed: 'Transporte controlado falhou',
  bot_send_sent: 'Envio controlado registrado',
  channel_not_ready: 'Canal WhatsApp não pronto',
  duplicate_idempotency: 'Tentativa duplicada protegida',
  human_handoff_required: 'Handoff humano exigido',
  kill_switch_enabled: 'Kill switch ativo',
  mode_not_controlled_test: 'Modo não autorizado',
  outside_allowlist: 'Contato fora da allowlist',
  provider_safe_block: 'Provider bloqueado por segurança',
  provider_invalid_response: 'Resposta da IA fora do contrato seguro',
  provider_unavailable: 'IA real indisponível',
  reply_brief_mismatch: 'IA não seguiu o objetivo da resposta',
  reply_continuity_mismatch: 'IA repetiria informação já respondida',
  safe_diagnostic_fallback: 'Fallback diagnóstico seguro',
  safe_direct_general_question_fallback: 'Fallback seguro de dúvida geral',
  safe_direct_support_request_fallback: 'Fallback seguro de atendimento humano',
  safe_media_review_fallback: 'Mídia recebida exige revisão humana',
  safe_opening_fallback: 'Abertura segura aplicada',
  safe_price_review_fallback: 'Preço/orçamento exige revisão humana',
  safe_reply_unavailable: 'Resposta segura indisponível',
  safe_schedule_change_review_fallback: 'Agenda exige revisão humana',
  safe_schedule_preference_review_fallback: 'Preferência de agenda exige revisão humana',
  safe_scheduling_intent_fallback: 'Intenção de consulta reconhecida',
  safe_support_choice_fallback: 'Escolha de suporte reconhecida',
  safe_support_summary_fallback: 'Resumo mantido para revisão humana',
  safe_urgency_review_fallback: 'Possível urgência exige revisão humana',
  safe_visit_context_answer_fallback: 'Contexto de atendimento reconhecido',
  tenant_ai_not_active_controlled: 'IA real não ativa para este tenant',
  transport_failed: 'Transporte controlado falhou',
  transport_unavailable: 'Transporte indisponível',
};

const AUTO_REPLY_OBSERVABILITY_SOURCE_LABELS = {
  local_fallback: 'Fallback local',
  provider: 'IA real',
  provider_real: 'IA real',
  provider_safe_block: 'IA bloqueada por segurança',
  server_fallback: 'Fallback seguro do servidor',
};

const AUTO_REPLY_SEND_PLAN_LABELS = {
  dry_run_only: 'Sem envio automático',
  internal_allowlist_send: 'Teste interno por allowlist',
};

const sanitizeText = (value = '') => String(value || '')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[contato]')
  .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[documento]')
  .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, '[id]')
  .replace(/\+?\d[\d\s().-]{7,}\d/g, '[telefone]')
  .replace(/\s+/g, ' ')
  .trim();

const sanitizeToken = (value = '', fallback = '') => sanitizeText(value || fallback)
  .toLowerCase()
  .replace(/[^a-z0-9_:-]+/g, '_')
  .replace(/_+/g, '_')
  .replace(/^_|_$/g, '')
  .slice(0, 80);

const resolveObservabilityReasonLabel = (value = '', fallback = 'Evidência segura registrada') => {
  const token = sanitizeToken(value);
  return AUTO_REPLY_OBSERVABILITY_REASON_LABELS[token] || sanitizeText(fallback || token || 'Evidência segura registrada');
};

const NON_ACTIONABLE_OBSERVABILITY_TOKENS = new Set([
  'not_attempted',
  'not_evaluated',
  'not_reported',
  'unknown',
]);

const resolveFirstActionableToken = (...values) => {
  for (const value of values) {
    const token = sanitizeToken(value);
    if (token && !NON_ACTIONABLE_OBSERVABILITY_TOKENS.has(token)) return token;
  }

  return '';
};

const resolveObservabilitySourceLabel = (value = '') => {
  const token = sanitizeToken(value);
  return AUTO_REPLY_OBSERVABILITY_SOURCE_LABELS[token] || (token ? sanitizeText(token.replace(/_/g, ' ')) : 'Não informado');
};

const resolveSendPlanLabel = (value = '') => {
  const token = sanitizeToken(value || 'dry_run_only');
  return AUTO_REPLY_SEND_PLAN_LABELS[token] || 'Plano seguro registrado';
};

const buildObservabilityCard = (id, label, value, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
  value: sanitizeText(value || 'Não informado'),
});

const getAttemptTimeValue = (attempt = {}) => {
  const time = attempt?.createdAt ? new Date(attempt.createdAt).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const getMessageTimeValue = (message = {}) => {
  const rawTime = message.receivedAt || message.sentAt || message.createdAt;
  const time = rawTime ? new Date(rawTime).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const isInboundMessage = (message = {}) => (
  message.direction !== 'outbound'
  && message.direction !== 'sent'
  && message.direction !== 'clinic'
);

const resolveLatestInboundMessageTime = (messages = []) => toArray(messages)
  .filter(isInboundMessage)
  .reduce((latestTime, message) => Math.max(latestTime, getMessageTimeValue(message)), 0);

const formatEvidenceTimeLabel = (time = 0) => (
  time > 0 ? new Date(time).toLocaleString('pt-BR') : 'Horário não informado'
);

const buildAutoReplyEvidenceFreshnessModel = ({
  currentAttempt = null,
  hasConversation = false,
  messages = [],
} = {}) => {
  if (!hasConversation) {
    return {
      checks: [
        buildAssistedTestChecklistItem('select-conversation', 'Selecionar conversa para comparar tentativa e última entrada.', false),
        buildAssistedTestChecklistItem('read-only', 'Comparação somente leitura; não envia WhatsApp.'),
      ],
      description: 'Compara a tentativa da auto-resposta com a última entrada do paciente sem ler conteúdo bruto.',
      isStale: false,
      stateLabel: 'Aguardando conversa',
      title: 'Cobertura da última entrada',
      tone: 'muted',
    };
  }

  const latestInboundTime = resolveLatestInboundMessageTime(messages);
  const attemptTime = getAttemptTimeValue(currentAttempt);

  if (!latestInboundTime) {
    return {
      checks: [
        buildAssistedTestChecklistItem('conversation-selected', 'Conversa selecionada.'),
        buildAssistedTestChecklistItem('inbound-loaded', 'Última entrada do paciente não foi carregada.', false),
        buildAssistedTestChecklistItem('read-only', 'A leitura não aciona provider, envio ou mutation.'),
      ],
      description: 'Não há entrada inbound carregada para comparar com a tentativa de auto-resposta.',
      isStale: false,
      latestInboundAtLabel: 'Sem entrada carregada',
      stateLabel: 'Sem entrada recente',
      title: 'Cobertura da última entrada',
      tone: 'muted',
    };
  }

  if (!currentAttempt || !attemptTime) {
    return {
      checks: [
        buildAssistedTestChecklistItem('latest-inbound', `Última entrada do paciente: ${formatEvidenceTimeLabel(latestInboundTime)}`),
        buildAssistedTestChecklistItem('attempt-current', 'Ainda não há tentativa sanitizada cobrindo essa entrada.', false),
        buildAssistedTestChecklistItem('manual-safe', 'Atendimento humano continua disponível.'),
      ],
      description: 'A conversa tem entrada do paciente sem tentativa sanitizada correspondente.',
      isStale: true,
      latestInboundAtLabel: formatEvidenceTimeLabel(latestInboundTime),
      stateLabel: 'Sem tentativa da última entrada',
      title: 'Cobertura da última entrada',
      tone: 'blocked',
    };
  }

  const isStale = attemptTime < latestInboundTime;

  if (isStale) {
    return {
      checks: [
        buildAssistedTestChecklistItem('latest-inbound', `Última entrada do paciente: ${formatEvidenceTimeLabel(latestInboundTime)}`),
        buildAssistedTestChecklistItem('attempt-current', `Última tentativa: ${formatEvidenceTimeLabel(attemptTime)}`, false),
        buildAssistedTestChecklistItem('manual-safe', 'Não usar tentativa antiga como conclusão da nova mensagem.'),
      ],
      description: 'Há mensagem do paciente mais recente que a última tentativa da auto-resposta.',
      isStale: true,
      latestAttemptAtLabel: formatEvidenceTimeLabel(attemptTime),
      latestInboundAtLabel: formatEvidenceTimeLabel(latestInboundTime),
      stateLabel: 'Evidência desatualizada',
      title: 'Cobertura da última entrada',
      tone: 'blocked',
    };
  }

  return {
    checks: [
      buildAssistedTestChecklistItem('latest-inbound', `Última entrada do paciente: ${formatEvidenceTimeLabel(latestInboundTime)}`),
      buildAssistedTestChecklistItem('attempt-current', `Última tentativa: ${formatEvidenceTimeLabel(attemptTime)}`),
      buildAssistedTestChecklistItem('read-only', 'Cobertura validada por metadados sanitizados.'),
    ],
    description: 'A última tentativa carregada é posterior ou igual à última entrada inbound carregada.',
    isStale: false,
    latestAttemptAtLabel: formatEvidenceTimeLabel(attemptTime),
    latestInboundAtLabel: formatEvidenceTimeLabel(latestInboundTime),
    stateLabel: 'Evidência atualizada',
    title: 'Cobertura da última entrada',
    tone: 'ready',
  };
};

const resolveAttemptRuntime = (attempt = {}) => {
  const botEventType = sanitizeToken(attempt.botEventType);
  const sent = botEventType === 'bot_send_sent' || (attempt.wouldSend === true && attempt.sendAllowed === true);
  const failed = botEventType === 'bot_send_failed' || attempt.blockReason === 'transport_failed';
  const blocked = attempt.decision === 'blocked' || botEventType === 'bot_send_blocked';
  const previewed = attempt.decision === 'previewed';
  const skipped = attempt.decision === 'skipped';
  const stateLabel = sent
    ? 'Auto-resposta enviada no teste'
    : failed
      ? 'Tentativa falhou'
      : blocked
        ? 'Bloqueada com segurança'
        : skipped
          ? 'Ignorada com segurança'
          : previewed
            ? 'Preparada com segurança'
            : 'Evidência registrada';
  const tone = sent
    ? 'sent'
    : failed || blocked
      ? 'blocked'
      : previewed
        ? 'ready'
        : 'muted';

  return {
    blocked,
    botEventType,
    failed,
    previewed,
    sent,
    skipped,
    stateLabel,
    tone,
  };
};

const resolveAttemptReasonToken = (attempt = {}) => {
  const aiDiagnostics = attempt.aiControlledReply || {};
  return resolveFirstActionableToken(
    aiDiagnostics.safeNoReplyDiagnosticReason,
    aiDiagnostics.providerSuggestionFallbackReason,
    aiDiagnostics.providerRubricBlockedReason,
    aiDiagnostics.providerFailureStatus,
    aiDiagnostics.providerFailureKind,
    aiDiagnostics.blockReason,
    attempt.blockReason,
    attempt.botEventType,
    attempt.decision,
  );
};

const resolveAttemptAiLabel = (attempt = {}) => {
  const aiDiagnostics = attempt.aiControlledReply || {};
  const responseSource = aiDiagnostics.responseSource || aiDiagnostics.finalDraftSource || '';

  if (aiDiagnostics.requiresAiReply === true) {
    return aiDiagnostics.providerCallSucceeded === true
      ? 'IA real consultada'
      : 'IA real tentou e caiu em segurança';
  }

  return responseSource
    ? resolveObservabilitySourceLabel(responseSource)
    : 'IA real não exigida';
};

const resolveAttemptSendLabel = (attempt = {}, runtime = resolveAttemptRuntime(attempt)) => {
  if (runtime.sent) return 'Envio controlado registrado';
  if (attempt.wouldSend) return 'Envio permitido no teste';
  return 'Sem envio registrado';
};

const buildAttemptHistoryItem = (attempt = {}, index = 0) => {
  const runtime = resolveAttemptRuntime(attempt);
  const reasonLabel = resolveObservabilityReasonLabel(resolveAttemptReasonToken(attempt), attempt.blockReasonLabel);

  return {
    aiLabel: resolveAttemptAiLabel(attempt),
    createdAtLabel: attempt.createdAt ? new Date(attempt.createdAt).toLocaleString('pt-BR') : 'Horário não informado',
    id: `attempt-${index + 1}`,
    reasonLabel,
    sendLabel: resolveAttemptSendLabel(attempt, runtime),
    stateLabel: runtime.stateLabel,
    tone: runtime.tone,
  };
};

const buildAssistedTestChecklistItem = (id, label, ok = true) => ({
  id,
  label: sanitizeText(label),
  ok: Boolean(ok),
});

const buildHumanHandoffLine = (id, label, value = '') => ({
  id,
  label: sanitizeText(label),
  value: sanitizeText(value || 'Não informado'),
});

const buildOperationalDiagnosisLine = (id, label, value = '') => buildHumanHandoffLine(id, label, value);

const buildOperationalLearningItem = (id, label, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
});

const buildRealConversationDiagnosisItem = (id, label, value = '') => ({
  id,
  label: sanitizeText(label),
  value: sanitizeText(value || 'Não informado'),
});

const buildLearningCycleCard = (id, label, value, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
  value: sanitizeText(value),
});

const buildLearningCycleRubricItem = (id, label, stateLabel, ok = null, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
  ok,
  stateLabel: sanitizeText(stateLabel),
});

const resolveAttemptFinalDraftSourceToken = (attempt = {}) => {
  const aiDiagnostics = attempt.aiControlledReply || {};
  return sanitizeToken(
    aiDiagnostics.finalDraftSource
    || aiDiagnostics.responseSource
    || aiDiagnostics.providerDiagnosticsSource
    || '',
  );
};

const attemptUsedProviderDraft = (attempt = {}) => {
  const aiDiagnostics = attempt.aiControlledReply || {};
  const finalSource = resolveAttemptFinalDraftSourceToken(attempt);
  return aiDiagnostics.providerSuggestionUsed === true
    || finalSource === 'provider'
    || finalSource === 'provider_real'
    || finalSource === 'server_provider';
};

const attemptUsedServerFallback = (attempt = {}) => {
  const aiDiagnostics = attempt.aiControlledReply || {};
  const finalSource = resolveAttemptFinalDraftSourceToken(attempt);
  return aiDiagnostics.serverFallbackUsed === true
    || finalSource === 'server_fallback'
    || finalSource === 'bridge_safe_block';
};

const buildAutoReplyLearningCycleModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  hasConversation = false,
  reasonLabel = '',
  runtime = null,
  totalAttempts = 0,
} = {}) => {
  const readOnlyChecklist = [
    buildLearningCycleRubricItem('copy-safe', 'Sem dado sensível', 'Somente metadados sanitizados', true, 'Não usa texto bruto, telefone, prompt, payload, hash ou UUID.'),
    buildLearningCycleRubricItem('human-review', 'Revisão humana', 'Obrigatória antes de virar cenário', false, 'A tela não grava marcação nem treina modelo automaticamente.'),
  ];

  if (!hasConversation) {
    return {
      canPromoteToSimulator: false,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', 'Sem conversa selecionada'),
        buildLearningCycleCard('observed-result', 'Resultado observado', 'Nenhuma evidência para avaliar'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Aguardando conversa'),
      ],
      caseToken: 'no_conversation_selected',
      checklist: readOnlyChecklist,
      description: 'Selecione uma conversa para transformar a evidência sanitizada em um caso de aprendizado revisável.',
      rubric: [
        buildLearningCycleRubricItem('conversation-selected', 'Conversa selecionada', 'Pendente', false),
        buildLearningCycleRubricItem('sanitized-evidence', 'Evidência sanitizada', 'Pendente', false),
        ...readOnlyChecklist,
      ],
      stateLabel: 'Aguardando conversa',
      title: 'Ciclo de aprendizado',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      canPromoteToSimulator: true,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', 'Nova mensagem sem evidência atualizada'),
        buildLearningCycleCard('observed-result', 'Resultado observado', 'A tentativa antiga não explica a última entrada'),
        buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Revisão humana antes de concluir se a IA falhou'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Cenário de silêncio após nova mensagem'),
      ],
      caseToken: 'stale_evidence_after_inbound',
      checklist: readOnlyChecklist,
      description: 'A conversa é candidata a aprendizado porque a última mensagem ainda não tem tentativa atualizada.',
      rubric: [
        buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', 'Não avaliado', null, 'A tentativa não cobre a entrada mais recente.'),
        buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Não usar evidência antiga', false),
        buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Atendimento humano'),
        buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Após resumo manual sanitizado', null),
        ...readOnlyChecklist,
      ],
      stateLabel: 'Nova mensagem sem evidência',
      title: 'Ciclo de aprendizado',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      canPromoteToSimulator: true,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', 'Conversa sem tentativa registrada'),
        buildLearningCycleCard('observed-result', 'Resultado observado', 'Não há decisão de auto-resposta carregada'),
        buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Diagnóstico de entrega ou atendimento manual'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Cenário de ausência de tentativa'),
      ],
      caseToken: 'missing_auto_reply_attempt',
      checklist: readOnlyChecklist,
      description: 'A conversa pode virar caso de aprendizado se a ausência de tentativa se repetir depois do refresh seguro.',
      rubric: [
        buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', 'Não avaliado', null),
        buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Sem evidência'),
        buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Atendimento manual'),
        buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Precisa resumo humano', null),
        ...readOnlyChecklist,
      ],
      stateLabel: 'Caso sem tentativa',
      title: 'Ciclo de aprendizado',
      tone: 'muted',
    };
  }

  const effectiveRuntime = runtime || resolveAttemptRuntime(currentAttempt);
  const safeReasonLabel = sanitizeText(reasonLabel || resolveObservabilityReasonLabel(resolveAttemptReasonToken(currentAttempt), currentAttempt.blockReasonLabel));
  const providerDraftUsed = attemptUsedProviderDraft(currentAttempt);
  const serverFallbackUsed = attemptUsedServerFallback(currentAttempt);
  const recentEvidenceLabel = totalAttempts > 1
    ? `${totalAttempts} tentativas recentes`
    : '1 tentativa recente';

  if (effectiveRuntime.sent) {
    const classification = providerDraftUsed
      ? 'Resposta liderada pela IA real'
      : serverFallbackUsed
        ? 'Fallback seguro usado no lugar da IA'
        : 'Resposta controlada registrada';
    const caseToken = providerDraftUsed
      ? 'provider_answer_review'
      : serverFallbackUsed
        ? 'server_fallback_learning_case'
        : 'controlled_send_learning_case';

    return {
      canPromoteToSimulator: true,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', classification),
        buildLearningCycleCard('observed-result', 'Resultado observado', safeReasonLabel),
        buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Validar se o paciente avançou sem repetir pergunta já respondida'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', providerDraftUsed ? 'Cenário positivo para regressão' : 'Cenário de fallback para melhorar IA'),
      ],
      caseToken,
      checklist: readOnlyChecklist,
      description: 'A resposta registrada pode virar cenário de regressão depois de validação humana da continuidade da conversa.',
      rubric: [
        buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', providerDraftUsed ? 'Validar acerto' : 'IA não liderou', providerDraftUsed ? null : false),
        buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Checar se não repetiu pergunta', null),
        buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Validar avanço no WhatsApp', null),
        buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Candidato após revisão', null, recentEvidenceLabel),
        ...readOnlyChecklist,
      ],
      stateLabel: providerDraftUsed ? 'Validar acerto' : 'Caso para simulador',
      title: 'Ciclo de aprendizado',
      tone: providerDraftUsed ? 'sent' : 'ready',
    };
  }

  if (effectiveRuntime.failed) {
    return {
      canPromoteToSimulator: true,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', 'Falha operacional'),
        buildLearningCycleCard('observed-result', 'Resultado observado', safeReasonLabel),
        buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Equipe assume antes de novo teste'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Cenário de estabilidade operacional'),
      ],
      caseToken: 'operational_failure_learning_case',
      checklist: readOnlyChecklist,
      description: 'A falha não mede qualidade da IA; ela vira caso para separar problema operacional de problema conversacional.',
      rubric: [
        buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', 'Não avaliado', null),
        buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Não avaliado', null),
        buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Assumir manualmente'),
        buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Após revisar causa operacional', null),
        ...readOnlyChecklist,
      ],
      stateLabel: 'Falha para aprender',
      title: 'Ciclo de aprendizado',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.blocked) {
    return {
      canPromoteToSimulator: true,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', 'Bloqueio seguro'),
        buildLearningCycleCard('observed-result', 'Resultado observado', safeReasonLabel),
        buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Criar variação segura para não deixar o paciente sem orientação'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Cenário de bloqueio/rubrica'),
      ],
      caseToken: 'safe_block_learning_case',
      checklist: readOnlyChecklist,
      description: 'O bloqueio seguro é útil para aprender onde a IA ou a rubrica ainda precisam de ajuste controlado.',
      rubric: [
        buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', 'Bloqueado para revisão', false),
        buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Revisar se havia fato conhecido', null),
        buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Handoff humano'),
        buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Candidato após resumo humano', null),
        ...readOnlyChecklist,
      ],
      stateLabel: 'Bloqueio para aprender',
      title: 'Ciclo de aprendizado',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.previewed) {
    return {
      canPromoteToSimulator: true,
      caseCards: [
        buildLearningCycleCard('classification', 'Classificação', 'Rascunho revisável'),
        buildLearningCycleCard('observed-result', 'Resultado observado', safeReasonLabel),
        buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Validar coerência antes de usar como resposta manual'),
        buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Cenário de rascunho assistido'),
      ],
      caseToken: 'reviewable_draft_learning_case',
      checklist: readOnlyChecklist,
      description: 'O rascunho pode alimentar regressão se a equipe classificar se ele era útil, repetitivo ou incompleto.',
      rubric: [
        buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', 'Validar manualmente', null),
        buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Checar repetição', null),
        buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Revisão humana'),
        buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Candidato após avaliação', null),
        ...readOnlyChecklist,
      ],
      stateLabel: 'Rascunho para revisar',
      title: 'Ciclo de aprendizado',
      tone: 'ready',
    };
  }

  return {
    canPromoteToSimulator: true,
    caseCards: [
      buildLearningCycleCard('classification', 'Classificação', 'Evidência inconclusiva'),
      buildLearningCycleCard('observed-result', 'Resultado observado', safeReasonLabel),
      buildLearningCycleCard('expected-next-step', 'Resposta esperada', 'Revisar manualmente antes de classificar'),
      buildLearningCycleCard('simulator-target', 'Destino do simulador', 'Cenário pendente de classificação'),
    ],
    caseToken: 'inconclusive_learning_case',
    checklist: readOnlyChecklist,
    description: 'A evidência pode virar aprendizado, mas ainda precisa de classificação humana antes de entrar na regressão.',
    rubric: [
      buildLearningCycleRubricItem('intent-understanding', 'Entendimento da intenção', 'Pendente', null),
      buildLearningCycleRubricItem('context-memory', 'Memória de contexto', 'Pendente', null),
      buildLearningCycleRubricItem('safe-next-step', 'Próximo passo seguro', 'Pendente', null),
      buildLearningCycleRubricItem('simulator-ready', 'Pronto para simulador', 'Precisa classificação', false),
      ...readOnlyChecklist,
    ],
    stateLabel: 'Classificar caso',
    title: 'Ciclo de aprendizado',
    tone: 'muted',
  };
};

const buildAutoReplyRealConversationDiagnosisModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  hasConversation = false,
  reasonLabel = '',
  runtime = null,
} = {}) => {
  if (!hasConversation) {
    return {
      canUseAsConversationEvidence: false,
      description: 'Selecione uma conversa para ver, em linguagem operacional, se a IA respondeu ou por que não respondeu.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', 'Sem conversa selecionada'),
        buildRealConversationDiagnosisItem('cause', 'Causa', 'Ainda não há conversa para diagnosticar.'),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Selecionar uma conversa do atendimento.'),
      ],
      stateLabel: 'Aguardando conversa',
      title: 'Leitura executiva da tentativa',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      canUseAsConversationEvidence: false,
      description: 'A última tentativa não cobre a mensagem mais recente do paciente.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', 'Sem resposta para a nova mensagem'),
        buildRealConversationDiagnosisItem('cause', 'Causa', 'Chegou mensagem do paciente depois da tentativa carregada.'),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Atualizar a leitura e manter atendimento humano até aparecer nova evidência.'),
      ],
      stateLabel: 'Evidência antiga',
      title: 'Leitura executiva da tentativa',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      canUseAsConversationEvidence: false,
      description: 'A conversa foi carregada, mas ainda não existe tentativa sanitizada para explicar resposta ou silêncio.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', 'Sem resposta registrada'),
        buildRealConversationDiagnosisItem('cause', 'Causa', 'Nenhuma decisão de auto-resposta foi carregada para esta conversa.'),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Responder manualmente se o paciente estiver aguardando e acompanhar nova tentativa.'),
      ],
      stateLabel: 'Sem evidência',
      title: 'Leitura executiva da tentativa',
      tone: 'muted',
    };
  }

  const effectiveRuntime = runtime || resolveAttemptRuntime(currentAttempt);
  const safeReasonLabel = sanitizeText(reasonLabel || resolveObservabilityReasonLabel(resolveAttemptReasonToken(currentAttempt), currentAttempt.blockReasonLabel));
  const providerDraftUsed = attemptUsedProviderDraft(currentAttempt);
  const serverFallbackUsed = attemptUsedServerFallback(currentAttempt);
  const aiLabel = resolveAttemptAiLabel(currentAttempt);

  if (effectiveRuntime.sent) {
    const resultLabel = providerDraftUsed
      ? 'IA real respondeu'
      : serverFallbackUsed
        ? 'Fallback seguro respondeu'
        : 'Resposta controlada registrada';
    const causeLabel = providerDraftUsed
      ? 'Rascunho da IA real passou pela rubrica e foi usado no teste controlado.'
      : serverFallbackUsed
        ? `A IA não liderou a resposta final; o servidor usou fallback seguro. Motivo: ${safeReasonLabel}.`
        : `A tentativa terminou com envio controlado. Motivo: ${safeReasonLabel}.`;

    return {
      canUseAsConversationEvidence: true,
      description: 'Houve resposta registrada no teste controlado; a conclusão de qualidade ainda depende de validação humana.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', resultLabel),
        buildRealConversationDiagnosisItem('cause', 'Causa', causeLabel),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Conferir no WhatsApp se a conversa avançou e registrar aprendizado manual antes de ampliar o teste.'),
      ],
      stateLabel: resultLabel,
      title: 'Leitura executiva da tentativa',
      tone: 'sent',
    };
  }

  if (effectiveRuntime.failed) {
    return {
      canUseAsConversationEvidence: false,
      description: 'A IA ou o transporte não entregou uma resposta utilizável para o paciente.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', 'Não respondeu por falha operacional'),
        buildRealConversationDiagnosisItem('cause', 'Causa', safeReasonLabel),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Assumir manualmente e revisar canal, provider ou transporte antes de repetir o teste.'),
      ],
      stateLabel: 'Falha operacional',
      title: 'Leitura executiva da tentativa',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.blocked) {
    return {
      canUseAsConversationEvidence: false,
      description: 'A proteção bloqueou a resposta para evitar mensagem insegura, incompleta ou fora do contrato.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', 'Não respondeu por bloqueio seguro'),
        buildRealConversationDiagnosisItem('cause', 'Causa', safeReasonLabel),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Responder manualmente e usar o motivo como caso de ajuste do playbook ou da rubrica.'),
      ],
      stateLabel: 'Bloqueio seguro',
      title: 'Leitura executiva da tentativa',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.previewed) {
    return {
      canUseAsConversationEvidence: false,
      description: 'A tentativa gerou rascunho ou evidência revisável, mas não comprova resposta automática ao paciente.',
      items: [
        buildRealConversationDiagnosisItem('result', 'Resultado', 'Gerou rascunho revisável'),
        buildRealConversationDiagnosisItem('cause', 'Causa', `${safeReasonLabel}. ${aiLabel}.`),
        buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Usar apenas como apoio manual e não contar como resposta automática validada.'),
      ],
      stateLabel: 'Rascunho revisável',
      title: 'Leitura executiva da tentativa',
      tone: 'ready',
    };
  }

  return {
    canUseAsConversationEvidence: false,
    description: 'Há metadados sanitizados, mas a tentativa ainda não fecha uma conclusão operacional.',
    items: [
      buildRealConversationDiagnosisItem('result', 'Resultado', effectiveRuntime.stateLabel),
      buildRealConversationDiagnosisItem('cause', 'Causa', safeReasonLabel),
      buildRealConversationDiagnosisItem('action', 'Próxima ação', 'Revisar manualmente antes de tratar como evidência de sucesso ou falha da IA.'),
    ],
    stateLabel: 'Revisar evidência',
    title: 'Leitura executiva da tentativa',
    tone: 'muted',
  };
};

const buildAutoReplyOperationalDiagnosisModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  hasConversation = false,
  reasonLabel = '',
  runtime = null,
  sendLabel = '',
} = {}) => {
  if (!hasConversation) {
    return {
      description: 'Explique o que aconteceu com a auto-resposta depois de selecionar uma conversa.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', 'Sem conversa selecionada'),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', 'Ainda não há conversa para diagnosticar.'),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Selecionar uma conversa do atendimento.'),
      ],
      learningItems: [
        buildOperationalLearningItem('select-conversation', 'Aprendizado depende de conversa selecionada.', 'Nenhum dado é consultado fora da leitura já autorizada.'),
        buildOperationalLearningItem('no-automatic-action', 'Este bloco não executa teste nem envia WhatsApp.'),
      ],
      nextStepLabel: 'Selecione uma conversa para ver por que a IA respondeu, não respondeu ou precisa de revisão humana.',
      stateLabel: 'Aguardando conversa',
      title: 'Diagnóstico operacional',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      description: 'A tentativa carregada é anterior à última mensagem do paciente, então ela não explica a conversa atual.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', evidenceFreshness.stateLabel),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', 'Chegou mensagem nova depois da última evidência da auto-resposta.'),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Responder manualmente ou aguardar nova tentativa aparecer após atualizar a leitura.'),
      ],
      learningItems: [
        buildOperationalLearningItem('stale-evidence', 'Tentativa antiga não vale como evidência da nova mensagem.', evidenceFreshness.stateLabel),
        buildOperationalLearningItem('manual-review', 'A conversa precisa de revisão humana antes de qualquer conclusão do piloto.'),
        buildOperationalLearningItem('refresh-or-wait', 'Atualizar a leitura pode trazer nova tentativa, sem disparar envio pela tela.'),
      ],
      nextStepLabel: 'Não trate a tentativa antiga como silêncio da IA para a mensagem nova; revise manualmente a última entrada.',
      stateLabel: 'Evidência antiga',
      title: 'Diagnóstico operacional',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      description: 'A conversa está selecionada, mas ainda não há tentativa sanitizada para explicar resposta ou silêncio da IA.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', 'Sem tentativa registrada'),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', 'O sistema ainda não registrou decisão de auto-resposta para esta conversa.'),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Manter atendimento manual se o paciente estiver aguardando.'),
      ],
      learningItems: [
        buildOperationalLearningItem('missing-attempt', 'Sem tentativa carregada não há como avaliar qualidade da IA.'),
        buildOperationalLearningItem('manual-path', 'Atendimento manual continua sendo o caminho seguro para o paciente.'),
        buildOperationalLearningItem('diagnostic-next', 'Repetição desse estado indica caso para diagnóstico somente leitura.'),
      ],
      nextStepLabel: 'Se a mensagem acabou de chegar, atualize a leitura; se continuar sem evidência, consultar o diagnóstico somente leitura da auto-resposta.',
      stateLabel: 'Sem evidência',
      title: 'Diagnóstico operacional',
      tone: 'muted',
    };
  }

  const effectiveRuntime = runtime || resolveAttemptRuntime(currentAttempt);
  const safeReasonLabel = sanitizeText(reasonLabel || resolveObservabilityReasonLabel(resolveAttemptReasonToken(currentAttempt), currentAttempt.blockReasonLabel));
  const safeAiLabel = resolveAttemptAiLabel(currentAttempt);
  const safeSendLabel = sanitizeText(sendLabel || resolveAttemptSendLabel(currentAttempt, effectiveRuntime));

  if (effectiveRuntime.sent) {
    return {
      description: 'A auto-resposta registrou envio controlado; agora a validação é humana e conversacional.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', 'Resposta automática registrada'),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', `${safeReasonLabel}. ${safeAiLabel}.`),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Conferir no WhatsApp se a resposta ajudou e continuar o atendimento se o paciente responder.'),
      ],
      learningItems: [
        buildOperationalLearningItem('controlled-send', 'Houve resposta registrada, mas a qualidade ainda depende da reação do paciente.'),
        buildOperationalLearningItem('human-validation', 'Registrar aprendizado humano antes de ampliar o teste.'),
        buildOperationalLearningItem('next-variation', 'Próxima variação deve continuar curta, segura e dentro da allowlist.'),
      ],
      nextStepLabel: `${safeSendLabel}. Validar a continuidade da conversa antes de considerar esta rodada aprovada.`,
      stateLabel: 'Resposta registrada',
      title: 'Diagnóstico operacional',
      tone: 'sent',
    };
  }

  if (effectiveRuntime.failed) {
    return {
      description: 'A tentativa chegou ao controle, mas falhou antes de virar uma resposta confiável ao paciente.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', 'Falha operacional'),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', safeReasonLabel),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Responder manualmente e revisar canal, modelo de IA ou transporte antes de insistir no teste.'),
      ],
      learningItems: [
        buildOperationalLearningItem('operational-failure', 'Falha operacional não prova qualidade ruim da conversa, prova instabilidade do teste.'),
        buildOperationalLearningItem('pause-test', 'Pausar repetição nessa conversa até entender a causa segura.'),
        buildOperationalLearningItem('manual-response', 'Responder manualmente preserva a experiência do paciente.'),
      ],
      nextStepLabel: 'Não repetir o teste às cegas nesta conversa; primeiro confirmar a causa segura da falha.',
      stateLabel: 'Assumir manualmente',
      title: 'Diagnóstico operacional',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.blocked) {
    return {
      description: 'A proteção impediu resposta automática para evitar uma mensagem ruim, incompleta ou insegura.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', 'Bloqueada com segurança'),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', safeReasonLabel),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Responder manualmente usando esse motivo como contexto.'),
      ],
      learningItems: [
        buildOperationalLearningItem('safe-block-worked', 'A proteção funcionou e evitou resposta automática insegura.'),
        buildOperationalLearningItem('human-needed', 'O roteiro ou fallback ainda precisa de humano para este tipo de entrada.'),
        buildOperationalLearningItem('tune-after-review', 'Usar o motivo seguro para decidir se o playbook precisa evoluir.'),
      ],
      nextStepLabel: 'A IA não deve seguir sozinha nesta entrada; registre aprendizado depois da revisão humana.',
      stateLabel: 'Assumir manualmente',
      title: 'Diagnóstico operacional',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.previewed) {
    return {
      description: 'Há sugestão ou evidência segura, mas ela ainda precisa de revisão antes de orientar o paciente.',
      lines: [
        buildOperationalDiagnosisLine('status', 'Status', 'Rascunho revisável'),
        buildOperationalDiagnosisLine('reason', 'Motivo simples', safeReasonLabel),
        buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Comparar a sugestão com a conversa e usar apenas como apoio manual.'),
      ],
      learningItems: [
        buildOperationalLearningItem('draft-only', 'Rascunho revisável ajuda o operador, mas não comprova envio automático.'),
        buildOperationalLearningItem('compare-context', 'Validar se o próximo passo combina com a necessidade do paciente.'),
        buildOperationalLearningItem('manual-use', 'Se for usado, continua sendo resposta manual revisada.'),
      ],
      nextStepLabel: 'Se o objetivo era resposta automática real, esta evidência ainda não prova envio ao paciente.',
      stateLabel: 'Revisar antes de usar',
      title: 'Diagnóstico operacional',
      tone: 'ready',
    };
  }

  return {
    description: 'Há metadados seguros da tentativa, mas eles não bastam para concluir resposta, bloqueio ou falha.',
    lines: [
      buildOperationalDiagnosisLine('status', 'Status', effectiveRuntime.stateLabel),
      buildOperationalDiagnosisLine('reason', 'Motivo simples', safeReasonLabel),
      buildOperationalDiagnosisLine('operator-action', 'Ação recomendada', 'Revisar manualmente antes de registrar qualquer conclusão do piloto.'),
    ],
    learningItems: [
      buildOperationalLearningItem('inconclusive-evidence', 'Evidência carregada ainda não fecha uma conclusão confiável.'),
      buildOperationalLearningItem('manual-conclusion', 'Conclusão do piloto permanece humana e operacional.'),
      buildOperationalLearningItem('no-score', 'Não transformar este estado em score, SLA ou aprovação automática.'),
    ],
    nextStepLabel: 'Use esta evidência como apoio, não como aprovação automática da conversa.',
    stateLabel: 'Revisar evidência',
    title: 'Diagnóstico operacional',
    tone: 'muted',
  };
};

const buildAutoReplyHumanHandoffModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  hasConversation = false,
  reasonLabel = '',
  runtime = null,
  sendLabel = '',
} = {}) => {
  if (!hasConversation) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('select-conversation', 'Selecionar uma conversa para orientar a passagem humana.', false),
        buildAssistedTestChecklistItem('no-automatic-action', 'Este painel não envia WhatsApp nem altera gates do piloto.'),
      ],
      description: 'Mostra o motivo seguro e a próxima ação humana quando houver evidência da auto-resposta.',
      lines: [
        buildHumanHandoffLine('status', 'Status', 'Sem conversa selecionada'),
        buildHumanHandoffLine('action', 'Ação humana', 'Selecionar uma conversa do atendimento.'),
      ],
      nextStepLabel: 'Selecionar uma conversa para ver a orientação de handoff.',
      stateLabel: 'Aguardando conversa',
      title: 'Passagem para humano',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('stale-evidence', evidenceFreshness.stateLabel, false),
        buildAssistedTestChecklistItem('manual-owner', 'Atendimento humano deve assumir a nova entrada.'),
        buildAssistedTestChecklistItem('no-automatic-action', 'Este painel não envia WhatsApp nem repete tentativa.'),
      ],
      description: 'A última tentativa não explica a mensagem mais recente do paciente.',
      lines: [
        buildHumanHandoffLine('coverage', 'Cobertura', evidenceFreshness.stateLabel),
        buildHumanHandoffLine('action', 'Ação humana', 'Responder manualmente ou aguardar nova tentativa sanitizada antes de concluir o teste.'),
      ],
      nextStepLabel: 'Não usar a tentativa anterior como explicação da nova mensagem; revisar a conversa atual manualmente.',
      stateLabel: 'Assumir nova entrada',
      title: 'Passagem para humano',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('conversation-selected', 'Conversa selecionada para acompanhamento.'),
        buildAssistedTestChecklistItem('attempt-pending', 'Sem tentativa sanitizada para explicar o motivo automático ainda.', false),
        buildAssistedTestChecklistItem('manual-safe', 'A equipe pode responder manualmente pelo fluxo atual se o paciente estiver aguardando.'),
      ],
      description: 'Ainda não há tentativa da auto-resposta para explicar bloqueio, falha ou envio controlado.',
      lines: [
        buildHumanHandoffLine('reason', 'Motivo seguro', 'Sem tentativa registrada'),
        buildHumanHandoffLine('action', 'Ação humana', 'Revisar a conversa e responder manualmente se necessário.'),
      ],
      nextStepLabel: 'Aguardar a primeira evidência sanitizada ou assumir manualmente a conversa.',
      stateLabel: 'Sem evidência',
      title: 'Passagem para humano',
      tone: 'muted',
    };
  }

  const aiLabel = resolveAttemptAiLabel(currentAttempt);
  const safeReasonLabel = sanitizeText(reasonLabel || resolveObservabilityReasonLabel(resolveAttemptReasonToken(currentAttempt), currentAttempt.blockReasonLabel));
  const safeSendLabel = sanitizeText(sendLabel || resolveAttemptSendLabel(currentAttempt, runtime));
  const effectiveRuntime = runtime || resolveAttemptRuntime(currentAttempt);
  const isSkipped = effectiveRuntime.skipped;
  const stateLabel = effectiveRuntime.sent
    ? 'Conferir resposta'
    : effectiveRuntime.failed
      ? 'Assumir atendimento'
      : effectiveRuntime.blocked
        ? 'Assumir atendimento'
        : effectiveRuntime.previewed
          ? 'Revisar rascunho'
          : isSkipped
            ? 'Revisar duplicidade'
            : 'Revisar evidência';
  const tone = effectiveRuntime.sent
    ? 'sent'
    : effectiveRuntime.failed || effectiveRuntime.blocked
      ? 'blocked'
      : effectiveRuntime.previewed
        ? 'ready'
        : 'muted';
  const actionLabel = effectiveRuntime.sent
    ? 'Conferir no WhatsApp se a resposta fez sentido e manter acompanhamento humano.'
    : effectiveRuntime.failed
      ? 'Responder manualmente e revisar canal, provider ou transporte antes de novo teste.'
      : effectiveRuntime.blocked
        ? 'Responder manualmente usando o motivo seguro como contexto.'
        : effectiveRuntime.previewed
          ? 'Revisar o rascunho antes de usar no composer manual.'
          : isSkipped
            ? 'Não repetir a tentativa; conferir se a idempotência já protegeu a conversa.'
            : 'Revisar a conversa e decidir o próximo passo humano.';
  const nextStepLabel = effectiveRuntime.sent
    ? 'Validar a experiência do paciente e assumir a conversa se a próxima resposta sair do roteiro seguro.'
    : effectiveRuntime.failed
      ? 'Pausar novos testes nesta conversa até entender a falha operacional registrada.'
      : effectiveRuntime.blocked
        ? 'Assumir a conversa agora; a IA não entregou resposta segura para esta situação.'
        : effectiveRuntime.previewed
          ? 'Usar o rascunho apenas se estiver coerente com o atendimento humano.'
          : isSkipped
            ? 'Evitar novo disparo manual do teste e conferir o histórico recente da tentativa.'
            : 'Usar a evidência como apoio, sem concluir sucesso automático.';

  return {
    checklist: [
      buildAssistedTestChecklistItem('safe-reason', `Motivo seguro: ${safeReasonLabel}`),
      buildAssistedTestChecklistItem('human-owner', 'Responsável humano deve validar antes de ampliar o piloto.'),
      buildAssistedTestChecklistItem('no-sensitive-data', 'Sem dados sensíveis ou identificadores brutos.'),
    ],
    description: 'Orienta a equipe quando a IA envia, bloqueia, falha ou precisa de revisão, usando apenas metadados seguros.',
    lines: [
      buildHumanHandoffLine('reason', 'Motivo seguro', safeReasonLabel),
      buildHumanHandoffLine('ai', 'IA/fallback', aiLabel),
      buildHumanHandoffLine('send', 'Envio WhatsApp', safeSendLabel),
      buildHumanHandoffLine('action', 'Ação humana', actionLabel),
    ],
    nextStepLabel,
    stateLabel,
    title: 'Passagem para humano',
    tone,
  };
};

const buildConversationQualitySignal = (id, label, ok = true, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
  ok: Boolean(ok),
});

const buildAutoReplyConversationQualityModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  hasConversation = false,
  reasonLabel = '',
  runtime = null,
  sendLabel = '',
  totalAttempts = 0,
} = {}) => {
  if (!hasConversation) {
    return {
      description: 'Resumo de qualidade aparece quando uma conversa do atendimento está selecionada.',
      nextStepLabel: 'Selecionar uma conversa para avaliar continuidade, revisão e segurança.',
      signals: [
        buildConversationQualitySignal('select-conversation', 'Conversa selecionada', false),
        buildConversationQualitySignal('no-automatic-action', 'Sem ação automática pela tela'),
      ],
      stateLabel: 'Aguardando conversa',
      title: 'Qualidade da conversa',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      description: 'Existe mensagem do paciente mais recente que a evidência da auto-resposta; a qualidade da conversa ainda não pode ser concluída.',
      nextStepLabel: 'Aguardar nova tentativa ou responder manualmente antes de considerar esta conversa como evidência válida do piloto.',
      signals: [
        buildConversationQualitySignal('stale-evidence', evidenceFreshness.stateLabel, false, evidenceFreshness.description),
        buildConversationQualitySignal('manual-review', 'Revisão humana necessária'),
        buildConversationQualitySignal('no-raw-content', 'Sem conteúdo bruto exposto'),
      ],
      stateLabel: 'Evidência antiga',
      title: 'Qualidade da conversa',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      description: 'Ainda não há evidência sanitizada para avaliar a qualidade da auto-resposta nesta conversa.',
      nextStepLabel: 'Usar atendimento manual se o paciente estiver aguardando e esperar nova evidência do piloto.',
      signals: [
        buildConversationQualitySignal('conversation-selected', 'Conversa selecionada'),
        buildConversationQualitySignal('attempt-missing', 'Sem tentativa avaliada', false),
        buildConversationQualitySignal('manual-review', 'Revisão humana disponível'),
      ],
      stateLabel: 'Sem evidência',
      title: 'Qualidade da conversa',
      tone: 'muted',
    };
  }

  const effectiveRuntime = runtime || resolveAttemptRuntime(currentAttempt);
  const safeReasonLabel = sanitizeText(reasonLabel || resolveObservabilityReasonLabel(resolveAttemptReasonToken(currentAttempt), currentAttempt.blockReasonLabel));
  const safeSendLabel = sanitizeText(sendLabel || resolveAttemptSendLabel(currentAttempt, effectiveRuntime));
  const attemptCountLabel = totalAttempts > 1
    ? `${totalAttempts} tentativas recentes carregadas`
    : '1 tentativa recente carregada';

  if (effectiveRuntime.sent) {
    return {
      description: 'Há resposta registrada no teste controlado; a qualidade ainda depende de conferir coerência e continuidade da conversa.',
      nextStepLabel: 'Conferir a reação do paciente e manter acompanhamento humano antes de ampliar o piloto.',
      signals: [
        buildConversationQualitySignal('controlled-send', safeSendLabel),
        buildConversationQualitySignal('safe-reason', safeReasonLabel),
        buildConversationQualitySignal('recent-evidence', attemptCountLabel),
      ],
      stateLabel: 'Validar em atendimento',
      title: 'Qualidade da conversa',
      tone: 'sent',
    };
  }

  if (effectiveRuntime.failed) {
    return {
      description: 'A tentativa falhou; esta conversa não prova qualidade conversacional do piloto.',
      nextStepLabel: 'Responder manualmente e revisar estabilidade operacional antes de novo teste nesta conversa.',
      signals: [
        buildConversationQualitySignal('attempt-failed', 'Tentativa falhou', false, safeReasonLabel),
        buildConversationQualitySignal('manual-review', 'Atendimento humano necessário'),
        buildConversationQualitySignal('recent-evidence', attemptCountLabel),
      ],
      stateLabel: 'Não validada',
      title: 'Qualidade da conversa',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.blocked) {
    return {
      description: 'A proteção bloqueou a resposta; isso evita uma conversa ruim, mas exige atendimento humano agora.',
      nextStepLabel: 'Usar o motivo seguro para responder manualmente e só repetir o teste com uma nova entrada relevante.',
      signals: [
        buildConversationQualitySignal('safe-block', safeReasonLabel, false),
        buildConversationQualitySignal('manual-review', 'Atendimento humano necessário'),
        buildConversationQualitySignal('recent-evidence', attemptCountLabel),
      ],
      stateLabel: 'Bloqueada com segurança',
      title: 'Qualidade da conversa',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.previewed) {
    return {
      description: 'A conversa gerou rascunho ou evidência revisável, mas ainda não deve ser tratada como resposta final validada.',
      nextStepLabel: 'Revisar coerência, próxima pergunta e tom antes de usar qualquer sugestão no atendimento manual.',
      signals: [
        buildConversationQualitySignal('draft-ready', 'Rascunho revisável'),
        buildConversationQualitySignal('safe-reason', safeReasonLabel),
        buildConversationQualitySignal('recent-evidence', attemptCountLabel),
      ],
      stateLabel: 'Revisar antes de usar',
      title: 'Qualidade da conversa',
      tone: 'ready',
    };
  }

  return {
    description: 'Há evidência carregada, mas ela não basta para concluir qualidade conversacional.',
    nextStepLabel: 'Revisar manualmente o atendimento antes de considerar esta conversa como validada.',
    signals: [
      buildConversationQualitySignal('evidence-loaded', 'Evidência carregada'),
      buildConversationQualitySignal('safe-reason', safeReasonLabel),
      buildConversationQualitySignal('recent-evidence', attemptCountLabel),
    ],
    stateLabel: 'Revisar evidência',
    title: 'Qualidade da conversa',
    tone: 'muted',
  };
};

const buildPilotReadinessCriterion = (id, label, ok = true, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
  ok: Boolean(ok),
});

const buildAutoReplyPilotReadinessModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  hasConversation = false,
  reasonLabel = '',
  runtime = null,
  totalAttempts = 0,
} = {}) => {
  if (!hasConversation) {
    return {
      criteria: [
        buildPilotReadinessCriterion('select-conversation', 'Conversa selecionada', false),
        buildPilotReadinessCriterion('sanitized-evidence', 'Evidência sanitizada carregada', false),
        buildPilotReadinessCriterion('human-validation', 'Validação humana obrigatória', false),
      ],
      description: 'A prontidão da rodada aparece quando uma conversa do atendimento está selecionada.',
      nextStepLabel: 'Selecionar uma conversa para avaliar se o teste controlado tem evidência suficiente.',
      stateLabel: 'Selecionar conversa',
      title: 'Prontidão da rodada',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      criteria: [
        buildPilotReadinessCriterion('fresh-evidence', evidenceFreshness.stateLabel, false, evidenceFreshness.description),
        buildPilotReadinessCriterion('manual-path', 'Atendimento humano segue obrigatório para a nova entrada'),
        buildPilotReadinessCriterion('validated-conversation', 'Conversa validada pelo teste', false),
      ],
      description: 'A rodada não está pronta: a última evidência não cobre a mensagem inbound mais recente.',
      nextStepLabel: 'Esperar nova tentativa sanitizada ou assumir manualmente antes de registrar aprendizado do piloto.',
      stateLabel: 'Pendente da nova entrada',
      title: 'Prontidão da rodada',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      criteria: [
        buildPilotReadinessCriterion('conversation-selected', 'Conversa selecionada'),
        buildPilotReadinessCriterion('sanitized-attempt', 'Tentativa sanitizada registrada', false),
        buildPilotReadinessCriterion('manual-path', 'Atendimento manual continua disponível'),
      ],
      description: 'A conversa ainda não tem tentativa sanitizada para sustentar conclusão da rodada de teste.',
      nextStepLabel: 'Manter atendimento manual e aguardar nova evidência antes de considerar a conversa validada.',
      stateLabel: 'Pendente de evidência',
      title: 'Prontidão da rodada',
      tone: 'muted',
    };
  }

  const effectiveRuntime = runtime || resolveAttemptRuntime(currentAttempt);
  const safeReasonLabel = sanitizeText(reasonLabel || resolveObservabilityReasonLabel(resolveAttemptReasonToken(currentAttempt), currentAttempt.blockReasonLabel));
  const recentEvidenceLabel = totalAttempts > 1
    ? `${totalAttempts} tentativas recentes carregadas`
    : '1 tentativa recente carregada';

  if (effectiveRuntime.sent) {
    return {
      criteria: [
        buildPilotReadinessCriterion('controlled-send', 'Envio controlado registrado'),
        buildPilotReadinessCriterion('recent-evidence', recentEvidenceLabel),
        buildPilotReadinessCriterion('human-validation', 'Validação humana registrada fora deste painel', false),
      ],
      description: 'A rodada tem evidência de envio controlado, mas ainda depende de validação humana da continuidade da conversa.',
      nextStepLabel: 'Conferir a resposta no WhatsApp, registrar aprendizado manual e só ampliar o piloto depois de revisão humana.',
      stateLabel: 'Validar manualmente',
      title: 'Prontidão da rodada',
      tone: 'sent',
    };
  }

  if (effectiveRuntime.failed) {
    return {
      criteria: [
        buildPilotReadinessCriterion('attempt-failed', 'Tentativa falhou', false, safeReasonLabel),
        buildPilotReadinessCriterion('manual-path', 'Atendimento humano necessário'),
        buildPilotReadinessCriterion('retry-after-review', 'Novo teste somente após revisão técnica', false),
      ],
      description: 'A rodada não está pronta: a tentativa falhou e não comprova qualidade ou estabilidade do piloto.',
      nextStepLabel: 'Assumir manualmente, revisar causa operacional e repetir apenas quando a falha estiver compreendida.',
      stateLabel: 'Não pronta',
      title: 'Prontidão da rodada',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.blocked) {
    return {
      criteria: [
        buildPilotReadinessCriterion('safe-block', 'Proteção bloqueou resposta insegura'),
        buildPilotReadinessCriterion('reason-known', safeReasonLabel),
        buildPilotReadinessCriterion('validated-conversation', 'Conversa validada pelo teste', false),
      ],
      description: 'A segurança funcionou, mas a conversa precisa de humano e não deve contar como rodada validada.',
      nextStepLabel: 'Responder manualmente usando o motivo seguro e só repetir o teste com uma entrada nova e relevante.',
      stateLabel: 'Não pronta',
      title: 'Prontidão da rodada',
      tone: 'blocked',
    };
  }

  if (effectiveRuntime.previewed) {
    return {
      criteria: [
        buildPilotReadinessCriterion('draft-ready', 'Rascunho revisável disponível'),
        buildPilotReadinessCriterion('reason-known', safeReasonLabel),
        buildPilotReadinessCriterion('manual-approval', 'Aprovação humana antes de uso', false),
      ],
      description: 'A rodada tem rascunho revisável, mas ainda não tem resposta validada na conversa real.',
      nextStepLabel: 'Revisar o rascunho, comparar com a necessidade do paciente e usar somente como apoio manual.',
      stateLabel: 'Pronta para revisão',
      title: 'Prontidão da rodada',
      tone: 'ready',
    };
  }

  return {
    criteria: [
      buildPilotReadinessCriterion('evidence-loaded', 'Evidência carregada'),
      buildPilotReadinessCriterion('reason-known', safeReasonLabel),
      buildPilotReadinessCriterion('manual-conclusion', 'Conclusão humana pendente', false),
    ],
    description: 'Há evidência segura, mas ela ainda não fecha a prontidão da rodada.',
    nextStepLabel: 'Revisar manualmente antes de tratar esta conversa como evidência de sucesso.',
    stateLabel: 'Revisar evidência',
    title: 'Prontidão da rodada',
    tone: 'muted',
  };
};

const buildAutoReplyAssistedTestModel = ({
  currentAttempt = null,
  evidenceFreshness = null,
  reasonLabel = '',
  runtime = null,
  sendLabel = '',
  hasConversation = false,
} = {}) => {
  if (!hasConversation) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('select-conversation', 'Selecionar uma conversa antes de avaliar o piloto.', false),
        buildAssistedTestChecklistItem('no-automatic-action', 'A tela não envia WhatsApp nem altera gates do piloto.'),
      ],
      description: 'Selecione uma conversa para orientar o teste interno sem expor dados sensíveis.',
      nextStepLabel: 'Selecionar uma conversa do atendimento.',
      stateLabel: 'Aguardando conversa',
      title: 'Teste assistido',
      tone: 'muted',
    };
  }

  if (evidenceFreshness?.isStale) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('stale-evidence', evidenceFreshness.stateLabel, false),
        buildAssistedTestChecklistItem('wait-new-attempt', 'Aguardar nova tentativa sanitizada ou refresh da conversa.'),
        buildAssistedTestChecklistItem('manual-review', 'Não concluir o teste com base na tentativa anterior.'),
      ],
      description: 'A última mensagem do paciente ainda não tem tentativa de auto-resposta atualizada.',
      nextStepLabel: 'Revisar manualmente a nova entrada; se o piloto responder depois, a evidência aparecerá como atualizada.',
      stateLabel: 'Aguardar nova tentativa',
      title: 'Teste assistido',
      tone: 'blocked',
    };
  }

  if (!currentAttempt) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('conversation-selected', 'Conversa selecionada para acompanhamento.'),
        buildAssistedTestChecklistItem('attempt-pending', 'Aguardando primeira tentativa sanitizada desta conversa.', false),
        buildAssistedTestChecklistItem('no-automatic-action', 'A tela segue somente leitura e não dispara envio.'),
      ],
      description: 'Ainda não há tentativa registrada para esta conversa no teste controlado.',
      nextStepLabel: 'Usar apenas o contato interno permitido e aguardar a tentativa aparecer aqui.',
      stateLabel: 'Aguardando teste interno',
      title: 'Teste assistido',
      tone: 'muted',
    };
  }

  if (runtime?.sent) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('attempt-registered', 'Tentativa sanitizada registrada para esta conversa.'),
        buildAssistedTestChecklistItem('controlled-send', sendLabel || 'Envio controlado registrado.'),
        buildAssistedTestChecklistItem('human-review', 'Manter revisão humana antes de ampliar o piloto.'),
      ],
      description: 'A última tentativa indica resposta automática registrada no teste controlado.',
      nextStepLabel: 'Conferir o resultado no WhatsApp e testar uma variação curta somente dentro do contato interno permitido.',
      stateLabel: 'Resposta registrada',
      title: 'Teste assistido',
      tone: 'sent',
    };
  }

  if (runtime?.failed) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('attempt-registered', 'Tentativa sanitizada registrada para esta conversa.'),
        buildAssistedTestChecklistItem('review-gates', 'Revisar canal, provider, transporte e gates server-side antes de novo teste.', false),
        buildAssistedTestChecklistItem('human-review', 'Usar atendimento humano enquanto o transporte não estiver estável.'),
      ],
      description: 'A última tentativa falhou e não deve ser tratada como conversa validada.',
      nextStepLabel: 'Pausar o teste desta conversa e revisar os controles técnicos antes de insistir.',
      stateLabel: 'Pausar teste',
      title: 'Teste assistido',
      tone: 'blocked',
    };
  }

  if (runtime?.blocked) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('attempt-registered', 'Tentativa sanitizada registrada para esta conversa.'),
        buildAssistedTestChecklistItem('safe-block', reasonLabel || 'Bloqueio seguro registrado.'),
        buildAssistedTestChecklistItem('human-review', 'Responder manualmente ou manter handoff humano.'),
      ],
      description: 'A última tentativa foi bloqueada por segurança e exige revisão humana.',
      nextStepLabel: 'Usar o motivo seguro como guia de handoff, sem repetir o teste até entender o bloqueio.',
      stateLabel: 'Revisão humana',
      title: 'Teste assistido',
      tone: 'blocked',
    };
  }

  if (runtime?.previewed) {
    return {
      checklist: [
        buildAssistedTestChecklistItem('attempt-registered', 'Tentativa sanitizada registrada para esta conversa.'),
        buildAssistedTestChecklistItem('draft-review', 'Comparar a sugestão com a necessidade real antes de usar.'),
        buildAssistedTestChecklistItem('no-automatic-action', 'Uso como rascunho continua manual e revisado.'),
      ],
      description: 'A última tentativa preparou uma resposta segura, mas ainda depende de revisão humana.',
      nextStepLabel: 'Usar como rascunho apenas se estiver coerente com a conversa e com o atendimento humano.',
      stateLabel: 'Pronta para revisão',
      title: 'Teste assistido',
      tone: 'ready',
    };
  }

  return {
    checklist: [
      buildAssistedTestChecklistItem('attempt-registered', 'Tentativa sanitizada registrada para esta conversa.'),
      buildAssistedTestChecklistItem('human-review', 'Revisar manualmente antes de orientar novo teste.'),
      buildAssistedTestChecklistItem('no-automatic-action', 'A tela não envia WhatsApp nem altera gates do piloto.'),
    ],
    description: 'Há evidência segura, mas o estado não libera conclusão automática do teste.',
    nextStepLabel: 'Revisar a conversa e decidir o próximo teste manualmente.',
    stateLabel: 'Evidência registrada',
    title: 'Teste assistido',
    tone: 'muted',
  };
};

const resolveSettingAutoReply = (settings) => {
  const autoReply = settings?.autoReply || {};
  const mode = autoReply.mode || settings?.auto_reply_mode || settings?.mode || 'disabled';
  const enabled = typeof autoReply.enabled === 'boolean'
    ? autoReply.enabled
    : Boolean(settings?.auto_reply_enabled);
  const killSwitchEnabled = typeof autoReply.killSwitchEnabled === 'boolean'
    ? autoReply.killSwitchEnabled
    : Boolean(settings?.auto_reply_kill_switch_enabled);

  return {
    enabled,
    killSwitchEnabled,
    mode,
    testLabel: autoReply.testLabel || settings?.auto_reply_test_label || '',
  };
};

const buildReason = (id, label, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
});

const buildAttemptReason = (attempt) => {
  if (!attempt?.decision) return null;

  if (attempt.decision === 'previewed') {
    return buildReason(
      'attempt-previewed',
      'Preview já registrado',
      'Há decisão dry-run recente; a UI apenas reaproveita a evidência sem enviar mensagem.',
    );
  }

  if (attempt.decision === 'blocked' && attempt.blockReason) {
    return buildReason(
      attempt.blockReason,
      attempt.blockReasonLabel || getOmnichannelAutoReplyBlockReasonLabel(attempt.blockReason),
      'Última tentativa dry-run registrou bloqueio seguro.',
    );
  }

  if (attempt.decision === 'skipped') {
    return buildReason(
      'duplicate_idempotency',
      getOmnichannelAutoReplyBlockReasonLabel('duplicate_idempotency'),
      'A idempotência do bot já protegeu esta tentativa.',
    );
  }

  return null;
};

export const resolveAutoReplyModeLabel = ({ settings = null, sourceLabel = 'Sem acesso' } = {}) => {
  const autoReply = resolveSettingAutoReply(settings);

  if (!settings) {
    return {
      allowsPreview: false,
      label: 'Sem configuração de auto-reply',
      mode: 'disabled',
      sourceLabel,
      stateLabel: 'Bloqueado',
    };
  }

  if (!autoReply.enabled) {
    return {
      allowsPreview: autoReply.mode === 'preview',
      label: 'Auto-reply desligado',
      mode: autoReply.mode || 'disabled',
      sourceLabel,
      stateLabel: 'Preview conservador',
    };
  }

  if (autoReply.killSwitchEnabled) {
    return {
      allowsPreview: true,
      label: 'Kill switch ligado',
      mode: autoReply.mode,
      sourceLabel,
      stateLabel: 'Envio bloqueado',
    };
  }

  if (PREVIEW_ALLOWED_MODES.has(autoReply.mode)) {
    return {
      allowsPreview: true,
      label: autoReply.mode === 'controlled_test' ? 'Teste controlado' : 'Preview assistido',
      mode: autoReply.mode,
      sourceLabel,
      stateLabel: 'Preview disponível',
    };
  }

  return {
    allowsPreview: false,
    label: 'Modo não autorizado',
    mode: autoReply.mode || 'disabled',
    sourceLabel,
    stateLabel: 'Bloqueado',
  };
};

export const buildAutoReplyPreviewMessage = ({ intentKey = 'outro_assunto' } = {}) => {
  const normalizedIntent = normalizeOmnichannelTriageIntentKey(intentKey);
  return sanitizeText(FIXED_AUTO_REPLY_PREVIEWS[normalizedIntent] || FIXED_AUTO_REPLY_PREVIEWS.outro_assunto);
};

export const resolveAutoReplyBlockReasons = ({
  channelStatus = null,
  conversation = null,
  latestAttempt = null,
  previewMessage = '',
  selectedQueueItem = null,
  settings = null,
  triageResult = null,
} = {}) => {
  const reasons = [];
  const mode = resolveAutoReplyModeLabel({ settings, sourceLabel: settings?.source || 'Sem acesso' });
  const autoReply = resolveSettingAutoReply(settings);

  if (!conversation?.id) {
    reasons.push(buildReason('no_conversation', 'Selecione uma conversa', 'Preview depende de conversa carregada.'));
  }

  if (!triageResult?.intentKey) {
    reasons.push(buildReason('missing_persisted_triage', 'Triagem persistida ausente', 'Salve ou aguarde a triagem v0 antes do preview.'));
  }

  if (!previewMessage) {
    reasons.push(buildReason('safe_reply_unavailable', getOmnichannelAutoReplyBlockReasonLabel('safe_reply_unavailable'), 'Não há resposta fixa segura para esta intenção.'));
  }

  if (!mode.allowsPreview) {
    reasons.push(buildReason('auto_reply_disabled', getOmnichannelAutoReplyBlockReasonLabel('auto_reply_disabled'), mode.label));
  }

  if (autoReply.killSwitchEnabled) {
    reasons.push(buildReason('kill_switch_enabled', getOmnichannelAutoReplyBlockReasonLabel('kill_switch_enabled'), 'Kill switch impede qualquer envio automático real.'));
  }

  if (channelStatus && !channelStatus.isConfigured) {
    reasons.push(buildReason('channel_not_ready', getOmnichannelAutoReplyBlockReasonLabel('channel_not_ready'), 'Canal ainda não está pronto para envio real.'));
  }

  if (triageResult?.handoffRequired) {
    reasons.push(buildReason('human_handoff_required', getOmnichannelAutoReplyBlockReasonLabel('human_handoff_required'), 'Handoff humano permanece prioritário.'));
  }

  if (selectedQueueItem?.assignedTo && !selectedQueueItem?.isAssignedToMe) {
    reasons.push(buildReason('human_assigned', 'Conversa já assumida', 'Atendimento humano assumido bloqueia auto-reply real.'));
  }

  if (['resolved', 'archived'].includes(selectedQueueItem?.status || conversation?.status)) {
    reasons.push(buildReason('conversation_closed', 'Conversa resolvida ou arquivada', 'Preview fica disponível apenas como referência.'));
  }

  if (selectedQueueItem?.priority === 'urgent') {
    reasons.push(buildReason('sensitive_context', 'Prioridade alta exige humano', 'Conversas urgentes não devem receber resposta automática nesta etapa.'));
  }

  const attemptReason = buildAttemptReason(latestAttempt);
  if (attemptReason && attemptReason.id !== 'attempt-previewed') {
    reasons.push(attemptReason);
  }

  const uniqueReasons = new Map();
  reasons.forEach((reason) => {
    if (!uniqueReasons.has(reason.id)) {
      uniqueReasons.set(reason.id, reason);
    }
  });

  return [...uniqueReasons.values()];
};

export const buildAutoReplySafetyChecklist = ({
  blockReasons = [],
  channelStatus = null,
  modeLabel = null,
  previewMessage = '',
  triageResult = null,
} = {}) => {
  const blockedIds = new Set(blockReasons.map((reason) => reason.id));

  return [
    {
      id: 'persisted-triage',
      label: 'Triagem persistida carregada',
      ok: Boolean(triageResult?.intentKey),
    },
    {
      id: 'fixed-safe-reply',
      label: 'Resposta fixa segura disponível',
      ok: Boolean(previewMessage),
    },
    {
      id: 'mode-preview',
      label: modeLabel?.allowsPreview ? 'Modo permite preview' : 'Modo bloqueia envio real',
      ok: Boolean(modeLabel?.allowsPreview),
    },
    {
      id: 'channel-ready',
      label: channelStatus?.isConfigured ? 'Canal configurado' : 'Canal não pronto para envio real',
      ok: Boolean(channelStatus?.isConfigured),
    },
    {
      id: 'human-handoff',
      label: blockedIds.has('human_handoff_required') ? 'Handoff humano pendente' : 'Sem bloqueio de handoff no preview',
      ok: !blockedIds.has('human_handoff_required'),
    },
    {
      id: 'dry-run-only',
      label: 'Preview sem envio automático',
      ok: true,
    },
  ];
};

export const buildAutoReplyEligibilityModel = ({
  autoReplyAttempts = [],
  channelStatus = null,
  conversation = null,
  selectedQueueItem = null,
  sourceLabel = 'Sem acesso',
  triageResult = null,
  triageSettings = null,
} = {}) => {
  const intentKey = normalizeOmnichannelTriageIntentKey(triageResult?.intentKey || 'outro_assunto');
  const queueKey = normalizeOmnichannelTriageQueueKey(triageResult?.suggestedQueue || 'unclassified');
  const latestAttempt = toArray(autoReplyAttempts)
    .find((attempt) => attempt?.conversationId && attempt.conversationId === conversation?.id) || null;
  const previewMessage = buildAutoReplyPreviewMessage({ intentKey });
  const mode = resolveAutoReplyModeLabel({ settings: triageSettings, sourceLabel });
  const blockReasons = resolveAutoReplyBlockReasons({
    channelStatus,
    conversation,
    latestAttempt,
    previewMessage,
    selectedQueueItem,
    settings: triageSettings,
    triageResult,
  });
  const eligible = Boolean(conversation?.id && triageResult?.intentKey && previewMessage && blockReasons.length === 0);

  return {
    blockReasons,
    canUseInComposer: Boolean(previewMessage),
    checklist: buildAutoReplySafetyChecklist({
      blockReasons,
      channelStatus,
      modeLabel: mode,
      previewMessage,
      triageResult,
    }),
    eligible,
    handoffLabel: triageResult?.handoffRequired ? 'Handoff humano pendente' : 'Handoff não exigido no resultado',
    intentKey,
    intentLabel: getOmnichannelTriageIntentLabel(intentKey),
    latestAttempt,
    mode,
    previewMessage,
    primaryReason: blockReasons[0] || buildReason('eligible-preview', 'Elegível para preview', 'Mesmo elegível, R5.3 não envia WhatsApp.'),
    queueKey,
    queueLabel: getOmnichannelTriageQueueLabel(queueKey),
    sourceLabel,
    stateLabel: eligible ? 'Elegível para preview' : 'Bloqueado para auto-reply',
    title: 'Preview de resposta automática',
    wouldSend: false,
    wouldSendLabel: 'Não enviaria nesta etapa',
  };
};

export const buildAutoReplyConversationObservabilityModel = ({
  autoReplyAttempts = [],
  conversation = null,
  messages = [],
  sourceLabel = 'Sem acesso',
} = {}) => {
  if (!conversation?.id) {
    const evidenceFreshness = buildAutoReplyEvidenceFreshnessModel({ hasConversation: false });

    return {
      available: false,
      cards: [
        buildObservabilityCard('selection', 'Conversa', 'Sem conversa selecionada', 'Selecione uma conversa para ver a última decisão da IA.'),
      ],
      description: 'Mostra somente o motivo operacional da resposta automática para esta conversa.',
      attemptHistory: [],
      assistedTest: buildAutoReplyAssistedTestModel({ hasConversation: false }),
      conversationQuality: buildAutoReplyConversationQualityModel({ hasConversation: false }),
      evidenceFreshness,
      humanHandoff: buildAutoReplyHumanHandoffModel({ hasConversation: false }),
      learningCycle: buildAutoReplyLearningCycleModel({ hasConversation: false }),
      operationalDiagnosis: buildAutoReplyOperationalDiagnosisModel({ hasConversation: false }),
      pilotReadiness: buildAutoReplyPilotReadinessModel({ hasConversation: false }),
      realConversationDiagnosis: buildAutoReplyRealConversationDiagnosisModel({ hasConversation: false }),
      latestAttempt: null,
      reasonLabel: 'Selecione uma conversa',
      sourceLabel,
      stateLabel: 'Aguardando conversa',
      tone: 'muted',
    };
  }

  const conversationAttempts = toArray(autoReplyAttempts)
    .filter((attempt) => attempt?.conversationId && attempt.conversationId === conversation.id)
    .sort((first, second) => getAttemptTimeValue(second) - getAttemptTimeValue(first));
  const attemptHistory = conversationAttempts.slice(0, 4).map(buildAttemptHistoryItem);
  const currentAttempt = conversationAttempts[0] || null;
  const evidenceFreshness = buildAutoReplyEvidenceFreshnessModel({
    currentAttempt,
    hasConversation: true,
    messages,
  });

  if (!currentAttempt) {
    return {
      available: false,
      attemptHistory: [],
      assistedTest: buildAutoReplyAssistedTestModel({ evidenceFreshness, hasConversation: true }),
      conversationQuality: buildAutoReplyConversationQualityModel({ evidenceFreshness, hasConversation: true }),
      evidenceFreshness,
      humanHandoff: buildAutoReplyHumanHandoffModel({ evidenceFreshness, hasConversation: true }),
      learningCycle: buildAutoReplyLearningCycleModel({ evidenceFreshness, hasConversation: true }),
      operationalDiagnosis: buildAutoReplyOperationalDiagnosisModel({ evidenceFreshness, hasConversation: true }),
      pilotReadiness: buildAutoReplyPilotReadinessModel({ evidenceFreshness, hasConversation: true }),
      realConversationDiagnosis: buildAutoReplyRealConversationDiagnosisModel({ evidenceFreshness, hasConversation: true }),
      cards: [
        buildObservabilityCard('attempt', 'Última tentativa', 'Não registrada', 'Ainda não há tentativa de auto-resposta carregada para esta conversa.'),
        buildObservabilityCard('send', 'Envio WhatsApp', 'Sem envio registrado', 'Nenhum transporte automático aparece nas evidências sanitizadas.'),
        buildObservabilityCard('freshness', 'Cobertura da última entrada', evidenceFreshness.stateLabel, evidenceFreshness.description),
      ],
      description: 'Quando a resposta automática avaliar esta conversa, o resumo aparecerá aqui sem conteúdo sensível.',
      latestAttempt: null,
      reasonLabel: 'Sem tentativa registrada',
      sourceLabel,
      stateLabel: 'Sem tentativa',
      tone: 'muted',
    };
  }

  const aiDiagnostics = currentAttempt.aiControlledReply || {};
  const botEventType = sanitizeToken(currentAttempt.botEventType);
  const responseSource = aiDiagnostics.responseSource || aiDiagnostics.finalDraftSource || '';
  const primaryReasonToken = resolveAttemptReasonToken(currentAttempt);
  const aiRequired = aiDiagnostics.requiresAiReply === true;
  const providerSucceeded = aiDiagnostics.providerCallSucceeded === true;
  const runtime = resolveAttemptRuntime(currentAttempt);
  const reasonLabel = resolveObservabilityReasonLabel(primaryReasonToken, currentAttempt.blockReasonLabel);
  const aiStatusLabel = aiRequired
    ? providerSucceeded
      ? 'IA real consultada'
      : 'IA real tentou e caiu em segurança'
    : responseSource
      ? resolveObservabilitySourceLabel(responseSource)
      : 'IA real não exigida';
  const sendLabel = resolveAttemptSendLabel(currentAttempt, runtime);

  return {
    available: !evidenceFreshness.isStale,
    attemptHistory,
    assistedTest: buildAutoReplyAssistedTestModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
      sendLabel,
    }),
    conversationQuality: buildAutoReplyConversationQualityModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
      sendLabel,
      totalAttempts: conversationAttempts.length,
    }),
    evidenceFreshness,
    humanHandoff: buildAutoReplyHumanHandoffModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
      sendLabel,
    }),
    learningCycle: buildAutoReplyLearningCycleModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
      totalAttempts: conversationAttempts.length,
    }),
    operationalDiagnosis: buildAutoReplyOperationalDiagnosisModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
      sendLabel,
    }),
    pilotReadiness: buildAutoReplyPilotReadinessModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
      totalAttempts: conversationAttempts.length,
    }),
    realConversationDiagnosis: buildAutoReplyRealConversationDiagnosisModel({
      currentAttempt,
      evidenceFreshness,
      hasConversation: true,
      reasonLabel,
      runtime,
    }),
    cards: [
      buildObservabilityCard('decision', 'Decisão', currentAttempt.decisionLabel || runtime.stateLabel, reasonLabel),
      buildObservabilityCard('ai', 'IA/fallback', aiStatusLabel, resolveObservabilitySourceLabel(responseSource)),
      buildObservabilityCard('send', 'Envio WhatsApp', sendLabel, resolveSendPlanLabel(currentAttempt.sendPlan)),
      buildObservabilityCard('freshness', 'Cobertura da última entrada', evidenceFreshness.stateLabel, evidenceFreshness.description),
      buildObservabilityCard('updated', 'Registrado em', currentAttempt.createdAt ? new Date(currentAttempt.createdAt).toLocaleString('pt-BR') : 'Horário não informado', sourceLabel),
    ],
    description: 'Resumo por conversa da resposta automática; não mostra conteúdo sensível ou dados técnicos brutos.',
    latestAttempt: {
      botEventType: botEventType || 'not_reported',
      createdAt: currentAttempt.createdAt || null,
      decision: currentAttempt.decision || 'unknown',
      preparedReplyAvailable: currentAttempt.preparedReplyAvailable === true,
      sendAllowed: currentAttempt.sendAllowed === true,
      transportStatus: currentAttempt.transportStatus ?? null,
      wouldSend: currentAttempt.wouldSend === true,
      evidenceStatus: evidenceFreshness.isStale ? 'stale' : 'current',
    },
    reasonLabel,
    sourceLabel,
    stateLabel: evidenceFreshness.isStale ? evidenceFreshness.stateLabel : runtime.stateLabel,
    tone: evidenceFreshness.isStale ? evidenceFreshness.tone : runtime.tone,
  };
};

const summarizeAttempts = (attempts) => toArray(attempts).reduce((accumulator, attempt) => {
  const decision = attempt?.decision || 'unknown';
  accumulator.total += 1;
  accumulator[decision] = (accumulator[decision] || 0) + 1;

  const reason = attempt?.blockReasonLabel || (attempt?.blockReason
    ? getOmnichannelAutoReplyBlockReasonLabel(attempt.blockReason)
    : '');
  if (reason) {
    accumulator.reasons.set(reason, (accumulator.reasons.get(reason) || 0) + 1);
  }

  return accumulator;
}, {
  blocked: 0,
  previewed: 0,
  reasons: new Map(),
  skipped: 0,
  total: 0,
  unknown: 0,
});

const buildPilotMetricCard = (id, label, value, helper = '') => ({
  helper: sanitizeText(helper),
  id,
  label: sanitizeText(label),
  value: sanitizeText(value),
});

export const buildAutoReplyPilotMetricsModel = ({
  attempts = [],
  conversationEvidenceFreshness = null,
  sourceLabel = 'Sem acesso',
} = {}) => {
  const summary = toArray(attempts).reduce((accumulator, attempt) => {
    const runtime = resolveAttemptRuntime(attempt);
    const aiDiagnostics = attempt?.aiControlledReply || {};
    const responseSource = sanitizeToken(aiDiagnostics.responseSource || aiDiagnostics.finalDraftSource || '');
    const fallbackReason = sanitizeToken(aiDiagnostics.providerSuggestionFallbackReason);
    const reasonLabel = resolveObservabilityReasonLabel(resolveAttemptReasonToken(attempt), attempt?.blockReasonLabel);

    accumulator.total += 1;
    if (runtime.sent) accumulator.sent += 1;
    if (runtime.failed) accumulator.failed += 1;
    if (runtime.blocked) accumulator.blocked += 1;
    if (runtime.previewed) accumulator.previewed += 1;
    if (runtime.skipped) accumulator.skipped += 1;

    if (
      aiDiagnostics.requiresAiReply === true
      || aiDiagnostics.providerCallAttempted === true
      || aiDiagnostics.providerCallSucceeded === true
      || responseSource === 'provider'
      || responseSource === 'provider_real'
    ) {
      accumulator.providerTouched += 1;
    }

    if (
      responseSource.includes('fallback')
      || fallbackReason.includes('fallback')
      || aiDiagnostics.serverFallbackUsed === true
      || aiDiagnostics.localFallbackUsed === true
    ) {
      accumulator.fallbackUsed += 1;
    }

    if (reasonLabel) {
      accumulator.reasons.set(reasonLabel, (accumulator.reasons.get(reasonLabel) || 0) + 1);
    }

    return accumulator;
  }, {
    blocked: 0,
    failed: 0,
    fallbackUsed: 0,
    previewed: 0,
    providerTouched: 0,
    reasons: new Map(),
    sent: 0,
    skipped: 0,
    total: 0,
  });

  const reviewCount = summary.blocked + summary.failed;
  const hasStaleSelectedConversation = conversationEvidenceFreshness?.isStale === true;
  const coverageCard = conversationEvidenceFreshness
    ? buildPilotMetricCard(
      'selected-conversation-coverage',
      'Cobertura selecionada',
      conversationEvidenceFreshness.stateLabel,
      conversationEvidenceFreshness.description,
    )
    : null;
  const stateLabel = hasStaleSelectedConversation
    ? 'Conversa com evidência antiga'
    : summary.total === 0
    ? 'Aguardando evidência'
    : summary.failed > 0
      ? 'Falhas para revisar'
      : summary.sent > 0 && reviewCount > 0
        ? 'Teste com atenção'
        : summary.sent > 0
          ? 'Teste com envio registrado'
          : summary.blocked > 0
            ? 'Bloqueios para revisar'
            : summary.previewed > 0
              ? 'Preview com evidência'
              : 'Evidência carregada';
  const tone = hasStaleSelectedConversation
    ? 'blocked'
    : summary.total === 0
    ? 'muted'
    : summary.failed > 0 || summary.blocked > summary.sent
      ? 'blocked'
      : summary.sent > 0
        ? 'sent'
        : summary.previewed > 0
          ? 'ready'
          : 'muted';

  return {
    cards: [
      ...(coverageCard ? [coverageCard] : []),
      buildPilotMetricCard(
        'attempts-loaded',
        'Tentativas carregadas',
        String(summary.total),
        'Conta apenas evidências sanitizadas carregadas nesta sessão.',
      ),
      buildPilotMetricCard(
        'controlled-sends',
        'Envios registrados',
        String(summary.sent),
        'Eventos sanitizados de transporte controlado dentro do teste.',
      ),
      buildPilotMetricCard(
        'human-review',
        'Revisão humana',
        String(reviewCount),
        'Bloqueios ou falhas que não validam conversa automática.',
      ),
      buildPilotMetricCard(
        'ai-paths',
        'IA/fallback',
        `${summary.providerTouched} IA · ${summary.fallbackUsed} fallback`,
        'Caminho observado apenas por metadados seguros.',
      ),
    ],
    description: 'Resumo read-only do piloto com base nas tentativas sanitizadas já carregadas; quando há conversa selecionada, também mostra se a tentativa cobre a última entrada. Não mede desempenho individual, prazo operacional ou qualidade clínica.',
    reasonSummary: [...summary.reasons.entries()]
      .slice(0, 4)
      .map(([label, count]) => ({ count, label: sanitizeText(label) })),
    sourceLabel,
    stateLabel,
    summary: {
      blocked: summary.blocked,
      failed: summary.failed,
      fallbackUsed: summary.fallbackUsed,
      previewed: summary.previewed,
      providerTouched: summary.providerTouched,
      reviewCount,
      sent: summary.sent,
      selectedConversationEvidenceStatus: hasStaleSelectedConversation
        ? 'stale'
        : conversationEvidenceFreshness
          ? 'current'
          : 'not_selected',
      skipped: summary.skipped,
      total: summary.total,
    },
    title: 'Métricas do piloto',
    tone,
  };
};

export const buildAutoReplyManagementSignals = ({
  attempts = [],
  channelStatus = null,
  settings = null,
  sourceLabel = 'Sem acesso',
  triageSignals = null,
} = {}) => {
  const attemptSummary = summarizeAttempts(attempts);
  const mode = resolveAutoReplyModeLabel({ settings, sourceLabel });
  const handoffSignal = toArray(triageSignals?.signals)
    .find((signal) => signal.id === 'handoff-pending' || /handoff/i.test(signal.label || ''));
  const unclassifiedSignal = toArray(triageSignals?.signals)
    .find((signal) => signal.id === 'unclassified' || /sem classifica|outras filas/i.test(signal.label || ''));

  return {
    cards: [
      {
        count: attemptSummary.previewed,
        helper: 'Decisões dry-run que preparariam resposta fixa sem enviar.',
        id: 'preview-eligible',
        label: 'Preview elegível',
      },
      {
        count: attemptSummary.blocked,
        helper: 'Bloqueios seguros registrados por modo, kill switch, allowlist ou handoff.',
        id: 'blocked',
        label: 'Bloqueios',
      },
      {
        count: Number(handoffSignal?.count || 0),
        helper: 'Conversas em que o atendimento humano segue obrigatório.',
        id: 'human-handoff',
        label: 'Handoff humano',
      },
      {
        count: Number(unclassifiedSignal?.count || 0),
        helper: 'Triagens sem fila segura para resposta fixa.',
        id: 'unclassified',
        label: 'Sem classificação',
      },
    ],
    channelLabel: channelStatus?.statusLabel || 'Canal não validado para envio real',
    description: 'Sinais somente consulta de elegibilidade da prévia. Não há comparativo de desempenho ou métrica artificial.',
    mode,
    reasonSummary: [...attemptSummary.reasons.entries()]
      .slice(0, 4)
      .map(([label, count]) => ({ count, label: sanitizeText(label) })),
    sourceLabel,
    stateLabel: attemptSummary.total
      ? 'Preview com evidência dry-run'
      : 'Preview aguardando evidência',
    title: 'Elegibilidade do preview de auto-reply',
  };
};
