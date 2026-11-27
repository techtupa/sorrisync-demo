const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOCUMENT_PATTERN = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{8,}\d)/g;

export const OMNICHANNEL_TRIAGE_SETTING_MODES = Object.freeze(['assistive', 'preview', 'disabled']);
export const OMNICHANNEL_TRIAGE_FLOW_STATUSES = Object.freeze(['draft', 'active', 'archived']);
export const OMNICHANNEL_TRIAGE_QUESTION_TYPES = Object.freeze(['single_choice', 'text', 'handoff']);
export const OMNICHANNEL_TRIAGE_RESULT_SOURCES = Object.freeze(['assistive', 'bot_preview', 'human']);
export const OMNICHANNEL_AUTO_REPLY_MODES = Object.freeze(['disabled', 'preview', 'assistive', 'controlled_test']);
export const OMNICHANNEL_AUTO_REPLY_DECISIONS = Object.freeze(['previewed', 'skipped', 'blocked']);
export const OMNICHANNEL_AUTO_REPLY_BLOCK_REASONS = Object.freeze([
  'auto_reply_disabled',
  'mode_not_controlled_test',
  'kill_switch_enabled',
  'outside_allowlist',
  'human_handoff_required',
  'channel_not_ready',
  'duplicate_idempotency',
  'safe_reply_unavailable',
  'bot_send_default_off',
  'real_send_mode_disabled',
  'real_send_not_allowed',
  'destination_unavailable',
  'phone_number_id_unavailable',
  'transport_unavailable',
  'transport_failed',
]);

const AUTO_REPLY_AI_DIAGNOSTIC_KEYS = Object.freeze([
  'blockReason',
  'contextPackTruncated',
  'draftQualityStatus',
  'finalDraftSource',
  'providerAbortReason',
  'providerCallSucceeded',
  'providerElapsedMsBucket',
  'providerFailureKind',
  'providerFailureRetryable',
  'providerFailureStage',
  'providerFailureStatus',
  'providerFetchAborted',
  'providerFetchSettled',
  'providerHttpStatus',
  'providerMode',
  'providerOutputAcceptedReason',
  'providerParseStatus',
  'providerRequestStarted',
  'providerRubricBlockedReason',
  'providerRubricDecision',
  'providerSchemaMismatchFields',
  'providerSuggestionFallbackReason',
  'providerTimeoutMsBucket',
  'replyLeadershipStrategy',
  'requiresAiReply',
  'responseFormatMode',
  'responseSource',
  'safeNoReplyDiagnosticAvailable',
  'safeNoReplyDiagnosticReason',
  'source',
]);

export const OMNICHANNEL_TRIAGE_QUEUE_CATALOG = Object.freeze([
  { id: 'reception', label: 'Recepção' },
  { id: 'commercial', label: 'CRC/Comercial' },
  { id: 'post_care', label: 'Pós-atendimento' },
  { id: 'human_now', label: 'Humano imediato' },
  { id: 'unclassified', label: 'Sem classificação' },
]);

export const OMNICHANNEL_TRIAGE_INTENT_CATALOG = Object.freeze([
  { id: 'agendar_avaliacao', label: 'Agendar avaliação', suggestedQueue: 'reception' },
  { id: 'remarcar_consulta', label: 'Remarcar consulta', suggestedQueue: 'reception' },
  { id: 'confirmar_horario', label: 'Confirmar horário', suggestedQueue: 'reception' },
  { id: 'tratamento_orcamento', label: 'Tratamento/orçamento', suggestedQueue: 'commercial' },
  { id: 'retorno_pos_atendimento', label: 'Retorno/pós-atendimento', suggestedQueue: 'post_care' },
  { id: 'falar_com_atendente', label: 'Falar com atendente', suggestedQueue: 'human_now' },
  { id: 'outro_assunto', label: 'Outro assunto', suggestedQueue: 'unclassified' },
]);

const LEGACY_INTENT_TO_BACKEND = Object.freeze({
  confirm_appointment: 'confirmar_horario',
  follow_up: 'retorno_pos_atendimento',
  human_attendant: 'falar_com_atendente',
  other: 'outro_assunto',
  reschedule_appointment: 'remarcar_consulta',
  schedule_evaluation: 'agendar_avaliacao',
  treatment_budget: 'tratamento_orcamento',
});

const QUEUE_IDS = new Set(OMNICHANNEL_TRIAGE_QUEUE_CATALOG.map((queue) => queue.id));
const INTENT_IDS = new Set(OMNICHANNEL_TRIAGE_INTENT_CATALOG.map((intent) => intent.id));
const MODE_IDS = new Set(OMNICHANNEL_TRIAGE_SETTING_MODES);
const FLOW_STATUS_IDS = new Set(OMNICHANNEL_TRIAGE_FLOW_STATUSES);
const QUESTION_TYPE_IDS = new Set(OMNICHANNEL_TRIAGE_QUESTION_TYPES);
const SOURCE_IDS = new Set(OMNICHANNEL_TRIAGE_RESULT_SOURCES);
const AUTO_REPLY_MODE_IDS = new Set(OMNICHANNEL_AUTO_REPLY_MODES);
const AUTO_REPLY_DECISION_IDS = new Set(OMNICHANNEL_AUTO_REPLY_DECISIONS);
const AUTO_REPLY_BLOCK_REASON_IDS = new Set(OMNICHANNEL_AUTO_REPLY_BLOCK_REASONS);

const sanitizeText = (value, fallback = '', limit = 160) => {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = raw
    .replace(UUID_IN_TEXT_PATTERN, '')
    .replace(EMAIL_PATTERN, '')
    .replace(DOCUMENT_PATTERN, '')
    .replace(PHONE_PATTERN, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > limit ? `${text.slice(0, limit - 3).trim()}...` : text;
};

const sanitizeContactMask = (value, fallback = 'Contato mascarado') => {
  const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const digits = raw.replace(/\D+/g, '');
  if (digits.length >= 8) {
    return `***${digits.slice(-4)}`;
  }

  return sanitizeText(raw, fallback, 32);
};

const sanitizeAnswers = (answers) => {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};

  return Object.fromEntries(Object.entries(answers)
    .slice(0, 8)
    .map(([key, value]) => [
      sanitizeText(key, 'resposta', 48),
      sanitizeText(value, '', 160),
    ])
    .filter(([key, value]) => key && value));
};

const normalizeSafeBoolean = (value) => (typeof value === 'boolean' ? value : undefined);

const normalizeSafeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
};

const normalizeSafeTokenList = (value) => (
  Array.isArray(value)
    ? value
      .map((item) => sanitizeText(item, '', 80))
      .filter(Boolean)
      .slice(0, 8)
    : []
);

const normalizeAutoReplyAiDiagnostics = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const source = {
    blockReason: value.block_reason ?? value.blockReason,
    contextPackTruncated: value.context_pack_truncated ?? value.contextPackTruncated,
    draftQualityStatus: value.draft_quality_status ?? value.draftQualityStatus,
    finalDraftSource: value.final_draft_source ?? value.finalDraftSource,
    providerAbortReason: value.provider_abort_reason ?? value.providerAbortReason,
    providerCallSucceeded: value.provider_call_succeeded ?? value.providerCallSucceeded,
    providerElapsedMsBucket: value.provider_elapsed_ms_bucket ?? value.providerElapsedMsBucket,
    providerFailureKind: value.provider_failure_kind ?? value.providerFailureKind,
    providerFailureRetryable: value.provider_failure_retryable ?? value.providerFailureRetryable,
    providerFailureStage: value.provider_failure_stage ?? value.providerFailureStage,
    providerFailureStatus: value.provider_failure_status ?? value.providerFailureStatus,
    providerFetchAborted: value.provider_fetch_aborted ?? value.providerFetchAborted,
    providerFetchSettled: value.provider_fetch_settled ?? value.providerFetchSettled,
    providerHttpStatus: value.provider_http_status ?? value.providerHttpStatus,
    providerMode: value.provider_mode ?? value.providerMode,
    providerOutputAcceptedReason: value.provider_output_accepted_reason ?? value.providerOutputAcceptedReason,
    providerParseStatus: value.provider_parse_status ?? value.providerParseStatus,
    providerRequestStarted: value.provider_request_started ?? value.providerRequestStarted,
    providerRubricBlockedReason: value.provider_rubric_blocked_reason ?? value.providerRubricBlockedReason,
    providerRubricDecision: value.provider_rubric_decision ?? value.providerRubricDecision,
    providerSchemaMismatchFields: value.provider_schema_mismatch_fields ?? value.providerSchemaMismatchFields,
    providerSuggestionFallbackReason: value.provider_suggestion_fallback_reason ?? value.providerSuggestionFallbackReason,
    providerTimeoutMsBucket: value.provider_timeout_ms_bucket ?? value.providerTimeoutMsBucket,
    replyLeadershipStrategy: value.reply_leadership_strategy ?? value.replyLeadershipStrategy,
    requiresAiReply: value.requires_ai_reply ?? value.requiresAiReply,
    responseFormatMode: value.response_format_mode ?? value.responseFormatMode,
    responseSource: value.response_source ?? value.responseSource,
    safeNoReplyDiagnosticAvailable: value.safe_no_reply_diagnostic_available ?? value.safeNoReplyDiagnosticAvailable,
    safeNoReplyDiagnosticReason: value.safe_no_reply_diagnostic_reason ?? value.safeNoReplyDiagnosticReason,
    source: value.source,
  };

  const normalized = Object.fromEntries(AUTO_REPLY_AI_DIAGNOSTIC_KEYS
    .map((key) => {
      if (key === 'providerSchemaMismatchFields') {
        return [key, normalizeSafeTokenList(source[key])];
      }

      if ([
        'contextPackTruncated',
        'providerCallSucceeded',
        'providerFailureRetryable',
        'providerFetchAborted',
        'providerFetchSettled',
        'providerRequestStarted',
        'requiresAiReply',
        'safeNoReplyDiagnosticAvailable',
      ].includes(key)) {
        return [key, normalizeSafeBoolean(source[key])];
      }

      if (key === 'providerHttpStatus') {
        return [key, normalizeSafeNumber(source[key])];
      }

      return [key, sanitizeText(source[key], '', 80)];
    })
    .filter(([, fieldValue]) => (
      Array.isArray(fieldValue) ? fieldValue.length > 0 : fieldValue !== undefined && fieldValue !== ''
    )));

  return Object.keys(normalized).length ? normalized : null;
};

export const normalizeOmnichannelTriageIntentKey = (value) => {
  const raw = sanitizeText(value, '', 64);
  const mapped = LEGACY_INTENT_TO_BACKEND[raw] || raw;
  return INTENT_IDS.has(mapped) ? mapped : 'outro_assunto';
};

export const normalizeOmnichannelTriageQueueKey = (value) => {
  const raw = sanitizeText(value, '', 64);
  return QUEUE_IDS.has(raw) ? raw : 'unclassified';
};

export const getOmnichannelTriageIntentLabel = (value) => {
  const key = normalizeOmnichannelTriageIntentKey(value);
  return OMNICHANNEL_TRIAGE_INTENT_CATALOG.find((intent) => intent.id === key)?.label || 'Outro assunto';
};

export const getOmnichannelTriageQueueLabel = (value) => {
  const key = normalizeOmnichannelTriageQueueKey(value);
  return OMNICHANNEL_TRIAGE_QUEUE_CATALOG.find((queue) => queue.id === key)?.label || 'Sem classificação';
};

export const normalizeOmnichannelTriageSetting = (setting = null) => {
  if (!setting || typeof setting !== 'object') return null;
  const mode = MODE_IDS.has(setting.mode) ? setting.mode : 'preview';
  const autoReplyMode = AUTO_REPLY_MODE_IDS.has(setting.auto_reply_mode || setting.autoReplyMode)
    ? setting.auto_reply_mode || setting.autoReplyMode
    : 'disabled';
  const autoReplyEnabled = Boolean(setting.auto_reply_enabled || setting.autoReplyEnabled);
  const killSwitchEnabled = setting.auto_reply_kill_switch_enabled !== false
    && setting.autoReplyKillSwitchEnabled !== false;

  return {
    autoReply: {
      enabled: autoReplyEnabled,
      killSwitchEnabled,
      mode: autoReplyMode,
      modeLabel: autoReplyMode === 'controlled_test'
        ? 'Teste controlado'
        : autoReplyMode === 'assistive'
          ? 'Assistivo'
          : autoReplyMode === 'preview'
            ? 'Preview'
            : 'Desligado',
      stateLabel: autoReplyEnabled && autoReplyMode === 'controlled_test' && !killSwitchEnabled
        ? 'Piloto controlado elegível'
        : 'Teste controlado não ativado',
      testLabel: sanitizeText(setting.auto_reply_test_label || setting.autoReplyTestLabel, 'Teste controlado desligado', 120),
    },
    enabled: Boolean(setting.enabled),
    fallbackToHumanLabel: sanitizeText(setting.fallback_to_human_label || setting.fallbackToHumanLabel, 'Encaminhamento humano manual', 120),
    id: setting.id || null,
    mode,
    modeLabel: mode === 'assistive' ? 'Assistida' : mode === 'disabled' ? 'Desativada' : 'Preview',
    source: setting.source || 'Supabase',
    stateLabel: setting.enabled ? 'Configuração disponível' : 'Configuração desativada',
    tenant_id: setting.tenant_id || setting.tenantId || null,
    updatedAt: setting.updated_at || setting.updatedAt || null,
    welcomeMessage: sanitizeText(setting.welcome_message || setting.welcomeMessage, '', 240),
  };
};

export const normalizeOmnichannelAutoReplyAllowlistEntry = (entry = null) => {
  if (!entry || typeof entry !== 'object') return null;

  return {
    active: entry.active === true,
    contactMask: sanitizeContactMask(entry.contact_mask || entry.contactMask),
    id: entry.id || null,
    label: sanitizeText(entry.label, 'Contato interno de teste', 120),
    source: entry.source || 'Supabase',
    tenant_id: entry.tenant_id || entry.tenantId || null,
    updatedAt: entry.updated_at || entry.updatedAt || entry.created_at || entry.createdAt || null,
  };
};

export const normalizeOmnichannelAutoReplyAttempt = (attempt = null) => {
  if (!attempt || typeof attempt !== 'object') return null;
  const decision = AUTO_REPLY_DECISION_IDS.has(attempt.decision) ? attempt.decision : 'blocked';
  const rawBlockReason = attempt.block_reason || attempt.blockReason || null;
  const payload = attempt.payload_redacted && typeof attempt.payload_redacted === 'object' && !Array.isArray(attempt.payload_redacted)
    ? attempt.payload_redacted
    : {};
  const aiControlledReply = normalizeAutoReplyAiDiagnostics(payload.ai_controlled_reply || payload.aiControlledReply);
  const botEventType = sanitizeText(payload.bot_send_event_type || payload.bot_event_type, '', 80);
  const blockReason = AUTO_REPLY_BLOCK_REASON_IDS.has(rawBlockReason)
    ? rawBlockReason
    : decision === 'previewed'
      ? null
      : 'auto_reply_disabled';

  return {
    blockReason,
    blockReasonLabel: blockReason ? getOmnichannelAutoReplyBlockReasonLabel(blockReason) : 'Elegível em dry-run',
    conversationId: attempt.conversation_id || attempt.conversationId || null,
    createdAt: attempt.created_at || attempt.createdAt || null,
    decision,
    decisionLabel: decision === 'previewed' ? 'Preview registrado' : decision === 'skipped' ? 'Ignorado com segurança' : 'Bloqueado',
    id: attempt.id || null,
    aiControlledReply,
    botEventType,
    preparedReplyAvailable: payload.prepared_reply_available === true,
    sendAllowed: payload.send_allowed === true,
    sendPlan: sanitizeText(payload.send_plan, 'dry_run_only', 80),
    stateLabel: botEventType === 'bot_send_sent'
      ? 'Teste controlado enviou para allowlist'
      : botEventType === 'bot_send_failed'
        ? 'Tentativa controlada falhou sem expor payload'
        : botEventType === 'bot_send_blocked'
          ? 'Bloqueado por gate de seguranca'
          : '',
    summary: payload.would_send === true
      ? 'Decisao server-side com transporte controlado.'
      : 'Decisao server-side sem transporte real.',
    transportStatus: normalizeSafeNumber(payload.transport_status) ?? null,
    wouldSend: payload.would_send === true,
    replyType: sanitizeText(attempt.reply_type || attempt.replyType, 'triage_v0_controlled_test', 80),
    source: attempt.source || 'Supabase',
    tenant_id: attempt.tenant_id || attempt.tenantId || null,
  };
};

export const getOmnichannelAutoReplyBlockReasonLabel = (value) => {
  const reason = AUTO_REPLY_BLOCK_REASON_IDS.has(value) ? value : 'auto_reply_disabled';
  const labels = {
    auto_reply_disabled: 'Auto-reply desligado',
    channel_not_ready: 'Canal não pronto',
    duplicate_idempotency: 'Idempotência já consumida',
    human_handoff_required: 'Handoff humano',
    kill_switch_enabled: 'Kill switch ativo',
    mode_not_controlled_test: 'Modo não autorizado',
    outside_allowlist: 'Fora da allowlist',
    bot_send_default_off: 'Envio bot desligado por padrao',
    destination_unavailable: 'Destino indisponivel',
    phone_number_id_unavailable: 'Canal sem identificador de envio',
    real_send_mode_disabled: 'Modo server-side nao autorizado',
    real_send_not_allowed: 'Gate server-side desligado',
    transport_failed: 'Transporte controlado falhou',
    transport_unavailable: 'Transporte indisponivel',
    safe_reply_unavailable: 'Resposta segura indisponível',
  };

  return labels[reason] || labels.auto_reply_disabled;
};

export const normalizeOmnichannelTriageFlow = (flow = null) => {
  if (!flow || typeof flow !== 'object') return null;
  const status = FLOW_STATUS_IDS.has(flow.status) ? flow.status : 'draft';

  return {
    description: sanitizeText(flow.description, '', 220),
    id: flow.id || null,
    name: sanitizeText(flow.name, 'Fluxo de triagem', 120),
    source: flow.source || 'Supabase',
    status,
    statusLabel: status === 'active' ? 'Ativo' : status === 'archived' ? 'Arquivado' : 'Rascunho',
    tenant_id: flow.tenant_id || flow.tenantId || null,
    updatedAt: flow.updated_at || flow.updatedAt || null,
  };
};

export const normalizeOmnichannelTriageQuestion = (question = null) => {
  if (!question || typeof question !== 'object') return null;
  const questionType = QUESTION_TYPE_IDS.has(question.question_type || question.questionType)
    ? question.question_type || question.questionType
    : 'text';

  return {
    active: question.active !== false,
    flowId: question.flow_id || question.flowId || null,
    id: question.id || null,
    key: sanitizeText(question.key, 'pergunta', 80),
    label: sanitizeText(question.label, 'Pergunta segura de triagem', 180),
    options: Array.isArray(question.options) ? question.options.map((option) => sanitizeText(option, '', 80)).filter(Boolean).slice(0, 8) : [],
    position: Number(question.position || 0),
    questionType,
    required: Boolean(question.required),
    source: question.source || 'Supabase',
    tenant_id: question.tenant_id || question.tenantId || null,
  };
};

export const normalizeOmnichannelTriageIntent = (intent = null) => {
  if (!intent || typeof intent !== 'object') return null;
  const key = normalizeOmnichannelTriageIntentKey(intent.key || intent.id);
  const suggestedQueue = normalizeOmnichannelTriageQueueKey(intent.suggested_queue || intent.suggestedQueue);

  return {
    active: intent.active !== false,
    description: sanitizeText(intent.description, '', 180),
    id: intent.id || key,
    key,
    label: sanitizeText(intent.label, getOmnichannelTriageIntentLabel(key), 80),
    queueLabel: getOmnichannelTriageQueueLabel(suggestedQueue),
    source: intent.source || 'Supabase',
    suggestedQueue,
    tenant_id: intent.tenant_id || intent.tenantId || null,
  };
};

export const normalizeOmnichannelTriageResult = (result = null) => {
  if (!result || typeof result !== 'object') return null;
  const intentKey = normalizeOmnichannelTriageIntentKey(result.intent_key || result.intentKey);
  const suggestedQueue = normalizeOmnichannelTriageQueueKey(result.suggested_queue || result.suggestedQueue);
  const source = SOURCE_IDS.has(result.source) ? result.source : 'assistive';

  return {
    answers: sanitizeAnswers(result.answers),
    conversationId: result.conversation_id || result.conversationId || null,
    flowId: result.flow_id || result.flowId || null,
    handoffRequired: result.handoff_required !== false && result.handoffRequired !== false,
    id: result.id || null,
    intentKey,
    intentLabel: getOmnichannelTriageIntentLabel(intentKey),
    source,
    sourceLabel: result.sourceLabel || 'Supabase',
    suggestedQueue,
    suggestedQueueLabel: getOmnichannelTriageQueueLabel(suggestedQueue),
    summary: sanitizeText(result.summary, '', 500),
    tenant_id: result.tenant_id || result.tenantId || null,
    updatedAt: result.updated_at || result.updatedAt || result.created_at || result.createdAt || null,
  };
};

export const buildOmnichannelTriageResultPayload = (input = {}) => {
  const intentKey = normalizeOmnichannelTriageIntentKey(input.intentKey || input.intent_key);
  const suggestedQueue = normalizeOmnichannelTriageQueueKey(input.suggestedQueue || input.suggested_queue);
  const source = SOURCE_IDS.has(input.source) ? input.source : 'assistive';

  return {
    answers: sanitizeAnswers(input.answers),
    flow_id: input.flowId || input.flow_id || null,
    handoff_required: input.handoffRequired !== false,
    intent_key: intentKey,
    source,
    suggested_queue: suggestedQueue,
    summary: sanitizeText(input.summary, '', 500),
  };
};
