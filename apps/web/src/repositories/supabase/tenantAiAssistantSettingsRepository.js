import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getTenantAiAssistantSettings as getMockTenantAiAssistantSettings,
} from '../mock/tenantAiAssistantSettingsRepository.js';
import {
  buildTenantAiAssistantSettingsReadModel,
} from '../tenantAiAssistantSettingsReadModel.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SETTINGS_SELECT = `
  id,
  tenant_id,
  assistant_enabled,
  dry_run,
  provider,
  model,
  max_input_chars,
  max_output_tokens,
  timeout_ms,
  rate_limit_per_user,
  rate_limit_per_tenant,
  fallback_local_enabled,
  allowed_features,
  status,
  prompt_profile,
  redaction_profile,
  updated_at,
  updated_by,
  tenant:tenants(id, slug, name)
`;

const resolveTenantIdentifier = (tenantRef = '') => {
  if (tenantRef && typeof tenantRef === 'object') {
    return String(tenantRef.tenantSlug || tenantRef.slug || tenantRef.tenantId || tenantRef.id || '').trim();
  }

  return String(tenantRef || '').trim();
};

const buildDefaultOff = (tenantIdentifier = '', tenant = null, source = 'Supabase sem configuracao') => (
  buildTenantAiAssistantSettingsReadModel(null, {
    source,
    tenantId: tenant?.id || (UUID_PATTERN.test(tenantIdentifier) ? tenantIdentifier : null),
    tenantSlug: tenant?.slug || (tenantIdentifier.startsWith('tenant_') ? tenantIdentifier : null),
  })
);

const resolveTenant = async (tenantIdentifier) => {
  if (!tenantIdentifier || UUID_PATTERN.test(tenantIdentifier)) {
    return {
      id: tenantIdentifier || null,
      slug: null,
    };
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name')
    .eq('slug', tenantIdentifier)
    .maybeSingle();

  if (error || !data?.id) {
    return {
      id: null,
      slug: tenantIdentifier,
    };
  }

  return data;
};

export const fetchTenantAiAssistantSettings = async (tenantRef = '') => {
  const tenantIdentifier = resolveTenantIdentifier(tenantRef);

  if (!hasSupabase()) {
    return getMockTenantAiAssistantSettings(tenantRef);
  }

  if (!tenantIdentifier) {
    return buildDefaultOff();
  }

  try {
    const tenant = await resolveTenant(tenantIdentifier);

    if (!tenant.id) {
      return buildDefaultOff(tenantIdentifier, tenant);
    }

    const { data, error } = await supabase
      .from('tenant_ai_assistant_settings')
      .select(SETTINGS_SELECT)
      .eq('tenant_id', tenant.id)
      .maybeSingle();

    if (error || !data) {
      return buildDefaultOff(tenantIdentifier, tenant);
    }

    return buildTenantAiAssistantSettingsReadModel(data, {
      source: 'Supabase',
      tenantId: tenant.id,
      tenantSlug: tenant.slug || data.tenant?.slug || null,
    });
  } catch {
    return buildDefaultOff(tenantIdentifier, null, 'Fallback seguro');
  }
};

export const tenantAiAssistantSettingsRepository = {
  fetchTenantAiAssistantSettings,
};
