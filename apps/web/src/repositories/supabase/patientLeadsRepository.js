import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  LEAD_EVENT_TYPES,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  getPatientLeadEventsByTenant as getMockPatientLeadEventsByTenant,
  getPatientLeadSummaryByTenant as getMockPatientLeadSummaryByTenant,
  getPatientLeadsByTenant as getMockPatientLeadsByTenant,
} from '../mock/patientLeadsRepository.js';
import { createPatientByTenant } from './patientsRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const leadSelect = `
  id,
  tenant_id,
  name,
  phone,
  email,
  origin,
  interest,
  status,
  estimated_value,
  captured_at,
  last_contact_at,
  follow_up_at,
  priority,
  next_action,
  responsible_label,
  notes_summary,
  converted_patient_id,
  converted_at,
  created_at,
  updated_at
`;

const leadEventSelect = `
  id,
  tenant_id,
  lead_id,
  source_key,
  event_type,
  title,
  description,
  channel,
  occurred_at,
  metadata,
  created_at,
  updated_at
`;

const mapLead = (lead) => ({
  id: lead.id,
  tenant_id: lead.tenant_id,
  name: lead.name,
  phone: lead.phone || '',
  email: lead.email || '',
  origin: lead.origin || 'Site',
  interest: lead.interest || 'Avaliação inicial',
  status: lead.status || 'Novo lead',
  estimatedValue: Number(lead.estimated_value || 0),
  capturedAt: lead.captured_at,
  lastContactAt: lead.last_contact_at,
  followUpAt: lead.follow_up_at || null,
  priority: lead.priority || 'Normal',
  nextAction: lead.next_action || 'Entrar em contato',
  responsible: lead.responsible_label || '',
  notesSummary: lead.notes_summary || '',
  convertedPatientId: lead.converted_patient_id || null,
  convertedAt: lead.converted_at || null,
  created_at: lead.created_at,
  updated_at: lead.updated_at,
});

const mapLeadEvent = (event) => ({
  id: event.id,
  tenant_id: event.tenant_id,
  leadId: event.lead_id,
  sourceKey: event.source_key,
  type: event.event_type,
  title: event.title,
  description: event.description || '',
  channel: event.channel || 'CRM',
  occurredAt: event.occurred_at,
  metadata: event.metadata || {},
  created_at: event.created_at,
  updated_at: event.updated_at,
});

const buildSummary = (leads) => ({
  total: leads.length,
  open: leads.filter(isOpenLead).length,
  converted: leads.filter((lead) => normalizeLeadLabel(lead.status) === 'convertido').length,
  lost: leads.filter((lead) => normalizeLeadLabel(lead.status) === 'perdido').length,
  scheduledFollowUps: leads.filter((lead) => lead.followUpAt && isOpenLead(lead)).length,
  urgent: leads.filter(isUrgentLead).length,
});

const cleanText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeLeadLabel = (value) => cleanText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const terminalLeadStatuses = new Set(['convertido', 'perdido']);
const isOpenLead = (lead) => !terminalLeadStatuses.has(normalizeLeadLabel(lead?.status));
const isUrgentLead = (lead) => normalizeLeadLabel(lead?.priority) === normalizeLeadLabel(LEAD_PRIORITIES.URGENTE);

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

const generateLeadEventSourceKey = (type) => {
  return `${type || LEAD_EVENT_TYPES.LEAD_UPDATED}_${Date.now()}`;
};

const buildLeadEventPayload = (tenantId, leadId, event = {}) => {
  const type = cleanText(event.type) || LEAD_EVENT_TYPES.LEAD_UPDATED;
  const occurredAt = event.occurredAt || new Date().toISOString();

  return {
    tenant_id: tenantId,
    lead_id: leadId,
    source_key: cleanText(event.sourceKey) || generateLeadEventSourceKey(type),
    event_type: type,
    title: cleanText(event.title) || 'Lead atualizado',
    description: cleanText(event.description) || null,
    channel: cleanText(event.channel) || 'CRM',
    occurred_at: occurredAt,
    metadata: sanitizeLeadEventMetadata(event.metadata),
  };
};

const buildLeadEventFromPatch = (leadId, leadPatch = {}, updatedLead = {}) => {
  if (Object.hasOwn(leadPatch || {}, 'followUpAt') && leadPatch.followUpAt) {
    return {
      sourceKey: generateLeadEventSourceKey(LEAD_EVENT_TYPES.FOLLOW_UP_SCHEDULED),
      type: LEAD_EVENT_TYPES.FOLLOW_UP_SCHEDULED,
      title: 'Follow-up agendado',
      description: updatedLead.nextAction || 'Próximo contato registrado',
      occurredAt: new Date().toISOString(),
      metadata: {
        source: 'patient_leads_repository',
        lead_id: leadId,
        follow_up_at: leadPatch.followUpAt,
      },
    };
  }

  if (Object.hasOwn(leadPatch || {}, 'lastContactAt') && leadPatch.lastContactAt) {
    return {
      sourceKey: generateLeadEventSourceKey(LEAD_EVENT_TYPES.CONTACT_LOGGED),
      type: LEAD_EVENT_TYPES.CONTACT_LOGGED,
      title: 'Contato registrado',
      description: updatedLead.notesSummary || updatedLead.nextAction || 'Contato operacional registrado',
      occurredAt: leadPatch.lastContactAt,
      metadata: {
        source: 'patient_leads_repository',
        lead_id: leadId,
      },
    };
  }

  if (Object.hasOwn(leadPatch || {}, 'status')) {
    const status = cleanText(leadPatch.status);

    return {
      sourceKey: generateLeadEventSourceKey(status === 'Perdido' ? LEAD_EVENT_TYPES.LEAD_LOST : LEAD_EVENT_TYPES.STATUS_CHANGED),
      type: status === 'Perdido' ? LEAD_EVENT_TYPES.LEAD_LOST : LEAD_EVENT_TYPES.STATUS_CHANGED,
      title: 'Status atualizado',
      description: `Status atual: ${updatedLead.status || status}`,
      occurredAt: new Date().toISOString(),
      metadata: {
        source: 'patient_leads_repository',
        lead_id: leadId,
      },
    };
  }

  return {
    sourceKey: generateLeadEventSourceKey(LEAD_EVENT_TYPES.LEAD_UPDATED),
    type: LEAD_EVENT_TYPES.LEAD_UPDATED,
    title: 'Lead atualizado',
    description: 'Dados operacionais do lead foram atualizados.',
    occurredAt: new Date().toISOString(),
    metadata: {
      source: 'patient_leads_repository',
      lead_id: leadId,
    },
  };
};

const persistLeadEventSafely = async (tenantId, leadId, event) => {
  try {
    return await recordPatientLeadEventByTenant(tenantId, leadId, event);
  } catch {
    // Lead event creation is complementary; the lead operation must remain saved.
    return null;
  }
};

const setLeadTextField = (payload, field, value, { nullable = false } = {}) => {
  const text = cleanText(value);

  if (text) {
    payload[field] = text;
  } else if (nullable) {
    payload[field] = null;
  }
};

const buildLeadInsertPayload = (tenantId, lead = {}) => {
  const name = cleanText(lead?.name);
  const status = cleanText(lead?.status) || LEAD_STATUSES.NOVO_LEAD;
  const notesSummary = cleanText(lead?.notesSummary);

  if (!name) {
    throw new Error('Lead name is required to create a CRM lead.');
  }

  if (status === LEAD_STATUSES.CONVERTIDO) {
    throw new Error('Use convertPatientLeadByTenant to convert a CRM lead.');
  }

  const payload = {
    tenant_id: tenantId,
    name,
    origin: cleanText(lead?.origin) || 'Site',
    interest: cleanText(lead?.interest) || 'Avaliação inicial',
    status,
    estimated_value: Math.max(0, Number(lead?.estimatedValue || 0)),
    captured_at: new Date().toISOString(),
    next_action: cleanText(lead?.nextAction) || 'Entrar em contato',
    priority: cleanText(lead?.priority) || LEAD_PRIORITIES.NORMAL,
    metadata: {
      source: 'patient_leads_repository',
      has_notes: Boolean(notesSummary),
    },
  };

  setLeadTextField(payload, 'phone', lead?.phone, { nullable: true });
  setLeadTextField(payload, 'email', lead?.email, { nullable: true });
  setLeadTextField(payload, 'responsible_label', lead?.responsible, { nullable: true });
  setLeadTextField(payload, 'notes_summary', notesSummary, { nullable: true });

  if (lead?.followUpAt) {
    payload.follow_up_at = lead.followUpAt;
  }

  return payload;
};

const buildLeadUpdatePayload = (leadPatch) => {
  const payload = {};
  const has = (field) => Object.hasOwn(leadPatch || {}, field);

  // Operational CRM fields only. Conversion, id, tenant_id and metadata are handled outside this patch path.
  if (has('name')) setLeadTextField(payload, 'name', leadPatch.name);
  if (has('phone')) setLeadTextField(payload, 'phone', leadPatch.phone, { nullable: true });
  if (has('email')) setLeadTextField(payload, 'email', leadPatch.email, { nullable: true });
  if (has('origin')) setLeadTextField(payload, 'origin', leadPatch.origin);
  if (has('interest')) setLeadTextField(payload, 'interest', leadPatch.interest);
  if (has('status')) setLeadTextField(payload, 'status', leadPatch.status);
  if (has('nextAction')) setLeadTextField(payload, 'next_action', leadPatch.nextAction);
  if (has('responsible')) setLeadTextField(payload, 'responsible_label', leadPatch.responsible, { nullable: true });
  if (has('notesSummary')) setLeadTextField(payload, 'notes_summary', leadPatch.notesSummary, { nullable: true });
  if (has('priority')) setLeadTextField(payload, 'priority', leadPatch.priority);

  if (has('estimatedValue')) {
    payload.estimated_value = Number(leadPatch.estimatedValue || 0);
  }

  if (has('lastContactAt')) {
    payload.last_contact_at = leadPatch.lastContactAt || null;
  }

  if (has('followUpAt')) {
    payload.follow_up_at = leadPatch.followUpAt || null;
  }

  return payload;
};

const buildCreatedFallbackLead = (tenantId, lead = {}) => {
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

const buildUpdatedFallbackLead = (tenantId, leadId, leadPatch) => {
  const fallbackLead = getMockPatientLeadsByTenant(tenantId).find((lead) => lead.id === leadId);
  const baseLead = fallbackLead || {
    id: leadId,
    tenant_id: tenantId,
    name: cleanText(leadPatch?.name) || 'Lead atualizado',
    status: 'Novo lead',
    origin: 'Site',
    interest: 'Avaliação inicial',
    estimatedValue: 0,
    priority: 'Normal',
    followUpAt: null,
    capturedAt: new Date().toISOString(),
    convertedPatientId: null,
    convertedAt: null,
  };

  return {
    ...baseLead,
    name: Object.hasOwn(leadPatch || {}, 'name') ? cleanText(leadPatch.name) || baseLead.name : baseLead.name,
    phone: Object.hasOwn(leadPatch || {}, 'phone') ? cleanText(leadPatch.phone) : baseLead.phone,
    email: Object.hasOwn(leadPatch || {}, 'email') ? cleanText(leadPatch.email) : baseLead.email,
    origin: Object.hasOwn(leadPatch || {}, 'origin') ? cleanText(leadPatch.origin) || baseLead.origin : baseLead.origin,
    interest: Object.hasOwn(leadPatch || {}, 'interest') ? cleanText(leadPatch.interest) || baseLead.interest : baseLead.interest,
    status: Object.hasOwn(leadPatch || {}, 'status') ? cleanText(leadPatch.status) || baseLead.status : baseLead.status,
    estimatedValue: Object.hasOwn(leadPatch || {}, 'estimatedValue') ? Number(leadPatch.estimatedValue || 0) : baseLead.estimatedValue,
    lastContactAt: Object.hasOwn(leadPatch || {}, 'lastContactAt') ? leadPatch.lastContactAt || null : baseLead.lastContactAt,
    followUpAt: Object.hasOwn(leadPatch || {}, 'followUpAt') ? leadPatch.followUpAt || null : baseLead.followUpAt,
    priority: Object.hasOwn(leadPatch || {}, 'priority') ? cleanText(leadPatch.priority) || baseLead.priority : baseLead.priority,
    nextAction: Object.hasOwn(leadPatch || {}, 'nextAction') ? cleanText(leadPatch.nextAction) || baseLead.nextAction : baseLead.nextAction,
    responsible: Object.hasOwn(leadPatch || {}, 'responsible') ? cleanText(leadPatch.responsible) : baseLead.responsible,
    notesSummary: Object.hasOwn(leadPatch || {}, 'notesSummary') ? cleanText(leadPatch.notesSummary) : baseLead.notesSummary,
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  };
};

export const fetchPatientLeadsByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getMockPatientLeadsByTenant(tenantId);
  }

  const response = await supabase
    .from('patient_leads')
    .select(leadSelect)
    .eq('tenant_id', tenantId)
    .order('captured_at', { ascending: false })
    .order('name', { ascending: true });

  if (response.error) {
    return getMockPatientLeadsByTenant(tenantId);
  }

  const leads = (response.data || []).map(mapLead);

  if (!leads.length) {
    return getMockPatientLeadsByTenant(tenantId);
  }

  return leads;
};

export const fetchPatientLeadSummaryByTenant = async (tenantId) => {
  const leads = await fetchPatientLeadsByTenant(tenantId);

  if (!leads.length) {
    return getMockPatientLeadSummaryByTenant(tenantId);
  }

  return buildSummary(leads);
};

export const fetchPatientLeadEventsByTenant = async (tenantId, leadId = null) => {
  if (!hasSupabase() || !tenantId) {
    return getMockPatientLeadEventsByTenant(tenantId, leadId);
  }

  let query = supabase
    .from('patient_lead_events')
    .select(leadEventSelect)
    .eq('tenant_id', tenantId)
    .order('occurred_at', { ascending: false });

  if (leadId) {
    query = query.eq('lead_id', leadId);
  }

  const response = await query;

  if (response.error) {
    return getMockPatientLeadEventsByTenant(tenantId, leadId);
  }

  const events = (response.data || []).map(mapLeadEvent);

  if (!events.length) {
    return getMockPatientLeadEventsByTenant(tenantId, leadId);
  }

  return events;
};

export const createPatientLeadByTenant = async (tenantId, lead = {}) => {
  if (!tenantId) {
    throw new Error('Tenant id is required to create a CRM lead.');
  }

  if (!hasSupabase()) {
    const fallbackLead = buildCreatedFallbackLead(tenantId, lead);
    const creationEvent = await persistLeadEventSafely(tenantId, fallbackLead.id, {
      sourceKey: `${LEAD_EVENT_TYPES.LEAD_CAPTURED}_${fallbackLead.id}_${fallbackLead.capturedAt}`,
      type: LEAD_EVENT_TYPES.LEAD_CAPTURED,
      title: 'Lead capturado',
      description: `Origem: ${fallbackLead.origin || 'CRM'}`,
      occurredAt: fallbackLead.capturedAt,
      metadata: {
        source: 'patient_leads_repository',
        lead_id: fallbackLead.id,
      },
    });

    return {
      lead: fallbackLead,
      event: creationEvent,
    };
  }

  const response = await supabase
    .from('patient_leads')
    .insert(buildLeadInsertPayload(tenantId, lead))
    .select(leadSelect)
    .single();

  if (response.error) {
    throw response.error;
  }

  const createdLead = mapLead(response.data);
  const creationEvent = await persistLeadEventSafely(tenantId, createdLead.id, {
    sourceKey: `${LEAD_EVENT_TYPES.LEAD_CAPTURED}_${createdLead.id}_${createdLead.capturedAt}`,
    type: LEAD_EVENT_TYPES.LEAD_CAPTURED,
    title: 'Lead capturado',
    description: `Origem: ${createdLead.origin || 'CRM'}`,
    occurredAt: createdLead.capturedAt,
    metadata: {
      source: 'patient_leads_repository',
      lead_id: createdLead.id,
    },
  });

  return {
    lead: createdLead,
    event: creationEvent,
  };
};

export const recordPatientLeadEventByTenant = async (tenantId, leadId, event = {}) => {
  if (!leadId) {
    throw new Error('Lead id is required to record a CRM lead event.');
  }

  if (!hasSupabase() || !tenantId) {
    const fallbackEvent = buildLeadEventPayload(tenantId, leadId, event);

    return {
      id: `local-lead-event-${leadId}-${Date.now()}`,
      tenant_id: tenantId,
      leadId,
      sourceKey: fallbackEvent.source_key,
      type: fallbackEvent.event_type,
      title: fallbackEvent.title,
      description: fallbackEvent.description || '',
      channel: fallbackEvent.channel,
      occurredAt: fallbackEvent.occurred_at,
      metadata: fallbackEvent.metadata,
      created_at: fallbackEvent.occurred_at,
      updated_at: fallbackEvent.occurred_at,
    };
  }

  const response = await supabase
    .from('patient_lead_events')
    .insert(buildLeadEventPayload(tenantId, leadId, event))
    .select(leadEventSelect)
    .single();

  if (response.error) {
    throw response.error;
  }

  return mapLeadEvent(response.data);
};

export const updatePatientLeadByTenant = async (tenantId, leadId, leadPatch = {}) => {
  if (!leadId) {
    throw new Error('Lead id is required to update a CRM lead.');
  }

  if (cleanText(leadPatch?.status) === 'Convertido') {
    throw new Error('Use convertPatientLeadByTenant to convert a CRM lead.');
  }

  if (!hasSupabase() || !tenantId) {
    const fallbackLead = buildUpdatedFallbackLead(tenantId, leadId, leadPatch);
    let updateEvent = null;

    if (!leadPatch?.skipEvent) {
      updateEvent = await persistLeadEventSafely(tenantId, leadId, buildLeadEventFromPatch(leadId, leadPatch, fallbackLead));
    }

    return {
      lead: fallbackLead,
      event: updateEvent,
    };
  }

  const payload = buildLeadUpdatePayload(leadPatch);

  if (!Object.keys(payload).length) {
    const existingLead = await supabase
      .from('patient_leads')
      .select(leadSelect)
      .eq('tenant_id', tenantId)
      .eq('id', leadId)
      .single();

    if (existingLead.error) {
      throw existingLead.error;
    }

    return {
      lead: mapLead(existingLead.data),
      event: null,
    };
  }

  const response = await supabase
    .from('patient_leads')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .is('converted_patient_id', null)
    .select(leadSelect)
    .single();

  if (response.error) {
    throw response.error;
  }

  const updatedLead = mapLead(response.data);
  let updateEvent = null;

  if (!leadPatch?.skipEvent) {
    updateEvent = await persistLeadEventSafely(tenantId, leadId, buildLeadEventFromPatch(leadId, leadPatch, updatedLead));
  }

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

const markLeadConvertedByTenant = async (tenantId, leadId, patientId, convertedAt) => {
  const response = await supabase
    .from('patient_leads')
    .update({
      status: 'Convertido',
      converted_patient_id: patientId,
      converted_at: convertedAt,
      last_contact_at: convertedAt,
      follow_up_at: null,
      next_action: 'Paciente criado no CRM',
    })
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .is('converted_patient_id', null)
    .select(leadSelect)
    .single();

  if (response.error) {
    throw response.error;
  }

  return mapLead(response.data);
};

export const convertPatientLeadByTenant = async (tenantId, leadId, overrides = {}) => {
  if (!leadId) {
    throw new Error('Lead id is required to convert a CRM lead.');
  }

  const fallbackLead = getMockPatientLeadsByTenant(tenantId).find((lead) => lead.id === leadId);

  if (!hasSupabase() || !tenantId) {
    if (fallbackLead?.convertedPatientId || fallbackLead?.status === 'Convertido') {
      throw new Error('Lead already converted.');
    }

    const convertedAt = new Date().toISOString();
    const patient = buildPatientDraftFromLead(fallbackLead || { id: leadId }, overrides);
    const patientId = `local-patient-from-${leadId}`;
    const conversionEvent = await persistLeadEventSafely(tenantId, leadId, {
      sourceKey: `${LEAD_EVENT_TYPES.LEAD_CONVERTED}_${leadId}_${convertedAt}`,
      type: LEAD_EVENT_TYPES.LEAD_CONVERTED,
      title: 'Lead convertido',
      description: 'Paciente criado no CRM a partir do lead.',
      occurredAt: convertedAt,
      metadata: {
        source: 'patient_leads_repository',
        patient_id: patientId,
      },
    });

    return {
      patient: {
        ...patient,
        id: patientId,
        tenant_id: tenantId,
        created_at: convertedAt,
        updated_at: convertedAt,
      },
      lead: {
        ...(fallbackLead || { id: leadId, tenant_id: tenantId }),
        status: 'Convertido',
        convertedPatientId: patientId,
        convertedAt,
        lastContactAt: convertedAt,
        followUpAt: null,
        nextAction: 'Paciente criado no CRM',
      },
      event: conversionEvent,
    };
  }

  const leadResponse = await supabase
    .from('patient_leads')
    .select(leadSelect)
    .eq('tenant_id', tenantId)
    .eq('id', leadId)
    .single();

  if (leadResponse.error) {
    throw leadResponse.error;
  }

  const lead = mapLead(leadResponse.data);

  if (lead.convertedPatientId || lead.status === 'Convertido') {
    throw new Error('Lead already converted.');
  }

  const convertedAt = new Date().toISOString();
  const patient = await createPatientByTenant(tenantId, buildPatientDraftFromLead(lead, overrides));
  const convertedLead = await markLeadConvertedByTenant(tenantId, leadId, patient.id, convertedAt);
  const conversionEvent = await persistLeadEventSafely(tenantId, leadId, {
    sourceKey: generateLeadEventSourceKey(LEAD_EVENT_TYPES.LEAD_CONVERTED),
    type: LEAD_EVENT_TYPES.LEAD_CONVERTED,
    title: 'Lead convertido',
    description: 'Paciente criado no CRM a partir do lead.',
    occurredAt: convertedAt,
    metadata: {
      source: 'patient_leads_repository',
      patient_id: patient.id,
    },
  });

  return {
    patient,
    lead: convertedLead,
    event: conversionEvent,
  };
};
