const ALLOWED_FIELDS = [
  'booking_kind', 'release_id', 'release_version',
  'patient_id', 'patient_name', 'professional_id', 'professional_name',
  'duration_minutes', 'window_starts_at', 'window_ends_at', 'operation_label',
];

export const projectClinicalProtocolReceptionQueue = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => row && ['single', 'grouped'].includes(row.booking_kind))
    .map((row) => Object.fromEntries(ALLOWED_FIELDS.map((field) => [field, row[field] ?? null])));
};

export const validateClinicalProtocolVisitResults = (results, expectedStepIds, criteriaByStepId = {}) => {
  if (!Array.isArray(results) || !Array.isArray(expectedStepIds)
    || results.length !== expectedStepIds.length || results.length < 2
    || new Set(results.map((result) => result?.step_id)).size !== expectedStepIds.length
  ) return false;
  const expected = new Set(expectedStepIds);
  return results.every((result) => (
    expected.has(result?.step_id)
    && ['performed', 'partially_performed', 'not_performed'].includes(result.outcome_code)
    && typeof result.manual_confirmation === 'boolean'
    && typeof result.complete_step === 'boolean'
    && typeof result.complete_item === 'boolean'
    && (!result.complete_step || result.outcome_code === 'performed')
    && (!result.complete_item || result.complete_step)
    && (!criteriaByStepId[result.step_id]?.includes('manual_confirmation')
      || result.manual_confirmation)
  ));
};
