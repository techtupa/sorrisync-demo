export const PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPES = Object.freeze({
  UNAVAILABLE: 'unavailable',
  CUSTOM_HOURS: 'custom_hours',
});

export const PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPE_LABELS = Object.freeze({
  unavailable: 'Indisponível',
  custom_hours: 'Horário especial',
});

export const PROFESSIONAL_AVAILABILITY_EXCEPTION_REASONS = Object.freeze([
  'holiday',
  'vacation',
  'training',
  'personal_absence',
  'special_schedule',
  'operational_adjustment',
]);

export const PROFESSIONAL_AVAILABILITY_EXCEPTION_REASON_LABELS = Object.freeze({
  holiday: 'Feriado',
  vacation: 'Férias',
  training: 'Treinamento',
  personal_absence: 'Ausência pessoal',
  special_schedule: 'Horário especial',
  operational_adjustment: 'Ajuste operacional',
});
