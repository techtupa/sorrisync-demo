const TENANTS = [
  { id: '00000000-0000-4000-8000-000000000101', name: 'Clínica Demo Avery Chen', plan: 'Premium', slug: 'tenant_aurora', status: 'active' },
  { id: '00000000-0000-4000-8000-000000000102', name: 'Clínica Demo Jardim', plan: 'Essencial', slug: 'tenant_harbor', status: 'trial' },
  { id: '00000000-0000-4000-8000-000000000103', name: 'Clínica Demo Prime', plan: 'Premium', slug: 'tenant_odonto_prime', status: 'active' },
];

const SAFE_SETTINGS = {
  automationBookingEnabled: false,
  capabilities: {},
  enabled: false,
  experienceMode: 'handoff',
  integrationId: null,
  killSwitchEnabled: true,
  maximumDaysAhead: 60,
  maximumOptions: 3,
  minimumNoticeMinutes: 120,
  offerTtlMinutes: 10,
  slotIntervalMinutes: 30,
  sourceType: 'none',
  status: 'disabled',
  timezone: 'America/Sao_Paulo',
  updatedAt: null,
};

const SAFE_MAPPING_CATALOG = {
  professional: [
    { entityType: 'professional', id: '00000000-0000-4000-8000-000000000501', label: 'Profissional demo', localKey: 'profissional_demo', status: 'active' },
  ],
  room: [
    { entityType: 'room', id: '00000000-0000-4000-8000-000000000601', label: 'Sala demo', localKey: 'sala_demo', status: 'active' },
  ],
  service: [
    { entityType: 'service', id: '00000000-0000-4000-8000-000000000401', label: 'Avaliação inicial demo', localKey: 'avaliacao_inicial_demo', status: 'active' },
  ],
  status: [
    { entityType: 'status', id: null, label: 'Em processamento', localKey: 'processing', status: 'active' },
    { entityType: 'status', id: null, label: 'Confirmado', localKey: 'confirmed', status: 'active' },
    { entityType: 'status', id: null, label: 'Falhou', localKey: 'failed', status: 'active' },
    { entityType: 'status', id: null, label: 'Requer atendimento humano', localKey: 'requires_handoff', status: 'active' },
  ],
};

export const getMockMasterSchedulingControl = async ({ tenantId, tenantSlug } = {}) => {
  const tenant = TENANTS.find((item) => item.id === tenantId || item.slug === tenantSlug) || TENANTS[0];
  return {
    canWrite: false,
    integrations: [],
    mappingCatalog: Object.fromEntries(
      Object.entries(SAFE_MAPPING_CATALOG).map(([key, candidates]) => [
        key,
        candidates.map((candidate) => ({ ...candidate })),
      ]),
    ),
    mappings: [],
    modules: {
      appointmentsEnabled: tenant.slug !== 'tenant_harbor',
      omnichannelEnabled: true,
    },
    observability: {
      available: false,
      metrics: {
        activeOffers: null,
        appointmentSelectionsPending: null,
        bookingCancellationsWindow: null,
        bookingConfirmationsWindow: null,
        bookingLifecycleFailuresWindow: null,
        bookingReschedulesWindow: null,
        bookingStatusReadsWindow: null,
        bookingsConfirmedWindow: null,
        bookingsFailedWindow: null,
        bookingsHandoffWindow: null,
        bookingsProcessing: null,
        bookingsStaleProcessing: null,
        conversationsHandoff: null,
        conversationsInProgress: null,
        eventsFailedWindow: null,
        eventsHandoffWindow: null,
        eventsWindow: null,
        existingAppointmentActionsWindow: null,
        staleActiveOffers: null,
        staleAppointmentOptions: null,
      },
      observedAt: null,
      staleAfterMinutes: 15,
      unavailableReason: 'fallback_demo',
      version: 'r5.50-v1',
      windowHours: 24,
    },
    readiness: {
      blockedReasons: ['runtime_gateway_disabled', 'source_not_configured'],
      enabledCapabilities: [],
      status: 'handoff',
    },
    resolution: {
      automationUsesHumanPermissions: false,
      blockedReasons: ['runtime_gateway_disabled', 'source_not_configured'],
      enabledCapabilities: [],
      experienceMode: 'handoff',
      readiness: 'handoff',
      requiresAppointmentsModule: false,
      sourceOfTruth: 'none',
      sourceType: 'none',
      status: 'disabled',
      tenantScoped: true,
    },
    roleCodes: ['platform_admin'],
    runtime: {
      bookingIdempotencySecretConfigured: false,
      bookingTenantAllowed: false,
      bookingWritesEnabled: false,
      externalConnectorsEnabled: false,
      externalHostsConfigured: false,
      externalHostsCount: 0,
      gatewayEnabled: false,
      offerTokenSecretConfigured: false,
    },
    settings: { ...SAFE_SETTINGS },
    source: 'Fallback demo',
    tenant,
    tenants: TENANTS.map((item) => ({ ...item })),
  };
};

export const saveMockMasterSchedulingIntegration = async () => {
  throw new Error('A escrita de integração exige Supabase autenticado e a Edge Function scheduling-admin.');
};

export const saveMockMasterSchedulingMapping = async () => {
  throw new Error('A escrita de mapeamento exige Supabase autenticado e a Edge Function scheduling-admin.');
};

export const updateMockMasterSchedulingSettings = async () => {
  throw new Error('A escrita de agendamento exige Supabase autenticado e a Edge Function scheduling-admin.');
};
