export const OMNICHANNEL_CONVERSATION_STATUSES = Object.freeze(['open', 'waiting', 'resolved', 'archived']);
export const OMNICHANNEL_CONVERSATION_PRIORITIES = Object.freeze(['normal', 'high', 'urgent']);

export const OMNICHANNEL_CONVERSATION_STATUS_LABELS = Object.freeze({
  archived: 'Arquivada',
  open: 'Aberta',
  resolved: 'Resolvida',
  waiting: 'Aguardando',
});

export const OMNICHANNEL_CONVERSATION_PRIORITY_LABELS = Object.freeze({
  high: 'Alta',
  normal: 'Normal',
  urgent: 'Urgente',
});

const cleanText = (value) => String(value || '').trim();
const legacyStatusMap = Object.freeze({
  closed: 'resolved',
  pending: 'waiting',
});
const legacyPriorityMap = Object.freeze({
  low: 'normal',
});

export const normalizeOmnichannelConversationStatus = (value) => {
  const status = legacyStatusMap[cleanText(value)] || cleanText(value);
  return OMNICHANNEL_CONVERSATION_STATUSES.includes(status) ? status : '';
};

export const normalizeOmnichannelConversationPriority = (value) => {
  const priority = legacyPriorityMap[cleanText(value)] || cleanText(value);
  return OMNICHANNEL_CONVERSATION_PRIORITIES.includes(priority) ? priority : '';
};

export const getOmnichannelConversationStatusLabel = (value) => {
  const status = normalizeOmnichannelConversationStatus(value) || 'open';
  return OMNICHANNEL_CONVERSATION_STATUS_LABELS[status];
};

export const getOmnichannelConversationPriorityLabel = (value) => {
  const priority = normalizeOmnichannelConversationPriority(value) || 'normal';
  return OMNICHANNEL_CONVERSATION_PRIORITY_LABELS[priority];
};

export const buildOmnichannelConversationTriagePatch = ({
  clearLead = false,
  clearPatient = false,
  leadId,
  patientId,
  priority,
  status,
} = {}) => {
  const patch = {
    last_handled_at: new Date().toISOString(),
  };

  if (status !== undefined) {
    const normalizedStatus = normalizeOmnichannelConversationStatus(status);

    if (!normalizedStatus) {
      throw new Error('Status operacional inválido para a triagem Omnichannel.');
    }

    patch.status = normalizedStatus;
    patch.resolved_at = normalizedStatus === 'resolved' ? patch.last_handled_at : null;
  }

  if (priority !== undefined) {
    const normalizedPriority = normalizeOmnichannelConversationPriority(priority);

    if (!normalizedPriority) {
      throw new Error('Prioridade inválida para a triagem Omnichannel.');
    }

    patch.priority = normalizedPriority;
  }

  if (clearPatient || patientId === null) {
    patch.patient_id = null;
  } else if (patientId !== undefined) {
    const normalizedPatientId = cleanText(patientId);

    if (!normalizedPatientId) {
      throw new Error('Paciente inválido para vínculo Omnichannel.');
    }

    patch.patient_id = normalizedPatientId;
  }

  if (clearLead || leadId === null) {
    patch.lead_id = null;
  } else if (leadId !== undefined) {
    const normalizedLeadId = cleanText(leadId);

    if (!normalizedLeadId) {
      throw new Error('Lead inválido para vínculo Omnichannel.');
    }

    patch.lead_id = normalizedLeadId;
  }

  return patch;
};
