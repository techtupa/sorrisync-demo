import { validateClinicalContent } from './clinicalRecordContract.js';

export const TREATMENT_EXECUTION_OUTCOMES = Object.freeze(['performed', 'partially_performed']);
export const TREATMENT_EXECUTION_OUTCOME_LABELS = Object.freeze({
  performed: 'Procedimento realizado nesta sessão',
  partially_performed: 'Procedimento realizado parcialmente',
  not_performed: 'Procedimento não realizado',
});

export const isTreatmentExecutionOutcome = (value) => TREATMENT_EXECUTION_OUTCOMES.includes(String(value || ''));

export const validateTreatmentExecutionSessionInput = ({ appointmentLinkId, requestId, outcomeCode, clinicalContent } = {}) => {
  if (!appointmentLinkId || !requestId || !isTreatmentExecutionOutcome(outcomeCode)) {
    return { valid: false, clinicalContent: '', message: 'Selecione o resultado e confirme uma consulta finalizada válida.' };
  }
  const contentValidation = validateClinicalContent(clinicalContent);
  return {
    valid: contentValidation.valid,
    clinicalContent: contentValidation.content,
    message: contentValidation.message,
  };
};

const mapSession = (row) => ({
  id: row.session_id,
  appointmentLinkId: row.treatment_plan_item_appointment_id,
  itemId: row.treatment_plan_item_id,
  appointmentId: row.appointment_id,
  clinicalEntryReference: row.clinical_record_entry_id,
  outcomeCode: row.outcome_code,
  outcomeLabel: TREATMENT_EXECUTION_OUTCOME_LABELS[row.outcome_code] || 'Resultado indisponível',
  performedAt: row.performed_at,
  recordedByDisplayName: row.recorded_by_display_name || 'Profissional da clínica',
  mutationResult: row.mutation_result || null,
});

export const buildTreatmentExecutionSessionsReadModel = (
  sessionRows = [],
  linkedAppointments = [],
  scheduleEligibilityByItem = {},
) => {
  const sessions = (Array.isArray(sessionRows) ? sessionRows : [])
    .filter((row) => row?.session_id && row?.treatment_plan_item_appointment_id)
    .map(mapSession)
    .sort((left, right) => String(left.performedAt).localeCompare(String(right.performedAt)));
  const sessionsByItem = {};
  const sessionsByAppointmentLink = {};
  for (const session of sessions) {
    sessionsByItem[session.itemId] ||= [];
    sessionsByItem[session.itemId].push(session);
    sessionsByAppointmentLink[session.appointmentLinkId] = session;
  }

  const safeLinks = Array.isArray(linkedAppointments) ? linkedAppointments : [];
  const linkedAppointmentsByItem = {};
  for (const appointmentLink of safeLinks) {
    linkedAppointmentsByItem[appointmentLink.itemId] ||= [];
    linkedAppointmentsByItem[appointmentLink.itemId].push(appointmentLink);
  }
  const finalizedAppointmentsWithoutSession = safeLinks.filter(
    (link) => link.status === 'Finalizada' && link.linkId && !sessionsByAppointmentLink[link.linkId],
  );
  const canRecordSession = Object.fromEntries(
    safeLinks.map((link) => [link.linkId, link.status === 'Finalizada' && !sessionsByAppointmentLink[link.linkId]]),
  );
  const canScheduleNextSession = Object.fromEntries(
    Object.entries(scheduleEligibilityByItem || {}).map(([itemId, eligibility]) => [itemId, Boolean(eligibility?.canSchedule)]),
  );
  const sessionCountByItem = Object.fromEntries(
    Object.entries(sessionsByItem).map(([itemId, itemSessions]) => [itemId, itemSessions.length]),
  );
  const latestSessionAt = sessions.at(-1)?.performedAt || null;

  return {
    linkedAppointments: safeLinks,
    linkedAppointmentsByItem,
    finalizedAppointmentsWithoutSession,
    sessions,
    sessionsByItem,
    sessionsByAppointmentLink,
    sessionCountByItem,
    canRecordSession,
    canScheduleNextSession,
    latestSessionAt,
    clinicalEntryReference: sessions.at(-1)?.clinicalEntryReference || null,
  };
};

export const treatmentExecutionSessionErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('APPOINTMENT_NOT_FINALIZED')) return 'A sessão só pode ser registrada depois que a consulta estiver Finalizada.';
  if (code.includes('ALREADY_RECORDED')) return 'Esta consulta já possui uma sessão clínica registrada.';
  if (code.includes('ITEM_NOT_PLANNED') || code.includes('PLAN_NOT_ACTIVE')) return 'O item ou o plano não está mais elegível para registrar esta sessão.';
  if (code.includes('ACCEPTED_QUOTE')) return 'A sessão exige o vínculo histórico com um orçamento aceito.';
  if (code.includes('CONTENT_INVALID')) return 'A evolução clínica deve conter entre 5 e 5.000 caracteres em texto simples.';
  if (code.includes('REQUEST_ID_CONFLICT') || code.includes('CONCURRENT_CONFLICT') || code === '23505') return 'A sessão entrou em conflito com outra operação. Atualize o plano.';
  if (code.includes('ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui as permissões clínicas necessárias para registrar esta sessão.';
  if (code.includes('INPUT_INVALID') || code === '22023') return 'Os dados da sessão clínica são inválidos.';
  return 'Não foi possível registrar a sessão clínica agora.';
};
