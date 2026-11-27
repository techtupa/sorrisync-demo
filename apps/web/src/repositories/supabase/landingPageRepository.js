import {
  buildLandingPagePreview,
  disableMockTenantLandingIndexing,
  enableMockTenantLandingIndexing,
  getLandingPagePreviewByTenant as getMockLandingPagePreviewByTenant,
  getMockTenantLandingPublication,
  publishMockTenantLandingPage,
  unpublishMockTenantLandingPage,
} from '../mock/landingPageRepository.js';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { fetchClinicSettingsByTenant } from './clinicSettingsRepository.js';
import { fetchServiceCatalogByTenant } from './servicesRepository.js';
import { validatePublicLandingSlug } from '../landingPageContract.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const firstRow = (data) => Array.isArray(data) ? data[0] || null : data || null;

const assertActorMembership = (actorMembershipId) => {
  if (!actorMembershipId) {
    const error = new Error('SS_HOME_PERMISSION_DENIED');
    error.code = 'SS_HOME_PERMISSION_DENIED';
    throw error;
  }
};

const throwRepositoryError = (error) => {
  const repositoryError = new Error(error?.message || 'SS_HOME_UNAVAILABLE');
  repositoryError.code = error?.message || error?.code || 'SS_HOME_UNAVAILABLE';
  throw repositoryError;
};

export const fetchLandingPagePreviewByTenant = async (tenantId) => {
  const fallback = getMockLandingPagePreviewByTenant(tenantId);

  if (!tenantId) {
    return fallback;
  }

  try {
    const [clinicSettings, serviceCatalog] = await Promise.all([
      fetchClinicSettingsByTenant(tenantId),
      fetchServiceCatalogByTenant(tenantId),
    ]);

    return buildLandingPagePreview({
      tenantId,
      clinicSettings,
      services: serviceCatalog.services || [],
    });
  } catch {
    return fallback;
  }
};

export const getTenantLandingPublication = async ({ actorMembershipId, tenantId }) => {
  if (!hasSupabase()) {
    return getMockTenantLandingPublication({ tenantId });
  }

  assertActorMembership(actorMembershipId);
  const { data, error } = await supabase.rpc('get_tenant_landing_indexing', {
    p_actor_membership_id: actorMembershipId,
  });

  if (error) throwRepositoryError(error);
  return firstRow(data);
};

export const publishTenantLandingPage = async ({ actorMembershipId, tenantId, slug }) => {
  if (!hasSupabase()) {
    return publishMockTenantLandingPage({ tenantId, slug });
  }

  assertActorMembership(actorMembershipId);
  const { data, error } = await supabase.rpc('publish_tenant_landing_page', {
    p_actor_membership_id: actorMembershipId,
    p_slug: slug,
  });

  if (error) throwRepositoryError(error);

  const publicationResult = firstRow(data);
  const indexingResult = await getTenantLandingPublication({ actorMembershipId, tenantId });
  return { ...indexingResult, changed: publicationResult?.changed === true };
};

export const unpublishTenantLandingPage = async ({ actorMembershipId, tenantId }) => {
  if (!hasSupabase()) {
    return unpublishMockTenantLandingPage({ tenantId });
  }

  assertActorMembership(actorMembershipId);
  const { data, error } = await supabase.rpc('unpublish_tenant_landing_page', {
    p_actor_membership_id: actorMembershipId,
  });

  if (error) throwRepositoryError(error);

  const publicationResult = firstRow(data);
  const indexingResult = await getTenantLandingPublication({ actorMembershipId, tenantId });
  return { ...indexingResult, changed: publicationResult?.changed === true };
};

export const enableTenantLandingIndexing = async ({ actorMembershipId, tenantId }) => {
  if (!hasSupabase()) {
    return enableMockTenantLandingIndexing({ tenantId });
  }

  assertActorMembership(actorMembershipId);
  const { data, error } = await supabase.rpc('enable_tenant_landing_indexing', {
    p_actor_membership_id: actorMembershipId,
  });

  if (error) throwRepositoryError(error);
  return firstRow(data);
};

export const disableTenantLandingIndexing = async ({ actorMembershipId, tenantId }) => {
  if (!hasSupabase()) {
    return disableMockTenantLandingIndexing({ tenantId });
  }

  assertActorMembership(actorMembershipId);
  const { data, error } = await supabase.rpc('disable_tenant_landing_indexing', {
    p_actor_membership_id: actorMembershipId,
  });

  if (error) throwRepositoryError(error);
  return firstRow(data);
};

export const resolvePublicLandingPage = async (slug) => {
  const validation = validatePublicLandingSlug(slug);
  if (!validation.valid) return null;
  if (!hasSupabase()) throwRepositoryError({ message: 'SS_HOME_PUBLIC_UNAVAILABLE' });

  const { data, error } = await supabase.rpc('resolve_public_landing_page', {
    p_slug: validation.slug,
  });

  if (error) throwRepositoryError(error);
  return firstRow(data);
};

export const listPublicLandingServices = async (slug) => {
  const validation = validatePublicLandingSlug(slug);
  if (!validation.valid) return [];
  if (!hasSupabase()) throwRepositoryError({ message: 'SS_HOME_PUBLIC_UNAVAILABLE' });

  const { data, error } = await supabase.rpc('list_public_landing_services', {
    p_slug: validation.slug,
  });

  if (error) throwRepositoryError(error);
  return Array.isArray(data) ? data : [];
};

export const resolvePublicLandingIndexingStatus = async (slug) => {
  const validation = validatePublicLandingSlug(slug);
  if (!validation.valid) return 'disabled';
  if (!hasSupabase()) throwRepositoryError({ message: 'SS_HOME_PUBLIC_UNAVAILABLE' });

  const { data, error } = await supabase.rpc('resolve_public_landing_indexing_status', {
    p_slug: validation.slug,
  });

  if (error) throwRepositoryError(error);
  return firstRow(data)?.indexing_status === 'enabled' ? 'enabled' : 'disabled';
};

export const listIndexablePublicLandingPages = async () => {
  if (!hasSupabase()) throwRepositoryError({ message: 'SS_HOME_DIRECTORY_UNAVAILABLE' });

  const { data, error } = await supabase.rpc('list_indexable_public_landing_pages');
  if (error) throwRepositoryError({ message: 'SS_HOME_DIRECTORY_UNAVAILABLE' });

  return Array.isArray(data) ? data : [];
};

export const submitPublicLandingLead = async ({
  slug,
  requestId,
  name,
  email,
  phone = '',
  serviceReference = '',
  consent = false,
  consentVersion,
  honeypot = '',
}) => {
  const validation = validatePublicLandingSlug(slug);
  if (!validation.valid || !hasSupabase()) {
    const unavailableError = new Error('SS_HOME_LEAD_SUBMISSION_UNAVAILABLE');
    unavailableError.code = 'SS_HOME_LEAD_SUBMISSION_UNAVAILABLE';
    throw unavailableError;
  }

  const { data, error } = await supabase.rpc('submit_public_landing_lead', {
    p_slug: validation.slug,
    p_request_id: requestId,
    p_name: name,
    p_email: email,
    p_phone: phone || null,
    p_service_reference: serviceReference || null,
    p_consent: consent === true,
    p_consent_version: consentVersion,
    p_honeypot: honeypot || null,
  });

  if (error) {
    const submissionError = new Error('SS_HOME_LEAD_SUBMISSION_UNAVAILABLE');
    submissionError.code = 'SS_HOME_LEAD_SUBMISSION_UNAVAILABLE';
    throw submissionError;
  }

  const result = firstRow(data);
  if (result?.accepted !== true || result?.message_code !== 'interest_received') {
    const invalidResponseError = new Error('SS_HOME_LEAD_SUBMISSION_UNAVAILABLE');
    invalidResponseError.code = 'SS_HOME_LEAD_SUBMISSION_UNAVAILABLE';
    throw invalidResponseError;
  }

  return {
    accepted: true,
    receivedAt: result.received_at || null,
    messageCode: 'interest_received',
  };
};
