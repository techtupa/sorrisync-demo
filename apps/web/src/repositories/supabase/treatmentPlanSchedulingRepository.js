import { supabase } from '@/lib/supabaseClient.js';
import {
  buildTreatmentPlanSchedulingReadModel,
  treatmentSchedulingErrorMessage,
  validateTreatmentSchedulingInput,
} from '../treatmentPlanSchedulingContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requireUuid = (value) => {
  if (!uuidPattern.test(String(value || ''))) {
    const error = new Error('SS_TREATMENT_SCHEDULING_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = treatmentSchedulingErrorMessage(error);
    throw error;
  }
};
const unwrapRows = (response) => {
  if (response.error) {
    response.error.userMessage = treatmentSchedulingErrorMessage(response.error);
    throw response.error;
  }
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchTreatmentPlanItemAppointments = async (patientId) => {
  requireUuid(patientId);
  return buildTreatmentPlanSchedulingReadModel(unwrapRows(await supabase.rpc(
    'get_treatment_plan_item_appointments',
    { p_patient_id: patientId },
  )));
};

export const scheduleTreatmentPlanItemAppointment = async (input) => {
  const validation = validateTreatmentSchedulingInput(input);
  if (!validation.valid) {
    const error = new Error('SS_TREATMENT_SCHEDULING_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  [input.itemId, input.requestId, input.professionalId, input.roomId].forEach(requireUuid);
  const rows = unwrapRows(await supabase.rpc('schedule_treatment_plan_item_appointment', {
    p_treatment_plan_item_id: input.itemId,
    p_request_id: input.requestId,
    p_starts_at: input.startsAt,
    p_professional_id: input.professionalId,
    p_room_id: input.roomId,
    p_expected_item_updated_at: input.expectedItemUpdatedAt,
  }));
  if (rows.length !== 1) throw new Error('SS_TREATMENT_SCHEDULING_EMPTY_RESULT');
  return rows[0];
};
