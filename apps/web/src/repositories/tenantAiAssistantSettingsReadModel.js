const PROVIDERS = new Set(['off', 'mock', 'openai', 'gemini']);
const STATUSES = new Set(['disabled', 'validation', 'active_controlled', 'blocked']);
const SENSITIVE_PATTERN = /(api[_-]?key|service[_-]?role|jwt|refresh[_-]?token|token|password|secret|signed[_-]?url)/i;

export const DEFAULT_TENANT_AI_ASSISTANT_SETTINGS = Object.freeze({
  allowedFeatures: {},
  assistantEnabled: false,
  dryRun: true,
  fallbackLocalEnabled: true,
  maxInputChars: 2400,
  maxOutputTokens: 240,
  mode: 'off',
  model: null,
  provider: 'off',
  promptProfile: 'default',
  rateLimitPerTenant: 120,
  rateLimitPerUser: 12,
  redactionProfile: 'standard',
  requestedProvider: 'off',
  source: 'Fallback seguro',
  status: 'disabled',
  tenantEnabled: false,
  tenantId: null,
  tenantSlug: null,
  timeoutMs: 4500,
  updatedAt: null,
  updatedBy: null,
});

const safeText = (value, fallback = '', limit = 120) => {
  const clean = String(value || '').trim();
  if (!clean || SENSITIVE_PATTERN.test(clean)) return fallback;
  return clean.slice(0, limit);
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const clean = value.trim().toLowerCase();
    if (clean === 'true') return true;
    if (clean === 'false') return false;
  }
  return fallback;
};

const normalizeInteger = (value, fallback, min, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const normalizeNullableInteger = (value, fallback, min, max) => {
  if (value === null || value === undefined || value === '') return fallback;
  return normalizeInteger(value, fallback, min, max);
};

const normalizeProvider = (value) => {
  const provider = safeText(value, 'off', 24).toLowerCase();
  return PROVIDERS.has(provider) ? provider : 'off';
};

const normalizeStatus = (value, provider) => {
  const status = safeText(value, 'disabled', 40).toLowerCase();
  if (provider === 'off' && status === 'active_controlled') return 'blocked';
  return STATUSES.has(status) ? status : 'disabled';
};

const normalizeAllowedFeatures = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value).reduce((features, [key, featureValue]) => {
    const cleanKey = safeText(key, '', 64);
    if (!cleanKey) return features;
    features[cleanKey] = featureValue === true;
    return features;
  }, {});
};

export const buildTenantAiAssistantSettingsReadModel = (settings = null, options = {}) => {
  const row = settings && typeof settings === 'object' ? settings : {};
  const provider = normalizeProvider(row.provider ?? row.requestedProvider);
  const providerFailedClosed = provider === 'off' && row.provider && String(row.provider).toLowerCase() !== 'off';
  const status = providerFailedClosed
    ? 'blocked'
    : normalizeStatus(row.status ?? row.mode, provider);
  const assistantEnabled = providerFailedClosed
    ? false
    : normalizeBoolean(row.assistant_enabled ?? row.assistantEnabled, false);

  return {
    ...DEFAULT_TENANT_AI_ASSISTANT_SETTINGS,
    allowedFeatures: normalizeAllowedFeatures(row.allowed_features ?? row.allowedFeatures),
    assistantEnabled,
    dryRun: providerFailedClosed
      ? true
      : normalizeBoolean(row.dry_run ?? row.dryRun, true),
    fallbackLocalEnabled: normalizeBoolean(
      row.fallback_local_enabled ?? row.fallbackLocalEnabled,
      true,
    ),
    maxInputChars: normalizeInteger(
      row.max_input_chars ?? row.maxInputChars,
      DEFAULT_TENANT_AI_ASSISTANT_SETTINGS.maxInputChars,
      300,
      6000,
    ),
    maxOutputTokens: normalizeInteger(
      row.max_output_tokens ?? row.maxOutputTokens,
      DEFAULT_TENANT_AI_ASSISTANT_SETTINGS.maxOutputTokens,
      80,
      800,
    ),
    mode: status === 'disabled' ? 'off' : status,
    model: provider === 'off' ? null : safeText(row.model, null, 80),
    provider,
    promptProfile: safeText(row.prompt_profile ?? row.promptProfile, 'default', 60),
    rateLimitPerTenant: normalizeNullableInteger(
      row.rate_limit_per_tenant ?? row.rateLimitPerTenant,
      DEFAULT_TENANT_AI_ASSISTANT_SETTINGS.rateLimitPerTenant,
      1,
      1000,
    ),
    rateLimitPerUser: normalizeNullableInteger(
      row.rate_limit_per_user ?? row.rateLimitPerUser,
      DEFAULT_TENANT_AI_ASSISTANT_SETTINGS.rateLimitPerUser,
      1,
      100,
    ),
    redactionProfile: safeText(row.redaction_profile ?? row.redactionProfile, 'standard', 60),
    requestedProvider: provider,
    source: safeText(options.source ?? row.source, DEFAULT_TENANT_AI_ASSISTANT_SETTINGS.source, 80),
    status,
    tenantEnabled: assistantEnabled,
    tenantId: safeText(row.tenant_id ?? row.tenantId ?? options.tenantId, null, 80),
    tenantSlug: safeText(
      row.tenant_slug ?? row.tenantSlug ?? row.tenant?.slug ?? options.tenantSlug,
      null,
      80,
    ),
    timeoutMs: normalizeInteger(
      row.timeout_ms ?? row.timeoutMs,
      DEFAULT_TENANT_AI_ASSISTANT_SETTINGS.timeoutMs,
      1000,
      12000,
    ),
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    updatedBy: safeText(row.updated_by ?? row.updatedBy, null, 80),
  };
};
