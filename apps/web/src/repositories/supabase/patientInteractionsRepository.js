import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  createPatientInteractionByTenant as createMockPatientInteractionByTenant,
  formatInteractionDateLabel,
  getPatientInteractionTimeline as getMockPatientInteractionTimeline,
} from '../mock/patientInteractionsRepository.js';
import { buildPatientOperationalInteractionPayload } from '../patientOperationalInteractionPayload.js';

export { buildPatientOperationalInteractionPayload } from '../patientOperationalInteractionPayload.js';

const SUMMARY_TYPES = new Set(['message_sent', 'lead_created', 'note']);
const JOURNEY_TYPES = new Set(['status_updated', 'budget_generated', 'evaluation_completed', 'lead_created', 'note']);

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const getFallbackTimeline = (patient) => getMockPatientInteractionTimeline(patient);

const buildInitialInteractionPayloads = (tenantId, patient) => {
  const now = new Date().toISOString();
  const occurredAt = patient?.created_at || patient?.lastInteraction || now;

  return [
    {
      tenant_id: tenantId,
      patient_id: patient.id,
      source_key: 'lead_created',
      interaction_type: 'lead_created',
      title: 'Lead capturado',
      description: `Origem: ${patient.origin || 'CRM'}`,
      icon_type: 'user',
      channel: 'CRM',
      occurred_at: occurredAt,
      metadata: {
        source: 'crm_new_patient_modal',
        demo: false,
      },
    },
    {
      tenant_id: tenantId,
      patient_id: patient.id,
      source_key: 'status_updated',
      interaction_type: 'status_updated',
      title: 'Status atualizado',
      description: `Movido para: ${patient.status || 'Novo lead'}`,
      icon_type: 'check',
      channel: 'CRM',
      occurred_at: occurredAt,
      metadata: {
        source: 'crm_new_patient_modal',
        demo: false,
      },
    },
  ];
};

const mapInteraction = (interaction) => ({
  id: interaction.id,
  tenant_id: interaction.tenant_id,
  patient_id: interaction.patient_id,
  sourceKey: interaction.source_key,
  type: interaction.interaction_type,
  title: interaction.title,
  description: interaction.description || '',
  iconType: interaction.icon_type || 'user',
  channel: interaction.channel || '',
  occurredAt: interaction.occurred_at,
  date: formatInteractionDateLabel(interaction.occurred_at),
  created_at: interaction.created_at,
  updated_at: interaction.updated_at,
});

const buildTimeline = (interactions, patient) => {
  if (!interactions.length) {
    return getFallbackTimeline(patient);
  }

  const latestInteractions = interactions
    .filter((interaction) => SUMMARY_TYPES.has(interaction.type))
    .slice(0, 2);
  const journeyInteractions = interactions.filter((interaction) => JOURNEY_TYPES.has(interaction.type));

  return {
    latestInteractions: latestInteractions.length ? latestInteractions : getFallbackTimeline(patient).latestInteractions,
    journeyInteractions: journeyInteractions.length ? journeyInteractions : getFallbackTimeline(patient).journeyInteractions,
  };
};

export const fetchPatientInteractionTimeline = async (tenantId, patient) => {
  if (!hasSupabase() || !tenantId || !patient?.id) {
    return getFallbackTimeline(patient);
  }

  const response = await supabase
    .from('patient_interactions')
    .select(`
      id,
      tenant_id,
      patient_id,
      source_key,
      interaction_type,
      title,
      description,
      icon_type,
      channel,
      occurred_at,
      created_at,
      updated_at
    `)
    .eq('tenant_id', tenantId)
    .eq('patient_id', patient.id)
    .order('occurred_at', { ascending: false });

  if (response.error) {
    return getFallbackTimeline(patient);
  }

  return buildTimeline((response.data || []).map(mapInteraction), patient);
};

export const createInitialPatientInteractionsByTenant = async (tenantId, patient) => {
  if (!hasSupabase() || !tenantId || !patient?.id) {
    return [];
  }

  const response = await supabase
    .from('patient_interactions')
    .upsert(buildInitialInteractionPayloads(tenantId, patient), {
      onConflict: 'tenant_id,patient_id,source_key',
    })
    .select(`
      id,
      tenant_id,
      patient_id,
      source_key,
      interaction_type,
      title,
      description,
      icon_type,
      channel,
      occurred_at,
      created_at,
      updated_at
    `);

  if (response.error) {
    throw response.error;
  }

  return (response.data || []).map(mapInteraction);
};

export const createPatientInteractionByTenant = async (tenantId, patientId, interaction = {}) => {
  const payload = buildPatientOperationalInteractionPayload(tenantId, patientId, interaction);

  if (!hasSupabase() || !tenantId) {
    return createMockPatientInteractionByTenant(tenantId, patientId, {
      ...interaction,
      sourceKey: payload.source_key,
      type: payload.interaction_type,
      title: payload.title,
      description: payload.description,
      iconType: payload.icon_type,
      channel: payload.channel,
      occurredAt: payload.occurred_at,
    });
  }

  const response = await supabase
    .from('patient_interactions')
    .insert(payload)
    .select(`
      id,
      tenant_id,
      patient_id,
      source_key,
      interaction_type,
      title,
      description,
      icon_type,
      channel,
      occurred_at,
      created_at,
      updated_at
    `)
    .single();

  if (response.error) {
    throw response.error;
  }

  return mapInteraction(response.data);
};
