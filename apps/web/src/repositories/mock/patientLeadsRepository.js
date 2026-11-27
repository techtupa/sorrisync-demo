import {
  LEAD_EVENT_TYPES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  getPatientLeadEventsByTenant as getMockPatientLeadEventsByTenant,
  getPatientLeadSummaryByTenant as getMockPatientLeadSummaryByTenant,
  getPatientLeadsByTenant as getMockPatientLeadsByTenant,
} from '../../data/mockPatientLeads.js';
import { getDefaultClinicTenant } from './tenantRepository.js';

const DEFAULT_TENANT_ID = 'tenant_aurora';

const resolveTenantId = (tenantId) => {
  return tenantId || getDefaultClinicTenant()?.tenant_id || DEFAULT_TENANT_ID;
};

export { LEAD_EVENT_TYPES, LEAD_PRIORITIES, LEAD_STATUSES };

export const getPatientLeadsByTenant = (tenantId) => {
  return getMockPatientLeadsByTenant(resolveTenantId(tenantId));
};

export const getPatientLeadSummaryByTenant = (tenantId) => {
  return getMockPatientLeadSummaryByTenant(resolveTenantId(tenantId));
};

export const getPatientLeadEventsByTenant = (tenantId, leadId = null) => {
  return getMockPatientLeadEventsByTenant(resolveTenantId(tenantId), leadId);
};

const cleanText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const SENSITIVE_METADATA_KEY_PATTERN = /token|senha|password|credential|credencial|document|documento|finance|financial|prontu[aá]?rio|diagn[oó]stico|diagnostico|agenda|integration|integracao|integração|payload/i;
const OPERATIONAL_SECRET_VALUE_PATTERN = [
  'bearer\\s+[a-z0-9._-]+',
  ['service', 'role'].join('_'),
  ['github', 'token'].join('_'),
  ['access', 'token'].join('_'),
  'password\\s*=',
  'secret\\s*=',
  'senha\\s*=',
].join('|');
const SENSITIVE_METADATA_VALUE_PATTERN = new RegExp([
  OPERATIONAL_SECRET_VALUE_PATTERN,
  '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b',
  '\\b\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}\\b',
  '\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b',
  '\\(\\d{2}\\)\\s?\\d{4,5}-\\d{4}',
].join('|'), 'i');

const sanitizeLeadEventMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return Object.entries(metadata).reduce((safeMetadata, [key, value]) => {
    const safeKey = cleanText(key);

    if (!safeKey || SENSITIVE_METADATA_KEY_PATTERN.test(safeKey)) {
      return safeMetadata;
    }

    if (typeof value === 'string') {
      const safeValue = cleanText(value).slice(0, 160);
      if (safeValue && !SENSITIVE_METADATA_VALUE_PATTERN.test(safeValue)) {
        safeMetadata[safeKey] = safeValue;
      }
      return safeMetadata;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      safeMetadata[safeKey] = value;
    }

    return safeMetadata;
  }, {});
};

const buildLeadEvent = (tenantId, leadId, event = {}) => {
  const occurredAt = event.occurredAt || new Date().toISOString();
  const type = cleanText(event.type) || LEAD_EVENT_TYPES.LEAD_UPDATED;

  return {
    id: event.id || `local-lead-event-${leadId || 'lead'}-${Date.now()}`,
    tenant_id: tenantId,
    leadId,
    sourceKey: cleanText(event.sourceKey) || `${type}_${Date.now()}`,
    type,
    title: cleanText(event.title) || 'Lead atualizado',
    description: cleanText(event.description),
    channel: cleanText(event.channel) || 'CRM',
    occurredAt,
    metadata: sanitizeLeadEventMetadata(event.metadata),
    created_at: occurredAt,
    updated_at: occurredAt,
  };
};

const buildLeadCapturedEvent = (tenantId, lead) => {
  return buildLeadEvent(tenantId, lead.id, {
    sourceKey: `${LEAD_EVENT_TYPES.LEAD_CAPTURED}_${lead.id}_${lead.capturedAt}`,
    type: LEAD_EVENT_TYPES.LEAD_CAPTURED,
    title: 'Lead capturado',
    description: `Origem: ${lead.origin || 'CRM'}`,
    occurredAt: lead.capturedAt,
    metadata: {
      source: 'mock_patient_leads_repository',
      lead_id: lead.id,
    },
  });
};

const buildLeadEventFromPatch = (tenantId, leadId, leadPatch = {}, updatedLead = {}) => {
  if (Object.hasOwn(leadPatch || {}, 'followUpAt') && leadPatch.followUpAt) {
    return buildLeadEvent(tenantId, leadId, {
      sourceKey: `${LEAD_EVENT_TYPES.FOLLOW_UP_SCHEDULED}_${leadId}_${updatedLead.updated_at}`,
      type: LEAD_EVENT_TYPES.FOLLOW_UP_SCHEDULED,
      title: 'Follow-up agendado',
      description: updatedLead.nextAction || 'Próximo contato registrado',
      occurredAt: updatedLead.updated_at,
      metadata: {
        source: 'mock_patient_leads_repository',
        lead_id: leadId,
        follow_up_at: leadPatch.followUpAt,
      },
    });
  }

  if (Object.hasOwn(leadPatch || {}, 'lastContactAt') && leadPatch.lastContactAt) {
    return buildLeadEvent(tenantId, leadId, {
      sourceKey: `${LEAD_EVENT_TYPES.CONTACT_LOGGED}_${leadId}_${leadPatch.lastContactAt}`,
      type: LEAD_EVENT_TYPES.CONTACT_LOGGED,
      title: 'Contato registrado',
      description: updatedLead.notesSummary || updatedLead.nextAction || 'Contato operacional registrado',
      occurredAt: leadPatch.lastContactAt,
      metadata: {
        source: 'mock_patient_leads_repository',
        lead_id: leadId,
      },
    });
  }

  if (Object.hasOwn(leadPatch || {}, 'status')) {
    const status = cleanText(leadPatch.status);
    const eventType = status === LEAD_STATUSES.PERDIDO
      ? LEAD_EVENT_TYPES.LEAD_LOST
      : LEAD_EVENT_TYPES.STATUS_CHANGED;

    return buildLeadEvent(tenantId, leadId, {
      sourceKey: `${eventType}_${leadId}_${updatedLead.updated_at}`,
      type: eventType,
      title: status === LEAD_STATUSES.PERDIDO ? 'Lead perdido' : 'Status atualizado',
      description: status === LEAD_STATUSES.PERDIDO
        ? 'Lead marcado como perdido no funil.'
        : `Status atual: ${updatedLead.status || status}`,
      occurredAt: updatedLead.updated_at,
      metadata: {
        source: 'mock_patient_leads_repository',
        lead_id: leadId,
      },
    });
  }

  return buildLeadEvent(tenantId, leadId, {
    sourceKey: `${LEAD_EVENT_TYPES.LEAD_UPDATED}_${leadId}_${updatedLead.updated_at}`,
    type: LEAD_EVENT_TYPES.LEAD_UPDATED,
    title: 'Lead atualizado',
    description: 'Dados operacionais do lead foram atualizados.',
    occurredAt: updatedLead.updated_at,
    metadata: {
      source: 'mock_patient_leads_repository',
      lead_id: leadId,
    },
  });
};

const buildCreatedLead = (tenantId, lead = {}) => {
  const now = new Date().toISOString();
  const name = cleanText(lead?.name);
  const status = cleanText(lead?.status) || LEAD_STATUSES.NOVO_LEAD;

  if (!name) {
    throw new Error('Lead name is required to create a CRM lead.');
  }

  if (status === LEAD_STATUSES.CONVERTIDO) {
    throw new Error('Use convertPatientLeadByTenant to convert a CRM lead.');
  }

  return {
    id: `local-lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: tenantId,
    name,
    phone: cleanText(lead?.phone),
    email: cleanText(lead?.email),
    origin: cleanText(lead?.origin) || 'Site',
    interest: cleanText(lead?.interest) || 'Avaliação inicial',
    status,
    estimatedValue: Math.max(0, Number(lead?.estimatedValue || 0)),
    capturedAt: now,
    lastContactAt: null,
    followUpAt: lead?.followUpAt || null,
    priority: cleanText(lead?.priority) || LEAD_PRIORITIES.NORMAL,
    nextAction: cleanText(lead?.nextAction) || 'Entrar em contato',
    responsible: cleanText(lead?.responsible),
    notesSummary: cleanText(lead?.notesSummary),
    convertedPatientId: null,
    convertedAt: null,
    created_at: now,
    updated_at: now,
  };
};

export const createPatientLeadByTenant = (tenantId, lead = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const createdLead = buildCreatedLead(resolvedTenantId, lead);

  return {
    lead: createdLead,
    event: buildLeadCapturedEvent(resolvedTenantId, createdLead),
  };
};

export const recordPatientLeadEventByTenant = (tenantId, leadId, event = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);

  if (!leadId) {
    throw new Error('Lead id is required to record a CRM lead event.');
  }

  return buildLeadEvent(resolvedTenantId, leadId, event);
};

export const updatePatientLeadByTenant = (tenantId, leadId, leadPatch = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);

  if (!leadId) {
    throw new Error('Lead id is required to update a CRM lead.');
  }

  if (cleanText(leadPatch?.status) === LEAD_STATUSES.CONVERTIDO) {
    throw new Error('Use convertPatientLeadByTenant to convert a CRM lead.');
  }

  const lead = getPatientLeadsByTenant(resolvedTenantId).find((item) => item.id === leadId) || {
    id: leadId,
    tenant_id: resolvedTenantId,
    name: cleanText(leadPatch?.name) || 'Lead atualizado',
    status: LEAD_STATUSES.NOVO_LEAD,
    origin: 'Site',
    interest: 'Avaliação inicial',
    estimatedValue: 0,
    priority: LEAD_PRIORITIES.NORMAL,
    followUpAt: null,
    convertedPatientId: null,
    convertedAt: null,
  };

  const updatedLead = {
    ...lead,
    name: Object.hasOwn(leadPatch || {}, 'name') ? cleanText(leadPatch.name) || lead.name : lead.name,
    phone: Object.hasOwn(leadPatch || {}, 'phone') ? cleanText(leadPatch.phone) : lead.phone,
    email: Object.hasOwn(leadPatch || {}, 'email') ? cleanText(leadPatch.email) : lead.email,
    origin: Object.hasOwn(leadPatch || {}, 'origin') ? cleanText(leadPatch.origin) || lead.origin : lead.origin,
    interest: Object.hasOwn(leadPatch || {}, 'interest') ? cleanText(leadPatch.interest) || lead.interest : lead.interest,
    status: Object.hasOwn(leadPatch || {}, 'status') ? cleanText(leadPatch.status) || lead.status : lead.status,
    estimatedValue: Object.hasOwn(leadPatch || {}, 'estimatedValue') ? Number(leadPatch.estimatedValue || 0) : lead.estimatedValue,
    lastContactAt: Object.hasOwn(leadPatch || {}, 'lastContactAt') ? leadPatch.lastContactAt || null : lead.lastContactAt,
    followUpAt: Object.hasOwn(leadPatch || {}, 'followUpAt') ? leadPatch.followUpAt || null : lead.followUpAt,
    priority: Object.hasOwn(leadPatch || {}, 'priority') ? cleanText(leadPatch.priority) || lead.priority : lead.priority,
    nextAction: Object.hasOwn(leadPatch || {}, 'nextAction') ? cleanText(leadPatch.nextAction) || lead.nextAction : lead.nextAction,
    responsible: Object.hasOwn(leadPatch || {}, 'responsible') ? cleanText(leadPatch.responsible) : lead.responsible,
    notesSummary: Object.hasOwn(leadPatch || {}, 'notesSummary') ? cleanText(leadPatch.notesSummary) : lead.notesSummary,
    tenant_id: resolvedTenantId,
    updated_at: new Date().toISOString(),
  };
  const updateEvent = leadPatch?.skipEvent
    ? null
    : buildLeadEventFromPatch(resolvedTenantId, leadId, leadPatch, updatedLead);

  return {
    lead: updatedLead,
    event: updateEvent,
  };
};

export const buildPatientDraftFromLead = (lead, overrides = {}) => {
  const now = new Date().toISOString();

  return {
    name: overrides.name || lead?.name || 'Lead convertido',
    phone: overrides.phone || lead?.phone || '',
    email: overrides.email || lead?.email || '',
    origin: overrides.origin || lead?.origin || 'Site',
    interest: overrides.interest || lead?.interest || 'Avaliação inicial',
    status: overrides.status || 'Novo lead',
    estimatedValue: Number(overrides.estimatedValue ?? lead?.estimatedValue ?? 0),
    lastInteraction: overrides.lastInteraction || now,
    nextAction: overrides.nextAction || 'Primeiro atendimento do paciente convertido',
    responsible: overrides.responsible || lead?.responsible || '',
    notes: overrides.notes || lead?.notesSummary || '',
  };
};

export const convertPatientLeadByTenant = (tenantId, leadId, overrides = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const lead = getPatientLeadsByTenant(resolvedTenantId).find((item) => item.id === leadId);

  if (lead?.convertedPatientId || lead?.status === LEAD_STATUSES.CONVERTIDO) {
    throw new Error('Lead already converted.');
  }

  const convertedAt = new Date().toISOString();
  const patientId = `local-patient-from-${leadId || 'lead'}`;
  const conversionEvent = buildLeadEvent(resolvedTenantId, leadId, {
    sourceKey: `${LEAD_EVENT_TYPES.LEAD_CONVERTED}_${leadId || 'lead'}_${convertedAt}`,
    type: LEAD_EVENT_TYPES.LEAD_CONVERTED,
    title: 'Lead convertido',
    description: 'Paciente criado no CRM a partir do lead.',
    occurredAt: convertedAt,
    metadata: {
      source: 'mock_patient_leads_repository',
      patient_id: patientId,
    },
  });

  return {
    patient: {
      ...buildPatientDraftFromLead(lead, overrides),
      id: patientId,
      tenant_id: resolvedTenantId,
      created_at: convertedAt,
      updated_at: convertedAt,
    },
    lead: {
      ...(lead || { id: leadId, tenant_id: resolvedTenantId }),
      status: LEAD_STATUSES.CONVERTIDO,
      convertedPatientId: patientId,
      convertedAt,
      lastContactAt: convertedAt,
      followUpAt: null,
      nextAction: 'Paciente criado no CRM',
    },
    event: conversionEvent,
  };
};
