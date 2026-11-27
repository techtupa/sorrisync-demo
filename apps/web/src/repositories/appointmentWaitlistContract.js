export const APPOINTMENT_WAITLIST_SOURCE_TYPES = Object.freeze({
  PATIENT: 'patient',
  LEAD: 'lead',
});

export const APPOINTMENT_WAITLIST_PERIODS = Object.freeze({
  ANY: 'any',
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
});

export const APPOINTMENT_WAITLIST_PRIORITIES = Object.freeze({
  STANDARD: 'standard',
  PRIORITY: 'priority',
});

export const APPOINTMENT_WAITLIST_STATUSES = Object.freeze({
  OPEN: 'open',
  SCHEDULED: 'scheduled',
  DISMISSED: 'dismissed',
});

export const APPOINTMENT_WAITLIST_DISMISS_REASONS = Object.freeze({
  NO_LONGER_NEEDED: 'no_longer_needed',
  CONTACT_UNAVAILABLE: 'contact_unavailable',
  PREFERENCE_CHANGED: 'preference_changed',
});

export const APPOINTMENT_WAITLIST_PERIOD_LABELS = Object.freeze({
  any: 'Qualquer período',
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
});

export const APPOINTMENT_WAITLIST_PRIORITY_LABELS = Object.freeze({
  standard: 'Normal',
  priority: 'Prioridade',
});

export const APPOINTMENT_WAITLIST_SOURCE_LABELS = Object.freeze({
  patient: 'Paciente',
  lead: 'Lead',
});

export const APPOINTMENT_WAITLIST_DISMISS_REASON_LABELS = Object.freeze({
  no_longer_needed: 'Não precisa mais',
  contact_unavailable: 'Contato indisponível',
  preference_changed: 'Preferência alterada',
});

export const isAppointmentWaitlistSlotInPeriod = (timeLabel, preferredPeriod = 'any') => {
  if (preferredPeriod === 'any') return true;

  const hour = Number(String(timeLabel || '').split(':')[0]);
  if (!Number.isInteger(hour)) return false;
  if (preferredPeriod === 'morning') return hour < 12;
  if (preferredPeriod === 'afternoon') return hour >= 12 && hour < 18;
  if (preferredPeriod === 'evening') return hour >= 18;
  return false;
};

export const isAppointmentWaitlistOpen = (entry) => (
  entry?.status === APPOINTMENT_WAITLIST_STATUSES.OPEN
);
