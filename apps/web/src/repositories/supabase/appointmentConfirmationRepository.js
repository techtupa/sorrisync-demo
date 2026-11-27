import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  closeMockWhatsAppMonthlyStatement,
  emergencyStopMockAppointmentConfirmations,
  getMockClinicAppointmentConfirmationControl,
  getMockClinicWhatsAppMonthlyStatement,
  getMockMasterAppointmentConfirmationControl,
  getMockMasterWhatsAppMonthlyStatement,
  recordMockPatientChannelConsent,
  reconcileMockWhatsAppMonthlyStatement,
  reconcileMockAppointmentConfirmationUsage,
  saveMockAppointmentConfirmationRateCard,
  saveMockAppointmentConfirmationTemplate,
  updateMockClinicAppointmentConfirmationSettings,
  updateMockTenantWhatsAppBillingPolicy,
} from '../mock/appointmentConfirmationRepository.js';

export const CLINIC_APPOINTMENT_CONFIRMATION_ACTIVATION = 'ATIVAR_CONFIRMACOES_CONSULTA';
export const MASTER_WHATSAPP_BILLING_ACTIVATION = 'ATIVAR_COBRANCA_WHATSAPP';
export const MASTER_APPOINTMENT_CONFIRMATION_STOP = 'INTERROMPER_CONFIRMACOES_WHATSAPP';
export const MASTER_WHATSAPP_RATE_ACTIVATION = 'REGISTRAR_TARIFA_WHATSAPP';
export const MASTER_WHATSAPP_TEMPLATE_SYNC = 'SINCRONIZAR_TEMPLATE_META';
export const MASTER_WHATSAPP_STATEMENT_RECONCILIATION = 'RECONCILIAR_DEMONSTRATIVO_WHATSAPP';
export const MASTER_WHATSAPP_STATEMENT_CLOSE = 'FECHAR_DEMONSTRATIVO_WHATSAPP';

const ADMIN_ERROR_MESSAGES = {
  activation_prerequisites_incomplete: 'Conclua todas as pré-condições antes de ativar os envios.',
  approved_template_provider_id_required: 'Informe o ID aprovado pela Meta antes de aprovar o template.',
  authorization_failed: 'Sua sessão expirou ou não foi autorizada.',
  billing_policy_invalid: 'Revise a política comercial e os três tetos obrigatórios.',
  consent_input_invalid: 'Revise o paciente, a decisão e o protocolo da autorização.',
  patient_consent_manage_required: 'Seu perfil precisa gerenciar confirmações e ler Pacientes.',
  patient_not_found: 'O paciente não foi encontrado neste tenant.',
  platform_admin_required: 'Esta alteração exige perfil Administrador Master.',
  provider_business_account_missing: 'O canal não possui a conta WhatsApp Business necessária para consultar templates.',
  provider_channel_invalid: 'Selecione um canal WhatsApp válido.',
  provider_channel_not_found: 'O canal selecionado não pertence a este tenant.',
  provider_channel_not_ready: 'O canal precisa estar ativo no WhatsApp Cloud.',
  provider_credential_missing: 'A credencial da Meta não está configurada no servidor.',
  provider_template_invalid: 'Selecione um template retornado pela Meta.',
  provider_template_not_eligible: 'O template não atende ao contrato de confirmação de consulta.',
  provider_template_not_found: 'O template não foi encontrado na conta WhatsApp deste canal.',
  provider_template_sync_confirmation_required: 'Confirme explicitamente o vínculo do template Meta.',
  provider_template_sync_required: 'Templates aprovados devem ser vinculados pela consulta segura à Meta.',
  provider_templates_unavailable: 'A Meta não respondeu à consulta de templates. Tente novamente.',
  rate_card_invalid: 'Revise o custo, a vigência e a referência da tarifa.',
  settings_invalid: 'Revise os campos da regra de confirmação.',
  statement_already_closed: 'O demonstrativo já está fechado e não pode ser alterado.',
  statement_close_blocked: 'O fechamento foi bloqueado porque o ledger mudou ou ainda há eventos pendentes.',
  statement_confirmation_required: 'Confirme explicitamente esta alteração do demonstrativo.',
  statement_pending_events: 'Ainda existem envios pendentes ou incertos neste período.',
  statement_period_invalid: 'Selecione um mês válido para o demonstrativo.',
  statement_period_still_open: 'O mês atual permanece aberto e ainda não pode ser conciliado.',
  statement_reconciliation_required: 'Concilie o demonstrativo antes de fechá-lo.',
  template_channel_not_found: 'O canal selecionado não pertence a este tenant.',
  template_input_invalid: 'Revise o template e o identificador aprovado pela Meta.',
  template_not_found: 'O template não foi encontrado neste tenant.',
  tenant_access_denied: 'Seu perfil não possui acesso a este tenant.',
  tenant_manage_required: 'Seu perfil não pode alterar as confirmações deste tenant.',
  whatsapp_usage_read_required: 'Seu perfil não possui permissão para consultar o consumo WhatsApp.',
};

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);
const safeText = (value, fallback = '', limit = 180) => String(value || '').trim().slice(0, limit) || fallback;
const toNumber = (value, fallback = 0) => (Number.isSafeInteger(Number(value)) ? Number(value) : fallback);
const toNullableNumber = (value) => (value === null || value === undefined ? null : toNumber(value, null));
const normalizeTime = (value, fallback) => safeText(value, fallback, 8).slice(0, 5);

const normalizeTenant = (tenant = {}) => ({
  id: tenant.id || '',
  name: safeText(tenant.name, 'Tenant', 120),
  plan: safeText(tenant.plan, '', 80),
  slug: safeText(tenant.slug, '', 120),
  status: safeText(tenant.status, '', 40),
});

const normalizeSettings = (settings = {}) => ({
  budgetAction: safeText(settings.budget_action, 'hard_stop', 30),
  channelId: settings.channel_id || null,
  eligibleStatuses: Array.isArray(settings.eligible_statuses) ? settings.eligible_statuses.slice(0, 3) : ['Agendada', 'Pendente'],
  enabled: settings.enabled === true,
  killSwitchEnabled: settings.kill_switch_enabled !== false,
  leadMinutes: toNumber(settings.lead_minutes, 1440),
  monthlyBudgetMicros: toNullableNumber(settings.monthly_budget_micros),
  monthlyMessageLimit: toNullableNumber(settings.monthly_message_limit),
  sendWindowEnd: normalizeTime(settings.send_window_end, '18:00'),
  sendWindowStart: normalizeTime(settings.send_window_start, '08:00'),
  status: safeText(settings.status, 'disabled', 40),
  templateId: settings.template_id || null,
  timezone: safeText(settings.timezone, 'America/Sao_Paulo', 80),
  updatedAt: settings.updated_at || null,
});

const normalizeUsage = (usage = {}) => ({
  billableUnits: toNumber(usage.billable_units),
  blockedBudget: toNumber(usage.blocked_budget),
  cancelRequests: toNumber(usage.cancel_requests),
  confirmed: toNumber(usage.confirmed),
  customerChargeMicros: toNumber(usage.customer_charge_micros),
  failed: toNumber(usage.failed),
  periodStart: usage.period_start || null,
  queued: toNumber(usage.queued),
  reservedCustomerChargeMicros: toNumber(usage.reserved_customer_charge_micros),
  reservedUnits: toNumber(usage.reserved_units),
  rescheduleRequests: toNumber(usage.reschedule_requests),
  uncertain: toNumber(usage.uncertain),
});

const normalizeStatementSummary = (summary = {}, { master = false } = {}) => ({
  adjustmentCount: master ? toNumber(summary.adjustment_count) : 0,
  adjustmentCustomerChargeMicros: master ? toNumber(summary.adjustment_customer_charge_micros) : 0,
  adjustmentProviderCostMicros: master ? toNumber(summary.adjustment_provider_cost_micros) : 0,
  billableUnits: toNumber(summary.billable_units),
  customerChargeMicros: toNumber(summary.customer_charge_micros),
  includedUnits: toNumber(summary.included_units),
  overageUnits: toNumber(summary.overage_units),
  providerCostMicros: master ? toNumber(summary.provider_cost_micros) : 0,
  reservedCustomerChargeMicros: toNumber(summary.reserved_customer_charge_micros),
  reservedProviderCostMicros: master ? toNumber(summary.reserved_provider_cost_micros) : 0,
  reservedUnits: toNumber(summary.reserved_units),
  sourceEventCount: toNumber(summary.source_event_count),
  sourceLastEventAt: summary.source_last_event_at || null,
});

const normalizeMonthlyStatement = (payload = {}, { master = false } = {}) => ({
  billingMode: safeText(payload.billing_mode, 'included_overage', 40),
  canClose: master && payload.can_close === true,
  canReconcile: master && payload.can_reconcile === true,
  canWrite: master && payload.can_write === true,
  closedAt: payload.closed_at || null,
  currency: safeText(payload.currency, 'BRL', 3),
  dailyLines: (payload.daily_lines || []).slice(0, 750).map((line) => ({
    billableUnits: toNumber(line.billable_units),
    category: safeText(line.category, 'utility', 40),
    customerChargeMicros: toNumber(line.customer_charge_micros),
    day: safeText(line.day, '', 10),
    eventCount: toNumber(line.event_count),
    eventType: safeText(line.event_type, '', 40),
    providerCostMicros: master ? toNumber(line.provider_cost_micros) : 0,
    reservedCustomerChargeMicros: toNumber(line.reserved_customer_charge_micros),
    reservedProviderCostMicros: master ? toNumber(line.reserved_provider_cost_micros) : 0,
    reservedUnits: toNumber(line.reserved_units),
  })),
  includedDeliveredMessages: toNumber(payload.included_delivered_messages),
  isCurrentPeriod: payload.is_current_period === true,
  ledgerMatchesSnapshot: payload.ledger_matches_snapshot !== false,
  liveSummary: master && payload.live_summary
    ? normalizeStatementSummary(payload.live_summary, { master: true })
    : null,
  operational: {
    blockedBudget: toNumber(payload.operational?.blocked_budget),
    cancelRequests: toNumber(payload.operational?.cancel_requests),
    confirmed: toNumber(payload.operational?.confirmed),
    failed: toNumber(payload.operational?.failed),
    queued: toNumber(payload.operational?.queued),
    rescheduleRequests: toNumber(payload.operational?.reschedule_requests),
    uncertain: toNumber(payload.operational?.uncertain),
  },
  periodEnd: safeText(payload.period_end, '', 10),
  periodStart: safeText(payload.period_start, '', 10),
  policyVersion: master ? toNumber(payload.policy_version) : null,
  reconciledAt: payload.reconciled_at || null,
  source: safeText(payload.source, 'Supabase', 40),
  status: ['open', 'reconciled', 'closed'].includes(payload.status) ? payload.status : 'open',
  summary: normalizeStatementSummary(payload.summary, { master }),
  tenant: normalizeTenant(payload.tenant),
  version: toNumber(payload.version),
  view: master ? 'master' : 'clinic',
});

const normalizeControl = (payload = {}, { master = false } = {}) => {
  const control = {
    canManageConsent: payload.can_manage_consent === true,
    canWrite: payload.can_write === true,
    channels: (payload.channels || []).map((channel) => ({
      displayName: safeText(channel.display_name, 'Canal WhatsApp', 120),
      id: channel.id || '',
      provider: safeText(channel.provider, '', 40),
      status: safeText(channel.status, '', 40),
    })),
    clinicBilling: {
      allowOverage: payload.clinic_billing?.allow_overage === true,
      billingMode: safeText(payload.clinic_billing?.billing_mode, 'included_overage', 40),
      currency: safeText(payload.clinic_billing?.currency, 'BRL', 3),
      customerOverageUnitMicros: toNumber(payload.clinic_billing?.customer_overage_unit_micros),
      includedDeliveredMessages: toNumber(payload.clinic_billing?.included_delivered_messages),
      status: safeText(payload.clinic_billing?.status, 'disabled', 40),
    },
    consentPatients: (payload.consent_patients || []).map((patient) => ({
      consentSource: safeText(patient.consent_source, '', 30) || null,
      consentStatus: safeText(patient.consent_status, 'unknown', 20),
      consentUpdatedAt: patient.consent_updated_at || null,
      id: patient.id || '',
      name: safeText(patient.name, 'Paciente', 120),
      phoneConfigured: patient.phone_configured === true,
      phoneMask: safeText(patient.phone_mask, '', 20),
      status: safeText(patient.status, '', 40),
    })),
    pendingOrUncertainJobs: toNumber(payload.pending_or_uncertain_jobs),
    readiness: {
      appointmentsModule: payload.readiness?.appointments_module === true,
      billingPolicy: payload.readiness?.billing_policy === true,
      channel: payload.readiness?.channel === true,
      consentedPatients: toNumber(payload.readiness?.consented_patients),
      cronSecret: payload.readiness?.cron_secret === true,
      omnichannelModule: payload.readiness?.omnichannel_module === true,
      providerCredential: payload.readiness?.provider_credential === true,
      ready: payload.readiness?.ready === true,
      runtime: payload.readiness?.runtime === true,
      sendGate: payload.readiness?.send_gate === true,
      template: payload.readiness?.template === true,
      tenantAllowed: payload.readiness?.tenant_allowed === true,
    },
    settings: normalizeSettings(payload.settings),
    source: safeText(payload.source, 'Supabase', 40),
    templates: (payload.templates || []).map((template) => ({
      bodyPreview: safeText(template.body_preview, '', 400) || null,
      category: safeText(template.category, '', 40),
      channelId: template.channel_id || '',
      componentContract: safeText(template.component_contract, '', 80),
      id: template.id || '',
      languageCode: safeText(template.language_code, 'pt_BR', 12),
      providerTemplateIdConfigured: template.provider_template_id_configured === true,
      status: safeText(template.status, '', 40),
      templateName: safeText(template.template_name, '', 120),
      updatedAt: template.updated_at || null,
    })),
    tenant: normalizeTenant(payload.tenant),
    usage: payload.usage ? normalizeUsage(payload.usage) : null,
  };
  if (!master) return control;
  return {
    ...control,
    master: {
      policy: {
        allowOverage: payload.master?.policy?.allow_overage === true,
        billingMode: safeText(payload.master?.policy?.billing_mode, 'included_overage', 40),
        commercialRateStrategy: safeText(payload.master?.policy?.commercial_rate_strategy, 'fixed_overage', 40),
        currency: safeText(payload.master?.policy?.currency, 'BRL', 3),
        fixedOverageMicros: toNumber(payload.master?.policy?.fixed_overage_micros),
        includedDeliveredMessages: toNumber(payload.master?.policy?.included_delivered_messages),
        markupBasisPoints: toNumber(payload.master?.policy?.markup_basis_points),
        monthlyHardCapMicros: toNullableNumber(payload.master?.policy?.monthly_hard_cap_micros),
        monthlyMessageHardCap: toNullableNumber(payload.master?.policy?.monthly_message_hard_cap),
        monthlyProviderCostHardCapMicros: toNullableNumber(payload.master?.policy?.monthly_provider_cost_hard_cap_micros),
        policyVersion: toNumber(payload.master?.policy?.policy_version),
        status: safeText(payload.master?.policy?.status, 'disabled', 40),
      },
      rateCards: (payload.master?.rate_cards || []).map((rate) => ({
        category: safeText(rate.category, '', 40),
        currency: safeText(rate.currency, 'BRL', 3),
        effectiveFrom: rate.effective_from || null,
        effectiveTo: rate.effective_to || null,
        id: rate.id || '',
        marketCode: safeText(rate.market_code, '', 2),
        provider: safeText(rate.provider, '', 40),
        providerCostMicros: toNumber(rate.provider_cost_micros),
        sourceReference: safeText(rate.source_reference, '', 180) || null,
        status: safeText(rate.status, 'draft', 20),
        updatedAt: rate.updated_at || null,
      })),
      runtime: {
        cronSecretConfigured: payload.master?.runtime?.cron_secret_configured === true,
        providerCredentialConfigured: payload.master?.runtime?.provider_credential_configured === true,
        runtimeEnabled: payload.master?.runtime?.runtime_enabled === true,
        sendEnabled: payload.master?.runtime?.send_enabled === true,
        tenantAllowed: payload.master?.runtime?.tenant_allowed === true,
      },
      usage: {
        ...normalizeUsage(payload.master?.usage),
        providerCostMicros: toNumber(payload.master?.usage?.provider_cost_micros),
        reservedProviderCostMicros: toNumber(payload.master?.usage?.reserved_provider_cost_micros),
      },
    },
    platformRoleCodes: (payload.platform_role_codes || []).map((item) => safeText(item, '', 80)).filter(Boolean),
    tenants: (payload.tenants || []).map(normalizeTenant),
  };
};

const normalizeProviderTemplateInspection = (payload = {}) => ({
  channel: {
    displayName: safeText(payload.channel?.display_name, 'Canal WhatsApp', 120),
    id: payload.channel?.id || '',
  },
  source: safeText(payload.source, 'Meta WhatsApp', 40),
  templates: (payload.provider_templates || []).slice(0, 300).map((template) => ({
    category: safeText(template.category, '', 30),
    contractCompatible: template.contract_compatible === true,
    contractIssues: (template.contract_issues || []).map((item) => safeText(item, '', 80)).filter(Boolean),
    languageCode: safeText(template.language_code, '', 12),
    providerTemplateId: safeText(template.provider_template_id, '', 180),
    status: safeText(template.status, '', 30),
    templateName: safeText(template.template_name, '', 120),
  })),
  tenant: normalizeTenant(payload.tenant),
  verifiedAt: payload.verified_at || null,
});

const invokeAdmin = async (body) => {
  if (!hasSupabase()) throw new Error('Supabase não configurado para confirmações de consulta.');
  const { data, error } = await supabase.functions.invoke('appointment-confirmation-admin', { body });
  if (data?.error?.code) {
    throw new Error(ADMIN_ERROR_MESSAGES[data.error.code] || 'A validação server-side bloqueou esta alteração.');
  }
  if (error) throw new Error('Não foi possível acessar o controle de confirmações.');
  return data;
};

export const getClinicAppointmentConfirmationControl = async ({ tenantId, tenantSlug } = {}) => {
  if (!hasSupabase()) return getMockClinicAppointmentConfirmationControl({ tenantId, tenantSlug });
  try {
    const data = await invokeAdmin({ action: 'get_clinic_control', tenant_id: tenantId, tenant_slug: tenantSlug });
    return normalizeControl(data);
  } catch {
    return { ...await getMockClinicAppointmentConfirmationControl({ tenantId, tenantSlug }), source: 'Fallback demo' };
  }
};

export const getMasterAppointmentConfirmationControl = async ({ tenantId, tenantSlug } = {}) => {
  if (!hasSupabase()) return getMockMasterAppointmentConfirmationControl({ tenantId, tenantSlug });
  try {
    const data = await invokeAdmin({ action: 'get_master_control', tenant_id: tenantId, tenant_slug: tenantSlug });
    return normalizeControl(data, { master: true });
  } catch {
    return { ...await getMockMasterAppointmentConfirmationControl({ tenantId, tenantSlug }), source: 'Fallback demo' };
  }
};

export const getClinicWhatsAppMonthlyStatement = async ({ periodStart, tenantId, tenantSlug } = {}) => {
  if (!hasSupabase()) return getMockClinicWhatsAppMonthlyStatement({ periodStart, tenantId, tenantSlug });
  const data = await invokeAdmin({
    action: 'get_clinic_monthly_statement',
    period_start: periodStart,
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
  });
  return normalizeMonthlyStatement(data);
};

export const getMasterWhatsAppMonthlyStatement = async ({ periodStart, tenantId, tenantSlug } = {}) => {
  if (!hasSupabase()) return getMockMasterWhatsAppMonthlyStatement({ periodStart, tenantId, tenantSlug });
  const data = await invokeAdmin({
    action: 'get_master_monthly_statement',
    period_start: periodStart,
    tenant_id: tenantId,
    tenant_slug: tenantSlug,
  });
  return normalizeMonthlyStatement(data, { master: true });
};

export const updateClinicAppointmentConfirmationSettings = async (payload = {}) => {
  if (!hasSupabase()) return updateMockClinicAppointmentConfirmationSettings(payload);
  const data = await invokeAdmin({
    action: 'update_clinic_settings',
    budget_action: payload.budgetAction,
    channel_id: payload.channelId,
    confirmation: payload.enabled ? CLINIC_APPOINTMENT_CONFIRMATION_ACTIVATION : undefined,
    eligible_statuses: payload.eligibleStatuses,
    enabled: payload.enabled === true,
    lead_minutes: payload.leadMinutes,
    monthly_budget_micros: payload.monthlyBudgetMicros,
    monthly_message_limit: payload.monthlyMessageLimit,
    send_window_end: payload.sendWindowEnd,
    send_window_start: payload.sendWindowStart,
    template_id: payload.templateId,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data);
};

export const recordPatientChannelConsent = async (payload = {}) => {
  if (!hasSupabase()) return recordMockPatientChannelConsent(payload);
  const data = await invokeAdmin({
    action: 'record_patient_consent',
    confirmation: payload.status === 'opted_in' ? 'REGISTRAR_CONSENTIMENTO_WHATSAPP' : undefined,
    patient_id: payload.patientId,
    proof_reference: payload.proofReference,
    source: payload.source || 'clinic_recorded',
    status: payload.status,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data);
};

export const updateTenantWhatsAppBillingPolicy = async (payload = {}) => {
  if (!hasSupabase()) return updateMockTenantWhatsAppBillingPolicy(payload);
  const data = await invokeAdmin({
    action: 'update_billing_policy',
    allow_overage: payload.allowOverage === true,
    billing_mode: payload.billingMode,
    commercial_rate_strategy: payload.commercialRateStrategy,
    confirmation: payload.status === 'active' ? MASTER_WHATSAPP_BILLING_ACTIVATION : undefined,
    fixed_overage_micros: payload.fixedOverageMicros,
    included_delivered_messages: payload.includedDeliveredMessages,
    markup_basis_points: payload.markupBasisPoints,
    monthly_hard_cap_micros: payload.monthlyHardCapMicros,
    monthly_message_hard_cap: payload.monthlyMessageHardCap,
    monthly_provider_cost_hard_cap_micros: payload.monthlyProviderCostHardCapMicros,
    status: payload.status,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data, { master: true });
};

export const saveAppointmentConfirmationTemplate = async (payload = {}) => {
  if (!hasSupabase()) return saveMockAppointmentConfirmationTemplate(payload);
  const data = await invokeAdmin({
    action: 'save_template',
    channel_id: payload.channelId,
    language_code: payload.languageCode,
    provider_template_id: payload.providerTemplateId,
    status: payload.status,
    template_id: payload.templateId,
    template_name: payload.templateName,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data, { master: true });
};

export const inspectAppointmentConfirmationProviderTemplates = async (payload = {}) => {
  if (!hasSupabase()) {
    return {
      channel: { displayName: 'Canal WhatsApp', id: payload.channelId || '' },
      source: 'Fallback demo',
      templates: [],
      tenant: normalizeTenant(),
      verifiedAt: null,
    };
  }
  const data = await invokeAdmin({
    action: 'inspect_provider_templates',
    channel_id: payload.channelId,
    tenant_id: payload.tenantId,
  });
  return normalizeProviderTemplateInspection(data);
};

export const syncAppointmentConfirmationProviderTemplate = async (payload = {}) => {
  if (!hasSupabase()) return saveMockAppointmentConfirmationTemplate(payload);
  const data = await invokeAdmin({
    action: 'sync_provider_template',
    channel_id: payload.channelId,
    confirmation: MASTER_WHATSAPP_TEMPLATE_SYNC,
    provider_template_id: payload.providerTemplateId,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data, { master: true });
};

export const saveAppointmentConfirmationRateCard = async (payload = {}) => {
  if (!hasSupabase()) return saveMockAppointmentConfirmationRateCard(payload);
  const data = await invokeAdmin({
    action: 'save_rate_card',
    confirmation: payload.status === 'active' ? MASTER_WHATSAPP_RATE_ACTIVATION : undefined,
    currency: payload.currency || 'BRL',
    effective_from: payload.effectiveFrom,
    market_code: payload.marketCode,
    provider_cost_micros: payload.providerCostMicros,
    source_reference: payload.sourceReference,
    status: payload.status,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data, { master: true });
};

export const emergencyStopAppointmentConfirmations = async (payload = {}) => {
  if (!hasSupabase()) return emergencyStopMockAppointmentConfirmations(payload);
  const data = await invokeAdmin({
    action: 'emergency_stop',
    confirmation: MASTER_APPOINTMENT_CONFIRMATION_STOP,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data, { master: true });
};

export const reconcileAppointmentConfirmationUsage = async (payload = {}) => {
  if (!hasSupabase()) return reconcileMockAppointmentConfirmationUsage(payload);
  const data = await invokeAdmin({
    action: 'reconcile_usage',
    confirmation: 'RECONCILIAR_CUSTO_WHATSAPP',
    customer_charge_delta_micros: payload.customerChargeDeltaMicros,
    event_key_hash: payload.eventKeyHash,
    job_id: payload.jobId,
    provider_cost_delta_micros: payload.providerCostDeltaMicros,
    reason_code: payload.reasonCode,
    tenant_id: payload.tenantId,
  });
  return normalizeControl(data, { master: true });
};

export const reconcileWhatsAppMonthlyStatement = async (payload = {}) => {
  if (!hasSupabase()) return reconcileMockWhatsAppMonthlyStatement(payload);
  const data = await invokeAdmin({
    action: 'reconcile_monthly_statement',
    confirmation: MASTER_WHATSAPP_STATEMENT_RECONCILIATION,
    period_start: payload.periodStart,
    tenant_id: payload.tenantId,
  });
  return normalizeMonthlyStatement(data, { master: true });
};

export const closeWhatsAppMonthlyStatement = async (payload = {}) => {
  if (!hasSupabase()) return closeMockWhatsAppMonthlyStatement(payload);
  const data = await invokeAdmin({
    action: 'close_monthly_statement',
    confirmation: MASTER_WHATSAPP_STATEMENT_CLOSE,
    period_start: payload.periodStart,
    tenant_id: payload.tenantId,
  });
  return normalizeMonthlyStatement(data, { master: true });
};
