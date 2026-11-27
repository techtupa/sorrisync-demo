import { supabase } from '@/lib/supabaseClient.js';
import { clinicalProtocolTemplateErrorMessage, validateProtocolApplicationMapping } from '../clinicalProtocolTemplateContract.js';
import { projectClinicalProtocolReceptionQueue } from '../clinicalProtocolReceptionContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requireUuid = (value) => {
  if (!uuidPattern.test(String(value || ''))) throw new Error('SS_PROTOCOL_INPUT_INVALID');
};
const unwrap = (response) => {
  if (response.error) {
    response.error.userMessage = clinicalProtocolTemplateErrorMessage(response.error);
    throw response.error;
  }
  return response.data;
};

export const fetchPatientClinicalProtocol = async (tenantId, planId) => {
  requireUuid(tenantId);
  requireUuid(planId);
  const [plan, protocol] = await Promise.all([
    supabase.from('patient_treatment_plans').select('id, updated_at')
      .eq('tenant_id', tenantId).eq('id', planId).single(),
    supabase.from('patient_clinical_protocols')
      .select('id, title, status, revision, template_version_id, created_at')
      .eq('tenant_id', tenantId).eq('treatment_plan_id', planId).maybeSingle(),
  ]);
  const planRow = unwrap(plan);
  const protocolRow = unwrap(protocol);
  if (!protocolRow) return { planUpdatedAt: planRow.updated_at, protocol: null, phases: [], steps: [], revisions: [], waivers: [], stepSessions: [], releases: [], visits: [], visitItems: [] };
  const [phases, steps, revisions, waivers, stepSessions, releases, visits, visitItems] = await Promise.all([
    supabase.from('patient_clinical_protocol_phases')
      .select('id, position, title').eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id)
      .order('position'),
    supabase.from('patient_clinical_protocol_steps')
      .select('id, phase_id, treatment_plan_item_id, depends_on_step_id, position, title, duration_minutes, min_interval_days, criteria, status')
      .eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id).order('position'),
    supabase.from('patient_clinical_protocol_revisions')
      .select('id, revision, action_code, created_at')
      .eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id).order('revision', { ascending: false }),
    supabase.from('clinical_protocol_criterion_waivers')
      .select('id, step_id, criterion_code, created_at')
      .eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id),
    supabase.from('clinical_protocol_step_sessions')
      .select('session_id, step_id, created_at')
      .eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id),
    supabase.from('clinical_protocol_schedule_releases')
      .select('id, step_id, professional_id, duration_minutes, window_starts_at, window_ends_at, state, version, booking_link_id, visit_id, created_at')
      .eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id).order('created_at', { ascending: false }),
    supabase.from('clinical_protocol_visits')
      .select('id, state, version, duration_minutes, window_starts_at, window_ends_at, appointment_id, professional_id, clinical_record_entry_id')
      .eq('tenant_id', tenantId).eq('protocol_id', protocolRow.id).order('created_at', { ascending: false }),
    supabase.from('clinical_protocol_visit_items')
      .select('visit_id, release_id, step_id, treatment_plan_item_id, appointment_link_id, session_id')
      .eq('tenant_id', tenantId),
  ]);
  return {
    planUpdatedAt: planRow.updated_at,
    protocol: protocolRow,
    phases: unwrap(phases) || [],
    steps: unwrap(steps) || [],
    revisions: unwrap(revisions) || [],
    waivers: unwrap(waivers) || [],
    stepSessions: unwrap(stepSessions) || [],
    releases: unwrap(releases) || [],
    visits: unwrap(visits) || [],
    visitItems: (unwrap(visitItems) || []).filter((item) => (unwrap(visits) || []).some((visit) => visit.id === item.visit_id)),
  };
};

export const groupClinicalProtocolReleases = async ({ releaseIds, expectedRevision, durationMinutes, requestId }) => {
  releaseIds.forEach(requireUuid);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('group_clinical_protocol_releases', {
    p_release_ids: releaseIds, p_expected_revision: expectedRevision,
    p_duration_minutes: durationMinutes, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const revokeClinicalProtocolGroupedVisit = async ({ visitId, expectedRevision, requestId }) => {
  [visitId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('revoke_clinical_protocol_grouped_visit', {
    p_visit_id: visitId, p_expected_revision: expectedRevision, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const fetchClinicalProtocolVisitDraft = async (tenantId, visitId) => {
  [tenantId, visitId].forEach(requireUuid);
  return unwrap(await supabase.from('clinical_protocol_visit_drafts')
    .select('id, content, results, version, state, updated_at')
    .eq('tenant_id', tenantId).eq('visit_id', visitId).maybeSingle());
};

export const saveClinicalProtocolVisitDraft = async ({ visitId, content, results, expectedVersion, requestId }) => {
  [visitId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('save_clinical_protocol_visit_draft', {
    p_visit_id: visitId, p_content: content, p_results: results,
    p_expected_version: expectedVersion ?? null, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const discardClinicalProtocolVisitDraft = async ({ draftId, expectedVersion, requestId }) => {
  [draftId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('discard_clinical_protocol_visit_draft', {
    p_draft_id: draftId, p_expected_version: expectedVersion, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const finalizeClinicalProtocolGroupedVisit = async ({ draftId, expectedVersion, requestId }) => {
  [draftId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('finalize_clinical_protocol_grouped_visit', {
    p_draft_id: draftId, p_expected_version: expectedVersion, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const releaseClinicalProtocolStep = async ({ stepId, expectedRevision, durationMinutes,
  professionalId, windowStartsAt, windowEndsAt, requestId }) => {
  [stepId, professionalId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('release_clinical_protocol_step', {
    p_step_id: stepId, p_expected_revision: expectedRevision,
    p_duration_minutes: durationMinutes, p_professional_id: professionalId,
    p_window_starts_at: windowStartsAt, p_window_ends_at: windowEndsAt,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const revokeClinicalProtocolStepRelease = async ({ releaseId, expectedRevision, requestId }) => {
  [releaseId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('revoke_clinical_protocol_step_release', {
    p_release_id: releaseId, p_expected_revision: expectedRevision, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const fetchClinicalProtocolReceptionQueue = async (tenantId) => {
  requireUuid(tenantId);
  return projectClinicalProtocolReceptionQueue(unwrap(await supabase.rpc(
    'get_clinical_protocol_reception_queue_v2', { p_tenant_id: tenantId },
  )));
};

export const scheduleClinicalProtocolGroupedVisit = async ({ visitId, expectedVersion,
  startsAt, roomId, requestId }) => {
  [visitId, roomId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('schedule_clinical_protocol_grouped_visit', {
    p_visit_id: visitId, p_expected_version: expectedVersion,
    p_starts_at: startsAt, p_room_id: roomId, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const fetchClinicalProtocolReceptionRooms = async (tenantId) => {
  requireUuid(tenantId);
  return unwrap(await supabase.from('rooms').select('id, name:display_name')
    .eq('tenant_id', tenantId).eq('status', 'active').order('display_name')) || [];
};

export const fetchClinicalProtocolReceptionSlots = async ({ membershipId, date,
  professionalId, roomId, durationMinutes }) => {
  [membershipId, professionalId, roomId].forEach(requireUuid);
  return unwrap(await supabase.rpc('list_available_appointment_slots', {
    p_actor_membership_id: membershipId, p_date: date,
    p_professional_id: professionalId, p_room_id: roomId,
    p_duration_minutes: durationMinutes, p_limit: 30,
    p_exclude_appointment_id: null,
  })) || [];
};

export const scheduleClinicalProtocolReleasedStep = async ({ releaseId, expectedVersion,
  startsAt, roomId, requestId }) => {
  [releaseId, roomId, requestId].forEach(requireUuid);
  const rows = unwrap(await supabase.rpc('schedule_clinical_protocol_released_step', {
    p_release_id: releaseId, p_expected_version: expectedVersion,
    p_starts_at: startsAt, p_room_id: roomId, p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const revisePatientClinicalProtocol = async ({ protocolId, expectedRevision, updates, requestId }) => {
  requireUuid(protocolId);
  requireUuid(requestId);
  if (!Number.isInteger(expectedRevision) || !Array.isArray(updates) || updates.length < 1 || updates.length > 100) {
    throw new Error('SS_PROTOCOL_INPUT_INVALID');
  }
  const rows = unwrap(await supabase.rpc('revise_patient_clinical_protocol', {
    p_protocol_id: protocolId,
    p_expected_revision: expectedRevision,
    p_updates: updates,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const fetchClinicalProtocolSessionDraft = async (tenantId, stepId, appointmentLinkId) => {
  requireUuid(tenantId);
  requireUuid(stepId);
  requireUuid(appointmentLinkId);
  const response = await supabase.from('clinical_protocol_session_drafts')
    .select('id, content, outcome_code, manual_confirmation, complete_step, complete_item, version, state, updated_at')
    .eq('tenant_id', tenantId).eq('step_id', stepId)
    .eq('appointment_link_id', appointmentLinkId).maybeSingle();
  return unwrap(response);
};

export const saveClinicalProtocolSessionDraft = async ({ stepId, appointmentLinkId, content,
  outcomeCode, manualConfirmation, completeStep, completeItem, expectedVersion, requestId }) => {
  requireUuid(stepId);
  requireUuid(appointmentLinkId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('save_clinical_protocol_session_draft', {
    p_step_id: stepId,
    p_appointment_link_id: appointmentLinkId,
    p_content: content,
    p_outcome_code: outcomeCode || null,
    p_manual_confirmation: Boolean(manualConfirmation),
    p_complete_step: Boolean(completeStep),
    p_complete_item: Boolean(completeItem),
    p_expected_version: expectedVersion ?? null,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const discardClinicalProtocolSessionDraft = async ({ draftId, expectedVersion, requestId }) => {
  requireUuid(draftId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('discard_clinical_protocol_session_draft', {
    p_draft_id: draftId,
    p_expected_version: expectedVersion,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const finalizeClinicalProtocolSession = async ({ draftId, expectedVersion, requestId }) => {
  requireUuid(draftId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('finalize_clinical_protocol_session', {
    p_draft_id: draftId,
    p_expected_version: expectedVersion,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const waiveClinicalProtocolCriterion = async ({ stepId, criterionCode, expectedRevision, justification, requestId }) => {
  requireUuid(stepId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('waive_clinical_protocol_criterion', {
    p_step_id: stepId,
    p_criterion_code: criterionCode,
    p_expected_revision: expectedRevision,
    p_justification: justification,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const waivePatientClinicalProtocolStep = async ({ stepId, expectedRevision, justification, requestId }) => {
  requireUuid(stepId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('waive_patient_clinical_protocol_step', {
    p_step_id: stepId,
    p_expected_revision: expectedRevision,
    p_justification: justification,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const setPatientClinicalProtocolPause = async ({ protocolId, pause, expectedRevision, requestId }) => {
  requireUuid(protocolId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('set_patient_clinical_protocol_pause', {
    p_protocol_id: protocolId,
    p_pause: Boolean(pause),
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const completePatientClinicalProtocol = async ({ protocolId, expectedRevision, requestId }) => {
  requireUuid(protocolId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('complete_patient_clinical_protocol', {
    p_protocol_id: protocolId,
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const cancelPatientClinicalProtocol = async ({ protocolId, reasonCode, expectedRevision, requestId }) => {
  requireUuid(protocolId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('cancel_patient_clinical_protocol', {
    p_protocol_id: protocolId,
    p_reason_code: reasonCode,
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const completeClinicalProtocolItem = async ({ itemId, expectedRevision, requestId }) => {
  requireUuid(itemId);
  requireUuid(requestId);
  const rows = unwrap(await supabase.rpc('complete_clinical_protocol_item', {
    p_item_id: itemId,
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};

export const applyPatientClinicalProtocol = async ({ planId, versionId, mapping, definition, plannedItemIds, expectedPlanUpdatedAt, requestId }) => {
  requireUuid(planId);
  requireUuid(versionId);
  requireUuid(requestId);
  const validation = validateProtocolApplicationMapping(definition, mapping, plannedItemIds);
  if (!validation.valid || !expectedPlanUpdatedAt) {
    throw new Error('SS_PROTOCOL_INPUT_INVALID');
  }
  const rows = unwrap(await supabase.rpc('apply_patient_clinical_protocol', {
    p_plan_id: planId,
    p_version_id: versionId,
    p_mapping: mapping,
    p_expected_plan_updated_at: expectedPlanUpdatedAt,
    p_request_id: requestId,
  }));
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return rows[0];
};
