import { supabase } from '@/lib/supabaseClient.js';
import { clinicalRecordErrorMessage, validateClinicalContent } from '../clinicalRecordContract.js';

const requireUuid = (value, code) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))) {
    const error = new Error(code);
    error.code = '22023';
    throw error;
  }
};
const unwrapRows = (response) => {
  if (response.error) {
    response.error.userMessage = clinicalRecordErrorMessage(response.error);
    throw response.error;
  }
  return Array.isArray(response.data) ? response.data : [];
};

const unwrapRow = (response) => {
  const rows = unwrapRows(response);
  if (rows.length !== 1) throw new Error('SS_CLINICAL_EMPTY_MUTATION_RESULT');
  return rows[0];
};

export const fetchClinicalRecordTimeline = async (patientId) => {
  requireUuid(patientId, 'SS_CLINICAL_PATIENT_REQUIRED');
  return unwrapRows(await supabase.rpc('get_clinical_record_timeline', { p_patient_id: patientId }));
};

export const appendClinicalRecordEntry = async ({ patientId, requestId, content }) => {
  requireUuid(patientId, 'SS_CLINICAL_PATIENT_REQUIRED');
  requireUuid(requestId, 'SS_CLINICAL_REQUEST_REQUIRED');
  const validation = validateClinicalContent(content);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  return unwrapRow(await supabase.rpc('append_clinical_record_entry', {
    p_patient_id: patientId,
    p_request_id: requestId,
    p_content: validation.content,
  }));
};

export const appendClinicalRecordAddendum = async ({ targetEntryId, requestId, content }) => {
  requireUuid(targetEntryId, 'SS_CLINICAL_TARGET_REQUIRED');
  requireUuid(requestId, 'SS_CLINICAL_REQUEST_REQUIRED');
  const validation = validateClinicalContent(content);
  if (!validation.valid) {
    const error = new Error(validation.message);
    error.code = '22023';
    error.userMessage = validation.message;
    throw error;
  }
  return unwrapRow(await supabase.rpc('append_clinical_record_addendum', {
    p_target_entry_id: targetEntryId,
    p_request_id: requestId,
    p_content: validation.content,
  }));
};
