export const APPOINTMENT_RESCHEDULING_ELIGIBLE_STATUSES = Object.freeze([
  'Agendada',
  'Pendente',
  'Confirmada',
]);

export const APPOINTMENT_RESCHEDULING_REASONS = Object.freeze([
  { code: 'patient_request', label: 'Solicitação do paciente' },
  { code: 'clinic_adjustment', label: 'Ajuste da clínica' },
  { code: 'professional_unavailable', label: 'Indisponibilidade do profissional' },
  { code: 'scheduling_correction', label: 'Correção de agendamento' },
]);

export const isAppointmentEligibleForRescheduling = (appointment) => Boolean(
  appointment?.id
  && APPOINTMENT_RESCHEDULING_ELIGIBLE_STATUSES.includes(appointment.status)
  && !appointment.hasActiveCheckIn
);

export const isValidAppointmentReschedulingReason = (reasonCode) => (
  APPOINTMENT_RESCHEDULING_REASONS.some((reason) => reason.code === reasonCode)
);

export const getAppointmentReschedulingBlockedReason = (appointment) => {
  if (!appointment?.id) return 'Consulta sem identificador operacional.';
  if (appointment.hasActiveCheckIn) return 'Reagendamento bloqueado enquanto houver check-in ativo.';
  if (!APPOINTMENT_RESCHEDULING_ELIGIBLE_STATUSES.includes(appointment.status)) {
    return 'Somente consultas agendadas, pendentes ou confirmadas podem ser reagendadas.';
  }
  return '';
};
