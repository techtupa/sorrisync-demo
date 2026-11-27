import { isSupabaseConfigured, supabase, supabaseUrl } from '@/lib/supabaseClient.js';
import {
  getMasterAutoReplyControlStatus as getMockMasterAutoReplyControlStatus,
  getMasterAiAssistantStatus as getMockMasterAiAssistantStatus,
  getMasterOmnichannelReadiness as getMockMasterOmnichannelReadiness,
  listMasterOmnichannelChannels as listMockMasterOmnichannelChannels,
  updateMasterAutoReplyControl as updateMockMasterAutoReplyControl,
  updateMasterAiAssistantSettings as updateMockMasterAiAssistantSettings,
  validateMasterOmnichannelChannel as validateMockMasterOmnichannelChannel,
} from '../mock/masterOmnichannelRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const buildWebhookUrl = () => {
  const cleanUrl = String(supabaseUrl || '').replace(/\/+$/, '');
  const match = cleanUrl.match(/^https:\/\/([^.]+)\.supabase\.co$/i);
  return match ? `https://${match[1]}.functions.supabase.co/whatsapp-webhook` : '';
};

const invokeOmnichannelAdmin = async (body) => {
  if (!hasSupabase()) {
    throw new Error('Supabase não configurado para o endpoint admin Omnichannel.');
  }

  const { data, error } = await supabase.functions.invoke('omnichannel-admin', {
    body,
  });

  if (error) {
    throw new Error(error.message || 'Falha no endpoint admin Omnichannel.');
  }

  if (data?.error?.code) {
    throw new Error(data.error.code);
  }

  return data;
};

const normalizeChannel = (channel = {}, fallbackWebhookUrl = '') => ({
  id: channel.id,
  tenantId: channel.tenant_id,
  tenantSlug: channel.tenant_slug,
  tenantName: channel.tenant_name,
  provider: channel.provider || 'whatsapp_cloud',
  providerLabel: channel.provider_label || 'WhatsApp Cloud API',
  displayName: channel.display_name || 'Canal sem nome',
  status: channel.status || 'not_configured',
  phoneNumberIdMasked: channel.phone_number_id_masked || '',
  wabaIdMasked: channel.waba_id_masked || '',
  providerAccountIdMasked: channel.provider_account_id_masked || '',
  hasPhoneNumberId: Boolean(channel.has_phone_number_id),
  hasWabaId: Boolean(channel.has_waba_id),
  hasProviderAccountId: Boolean(channel.has_provider_account_id),
  apiVersion: channel.api_version || '',
  sendCredentialRef: channel.access_token_secret_ref || '',
  signatureSecretRef: channel.app_secret_secret_ref || '',
  secretProvider: channel.secret_provider || 'edge_function_env',
  secretStatus: channel.secret_status || {},
  validation: channel.validation || {},
  webhookUrl: channel.webhook_url || fallbackWebhookUrl,
  canWrite: Boolean(channel.can_write),
  createdAt: channel.created_at || null,
  updatedAt: channel.updated_at || null,
  source: channel.source || 'Supabase',
});

const normalizeTenant = (tenant = {}) => ({
  id: tenant.id,
  name: tenant.name || tenant.slug || 'Tenant',
  plan: tenant.plan || '',
  slug: tenant.slug || tenant.id,
  status: tenant.status || '',
});

const normalizeServerSecretStatus = (status = {}) => ({
  hasMetaAppSecret: Boolean(status.has_meta_app_secret ?? status.hasMetaAppSecret),
  hasWebhookVerifyToken: Boolean(status.has_webhook_verify_token ?? status.hasWebhookVerifyToken),
  hasWhatsappAccessToken: Boolean(status.has_whatsapp_access_token ?? status.hasWhatsappAccessToken),
});

const SENSITIVE_PATTERN = /(api[_-]?key|service[_-]?role|jwt|refresh[_-]?token|token|password|secret|signed[_-]?url)/i;

const safeText = (value, fallback = '', limit = 120) => {
  const clean = String(value || '').trim();
  if (!clean || SENSITIVE_PATTERN.test(clean)) return fallback;
  return clean.slice(0, limit);
};

const normalizeAllowedFeatures = (features = []) => {
  if (Array.isArray(features)) {
    return features
      .map((feature) => ({
        enabled: feature?.enabled === true,
        key: safeText(feature?.key, '', 64),
        label: safeText(feature?.label, '', 100),
      }))
      .filter((feature) => feature.key && feature.label)
      .slice(0, 20);
  }

  if (!features || typeof features !== 'object') return [];

  return Object.entries(features)
    .map(([key, enabled]) => ({
      enabled: enabled === true,
      key: safeText(key, '', 64),
      label: safeText(key, '', 100),
    }))
    .filter((feature) => feature.key && feature.label)
    .slice(0, 20);
};

const normalizePersistedAiSettings = (settings = {}) => ({
  allowedFeatures: normalizeAllowedFeatures(settings.allowedFeatures),
  assistantEnabled: Boolean(settings.assistantEnabled),
  available: Boolean(settings.available),
  dryRun: settings.dryRun !== false,
  fallbackLocalEnabled: settings.fallbackLocalEnabled !== false,
  maxInputChars: Number(settings.maxInputChars || 2400),
  maxOutputTokens: Number(settings.maxOutputTokens || 240),
  model: safeText(settings.model, null, 80),
  provider: safeText(settings.provider, 'off', 24) || 'off',
  promptProfile: safeText(settings.promptProfile, 'default', 60),
  rateLimitPerTenant: Number(settings.rateLimitPerTenant || 120),
  rateLimitPerUser: Number(settings.rateLimitPerUser || 12),
  redactionProfile: safeText(settings.redactionProfile, 'standard', 60),
  source: safeText(settings.source, 'Fallback seguro', 80),
  status: safeText(settings.status, 'disabled', 40),
  tenantLabel: safeText(settings.tenantLabel, settings.tenantSlug || 'tenant_aurora', 120),
  tenantSlug: safeText(settings.tenantSlug, 'tenant_aurora', 120),
  timeoutMs: Number(settings.timeoutMs || 4500),
  updatedAt: settings.updatedAt || null,
  updatedBy: safeText(settings.updatedBy, null, 80),
});

const normalizeAiAssistantStatus = (payload = {}) => {
  const assistant = payload.assistant || {};
  const security = payload.security || {};

  return {
    ok: payload.ok !== false,
    canWrite: Boolean(payload.can_write ?? payload.canWrite),
    roleCodes: payload.role_codes || payload.roleCodes || [],
    source: payload.source || 'Supabase',
    assistant: {
      allowedTenants: Array.isArray(assistant.allowedTenants) ? assistant.allowedTenants : [],
      allowedTenantsCount: Number(assistant.allowedTenantsCount || 0),
      blockedReason: assistant.blockedReason || '',
      dryRun: assistant.dryRun !== false,
      edgeFunctionConfigured: assistant.edgeFunctionConfigured !== false,
      edgeFunctionName: assistant.edgeFunctionName || 'omnichannel-attendance-assistant',
      enabled: Boolean(assistant.enabled),
      fallbackLocal: assistant.fallbackLocal !== false,
      geminiKeyConfigured: Boolean(assistant.geminiKeyConfigured),
      lastCheckedAt: assistant.lastCheckedAt || null,
      maxInputChars: Number(assistant.maxInputChars || 2400),
      maxOutputTokens: Number(assistant.maxOutputTokens || 240),
      mode: assistant.mode || 'off',
      model: assistant.model || null,
      openaiKeyConfigured: Boolean(assistant.openaiKeyConfigured),
      provider: assistant.provider || 'off',
      rateLimitPerTenant: Number(assistant.rateLimitPerTenant || 120),
      rateLimitPerUser: Number(assistant.rateLimitPerUser || 12),
      requestedProvider: assistant.requestedProvider || assistant.provider || 'off',
      timeoutMs: Number(assistant.timeoutMs || 4500),
      verifyJwt: assistant.verifyJwt !== false,
    },
    persistedSettings: normalizePersistedAiSettings(payload.persistedSettings),
    security: {
      providerCallPerformed: Boolean(security.providerCallPerformed),
      secretsExposed: Boolean(security.secretsExposed),
      whatsappSendEnabled: Boolean(security.whatsappSendEnabled),
    },
  };
};

const normalizeAutoReplyRuntime = (runtime = {}) => ({
  botControlledSendEnabled: Boolean(runtime.bot_controlled_send_enabled ?? runtime.botControlledSendEnabled),
  botControlledSendModeReady: Boolean(runtime.bot_controlled_send_mode_ready ?? runtime.botControlledSendModeReady),
  botControlledSendRequiredMode: safeText(runtime.bot_controlled_send_required_mode ?? runtime.botControlledSendRequiredMode, 'internal_allowlist_send', 80),
  openaiKeyConfigured: Boolean(runtime.openai_key_configured ?? runtime.openaiKeyConfigured),
  realWhatsAppSendAllowed: Boolean(runtime.real_whatsapp_send_allowed ?? runtime.realWhatsAppSendAllowed),
  whatsappAccessTokenConfigured: Boolean(runtime.whatsapp_access_token_configured ?? runtime.whatsappAccessTokenConfigured),
});

const normalizeAutoReplyControl = (payload = {}) => ({
  aiSettings: {
    assistantEnabled: Boolean(payload.ai_settings?.assistant_enabled ?? payload.aiSettings?.assistantEnabled),
    available: Boolean(payload.ai_settings?.available ?? payload.aiSettings?.available),
    dryRun: (payload.ai_settings?.dry_run ?? payload.aiSettings?.dryRun) !== false,
    model: safeText(payload.ai_settings?.model ?? payload.aiSettings?.model, null, 80),
    provider: safeText(payload.ai_settings?.provider ?? payload.aiSettings?.provider, 'off', 24),
    status: safeText(payload.ai_settings?.status ?? payload.aiSettings?.status, 'disabled', 40),
    tenantLabel: safeText(payload.ai_settings?.tenant_label ?? payload.aiSettings?.tenantLabel, '', 160),
    tenantSlug: safeText(payload.ai_settings?.tenant_slug ?? payload.aiSettings?.tenantSlug, 'tenant_aurora', 120),
  },
  allowlist: {
    activeCount: Number(payload.allowlist?.active_count ?? payload.allowlist?.activeCount ?? 0),
    entries: (payload.allowlist?.entries || []).map((entry) => ({
      active: entry.active === true,
      channelMatchesSelected: entry.channel_matches_selected !== false,
      channelScoped: Boolean(entry.channel_scoped ?? entry.channelScoped),
      contactMask: safeText(entry.contact_mask ?? entry.contactMask, '', 32),
      label: safeText(entry.label, '', 120),
      updatedAt: entry.updated_at || entry.updatedAt || null,
    })),
    totalCount: Number(payload.allowlist?.total_count ?? payload.allowlist?.totalCount ?? 0),
  },
  canWrite: Boolean(payload.can_write ?? payload.canWrite),
  channel: payload.channel ? {
    displayName: safeText(payload.channel.display_name ?? payload.channel.displayName, 'Canal WhatsApp', 120),
    hasPhoneNumberId: Boolean(payload.channel.has_phone_number_id ?? payload.channel.hasPhoneNumberId),
    id: payload.channel.id || '',
    phoneNumberIdMasked: safeText(payload.channel.phone_number_id_masked ?? payload.channel.phoneNumberIdMasked, '', 40),
    provider: safeText(payload.channel.provider, 'whatsapp_cloud', 40),
    status: safeText(payload.channel.status, 'not_configured', 40),
  } : null,
  eligibility: {
    blockReasons: payload.eligibility?.block_reasons || payload.eligibility?.blockReasons || [],
    canEnable: Boolean(payload.eligibility?.can_enable ?? payload.eligibility?.canEnable),
    ready: Boolean(payload.eligibility?.ready),
    setupBlockReasons: payload.eligibility?.setup_block_reasons || payload.eligibility?.setupBlockReasons || [],
  },
  runtime: normalizeAutoReplyRuntime(payload.runtime),
  settings: {
    autoReplyEnabled: Boolean(payload.settings?.auto_reply_enabled ?? payload.settings?.autoReplyEnabled),
    autoReplyKillSwitchEnabled: (payload.settings?.auto_reply_kill_switch_enabled ?? payload.settings?.autoReplyKillSwitchEnabled) !== false,
    autoReplyMode: safeText(payload.settings?.auto_reply_mode ?? payload.settings?.autoReplyMode, 'disabled', 40),
    autoReplyTestLabel: safeText(payload.settings?.auto_reply_test_label ?? payload.settings?.autoReplyTestLabel, '', 120),
    updatedAt: payload.settings?.updated_at || payload.settings?.updatedAt || null,
  },
  source: payload.source || 'Supabase',
  tenant: normalizeTenant(payload.tenant),
  tenants: (payload.tenants || []).map(normalizeTenant),
});

export const listMasterOmnichannelChannels = async () => {
  if (!hasSupabase()) {
    const fallback = await listMockMasterOmnichannelChannels();
    return {
      ...fallback,
      channels: fallback.channels.map((channel) => normalizeChannel(channel, fallback.webhook_url)),
      serverSecretStatus: normalizeServerSecretStatus(fallback.server_secret_status),
      tenants: fallback.tenants.map(normalizeTenant),
    };
  }

  try {
    const data = await invokeOmnichannelAdmin({
      action: 'list_whatsapp_channels',
    });
    const webhookUrl = data.webhook_url || buildWebhookUrl();

    return {
      canWrite: Boolean(data.can_write),
      channels: (data.channels || []).map((channel) => normalizeChannel(channel, webhookUrl)),
      serverSecretStatus: normalizeServerSecretStatus(data.server_secret_status),
      source: 'Supabase',
      tenants: (data.tenants || []).map(normalizeTenant),
      webhookUrl,
    };
  } catch {
    const fallback = await listMockMasterOmnichannelChannels();
    return {
      ...fallback,
      channels: fallback.channels.map((channel) => normalizeChannel(channel, fallback.webhook_url)),
      serverSecretStatus: normalizeServerSecretStatus(fallback.server_secret_status),
      source: 'Fallback demo',
      tenants: fallback.tenants.map(normalizeTenant),
      webhookUrl: fallback.webhook_url,
    };
  }
};

export const getMasterOmnichannelReadiness = async (payload = {}) => {
  if (!hasSupabase()) {
    const fallback = await getMockMasterOmnichannelReadiness(payload);
    return {
      ...fallback,
      channels: fallback.channels.map((channel) => normalizeChannel(channel, fallback.webhook_url)),
      serverSecretStatus: normalizeServerSecretStatus(fallback.server_secret_status),
      tenants: fallback.tenants.map(normalizeTenant),
      webhookUrl: fallback.webhook_url,
    };
  }

  try {
    const data = await invokeOmnichannelAdmin({
      action: 'get_whatsapp_channel_readiness',
      tenant_id: payload.tenantId || undefined,
      tenant_slug: payload.tenantSlug || undefined,
    });
    const webhookUrl = data.webhook_url || buildWebhookUrl();

    return {
      canWrite: Boolean(data.can_write),
      channels: (data.channels || []).map((channel) => normalizeChannel(channel, webhookUrl)),
      serverSecretStatus: normalizeServerSecretStatus(data.server_secret_status),
      source: 'Supabase',
      tenants: (data.tenants || []).map(normalizeTenant),
      webhookUrl,
    };
  } catch {
    const fallback = await getMockMasterOmnichannelReadiness(payload);
    return {
      ...fallback,
      channels: fallback.channels.map((channel) => normalizeChannel(channel, fallback.webhook_url)),
      serverSecretStatus: normalizeServerSecretStatus(fallback.server_secret_status),
      source: 'Fallback demo',
      tenants: fallback.tenants.map(normalizeTenant),
      webhookUrl: fallback.webhook_url,
    };
  }
};

export const getMasterAiAssistantStatus = async () => {
  if (!hasSupabase()) {
    const fallback = await getMockMasterAiAssistantStatus();
    return normalizeAiAssistantStatus(fallback);
  }

  try {
    const data = await invokeOmnichannelAdmin({
      action: 'get_ai_assistant_status',
    });

    return normalizeAiAssistantStatus(data);
  } catch {
    const fallback = await getMockMasterAiAssistantStatus();
    return {
      ...normalizeAiAssistantStatus(fallback),
      source: 'Fallback demo',
    };
  }
};

export const updateMasterAiAssistantSettings = async (payload = {}) => {
  if (!hasSupabase()) {
    const fallback = await updateMockMasterAiAssistantSettings(payload);
    return normalizeAiAssistantStatus(fallback);
  }

  const allowedFeatures = payload.allowedFeatures && typeof payload.allowedFeatures === 'object'
    ? payload.allowedFeatures
    : {};
  const data = await invokeOmnichannelAdmin({
    action: 'update_ai_assistant_settings',
    allowed_features: allowedFeatures,
    assistant_enabled: payload.assistantEnabled === true,
    dry_run: payload.dryRun !== false,
    fallback_local_enabled: payload.fallbackLocalEnabled !== false,
    max_input_chars: payload.maxInputChars,
    max_output_tokens: payload.maxOutputTokens,
    model: payload.model || undefined,
    provider: payload.provider,
    prompt_profile: payload.promptProfile || 'default',
    redaction_profile: payload.redactionProfile || 'standard',
    status: payload.status || 'validation',
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
    timeout_ms: payload.timeoutMs,
  });

  return normalizeAiAssistantStatus(data);
};

export const getMasterAutoReplyControlStatus = async (payload = {}) => {
  if (!hasSupabase()) {
    const fallback = await getMockMasterAutoReplyControlStatus(payload);
    return normalizeAutoReplyControl(fallback);
  }

  try {
    const data = await invokeOmnichannelAdmin({
      action: 'get_auto_reply_control_status',
      channel_id: payload.channelId || undefined,
      tenant_id: payload.tenantId || undefined,
      tenant_slug: payload.tenantSlug || undefined,
    });

    return normalizeAutoReplyControl(data);
  } catch {
    const fallback = await getMockMasterAutoReplyControlStatus(payload);
    return {
      ...normalizeAutoReplyControl(fallback),
      source: 'Fallback demo',
    };
  }
};

export const updateMasterAutoReplyControl = async (payload = {}) => {
  if (!hasSupabase()) {
    const fallback = await updateMockMasterAutoReplyControl(payload);
    return normalizeAutoReplyControl(fallback);
  }

  const data = await invokeOmnichannelAdmin({
    action: 'update_auto_reply_control',
    channel_id: payload.channelId || undefined,
    confirm_controlled_test: payload.enabled ? 'ATIVAR_TESTE_CONTROLADO_IA' : undefined,
    enabled: payload.enabled === true,
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
    test_contact_phone: payload.testContactPhone || undefined,
    test_label: payload.testLabel || undefined,
  });

  return normalizeAutoReplyControl(data);
};

export const saveMasterOmnichannelChannel = async (payload = {}) => {
  const data = await invokeOmnichannelAdmin({
    action: 'save_whatsapp_channel_metadata',
    access_token_secret_ref: payload.sendCredentialRef || undefined,
    api_version: payload.apiVersion || undefined,
    app_secret_secret_ref: payload.signatureSecretRef || undefined,
    channel_id: payload.channelId || undefined,
    display_name: payload.displayName,
    phone_number_id: payload.phoneNumberId || undefined,
    provider_account_id: payload.providerAccountId || undefined,
    secret_provider: payload.secretProvider || undefined,
    status: payload.status,
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
    waba_id: payload.wabaId || undefined,
  });

  return normalizeChannel(data.channel, buildWebhookUrl());
};

export const validateMasterOmnichannelChannel = async (payload = {}) => {
  if (!hasSupabase()) {
    return validateMockMasterOmnichannelChannel(payload);
  }

  const data = await invokeOmnichannelAdmin({
    action: 'validate_whatsapp_channel_setup',
    channel_id: payload.channelId || undefined,
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
  });

  return {
    channel: normalizeChannel(data.channel, buildWebhookUrl()),
    source: 'Supabase',
  };
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
