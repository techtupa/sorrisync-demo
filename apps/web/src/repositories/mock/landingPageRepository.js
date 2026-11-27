import {
  brand_settings as fallbackBrandSettings,
  landing_page_ctas,
  landing_page_form_fields,
  landing_page_leads,
  landing_page_sections,
  landing_page_services,
  landing_page_settings,
  landing_page_testimonials,
} from '@/data/mockLandingPageData';
import { getClinicSettingsByTenant, getTenantDisplayData } from './clinicSettingsRepository.js';
import { getPublicServicesForLanding } from './servicesRepository.js';
import { getClinicTenants } from './tenantRepository.js';
import { validatePublicLandingSlug } from '../landingPageContract.js';

const STATUS_LABELS = {
  active: 'Prévia',
  published: 'Prévia',
  draft: 'Rascunho',
  review: 'Em revisão',
  inactive: 'Inativa',
};

const DOMAIN_STATUS_LABELS = {
  active: 'Ativo',
  verified: 'Ativo',
  pending_dns: 'DNS pendente',
  pending: 'Pendente',
  inactive: 'Inativo',
};

const FALLBACK_ADDRESS_LABEL = 'Endereço não configurado';
const FALLBACK_CITY_LABEL = 'Cidade não configurada';
const FALLBACK_DOMAIN_STATUS_LABEL = 'Não configurado';
const FALLBACK_NEIGHBORHOOD_LABEL = 'Bairro não configurado';
const FALLBACK_DISPLAY_NAME = 'Clínica odontológica';
const FALLBACK_PLAN_LABEL = 'Plano não informado';
const FALLBACK_PREVIEW_STATUS = 'draft';
const ACTIVE_SERVICE_STATUSES = new Set(['Ativo', 'active']);
const PREVIEW_PUBLICATION_ENABLED = false;
const PUBLIC_INDEXABLE_STATUSES = new Set(['active', 'published']);
const PUBLIC_ROBOTS_INDEX = 'index,follow';
const PUBLIC_ROBOTS_NOINDEX = 'noindex,nofollow';
const STRUCTURED_DATA_SERVICE_LIMIT = 8;
const SEO_TITLE_MAX_LENGTH = 70;
const SEO_DESCRIPTION_MAX_LENGTH = 160;
const SEO_KEYWORDS_MAX_LENGTH = 220;
const SEO_LOCATION_MAX_LENGTH = 80;
const SECTION_NAME_MAX_LENGTH = 80;
const SECTION_DESCRIPTION_MAX_LENGTH = 220;
const LOCATION_ADDRESS_MAX_LENGTH = 180;
const LOCATION_STATE_MAX_LENGTH = 40;
const SERVICE_NAME_MAX_LENGTH = 80;
const SERVICE_DESCRIPTION_MAX_LENGTH = 220;
const FORM_FIELD_NAME_MAX_LENGTH = 80;
const CTA_TEXT_MAX_LENGTH = 80;
const BRAND_NAME_MAX_LENGTH = 90;
const BRAND_TITLE_MAX_LENGTH = 120;
const BRAND_SUBTITLE_MAX_LENGTH = 260;
const BRAND_HIGHLIGHT_MAX_LENGTH = 90;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const WHITESPACE_PATTERN = /\s+/g;

const UNCONFIGURED_VALUES = new Set([
  'Domínio não configurado',
  'Subdomínio não configurado',
  'Não configurado',
  'URL não configurada',
  'Endereço não configurado',
  'Cidade não configurada',
  'Bairro não configurado',
  'UF não configurada',
]);

const isConfiguredValue = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return Boolean(trimmed && !UNCONFIGURED_VALUES.has(trimmed));
};

const normalizePublicPreviewText = (value, maxLength) => {
  if (typeof value !== 'string') return '';

  const normalized = value
    .replace(CONTROL_CHAR_PATTERN, ' ')
    .replace(WHITESPACE_PATTERN, ' ')
    .trim();

  return Array.from(normalized).slice(0, maxLength).join('').trim();
};

const resolvePublicPreviewText = (maxLength, ...values) => {
  for (const value of values) {
    const normalized = normalizePublicPreviewText(value, maxLength);
    if (normalized) return normalized;
  }

  return '';
};

const normalizePublicPreviewList = (values, maxLength) => {
  if (!Array.isArray(values)) return [];

  return values
    .map((value) => normalizePublicPreviewText(value, maxLength))
    .filter(Boolean);
};

const NON_HTTP_PROTOCOL_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const IPV4_HOST_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const NON_PUBLIC_HOSTNAMES = new Set(['localhost']);
const PRIVATE_IPV4_HOST_PATTERNS = [
  /^0\./,
  /^10\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.0\.0\./,
  /^192\.0\.2\./,
  /^192\.168\./,
  /^198\.(18|19)\./,
  /^198\.51\.100\./,
  /^203\.0\.113\./,
  /^224\./,
  /^255\.255\.255\.255$/,
];

const normalizeHostname = (hostname) => hostname.toLowerCase().replace(/^\[|\]$/g, '');

const isNonPublicHostname = (hostname) => {
  const normalized = normalizeHostname(hostname);

  if (!normalized) return true;
  if (NON_PUBLIC_HOSTNAMES.has(normalized) || normalized.endsWith('.localhost') || normalized.endsWith('.local')) {
    return true;
  }

  if (IPV4_HOST_PATTERN.test(normalized)) {
    return PRIVATE_IPV4_HOST_PATTERNS.some((pattern) => pattern.test(normalized));
  }

  if (normalized.includes(':')) {
    return normalized === '::'
      || normalized === '::1'
      || normalized.startsWith('fc')
      || normalized.startsWith('fd')
      || normalized.startsWith('fe80:');
  }

  return !normalized.includes('.');
};

const normalizeUrlWithProtocol = (value) => {
  const trimmed = value.trim();

  if (NON_HTTP_PROTOCOL_PATTERN.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return '';
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const isPublicProtocol = ['http:', 'https:'].includes(url.protocol);
    if (!isPublicProtocol || isNonPublicHostname(url.hostname) || url.username || url.password) {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
};

const resolveConfiguredDomain = (...values) => {
  const configured = values.find(isConfiguredValue);
  return configured?.trim() || '';
};

const getSettingsTenantId = (clinicSettings) => {
  return clinicSettings?.tenant_settings?.tenant_id
    || clinicSettings?.clinic_profiles?.tenant_id
    || clinicSettings?.domain_settings?.tenant_id
    || clinicSettings?.seo_settings?.tenant_id;
};

const getTenantScopedSettings = (tenantId, clinicSettings) => {
  const settingsTenantId = getSettingsTenantId(clinicSettings);

  if (!tenantId) {
    return clinicSettings || {};
  }

  if (settingsTenantId === tenantId) {
    return clinicSettings || {};
  }

  return {};
};

const resolveCanonicalUrl = ({ display, domain, seoSettings }) => {
  if (isConfiguredValue(seoSettings?.canonical_url)) {
    return normalizeUrlWithProtocol(seoSettings.canonical_url);
  }

  const customDomain = resolveConfiguredDomain(domain?.custom_domain, display?.domain);
  if (customDomain) return normalizeUrlWithProtocol(customDomain);

  const subdomain = resolveConfiguredDomain(domain?.subdomain, display?.subdomain);
  if (subdomain) return normalizeUrlWithProtocol(subdomain);

  return '';
};

const buildPublicSeoPublicationState = ({ canonicalUrl, status }) => {
  const isIndexable = PREVIEW_PUBLICATION_ENABLED && Boolean(canonicalUrl) && PUBLIC_INDEXABLE_STATUSES.has(status);

  return {
    indexable: isIndexable,
    robots: isIndexable ? PUBLIC_ROBOTS_INDEX : PUBLIC_ROBOTS_NOINDEX,
  };
};

const toStructuredDataText = (value) => (isConfiguredValue(value) ? value.trim() : '');

const buildStructuredDataOffers = (services) => {
  return services
    .filter((service) => service.id !== 'generic_service_preview')
    .filter((service) => toStructuredDataText(service.name))
    .slice(0, STRUCTURED_DATA_SERVICE_LIMIT)
    .map((service) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'MedicalProcedure',
        name: toStructuredDataText(service.name),
        description: toStructuredDataText(service.description),
      },
    }));
};

const buildStructuredDataAddress = (location) => {
  const address = {
    '@type': 'PostalAddress',
  };
  const streetAddress = toStructuredDataText(location.address);
  const addressLocality = toStructuredDataText(location.city);
  const addressRegion = toStructuredDataText(location.state);

  if (streetAddress) address.streetAddress = streetAddress;
  if (addressLocality) address.addressLocality = addressLocality;
  if (addressRegion) address.addressRegion = addressRegion;

  return Object.keys(address).length > 1 ? address : null;
};

const buildStructuredDataAreaServed = (location) => {
  return [location.neighborhood, location.city]
    .map(toStructuredDataText)
    .filter(Boolean);
};

const buildPublicLandingStructuredData = ({
  canonicalUrl,
  description,
  location,
  publicName,
  services,
}) => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: publicName,
    description,
  };
  const address = buildStructuredDataAddress(location);
  const areaServed = buildStructuredDataAreaServed(location);
  const offers = buildStructuredDataOffers(services);

  if (canonicalUrl) structuredData.url = canonicalUrl;
  if (address) structuredData.address = address;
  if (areaServed.length) structuredData.areaServed = areaServed;
  if (offers.length) structuredData.makesOffer = offers;

  return structuredData;
};

const buildDefaultSeoTitle = (display) => {
  return display?.displayName ? `${display.displayName} | Odontologia` : 'Clínica odontológica';
};

const buildDefaultSeoDescription = (display) => {
  return display?.displayName
    ? `Preview interno da Minha Home de ${display.displayName} para revisar serviços odontológicos e canais de atendimento.`
    : 'Preview interno da Minha Home para revisar serviços odontológicos e canais de atendimento.';
};

const buildDefaultSeoKeywords = (display) => {
  return display?.displayName
    ? `${display.displayName}, odontologia, dentista`
    : 'odontologia, dentista';
};

const buildDefaultBrandTitle = () => 'Odontologia com cuidado e tecnologia';

const buildDefaultBrandSubtitle = (display) => {
  return display?.displayName
    ? `${display.displayName} apresenta seus serviços odontológicos e canais de atendimento no preview interno da Minha Home.`
    : 'Preview interno da Minha Home para revisar serviços odontológicos e canais de atendimento.';
};

const GENERIC_SECTION_DESCRIPTIONS = {
  sec_1: 'Primeira dobra com título, subtítulo e chamadas públicas configuráveis.',
  sec_2: 'Grade preparada para os serviços públicos configurados pela clínica.',
  sec_3: 'Apresentação institucional da clínica ou profissional responsável.',
  sec_4: 'Lista preparada para especialidades configuradas pela clínica.',
  sec_5: 'Espaço preparado para prova social aprovada pela clínica.',
  sec_6: 'Espaço preparado para redes sociais quando a integração estiver configurada.',
  sec_7: 'Bloco preparado para localização pública configurada pela clínica.',
  sec_8: 'Perguntas frequentes configuráveis para orientar pacientes.',
  sec_9: 'Chamada final para canais públicos configurados pela clínica.',
  sec_10: 'Rodapé com informações legais e links públicos da clínica.',
};

const buildGenericLandingSections = () => {
  return landing_page_sections.map((section) => ({
    ...section,
    description: GENERIC_SECTION_DESCRIPTIONS[section.id] || section.description,
  }));
};

const mapLandingSection = (section) => ({
  ...section,
  name: resolvePublicPreviewText(SECTION_NAME_MAX_LENGTH, section.name, 'Seção'),
  description: resolvePublicPreviewText(
    SECTION_DESCRIPTION_MAX_LENGTH,
    section.description,
    'Seção preparada para o preview público.'
  ),
});

const buildGenericLandingServices = () => [
  {
    id: 'generic_service_preview',
    name: 'Serviços odontológicos',
    description: 'Página preparada para apresentar os serviços públicos configurados pela clínica.',
    cta: 'Conhecer serviços',
    icon: 'sparkles',
    active: true,
  },
];

const buildGenericLandingFormFields = () => [
  { id: 'generic_field_name', name: 'Nome completo', type: 'text', required: true, active: true },
  { id: 'generic_field_contact', name: 'Contato', type: 'tel', required: true, active: true },
  { id: 'generic_field_interest', name: 'Serviço de interesse', type: 'select', required: true, active: true },
  { id: 'generic_field_message', name: 'Mensagem', type: 'textarea', required: false, active: true },
];

const buildGenericTenantDisplay = (tenantId) => ({
  tenantId,
  name: FALLBACK_DISPLAY_NAME,
  displayName: FALLBACK_DISPLAY_NAME,
  domain: '',
  subdomain: '',
  portalUrl: '',
  plan: FALLBACK_PLAN_LABEL,
  planLabel: FALLBACK_PLAN_LABEL,
  tenantLabel: tenantId,
});

const getLandingTenantDisplayData = (tenantId) => {
  if (!tenantId) return getTenantDisplayData(tenantId);

  const tenant = getClinicTenants().find((item) => item.tenant_id === tenantId);
  return tenant ? getTenantDisplayData(tenantId, tenant) : buildGenericTenantDisplay(tenantId);
};

const mapServiceForLanding = (service) => ({
  id: service.id,
  name: resolvePublicPreviewText(SERVICE_NAME_MAX_LENGTH, service.name, 'Serviço odontológico'),
  description: resolvePublicPreviewText(
    SERVICE_DESCRIPTION_MAX_LENGTH,
    service.description,
    service.landingDesc,
    service.landing_description,
    service.shortDesc,
    service.short_description,
    'Tratamento disponível na clínica.'
  ),
  cta: resolvePublicPreviewText(CTA_TEXT_MAX_LENGTH, service.cta, 'Saber mais'),
  icon: service.icon || 'sparkles',
  active: service.active ?? ACTIVE_SERVICE_STATUSES.has(service.status),
});

const isServiceVisibleOnLandingForTenant = (tenantId, service) => {
  const serviceTenantId = service.tenant_id || service.tenantId;
  const showOnHome = Boolean(service.showOnHome || service.show_on_home);
  const isVisible = showOnHome && ACTIVE_SERVICE_STATUSES.has(service.status);

  if (!isVisible) return false;
  if (!tenantId) return true;

  return serviceTenantId === tenantId;
};

const canUseLandingFixtureFallback = (tenantId) => {
  return !tenantId || tenantId === landing_page_settings.tenant_id;
};

const resolveLandingServices = ({ tenantId, publicServices }) => {
  if (publicServices.length) return publicServices.map(mapServiceForLanding);
  if (canUseLandingFixtureFallback(tenantId)) return landing_page_services.map(mapServiceForLanding);
  return buildGenericLandingServices().map(mapServiceForLanding);
};

const resolveLandingSections = (tenantId) => {
  const sections = canUseLandingFixtureFallback(tenantId) ? landing_page_sections : buildGenericLandingSections();
  return sections.map(mapLandingSection);
};

const mapLandingFormField = (field) => ({
  ...field,
  name: resolvePublicPreviewText(FORM_FIELD_NAME_MAX_LENGTH, field.name, 'Campo'),
});

const resolveLandingFormFields = (tenantId) => {
  const fields = canUseLandingFixtureFallback(tenantId) ? landing_page_form_fields : buildGenericLandingFormFields();
  return fields.map(mapLandingFormField);
};

const resolveLandingLeads = (tenantId) => {
  if (canUseLandingFixtureFallback(tenantId)) return landing_page_leads;
  return [];
};

const resolveLandingTestimonials = (tenantId) => {
  if (canUseLandingFixtureFallback(tenantId)) return landing_page_testimonials;
  return [];
};

const buildGenericLandingCtas = () => ({
  primary: {
    ...landing_page_ctas.primary,
    text: 'Solicitar contato',
    destination: '',
  },
  secondary: {
    ...landing_page_ctas.secondary,
    text: 'Ver especialidades',
    destination: '',
  },
});

const mapLandingCta = (cta, fallbackText) => ({
  ...cta,
  text: resolvePublicPreviewText(CTA_TEXT_MAX_LENGTH, cta?.text, fallbackText),
  destination: cta?.destination || '',
});

const normalizeLandingCtas = (ctas) => ({
  primary: mapLandingCta(ctas.primary, 'Solicitar contato'),
  secondary: mapLandingCta(ctas.secondary, 'Ver especialidades'),
});

const resolveLandingCtas = (tenantId) => {
  const ctas = canUseLandingFixtureFallback(tenantId) ? landing_page_ctas : buildGenericLandingCtas();
  return normalizeLandingCtas(ctas);
};

const resolveLandingStatus = (tenantId, scopedSettings) => {
  if (scopedSettings?.tenant_settings?.status) return scopedSettings.tenant_settings.status;
  return canUseLandingFixtureFallback(tenantId) ? landing_page_settings.status : FALLBACK_PREVIEW_STATUS;
};

const buildGenericLandingSettings = (tenantId) => ({
  id: `landing_preview_${tenantId || 'sem_tenant'}`,
  tenant_id: tenantId || '',
  custom_domain: '',
  subdomain: '',
  status: FALLBACK_PREVIEW_STATUS,
  created_at: '',
  updated_at: '',
});

const buildLandingSettings = ({ tenantId, customDomain, subdomain, status }) => ({
  ...(canUseLandingFixtureFallback(tenantId) ? landing_page_settings : buildGenericLandingSettings(tenantId)),
  tenant_id: tenantId || landing_page_settings.tenant_id,
  custom_domain: customDomain,
  subdomain,
  status,
});

const resolveLandingDomainStatusLabel = ({ domain, customDomain, subdomain }) => {
  if (domain?.domain_status) return DOMAIN_STATUS_LABELS[domain.domain_status] || domain.domain_status;
  if (customDomain || subdomain) return DOMAIN_STATUS_LABELS.pending;
  return FALLBACK_DOMAIN_STATUS_LABEL;
};

const resolveLandingAddress = (tenantId, profile) => {
  const address = normalizePublicPreviewText(profile.address, LOCATION_ADDRESS_MAX_LENGTH);
  if (address) return address;

  return canUseLandingFixtureFallback(tenantId) ? '' : FALLBACK_ADDRESS_LABEL;
};

export const buildLandingPagePreview = ({ tenantId, clinicSettings, services }) => {
  const display = getLandingTenantDisplayData(tenantId);
  const scopedSettings = getTenantScopedSettings(tenantId, clinicSettings);
  const profile = scopedSettings?.clinic_profiles || {};
  const domain = scopedSettings?.domain_settings || {};
  const seo = scopedSettings?.seo_settings || {};
  const customDomain = resolveConfiguredDomain(domain.custom_domain, display.domain);
  const subdomain = resolveConfiguredDomain(domain.subdomain, display.subdomain);
  const status = resolveLandingStatus(tenantId, scopedSettings);
  const publicServices = (services || [])
    .filter((service) => isServiceVisibleOnLandingForTenant(tenantId, service))
    .map(mapServiceForLanding);
  const seoTitle = resolvePublicPreviewText(SEO_TITLE_MAX_LENGTH, seo.seo_title, buildDefaultSeoTitle(display));
  const seoDescription = resolvePublicPreviewText(
    SEO_DESCRIPTION_MAX_LENGTH,
    seo.seo_description,
    profile.short_description,
    buildDefaultSeoDescription(display)
  );
  const seoKeywords = resolvePublicPreviewText(SEO_KEYWORDS_MAX_LENGTH, seo.local_keywords, buildDefaultSeoKeywords(display));
  const seoCity = resolvePublicPreviewText(SEO_LOCATION_MAX_LENGTH, seo.service_city, profile.city, FALLBACK_CITY_LABEL);
  const seoNeighborhood = resolvePublicPreviewText(
    SEO_LOCATION_MAX_LENGTH,
    seo.service_neighborhood,
    profile.neighborhood,
    FALLBACK_NEIGHBORHOOD_LABEL
  );
  const fallbackBrandTitle = canUseLandingFixtureFallback(tenantId) ? fallbackBrandSettings.title : buildDefaultBrandTitle(display);
  const fallbackBrandSubtitle = canUseLandingFixtureFallback(tenantId) ? fallbackBrandSettings.subtitle : buildDefaultBrandSubtitle(display);
  const profileTrustHighlights = normalizePublicPreviewList(profile.differentials, BRAND_HIGHLIGHT_MAX_LENGTH);
  const fallbackTrustHighlights = canUseLandingFixtureFallback(tenantId)
    ? normalizePublicPreviewList(fallbackBrandSettings.trust_highlights, BRAND_HIGHLIGHT_MAX_LENGTH)
    : [];
  const brandTrustHighlights = profileTrustHighlights.length ? profileTrustHighlights : fallbackTrustHighlights;
  const brandProfessionalName = resolvePublicPreviewText(
    BRAND_NAME_MAX_LENGTH,
    profile.public_name,
    display.displayName,
    fallbackBrandSettings.professional_name
  );
  const brandTitle = resolvePublicPreviewText(BRAND_TITLE_MAX_LENGTH, profile.main_phrase, fallbackBrandTitle);
  const brandSubtitle = resolvePublicPreviewText(
    BRAND_SUBTITLE_MAX_LENGTH,
    profile.full_description,
    profile.short_description,
    fallbackBrandSubtitle
  );
  const locationState = resolvePublicPreviewText(LOCATION_STATE_MAX_LENGTH, profile.state);
  const canonicalUrl = resolveCanonicalUrl({ display, domain, seoSettings: seo });
  const seoPublicationState = buildPublicSeoPublicationState({ canonicalUrl, status });
  const landingServices = resolveLandingServices({ tenantId, publicServices });
  const publicLocation = {
    address: resolveLandingAddress(tenantId, profile),
    city: seoCity,
    neighborhood: seoNeighborhood,
    state: locationState,
  };

  return {
    settings: buildLandingSettings({ tenantId, customDomain, subdomain, status }),
    sections: resolveLandingSections(tenantId),
    services: landingServices,
    testimonials: resolveLandingTestimonials(tenantId),
    ctas: resolveLandingCtas(tenantId),
    formFields: resolveLandingFormFields(tenantId),
    leads: resolveLandingLeads(tenantId),
    seo: {
      title: seoTitle,
      description: seoDescription,
      keywords: seoKeywords,
      city: seoCity,
      neighborhood: seoNeighborhood,
      canonical_url: canonicalUrl,
      robots: seoPublicationState.robots,
      indexable: seoPublicationState.indexable,
      open_graph: {
        title: seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        type: 'website',
      },
      structured_data: buildPublicLandingStructuredData({
        canonicalUrl,
        description: seoDescription,
        location: publicLocation,
        publicName: brandProfessionalName,
        services: landingServices,
      }),
    },
    brand: {
      professional_name: brandProfessionalName,
      title: brandTitle,
      subtitle: brandSubtitle,
      trust_highlights: brandTrustHighlights,
    },
    location: publicLocation,
    statusLabel: STATUS_LABELS[status] || STATUS_LABELS[FALLBACK_PREVIEW_STATUS],
    domainStatusLabel: resolveLandingDomainStatusLabel({ domain, customDomain, subdomain }),
  };
};

export const getLandingPagePreviewByTenant = (tenantId) => {
  const clinicSettings = getClinicSettingsByTenant(tenantId);
  const services = getPublicServicesForLanding(tenantId);

  return buildLandingPagePreview({
    tenantId,
    clinicSettings,
    services,
  });
};

const mockLandingPublicationByTenant = new Map();

const cloneMockLandingPublication = (publication) => publication ? { ...publication } : null;

const withMockIndexingState = (publication) => publication ? {
  indexing_status: 'disabled',
  indexing_enabled_at: null,
  indexing_disabled_at: null,
  readiness_satisfied: false,
  readiness_missing: ['published', 'public_name', 'public_description', 'public_service'],
  ...publication,
} : null;

const createMockLandingPublicationError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

export const getMockTenantLandingPublication = async ({ tenantId }) => {
  if (!tenantId) return null;
  return cloneMockLandingPublication(withMockIndexingState(mockLandingPublicationByTenant.get(tenantId)));
};

export const publishMockTenantLandingPage = async ({ tenantId, slug }) => {
  if (!tenantId) throw createMockLandingPublicationError('SS_HOME_PERMISSION_DENIED');

  const validation = validatePublicLandingSlug(slug);
  if (!validation.valid) throw createMockLandingPublicationError('SS_HOME_SLUG_INVALID_OR_RESERVED');

  const conflictingPublication = [...mockLandingPublicationByTenant.entries()]
    .find(([otherTenantId, publication]) => otherTenantId !== tenantId && publication.slug === validation.slug);
  if (conflictingPublication) throw createMockLandingPublicationError('SS_HOME_SLUG_CONFLICT');

  const previous = mockLandingPublicationByTenant.get(tenantId);
  if (previous?.status === 'published' && previous.slug !== validation.slug) {
    throw createMockLandingPublicationError('SS_HOME_UNPUBLISH_BEFORE_SLUG_CHANGE');
  }

  const now = new Date().toISOString();
  const changed = previous?.status !== 'published' || previous?.slug !== validation.slug;
  const nextPublication = changed
    ? {
      slug: validation.slug,
      status: 'published',
      published_at: now,
      unpublished_at: null,
      updated_at: now,
      indexing_status: 'disabled',
      indexing_enabled_at: null,
      indexing_disabled_at: null,
      readiness_satisfied: false,
      readiness_missing: ['public_name', 'public_description', 'public_service'],
      changed: true,
    }
    : { ...previous, changed: false };

  mockLandingPublicationByTenant.set(tenantId, nextPublication);
  return cloneMockLandingPublication(nextPublication);
};

export const unpublishMockTenantLandingPage = async ({ tenantId }) => {
  const previous = mockLandingPublicationByTenant.get(tenantId);
  if (!previous) throw createMockLandingPublicationError('SS_HOME_PUBLICATION_NOT_FOUND');

  const changed = previous.status === 'published';
  const now = new Date().toISOString();
  const nextPublication = changed
    ? {
      ...previous,
      status: 'unpublished',
      unpublished_at: now,
      updated_at: now,
      indexing_status: 'disabled',
      indexing_disabled_at: previous.indexing_status === 'enabled' ? now : previous.indexing_disabled_at || null,
      readiness_satisfied: false,
      readiness_missing: ['published'],
      changed: true,
    }
    : { ...previous, changed: false };

  mockLandingPublicationByTenant.set(tenantId, nextPublication);
  return cloneMockLandingPublication(nextPublication);
};

export const enableMockTenantLandingIndexing = async ({ tenantId }) => {
  const previous = withMockIndexingState(mockLandingPublicationByTenant.get(tenantId));
  if (!previous) throw createMockLandingPublicationError('SS_HOME_PUBLICATION_NOT_FOUND');
  if (previous.status !== 'published' || !previous.readiness_satisfied) {
    throw createMockLandingPublicationError('SS_HOME_INDEXING_NOT_READY');
  }

  const changed = previous.indexing_status !== 'enabled';
  const now = new Date().toISOString();
  const nextPublication = changed
    ? {
      ...previous,
      indexing_status: 'enabled',
      indexing_enabled_at: now,
      indexing_disabled_at: null,
      updated_at: now,
      changed: true,
    }
    : { ...previous, changed: false };

  mockLandingPublicationByTenant.set(tenantId, nextPublication);
  return cloneMockLandingPublication(nextPublication);
};

export const disableMockTenantLandingIndexing = async ({ tenantId }) => {
  const previous = withMockIndexingState(mockLandingPublicationByTenant.get(tenantId));
  if (!previous) throw createMockLandingPublicationError('SS_HOME_PUBLICATION_NOT_FOUND');

  const changed = previous.indexing_status === 'enabled';
  const now = new Date().toISOString();
  const nextPublication = changed
    ? {
      ...previous,
      indexing_status: 'disabled',
      indexing_disabled_at: now,
      updated_at: now,
      changed: true,
    }
    : { ...previous, changed: false };

  mockLandingPublicationByTenant.set(tenantId, nextPublication);
  return cloneMockLandingPublication(nextPublication);
};

export const resetMockTenantLandingPublications = () => {
  mockLandingPublicationByTenant.clear();
};
