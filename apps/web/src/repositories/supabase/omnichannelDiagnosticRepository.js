import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  fetchOmnichannelPilotDiagnosticByTenant as fetchMockOmnichannelPilotDiagnosticByTenant,
  saveOmnichannelPilotDiagnosticByTenant as saveMockOmnichannelPilotDiagnosticByTenant,
  submitOmnichannelPilotDiagnosticByTenant as submitMockOmnichannelPilotDiagnosticByTenant,
} from '../mock/omnichannelDiagnosticRepository.js';
import {
  buildOmnichannelDiagnosticPayload,
  normalizeOmnichannelDiagnostic,
  validateOmnichannelDiagnosticForSubmit,
} from '../omnichannelDiagnosticContract.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const diagnosticSelect = `
  id,
  tenant_id,
  clinic_name,
  responsible_name,
  responsible_role,
  contact_phone,
  contact_email,
  city,
  state,
  professionals_count,
  attendants_count,
  has_crc,
  whatsapp_numbers_count,
  whatsapp_usage,
  team_structure,
  attendance_responsibilities,
  current_channels,
  future_channels,
  message_volume,
  operational_pains,
  desired_metrics,
  current_flow_description,
  main_pain_description,
  pilot_success_description,
  first_channels_description,
  excluded_channels_description,
  important_rules_description,
  privacy_notes,
  mvp_priority,
  success_criteria,
  status,
  submitted_at,
  reviewed_at,
  created_at,
  updated_at
`;

const getCurrentUserId = async () => {
  if (!hasSupabase()) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;

  return data?.user?.id || null;
};

const assertTenantId = (tenantId) => {
  if (!tenantId) {
    throw new Error('Tenant atual não encontrado para salvar o diagnóstico Omnichannel.');
  }
};

const mapRow = (row) => normalizeOmnichannelDiagnostic({
  ...row,
  source: 'supabase',
});

export const fetchOmnichannelPilotDiagnosticByTenant = async (tenantId) => {
  assertTenantId(tenantId);

  if (!hasSupabase()) {
    return fetchMockOmnichannelPilotDiagnosticByTenant(tenantId);
  }

  const { data, error } = await supabase
    .from('omnichannel_pilot_diagnostics')
    .select(diagnosticSelect)
    .eq('tenant_id', tenantId)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  return data ? mapRow(data) : normalizeOmnichannelDiagnostic();
};

export const saveOmnichannelPilotDiagnosticByTenant = async (tenantId, form) => {
  assertTenantId(tenantId);

  if (!hasSupabase()) {
    return saveMockOmnichannelPilotDiagnosticByTenant(tenantId, form);
  }

  const currentUserId = await getCurrentUserId();
  const payload = {
    ...buildOmnichannelDiagnosticPayload(form, { status: 'draft' }),
    tenant_id: tenantId,
    updated_by: currentUserId,
  };

  const query = form.id
    ? supabase
        .from('omnichannel_pilot_diagnostics')
        .update(payload)
        .eq('tenant_id', tenantId)
        .eq('id', form.id)
    : supabase
        .from('omnichannel_pilot_diagnostics')
        .insert({
          ...payload,
          created_by: currentUserId,
        });

  const { data, error } = await query
    .select(diagnosticSelect)
    .single();

  if (error) throw error;

  return mapRow(data);
};

export const submitOmnichannelPilotDiagnosticByTenant = async (tenantId, form) => {
  assertTenantId(tenantId);

  const validation = validateOmnichannelDiagnosticForSubmit(form);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  if (!hasSupabase()) {
    return submitMockOmnichannelPilotDiagnosticByTenant(tenantId, form);
  }

  const currentUserId = await getCurrentUserId();
  const payload = {
    ...buildOmnichannelDiagnosticPayload(form, { status: 'submitted' }),
    tenant_id: tenantId,
    submitted_at: new Date().toISOString(),
    updated_by: currentUserId,
  };

  const query = form.id
    ? supabase
        .from('omnichannel_pilot_diagnostics')
        .update(payload)
        .eq('tenant_id', tenantId)
        .eq('id', form.id)
    : supabase
        .from('omnichannel_pilot_diagnostics')
        .insert({
          ...payload,
          created_by: currentUserId,
        });

  const { data, error } = await query
    .select(diagnosticSelect)
    .single();

  if (error) throw error;

  return mapRow(data);
};
