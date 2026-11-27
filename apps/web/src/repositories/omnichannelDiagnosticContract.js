export const OMNICHANNEL_DIAGNOSTIC_STATUSES = [
  'draft',
  'submitted',
  'reviewed',
  'approved_for_pilot',
  'archived',
];

export const OMNICHANNEL_DIAGNOSTIC_STATUS_LABELS = {
  draft: 'Rascunho',
  submitted: 'Enviado para análise',
  reviewed: 'Revisado',
  approved_for_pilot: 'Aprovado para piloto',
  archived: 'Arquivado',
};

export const OMNICHANNEL_DIAGNOSTIC_ROLE_OPTIONS = [
  { value: 'socio_dentista', label: 'Sócio(a), gestor(a) ou dentista responsável' },
  { value: 'gestao_clinica', label: 'Gestão da clínica' },
  { value: 'coordenacao_atendimento', label: 'Coordenação de recepção, comercial ou relacionamento' },
  { value: 'recepcao', label: 'Recepção ou atendimento' },
  { value: 'outro', label: 'Outra função na clínica' },
];

export const OMNICHANNEL_DIAGNOSTIC_CHANNEL_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'site', label: 'Site' },
  { value: 'google_business', label: 'Perfil da Empresa no Google' },
  { value: 'email', label: 'E-mail' },
];

export const OMNICHANNEL_DIAGNOSTIC_LEAD_SOURCE_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google', label: 'Google' },
  { value: 'site', label: 'Site' },
  { value: 'pacientes_atuais', label: 'Pacientes atuais' },
  { value: 'trafego_pago', label: 'Tráfego pago/anúncios' },
  { value: 'outro', label: 'Outro' },
];

export const OMNICHANNEL_DIAGNOSTIC_PAIN_OPTIONS = [
  { value: 'sem_priorizacao', label: 'Não sabemos quais conversas precisam de atenção primeiro' },
  { value: 'perda_de_historico', label: 'Quando outra pessoa assume a conversa, falta histórico do que já foi combinado' },
  { value: 'demora_na_resposta', label: 'Demora na primeira resposta' },
  { value: 'sem_responsavel', label: 'Às vezes ninguém sabe quem ficou responsável pela conversa' },
  { value: 'retrabalho', label: 'Retrabalho entre recepção, comercial/relacionamento e gestão' },
  { value: 'sem_indicadores', label: 'Faltam números para saber onde melhorar primeiro' },
  { value: 'paciente_sem_resposta', label: 'Paciente manda mensagem e fica sem resposta' },
  { value: 'interessado_esfria', label: 'Pessoa interessada perde o interesse antes de agendar' },
  { value: 'orcamento_sem_follow_up', label: 'Orçamento é enviado, mas ninguém acompanha depois' },
  { value: 'confirmacao_sem_controle', label: 'Confirmação de consulta é feita manualmente sem controle' },
  { value: 'gestor_sem_visao', label: 'O gestor não consegue saber se a equipe respondeu tudo' },
  { value: 'dependencia_pessoa', label: 'Atendimento depende muito de uma única pessoa' },
];

export const OMNICHANNEL_DIAGNOSTIC_METRIC_OPTIONS = [
  { value: 'tempo_primeira_resposta', label: 'Tempo de primeira resposta' },
  { value: 'conversas_sem_responsavel', label: 'Conversas sem responsável' },
  { value: 'agendamentos_originados', label: 'Consultas agendadas pelo WhatsApp' },
  { value: 'conversas_retomadas', label: 'Conversas paradas que voltaram a receber resposta' },
  { value: 'handoff_humano', label: 'Repasses de atendimento concluídos' },
  { value: 'volume_por_periodo', label: 'Quantidade de conversas por horário do dia' },
];

export const OMNICHANNEL_DIAGNOSTIC_MVP_PRIORITIES = [
  { value: 'organizar_atendimento', label: 'Organizar todos os WhatsApps em um só lugar' },
  { value: 'separar_responsavel', label: 'Separar atendimento por responsável' },
  { value: 'conversas_pendentes', label: 'Saber quais conversas estão pendentes' },
  { value: 'acompanhar_interessados', label: 'Acompanhar interessados novos até o agendamento' },
  { value: 'melhorar_confirmacao', label: 'Melhorar confirmação de consultas' },
  { value: 'follow_up_orcamentos', label: 'Melhorar follow-up de orçamentos' },
  { value: 'reativar_pacientes', label: 'Reativar pacientes antigos' },
  { value: 'medir_atendimento', label: 'Medir desempenho do atendimento' },
  { value: 'nao_sei', label: 'Ainda não sei' },
];

export const OMNICHANNEL_DIAGNOSTIC_SUCCESS_OPTIONS = [
  { value: 'menos_mensagens_perdidas', label: 'Menos mensagens perdidas' },
  { value: 'respostas_mais_rapidas', label: 'Respostas mais rápidas' },
  { value: 'mais_consultas_agendadas', label: 'Mais consultas agendadas' },
  { value: 'equipe_organizada', label: 'Melhor organização da equipe' },
  { value: 'menos_dependencia_pessoa', label: 'Menos dependência de uma pessoa específica' },
  { value: 'controle_interessados', label: 'Mais controle dos interessados novos' },
  { value: 'follow_up_orcamentos', label: 'Mais follow-up de orçamentos' },
  { value: 'clareza_gestao', label: 'Mais clareza para a gestão' },
  { value: 'outro', label: 'Outro' },
];

export const OMNICHANNEL_DIAGNOSTIC_VOLUME_OPTIONS = [
  { value: 'ate_20', label: 'Até 20 mensagens por dia' },
  { value: '21_50', label: '21 a 50 mensagens por dia' },
  { value: '51_100', label: '51 a 100 mensagens por dia' },
  { value: '101_200', label: '101 a 200 mensagens por dia' },
  { value: 'mais_200', label: 'Mais de 200 mensagens por dia' },
  { value: 'nao_medido', label: 'Ainda não medido' },
];

export const OMNICHANNEL_DIAGNOSTIC_WHATSAPP_PURPOSES = [
  { value: 'recepcao', label: 'Recepção' },
  { value: 'agenda', label: 'Agendar, remarcar e confirmar consultas' },
  { value: 'crc', label: 'Comercial, relacionamento ou follow-up' },
  { value: 'pos_atendimento', label: 'Pós-atendimento' },
  { value: 'financeiro_operacional', label: 'Orientação administrativa' },
  { value: 'duvidas_gerais', label: 'Dúvidas gerais' },
  { value: 'gestao', label: 'Gestão acompanha casos delicados' },
];

const UNSAFE_DIAGNOSTIC_PATTERN = /(\bcpf\b|\bcnpj\b|\brg\b|senha|token|chave privada|segredo|payload|webhook|qr\s*code|qrcode|print|screenshot|hist[oó]rico real|nome do paciente|prontu[aá]rio|documento do paciente|\bcart[aã]o\b|\bpix\b|\bboleto\b)/i;

const FREE_TEXT_DIAGNOSTIC_FIELDS = [
  'currentFlowDescription',
  'mainPainDescription',
  'pilotSuccessDescription',
  'firstChannelsDescription',
  'excludedChannelsDescription',
  'importantRulesDescription',
  'privacyNotes',
  'currentChannels.notes',
  'futureChannels.notes',
];

const asText = (value) => (typeof value === 'string' ? value.trim() : '');
const asOptionalText = (value) => {
  const text = asText(value);
  return text || null;
};
const asNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
};
const asBooleanOrNull = (value) => (typeof value === 'boolean' ? value : null);
const uniqueValues = (values = []) => [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

export const createEmptyOmnichannelDiagnosticForm = () => ({
  id: null,
  clinicName: '',
  responsibleName: '',
  responsibleRole: '',
  contactPhone: '',
  contactEmail: '',
  city: '',
  state: '',
  pilotOwnerStatus: '',
  professionalsCount: '',
  attendantsCount: '',
  hasCrc: null,
  whatsappNumbersCount: '',
  whatsappUsage: {
    purposes: [],
    accessType: '',
    multipleUsersSameNumber: null,
    sharedPhysicalPhone: null,
    historyLossRisk: null,
    excludedNumberExists: null,
    teamOwnedNumberStatus: '',
    excludedNumberStatus: '',
    usesLabels: null,
    usesQuickReplies: null,
    losesConversationsWithSharedAccess: '',
  },
  teamStructure: {
    respondersCount: '',
    hasReceptionCrcHandoff: null,
    hasSeparatedReceptionCommercial: null,
    receptionCommercialHandoff: '',
    messageOwnershipRule: '',
  },
  attendanceResponsibilities: {
    leads: '',
    activePatients: '',
    scheduling: '',
    confirmations: '',
    rescheduling: '',
    reactivation: '',
    budgetFollowUp: '',
    sensitiveIssues: '',
  },
  currentChannels: {
    channels: [],
    leadSources: [],
    notes: '',
  },
  futureChannels: {
    channels: [],
    notes: '',
  },
  messageVolume: {
    dailyRange: '',
    peakPeriods: [],
    manualBacklog: '',
    afterHoursRoutine: '',
    knowsUnansweredConversations: '',
  },
  operationalPains: {
    items: [],
    severity: '',
  },
  desiredMetrics: {
    items: [],
    primaryMetric: '',
    simplePilotStart: '',
  },
  currentFlowDescription: '',
  mainPainDescription: '',
  pilotSuccessDescription: '',
  firstChannelsDescription: '',
  excludedChannelsDescription: '',
  importantRulesDescription: '',
  privacyNotes: '',
  privacyConfirmationAccepted: false,
  mvpPriority: '',
  successCriteria: '',
  status: 'draft',
  submittedAt: null,
  reviewedAt: null,
  createdAt: null,
  updatedAt: null,
  source: 'empty',
});

const normalizeJsonBlock = (value, fallback) => ({
  ...fallback,
  ...asObject(value),
});

export const normalizeOmnichannelDiagnostic = (row = null) => {
  if (!row) {
    return createEmptyOmnichannelDiagnosticForm();
  }

  return {
    ...createEmptyOmnichannelDiagnosticForm(),
    id: row.id || null,
    tenantId: row.tenant_id || null,
    clinicName: row.clinic_name || '',
    responsibleName: row.responsible_name || '',
    responsibleRole: row.responsible_role || '',
    contactPhone: row.contact_phone || '',
    contactEmail: row.contact_email || '',
    city: row.city || '',
    state: row.state || '',
    pilotOwnerStatus: row.team_structure?.pilotOwnerStatus || '',
    professionalsCount: row.professionals_count ?? '',
    attendantsCount: row.attendants_count ?? '',
    hasCrc: asBooleanOrNull(row.has_crc),
    whatsappNumbersCount: row.whatsapp_numbers_count ?? '',
    whatsappUsage: normalizeJsonBlock(row.whatsapp_usage, createEmptyOmnichannelDiagnosticForm().whatsappUsage),
    teamStructure: normalizeJsonBlock(row.team_structure, createEmptyOmnichannelDiagnosticForm().teamStructure),
    attendanceResponsibilities: normalizeJsonBlock(
      row.attendance_responsibilities,
      createEmptyOmnichannelDiagnosticForm().attendanceResponsibilities,
    ),
    currentChannels: normalizeJsonBlock(row.current_channels, createEmptyOmnichannelDiagnosticForm().currentChannels),
    futureChannels: normalizeJsonBlock(row.future_channels, createEmptyOmnichannelDiagnosticForm().futureChannels),
    messageVolume: normalizeJsonBlock(row.message_volume, createEmptyOmnichannelDiagnosticForm().messageVolume),
    operationalPains: normalizeJsonBlock(row.operational_pains, createEmptyOmnichannelDiagnosticForm().operationalPains),
    desiredMetrics: normalizeJsonBlock(row.desired_metrics, createEmptyOmnichannelDiagnosticForm().desiredMetrics),
    currentFlowDescription: row.current_flow_description || '',
    mainPainDescription: row.main_pain_description || '',
    pilotSuccessDescription: row.pilot_success_description || '',
    firstChannelsDescription: row.first_channels_description || '',
    excludedChannelsDescription: row.excluded_channels_description || '',
    importantRulesDescription: row.important_rules_description || '',
    privacyNotes: row.privacy_notes || '',
    mvpPriority: row.mvp_priority || '',
    successCriteria: row.success_criteria || '',
    status: OMNICHANNEL_DIAGNOSTIC_STATUSES.includes(row.status) ? row.status : 'draft',
    submittedAt: row.submitted_at || null,
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null,
    source: row.source || 'supabase',
  };
};

const buildJsonPayload = (form = {}) => ({
  whatsappUsage: {
    ...asObject(form.whatsappUsage),
    purposes: uniqueValues(form.whatsappUsage?.purposes),
  },
  teamStructure: {
    ...asObject(form.teamStructure),
    respondersCount: asNumberOrNull(form.teamStructure?.respondersCount),
    pilotOwnerStatus: asOptionalText(form.pilotOwnerStatus),
  },
  attendanceResponsibilities: asObject(form.attendanceResponsibilities),
  currentChannels: {
    ...asObject(form.currentChannels),
    channels: uniqueValues(form.currentChannels?.channels),
    leadSources: uniqueValues(form.currentChannels?.leadSources),
  },
  futureChannels: {
    ...asObject(form.futureChannels),
    channels: uniqueValues(form.futureChannels?.channels),
  },
  messageVolume: {
    ...asObject(form.messageVolume),
    peakPeriods: uniqueValues(form.messageVolume?.peakPeriods),
  },
  operationalPains: {
    ...asObject(form.operationalPains),
    items: uniqueValues(form.operationalPains?.items),
  },
  desiredMetrics: {
    ...asObject(form.desiredMetrics),
    items: uniqueValues(form.desiredMetrics?.items),
  },
});

export const buildOmnichannelDiagnosticPayload = (form = {}, options = {}) => {
  const status = OMNICHANNEL_DIAGNOSTIC_STATUSES.includes(options.status || form.status)
    ? options.status || form.status
    : 'draft';
  const jsonPayload = buildJsonPayload(form);

  return {
    clinic_name: asOptionalText(form.clinicName),
    responsible_name: asOptionalText(form.responsibleName),
    responsible_role: asOptionalText(form.responsibleRole),
    contact_phone: asOptionalText(form.contactPhone),
    contact_email: asOptionalText(form.contactEmail),
    city: asOptionalText(form.city),
    state: asOptionalText(form.state)?.toUpperCase() || null,
    professionals_count: asNumberOrNull(form.professionalsCount),
    attendants_count: asNumberOrNull(form.attendantsCount),
    has_crc: asBooleanOrNull(form.hasCrc),
    whatsapp_numbers_count: asNumberOrNull(form.whatsappNumbersCount),
    whatsapp_usage: jsonPayload.whatsappUsage,
    team_structure: jsonPayload.teamStructure,
    attendance_responsibilities: jsonPayload.attendanceResponsibilities,
    current_channels: jsonPayload.currentChannels,
    future_channels: jsonPayload.futureChannels,
    message_volume: jsonPayload.messageVolume,
    operational_pains: jsonPayload.operationalPains,
    desired_metrics: jsonPayload.desiredMetrics,
    current_flow_description: asOptionalText(form.currentFlowDescription),
    main_pain_description: asOptionalText(form.mainPainDescription),
    pilot_success_description: asOptionalText(form.pilotSuccessDescription),
    first_channels_description: asOptionalText(form.firstChannelsDescription),
    excluded_channels_description: asOptionalText(form.excludedChannelsDescription),
    important_rules_description: asOptionalText(form.importantRulesDescription),
    privacy_notes: asOptionalText(form.privacyNotes),
    mvp_priority: asOptionalText(form.mvpPriority),
    success_criteria: asOptionalText(form.successCriteria),
    status,
  };
};

const getNestedValue = (value, path) => (
  path.split('.').reduce((current, key) => current?.[key], value)
);

const hasUnsafeContent = (form = {}) => {
  return FREE_TEXT_DIAGNOSTIC_FIELDS.some((path) => UNSAFE_DIAGNOSTIC_PATTERN.test(asText(getNestedValue(form, path))));
};

export const validateOmnichannelDiagnosticForSubmit = (form = {}, options = {}) => {
  const errors = [];
  const requirePrivacyConfirmation = options.requirePrivacyConfirmation === true;

  if (!asText(form.clinicName)) errors.push('Informe o nome da clínica.');
  if (!asText(form.responsibleName)) errors.push('Informe o responsável pelo diagnóstico.');
  if (!asText(form.responsibleRole)) errors.push('Informe a função do responsável.');
  if (!asText(form.contactPhone) && !asText(form.contactEmail)) {
    errors.push('Informe telefone/WhatsApp ou e-mail para contato.');
  }
  if (!asText(form.city)) errors.push('Informe a cidade da clínica.');
  if (!asText(form.state)) errors.push('Informe o estado/UF da clínica.');
  if (!uniqueValues(form.whatsappUsage?.purposes).length) errors.push('Selecione pelo menos um uso atual do WhatsApp.');
  if (!uniqueValues(form.currentChannels?.channels).length) errors.push('Selecione pelo menos um canal atual.');
  if (!uniqueValues(form.operationalPains?.items).length) errors.push('Selecione pelo menos uma dor operacional.');
  if (!uniqueValues(form.desiredMetrics?.items).length) errors.push('Selecione pelo menos um indicador desejado.');
  if (!asText(form.mvpPriority)) errors.push('Selecione o primeiro objetivo do piloto.');
  if (!asText(form.successCriteria)) errors.push('Selecione como vamos saber que o piloto deu certo.');
  if (requirePrivacyConfirmation && form.privacyConfirmationAccepted !== true) {
    errors.push('Confirme que não informou dados sensíveis.');
  }
  if (asText(form.contactEmail) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(asText(form.contactEmail))) {
    errors.push('Informe um e-mail válido ou deixe o campo vazio.');
  }
  if (hasUnsafeContent(form)) {
    errors.push('Remova nomes de pacientes, prints, credenciais, documentos, dados de saúde ou informações financeiras.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const getOmnichannelDiagnosticStatusLabel = (status) => (
  OMNICHANNEL_DIAGNOSTIC_STATUS_LABELS[status] || OMNICHANNEL_DIAGNOSTIC_STATUS_LABELS.draft
);

const findOptionLabel = (options, value) => options.find((option) => option.value === value)?.label || '';

export const buildOmnichannelDiagnosticSummary = (form = {}) => {
  const selectedPains = uniqueValues(form.operationalPains?.items)
    .map((value) => findOptionLabel(OMNICHANNEL_DIAGNOSTIC_PAIN_OPTIONS, value))
    .filter(Boolean);
  const selectedMetrics = uniqueValues(form.desiredMetrics?.items)
    .map((value) => findOptionLabel(OMNICHANNEL_DIAGNOSTIC_METRIC_OPTIONS, value))
    .filter(Boolean);
  const selectedChannels = uniqueValues(form.currentChannels?.channels)
    .map((value) => findOptionLabel(OMNICHANNEL_DIAGNOSTIC_CHANNEL_OPTIONS, value))
    .filter(Boolean);
  const selectedWhatsappPurposes = uniqueValues(form.whatsappUsage?.purposes)
    .map((value) => findOptionLabel(OMNICHANNEL_DIAGNOSTIC_WHATSAPP_PURPOSES, value))
    .filter(Boolean);

  return {
    statusLabel: getOmnichannelDiagnosticStatusLabel(form.status),
    sourceLabel: form.source === 'supabase' ? 'Supabase' : form.source === 'mock' ? 'Fallback demo' : 'Sem dados',
    mvpPriorityLabel: findOptionLabel(OMNICHANNEL_DIAGNOSTIC_MVP_PRIORITIES, form.mvpPriority),
    successCriteriaLabel: findOptionLabel(OMNICHANNEL_DIAGNOSTIC_SUCCESS_OPTIONS, form.successCriteria),
    selectedPains,
    selectedMetrics,
    selectedChannels,
    selectedWhatsappPurposes,
    isSubmitted: form.status && form.status !== 'draft',
    hasMinimumContact: Boolean(asText(form.contactPhone) || asText(form.contactEmail)),
    updatedAt: form.updatedAt || form.createdAt || null,
  };
};
