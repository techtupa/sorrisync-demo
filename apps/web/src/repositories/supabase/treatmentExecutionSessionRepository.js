import { supabase } from '@/lib/supabaseClient.js';
import {
  treatmentExecutionSessionErrorMessage,
  validateTreatmentExecutionSessionInput,
} from '../treatmentExecutionSessionContract.js';
import { buildTreatmentPlanSchedulingReadModel } from '../treatmentPlanSchedulingContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requireUuid = (value) => {
  if (!uuidPattern.test(String(value || ''))) {
    const error = new Error('SS_TREATMENT_SESSION_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = treatmentExecutionSessionErrorMessage(error);
    throw error;
  }
};
const unwrapRows = (response) => {
  if (response.error) {
    response.error.userMessage = treatmentExecutionSessionErrorMessage(response.error);
    throw response.error;
  }
  return Array.isArray(response.data) ? response.data : [];
};

export const getTreatmentExecutionSessionsByPatient = async (patientId) => {
  requireUuid(patientId);
  const [sessionResponse, contextResponse] = await Promise.all([
    supabase.rpc('get_treatment_execution_sessions', { p_patient_id: patientId }),
    supabase.rpc('get_treatment_execution_session_contexts', { p_patient_id: patientId }),
  ]);
  return {
    rows: unwrapRows(sessionResponse),
    linkedAppointments: buildTreatmentPlanSchedulingReadModel(unwrapRows(contextResponse)).appointmentLinks,
  };
};

export const recordTreatmentExecutionSessionByAppointmentLink = async (input) => {
  const validation = validateTreatmentExecutionSessionInput(input);
  if (!validation.valid) {
    const error = new Error('SS_TREATMENT_SESSION_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  requireUuid(input.appointmentLinkId);
  requireUuid(input.requestId);
  const rows = unwrapRows(await supabase.rpc('record_treatment_execution_session', {
    p_treatment_plan_item_appointment_id: input.appointmentLinkId,
    p_request_id: input.requestId,
    p_outcome_code: input.outcomeCode,
    p_clinical_content: validation.clinicalContent,
  }));
  if (rows.length !== 1) throw new Error('SS_TREATMENT_SESSION_EMPTY_RESULT');
  return rows[0];
};
