import { getClinicSettings } from '../../data/mockClinicSettings.js';
import { getClinicTenants } from './tenantRepository.js';

const FALLBACK_TENANT_ID = 'tenant_aurora';
const FALLBACK_NAME = 'Clínica';
const FALLBACK_PLAN = 'Plano não informado';
const FALLBACK_STATUS = 'Ativo visual';
const FALLBACK_DOMAIN = 'Domínio não configurado';
const FALLBACK_SUBDOMAIN = 'Subdomínio não configurado';
const FALLBACK_PORTAL_URL = 'Portal não configurado';
const FALLBACK_TENANT_LABEL = 'Tenant clínico';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const PHONE_PATTERN = /^(?:\+55\s*)?\(?\d{2}\)?\s*9\d{4}[-\s]?\d{4}$/;

const isConfiguredValue = (value, fallback) => Boolean(value && value !== fallback && value !== 'Não configurado');

const normalizeDisplayValue = (value) => (
  typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
);

const isSensitiveDisplayValue = (value) => {
  const text = normalizeDisplayValue(value);
  return !text || UUID_PATTERN.test(text) || EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text);
};

const safeDisplayValue = (value, fallback, maxLength = 96) => {
  const text = normalizeDisplayValue(value);
  const safeText = isSensitiveDisplayValue(text) ? fallback : text;
  return safeText.length > maxLength ? `${safeText.slice(0, maxLength - 3).trim()}...` : safeText;
};

const resolveTenantLabel = (tenant, resolvedTenantId) => {
  const candidates = [
    tenant?.slug,
    tenant?.tenant_slug,
    tenant?.subdomain,
    resolvedTenantId,
  ];
  const safeCandidate = candidates.find((candidate) => !isSensitiveDisplayValue(candidate));
  return safeDisplayValue(safeCandidate, FALLBACK_TENANT_LABEL, 48);
};

const resolveTenantRecord = (tenantId) => {
  return getClinicTenants().find((tenant) => tenant.tenant_id === tenantId) || null;
};

const buildGenericClinicSettings = (tenantId) => {
  const tenant = resolveTenantRecord(tenantId);
  const resolvedTenantId = tenantId || '';
  const displayName = tenant?.name || 'Clínica odontológica';
  const customDomain = tenant?.domain || tenant?.customDomain || '';
  const subdomain = tenant?.subdomain || '';

  return {
    tenant_settings: {
      id: `mock_settings_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    clinic_profiles: {
      id: `mock_profile_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      public_name: displayName,
      legal_name: '',
      operation_type: '',
      email: '',
      phone: '',
      whatsapp: '',
      instagram: '',
      address: '',
      city: '',
      state: '',
      neighborhood: '',
      zip_code: '',
      main_responsible: '',
      short_description: '',
      full_description: '',
      main_phrase: '',
      communication_tone: '',
      differentials: [],
      specialties: [],
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    brand_settings: {
      id: `mock_brand_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      primary_color: '#0f766e',
      secondary_color: '#d6b980',
      accent_color: '#10b981',
      visual_font: 'DM Sans',
      landing_page_style: 'Moderno',
      card_radius: 16,
      button_style: 'Arredondado',
      theme_mode: 'light',
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    domain_settings: {
      id: `mock_domain_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      custom_domain: customDomain,
      subdomain,
      domain_status: '',
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    dns_records: [],
    seo_settings: {
      id: `mock_seo_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      seo_title: '',
      seo_description: '',
      local_keywords: '',
      service_city: '',
      service_neighborhood: '',
      canonical_url: '',
      indexing_status: 'noindex',
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    business_hours: [],
    scheduling_rules: {
      id: `mock_schedule_rules_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    operation_settings: {
      id: `mock_operation_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
    security_settings: {
      id: `mock_security_${resolvedTenantId || 'sem_tenant'}`,
      tenant_id: resolvedTenantId,
      status: 'draft',
      created_at: '',
      updated_at: '',
    },
  };
};

const buildPortalUrl = (domain, subdomain) => {
  if (isConfiguredValue(domain, FALLBACK_DOMAIN)) {
    return `https://${domain}/portal`;
  }

  if (isConfiguredValue(subdomain, FALLBACK_SUBDOMAIN)) {
    return `https://${subdomain}/portal`;
  }

  return FALLBACK_PORTAL_URL;
};

export const getClinicSettingsByTenant = (tenantId) => {
  const resolvedTenantId = tenantId || FALLBACK_TENANT_ID;

  if (resolvedTenantId === FALLBACK_TENANT_ID) {
    return getClinicSettings(resolvedTenantId);
  }

  return buildGenericClinicSettings(resolvedTenantId);
};

// Mock repository today. Components should not care whether these values later come from Supabase.
export const getTenantDisplayData = (tenantId, tenantOverride) => {
  const tenant = tenantOverride || (tenantId ? resolveTenantRecord(tenantId) : null);
  const settings = tenantId ? getClinicSettingsByTenant(tenantId) : null;
  const domainSettings = settings?.domain_settings;

  const resolvedTenantId = tenantId || tenant?.tenant_id || FALLBACK_TENANT_ID;
  const name = safeDisplayValue(tenant?.name || settings?.clinic_profiles?.public_name, FALLBACK_NAME);
  const plan = tenant?.plan || FALLBACK_PLAN;
  const status = tenant?.status || FALLBACK_STATUS;
  const domain = tenant?.domain || tenant?.customDomain || domainSettings?.custom_domain || FALLBACK_DOMAIN;
  const subdomain = tenant?.subdomain || domainSettings?.subdomain || FALLBACK_SUBDOMAIN;
  const portalUrl = buildPortalUrl(domain, subdomain);
  const tenantLabel = resolveTenantLabel(tenant, resolvedTenantId);

  return {
    tenantId: resolvedTenantId,
    name,
    plan,
    status,
    domain,
    subdomain,
    portalUrl,
    displayName: name,
    planLabel: plan,
    tenantLabel,
  };
};

export const getTenantDomainSettings = (tenantId) => {
  const display = getTenantDisplayData(tenantId);

  return {
    tenantId: display.tenantId,
    domain: display.domain,
    customDomain: display.domain,
    subdomain: display.subdomain,
    portalUrl: display.portalUrl,
    status: display.status,
  };
};

export const getTenantSeoSettings = (tenantId) => {
  const settings = getClinicSettingsByTenant(tenantId);
  const display = getTenantDisplayData(tenantId);
  const canonicalUrl = isConfiguredValue(display.domain, FALLBACK_DOMAIN)
    ? `https://${display.domain}`
    : isConfiguredValue(display.subdomain, FALLBACK_SUBDOMAIN)
      ? `https://${display.subdomain}`
      : 'URL não configurada';

  return {
    ...settings.seo_settings,
    tenant_id: display.tenantId,
    seo_title: `${display.displayName} | Odontologia`,
    canonical_url: canonicalUrl,
  };
};

export const getTenantBrandSettings = (tenantId) => {
  return getClinicSettingsByTenant(tenantId).brand_settings;
};
