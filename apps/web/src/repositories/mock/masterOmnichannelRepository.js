import { mockMasterTenants } from '@/data/mockMasterControl.js';

const WEBHOOK_URL = 'https://functions.sorrisync.example.invalid/whatsapp-webhook';

const STATUS_LABELS = {
  active: 'Ativo',
  archived: 'Arquivado',
  error: 'Erro',
  not_configured: 'Não configurado',
  paused: 'Pausado',
  sandbox: 'Sandbox',
};

const maskIdentifier = (value = '') => {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (clean.length <= 6) return '*'.repeat(clean.length);
  return `${clean.slice(0, 3)}***${clean.slice(-2)}`;
};

const buildValidation = (channel) => ({
  ready_for_inbound: false,
  ready_for_outbound: false,
  checks: {
    api_version: channel.api_version ? 'configurado' : 'pendente',
    app_signature: channel.app_secret_secret_ref ? 'configurado' : 'pendente',
    business_account: channel.has_waba_id || channel.has_provider_account_id ? 'configurado' : 'pendente',
    phone_number_id: channel.has_phone_number_id ? 'configurado' : 'pendente',
    send_credential: channel.access_token_secret_ref ? 'configurado' : 'pendente',
    webhook_url: 'configurado',
    webhook_verification: 'nao verificado',
  },
});

const helenChannel = {
  access_token_secret_ref: null,
  api_version: '',
  app_secret_secret_ref: null,
  can_write: false,
  created_at: '2026-06-11T08:00:00-03:00',
  display_name: 'WhatsApp oficial - demo seguro',
  has_phone_number_id: false,
  has_provider_account_id: false,
  has_waba_id: false,
  id: 'mock-omni-channel-whatsapp-Avery Chen',
  phone_number_id_masked: maskIdentifier(''),
  provider: 'whatsapp_cloud',
  provider_account_id_masked: '',
  provider_label: 'WhatsApp Cloud API',
  secret_provider: 'edge_function_env',
  secret_status: {
    app_signature: 'pendente',
    send_credential: 'pendente',
    webhook_verification: 'nao verificado',
  },
  source: 'Fallback demo',
  status: 'not_configured',
  tenant_id: 'tenant_aurora',
  tenant_name: 'Dr. Avery Chen',
  tenant_slug: 'tenant_aurora',
  updated_at: '2026-06-11T10:05:00-03:00',
  waba_id_masked: '',
  webhook_url: WEBHOOK_URL,
};

helenChannel.validation = buildValidation(helenChannel);

const tenants = mockMasterTenants.map((tenant) => ({
  id: tenant.id,
  name: tenant.name,
  plan: tenant.plan_name,
  slug: tenant.id,
  status: tenant.status,
}));

export const listMasterOmnichannelChannels = async () => ({
  can_write: false,
  channels: [helenChannel],
  server_secret_status: {
    has_meta_app_secret: false,
    has_webhook_verify_token: false,
    has_whatsapp_access_token: false,
  },
  source: 'Fallback demo',
  tenants,
  webhook_url: WEBHOOK_URL,
});

export const saveMasterOmnichannelChannel = async () => {
  throw new Error('A escrita real exige Supabase autenticado e a Edge Function omnichannel-admin.');
};

export const validateMasterOmnichannelChannel = async (channel = {}) => ({
  channel: {
    ...helenChannel,
    ...channel,
    statusLabel: STATUS_LABELS[channel.status] || STATUS_LABELS[helenChannel.status],
    validation: buildValidation({ ...helenChannel, ...channel }),
  },
  source: 'Fallback demo',
});

export const getMasterOmnichannelReadiness = async () => listMasterOmnichannelChannels();

const clone = (value) => JSON.parse(JSON.stringify(value));

const editableFeatureLabels = {
  attendance_draft: 'Rascunho de atendimento',
  conversation_summary: 'Resumo de conversa',
  playbook_agendar_avaliacao: 'Playbook: agendar avaliação',
  playbook_duvida_preco: 'Playbook: dúvida sobre preço',
  playbook_midia_recebida: 'Playbook: mídia recebida',
  playbook_pos_atendimento: 'Playbook: pós-atendimento',
  playbook_reagendar_consulta: 'Playbook: reagendar consulta',
  playbook_retorno_manual: 'Playbook: retorno manual',
  playbook_sem_vinculo_crm: 'Playbook: sem vínculo CRM',
  suggested_next_step: 'Próximo passo sugerido',
};

const allowedProviders = new Set(['off', 'mock', 'openai']);
const allowedModels = new Set(['gpt-5.4-nano']);
const sensitivePattern = /(api[_-]?key|service[_-]?role|jwt|refresh[_-]?token|access[_-]?token|\btoken\b|password|secret|signed[_-]?url)/i;

let mockPersistedAiSettings = {
  allowedFeatures: Object.entries(editableFeatureLabels).map(([key, label]) => ({
    enabled: true,
    key,
    label,
  })),
  assistantEnabled: true,
  available: true,
  dryRun: true,
  fallbackLocalEnabled: true,
  maxInputChars: 2400,
  maxOutputTokens: 240,
  model: 'gpt-5.4-nano',
  provider: 'openai',
  promptProfile: 'default',
  rateLimitPerTenant: 120,
  rateLimitPerUser: 12,
  redactionProfile: 'standard',
  source: 'Fallback demo',
  status: 'validation',
  tenantLabel: 'Clínica Demo Avery Chen',
  tenantSlug: 'tenant_aurora',
  timeoutMs: 4500,
  updatedAt: null,
  updatedBy: null,
};

const assertNoSensitiveKeys = (value) => {
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    if (sensitivePattern.test(key)) {
      throw new Error('mock_ai_settings_sensitive_field_forbidden');
    }
    assertNoSensitiveKeys(child);
  }
};

const normalizeAllowedFeaturesForMock = (features = {}) => {
  const normalized = [];

  for (const [key, enabled] of Object.entries(features || {})) {
    if (!Object.prototype.hasOwnProperty.call(editableFeatureLabels, key)) {
      throw new Error('mock_ai_settings_unknown_feature');
    }
    if (typeof enabled !== 'boolean') {
      throw new Error('mock_ai_settings_invalid_feature');
    }
    normalized.push({
      enabled,
      key,
      label: editableFeatureLabels[key],
    });
  }

  return normalized;
};

export const getMasterAiAssistantStatus = async () => ({
  ok: true,
  assistant: {
    allowedTenants: [],
    allowedTenantsCount: 0,
    blockedReason: 'assistant_disabled',
    dryRun: true,
    edgeFunctionConfigured: true,
    edgeFunctionName: 'omnichannel-attendance-assistant',
    enabled: false,
    fallbackLocal: true,
    geminiKeyConfigured: false,
    lastCheckedAt: new Date().toISOString(),
    maxInputChars: 2400,
    maxOutputTokens: 240,
    mode: 'off',
    model: null,
    openaiKeyConfigured: false,
    provider: 'off',
    rateLimitPerTenant: 120,
    rateLimitPerUser: 12,
    requestedProvider: 'off',
    timeoutMs: 4500,
    verifyJwt: true,
  },
  can_write: false,
  persistedSettings: {
    allowedFeatures: [
      {
        enabled: true,
        key: 'attendance_draft',
        label: 'Rascunho de atendimento',
      },
      {
        enabled: true,
        key: 'conversation_summary',
        label: 'Resumo de conversa',
      },
      {
        enabled: true,
        key: 'suggested_next_step',
        label: 'Próximo passo sugerido',
      },
    ],
    assistantEnabled: true,
    available: true,
    dryRun: true,
    fallbackLocalEnabled: true,
    maxInputChars: 2400,
    maxOutputTokens: 240,
    model: 'gpt-5.4-nano',
    provider: 'openai',
    promptProfile: 'default',
    rateLimitPerTenant: 120,
    rateLimitPerUser: 12,
    redactionProfile: 'standard',
    source: 'Fallback demo',
    status: 'validation',
    tenantLabel: 'Clínica Demo Avery Chen',
    tenantSlug: 'tenant_aurora',
    timeoutMs: 4500,
    updatedAt: null,
    updatedBy: null,
  },
  ...{ persistedSettings: clone(mockPersistedAiSettings) },
  role_codes: [],
  security: {
    providerCallPerformed: false,
    secretsExposed: false,
    whatsappSendEnabled: false,
  },
  source: 'Fallback demo',
});

export const getMasterAutoReplyControlStatus = async () => ({
  ai_settings: {
    assistant_enabled: true,
    available: true,
    dry_run: true,
    model: 'gpt-5.4-nano',
    provider: 'openai',
    status: 'validation',
    tenant_label: 'Clínica Demo Avery Chen',
    tenant_slug: 'tenant_aurora',
  },
  allowlist: {
    active_count: 0,
    entries: [],
    total_count: 0,
  },
  can_write: false,
  channel: {
    display_name: helenChannel.display_name,
    has_phone_number_id: false,
    id: helenChannel.id,
    phone_number_id_masked: '',
    provider: helenChannel.provider,
    status: helenChannel.status,
  },
  eligibility: {
    block_reasons: [
      'channel_not_ready',
      'ai_not_active_controlled',
      'bot_controlled_send_disabled',
      'real_whatsapp_send_not_allowed',
      'allowlist_must_have_one_active_contact',
    ],
    can_enable: false,
    ready: false,
    setup_block_reasons: [
      'channel_not_ready',
      'ai_not_active_controlled',
      'bot_controlled_send_disabled',
      'real_whatsapp_send_not_allowed',
    ],
  },
  runtime: {
    bot_controlled_send_enabled: false,
    bot_controlled_send_mode_ready: false,
    bot_controlled_send_required_mode: 'internal_allowlist_send',
    openai_key_configured: false,
    real_whatsapp_send_allowed: false,
    whatsapp_access_token_configured: false,
  },
  settings: {
    auto_reply_enabled: false,
    auto_reply_kill_switch_enabled: true,
    auto_reply_mode: 'disabled',
    auto_reply_test_label: 'Teste controlado desligado',
    updated_at: null,
  },
  source: 'Fallback demo',
  tenant: tenants.find((tenant) => tenant.slug === 'tenant_aurora') || tenants[0],
  tenants,
});

export const updateMasterAutoReplyControl = async () => {
  throw new Error('A ativação do piloto exige Supabase autenticado, Admin Master e gates server-side completos.');
};

export const updateMasterAiAssistantSettings = async (payload = {}) => {
  assertNoSensitiveKeys(payload);

  const provider = String(payload.provider || 'off').trim().toLowerCase();
  if (!allowedProviders.has(provider)) {
    throw new Error('mock_ai_settings_provider_invalid');
  }
  const dryRun = payload.dryRun !== false;
  const status = String(payload.status || (dryRun ? 'validation' : 'active_controlled')).trim();
  const requestsRealProviderTest = dryRun === false || status === 'active_controlled';

  if (!['validation', 'active_controlled'].includes(status)) {
    throw new Error('mock_ai_settings_status_invalid');
  }

  if (requestsRealProviderTest) {
    if (mockPersistedAiSettings.tenantSlug !== 'tenant_aurora') {
      throw new Error('mock_ai_settings_real_mode_tenant_forbidden');
    }
    if (provider !== 'openai') {
      throw new Error('mock_ai_settings_real_mode_requires_openai');
    }
    if (payload.assistantEnabled !== true) {
      throw new Error('mock_ai_settings_real_mode_requires_assistant_enabled');
    }
    if (dryRun !== false || status !== 'active_controlled') {
      throw new Error('mock_ai_settings_real_mode_requires_active_controlled');
    }
  }

  let model = null;
  if (provider === 'openai') {
    model = String(payload.model || '').trim();
    if (!allowedModels.has(model)) throw new Error('mock_ai_settings_model_invalid');
  } else if (provider === 'mock') {
    model = 'local-rule-based';
  }

  mockPersistedAiSettings = {
    ...mockPersistedAiSettings,
    allowedFeatures: normalizeAllowedFeaturesForMock(payload.allowedFeatures || {}),
    assistantEnabled: payload.assistantEnabled === true,
    dryRun,
    fallbackLocalEnabled: payload.fallbackLocalEnabled !== false,
    maxInputChars: Number(payload.maxInputChars || 2400),
    maxOutputTokens: Number(payload.maxOutputTokens || 240),
    model,
    provider,
    promptProfile: payload.promptProfile || 'default',
    redactionProfile: payload.redactionProfile || 'standard',
    status,
    timeoutMs: Number(payload.timeoutMs || 4500),
    updatedAt: new Date().toISOString(),
    updatedBy: 'Operador Master',
  };

  return getMasterAiAssistantStatus();
};

export const masterOmnichannelRepository = {
  getMasterAutoReplyControlStatus,
  getMasterAiAssistantStatus,
  getMasterOmnichannelReadiness,
  listMasterOmnichannelChannels,
  saveMasterOmnichannelChannel,
  updateMasterAutoReplyControl,
  updateMasterAiAssistantSettings,
  validateMasterOmnichannelChannel,
};
