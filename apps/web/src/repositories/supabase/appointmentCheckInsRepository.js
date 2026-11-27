import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  checkInMockAppointmentByTenant,
  listMockAppointmentCheckInsByTenantAndAppointments,
  revertMockAppointmentCheckInByTenant,
} from '../mock/appointmentCheckInsRepository.js';

const CHECK_IN_FIELDS = `
  id,
  appointment_id,
  status,
  checked_in_at,
  reverted_at,
  revert_reason_code,
  created_at,
  updated_at
`;

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const mapCheckIn = (row = {}) => ({
  id: row.id,
  appointmentId: row.appointment_id,
  status: row.status,
  checkedInAt: row.checked_in_at,
  revertedAt: row.reverted_at || null,
  revertReasonCode: row.revert_reason_code || null,
  createdAt: row.created_at || row.checked_in_at,
  updatedAt: row.updated_at || row.reverted_at || row.checked_in_at,
});

const getReceptionErrorMessage = (error, fallback) => {
  const message = String(error?.message || '');

  if (message.includes('SS_RECEPTION_PERMISSION_DENIED')) {
    return 'Seu perfil não possui permissão para gerenciar chegadas.';
  }
  if (message.includes('SS_RECEPTION_APPOINTMENT_NOT_FOUND')) {
    return 'Consulta não encontrada para a clínica atual.';
  }
  if (message.includes('SS_RECEPTION_APPOINTMENT_STATUS_BLOCKED')) {
    return 'Consultas canceladas ou finalizadas não aceitam check-in.';
  }
  if (message.includes('SS_RECEPTION_REVERT_REASON_INVALID')) {
    return 'Selecione um motivo de reversão válido.';
  }
  if (message.includes('SS_RECEPTION_CHECK_IN_NOT_FOUND')) {
    return 'Check-in não encontrado para a clínica atual.';
  }

  return fallback;
};

const throwReceptionError = (error, fallback) => {
  const safeError = new Error(getReceptionErrorMessage(error, fallback));
  safeError.cause = error;
  throw safeError;
};

export const fetchAppointmentCheckInsByTenantAndAppointments = async (
  tenantId,
  appointmentIds = [],
) => {
  if (!hasSupabase()) {
    return listMockAppointmentCheckInsByTenantAndAppointments(tenantId, appointmentIds);
  }

  if (!tenantId) {
    throw new Error('Clínica ativa não identificada para carregar os check-ins.');
  }

  const safeAppointmentIds = [...new Set(appointmentIds.filter(Boolean))];
  if (!safeAppointmentIds.length) {
    return { items: [], source: 'supabase' };
  }

  const response = await supabase
    .from('appointment_check_ins')
    .select(CHECK_IN_FIELDS)
    .eq('tenant_id', tenantId)
    .in('appointment_id', safeAppointmentIds)
    .order('checked_in_at', { ascending: false });

  if (response.error) {
    throwReceptionError(response.error, 'Não foi possível carregar os check-ins no Supabase.');
  }

  return {
    items: (response.data || []).map(mapCheckIn),
    source: 'supabase',
  };
};

export const checkInAppointment = async (tenantId, appointmentId) => {
  if (!hasSupabase()) {
    return checkInMockAppointmentByTenant(tenantId, appointmentId);
  }

  const response = await supabase.rpc('check_in_appointment', {
    p_appointment_id: appointmentId,
  });

  if (response.error) {
    throwReceptionError(response.error, 'Não foi possível registrar a chegada.');
  }

  return {
    item: mapCheckIn(response.data),
    replayed: Boolean(response.data?.replayed),
    source: 'supabase',
  };
};

export const revertAppointmentCheckIn = async (tenantId, checkInId, reasonCode) => {
  if (!hasSupabase()) {
    return revertMockAppointmentCheckInByTenant(tenantId, checkInId, reasonCode);
  }

  const response = await supabase.rpc('revert_appointment_check_in', {
    p_check_in_id: checkInId,
    p_reason_code: reasonCode,
  });

  if (response.error) {
    throwReceptionError(response.error, 'Não foi possível reverter o check-in.');
  }

  return {
    item: mapCheckIn(response.data),
    replayed: Boolean(response.data?.replayed),
    source: 'supabase',
  };
};
