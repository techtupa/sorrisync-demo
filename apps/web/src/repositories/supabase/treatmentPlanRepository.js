import { supabase } from '@/lib/supabaseClient.js';
import {
  buildTreatmentPlanReadModel,
  treatmentPlanErrorMessage,
  validateTreatmentPlanCancellation,
  validateTreatmentPlanItem,
} from '../treatmentPlanContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requireUuid = (value, optional = false) => {
  if (optional && !value) return;
  if (!uuidPattern.test(String(value || ''))) {
    const error = new Error('SS_TREATMENT_PLAN_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = treatmentPlanErrorMessage(error);
    throw error;
  }
};

const unwrapRows = (response) => {
  if (response.error) {
    response.error.userMessage = treatmentPlanErrorMessage(response.error);
    throw response.error;
  }
  return Array.isArray(response.data) ? response.data : [];
};

const unwrapRow = (response) => {
  const rows = unwrapRows(response);
  if (rows.length !== 1) throw new Error('SS_TREATMENT_PLAN_EMPTY_MUTATION_RESULT');
  return rows[0];
};

export const fetchPatientTreatmentPlan = async (patientId) => {
  requireUuid(patientId);
  const [planResponse, servicesResponse] = await Promise.all([
    supabase.rpc('get_patient_treatment_plan', { p_patient_id: patientId }),
    supabase.rpc('get_treatment_plan_services', { p_patient_id: patientId }),
  ]);
  return buildTreatmentPlanReadModel(unwrapRows(planResponse), unwrapRows(servicesResponse));
};

export const appendTreatmentPlanItem = async ({
  patientId,
  serviceId,
  toothCode = null,
  surfaceCode = null,
  odontogramFindingId = null,
  priority,
  sequenceNumber,
  requestId,
}) => {
  requireUuid(patientId);
  requireUuid(serviceId);
  requireUuid(odontogramFindingId, true);
  requireUuid(requestId);
  const validation = validateTreatmentPlanItem({ serviceId, toothCode, surfaceCode, priority, sequenceNumber });
  if (!validation.valid) {
    const error = new Error('SS_TREATMENT_PLAN_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  return unwrapRow(await supabase.rpc('append_treatment_plan_item', {
    p_patient_id: patientId,
    p_service_id: serviceId,
    p_tooth_code: toothCode || null,
    p_surface_code: surfaceCode || null,
    p_odontogram_finding_id: odontogramFindingId || null,
    p_priority: priority,
    p_sequence_number: Number(sequenceNumber),
    p_request_id: requestId,
  }));
};

export const completeTreatmentPlanItem = async ({ itemId, requestId }) => {
  requireUuid(itemId);
  requireUuid(requestId);
  return unwrapRow(await supabase.rpc('complete_treatment_plan_item', {
    p_item_id: itemId,
    p_request_id: requestId,
  }));
};

export const cancelTreatmentPlanItem = async ({ itemId, requestId, reasonCode }) => {
  requireUuid(itemId);
  requireUuid(requestId);
  const validation = validateTreatmentPlanCancellation({ itemId, reasonCode });
  if (!validation.valid) {
    const error = new Error('SS_TREATMENT_PLAN_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  return unwrapRow(await supabase.rpc('cancel_treatment_plan_item', {
    p_item_id: itemId,
    p_request_id: requestId,
    p_cancellation_reason_code: reasonCode,
  }));
};
