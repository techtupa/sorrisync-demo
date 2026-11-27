import { getPatientsByTenant } from './patientsRepository.js';
import { getPatientLeadsByTenant } from './patientLeadsRepository.js';
import { getServicesByTenant } from './servicesRepository.js';
import {
  createAppointmentByTenant,
  getScheduleByTenant,
} from './scheduleRepository.js';
import {
  APPOINTMENT_WAITLIST_DISMISS_REASONS,
  APPOINTMENT_WAITLIST_PERIODS,
  APPOINTMENT_WAITLIST_PRIORITIES,
  APPOINTMENT_WAITLIST_SOURCE_TYPES,
  APPOINTMENT_WAITLIST_STATUSES,
} from '../appointmentWaitlistContract.js';

const entriesByTenant = new Map();
const schedulingEntryIds = new Set();
let nextEntryId = 1;

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const validPeriods = new Set(Object.values(APPOINTMENT_WAITLIST_PERIODS));
const validPriorities = new Set(Object.values(APPOINTMENT_WAITLIST_PRIORITIES));
const validSourceTypes = new Set(Object.values(APPOINTMENT_WAITLIST_SOURCE_TYPES));
const validDismissReasons = new Set(Object.values(APPOINTMENT_WAITLIST_DISMISS_REASONS));

const getTenantEntries = (tenantId) => {
  if (!entriesByTenant.has(tenantId)) entriesByTenant.set(tenantId, []);
  return entriesByTenant.get(tenantId);
};

const findSource = (tenantId, sourceType, sourceId) => {
  if (sourceType === APPOINTMENT_WAITLIST_SOURCE_TYPES.PATIENT) {
    return getPatientsByTenant(tenantId).find((patient) => patient.id === sourceId) || null;
  }
  if (sourceType === APPOINTMENT_WAITLIST_SOURCE_TYPES.LEAD) {
    return getPatientLeadsByTenant(tenantId).find((lead) => lead.id === sourceId) || null;
  }
  return null;
};

const findService = (tenantId, serviceId) => getServicesByTenant(tenantId).find((service) => (
  service.id === serviceId
  && ['Ativo', 'active'].includes(service.status)
  && Boolean(service.useInAgenda ?? service.use_in_agenda)
  && Number(service.duration ?? service.duration_minutes) > 0
)) || null;

const findProfessional = (tenantId, professionalId) => getScheduleByTenant(tenantId).professionals.find((professional) => (
  professional.id === professionalId && professional.status !== 'inactive'
)) || null;

const findRoom = (tenantId, roomId) => getScheduleByTenant(tenantId).rooms.find((room) => (
  room.id === roomId && room.status !== 'inactive'
)) || null;

const assertPreferences = (tenantId, request) => {
  if (!validSourceTypes.has(request.sourceType) || !request.sourceId) {
    throw new Error('Selecione um paciente ou lead existente.');
  }
  if (!findSource(tenantId, request.sourceType, request.sourceId)) {
    throw new Error('Paciente ou lead não encontrado para a clínica atual.');
  }
  if (!findService(tenantId, request.serviceId)) {
    throw new Error('O serviço precisa estar ativo e disponível na Agenda.');
  }
  if (request.preferredProfessionalId && !findProfessional(tenantId, request.preferredProfessionalId)) {
    throw new Error('Profissional preferido indisponível para a clínica atual.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(request.earliestDate || '')) {
    throw new Error('Informe uma data inicial válida.');
  }
  if (request.latestDate && request.latestDate < request.earliestDate) {
    throw new Error('A data final não pode ser anterior à data inicial.');
  }
  if (!validPeriods.has(request.preferredPeriod) || !validPriorities.has(request.priority)) {
    throw new Error('Preferência operacional inválida.');
  }
};

const decorateEntry = (tenantId, entry) => {
  const source = findSource(tenantId, entry.sourceType, entry.sourceId);
  const service = findService(tenantId, entry.serviceId) || getServicesByTenant(tenantId).find((item) => item.id === entry.serviceId);
  const professional = entry.preferredProfessionalId
    ? getScheduleByTenant(tenantId).professionals.find((item) => item.id === entry.preferredProfessionalId)
    : null;

  return {
    ...entry,
    sourceDisplayName: source?.name || 'Origem indisponível',
    serviceLabel: service?.name || 'Serviço indisponível',
    serviceDurationMinutes: Number(service?.duration ?? service?.duration_minutes) || null,
    preferredProfessionalLabel: professional?.displayName || professional?.display_name || '',
  };
};

const buildPreferenceSnapshot = (request) => ({
  serviceId: request.serviceId,
  preferredProfessionalId: request.preferredProfessionalId || null,
  earliestDate: request.earliestDate,
  latestDate: request.latestDate || null,
  preferredPeriod: request.preferredPeriod,
  priority: request.priority,
});

const samePreferences = (entry, request) => Object.entries(buildPreferenceSnapshot(request)).every(
  ([key, value]) => entry[key] === value,
);

export const resetMockAppointmentWaitlist = () => {
  entriesByTenant.clear();
  schedulingEntryIds.clear();
  nextEntryId = 1;
};

export const listMockAppointmentWaitlistEntriesByTenant = async (tenantId, request = {}) => {
  const status = request.status || APPOINTMENT_WAITLIST_STATUSES.OPEN;
  return {
    items: clone(getTenantEntries(tenantId)
      .filter((entry) => status === 'all' || entry.status === status)
      .map((entry) => decorateEntry(tenantId, entry))
      .sort((first, second) => {
        if (first.priority !== second.priority) return first.priority === 'priority' ? -1 : 1;
        return first.earliestDate.localeCompare(second.earliestDate) || first.createdAt.localeCompare(second.createdAt);
      })),
    source: 'mock',
  };
};

export const createMockAppointmentWaitlistEntryByTenant = async (tenantId, request = {}) => {
  assertPreferences(tenantId, request);
  const entries = getTenantEntries(tenantId);
  const existing = entries.find((entry) => (
    entry.status === APPOINTMENT_WAITLIST_STATUSES.OPEN
    && entry.sourceType === request.sourceType
    && entry.sourceId === request.sourceId
    && entry.serviceId === request.serviceId
  ));

  if (existing) {
    if (!samePreferences(existing, request)) {
      throw new Error('Já existe uma entrada aberta para essa pessoa e serviço.');
    }
    return { item: clone(decorateEntry(tenantId, existing)), replayed: true, source: 'mock' };
  }

  const timestamp = nowIso();
  const entry = {
    id: `mock-appointment-waitlist-${nextEntryId++}`,
    sourceType: request.sourceType,
    sourceId: request.sourceId,
    ...buildPreferenceSnapshot(request),
    status: APPOINTMENT_WAITLIST_STATUSES.OPEN,
    scheduledAppointmentId: null,
    resolutionCode: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  entries.push(entry);
  return { item: clone(decorateEntry(tenantId, entry)), replayed: false, source: 'mock' };
};

export const updateMockAppointmentWaitlistEntryByTenant = async (tenantId, entryId, request = {}) => {
  const entries = getTenantEntries(tenantId);
  const entry = entries.find((item) => item.id === entryId);
  if (!entry) throw new Error('Entrada da lista de espera não encontrada.');
  if (entry.status !== APPOINTMENT_WAITLIST_STATUSES.OPEN) throw new Error('Somente entradas abertas podem ser editadas.');
  if (entry.updatedAt !== request.expectedUpdatedAt) throw new Error('A entrada foi atualizada por outra sessão. Recarregue e tente novamente.');

  assertPreferences(tenantId, { ...request, sourceType: entry.sourceType, sourceId: entry.sourceId });
  const duplicate = entries.find((item) => (
    item.id !== entry.id
    && item.status === APPOINTMENT_WAITLIST_STATUSES.OPEN
    && item.sourceType === entry.sourceType
    && item.sourceId === entry.sourceId
    && item.serviceId === request.serviceId
  ));
  if (duplicate) throw new Error('Já existe uma entrada aberta para essa pessoa e serviço.');

  const replayed = samePreferences(entry, request);
  if (!replayed) Object.assign(entry, buildPreferenceSnapshot(request), { updatedAt: nowIso() });
  return { item: clone(decorateEntry(tenantId, entry)), replayed, source: 'mock' };
};

export const dismissMockAppointmentWaitlistEntryByTenant = async (tenantId, entryId, request = {}) => {
  const entry = getTenantEntries(tenantId).find((item) => item.id === entryId);
  if (!entry) throw new Error('Entrada da lista de espera não encontrada.');
  if (!validDismissReasons.has(request.resolutionCode)) throw new Error('Selecione um motivo de dispensa válido.');
  if (entry.status === APPOINTMENT_WAITLIST_STATUSES.DISMISSED && entry.resolutionCode === request.resolutionCode) {
    return { item: clone(decorateEntry(tenantId, entry)), replayed: true, source: 'mock' };
  }
  if (entry.status !== APPOINTMENT_WAITLIST_STATUSES.OPEN) throw new Error('Somente entradas abertas podem ser dispensadas.');
  if (entry.updatedAt !== request.expectedUpdatedAt) throw new Error('A entrada foi atualizada por outra sessão. Recarregue e tente novamente.');

  Object.assign(entry, {
    status: APPOINTMENT_WAITLIST_STATUSES.DISMISSED,
    resolutionCode: request.resolutionCode,
    updatedAt: nowIso(),
  });
  return { item: clone(decorateEntry(tenantId, entry)), replayed: false, source: 'mock' };
};

const formatSaoPauloDateTime = (startsAt) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
  }).formatToParts(new Date(startsAt)).map((part) => [part.type, part.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
};

export const scheduleMockAppointmentWaitlistEntryByTenant = async (tenantId, entryId, request = {}) => {
  const entry = getTenantEntries(tenantId).find((item) => item.id === entryId);
  if (!entry) throw new Error('Entrada da lista de espera não encontrada.');
  if (entry.status === APPOINTMENT_WAITLIST_STATUSES.SCHEDULED && entry.scheduledAppointmentId) {
    return {
      appointment: { id: entry.scheduledAppointmentId },
      item: clone(decorateEntry(tenantId, entry)),
      replayed: true,
      source: 'mock',
    };
  }
  if (entry.status !== APPOINTMENT_WAITLIST_STATUSES.OPEN) throw new Error('Somente entradas abertas podem ser agendadas.');
  if (entry.updatedAt !== request.expectedUpdatedAt) throw new Error('A entrada foi atualizada por outra sessão. Recarregue e tente novamente.');
  if (schedulingEntryIds.has(entryId)) throw new Error('Já existe um agendamento em andamento para esta entrada.');

  const source = findSource(tenantId, entry.sourceType, entry.sourceId);
  const service = findService(tenantId, entry.serviceId);
  const professional = findProfessional(tenantId, request.professionalId);
  const room = findRoom(tenantId, request.roomId);
  if (!source) throw new Error('Paciente ou lead não encontrado para a clínica atual.');
  if (entry.sourceType === 'lead' && (source.convertedPatientId || source.converted_patient_id)) {
    throw new Error('Este lead já foi convertido. Use o paciente correspondente no CRM.');
  }
  if (!service) throw new Error('O serviço precisa estar ativo e disponível na Agenda.');
  if (!professional) throw new Error('Profissional indisponível para a clínica atual.');
  if (!room) throw new Error('Sala indisponível para a clínica atual.');
  if (!request.startsAt || Number.isNaN(new Date(request.startsAt).getTime())) throw new Error('Selecione um horário válido.');

  const { date, time } = formatSaoPauloDateTime(request.startsAt);
  if (new Date(request.startsAt).getTime() <= Date.now()
    || date < entry.earliestDate
    || (entry.latestDate && date > entry.latestDate)) {
    throw new Error('O horário precisa estar no futuro e dentro do intervalo preferido.');
  }

  schedulingEntryIds.add(entryId);
  try {
    const appointment = await createAppointmentByTenant(tenantId, {
      date,
      duration: Number(service.duration ?? service.duration_minutes),
      origin: 'Lista de espera',
      patient: source.name,
      patientId: entry.sourceType === 'patient' ? source.id : null,
      phone: source.phone || '',
      procedure: service.name,
      professional: professional.displayName || professional.display_name,
      room: room.displayName || room.display_name,
      status: 'Agendada',
      time,
    });

    Object.assign(entry, {
      status: APPOINTMENT_WAITLIST_STATUSES.SCHEDULED,
      scheduledAppointmentId: appointment.id,
      resolutionCode: 'scheduled',
      updatedAt: nowIso(),
    });
    return { appointment, item: clone(decorateEntry(tenantId, entry)), replayed: false, source: 'mock' };
  } finally {
    schedulingEntryIds.delete(entryId);
  }
};
