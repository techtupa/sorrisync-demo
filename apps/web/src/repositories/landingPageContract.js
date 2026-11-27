export const PUBLIC_LANDING_BASE_URL = 'https://sorrisync.example.invalid/clinica';
export const PUBLIC_CLINICS_DIRECTORY_PATH = '/clinicas';
export const PUBLIC_LANDING_LEAD_CONSENT_VERSION = 'public_landing_lead_v1';

export const PUBLIC_LANDING_INDEXING_STATUS_LABELS = Object.freeze({
  disabled: 'Não indexável',
  enabled: 'Indexável',
});

export const PUBLIC_LANDING_STATUS_LABELS = Object.freeze({
  draft: 'Rascunho',
  published: 'Publicada',
  unpublished: 'Fora do ar',
});

export const RESERVED_PUBLIC_LANDING_SLUGS = Object.freeze([
  'aceitar-convite',
  'acompanhamentos',
  'admin',
  'agenda',
  'ajuda-suporte',
  'api',
  'app',
  'auditoria',
  'central-operacional',
  'changelog',
  'clinica',
  'codex-supabase',
  'configuracoes',
  'contato',
  'dashboard',
  'demo',
  'demo-export',
  'demo-mode',
  'diagnostico',
  'diagnostico-omnichannel',
  'documentos',
  'estoque',
  'exclusao-de-dados',
  'fallback',
  'financeiro',
  'integracoes',
  'laboratorios',
  'legal-privacidade',
  'login',
  'logout',
  'marketing',
  'master',
  'master-control',
  'minha-home',
  'modo-recepcao',
  'omnichannel',
  'onboarding',
  'pacientes',
  'para-clinicas',
  'para-dentistas',
  'planos',
  'politica',
  'politica-de-cookies',
  'politica-de-privacidade',
  'portal-paciente',
  'preferencias-de-cookies',
  'recursos',
  'relatorios',
  'roadmap',
  'servicos',
  'simulador-plano',
  'sorrisync',
  'status',
  'status-publico',
  'suporte',
  'templates',
  'tenant-selection',
  'termos',
  'termos-de-uso',
  'trust-center',
  'user-profile',
  'usuarios',
]);

const RESERVED_SLUG_SET = new Set(RESERVED_PUBLIC_LANDING_SLUGS);
const PUBLIC_LANDING_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export const normalizePublicLandingSlug = (value) => String(value || '').trim().toLowerCase();

export const validatePublicLandingSlug = (value) => {
  const original = String(value || '').trim();
  const slug = normalizePublicLandingSlug(original);

  if (original !== slug || !PUBLIC_LANDING_SLUG_PATTERN.test(slug)) {
    return { valid: false, code: 'invalid_slug', slug };
  }

  if (RESERVED_SLUG_SET.has(slug)) {
    return { valid: false, code: 'reserved_slug', slug };
  }

  return { valid: true, code: null, slug };
};

export const suggestPublicLandingSlug = (value) => {
  const candidate = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63)
    .replace(/-+$/g, '');

  return validatePublicLandingSlug(candidate).valid ? candidate : '';
};

export const buildPublicLandingUrl = (slug) => {
  const result = validatePublicLandingSlug(slug);
  return result.valid ? `${PUBLIC_LANDING_BASE_URL}/${result.slug}` : '';
};
