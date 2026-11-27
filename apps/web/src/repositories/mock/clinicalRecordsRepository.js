import { CLINICAL_ENTRY_TYPES, normalizeClinicalContent } from '../clinicalRecordContract.js';

const timelines = new Map([['84000000-0000-4000-8000-000000000001', [{
  record_id: 'portfolio-casey-record', entry_id: 'portfolio-casey-entry',
  entry_type: CLINICAL_ENTRY_TYPES.EVOLUTION, content: 'Fictional consultation. Reviewed the care plan and discussed a follow-up visit.',
  parent_entry_id: null, finalized_at: '2026-11-20T13:00:00Z', author_display_name: 'Dr. Avery Chen',
}]]]);
const requestEntries = new Map();

const now = () => new Date().toISOString();
const row = ({ patientId, requestId, content, type, parentEntryId = null }) => ({
  record_id: `mock-record-${patientId}`,
  entry_id: requestEntries.get(requestId)?.entry_id || `mock-entry-${requestId}`,
  entry_type: type,
  content: normalizeClinicalContent(content),
  parent_entry_id: parentEntryId,
  finalized_at: requestEntries.get(requestId)?.finalized_at || now(),
  author_display_name: 'Profissional demo',
  mutation_result: requestEntries.has(requestId) ? 'idempotent' : 'changed',
});

export const getMockClinicalRecordTimeline = async (patientId) => [...(timelines.get(patientId) || [])];

export const appendMockClinicalRecordEntry = async ({ patientId, requestId, content }) => {
  const result = row({ patientId, requestId, content, type: CLINICAL_ENTRY_TYPES.EVOLUTION });
  if (!requestEntries.has(requestId)) {
    requestEntries.set(requestId, result);
    timelines.set(patientId, [...(timelines.get(patientId) || []), result]);
  }
  return result;
};
export const appendMockClinicalRecordAddendum = async ({ patientId, targetEntryId, requestId, content }) => {
  const result = row({ patientId, requestId, content, type: CLINICAL_ENTRY_TYPES.ADDENDUM, parentEntryId: targetEntryId });
  if (!requestEntries.has(requestId)) {
    requestEntries.set(requestId, result);
    timelines.set(patientId, [...(timelines.get(patientId) || []), result]);
  }
  return result;
};

export const resetMockClinicalRecords = () => {
  timelines.clear();
  requestEntries.clear();
};
