import { appendMockClinicalRecordEntry } from './clinicalRecordsRepository.js';
import {
  getMockTreatmentPlanAppointmentLinkContext,
  getMockTreatmentPlanItemAppointments,
  markMockTreatmentPlanAppointmentLinkDocumented,
} from './treatmentPlanSchedulingRepository.js';
import { getMockAcceptedTreatmentQuoteItem } from './treatmentQuoteRepository.js';
import {
  treatmentExecutionSessionErrorMessage,
  validateTreatmentExecutionSessionInput,
} from '../treatmentExecutionSessionContract.js';

const sessions = [];
const requests = new Map();
const requestKey = (tenantId, requestId) => `${tenantId}:${requestId}`;
const fail = (code) => {
  const error = new Error(code);
  error.code = code;
  error.userMessage = treatmentExecutionSessionErrorMessage(error);
  throw error;
};

export const getMockTreatmentExecutionSessionsByPatient = async ({ tenantId, patientId, canRead = true }) => {
  if (!canRead) fail('SS_TREATMENT_SESSION_ACCESS_DENIED');
  const scheduling = await getMockTreatmentPlanItemAppointments({ tenantId, patientId, canRead, canManage: false });
  return {
    rows: sessions.filter((session) => session.tenantId === tenantId && session.patientId === patientId).map((session) => session.row),
    linkedAppointments: scheduling.appointmentLinks,
  };
};

export const recordMockTreatmentExecutionSessionByAppointmentLink = async ({
  tenantId,
  patientId,
  appointmentLinkId,
  requestId,
  outcomeCode,
  clinicalContent,
  canManage = true,
}) => {
  const validation = validateTreatmentExecutionSessionInput({ appointmentLinkId, requestId, outcomeCode, clinicalContent });
  if (!validation.valid) fail(validation.message.includes('texto simples') ? 'SS_TREATMENT_SESSION_CONTENT_INVALID' : 'SS_TREATMENT_SESSION_INPUT_INVALID');
  if (!canManage) fail('SS_TREATMENT_SESSION_ACCESS_DENIED');
  const replay = requests.get(requestKey(tenantId, requestId));
  if (replay) {
    if (replay.appointmentLinkId !== appointmentLinkId || replay.outcomeCode !== outcomeCode || replay.clinicalContent !== validation.clinicalContent) {
      fail('SS_TREATMENT_SESSION_REQUEST_ID_CONFLICT');
    }
    return { ...replay.row, mutation_result: 'idempotent' };
  }
  if (sessions.some((session) => session.tenantId === tenantId && session.appointmentLinkId === appointmentLinkId)) {
    fail('SS_TREATMENT_SESSION_ALREADY_RECORDED');
  }
  const context = getMockTreatmentPlanAppointmentLinkContext({ tenantId, linkId: appointmentLinkId });
  if (!context || context.patientId !== patientId) fail('SS_TREATMENT_SESSION_ACCESS_DENIED');
  if (context.appointment.status !== 'Finalizada') fail('SS_TREATMENT_SESSION_APPOINTMENT_NOT_FINALIZED');
  if (context.plan.status !== 'active') fail('SS_TREATMENT_SESSION_PLAN_NOT_ACTIVE');
  if (context.item.status !== 'planned') fail('SS_TREATMENT_SESSION_ITEM_NOT_PLANNED');
  if (!getMockAcceptedTreatmentQuoteItem({ tenantId, treatmentPlanId: context.plan.id, treatmentPlanItemId: context.item.id })) {
    fail('SS_TREATMENT_SESSION_ACCEPTED_QUOTE_REQUIRED');
  }

  const clinicalEntry = await appendMockClinicalRecordEntry({ patientId, requestId, content: validation.clinicalContent });
  const performedAt = new Date().toISOString();
  const row = {
    session_id: crypto.randomUUID(),
    treatment_plan_item_appointment_id: appointmentLinkId,
    treatment_plan_item_id: context.item.id,
    appointment_id: context.appointment.id,
    clinical_record_entry_id: clinicalEntry.entry_id,
    outcome_code: outcomeCode,
    performed_at: performedAt,
    recorded_by_display_name: 'Profissional demo',
    mutation_result: 'changed',
  };
  sessions.push({ tenantId, patientId, appointmentLinkId, row });
  requests.set(requestKey(tenantId, requestId), { appointmentLinkId, outcomeCode, clinicalContent: validation.clinicalContent, row });
  markMockTreatmentPlanAppointmentLinkDocumented(appointmentLinkId);
  return row;
};

export const resetMockTreatmentExecutionSessions = () => {
  sessions.splice(0, sessions.length);
  requests.clear();
};
