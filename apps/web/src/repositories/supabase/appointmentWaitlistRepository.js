import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  createMockAppointmentWaitlistEntryByTenant,
  dismissMockAppointmentWaitlistEntryByTenant,
  listMockAppointmentWaitlistEntriesByTenant,
  scheduleMockAppointmentWaitlistEntryByTenant,
  updateMockAppointmentWaitlistEntryByTenant,
} from '../mock/appointmentWaitlistRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const mapEntry = (row = {}) => ({
  id: row.entry_id || row.id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  sourceDisplayName: row.source_display_name || '',
  serviceId: row.service_id,
  serviceLabel: row.service_label || '',
  serviceDurationMinutes: Number(row.service_duration_minutes) || null,
  preferredProfessionalId: row.preferred_professional_id || null,
  preferredProfessionalLabel: row.preferred_professional_label || '',
  earliestDate: row.earliest_date,
  latestDate: row.latest_date || null,
  preferredPeriod: row.preferred_period,
  priority: row.priority,
  status: row.status,
  scheduledAppointmentId: row.scheduled_appointment_id || null,
  resolutionCode: row.resolution_code || null,
  createdAt: row.created_at || null,
  updatedAt: row.updated_at || null,
});

const errorMessages = [
  ['SS_AGENDA_WAITLIST_PERMISSION_DENIED', 'Seu perfil não possui permissão para esta ação na lista de espera.'],
  ['SS_AGENDA_WAITLIST_SOURCE_NOT_FOUND', 'Paciente ou lead não encontrado para a clínica atual.'],
  ['SS_AGENDA_WAITLIST_SERVICE_UNAVAILABLE', 'O serviço precisa estar ativo e disponível na Agenda.'],
  ['SS_AGENDA_WAITLIST_PROFESSIONAL_UNAVAILABLE', 'Profissional indisponível para a clínica atual.'],
  ['SS_AGENDA_WAITLIST_ROOM_UNAVAILABLE', 'Sala indisponível para a clínica atual.'],
  ['SS_AGENDA_WAITLIST_ENTRY_ALREADY_OPEN', 'Já existe uma entrada aberta para essa pessoa e serviço.'],
  ['SS_AGENDA_WAITLIST_ENTRY_NOT_FOUND', 'Entrada da lista de espera não encontrada.'],
  ['SS_AGENDA_WAITLIST_ENTRY_NOT_OPEN', 'Somente entradas abertas aceitam esta ação.'],
  ['SS_AGENDA_WAITLIST_STALE_STATE', 'A entrada foi atualizada por outra sessão. Recarregue e tente novamente.'],
  ['SS_AGENDA_WAITLIST_LEAD_ALREADY_CONVERTED', 'Este lead já foi convertido. Use o paciente correspondente no CRM.'],
  ['SS_AGENDA_WAITLIST_DISMISS_REQUEST_INVALID', 'Selecione um motivo de dispensa válido.'],
  ['SS_AGENDA_WAITLIST_REQUEST_INVALID', 'Revise as preferências informadas para a lista de espera.'],
  ['SS_AGENDA_WAITLIST_SCHEDULE_REQUEST_INVALID', 'Selecione data, profissional, sala e horário válidos.'],
  ['SS_AGENDA_PROFESSIONAL_CONFLICT', 'O profissional já possui compromisso nesse horário.'],
  ['SS_AGENDA_ROOM_CONFLICT', 'A sala já está ocupada nesse horário.'],
  ['SS_AGENDA_PROFESSIONAL_BLOCK_CONFLICT', 'O profissional possui um bloqueio nesse horário.'],
  ['SS_AGENDA_ROOM_BLOCK_CONFLICT', 'A sala possui um bloqueio nesse horário.'],
];

const throwWaitlistError = (error, fallback) => {
  const searchable = `${error?.code || ''} ${error?.message || ''} ${error?.details || ''}`.toUpperCase();
  const matched = errorMessages.find(([code]) => searchable.includes(code));
  const safeError = new Error(matched?.[1] || fallback);
  safeError.cause = error;
  throw safeError;
};

const requireMembership = (request = {}) => {
  if (!request.actorMembershipId) throw new Error('Clínica ativa não identificada para a lista de espera.');
};

export const listAppointmentWaitlistEntriesByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase()) return listMockAppointmentWaitlistEntriesByTenant(tenantId, request);
  requireMembership(request);

  const response = await supabase.rpc('list_appointment_waitlist_entries', {
    p_actor_membership_id: request.actorMembershipId,
    p_status: request.status || 'open',
  });
  if (response.error) throwWaitlistError(response.error, 'Não foi possível carregar a lista de espera.');
  return { items: (Array.isArray(response.data) ? response.data : []).map(mapEntry), source: 'supabase' };
};

export const createAppointmentWaitlistEntryByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase()) return createMockAppointmentWaitlistEntryByTenant(tenantId, request);
  requireMembership(request);

  const response = await supabase.rpc('create_appointment_waitlist_entry', {
    p_actor_membership_id: request.actorMembershipId,
    p_earliest_date: request.earliestDate,
    p_latest_date: request.latestDate || null,
    p_preferred_period: request.preferredPeriod,
    p_preferred_professional_id: request.preferredProfessionalId || null,
    p_priority: request.priority,
    p_service_id: request.serviceId,
    p_source_id: request.sourceId,
    p_source_type: request.sourceType,
  });
  if (response.error) throwWaitlistError(response.error, 'Não foi possível adicionar à lista de espera.');
  return { item: mapEntry(response.data || {}), replayed: Boolean(response.data?.replayed), source: 'supabase' };
};

export const updateAppointmentWaitlistEntryByTenant = async (tenantId, entryId, request = {}) => {
  if (!hasSupabase()) return updateMockAppointmentWaitlistEntryByTenant(tenantId, entryId, request);
  requireMembership(request);

  const response = await supabase.rpc('update_appointment_waitlist_entry', {
    p_actor_membership_id: request.actorMembershipId,
    p_earliest_date: request.earliestDate,
    p_entry_id: entryId,
    p_expected_updated_at: request.expectedUpdatedAt,
    p_latest_date: request.latestDate || null,
    p_preferred_period: request.preferredPeriod,
    p_preferred_professional_id: request.preferredProfessionalId || null,
    p_priority: request.priority,
    p_service_id: request.serviceId,
  });
  if (response.error) throwWaitlistError(response.error, 'Não foi possível atualizar a entrada.');
  return { item: mapEntry(response.data || {}), replayed: Boolean(response.data?.replayed), source: 'supabase' };
};

export const dismissAppointmentWaitlistEntryByTenant = async (tenantId, entryId, request = {}) => {
  if (!hasSupabase()) return dismissMockAppointmentWaitlistEntryByTenant(tenantId, entryId, request);
  requireMembership(request);

  const response = await supabase.rpc('dismiss_appointment_waitlist_entry', {
    p_actor_membership_id: request.actorMembershipId,
    p_entry_id: entryId,
    p_expected_updated_at: request.expectedUpdatedAt,
    p_resolution_code: request.resolutionCode,
  });
  if (response.error) throwWaitlistError(response.error, 'Não foi possível dispensar a entrada.');
  return { item: mapEntry(response.data || {}), replayed: Boolean(response.data?.replayed), source: 'supabase' };
};

export const scheduleAppointmentWaitlistEntryByTenant = async (tenantId, entryId, request = {}) => {
  if (!hasSupabase()) return scheduleMockAppointmentWaitlistEntryByTenant(tenantId, entryId, request);
  requireMembership(request);

  const response = await supabase.rpc('schedule_appointment_waitlist_entry', {
    p_actor_membership_id: request.actorMembershipId,
    p_entry_id: entryId,
    p_expected_updated_at: request.expectedUpdatedAt,
    p_professional_id: request.professionalId,
    p_room_id: request.roomId,
    p_starts_at: request.startsAt,
  });
  if (response.error) throwWaitlistError(response.error, 'Não foi possível agendar pela lista de espera.');

  return {
    appointment: {
      id: response.data?.appointment?.appointment_id,
      startsAt: response.data?.appointment?.starts_at,
      duration: Number(response.data?.appointment?.duration_minutes) || null,
      status: response.data?.appointment?.status,
      origin: response.data?.appointment?.origin_label,
    },
    item: mapEntry(response.data?.entry || {}),
    replayed: Boolean(response.data?.replayed),
    source: 'supabase',
  };
};
