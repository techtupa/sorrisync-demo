import { getServicesByTenant } from '../../data/mockServices.js';
import { getPatientsByTenant } from '../../data/mockPatients.js';
import {
  buildTreatmentPlanSchedulingReadModel,
  treatmentSchedulingErrorMessage,
  validateTreatmentSchedulingInput,
} from '../treatmentPlanSchedulingContract.js';
import { getMockAcceptedTreatmentQuoteItem } from './treatmentQuoteRepository.js';
import { getMockTreatmentPlanContextsByPatient, getMockTreatmentPlanItemContext } from './treatmentPlanRepository.js';
import {
  createAppointmentByTenant,
  getScheduleByTenant,
  listAvailableAppointmentSlotsByTenant,
} from './scheduleRepository.js';

const links = [];
const requests = new Map();
const documentedLinkIds = new Set();
const requestKey = (tenantId, requestId) => `${tenantId}:${requestId}`;
const isBlockingAppointment = (appointment, documentedLinkIds = new Set()) => {
  if (!appointment) return true;
  if (['Agendada', 'Pendente', 'Confirmada', 'Em atendimento'].includes(appointment.status)) return true;
  if (appointment.status === 'Finalizada') return !documentedLinkIds.has(appointment.linkId);
  return appointment.status !== 'Cancelada';
};
const fail = (code) => {
  const error = new Error(code);
  error.code = code;
  error.userMessage = treatmentSchedulingErrorMessage(error);
  throw error;
};
const serviceFor = (tenantId, serviceId) => getServicesByTenant(tenantId)
  .find((service) => service.id === serviceId && service.status === 'Ativo' && service.useInAgenda !== false && Number(service.duration) > 0);
const rowsFor = ({ tenantId, patientId, canManage }) => {
  const appointments = getScheduleByTenant(tenantId).appointments;
  return getMockTreatmentPlanContextsByPatient(tenantId, patientId).flatMap(({ plan, item }) => {
    const quoteItem = getMockAcceptedTreatmentQuoteItem({ tenantId, treatmentPlanId: plan.id, treatmentPlanItemId: item.id });
    const service = serviceFor(tenantId, item.serviceId);
    const itemLinks = links.filter((link) => link.tenantId === tenantId && link.itemId === item.id);
    const linkedAppointments = itemLinks.map((link) => ({
      ...appointments.find((entry) => entry.id === link.appointmentId),
      linkId: link.id,
    }));
    const activePresent = linkedAppointments.some((appointment) => isBlockingAppointment(appointment, documentedLinkIds));
    const finalizedWithoutSession = linkedAppointments.some((appointment) => appointment?.status === 'Finalizada' && !documentedLinkIds.has(appointment.linkId));
    const base = {
      treatment_plan_id: plan.id,
      treatment_plan_item_id: item.id,
      item_updated_at: item.updatedAt || item.createdAt,
      plan_status: plan.status,
      item_status: item.status,
      accepted_quote_present: Boolean(quoteItem?.quote),
      accepted_quote_item_present: Boolean(quoteItem?.item),
      service_available: Boolean(service),
      service_duration_minutes: Number(service?.duration || 0),
      active_appointment_present: activePresent,
      can_schedule: Boolean(canManage && plan.status === 'active' && item.status === 'planned' && quoteItem && service && !activePresent),
      eligibility_code: plan.status !== 'active' ? 'plan_not_active'
        : item.status !== 'planned' ? 'item_not_planned'
          : !quoteItem?.quote ? 'accepted_quote_required'
            : !quoteItem?.item ? 'accepted_quote_item_required'
              : !service ? 'service_unavailable'
                : finalizedWithoutSession ? 'finalized_session_documentation_required'
                  : activePresent ? 'treatment_item_already_scheduled'
                  : !canManage ? 'manage_permission_required' : 'eligible',
    };
    if (itemLinks.length === 0) return [base];
    return itemLinks.map((link) => {
      const appointment = appointments.find((entry) => entry.id === link.appointmentId);
      return {
        ...base,
        treatment_plan_item_appointment_id: link.id,
        appointment_id: appointment?.id,
        appointment_starts_at: appointment ? new Date(`${appointment.date}T${appointment.time}:00-03:00`).toISOString() : null,
        appointment_duration_minutes: appointment?.duration,
        appointment_status: appointment?.status,
        appointment_professional_id: appointment?.professionalId,
        appointment_professional_name: appointment?.professional,
        appointment_room_id: appointment?.roomId,
        appointment_room_name: appointment?.room,
        link_created_at: link.createdAt,
      };
    });
  });
};

export const getMockTreatmentPlanItemAppointments = async ({ tenantId, patientId, canRead = true, canManage = false }) => {
  if (!canRead) fail('SS_TREATMENT_SCHEDULING_ACCESS_DENIED');
  return buildTreatmentPlanSchedulingReadModel(rowsFor({ tenantId, patientId, canManage }));
};

export const scheduleMockTreatmentPlanItemAppointment = async ({
  tenantId, itemId, requestId, startsAt, professionalId, roomId, expectedItemUpdatedAt, canManage = true,
}) => {
  const validation = validateTreatmentSchedulingInput({ itemId, requestId, startsAt, professionalId, roomId, expectedItemUpdatedAt });
  if (!validation.valid) fail('SS_TREATMENT_SCHEDULING_INPUT_INVALID');
  if (!canManage) fail('SS_TREATMENT_SCHEDULING_ACCESS_DENIED');
  const replay = requests.get(requestKey(tenantId, requestId));
  if (replay) {
    if (replay.itemId !== itemId || replay.startsAt !== startsAt || replay.professionalId !== professionalId || replay.roomId !== roomId) {
      fail('SS_TREATMENT_SCHEDULING_REQUEST_ID_CONFLICT');
    }
    return { ...replay.result, mutation_result: 'idempotent' };
  }

  const context = getMockTreatmentPlanItemContext(tenantId, itemId);
  if (!context || context.item.status !== 'planned') fail('SS_TREATMENT_SCHEDULING_ITEM_NOT_PLANNED');
  if (context.plan.status !== 'active') fail('SS_TREATMENT_SCHEDULING_PLAN_NOT_ACTIVE');
  if ((context.item.updatedAt || context.item.createdAt) !== expectedItemUpdatedAt) fail('SS_TREATMENT_SCHEDULING_STALE_ITEM');
  const accepted = getMockAcceptedTreatmentQuoteItem({ tenantId, treatmentPlanId: context.plan.id, treatmentPlanItemId: itemId });
  if (!accepted) fail('SS_TREATMENT_SCHEDULING_ACCEPTED_QUOTE_REQUIRED');
  const service = serviceFor(tenantId, context.item.serviceId);
  if (!service) fail('SS_TREATMENT_SCHEDULING_SERVICE_UNAVAILABLE');
  const schedule = getScheduleByTenant(tenantId);
  if (links.some((link) => link.tenantId === tenantId && link.itemId === itemId
    && isBlockingAppointment({
      ...schedule.appointments.find((entry) => entry.id === link.appointmentId),
      linkId: link.id,
    }, documentedLinkIds))) {
    if (links.some((link) => link.tenantId === tenantId && link.itemId === itemId
      && schedule.appointments.find((entry) => entry.id === link.appointmentId)?.status === 'Finalizada'
      && !documentedLinkIds.has(link.id))) fail('finalized_session_documentation_required');
    fail('treatment_item_already_scheduled');
  }
  const professional = schedule.professionals.find((entry) => entry.id === professionalId && entry.status !== 'inactive');
  const room = schedule.rooms.find((entry) => entry.id === roomId && entry.status !== 'inactive');
  if (!professional) fail('SS_TREATMENT_SCHEDULING_PROFESSIONAL_UNAVAILABLE');
  if (!room) fail('SS_TREATMENT_SCHEDULING_ROOM_UNAVAILABLE');
  const selected = new Date(startsAt);
  const date = selected.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const time = selected.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
  const slots = await listAvailableAppointmentSlotsByTenant(tenantId, {
    date, durationMinutes: Number(service.duration), professionalId, roomId, limit: 30,
  });
  if (!slots.some((slot) => slot.startsAt === startsAt)) fail('SS_TREATMENT_SCHEDULING_SLOT_UNAVAILABLE');
  const patient = getPatientsByTenant(tenantId).find((entry) => entry.id === context.patientId);
  if (!patient) fail('SS_TREATMENT_SCHEDULING_PATIENT_UNAVAILABLE');
  const appointment = await createAppointmentByTenant(tenantId, {
    patient: patient.name,
    phone: patient.phone || '',
    procedure: service.name,
    professional: professional.displayName,
    room: room.displayName,
    date,
    time,
    duration: Number(service.duration),
    status: 'Agendada',
    origin: 'Plano de tratamento',
    notes: null,
  });
  const link = { id: crypto.randomUUID(), tenantId, itemId, appointmentId: appointment.id, requestId, createdAt: new Date().toISOString() };
  links.push(link);
  const result = {
    appointment_id: appointment.id,
    appointment_starts_at: startsAt,
    appointment_duration_minutes: Number(service.duration),
    appointment_status: 'Agendada',
    appointment_origin_label: 'Plano de tratamento',
    treatment_plan_item_id: itemId,
    link_id: link.id,
    mutation_result: 'changed',
  };
  requests.set(requestKey(tenantId, requestId), { itemId, startsAt, professionalId, roomId, result });
  return result;
};

export const resetMockTreatmentPlanScheduling = () => {
  links.splice(0, links.length);
  requests.clear();
  documentedLinkIds.clear();
};

export const markMockTreatmentPlanAppointmentLinkDocumented = (linkId) => documentedLinkIds.add(linkId);

export const getMockTreatmentPlanAppointmentLinkContext = ({ tenantId, linkId }) => {
  const link = links.find((entry) => entry.tenantId === tenantId && entry.id === linkId);
  if (!link) return null;
  const context = getMockTreatmentPlanItemContext(tenantId, link.itemId);
  const appointment = getScheduleByTenant(tenantId).appointments.find((entry) => entry.id === link.appointmentId);
  return context && appointment ? { link, appointment, ...context } : null;
};
