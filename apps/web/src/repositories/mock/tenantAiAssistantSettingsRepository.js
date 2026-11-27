import {
  buildTenantAiAssistantSettingsReadModel,
} from '../tenantAiAssistantSettingsReadModel.js';

const HELEN_TENANT_SLUG = 'tenant_aurora';

const resolveTenantIdentifier = (tenantRef = '') => {
  if (tenantRef && typeof tenantRef === 'object') {
    return tenantRef.tenantSlug || tenantRef.slug || tenantRef.tenantId || tenantRef.id || '';
  }

  return String(tenantRef || '').trim();
};

export const getTenantAiAssistantSettings = async (tenantRef = '') => {
  const tenantIdentifier = resolveTenantIdentifier(tenantRef);

  if (tenantIdentifier !== HELEN_TENANT_SLUG) {
    return buildTenantAiAssistantSettingsReadModel(null, {
      source: 'Fallback demo',
      tenantId: tenantIdentifier || null,
      tenantSlug: tenantIdentifier.startsWith('tenant_') ? tenantIdentifier : null,
    });
  }

  return buildTenantAiAssistantSettingsReadModel({
    allowed_features: {
      attendance_draft: true,
      conversation_summary: true,
      suggested_next_step: true,
    },
    assistant_enabled: true,
    dry_run: true,
    fallback_local_enabled: true,
    max_input_chars: 2400,
    max_output_tokens: 240,
    model: 'gpt-5.4-nano',
    prompt_profile: 'default',
    provider: 'openai',
    rate_limit_per_tenant: 120,
    rate_limit_per_user: 12,
    redaction_profile: 'standard',
    status: 'validation',
    tenant_slug: HELEN_TENANT_SLUG,
    timeout_ms: 4500,
  }, {
    source: 'Fallback demo',
  });
};

export const tenantAiAssistantSettingsRepository = {
  getTenantAiAssistantSettings,
};
