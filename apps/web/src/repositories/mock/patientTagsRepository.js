import { getPatientsByTenant } from './patientsRepository.js';

const DEFAULT_TENANT_ID = 'tenant_aurora';

const TAG_CATALOG = [
  { code: 'lead_quente', label: 'Lead quente', description: 'Lead com alta intenção de agendamento.', color: 'red', icon: 'flame', sort_order: 10 },
  { code: 'orcamento_aberto', label: 'Orçamento aberto', description: 'Paciente com orçamento em acompanhamento.', color: 'orange', icon: 'file-text', sort_order: 20 },
  { code: 'retorno_preventivo', label: 'Retorno preventivo', description: 'Paciente elegível para rechamada preventiva.', color: 'blue', icon: 'rotate-ccw', sort_order: 30 },
  { code: 'implante', label: 'Implante', description: 'Segmento demo para interessados em implantes.', color: 'indigo', icon: 'activity', sort_order: 40 },
  { code: 'prioridade_clinica', label: 'Prioridade clínica', description: 'Acompanhamento prioritário definido pela equipe.', color: 'purple', icon: 'star', sort_order: 50 },
];

const resolveTenantId = (tenantId) => tenantId || DEFAULT_TENANT_ID;

const getTagCodeForPatient = (patient, index) => {
  if (patient.status === 'Novo lead' && Number(patient.estimatedValue || 0) >= 9000) return 'lead_quente';
  if (patient.status === 'Orçamento enviado') return 'orcamento_aberto';
  if (patient.status === 'Retorno pendente') return 'retorno_preventivo';
  if (patient.interest === 'Implantes') return 'implante';
  if ([1, 3, 7].includes(index)) return 'prioridade_clinica';
  return null;
};

export const getPatientTagsByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);

  return TAG_CATALOG.map((tag) => ({
    id: `${resolvedTenantId}_${tag.code}`,
    tenant_id: resolvedTenantId,
    is_active: true,
    ...tag,
  }));
};

export const getPatientTagAssignmentsByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const tags = getPatientTagsByTenant(resolvedTenantId);
  const tagByCode = tags.reduce((acc, tag) => {
    acc[tag.code] = tag;
    return acc;
  }, {});

  return getPatientsByTenant(resolvedTenantId)
    .map((patient, index) => {
      const tagCode = getTagCodeForPatient(patient, index);
      const tag = tagByCode[tagCode];
      if (!tag) return null;

      return {
        tenant_id: resolvedTenantId,
        patient_id: patient.id,
        tag_id: tag.id,
        tag,
        assigned_at: patient.lastInteraction,
      };
    })
    .filter(Boolean);
};

export const getPatientTagsForPatientByTenant = (tenantId, patientId) => {
  return getPatientTagAssignmentsByTenant(tenantId)
    .filter((assignment) => assignment.patient_id === patientId)
    .map((assignment) => assignment.tag);
};

export const getPatientTagSummaryByTenant = (tenantId) => {
  const tags = getPatientTagsByTenant(tenantId);
  const assignments = getPatientTagAssignmentsByTenant(tenantId);

  return tags.map((tag) => ({
    ...tag,
    patient_count: assignments.filter((assignment) => assignment.tag_id === tag.id).length,
  }));
};
