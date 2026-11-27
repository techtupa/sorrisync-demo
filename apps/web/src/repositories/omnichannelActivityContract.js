export const OMNICHANNEL_MANUAL_ACTIVITY_TYPES = Object.freeze([
  'contact_attempt',
  'manual_follow_up',
  'scheduled_return',
  'status_changed',
  'priority_changed',
  'assigned',
  'unassigned',
  'linked_patient',
  'linked_lead',
  'lead_created',
  'escalated_to_reception',
  'sent_to_schedule',
  'resolved',
  'reopened',
  'internal_note',
]);

export const OMNICHANNEL_SYSTEM_ACTIVITY_TYPES = Object.freeze([
  'scheduling_progress',
  'scheduling_exception',
  'scheduling_completed',
]);

export const OMNICHANNEL_ACTIVITY_TYPES = Object.freeze([
  ...OMNICHANNEL_MANUAL_ACTIVITY_TYPES,
  ...OMNICHANNEL_SYSTEM_ACTIVITY_TYPES,
]);

export const OMNICHANNEL_MANUAL_ACTIVITY_OUTCOMES = Object.freeze([
  'pending',
  'waiting_patient',
  'needs_schedule',
  'scheduled',
  'resolved',
  'no_response',
  'wrong_contact',
  'follow_up_later',
  'status_open',
  'status_waiting',
  'status_resolved',
  'status_archived',
  'priority_normal',
  'priority_high',
  'priority_urgent',
  'assigned_to_user',
  'unassigned',
  'linked_patient',
  'linked_lead',
  'lead_created',
]);

export const OMNICHANNEL_SYSTEM_ACTIVITY_OUTCOMES = Object.freeze([
  'scheduling_collecting',
  'scheduling_offered',
  'scheduling_confirmation_pending',
  'scheduling_processing',
  'scheduling_booking_completed',
  'scheduling_rescheduled',
  'scheduling_cancelled',
  'scheduling_presence_confirmed',
  'scheduling_status_checked',
  'scheduling_retry_required',
  'scheduling_handoff',
  'scheduling_declined',
]);

export const OMNICHANNEL_ACTIVITY_OUTCOMES = Object.freeze([
  ...OMNICHANNEL_MANUAL_ACTIVITY_OUTCOMES,
  ...OMNICHANNEL_SYSTEM_ACTIVITY_OUTCOMES,
]);

export const OMNICHANNEL_ACTIVITY_TYPE_LABELS = Object.freeze({
  assigned: 'Responsável atribuído',
  contact_attempt: 'Tentativa de contato',
  escalated_to_reception: 'Encaminhado para recepção',
  internal_note: 'Nota interna',
  lead_created: 'Lead criado',
  linked_lead: 'Lead vinculado',
  linked_patient: 'Paciente vinculado',
  manual_follow_up: 'Follow-up manual',
  priority_changed: 'Prioridade alterada',
  reopened: 'Reaberta',
  resolved: 'Resolvida',
  scheduled_return: 'Retorno agendado',
  sent_to_schedule: 'Encaminhado para agenda',
  status_changed: 'Status alterado',
  scheduling_completed: 'Agenda concluída',
  scheduling_exception: 'Exceção da Agenda',
  scheduling_progress: 'Andamento da Agenda',
  unassigned: 'Responsável removido',
});

export const OMNICHANNEL_ACTIVITY_OUTCOME_LABELS = Object.freeze({
  assigned_to_user: 'Atribuído',
  follow_up_later: 'Acompanhar depois',
  lead_created: 'Lead criado',
  linked_lead: 'Lead vinculado',
  linked_patient: 'Paciente vinculado',
  needs_schedule: 'Precisa agendar',
  no_response: 'Sem resposta',
  pending: 'Pendente',
  priority_high: 'Prioridade alta',
  priority_normal: 'Prioridade normal',
  priority_urgent: 'Prioridade urgente',
  resolved: 'Resolvido',
  scheduled: 'Agendado',
  scheduling_booking_completed: 'Consulta agendada',
  scheduling_cancelled: 'Consulta cancelada',
  scheduling_collecting: 'Coletando preferências',
  scheduling_confirmation_pending: 'Aguardando confirmação',
  scheduling_declined: 'Alteração recusada',
  scheduling_handoff: 'Revisão humana necessária',
  scheduling_offered: 'Aguardando escolha',
  scheduling_presence_confirmed: 'Presença confirmada',
  scheduling_processing: 'Processando na Agenda',
  scheduling_rescheduled: 'Consulta remarcada',
  scheduling_retry_required: 'Nova opção solicitada',
  scheduling_status_checked: 'Status consultado',
  status_archived: 'Arquivada',
  status_open: 'Aberta',
  status_resolved: 'Resolvida',
  status_waiting: 'Aguardando',
  unassigned: 'Sem responsável',
  waiting_patient: 'Aguardando paciente',
  wrong_contact: 'Contato incorreto',
});

export const OMNICHANNEL_ACTIVITY_NOTE_LIMIT = 600;

const forbiddenNotePattern = /(cpf|cnpj|rg|diagn[oó]stico|prontu[aá]rio|nota cl[ií]nica|dente|odontograma|documento|arquivo|storage|financeiro|pagamento|cart[aã]o|pix|boleto|token|senha|secret|payload|access_token|meta app secret|service[_-]?role|bearer\s+[a-z0-9._-]+|\b[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}\b|\b[0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2}\b|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|\([0-9]{2}\)\s?[0-9]{4,5}-[0-9]{4})/i;

const cleanText = (value) => String(value || '').replace(/\s+/g, ' ').trim();

export const normalizeOmnichannelActivityType = (value) => {
  const activityType = cleanText(value);
  return OMNICHANNEL_ACTIVITY_TYPES.includes(activityType) ? activityType : '';
};

export const normalizeOmnichannelActivityOutcome = (value) => {
  const outcome = cleanText(value);
  return OMNICHANNEL_ACTIVITY_OUTCOMES.includes(outcome) ? outcome : '';
};

export const getOmnichannelActivityTypeLabel = (value) => {
  const activityType = normalizeOmnichannelActivityType(value) || 'internal_note';
  return OMNICHANNEL_ACTIVITY_TYPE_LABELS[activityType];
};

export const getOmnichannelActivityOutcomeLabel = (value) => {
  const outcome = normalizeOmnichannelActivityOutcome(value) || 'pending';
  return OMNICHANNEL_ACTIVITY_OUTCOME_LABELS[outcome];
};

export const sanitizeOmnichannelActivityNote = (value) => {
  const note = cleanText(value).slice(0, OMNICHANNEL_ACTIVITY_NOTE_LIMIT);
  if (!note) return null;

  if (forbiddenNotePattern.test(note)) {
    throw new Error('Nota interna contém dado sensível ou clínico fora do escopo do registro operacional.');
  }

  return note;
};

export const normalizeOmnichannelNextActionAt = (value) => {
  const rawValue = cleanText(value);
  if (!rawValue) return null;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Data de próxima ação inválida para o registro operacional.');
  }

  return date.toISOString();
};

export const buildOmnichannelActivityPayload = ({
  activityType,
  nextActionAt,
  noteText,
  outcome,
} = {}) => {
  const normalizedActivityType = normalizeOmnichannelActivityType(activityType);
  const normalizedOutcome = normalizeOmnichannelActivityOutcome(outcome || 'pending');

  if (!normalizedActivityType || !OMNICHANNEL_MANUAL_ACTIVITY_TYPES.includes(normalizedActivityType)) {
    throw new Error('Tipo de ação inválido para o registro operacional.');
  }

  if (!normalizedOutcome || !OMNICHANNEL_MANUAL_ACTIVITY_OUTCOMES.includes(normalizedOutcome)) {
    throw new Error('Resultado inválido para o registro operacional.');
  }

  return {
    activity_type: normalizedActivityType,
    outcome: normalizedOutcome,
    note_text: sanitizeOmnichannelActivityNote(noteText),
    next_action_at: normalizeOmnichannelNextActionAt(nextActionAt),
  };
};
