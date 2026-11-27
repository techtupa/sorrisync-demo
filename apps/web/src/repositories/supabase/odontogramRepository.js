import { supabase } from '@/lib/supabaseClient.js';
import {
  buildOdontogramReadModel,
  odontogramErrorMessage,
  validateOdontogramFinding,
  validateOdontogramResolution,
} from '../odontogramContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const requireUuid = (value) => {
  if (!uuidPattern.test(String(value || ''))) {
    const error = new Error('SS_ODONTOGRAM_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = odontogramErrorMessage(error);
    throw error;
  }
};

const unwrapRows = (response) => {
  if (response.error) {
    response.error.userMessage = odontogramErrorMessage(response.error);
    throw response.error;
  }
  return Array.isArray(response.data) ? response.data : [];
};

const unwrapRow = (response) => {
  const rows = unwrapRows(response);
  if (rows.length !== 1) throw new Error('SS_ODONTOGRAM_EMPTY_MUTATION_RESULT');
  return rows[0];
};

const requireFinding = (input) => {
  const validation = validateOdontogramFinding(input);
  if (!validation.valid) {
    const error = new Error('SS_ODONTOGRAM_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
};

export const fetchPatientOdontogram = async (patientId) => {
  requireUuid(patientId);
  const rows = unwrapRows(await supabase.rpc('get_patient_odontogram', {
    p_patient_id: patientId,
    p_dentition_type: 'permanent',
  }));
  return buildOdontogramReadModel(rows);
};

export const appendOdontogramFinding = async ({ patientId, requestId, toothCode, surfaceCode, findingCode }) => {
  requireUuid(patientId);
  requireUuid(requestId);
  requireFinding({ toothCode, surfaceCode, findingCode });
  return unwrapRow(await supabase.rpc('append_odontogram_finding', {
    p_patient_id: patientId,
    p_request_id: requestId,
    p_tooth_code: toothCode,
    p_surface_code: surfaceCode,
    p_finding_code: findingCode,
  }));
};

export const resolveOdontogramFinding = async ({ findingId, requestId, reasonCode }) => {
  requireUuid(findingId);
  requireUuid(requestId);
  const validation = validateOdontogramResolution({ findingId, reasonCode });
  if (!validation.valid) {
    const error = new Error('SS_ODONTOGRAM_INPUT_INVALID');
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  return unwrapRow(await supabase.rpc('resolve_odontogram_finding', {
    p_finding_id: findingId,
    p_request_id: requestId,
    p_resolution_reason_code: reasonCode,
  }));
};
