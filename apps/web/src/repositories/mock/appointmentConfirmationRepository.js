const TENANTS = [
  { id: '00000000-0000-4000-8000-000000000101', name: 'Clínica Demo Avery Chen', plan: 'Premium', slug: 'tenant_aurora', status: 'active' },
  { id: '00000000-0000-4000-8000-000000000102', name: 'Clínica Demo Jardim', plan: 'Essencial', slug: 'tenant_harbor', status: 'trial' },
];

const buildMockControl = ({ master = false, tenantId, tenantSlug } = {}) => {
  const tenant = TENANTS.find((item) => item.id === tenantId || item.slug === tenantSlug) || TENANTS[0];
  const base = {
    canManageConsent: false,
    canWrite: false,
    channels: [],
    clinicBilling: {
      allowOverage: false,
      billingMode: 'included_overage',
      currency: 'BRL',
      customerOverageUnitMicros: 0,
      includedDeliveredMessages: 0,
      status: 'disabled',
    },
    consentPatients: [],
    pendingOrUncertainJobs: 0,
    readiness: {
      appointmentsModule: true,
      billingPolicy: false,
      channel: false,
      consentedPatients: 0,
      cronSecret: false,
      omnichannelModule: true,
      providerCredential: false,
      ready: false,
      runtime: false,
      sendGate: false,
      template: false,
      tenantAllowed: false,
    },
    settings: {
      budgetAction: 'hard_stop',
      channelId: null,
      eligibleStatuses: ['Agendada', 'Pendente'],
      enabled: false,
      killSwitchEnabled: true,
      leadMinutes: 1440,
      monthlyBudgetMicros: null,
      monthlyMessageLimit: null,
      sendWindowEnd: '18:00',
      sendWindowStart: '08:00',
      status: 'disabled',
      templateId: null,
      timezone: 'America/Sao_Paulo',
      updatedAt: null,
    },
    source: 'Fallback demo',
    templates: [],
    tenant,
    usage: {
      billableUnits: 0,
      blockedBudget: 0,
      cancelRequests: 0,
      confirmed: 0,
      customerChargeMicros: 0,
      failed: 0,
      periodStart: null,
      queued: 0,
      reservedCustomerChargeMicros: 0,
      reservedUnits: 0,
      rescheduleRequests: 0,
      uncertain: 0,
    },
  };
  if (!master) return base;
  return {
    ...base,
    master: {
      policy: {
        allowOverage: false,
        billingMode: 'included_overage',
        commercialRateStrategy: 'fixed_overage',
        currency: 'BRL',
        fixedOverageMicros: 0,
        includedDeliveredMessages: 0,
        markupBasisPoints: 0,
        monthlyHardCapMicros: null,
        monthlyMessageHardCap: null,
        monthlyProviderCostHardCapMicros: null,
        policyVersion: 0,
        status: 'disabled',
      },
      rateCards: [],
      runtime: {
        cronSecretConfigured: false,
        providerCredentialConfigured: false,
        runtimeEnabled: false,
        sendEnabled: false,
        tenantAllowed: false,
      },
      usage: {
        ...base.usage,
        providerCostMicros: 0,
        reservedProviderCostMicros: 0,
      },
    },
    platformRoleCodes: ['platform_admin'],
    tenants: TENANTS,
  };
};

export const getMockClinicAppointmentConfirmationControl = async (payload = {}) => buildMockControl(payload);
export const getMockMasterAppointmentConfirmationControl = async (payload = {}) => buildMockControl({ ...payload, master: true });

const buildMockMonthlyStatement = ({ master = false, periodStart, tenantId, tenantSlug } = {}) => {
  const tenant = TENANTS.find((item) => item.id === tenantId || item.slug === tenantSlug) || TENANTS[0];
  const normalizedPeriod = /^\d{4}-(0[1-9]|1[0-2])-01$/.test(String(periodStart || ''))
    ? String(periodStart)
    : `${new Date().toISOString().slice(0, 7)}-01`;
  const [year, month] = normalizedPeriod.split('-').map(Number);
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  const day = (value) => `${normalizedPeriod.slice(0, 8)}${String(value).padStart(2, '0')}`;
  const summary = {
    adjustmentCount: 0,
    adjustmentCustomerChargeMicros: 0,
    adjustmentProviderCostMicros: 0,
    billableUnits: 68,
    customerChargeMicros: 1_260_000,
    includedUnits: 50,
    overageUnits: 18,
    providerCostMicros: 738_000,
    reservedCustomerChargeMicros: 350_000,
    reservedProviderCostMicros: 0,
    reservedUnits: 5,
    sourceEventCount: 77,
    sourceLastEventAt: `${day(28)}T15:30:00Z`,
  };
  return {
    billingMode: 'included_overage',
    canClose: false,
    canReconcile: false,
    canWrite: false,
    closedAt: null,
    currency: 'BRL',
    dailyLines: [
      { billableUnits: 24, category: 'utility', customerChargeMicros: 0, day: day(3), eventCount: 24, eventType: 'delivery_billable', providerCostMicros: 288_000 },
      { billableUnits: 26, category: 'utility', customerChargeMicros: 560_000, day: day(10), eventCount: 26, eventType: 'delivery_billable', providerCostMicros: 0 },
      { billableUnits: 18, category: 'authentication', customerChargeMicros: 700_000, day: day(17), eventCount: 18, eventType: 'delivery_billable', providerCostMicros: 450_000 },
      { billableUnits: 0, category: 'service', customerChargeMicros: 0, day: day(24), eventCount: 4, eventType: 'delivery_nonbillable', providerCostMicros: 0 },
      { billableUnits: 0, category: 'utility', customerChargeMicros: 350_000, day: day(28), eventCount: 5, eventType: 'budget_reserved', providerCostMicros: 0 },
    ],
    includedDeliveredMessages: 50,
    isCurrentPeriod: normalizedPeriod === `${new Date().toISOString().slice(0, 7)}-01`,
    ledgerMatchesSnapshot: true,
    liveSummary: master ? summary : null,
    operational: {
      blockedBudget: 0,
      cancelRequests: 0,
      confirmed: 56,
      failed: 2,
      queued: 5,
      rescheduleRequests: 3,
      uncertain: 0,
    },
    periodEnd,
    periodStart: normalizedPeriod,
    policyVersion: master ? 0 : null,
    reconciledAt: null,
    source: 'Fallback demo',
    status: 'open',
    summary,
    tenant,
    version: 0,
    view: master ? 'master' : 'clinic',
  };
};

export const getMockClinicWhatsAppMonthlyStatement = async (payload = {}) => buildMockMonthlyStatement(payload);
export const getMockMasterWhatsAppMonthlyStatement = async (payload = {}) => buildMockMonthlyStatement({ ...payload, master: true });

const requireSupabase = () => {
  throw new Error('Esta alteração exige sessão autenticada e Supabase disponível.');
};

export const emergencyStopMockAppointmentConfirmations = requireSupabase;
export const closeMockWhatsAppMonthlyStatement = requireSupabase;
export const recordMockPatientChannelConsent = requireSupabase;
export const reconcileMockAppointmentConfirmationUsage = requireSupabase;
export const reconcileMockWhatsAppMonthlyStatement = requireSupabase;
export const saveMockAppointmentConfirmationRateCard = requireSupabase;
export const saveMockAppointmentConfirmationTemplate = requireSupabase;
export const updateMockClinicAppointmentConfirmationSettings = requireSupabase;
export const updateMockTenantWhatsAppBillingPolicy = requireSupabase;
