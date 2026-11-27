export const APPOINTMENT_CHECK_IN_STATUSES = Object.freeze({
  ACTIVE: 'active',
  REVERTED: 'reverted',
});

export const APPOINTMENT_CHECK_IN_REVERT_REASONS = Object.freeze([
  { code: 'registered_by_mistake', label: 'Registrado por engano' },
  { code: 'wrong_appointment', label: 'Consulta incorreta' },
  { code: 'patient_left_before_service', label: 'Paciente saiu antes do atendimento' },
]);

export const APPOINTMENT_CHECK_IN_ELIGIBLE_STATUSES = Object.freeze([
  'Agendada',
  'Pendente',
  'Confirmada',
  'Em atendimento',
]);

export const isAppointmentEligibleForCheckIn = (status) => (
  APPOINTMENT_CHECK_IN_ELIGIBLE_STATUSES.includes(status)
);

export const isValidAppointmentCheckInRevertReason = (reasonCode) => (
  APPOINTMENT_CHECK_IN_REVERT_REASONS.some((reason) => reason.code === reasonCode)
);
