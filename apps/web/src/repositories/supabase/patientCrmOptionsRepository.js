import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { getPatientCrmOptionsByTenant as getMockPatientCrmOptionsByTenant } from '../mock/patientCrmOptionsRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const OPTION_KEYS = {
  status: 'statuses',
  origin: 'origins',
  interest: 'interests',
  responsible: 'responsibles',
};

const buildOptions = (rows = []) => {
  const grouped = {
    statuses: [],
    origins: [],
    interests: [],
    responsibles: [],
  };

  rows.forEach((row) => {
    const key = OPTION_KEYS[row.option_type];
    if (!key || !row.label) return;
    grouped[key].push(row.label);
  });

  return grouped;
};

const mergeWithFallback = (options, fallback) => ({
  statuses: options.statuses.length ? options.statuses : fallback.statuses,
  origins: options.origins.length ? options.origins : fallback.origins,
  interests: options.interests.length ? options.interests : fallback.interests,
  responsibles: options.responsibles.length ? options.responsibles : fallback.responsibles,
});

export const fetchPatientCrmOptionsByTenant = async (tenantId) => {
  const fallback = getMockPatientCrmOptionsByTenant(tenantId);

  if (!hasSupabase() || !tenantId) {
    return fallback;
  }

  const response = await supabase
    .from('patient_crm_options')
    .select('id, tenant_id, option_type, code, label, description, color, icon, is_active, sort_order')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('option_type', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (response.error) {
    return fallback;
  }

  return mergeWithFallback(buildOptions(response.data || []), fallback);
};
