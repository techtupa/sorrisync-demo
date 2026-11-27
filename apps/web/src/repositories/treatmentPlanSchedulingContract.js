import { buildCrmAgendaNavigationPath, formatCrmAgendaDateParam } from '../lib/crmAgendaNavigation.js';

export const TREATMENT_SCHEDULING_ACTIVE_STATUSES = Object.freeze([
  'Agendada',
  'Pendente',
  'Confirmada',
  'Em atendimento',
]);

const dateTimeParts = (value) => {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  const parts = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(parsed).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};

const mapLink = (row) => {
  if (!row?.appointment_id) return null;
  const parts = dateTimeParts(row.appointment_starts_at);
  const appointment = {
    id: row.appointment_id,
    linkId: row.treatment_plan_item_appointment_id || null,
    startsAt: row.appointment_starts_at,
    date: parts.date || formatCrmAgendaDateParam(row.appointment_starts_at),
    time: parts.time,
    duration: Number(row.appointment_duration_minutes || 0),
    status: row.appointment_status,
    professionalId: row.appointment_professional_id || null,
    professional: row.appointment_professional_name || 'Profissional indisponível',
    roomId: row.appointment_room_id || null,
    room: row.appointment_room_name || 'Sala indisponível',
    createdAt: row.link_created_at,
  };
  return { ...appointment, agendaPath: buildCrmAgendaNavigationPath(appointment) };
};

export const buildTreatmentPlanSchedulingReadModel = (rows = []) => {
  const appointmentLinks = [];
  const appointmentLinksByItem = {};
  const scheduleEligibilityByItem = {};

  for (const row of Array.isArray(rows) ? rows : []) {
    const itemId = row?.treatment_plan_item_id;
    if (!itemId) continue;
    if (!scheduleEligibilityByItem[itemId]) {
      scheduleEligibilityByItem[itemId] = {
        itemId,
        planId: row.treatment_plan_id,
        itemUpdatedAt: row.item_updated_at,
        planStatus: row.plan_status,
        itemStatus: row.item_status,
        acceptedQuotePresent: Boolean(row.accepted_quote_present),
        acceptedQuoteItemPresent: Boolean(row.accepted_quote_item_present),
        serviceAvailable: Boolean(row.service_available),
        durationMinutes: Number(row.service_duration_minutes || 0),
        activeAppointmentPresent: Boolean(row.active_appointment_present),
        canSchedule: Boolean(row.can_schedule),
        code: row.eligibility_code || 'unknown',
      };
    }
    const link = mapLink(row);
    if (link) {
      appointmentLinks.push({ ...link, itemId });
      appointmentLinksByItem[itemId] ||= [];
      appointmentLinksByItem[itemId].push(link);
    }
  }

  return { appointmentLinks, appointmentLinksByItem, scheduleEligibilityByItem };
};

export const createTreatmentSchedulingRequestId = () => crypto.randomUUID();

export const buildTreatmentSchedulingStartsAt = (date, time) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !/^\d{2}:\d{2}$/.test(String(time || ''))) return '';
  const local = new Date(`${date}T${time}:00-03:00`);
  return Number.isNaN(local.getTime()) ? '' : local.toISOString();
};

export const validateTreatmentSchedulingInput = (input = {}) => {
  if (!input.itemId || !input.requestId || !input.startsAt || !input.professionalId || !input.roomId || !input.expectedItemUpdatedAt) {
    return { valid: false, message: 'Selecione data, profissional, sala e horário antes de confirmar.' };
  }
  if (new Date(input.startsAt).getTime() <= Date.now()) {
    return { valid: false, message: 'Selecione um horário futuro disponível.' };
  }
  return { valid: true, message: '' };
};

export const treatmentSchedulingErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('finalized_session_documentation_required')) return 'Registre a sessão clínica da consulta finalizada antes de agendar outra sessão.';
  if (code.includes('treatment_item_already_scheduled')) return 'Este procedimento já possui uma consulta ativa vinculada.';
  if (code.includes('ACCEPTED_QUOTE') || code.includes('accepted_quote')) return 'O agendamento pelo plano exige um orçamento aceito que inclua este procedimento.';
  if (code.includes('ITEM_NOT_PLANNED') || code.includes('PLAN_NOT_ACTIVE')) return 'Este procedimento não está mais elegível para agendamento.';
  if (code.includes('SERVICE_UNAVAILABLE')) return 'O serviço deste procedimento não está disponível para a Agenda.';
  if (code.includes('PROFESSIONAL_UNAVAILABLE')) return 'O profissional selecionado não está disponível.';
  if (code.includes('ROOM_UNAVAILABLE')) return 'A sala selecionada não está disponível.';
  if (code.includes('SLOT_UNAVAILABLE') || code.includes('APPOINTMENT_CONFLICT') || code.includes('BLOCK_CONFLICT')) return 'O horário deixou de estar disponível. Consulte as sugestões novamente.';
  if (code.includes('STALE_ITEM') || code === '40001') return 'O plano mudou enquanto você agendava. Atualize e tente novamente.';
  if (code.includes('REQUEST_ID_CONFLICT') || code.includes('CONCURRENT_CONFLICT') || code === '23505') return 'A solicitação entrou em conflito com outra operação. Atualize o plano.';
  if (code.includes('ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui todas as permissões clínicas e de Agenda necessárias.';
  if (code.includes('INPUT_INVALID') || code === '22023') return 'Os dados do agendamento são inválidos.';
  return 'Não foi possível criar a consulta na Agenda agora.';
};
