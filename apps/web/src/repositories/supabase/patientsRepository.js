import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import { getPatientsByTenant as getMockPatientsByTenant } from '../mock/patientsRepository.js';
import { createInitialPatientInteractionsByTenant } from './patientInteractionsRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const getFallbackPatients = (tenantId) => getMockPatientsByTenant(tenantId);

const cleanText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const deriveInitials = (name = '') => {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PX';
};

const patientSelect = `
  id,
  tenant_id,
  name,
  phone,
  email,
  origin,
  interest,
  status,
  estimated_value,
  last_interaction_at,
  next_action,
  responsible_label,
  avatar_initials,
  cpf_visual,
  birthdate,
  address,
  created_at,
  updated_at
`;

const mapPatient = (patient) => ({
  id: patient.id,
  tenant_id: patient.tenant_id,
  name: patient.name,
  phone: patient.phone || '',
  email: patient.email || '',
  origin: patient.origin || 'Site',
  interest: patient.interest || 'Avaliação inicial',
  status: patient.status || 'Novo lead',
  estimatedValue: Number(patient.estimated_value || 0),
  lastInteraction: patient.last_interaction_at,
  nextAction: patient.next_action || 'Entrar em contato',
  responsible: patient.responsible_label || '',
  avatarInitials: patient.avatar_initials || deriveInitials(patient.name),
  cpf: patient.cpf_visual || '',
  birthdate: patient.birthdate || null,
  address: patient.address || '',
  created_at: patient.created_at,
  updated_at: patient.updated_at,
});

const buildFallbackPatient = (tenantId, patient) => {
  const now = new Date().toISOString();
  const name = cleanText(patient?.name) || 'Paciente sem nome';

  return {
    id: patient?.id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: tenantId,
    name,
    phone: cleanText(patient?.phone),
    email: cleanText(patient?.email),
    origin: cleanText(patient?.origin) || 'Site',
    interest: cleanText(patient?.interest) || 'Avaliação inicial',
    status: cleanText(patient?.status) || 'Novo lead',
    estimatedValue: Number(patient?.estimatedValue || 0),
    lastInteraction: patient?.lastInteraction || now,
    nextAction: cleanText(patient?.nextAction) || 'Entrar em contato',
    responsible: cleanText(patient?.responsible),
    avatarInitials: cleanText(patient?.avatarInitials) || deriveInitials(name),
    cpf: cleanText(patient?.cpf),
    birthdate: patient?.birthdate || null,
    address: cleanText(patient?.address),
    created_at: now,
    updated_at: now,
  };
};

const buildInsertPayload = (tenantId, patient) => {
  const name = cleanText(patient?.name);
  const notes = cleanText(patient?.notes);

  return {
    tenant_id: tenantId,
    name,
    phone: cleanText(patient?.phone) || null,
    email: cleanText(patient?.email) || null,
    origin: cleanText(patient?.origin) || 'Site',
    interest: cleanText(patient?.interest) || 'Avaliação inicial',
    status: cleanText(patient?.status) || 'Novo lead',
    estimated_value: Number(patient?.estimatedValue || 0),
    last_interaction_at: patient?.lastInteraction || new Date().toISOString(),
    next_action: cleanText(patient?.nextAction) || 'Entrar em contato',
    responsible_label: cleanText(patient?.responsible) || null,
    avatar_initials: cleanText(patient?.avatarInitials) || deriveInitials(name),
    cpf_visual: cleanText(patient?.cpf) || null,
    birthdate: patient?.birthdate || null,
    address: cleanText(patient?.address) || null,
    metadata: {
      source: 'crm_new_patient_modal',
      has_notes: Boolean(notes),
    },
  };
};

const setTextField = (payload, field, value, { nullable = false } = {}) => {
  const text = cleanText(value);

  if (text) {
    payload[field] = text;
  } else if (nullable) {
    payload[field] = null;
  }
};

const buildUpdatePayload = (patient) => {
  const payload = {};
  const has = (field) => Object.hasOwn(patient || {}, field);

  // Only display-safe CRM fields can be edited here. Never accept id, tenant_id or metadata from the UI.
  if (has('name')) {
    const name = cleanText(patient.name);

    if (name) {
      payload.name = name;
      payload.avatar_initials = cleanText(patient.avatarInitials) || deriveInitials(name);
    }
  }

  if (has('phone')) setTextField(payload, 'phone', patient.phone, { nullable: true });
  if (has('email')) setTextField(payload, 'email', patient.email, { nullable: true });
  if (has('origin')) setTextField(payload, 'origin', patient.origin);
  if (has('interest')) setTextField(payload, 'interest', patient.interest);
  if (has('status')) setTextField(payload, 'status', patient.status);
  if (has('nextAction')) setTextField(payload, 'next_action', patient.nextAction);
  if (has('responsible')) setTextField(payload, 'responsible_label', patient.responsible, { nullable: true });
  if (has('avatarInitials') && !payload.avatar_initials) setTextField(payload, 'avatar_initials', patient.avatarInitials, { nullable: true });
  if (has('cpf')) setTextField(payload, 'cpf_visual', patient.cpf, { nullable: true });
  if (has('address')) setTextField(payload, 'address', patient.address, { nullable: true });

  if (has('birthdate')) {
    payload.birthdate = patient.birthdate || null;
  }

  if (has('estimatedValue')) {
    payload.estimated_value = Number(patient.estimatedValue || 0);
  }

  if (has('lastInteraction') && patient.lastInteraction) {
    payload.last_interaction_at = patient.lastInteraction;
  }

  return payload;
};

const buildUpdatedFallbackPatient = (tenantId, patientId, patient) => {
  const now = new Date().toISOString();
  const fallbackPatient = getFallbackPatients(tenantId).find((item) => item.id === patientId);
  const basePatient = fallbackPatient || buildFallbackPatient(tenantId, { ...patient, id: patientId });
  const name = cleanText(patient?.name) || basePatient.name;

  return {
    ...basePatient,
    name,
    phone: Object.hasOwn(patient || {}, 'phone') ? cleanText(patient.phone) : basePatient.phone,
    email: Object.hasOwn(patient || {}, 'email') ? cleanText(patient.email) : basePatient.email,
    origin: Object.hasOwn(patient || {}, 'origin') ? cleanText(patient.origin) || basePatient.origin : basePatient.origin,
    interest: Object.hasOwn(patient || {}, 'interest') ? cleanText(patient.interest) || basePatient.interest : basePatient.interest,
    status: Object.hasOwn(patient || {}, 'status') ? cleanText(patient.status) || basePatient.status : basePatient.status,
    estimatedValue: Object.hasOwn(patient || {}, 'estimatedValue') ? Number(patient.estimatedValue || 0) : basePatient.estimatedValue,
    lastInteraction: Object.hasOwn(patient || {}, 'lastInteraction') ? patient.lastInteraction || basePatient.lastInteraction : basePatient.lastInteraction,
    nextAction: Object.hasOwn(patient || {}, 'nextAction') ? cleanText(patient.nextAction) || basePatient.nextAction : basePatient.nextAction,
    responsible: Object.hasOwn(patient || {}, 'responsible') ? cleanText(patient.responsible) : basePatient.responsible,
    avatarInitials: Object.hasOwn(patient || {}, 'avatarInitials') ? cleanText(patient.avatarInitials) || deriveInitials(name) : basePatient.avatarInitials,
    cpf: Object.hasOwn(patient || {}, 'cpf') ? cleanText(patient.cpf) : basePatient.cpf,
    birthdate: Object.hasOwn(patient || {}, 'birthdate') ? patient.birthdate || null : basePatient.birthdate,
    address: Object.hasOwn(patient || {}, 'address') ? cleanText(patient.address) : basePatient.address,
    id: patientId || basePatient.id,
    tenant_id: tenantId,
    updated_at: now,
  };
};

export const fetchPatientsByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getFallbackPatients(tenantId);
  }

  const response = await supabase
    .from('patients')
    .select(patientSelect)
    .eq('tenant_id', tenantId)
    .order('last_interaction_at', { ascending: false })
    .order('name', { ascending: true });

  if (response.error) {
    return getFallbackPatients(tenantId);
  }

  const patients = (response.data || []).map(mapPatient);

  if (!patients.length) {
    return getFallbackPatients(tenantId);
  }

  return patients;
};

export const createPatientByTenant = async (tenantId, patient) => {
  if (!hasSupabase() || !tenantId) {
    return buildFallbackPatient(tenantId, patient);
  }

  const payload = buildInsertPayload(tenantId, patient);

  const response = await supabase
    .from('patients')
    .insert(payload)
    .select(patientSelect)
    .single();

  if (response.error) {
    throw response.error;
  }

  const createdPatient = mapPatient(response.data);

  try {
    await createInitialPatientInteractionsByTenant(tenantId, createdPatient);
  } catch {
    // Interaction creation is complementary; the patient record must remain saved.
  }

  return createdPatient;
};

export const updatePatientByTenant = async (tenantId, patientId, patient) => {
  if (!patientId) {
    throw new Error('Patient id is required to update a patient.');
  }

  if (!hasSupabase() || !tenantId) {
    return buildUpdatedFallbackPatient(tenantId, patientId, patient);
  }

  const payload = buildUpdatePayload(patient);

  if (!Object.keys(payload).length) {
    const existingPatient = await supabase
      .from('patients')
      .select(patientSelect)
      .eq('tenant_id', tenantId)
      .eq('id', patientId)
      .single();

    if (existingPatient.error) {
      throw existingPatient.error;
    }

    return mapPatient(existingPatient.data);
  }

  const response = await supabase
    .from('patients')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', patientId)
    .select(patientSelect)
    .single();

  if (response.error) {
    throw response.error;
  }

  return mapPatient(response.data);
};
