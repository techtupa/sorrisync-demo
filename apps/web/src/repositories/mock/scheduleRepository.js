import {
  PROFESSIONALS,
  ROOMS,
  STATUSES,
  getAppointmentsByTenant as getMockAppointmentsByTenant,
  getBlocksByTenant as getMockBlocksByTenant,
  getConfirmationStats as getMockConfirmationStats,
  getProfessionalOccupancy as getMockProfessionalOccupancy,
} from '../../data/mockSchedule.js';
// Canonical Vite alias for this source: @/data/mockSchedule.js. The relative import keeps contract tests portable.
import { getDefaultClinicTenant } from './tenantRepository.js';
import {
  isAppointmentEligibleForRescheduling,
  isValidAppointmentReschedulingReason,
} from '../appointmentReschedulingContract.js';
import {
  PROFESSIONAL_AVAILABILITY_EXCEPTION_REASONS,
  PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPES,
} from '../availabilityExceptionContract.js';

const DEFAULT_TENANT_ID = 'tenant_aurora';
const DEFAULT_MOCK_DATE = '2026-05-30';
const mockAppointmentWritesByTenant = new Map();
const mockBlockWritesByTenant = new Map();
const mockAvailabilityWindowsByTenant = new Map();
const mockAvailabilityExceptionsByTenant = new Map();
const AVAILABILITY_INTERVALS = new Set([15, 30, 45, 60]);

const resolveTenantId = (tenantId) => {
  return tenantId || getDefaultClinicTenant()?.tenant_id || DEFAULT_TENANT_ID;
};

const buildMockProfessionals = () => {
  const occupancy = getMockProfessionalOccupancy();

  return Object.values(PROFESSIONALS).map((name, index) => ({
    id: `mock-professional-${index + 1}`,
    displayName: name,
    label: name,
    shortName: occupancy[index]?.professional || name,
    occupancyPercent: occupancy[index]?.value || 0,
    status: 'active',
  }));
};

const buildMockRooms = () => {
  return Object.values(ROOMS).map((name, index) => ({
    id: `mock-room-${index + 1}`,
    displayName: name,
    label: name,
    status: 'active',
  }));
};

const cleanText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const assertRequiredText = (value, message) => {
  const safeValue = cleanText(value);

  if (!safeValue) {
    throw new Error(message);
  }

  return safeValue;
};

const createLocalId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const parseDuration = (value, fallback = 60) => {
  const duration = Number.parseInt(value, 10);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
};

const parseTimeToMinutes = (value) => {
  const match = cleanText(value).match(/^(\d{2}):(\d{2})$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return null;

  return (hours * 60) + minutes;
};

const assertValidDate = (value) => {
  const safeDate = cleanText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) {
    throw new Error('Data inválida.');
  }

  const [year, month, day] = safeDate.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error('Data inválida.');
  }

  return safeDate;
};

const assertValidTime = (value) => {
  const safeTime = cleanText(value);

  if (parseTimeToMinutes(safeTime) === null) {
    throw new Error('Horário inválido.');
  }

  return safeTime;
};

const calculateBlockDuration = (block = {}) => {
  if (block.startTime && block.endTime) {
    const startMinutes = parseTimeToMinutes(block.startTime);
    const endMinutes = parseTimeToMinutes(block.endTime);

    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      throw new Error('Horário final deve ser maior que o horário inicial.');
    }

    return endMinutes - startMinutes;
  }

  return parseDuration(block.duration);
};

const hasOverlap = (startA, durationA, startB, durationB) => {
  return startA < startB + durationB && startA + durationA > startB;
};

const assertAvailabilityInteger = (value, minimum, maximum, message) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(message);
  }
  return parsed;
};

const buildMockAvailabilityWindow = (tenantId, window = {}, existing = null) => {
  const professional = buildMockProfessionals().find((item) => item.id === window.professionalId);
  if (!professional || professional.status !== 'active') {
    throw new Error('Profissional não encontrado para o tenant atual.');
  }

  const weekday = assertAvailabilityInteger(window.weekday, 0, 6, 'Dia da semana inválido.');
  const startMinute = assertAvailabilityInteger(window.startMinute, 0, 1439, 'Horário inicial inválido.');
  const endMinute = assertAvailabilityInteger(window.endMinute, 1, 1440, 'Horário final inválido.');
  const slotIntervalMinutes = Number(window.slotIntervalMinutes);
  if (startMinute >= endMinute) throw new Error('Horário final deve ser maior que o horário inicial.');
  if (!AVAILABILITY_INTERVALS.has(slotIntervalMinutes)) throw new Error('Intervalo de sugestões inválido.');

  return {
    id: existing?.id || createLocalId('availability-window'),
    tenant_id: tenantId,
    professional_id: professional.id,
    weekday,
    start_minute: startMinute,
    end_minute: endMinute,
    slot_interval_minutes: slotIntervalMinutes,
    status: 'active',
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: existing?.updated_at || new Date().toISOString(),
  };
};

const buildMockAvailabilityException = (tenantId, exception = {}, existing = null) => {
  const professional = buildMockProfessionals().find((item) => item.id === exception.professionalId);
  if (!professional || professional.status !== 'active') {
    throw new Error('Profissional não encontrado para o tenant atual.');
  }

  const exceptionDate = assertValidDate(exception.exceptionDate);
  const exceptionType = cleanText(exception.exceptionType);
  const reasonCode = cleanText(exception.reasonCode);
  const startMinute = assertAvailabilityInteger(exception.startMinute, 0, 1439, 'Horário inicial inválido.');
  const endMinute = assertAvailabilityInteger(exception.endMinute, 1, 1440, 'Horário final inválido.');
  if (!Object.values(PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPES).includes(exceptionType)) {
    throw new Error('Tipo de exceção inválido.');
  }
  if (!PROFESSIONAL_AVAILABILITY_EXCEPTION_REASONS.includes(reasonCode)) {
    throw new Error('Motivo da exceção inválido.');
  }
  if (startMinute >= endMinute) throw new Error('Horário final deve ser maior que o horário inicial.');

  return {
    id: existing?.id || createLocalId('availability-exception'),
    tenant_id: tenantId,
    professional_id: professional.id,
    exception_date: exceptionDate,
    exception_type: exceptionType,
    start_minute: startMinute,
    end_minute: endMinute,
    reason_code: reasonCode,
    status: 'active',
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

const dateWeekday = (dateKey) => {
  const date = assertValidDate(dateKey);
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const minutesToTime = (minutes) => (
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
);

const buildSaoPauloSlot = (date, minutes) => new Date(`${date}T${minutesToTime(minutes)}:00-03:00`);

const getTenantWrites = (store, tenantId) => {
  return store.get(tenantId) || [];
};

const setTenantWrites = (store, tenantId, items) => {
  store.set(tenantId, items);
};

const mergeTenantWrites = (baseItems, writtenItems) => {
  const writesById = new Map(writtenItems.map((item) => [item.id, item]));
  const baseIds = new Set(baseItems.map((item) => item.id));
  const updatedBaseItems = baseItems.map((item) => writesById.get(item.id) || item);
  const newItems = writtenItems.filter((item) => !baseIds.has(item.id));

  return [...updatedBaseItems, ...newItems];
};

const assertValidStatus = (status) => {
  const safeStatus = cleanText(status);

  if (!Object.values(STATUSES).includes(safeStatus)) {
    throw new Error('Status de consulta inválido.');
  }

  return safeStatus;
};

const normalizeStatus = (status) => {
  const safeStatus = cleanText(status);

  if (!safeStatus) {
    return STATUSES.AGENDADA;
  }

  return assertValidStatus(safeStatus);
};

const buildMockAppointment = (tenantId, appointment = {}) => ({
  id: appointment.id || createLocalId('local-appointment'),
  tenant_id: tenantId,
  patientId: cleanText(appointment.patientId) || null,
  patient: assertRequiredText(appointment.patient, 'Informe o paciente da consulta.'),
  date: assertValidDate(appointment.date),
  time: assertValidTime(appointment.time),
  duration: parseDuration(appointment.duration),
  procedure: assertRequiredText(appointment.procedure, 'Informe o procedimento da consulta.'),
  professional: assertRequiredText(appointment.professional, 'Profissional não encontrado para o tenant atual.'),
  room: assertRequiredText(appointment.room, 'Sala não encontrada para o tenant atual.'),
  status: normalizeStatus(appointment.status),
  origin: cleanText(appointment.origin) || 'Recepção',
  phone: cleanText(appointment.phone),
  notes: cleanText(appointment.notes),
});

const buildMockBlock = (tenantId, block = {}) => ({
  id: block.id || createLocalId('local-block'),
  tenant_id: tenantId,
  date: assertValidDate(block.date),
  time: assertValidTime(block.time || block.startTime),
  duration: calculateBlockDuration(block),
  professional: assertRequiredText(block.professional, 'Profissional não encontrado para o tenant atual.'),
  room: assertRequiredText(block.room, 'Sala não encontrada para o tenant atual.'),
  reason: cleanText(block.reason) || 'Bloqueio operacional',
});

const assertNoMockScheduleConflict = (tenantId, item) => {
  const itemDate = item.date || DEFAULT_MOCK_DATE;
  const startMinutes = parseTimeToMinutes(item.time);
  const durationMinutes = parseDuration(item.duration);

  if (startMinutes === null) {
    throw new Error('Horário inválido.');
  }

  const hasConflict = [
    ...getScheduleAppointmentsByTenant(tenantId).filter((appointment) => appointment.status !== STATUSES.CANCELADA),
    ...getScheduleBlocksByTenant(tenantId),
  ].some((existingItem) => {
    if (item.id && existingItem.id === item.id) {
      return false;
    }

    const existingDate = existingItem.date || DEFAULT_MOCK_DATE;

    if (existingDate !== itemDate) {
      return false;
    }

    const existingStartMinutes = parseTimeToMinutes(existingItem.time);

    if (existingStartMinutes === null) {
      return false;
    }

    const sameProfessional = item.professional && existingItem.professional === item.professional;
    const sameRoom = item.room && existingItem.room === item.room;

    return (sameProfessional || sameRoom) && hasOverlap(
      startMinutes,
      durationMinutes,
      existingStartMinutes,
      parseDuration(existingItem.duration)
    );
  });

  if (hasConflict) {
    throw new Error('Horário indisponível para o profissional ou sala selecionados.');
  }
};

// Mock data today. Keep signatures stable so Supabase can replace the source without changing the UI.
export const SCHEDULE_STATUSES = STATUSES;
export const SCHEDULE_PROFESSIONALS = PROFESSIONALS;
export const SCHEDULE_ROOMS = ROOMS;

export const resetMockScheduleWrites = () => {
  mockAppointmentWritesByTenant.clear();
  mockBlockWritesByTenant.clear();
  mockAvailabilityWindowsByTenant.clear();
  mockAvailabilityExceptionsByTenant.clear();
};

export const getScheduleAppointmentsByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return mergeTenantWrites(
    getMockAppointmentsByTenant(resolvedTenantId).map((appointment) => ({
      ...appointment,
      updated_at: appointment.updated_at || '2026-05-30T00:00:00.000Z',
      hasActiveCheckIn: Boolean(appointment.hasActiveCheckIn),
    })),
    getTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId)
  );
};

export const getScheduleBlocksByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return mergeTenantWrites(
    getMockBlocksByTenant(resolvedTenantId),
    getTenantWrites(mockBlockWritesByTenant, resolvedTenantId)
  );
};

export const getScheduleConfirmationStatsByTenant = (tenantId) => {
  return getMockConfirmationStats(resolveTenantId(tenantId));
};

export const getScheduleProfessionalOccupancyByTenant = () => {
  return getMockProfessionalOccupancy();
};

export const getScheduleByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);

  return {
    appointments: getScheduleAppointmentsByTenant(resolvedTenantId),
    blocks: getScheduleBlocksByTenant(resolvedTenantId),
    professionals: buildMockProfessionals(),
    professionalOptions: Object.values(PROFESSIONALS),
    rooms: buildMockRooms(),
    roomOptions: Object.values(ROOMS),
    statuses: Object.values(STATUSES),
    stats: getScheduleConfirmationStatsByTenant(resolvedTenantId),
    occupancy: getScheduleProfessionalOccupancyByTenant(resolvedTenantId),
  };
};

export const createAppointmentByTenant = async (tenantId, appointment) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const createdAppointment = buildMockAppointment(resolvedTenantId, appointment);
  const currentWrites = getTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId);

  assertNoMockScheduleConflict(resolvedTenantId, createdAppointment);
  setTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId, [...currentWrites, createdAppointment]);

  return createdAppointment;
};

export const createAppointmentBlockByTenant = async (tenantId, block) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const createdBlock = buildMockBlock(resolvedTenantId, block);
  const currentWrites = getTenantWrites(mockBlockWritesByTenant, resolvedTenantId);

  assertNoMockScheduleConflict(resolvedTenantId, createdBlock);
  setTenantWrites(mockBlockWritesByTenant, resolvedTenantId, [...currentWrites, createdBlock]);

  return createdBlock;
};

export const updateAppointmentStatusByTenant = async (tenantId, appointmentId, status) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const nextStatus = assertValidStatus(status);
  const currentAppointments = getScheduleAppointmentsByTenant(resolvedTenantId);
  const appointment = currentAppointments.find((item) => item.id === appointmentId);

  if (!appointment) {
    throw new Error('Consulta não encontrada.');
  }

  const updatedAppointment = {
    ...appointment,
    status: nextStatus,
  };
  const existingWrites = getTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId);
  const nextWrites = existingWrites.some((item) => item.id === appointmentId)
    ? existingWrites.map((item) => (item.id === appointmentId ? updatedAppointment : item))
    : [...existingWrites, updatedAppointment];

  setTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId, nextWrites);

  return updatedAppointment;
};

export const rescheduleAppointmentByTenant = async (tenantId, appointmentId, change = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const currentAppointments = getScheduleAppointmentsByTenant(resolvedTenantId);
  const appointment = currentAppointments.find((item) => item.id === appointmentId);

  if (!appointment || appointment.tenant_id !== resolvedTenantId) {
    throw new Error('Consulta não encontrada para a clínica atual.');
  }
  if (!isAppointmentEligibleForRescheduling(appointment)) {
    throw new Error(appointment.hasActiveCheckIn
      ? 'Reagendamento bloqueado enquanto houver check-in ativo.'
      : 'Esta consulta não pode ser reagendada no status atual.');
  }
  if (!isValidAppointmentReschedulingReason(change.reasonCode)) {
    throw new Error('Selecione um motivo de reagendamento válido.');
  }
  if (!Object.values(PROFESSIONALS).includes(change.professional)) {
    throw new Error('O profissional selecionado não está disponível.');
  }
  if (!Object.values(ROOMS).includes(change.room)) {
    throw new Error('A sala selecionada não está disponível.');
  }

  const nextAppointment = {
    ...appointment,
    date: assertValidDate(change.date),
    time: assertValidTime(change.time),
    duration: parseDuration(change.duration),
    professional: assertRequiredText(change.professional, 'Profissional não encontrado para o tenant atual.'),
    room: assertRequiredText(change.room, 'Sala não encontrada para o tenant atual.'),
  };
  const isIdentical = ['date', 'time', 'duration', 'professional', 'room']
    .every((field) => String(nextAppointment[field]) === String(appointment[field]));

  if (isIdentical) {
    return { ...appointment, replayed: true };
  }
  if (appointment.updated_at && appointment.updated_at !== change.expectedUpdatedAt) {
    throw new Error('A consulta foi atualizada por outro usuário. Atualize a Agenda e tente novamente.');
  }

  assertNoMockScheduleConflict(resolvedTenantId, nextAppointment);

  const currentUpdatedAt = new Date(appointment.updated_at || 0).getTime();
  const nextUpdatedAt = new Date(Math.max(Date.now(), currentUpdatedAt + 1)).toISOString();
  const updatedAppointment = { ...nextAppointment, updated_at: nextUpdatedAt, replayed: false };
  const existingWrites = getTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId);
  const nextWrites = existingWrites.some((item) => item.id === appointmentId)
    ? existingWrites.map((item) => (item.id === appointmentId ? updatedAppointment : item))
    : [...existingWrites, updatedAppointment];

  setTenantWrites(mockAppointmentWritesByTenant, resolvedTenantId, nextWrites);
  return updatedAppointment;
};

export const listProfessionalAvailabilityWindowsByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const professional = buildMockProfessionals().find((item) => item.id === request.professionalId);
  if (!professional || professional.status !== 'active') {
    throw new Error('Profissional não encontrado para o tenant atual.');
  }

  return getTenantWrites(mockAvailabilityWindowsByTenant, resolvedTenantId)
    .filter((window) => window.professional_id === professional.id)
    .sort((left, right) => left.weekday - right.weekday || left.start_minute - right.start_minute)
    .map((window) => ({ ...window }));
};

export const saveProfessionalAvailabilityWindowByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const currentWindows = getTenantWrites(mockAvailabilityWindowsByTenant, resolvedTenantId);
  const existing = request.windowId
    ? currentWindows.find((window) => window.id === request.windowId)
    : currentWindows.find((window) => (
      window.professional_id === request.professionalId
      && window.weekday === Number(request.weekday)
      && window.start_minute === Number(request.startMinute)
      && window.end_minute === Number(request.endMinute)
      && window.slot_interval_minutes === Number(request.slotIntervalMinutes)
      && window.status === 'active'
    ));

  if (request.windowId && (!existing || existing.tenant_id !== resolvedTenantId)) {
    throw new Error('Janela de disponibilidade não encontrada.');
  }

  const candidate = buildMockAvailabilityWindow(resolvedTenantId, request, existing);
  const identical = existing
    && existing.status === 'active'
    && existing.weekday === candidate.weekday
    && existing.start_minute === candidate.start_minute
    && existing.end_minute === candidate.end_minute
    && existing.slot_interval_minutes === candidate.slot_interval_minutes;
  if (identical) return { ...existing, replayed: true };

  const overlapsWindow = currentWindows.some((window) => (
    window.id !== existing?.id
    && window.professional_id === candidate.professional_id
    && window.weekday === candidate.weekday
    && window.status === 'active'
    && candidate.start_minute < window.end_minute
    && candidate.end_minute > window.start_minute
  ));
  if (overlapsWindow) throw new Error('A janela informada se sobrepõe a outra disponibilidade ativa.');

  candidate.updated_at = new Date().toISOString();
  const nextWindows = existing
    ? currentWindows.map((window) => (window.id === existing.id ? candidate : window))
    : [...currentWindows, candidate];
  setTenantWrites(mockAvailabilityWindowsByTenant, resolvedTenantId, nextWindows);
  return { ...candidate, replayed: false };
};

export const disableProfessionalAvailabilityWindowByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const currentWindows = getTenantWrites(mockAvailabilityWindowsByTenant, resolvedTenantId);
  const existing = currentWindows.find((window) => window.id === request.windowId);
  if (!existing || existing.tenant_id !== resolvedTenantId) {
    throw new Error('Janela de disponibilidade não encontrada.');
  }
  if (existing.status === 'inactive') return { ...existing, replayed: true };

  const disabled = { ...existing, status: 'inactive', updated_at: new Date().toISOString(), replayed: false };
  setTenantWrites(
    mockAvailabilityWindowsByTenant,
    resolvedTenantId,
    currentWindows.map((window) => (window.id === existing.id ? disabled : window)),
  );
  return disabled;
};

export const listProfessionalAvailabilityExceptionsByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const professional = buildMockProfessionals().find((item) => item.id === request.professionalId);
  if (!professional || professional.status !== 'active') {
    throw new Error('Profissional não encontrado para o tenant atual.');
  }
  const dateFrom = request.dateFrom ? assertValidDate(request.dateFrom) : '0001-01-01';
  const dateTo = request.dateTo ? assertValidDate(request.dateTo) : '9999-12-31';
  if (dateFrom > dateTo) throw new Error('Período de exceções inválido.');

  return getTenantWrites(mockAvailabilityExceptionsByTenant, resolvedTenantId)
    .filter((exception) => (
      exception.professional_id === professional.id
      && exception.exception_date >= dateFrom
      && exception.exception_date <= dateTo
    ))
    .sort((left, right) => left.exception_date.localeCompare(right.exception_date) || left.start_minute - right.start_minute)
    .map((exception) => ({ ...exception }));
};

export const saveProfessionalAvailabilityExceptionByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const currentExceptions = getTenantWrites(mockAvailabilityExceptionsByTenant, resolvedTenantId);
  const existing = request.exceptionId
    ? currentExceptions.find((exception) => exception.id === request.exceptionId)
    : currentExceptions.find((exception) => (
      exception.professional_id === request.professionalId
      && exception.exception_date === request.exceptionDate
      && exception.exception_type === request.exceptionType
      && exception.start_minute === Number(request.startMinute)
      && exception.end_minute === Number(request.endMinute)
      && exception.reason_code === request.reasonCode
      && exception.status === 'active'
    ));
  if (request.exceptionId && (!existing || existing.tenant_id !== resolvedTenantId)) {
    throw new Error('Exceção de disponibilidade não encontrada.');
  }

  const candidate = buildMockAvailabilityException(resolvedTenantId, request, existing);
  const identical = existing
    && existing.status === 'active'
    && existing.exception_date === candidate.exception_date
    && existing.exception_type === candidate.exception_type
    && existing.start_minute === candidate.start_minute
    && existing.end_minute === candidate.end_minute
    && existing.reason_code === candidate.reason_code;
  if (identical) return { ...existing, replayed: true };

  const overlaps = currentExceptions.some((exception) => (
    exception.id !== existing?.id
    && exception.professional_id === candidate.professional_id
    && exception.exception_date === candidate.exception_date
    && exception.exception_type === candidate.exception_type
    && exception.status === 'active'
    && candidate.start_minute < exception.end_minute
    && candidate.end_minute > exception.start_minute
  ));
  if (overlaps) throw new Error('A exceção se sobrepõe a outra faixa ativa do mesmo tipo.');

  const nextExceptions = existing
    ? currentExceptions.map((exception) => (exception.id === existing.id ? candidate : exception))
    : [...currentExceptions, candidate];
  setTenantWrites(mockAvailabilityExceptionsByTenant, resolvedTenantId, nextExceptions);
  return { ...candidate, replayed: false };
};

export const disableProfessionalAvailabilityExceptionByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const currentExceptions = getTenantWrites(mockAvailabilityExceptionsByTenant, resolvedTenantId);
  const existing = currentExceptions.find((exception) => exception.id === request.exceptionId);
  if (!existing || existing.tenant_id !== resolvedTenantId) {
    throw new Error('Exceção de disponibilidade não encontrada.');
  }
  if (existing.status === 'inactive') return { ...existing, replayed: true };

  const disabled = { ...existing, status: 'inactive', updated_at: new Date().toISOString(), replayed: false };
  setTenantWrites(
    mockAvailabilityExceptionsByTenant,
    resolvedTenantId,
    currentExceptions.map((exception) => (exception.id === existing.id ? disabled : exception)),
  );
  return disabled;
};

export const listAvailableAppointmentSlotsByTenant = async (tenantId, request = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const date = assertValidDate(request.date);
  const durationMinutes = assertAvailabilityInteger(request.durationMinutes, 1, 1440, 'Duração inválida.');
  const limit = assertAvailabilityInteger(request.limit ?? 12, 1, 30, 'Limite de sugestões inválido.');
  const professional = buildMockProfessionals().find((item) => item.id === request.professionalId);
  const room = buildMockRooms().find((item) => item.id === request.roomId);
  if (!professional || professional.status !== 'active') throw new Error('Profissional não encontrado para o tenant atual.');
  if (!room || room.status !== 'active') throw new Error('Sala não encontrada para o tenant atual.');

  if (request.excludeAppointmentId) {
    const excluded = getScheduleAppointmentsByTenant(resolvedTenantId)
      .find((appointment) => appointment.id === request.excludeAppointmentId);
    if (!excluded || excluded.tenant_id !== resolvedTenantId) {
      throw new Error('Consulta excluída não pertence à clínica atual.');
    }
  }

  const recurringWindows = getTenantWrites(mockAvailabilityWindowsByTenant, resolvedTenantId)
    .filter((window) => (
      window.professional_id === professional.id
      && window.weekday === dateWeekday(date)
      && window.status === 'active'
    ));
  const activeExceptions = getTenantWrites(mockAvailabilityExceptionsByTenant, resolvedTenantId)
    .filter((exception) => (
      exception.professional_id === professional.id
      && exception.exception_date === date
      && exception.status === 'active'
    ));
  const customHours = activeExceptions.filter((exception) => exception.exception_type === 'custom_hours');
  const unavailableRanges = activeExceptions.filter((exception) => exception.exception_type === 'unavailable');
  const defaultInterval = recurringWindows.length
    ? Math.min(...recurringWindows.map((window) => window.slot_interval_minutes))
    : 30;
  const windows = customHours.length
    ? customHours.map((exception) => ({
      start_minute: exception.start_minute,
      end_minute: exception.end_minute,
      slot_interval_minutes: defaultInterval,
    }))
    : recurringWindows;
  const busyItems = [
    ...getScheduleAppointmentsByTenant(resolvedTenantId)
      .filter((appointment) => appointment.status !== STATUSES.CANCELADA && appointment.id !== request.excludeAppointmentId),
    ...getScheduleBlocksByTenant(resolvedTenantId),
  ];
  const now = request.now ? new Date(request.now) : new Date();
  const slots = [];

  for (const window of windows) {
    for (
      let minute = window.start_minute;
      minute + durationMinutes <= window.end_minute;
      minute += window.slot_interval_minutes
    ) {
      const candidate = buildSaoPauloSlot(date, minute);
      if (Number.isNaN(candidate.getTime()) || candidate < now) continue;
      if (unavailableRanges.some((exception) => hasOverlap(
        minute,
        durationMinutes,
        exception.start_minute,
        exception.end_minute - exception.start_minute,
      ))) continue;
      const conflict = busyItems.some((item) => {
        const itemDate = item.date || DEFAULT_MOCK_DATE;
        const itemStart = parseTimeToMinutes(item.time);
        if (itemDate !== date || itemStart === null) return false;
        const sameProfessional = item.professionalId === professional.id || item.professional === professional.displayName;
        const sameRoom = item.roomId === room.id || item.room === room.displayName;
        return (sameProfessional || sameRoom) && hasOverlap(
          minute,
          durationMinutes,
          itemStart,
          parseDuration(item.duration),
        );
      });
      if (!conflict) {
        slots.push({ starts_at: candidate.toISOString(), time_label: minutesToTime(minute), available: true });
      }
    }
  }

  return slots
    .sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at))
    .slice(0, limit);
};
