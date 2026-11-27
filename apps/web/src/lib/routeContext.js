import { getTenants } from '@/repositories/index.js';

export const ROUTE_SCOPES = {
  PUBLIC: 'public',
  CLINIC: 'clinic',
  MASTER: 'master',
  TECHNICAL: 'technical'
};

export const MASTER_TENANT_ID = 'master_control';
export const DEFAULT_CLINIC_TENANT_ID = 'tenant_aurora';

export const PUBLIC_ROUTES = [
  '/',
  '/planos',
  '/recursos',
  '/para-dentistas',
  '/para-clinicas',
  '/demo',
  '/contato',
  '/simulador-plano',
  '/diagnostico-omnichannel',
  '/diagnostico-omnichannel/responder',
  '/status-publico',
  '/roadmap',
  '/changelog',
  '/trust-center',
  '/login',
  '/termos-de-uso',
  '/politica-de-privacidade',
  '/politica-de-cookies',
  '/preferencias-de-cookies'
];

export const CLINIC_ROUTES = [
  '/dashboard',
  '/central-operacional',
  '/acompanhamentos',
  '/omnichannel/gestao',
  '/omnichannel/contatos',
  '/diagnostico-omnichannel-interno',
  '/omnichannel',
  '/modo-recepcao',
  '/onboarding',
  '/minha-home',
  '/pacientes',
  '/agenda',
  '/servicos',
  '/financeiro',
  '/marketing',
  '/relatorios',
  '/documentos',
  '/estoque',
  '/laboratorios',
  '/prontuario',
  '/portal-paciente',
  '/integracoes',
  '/templates',
  '/usuarios',
  '/configuracoes',
  '/auditoria',
  '/user-profile',
  '/legal-privacidade',
  '/ajuda-suporte'
];

export const MASTER_ROUTES = [
  '/master-control'
];

export const TECHNICAL_ROUTES = [
  '/tenant-selection',
  '/demo-mode',
  '/demo-export',
  '/codex-supabase',
  '/fallback'
];

export const ROUTE_MODULE_IDS = {
  '/diagnostico-omnichannel': null,
  '/diagnostico-omnichannel/responder': null,
  '/minha-home': 'mod_landing',
  '/servicos': 'mod_landing',
  '/central-operacional': 'mod_crm',
  '/acompanhamentos': 'mod_omnichannel',
  '/omnichannel/gestao': 'mod_omnichannel',
  '/omnichannel/contatos': 'mod_omnichannel',
  '/diagnostico-omnichannel-interno': 'mod_omnichannel',
  '/omnichannel': 'mod_omnichannel',
  '/pacientes': 'mod_crm',
  '/agenda': 'mod_agenda',
  '/modo-recepcao': 'mod_agenda',
  '/usuarios': 'mod_usuarios',
  '/documentos': 'mod_documentos',
  '/auditoria': 'mod_auditoria',
  '/financeiro': 'mod_financeiro',
  '/estoque': 'mod_estoque',
  '/prontuario': 'mod_prontuario',
  '/portal-paciente': 'mod_prontuario',
};

const normalizePathname = (pathname = '/') => {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
};

const routeMatches = (routes, pathname) => {
  const normalized = normalizePathname(pathname);
  return routes.some(route => normalized === route || normalized.startsWith(`${route}/`));
};

export const isMasterTenantId = (tenantId) => tenantId === MASTER_TENANT_ID;

export const isKnownTenantId = (tenantId) => {
  return getTenants().some(tenant => tenant.tenant_id === tenantId);
};

export const isClinicTenantId = (tenantId) => {
  return isKnownTenantId(tenantId) && !isMasterTenantId(tenantId);
};

export const getSafeClinicTenantId = (tenantId) => {
  return isClinicTenantId(tenantId) ? tenantId : DEFAULT_CLINIC_TENANT_ID;
};

export const getRouteScope = (pathname) => {
  if (routeMatches(MASTER_ROUTES, pathname)) return ROUTE_SCOPES.MASTER;
  if (routeMatches(TECHNICAL_ROUTES, pathname)) return ROUTE_SCOPES.TECHNICAL;
  if (routeMatches(PUBLIC_ROUTES, pathname)) return ROUTE_SCOPES.PUBLIC;
  if (routeMatches(CLINIC_ROUTES, pathname)) return ROUTE_SCOPES.CLINIC;

  return ROUTE_SCOPES.PUBLIC;
};

export const getRouteModuleId = (pathname) => {
  if (routeMatches(PUBLIC_ROUTES, pathname)) {
    return null;
  }

  const normalized = normalizePathname(pathname);
  const routeEntry = Object.entries(ROUTE_MODULE_IDS).find(([route]) => (
    normalized === route || normalized.startsWith(`${route}/`)
  ));

  return routeEntry?.[1] || null;
};
