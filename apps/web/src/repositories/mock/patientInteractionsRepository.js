const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

export const formatInteractionDateLabel = (dateInput) => {
  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((nowDay - dateDay) / 86400000);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  if (diffDays === 0) {
    return `Hoje, ${time}`;
  }

  if (diffDays === 1) {
    return `Ontem, ${time}`;
  }

  if (diffDays > 1 && diffDays <= 7) {
    return `Há ${diffDays} dias`;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
};

const manualInteractionsByPatient = new Map();

const safeText = (value, fallback = '') => {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text || fallback;
};

const getPatientInteractionKey = (tenantId, patientId) => `${tenantId || 'mock'}:${patientId || 'patient'}`;

const buildInteraction = ({ patient, sourceKey, type, title, description, iconType, ageMs }) => {
  const occurredAt = new Date(Date.now() - ageMs).toISOString();

  return {
    id: `${patient?.id || 'patient'}-${sourceKey}`,
    tenant_id: patient?.tenant_id,
    patient_id: patient?.id,
    sourceKey,
    type,
    title,
    description,
    iconType,
    occurredAt,
    date: formatInteractionDateLabel(occurredAt),
  };
};

const getManualInteractionsForPatient = (patient) => {
  if (!patient?.id) return [];

  const directKey = getPatientInteractionKey(patient.tenant_id, patient.id);
  const directInteractions = manualInteractionsByPatient.get(directKey) || [];

  if (directInteractions.length || patient.tenant_id) {
    return directInteractions;
  }

  return [...manualInteractionsByPatient.entries()]
    .filter(([key]) => key.endsWith(`:${patient.id}`))
    .flatMap(([, interactions]) => interactions);
};

export const getPatientInteractionTimeline = (patient) => {
  if (!patient) {
    return {
      latestInteractions: [],
      journeyInteractions: [],
    };
  }

  const leadCreated = buildInteraction({
    patient,
    sourceKey: 'lead_created',
    type: 'lead_created',
    title: 'Lead capturado',
    description: `Origem: ${patient.origin}`,
    iconType: 'user',
    ageMs: 7 * 86400000,
  });

  const messageSent = buildInteraction({
    patient,
    sourceKey: 'message_sent',
    type: 'message_sent',
    title: 'Mensagem enviada via WhatsApp',
    description: 'Confirmação de interesse no tratamento.',
    iconType: 'message',
    ageMs: 2 * 3600000,
  });

  const journeyInteractions = [
    buildInteraction({
      patient,
      sourceKey: 'status_updated',
      type: 'status_updated',
      title: 'Status atualizado',
      description: `Movido para: ${patient.status}`,
      iconType: 'check',
      ageMs: 30 * 60000,
    }),
    buildInteraction({
      patient,
      sourceKey: 'budget_generated',
      type: 'budget_generated',
      title: 'Orçamento gerado',
      description: `Valor: ${formatCurrency(patient.estimatedValue)}`,
      iconType: 'file',
      ageMs: 2 * 86400000,
    }),
    buildInteraction({
      patient,
      sourceKey: 'evaluation_completed',
      type: 'evaluation_completed',
      title: 'Primeira Avaliação',
      description: `Procedimento: ${patient.interest}`,
      iconType: 'calendar',
      ageMs: 5 * 86400000,
    }),
    leadCreated,
  ];
  const manualInteractions = getManualInteractionsForPatient(patient);

  return {
    latestInteractions: [...manualInteractions, messageSent, leadCreated].slice(0, 2),
    journeyInteractions: [...manualInteractions, ...journeyInteractions],
  };
};

export const createPatientInteractionByTenant = (tenantId, patientId, interaction = {}) => {
  if (!patientId) {
    throw new Error('Paciente vinculado obrigatório para registrar interação operacional.');
  }

  const occurredAt = interaction.occurredAt || new Date().toISOString();
  const sourceKey = safeText(interaction.sourceKey) || `manual-note-${Date.now()}`;
  const nextInteraction = {
    id: `${patientId}-${sourceKey}`,
    tenant_id: tenantId,
    patient_id: patientId,
    sourceKey,
    type: safeText(interaction.type, 'note'),
    title: safeText(interaction.title, 'Pós-atendimento operacional'),
    description: safeText(interaction.description),
    iconType: safeText(interaction.iconType, 'note'),
    channel: safeText(interaction.channel, 'Recepção'),
    occurredAt,
    date: formatInteractionDateLabel(occurredAt),
    created_at: occurredAt,
    updated_at: occurredAt,
  };
  const key = getPatientInteractionKey(tenantId, patientId);
  const previousInteractions = manualInteractionsByPatient.get(key) || [];

  manualInteractionsByPatient.set(key, [nextInteraction, ...previousInteractions]);

  return nextInteraction;
};
