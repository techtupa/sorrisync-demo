const OPERATIONAL_TEXT_LIMIT = 480;
const OPERATIONAL_NEXT_ACTION_LIMIT = 160;

const BLOCKED_OPERATIONAL_PATTERNS = [
  { label: 'diagnóstico clínico', pattern: /\bdiagn[oó]stic[oa]s?\b/i },
  { label: 'procedimento clínico', pattern: /\bprocedimento\s+cl[ií]nico\b/i },
  { label: 'prescrição', pattern: /\bprescri[cç][aã]o|\bprescrev/i },
  { label: 'evolução clínica', pattern: /\bevolu[cç][aã]o\s+cl[ií]nica\b/i },
  { label: 'anamnese', pattern: /\banamnese\b/i },
  { label: 'odontograma', pattern: /\bodontograma\b/i },
  { label: 'prontuário', pattern: /\bprontu[aá]rio\b/i },
];

const BLOCKED_SENSITIVE_PATTERNS = [
  { label: 'CPF ou CNPJ', pattern: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/ },
  { label: 'e-mail', pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
];

const cleanText = (value) => String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();

const validateOperationalText = (value, label, limit) => {
  const text = cleanText(value);

  if (text.length > limit) {
    throw new Error(`${label} deve ter até ${limit} caracteres.`);
  }

  const blockedPattern = [...BLOCKED_OPERATIONAL_PATTERNS, ...BLOCKED_SENSITIVE_PATTERNS]
    .find((item) => item.pattern.test(text));

  if (blockedPattern) {
    throw new Error(`${label} contém ${blockedPattern.label}. Registre apenas informação operacional de CRM.`);
  }

  return text;
};

export const buildPatientOperationalInteractionPayload = (tenantId, patientId, interaction = {}) => {
  const description = validateOperationalText(interaction.description, 'Nota operacional', OPERATIONAL_TEXT_LIMIT);
  const nextAction = validateOperationalText(interaction.nextAction, 'Próximo passo', OPERATIONAL_NEXT_ACTION_LIMIT);
  const title = cleanText(interaction.title) || 'Pós-atendimento operacional';
  const occurredAt = interaction.occurredAt || new Date().toISOString();

  if (!patientId) {
    throw new Error('Paciente vinculado obrigatório para registrar pós-atendimento.');
  }

  if (description.length < 5) {
    throw new Error('Informe uma nota operacional com pelo menos 5 caracteres.');
  }

  if (nextAction.length < 3) {
    throw new Error('Informe um próximo passo operacional.');
  }

  return {
    tenant_id: tenantId,
    patient_id: patientId,
    source_key: cleanText(interaction.sourceKey) || null,
    interaction_type: 'note',
    title,
    description,
    icon_type: 'note',
    channel: cleanText(interaction.channel) || 'Recepção',
    occurred_at: occurredAt,
    metadata: {
      source: 'reception_post_attendance',
      operational_crm_note: true,
      appointment_link: interaction.appointmentLink === 'patient_id' ? 'patient_id' : 'unknown',
      has_next_action: Boolean(nextAction),
    },
  };
};
