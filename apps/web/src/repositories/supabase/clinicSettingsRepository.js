import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getClinicSettingsByTenant as getMockClinicSettings,
  getTenantBrandSettings as getMockTenantBrandSettings,
  getTenantDisplayData as getMockTenantDisplayData,
  getTenantDomainSettings as getMockTenantDomainSettings,
  getTenantSeoSettings as getMockTenantSeoSettings,
} from '../mock/clinicSettingsRepository.js';

const FALLBACK_DOMAIN = 'Domínio não configurado';
const FALLBACK_SUBDOMAIN = 'Subdomínio não configurado';
const FALLBACK_PORTAL_URL = 'Portal não configurado';

const PLAN_LABELS = {
  essential: 'Essencial',
  professional: 'Profissional',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const STATUS_LABELS = {
  active: 'Ativa',
  trial: 'Trial',
  suspended: 'Suspensa',
  canceled: 'Cancelada',
  inactive: 'Inativa',
};

const CLINIC_SETTINGS_SELECT = `
  id,
  tenant_id,
  status,
  public_name,
  legal_name,
  operation_type,
  email,
  phone,
  whatsapp,
  instagram,
  address,
  city,
  state,
  neighborhood,
  zip_code,
  main_responsible,
  short_description,
  full_description,
  main_phrase,
  communication_tone,
  domain_status,
  brand_settings,
  seo_settings,
  business_hours,
  scheduling_rules,
  metadata,
  created_at,
  updated_at,
  tenants (
    id,
    slug,
    name,
    status,
    plan,
    subdomain,
    custom_domain,
    metadata
  )
`;

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const getRelationValue = (value) => {
  return Array.isArray(value) ? value[0] : value;
};

const formatPlan = (plan) => PLAN_LABELS[plan] || plan || 'Plano não informado';
const formatStatus = (status) => STATUS_LABELS[status] || status || 'Ativo visual';

const isConfiguredValue = (value, fallback) => Boolean(value && value !== fallback && value !== 'Não configurado');

const buildPortalUrl = (domain, subdomain) => {
  if (isConfiguredValue(domain, FALLBACK_DOMAIN)) {
    return `https://${domain}/portal`;
  }

  if (isConfiguredValue(subdomain, FALLBACK_SUBDOMAIN)) {
    return `https://${subdomain}/portal`;
  }

  return FALLBACK_PORTAL_URL;
};

const fetchClinicSettingsRow = async (tenantId) => {
  if (!hasSupabase() || !tenantId) return null;

  const { data, error } = await supabase
    .from('clinic_settings')
    .select(CLINIC_SETTINGS_SELECT)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) return null;
  return data;
};

const mapClinicSettingsRow = (row) => {
  if (!row) return null;

  const tenant = getRelationValue(row.tenants);
  const tenantId = row.tenant_id;
  const brandSettings = row.brand_settings || {};
  const seoSettings = row.seo_settings || {};
  const schedulingRules = row.scheduling_rules || {};
  const metadata = row.metadata || {};

  return {
    tenant_settings: {
      id: row.id,
      tenant_id: tenantId,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    clinic_profiles: {
      id: row.id,
      tenant_id: tenantId,
      public_name: row.public_name || tenant?.name || '',
      legal_name: row.legal_name || '',
      operation_type: row.operation_type || '',
      email: row.email || '',
      phone: row.phone || '',
      whatsapp: row.whatsapp || '',
      instagram: row.instagram || '',
      address: row.address || '',
      city: row.city || '',
      state: row.state || '',
      neighborhood: row.neighborhood || '',
      zip_code: row.zip_code || '',
      main_responsible: row.main_responsible || '',
      short_description: row.short_description || '',
      full_description: row.full_description || '',
      main_phrase: row.main_phrase || '',
      communication_tone: row.communication_tone || '',
      differentials: metadata.differentials || [],
      specialties: metadata.specialties || [],
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    brand_settings: {
      id: row.id,
      tenant_id: tenantId,
      ...brandSettings,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    domain_settings: {
      id: row.id,
      tenant_id: tenantId,
      custom_domain: tenant?.custom_domain || '',
      subdomain: tenant?.subdomain || '',
      domain_status: row.domain_status,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    dns_records: [],
    seo_settings: {
      id: row.id,
      tenant_id: tenantId,
      ...seoSettings,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    business_hours: Array.isArray(row.business_hours) ? row.business_hours : [],
    scheduling_rules: {
      id: row.id,
      tenant_id: tenantId,
      ...schedulingRules,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    operation_settings: {
      id: row.id,
      tenant_id: tenantId,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
    security_settings: {
      id: row.id,
      tenant_id: tenantId,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
};

const buildTenantOverrideFromRow = (row, tenantOverride) => {
  const tenant = getRelationValue(row?.tenants);
  if (!tenant && !tenantOverride) return tenantOverride;

  return {
    ...tenantOverride,
    id: tenantOverride?.id || tenant?.id,
    tenant_id: tenantOverride?.tenant_id || tenant?.id,
    slug: tenantOverride?.slug || tenant?.slug,
    name: row?.public_name || tenantOverride?.name || tenant?.name,
    plan: tenantOverride?.plan || formatPlan(tenant?.plan),
    plan_code: tenantOverride?.plan_code || tenant?.plan,
    status: tenantOverride?.status || formatStatus(tenant?.status),
    status_code: tenantOverride?.status_code || tenant?.status,
    domain: tenantOverride?.domain || tenant?.custom_domain || '',
    customDomain: tenantOverride?.customDomain || tenant?.custom_domain || '',
    subdomain: tenantOverride?.subdomain || tenant?.subdomain || '',
    metadata: tenantOverride?.metadata || tenant?.metadata || {},
  };
};

export const fetchClinicSettingsByTenant = async (tenantId) => {
  const row = await fetchClinicSettingsRow(tenantId);
  return mapClinicSettingsRow(row) || getMockClinicSettings(tenantId);
};

export const fetchTenantDisplayData = async (tenantId, tenantOverride) => {
  const row = await fetchClinicSettingsRow(tenantId);
  const tenant = buildTenantOverrideFromRow(row, tenantOverride);
  const display = getMockTenantDisplayData(tenantId, tenant);

  if (!row) return display;

  const domain = tenant?.domain || tenant?.customDomain || FALLBACK_DOMAIN;
  const subdomain = tenant?.subdomain || FALLBACK_SUBDOMAIN;

  return {
    ...display,
    name: row.public_name || display.name,
    displayName: row.public_name || display.displayName,
    plan: tenant?.plan || display.plan,
    planLabel: tenant?.plan || display.planLabel,
    status: tenant?.status || display.status,
    domain,
    subdomain,
    portalUrl: buildPortalUrl(domain, subdomain),
  };
};

export const fetchTenantDomainSettings = async (tenantId) => {
  const row = await fetchClinicSettingsRow(tenantId);
  if (!row) return getMockTenantDomainSettings(tenantId);

  const tenant = getRelationValue(row.tenants);
  const domain = tenant?.custom_domain || FALLBACK_DOMAIN;
  const subdomain = tenant?.subdomain || FALLBACK_SUBDOMAIN;

  return {
    tenantId,
    domain,
    customDomain: domain,
    subdomain,
    portalUrl: buildPortalUrl(domain, subdomain),
    status: row.domain_status || row.status,
  };
};

export const fetchTenantSeoSettings = async (tenantId) => {
  const row = await fetchClinicSettingsRow(tenantId);
  if (!row) return getMockTenantSeoSettings(tenantId);

  const settings = mapClinicSettingsRow(row);
  const tenant = buildTenantOverrideFromRow(row);
  const display = getMockTenantDisplayData(tenantId, tenant);
  const canonicalUrl = isConfiguredValue(display.domain, FALLBACK_DOMAIN)
    ? `https://${display.domain}`
    : isConfiguredValue(display.subdomain, FALLBACK_SUBDOMAIN)
      ? `https://${display.subdomain}`
      : 'URL não configurada';

  return {
    ...settings.seo_settings,
    tenant_id: tenantId,
    seo_title: settings.seo_settings?.seo_title || `${display.displayName} | Odontologia`,
    canonical_url: settings.seo_settings?.canonical_url || canonicalUrl,
  };
};

export const fetchTenantBrandSettings = async (tenantId) => {
  const row = await fetchClinicSettingsRow(tenantId);
  return mapClinicSettingsRow(row)?.brand_settings || getMockTenantBrandSettings(tenantId);
};
