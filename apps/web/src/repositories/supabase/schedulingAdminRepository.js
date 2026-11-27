import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getMockMasterSchedulingControl,
  saveMockMasterSchedulingIntegration,
  saveMockMasterSchedulingMapping,
  updateMockMasterSchedulingSettings,
} from '../mock/schedulingAdminRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);
const SAFE_TOKEN = /^[A-Za-z0-9._:-]{1,160}$/;

const safeText = (value, fallback = '', limit = 160) => {
  const text = String(value || '').trim().slice(0, limit);
  return text && SAFE_TOKEN.test(text) ? text : fallback;
};

const normalizeTenant = (tenant = {}) => ({
  id: tenant.id || '',
  name: String(tenant.name || tenant.slug || 'Tenant').trim().slice(0, 120),
  plan: String(tenant.plan || '').trim().slice(0, 80),
  slug: safeText(tenant.slug, tenant.id || '', 120),
  status: safeText(tenant.status, '', 40),
});

const normalizeCapabilities = (value = {}) => Object.fromEntries(
  Object.entries(value || {})
    .filter(([key, enabled]) => SAFE_TOKEN.test(key) && enabled === true)
    .slice(0, 7),
);

const normalizeIntegration = (integration = {}) => ({
  apiVersion: safeText(integration.api_version, 'v1', 30),
  bookingLinkUrl: typeof integration.booking_link_url === 'string'
    && integration.booking_link_url.startsWith('https://')
    ? integration.booking_link_url.slice(0, 508)
    : null,
  canReceiveEvents: Boolean(integration.can_receive_events),
  capabilities: normalizeCapabilities(integration.capabilities),
  credentialConfigured: Boolean(integration.credential_configured),
  displayName: String(integration.display_name || 'Integração de agenda').trim().slice(0, 100),
  endpointConfigured: Boolean(integration.endpoint_configured),
  endpointHost: safeText(integration.endpoint_host, null, 253),
  healthStatus: safeText(integration.health_status, 'unknown', 40),
  id: integration.id || '',
  integrationKey: safeText(integration.integration_key, '', 80),
  providerKey: safeText(integration.provider_key, 'generic', 80),
  requestTimeoutMs: Number(integration.request_timeout_ms || 5000),
  secretProvider: safeText(integration.secret_provider, null, 40),
  signingConfigured: Boolean(integration.signing_configured),
  status: safeText(integration.status, 'draft', 40),
  transport: safeText(integration.transport, '', 40),
  updatedAt: integration.updated_at || null,
});

const normalizeSettings = (settings = {}) => ({
  automationBookingEnabled: Boolean(settings.automation_booking_enabled),
  capabilities: normalizeCapabilities(settings.capabilities),
  enabled: Boolean(settings.enabled),
  experienceMode: safeText(settings.experience_mode, 'handoff', 40),
  integrationId: settings.integration_id || null,
  killSwitchEnabled: settings.kill_switch_enabled !== false,
  maximumDaysAhead: Number(settings.maximum_days_ahead || 60),
  maximumOptions: Number(settings.maximum_options || 3),
  minimumNoticeMinutes: Number(settings.minimum_notice_minutes || 120),
  offerTtlMinutes: Number(settings.offer_ttl_minutes || 10),
  slotIntervalMinutes: Number(settings.slot_interval_minutes || 30),
  sourceType: safeText(settings.source_type, 'none', 40),
  status: safeText(settings.status, 'disabled', 40),
  timezone: safeText(settings.timezone, 'America/Sao_Paulo', 80),
  updatedAt: settings.updated_at || null,
});

const normalizeMapping = (mapping = {}) => ({
  active: Boolean(mapping.active),
  entityType: safeText(mapping.entity_type, '', 40),
  externalRef: safeText(mapping.external_ref, '', 160),
  id: mapping.id || '',
  integrationId: mapping.integration_id || '',
  localEntityId: mapping.local_entity_id || null,
  localKey: safeText(mapping.local_key, '', 120),
  updatedAt: mapping.updated_at || null,
});

const normalizeMappingCandidate = (candidate = {}) => ({
  entityType: safeText(candidate.entity_type, '', 40),
  id: candidate.id || null,
  label: String(candidate.label || 'Item operacional').trim().slice(0, 100),
  localKey: safeText(candidate.local_key, '', 120),
  status: safeText(candidate.status, 'active', 40),
});

const normalizeMappingCatalog = (catalog = {}) => ({
  professional: (catalog.professional || []).map(normalizeMappingCandidate),
  room: (catalog.room || []).map(normalizeMappingCandidate),
  service: (catalog.service || []).map(normalizeMappingCandidate),
  status: (catalog.status || []).map(normalizeMappingCandidate),
});

const normalizeRuntime = (runtime = {}) => ({
  bookingIdempotencySecretConfigured: Boolean(runtime.booking_idempotency_secret_configured),
  bookingTenantAllowed: Boolean(runtime.booking_tenant_allowed),
  bookingWritesEnabled: Boolean(runtime.booking_writes_enabled),
  externalConnectorsEnabled: Boolean(runtime.external_connectors_enabled),
  externalHostsConfigured: Boolean(runtime.external_hosts_configured),
  externalHostsCount: Number(runtime.external_hosts_count || 0),
  gatewayEnabled: Boolean(runtime.gateway_enabled),
  offerTokenSecretConfigured: Boolean(runtime.offer_token_secret_configured),
});

const normalizeResolution = (resolution = {}) => ({
  automationUsesHumanPermissions: false,
  blockedReasons: (resolution.blockedReasons || []).map((item) => safeText(item)).filter(Boolean),
  capabilities: normalizeCapabilities(resolution.capabilities),
  enabledCapabilities: (resolution.enabledCapabilities || []).map((item) => safeText(item)).filter(Boolean),
  experienceMode: safeText(resolution.experienceMode, 'handoff', 40),
  readiness: safeText(resolution.readiness, 'handoff', 40),
  reason: safeText(resolution.reason, 'settings_unavailable', 80),
  requiresAppointmentsModule: Boolean(resolution.requiresAppointmentsModule),
  sourceOfTruth: safeText(resolution.sourceOfTruth, 'none', 40),
  sourceType: safeText(resolution.sourceType, 'none', 40),
  status: safeText(resolution.status, 'disabled', 40),
  tenantScoped: resolution.tenantScoped === true,
});

const OBSERVABILITY_METRICS = {
  activeOffers: 'active_offers',
  appointmentSelectionsPending: 'appointment_selections_pending',
  bookingsConfirmedWindow: 'bookings_confirmed_window',
  bookingStatusReadsWindow: 'booking_status_reads_window',
  bookingConfirmationsWindow: 'booking_confirmations_window',
  bookingReschedulesWindow: 'booking_reschedules_window',
  bookingCancellationsWindow: 'booking_cancellations_window',
  bookingLifecycleFailuresWindow: 'booking_lifecycle_failures_window',
  bookingsFailedWindow: 'bookings_failed_window',
  bookingsHandoffWindow: 'bookings_handoff_window',
  bookingsProcessing: 'bookings_processing',
  bookingsStaleProcessing: 'bookings_stale_processing',
  conversationsHandoff: 'conversations_handoff',
  conversationsInProgress: 'conversations_in_progress',
  eventsFailedWindow: 'events_failed_window',
  eventsHandoffWindow: 'events_handoff_window',
  eventsWindow: 'events_window',
  existingAppointmentActionsWindow: 'existing_appointment_actions_window',
  staleActiveOffers: 'stale_active_offers',
  staleAppointmentOptions: 'stale_appointment_options',
};

const unavailableObservability = (reason = 'query_unavailable') => ({
  available: false,
  metrics: Object.fromEntries(Object.keys(OBSERVABILITY_METRICS).map((key) => [key, null])),
  observedAt: null,
  staleAfterMinutes: 15,
  unavailableReason: safeText(reason, 'query_unavailable', 40),
  version: 'r5.50-v1',
  windowHours: 24,
});

const normalizeObservability = (observability = {}) => {
  if (observability.available !== true || !observability.metrics) {
    return unavailableObservability(observability.unavailable_reason);
  }

  const metrics = {};
  for (const [publicKey, apiKey] of Object.entries(OBSERVABILITY_METRICS)) {
    const count = observability.metrics[apiKey];
    if (!Number.isSafeInteger(count) || count < 0) return unavailableObservability('summary_invalid');
    metrics[publicKey] = count;
  }

  const observedAt = Date.parse(observability.observed_at || '');
  if (Number.isNaN(observedAt)) return unavailableObservability('summary_invalid');
  return {
    available: true,
    metrics,
    observedAt: new Date(observedAt).toISOString(),
    staleAfterMinutes: 15,
    unavailableReason: null,
    version: safeText(observability.version, 'r5.50-v1', 40),
    windowHours: 24,
  };
};

const normalizeControl = (payload = {}) => ({
  canWrite: Boolean(payload.can_write),
  integrations: (payload.integrations || []).map(normalizeIntegration),
  mappingCatalog: normalizeMappingCatalog(payload.mapping_catalog),
  mappings: (payload.mappings || []).map(normalizeMapping),
  modules: {
    appointmentsEnabled: Boolean(payload.modules?.appointments_enabled),
    omnichannelEnabled: Boolean(payload.modules?.omnichannel_enabled),
  },
  observability: normalizeObservability(payload.observability),
  readiness: {
    blockedReasons: (payload.readiness?.blocked_reasons || []).map((item) => safeText(item)).filter(Boolean),
    enabledCapabilities: (payload.readiness?.enabled_capabilities || []).map((item) => safeText(item)).filter(Boolean),
    status: safeText(payload.readiness?.status, 'handoff', 40),
  },
  resolution: normalizeResolution(payload.resolution),
  roleCodes: (payload.role_codes || []).map((item) => safeText(item)).filter(Boolean),
  runtime: normalizeRuntime(payload.runtime),
  settings: normalizeSettings(payload.settings),
  source: payload.source || 'Supabase',
  tenant: normalizeTenant(payload.tenant),
  tenants: (payload.tenants || []).map(normalizeTenant),
});

const invokeSchedulingAdmin = async (body) => {
  if (!hasSupabase()) throw new Error('Supabase não configurado para o controle de agendamento.');
  const { data, error } = await supabase.functions.invoke('scheduling-admin', { body });
  if (error) throw new Error(error.message || 'Falha no controle de agendamento.');
  if (data?.error?.code) throw new Error(data.error.code);
  return data;
};

export const getMasterSchedulingControl = async (payload = {}) => {
  if (!hasSupabase()) return getMockMasterSchedulingControl(payload);
  try {
    return normalizeControl(await invokeSchedulingAdmin({
      action: 'get_scheduling_control',
      tenant_id: payload.tenantId || undefined,
      tenant_slug: payload.tenantSlug || undefined,
    }));
  } catch {
    return { ...await getMockMasterSchedulingControl(payload), source: 'Fallback demo' };
  }
};

export const saveMasterSchedulingIntegration = async (payload = {}) => {
  if (!hasSupabase()) return saveMockMasterSchedulingIntegration(payload);
  const data = await invokeSchedulingAdmin({
    action: 'save_scheduling_integration',
    api_version: payload.apiVersion,
    booking_link_url: payload.bookingLinkUrl || undefined,
    capabilities: payload.capabilities || {},
    confirmation: payload.confirmation || undefined,
    credential_secret_ref: payload.credentialSecretRef,
    display_name: payload.displayName,
    endpoint_url: payload.endpointUrl || undefined,
    integration_id: payload.integrationId || undefined,
    integration_key: payload.integrationKey,
    provider_key: payload.providerKey || 'generic',
    request_timeout_ms: payload.requestTimeoutMs,
    secret_provider: payload.secretProvider || undefined,
    signing_secret_ref: payload.signingSecretRef,
    status: payload.status || 'draft',
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
    transport: payload.transport,
  });
  return normalizeControl(data);
};

export const saveMasterSchedulingMapping = async (payload = {}) => {
  if (!hasSupabase()) return saveMockMasterSchedulingMapping(payload);
  const data = await invokeSchedulingAdmin({
    action: 'save_scheduling_mapping',
    active: payload.active !== false,
    confirmation: payload.confirmation || undefined,
    entity_type: payload.entityType,
    external_ref: payload.externalRef,
    integration_id: payload.integrationId,
    local_entity_id: payload.localEntityId || undefined,
    local_key: payload.localKey,
    mapping_id: payload.mappingId || undefined,
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
  });
  return normalizeControl(data);
};

export const updateMasterSchedulingSettings = async (payload = {}) => {
  if (!hasSupabase()) return updateMockMasterSchedulingSettings(payload);
  const data = await invokeSchedulingAdmin({
    action: 'update_scheduling_settings',
    automation_booking_enabled: payload.automationBookingEnabled === true,
    capabilities: payload.capabilities || {},
    confirmation: payload.confirmation || undefined,
    enabled: payload.enabled === true,
    experience_mode: payload.experienceMode,
    integration_id: payload.integrationId || undefined,
    kill_switch_enabled: payload.killSwitchEnabled !== false,
    maximum_days_ahead: payload.maximumDaysAhead,
    maximum_options: payload.maximumOptions,
    minimum_notice_minutes: payload.minimumNoticeMinutes,
    offer_ttl_minutes: payload.offerTtlMinutes,
    slot_interval_minutes: payload.slotIntervalMinutes,
    source_type: payload.sourceType,
    status: payload.status,
    tenant_id: payload.tenantId || undefined,
    tenant_slug: payload.tenantSlug || undefined,
  });
  return normalizeControl(data);
};
