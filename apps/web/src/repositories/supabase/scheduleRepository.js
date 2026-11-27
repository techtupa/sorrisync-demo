import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  SCHEDULE_STATUSES,
  createAppointmentBlockByTenant as createMockAppointmentBlockByTenant,
  createAppointmentByTenant as createMockAppointmentByTenant,
  disableProfessionalAvailabilityWindowByTenant as disableMockProfessionalAvailabilityWindowByTenant,
  disableProfessionalAvailabilityExceptionByTenant as disableMockProfessionalAvailabilityExceptionByTenant,
  getScheduleByTenant as getMockScheduleByTenant,
  listAvailableAppointmentSlotsByTenant as listMockAvailableAppointmentSlotsByTenant,
  listProfessionalAvailabilityWindowsByTenant as listMockProfessionalAvailabilityWindowsByTenant,
  listProfessionalAvailabilityExceptionsByTenant as listMockProfessionalAvailabilityExceptionsByTenant,
  rescheduleAppointmentByTenant as rescheduleMockAppointmentByTenant,
  saveProfessionalAvailabilityWindowByTenant as saveMockProfessionalAvailabilityWindowByTenant,
  saveProfessionalAvailabilityExceptionByTenant as saveMockProfessionalAvailabilityExceptionByTenant,
  updateAppointmentStatusByTenant as updateMockAppointmentStatusByTenant,
} from '../mock/scheduleRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'America/Sao_Paulo',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

const formatDateLabel = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const formatTimeLabel = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return timeFormatter.format(date);
};

const mapProfessional = (professional) => ({
  id: professional.id,
  tenant_id: professional.tenant_id,
  displayName: professional.display_name,
  label: professional.display_name,
  shortName: professional.short_name || professional.display_name,
  specialtyLabel: professional.specialty_label || '',
  occupancyPercent: Number(professional.occupancy_percent || 0),
  sortOrder: professional.sort_order,
  status: professional.status,
});

const mapRoom = (room) => ({
  id: room.id,
  tenant_id: room.tenant_id,
  displayName: room.display_name,
  label: room.display_name,
  roomTypeLabel: room.room_type_label || '',
  sortOrder: room.sort_order,
  status: room.status,
});

const buildById = (items) => {
  return new Map(items.map((item) => [item.id, item]));
};

const mapAppointment = (appointment, professionalsById, roomsById, activeCheckInAppointmentIds = new Set()) => {
  const professional = professionalsById.get(appointment.professional_id);
  const room = roomsById.get(appointment.room_id);

  return {
    id: appointment.id,
    tenant_id: appointment.tenant_id,
    patientId: appointment.patient_id || null,
    professionalId: appointment.professional_id || null,
    roomId: appointment.room_id || null,
    patient: appointment.patient_name,
    date: formatDateLabel(appointment.starts_at),
    time: formatTimeLabel(appointment.starts_at),
    duration: Number(appointment.duration_minutes || 60),
    procedure: appointment.procedure_label,
    professional: professional?.displayName || 'Profissional',
    room: room?.displayName || 'Sala',
    status: appointment.status || SCHEDULE_STATUSES.AGENDADA,
    origin: appointment.origin_label || 'Site',
    phone: appointment.patient_phone || '',
    notes: appointment.notes || '',
    starts_at: appointment.starts_at,
    created_at: appointment.created_at,
    updated_at: appointment.updated_at,
    hasActiveCheckIn: activeCheckInAppointmentIds.has(appointment.id),
  };
};

const mapBlock = (block, professionalsById, roomsById) => {
  const professional = professionalsById.get(block.professional_id);
  const room = roomsById.get(block.room_id);

  return {
    id: block.id,
    tenant_id: block.tenant_id,
    date: formatDateLabel(block.starts_at),
    time: formatTimeLabel(block.starts_at),
    duration: Number(block.duration_minutes || 60),
    professional: professional?.displayName || 'Profissional',
    room: room?.displayName || 'Sala',
    reason: block.reason,
    starts_at: block.starts_at,
  };
};

const mapAvailabilityWindow = (window) => ({
  id: window.id,
  professionalId: window.professional_id,
  weekday: Number(window.weekday),
  startMinute: Number(window.start_minute),
  endMinute: Number(window.end_minute),
  slotIntervalMinutes: Number(window.slot_interval_minutes),
  status: window.status,
  createdAt: window.created_at,
  updatedAt: window.updated_at,
  replayed: Boolean(window.replayed),
});

const mapAvailabilityException = (exception) => ({
  id: exception.id,
  professionalId: exception.professional_id,
  exceptionDate: exception.exception_date,
  exceptionType: exception.exception_type,
  startMinute: Number(exception.start_minute),
  endMinute: Number(exception.end_minute),
  reasonCode: exception.reason_code,
  status: exception.status,
  createdAt: exception.created_at,
  updatedAt: exception.updated_at,
  replayed: Boolean(exception.replayed),
});

const mapAvailableSlot = (slot) => ({
  startsAt: slot.starts_at,
  timeLabel: slot.time_label,
  available: slot.available === true,
});

const buildStats = (appointments, professionals) => {
  const confirmadas = appointments.filter((appointment) => (
    appointment.status === SCHEDULE_STATUSES.CONFIRMADA ||
    appointment.status === SCHEDULE_STATUSES.FINALIZADA ||
    appointment.status === SCHEDULE_STATUSES.EM_ATENDIMENTO
  )).length;
  const pendentes = appointments.filter((appointment) => (
    appointment.status === SCHEDULE_STATUSES.PENDENTE ||
    appointment.status === SCHEDULE_STATUSES.AGENDADA
  )).length;
  const canceladas = appointments.filter((appointment) => appointment.status === SCHEDULE_STATUSES.CANCELADA).length;

  return {
    total: appointments.length,
    confirmadas,
    pendentes,
    canceladas,
    ocupacao: professionals.length
      ? Math.round(professionals.reduce((sum, professional) => sum + professional.occupancyPercent, 0) / professionals.length)
      : 76,
  };
};

const buildOccupancy = (professionals) => {
  return professionals.map((professional) => ({
    professional: professional.shortName,
    value: professional.occupancyPercent,
  }));
};

const getFallbackSchedule = (tenantId) => getMockScheduleByTenant(tenantId);
const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');
const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanText(value));

const appointmentSelect = 'id, tenant_id, patient_id, professional_id, room_id, patient_name, patient_phone, procedure_label, origin_label, status, starts_at, duration_minutes, notes, created_at, updated_at';
const blockSelect = 'id, tenant_id, professional_id, room_id, reason, starts_at, duration_minutes';
const SCHEDULE_ERROR_MESSAGES = {
  conflict: 'Horário indisponível para o profissional ou sala selecionados.',
  invalidDuration: 'Duração inválida.',
  invalidStatus: 'Status de consulta inválido.',
  missingAppointment: 'Consulta não encontrada.',
  missingProfessional: 'Profissional não encontrado para o tenant atual.',
  missingRoom: 'Sala não encontrada para o tenant atual.',
  activeCheckIn: 'Reverta o check-in no Modo Recepção antes de reagendar esta consulta.',
  blockedStatus: 'Esta consulta não pode ser reagendada no status atual.',
  invalidReason: 'Selecione um motivo de reagendamento válido.',
  permissionDenied: 'Seu perfil não possui permissão para reagendar consultas.',
  staleAppointment: 'A consulta foi atualizada por outro usuário. Atualize a Agenda e tente novamente.',
  unavailableProfessional: 'O profissional selecionado não está disponível.',
  unavailableRoom: 'A sala selecionada não está disponível.',
  availabilityInvalid: 'Revise o dia, os horários e o intervalo da disponibilidade.',
  availabilityOverlap: 'A janela informada se sobrepõe a outra disponibilidade ativa.',
  availabilityPermissionDenied: 'Seu perfil não possui permissão para gerenciar esta disponibilidade.',
  availabilityWindowMissing: 'Janela de disponibilidade não encontrada.',
  availabilityExceptionInvalid: 'Revise a data, o tipo, o motivo e os horários da exceção.',
  availabilityExceptionOverlap: 'A exceção se sobrepõe a outra faixa ativa do mesmo tipo.',
  availabilityExceptionMissing: 'Exceção de disponibilidade não encontrada.',
};

const createScheduleError = (message) => new Error(message);

const normalizeScheduleWriteError = (error) => {
  const message = cleanText(error?.message);
  const details = cleanText(error?.details);
  const hint = cleanText(error?.hint);
  const code = cleanText(error?.code).toLowerCase();
  const searchable = `${message} ${details} ${hint}`.toLowerCase();

  if (!message && !code) {
    return error;
  }

  if (
    searchable.includes('horário indisponível') ||
    searchable.includes('horario indisponivel') ||
    searchable.includes('validate_appointment_basic_conflict') ||
    searchable.includes('validate_appointment_block_basic_conflict')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.conflict);
  }

  if (searchable.includes('ss_agenda_active_check_in_blocked')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.activeCheckIn);
  }
  if (searchable.includes('ss_protocol_managed_reschedule_requires_release')) {
    return createScheduleError('Esta consulta pertence a uma etapa de protocolo. Resolva a consulta atual na Agenda e solicite nova liberação clínica para escolher outro horário.');
  }
  if (searchable.includes('ss_agenda_appointment_status_blocked')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.blockedStatus);
  }
  if (searchable.includes('ss_agenda_reschedule_reason_invalid')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.invalidReason);
  }
  if (searchable.includes('ss_agenda_permission_denied')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.permissionDenied);
  }
  if (searchable.includes('ss_agenda_stale_appointment') || code === '40001') {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.staleAppointment);
  }
  if (searchable.includes('ss_agenda_appointment_not_found')) {
    return createScheduleError('Consulta não encontrada para a clínica atual.');
  }
  if (searchable.includes('ss_agenda_professional_unavailable')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.unavailableProfessional);
  }
  if (searchable.includes('ss_agenda_room_unavailable')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.unavailableRoom);
  }
  if (searchable.includes('ss_agenda_exception_overlap')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityExceptionOverlap);
  }
  if (searchable.includes('ss_agenda_exception_invalid') || searchable.includes('ss_agenda_exception_date_range_invalid')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityExceptionInvalid);
  }
  if (searchable.includes('ss_agenda_exception_not_found')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityExceptionMissing);
  }
  if (searchable.includes('ss_agenda_exception_permission_denied')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityPermissionDenied);
  }
  if (searchable.includes('ss_agenda_exception_professional_unavailable')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.unavailableProfessional);
  }
  if (searchable.includes('ss_agenda_availability_window_overlap') || code === '23p01') {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityOverlap);
  }
  if (
    searchable.includes('ss_agenda_availability_window_invalid')
    || searchable.includes('ss_agenda_availability_request_invalid')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityInvalid);
  }
  if (searchable.includes('ss_agenda_availability_permission_denied')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityPermissionDenied);
  }
  if (
    searchable.includes('ss_agenda_availability_window_not_found')
    || searchable.includes('ss_agenda_availability_exclude_invalid')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.availabilityWindowMissing);
  }
  if (searchable.includes('ss_agenda_availability_professional_unavailable')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.unavailableProfessional);
  }
  if (searchable.includes('ss_agenda_availability_room_unavailable')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.unavailableRoom);
  }
  if (searchable.includes('ss_agenda_availability_')) {
    return createScheduleError('Não foi possível consultar a disponibilidade com segurança.');
  }
  if (searchable.includes('ss_agenda_')) {
    return createScheduleError('Não foi possível reagendar a consulta com segurança. Atualize a Agenda e tente novamente.');
  }

  if (
    searchable.includes('profissional não encontrado') ||
    searchable.includes('profissional nao encontrado')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.missingProfessional);
  }

  if (
    searchable.includes('sala não encontrada') ||
    searchable.includes('sala nao encontrada')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.missingRoom);
  }

  if (searchable.includes('appointments_status_check')) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.invalidStatus);
  }

  if (
    searchable.includes('appointments_duration_positive_check') ||
    searchable.includes('appointment_blocks_duration_positive_check')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.invalidDuration);
  }

  if (
    searchable.includes('appointments_professional_tenant_fk') ||
    searchable.includes('appointment_blocks_professional_tenant_fk')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.missingProfessional);
  }

  if (
    searchable.includes('appointments_room_tenant_fk') ||
    searchable.includes('appointment_blocks_room_tenant_fk')
  ) {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.missingRoom);
  }

  if (code === 'pgrst116') {
    return createScheduleError(SCHEDULE_ERROR_MESSAGES.missingAppointment);
  }

  return error;
};

const throwScheduleWriteError = (error) => {
  throw normalizeScheduleWriteError(error);
};

const parseDuration = (value, fallback = 60) => {
  const duration = Number.parseInt(value, 10);
  return Number.isFinite(duration) && duration > 0 ? duration : fallback;
};

const parseTimeToMinutes = (value) => {
  const time = cleanText(value);
  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error('Horário inválido.');
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    throw new Error('Horário inválido.');
  }

  return (hours * 60) + minutes;
};

const calculateBlockDuration = (block) => {
  if (block?.startTime && block?.endTime) {
    const startMinutes = parseTimeToMinutes(block.startTime);
    const endMinutes = parseTimeToMinutes(block.endTime);
    const duration = endMinutes - startMinutes;

    if (duration <= 0) {
      throw new Error('Horário final deve ser maior que o horário inicial.');
    }

    return duration;
  }

  return parseDuration(block?.duration);
};

const buildStartsAt = (dateValue, timeValue) => {
  const date = cleanText(dateValue);
  const time = cleanText(timeValue);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Data inválida.');
  }

  parseTimeToMinutes(time);

  const startsAt = `${date}T${time}:00-03:00`;
  const parsed = new Date(startsAt);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Data ou horário inválido.');
  }

  return startsAt;
};

const assertValidStatus = (status) => {
  const safeStatus = cleanText(status);

  if (!Object.values(SCHEDULE_STATUSES).includes(safeStatus)) {
    throw new Error('Status de consulta inválido.');
  }

  return safeStatus;
};

const normalizeStatus = (status) => {
  const safeStatus = cleanText(status);

  if (!safeStatus) {
    return SCHEDULE_STATUSES.AGENDADA;
  }

  return assertValidStatus(safeStatus);
};

const fetchScheduleReferencesByTenant = async (tenantId) => {
  const [professionalsResponse, roomsResponse] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, tenant_id, display_name, short_name, specialty_label, color_token, occupancy_percent, sort_order, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true }),
    supabase
      .from('rooms')
      .select('id, tenant_id, display_name, room_type_label, sort_order, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true }),
  ]);

  if (professionalsResponse.error || roomsResponse.error) {
    throw professionalsResponse.error || roomsResponse.error;
  }

  return {
    professionals: (professionalsResponse.data || []).map(mapProfessional),
    rooms: (roomsResponse.data || []).map(mapRoom),
  };
};

const resolveByDisplayName = (items, displayName, entityLabel) => {
  const safeDisplayName = cleanText(displayName);
  const item = items.find((candidate) => candidate.displayName === safeDisplayName || candidate.label === safeDisplayName);

  if (!item) {
    throw new Error(`${entityLabel} não encontrado para o tenant atual.`);
  }

  return item;
};

const getEndTime = (startsAt, durationMinutes) => {
  return new Date(new Date(startsAt).getTime() + (durationMinutes * 60 * 1000));
};

const hasOverlap = (aStart, aDuration, bStart, bDuration) => {
  const startA = new Date(aStart);
  const endA = getEndTime(aStart, aDuration);
  const startB = new Date(bStart);
  const endB = getEndTime(bStart, bDuration);

  return startA < endB && endA > startB;
};

const assertNoScheduleConflict = async (tenantId, { professionalId, roomId, startsAt, durationMinutes }) => {
  const [appointmentsResponse, blocksResponse] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, professional_id, room_id, starts_at, duration_minutes, status')
      .eq('tenant_id', tenantId)
      .neq('status', SCHEDULE_STATUSES.CANCELADA),
    supabase
      .from('appointment_blocks')
      .select('id, professional_id, room_id, starts_at, duration_minutes')
      .eq('tenant_id', tenantId),
  ]);

  if (appointmentsResponse.error || blocksResponse.error) {
    throw appointmentsResponse.error || blocksResponse.error;
  }

  const hasConflict = [
    ...(appointmentsResponse.data || []),
    ...(blocksResponse.data || []),
  ].some((item) => {
    const sameProfessional = professionalId && item.professional_id === professionalId;
    const sameRoom = roomId && item.room_id === roomId;

    return (sameProfessional || sameRoom) && hasOverlap(
      startsAt,
      durationMinutes,
      item.starts_at,
      Number(item.duration_minutes || 60)
    );
  });

  if (hasConflict) {
    throw createScheduleError(SCHEDULE_ERROR_MESSAGES.conflict);
  }
};

const buildAppointmentInsertPayload = (tenantId, appointment, professional, room) => {
  const patient = cleanText(appointment?.patient);
  const patientId = cleanText(appointment?.patientId);
  const procedure = cleanText(appointment?.procedure);
  const durationMinutes = parseDuration(appointment?.duration);
  const startsAt = buildStartsAt(appointment?.date, appointment?.time);

  if (!patient) {
    throw createScheduleError('Informe o paciente da consulta.');
  }

  if (!procedure) {
    throw createScheduleError('Informe o procedimento da consulta.');
  }

  const payload = {
    tenant_id: tenantId,
    professional_id: professional.id,
    room_id: room.id,
    patient_name: patient,
    patient_phone: cleanText(appointment?.phone) || null,
    procedure_label: procedure,
    origin_label: cleanText(appointment?.origin) || 'Recepção',
    status: normalizeStatus(appointment?.status),
    starts_at: startsAt,
    duration_minutes: durationMinutes,
    notes: cleanText(appointment?.notes) || null,
    metadata: {
      source: 'agenda_new_appointment_modal',
      demo_safe: true,
    },
  };

  if (isUuid(patientId)) {
    payload.patient_id = patientId;
  }

  return payload;
};

const buildBlockInsertPayload = (tenantId, block, professional, room) => {
  const durationMinutes = calculateBlockDuration(block);
  const startsAt = buildStartsAt(block?.date, block?.startTime || block?.time);

  return {
    tenant_id: tenantId,
    professional_id: professional.id,
    room_id: room.id,
    reason: cleanText(block?.reason) || 'Bloqueio operacional',
    starts_at: startsAt,
    duration_minutes: durationMinutes,
    metadata: {
      source: 'agenda_block_time_modal',
      demo_safe: true,
    },
  };
};

export const fetchScheduleByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getFallbackSchedule(tenantId);
  }

  const [
    professionalsResponse,
    roomsResponse,
    appointmentsResponse,
    blocksResponse,
    checkInsResponse,
  ] = await Promise.all([
    supabase
      .from('professionals')
      .select('id, tenant_id, display_name, short_name, specialty_label, color_token, occupancy_percent, sort_order, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true }),
    supabase
      .from('rooms')
      .select('id, tenant_id, display_name, room_type_label, sort_order, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true }),
    supabase
      .from('appointments')
      .select(appointmentSelect)
      .eq('tenant_id', tenantId)
      .order('starts_at', { ascending: true }),
    supabase
      .from('appointment_blocks')
      .select(blockSelect)
      .eq('tenant_id', tenantId)
      .order('starts_at', { ascending: true }),
    supabase
      .from('appointment_check_ins')
      .select('appointment_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
  ]);

  if (
    professionalsResponse.error ||
    roomsResponse.error ||
    appointmentsResponse.error ||
    blocksResponse.error ||
    checkInsResponse.error
  ) {
    return getFallbackSchedule(tenantId);
  }

  const professionals = (professionalsResponse.data || []).map(mapProfessional);
  const rooms = (roomsResponse.data || []).map(mapRoom);

  if (!professionals.length && !rooms.length && !(appointmentsResponse.data || []).length) {
    return getFallbackSchedule(tenantId);
  }

  const professionalsById = buildById(professionals);
  const roomsById = buildById(rooms);
  const activeCheckInAppointmentIds = new Set((checkInsResponse.data || []).map((checkIn) => checkIn.appointment_id));
  const appointments = (appointmentsResponse.data || []).map((appointment) => mapAppointment(
    appointment,
    professionalsById,
    roomsById,
    activeCheckInAppointmentIds,
  ));
  const blocks = (blocksResponse.data || []).map((block) => mapBlock(block, professionalsById, roomsById));

  return {
    appointments,
    blocks,
    professionals,
    professionalOptions: professionals.map((professional) => professional.displayName),
    rooms,
    roomOptions: rooms.map((room) => room.displayName),
    statuses: Object.values(SCHEDULE_STATUSES),
    stats: buildStats(appointments, professionals),
    occupancy: buildOccupancy(professionals),
  };
};

export const fetchScheduleAppointmentsByTenant = async (tenantId) => {
  return (await fetchScheduleByTenant(tenantId)).appointments;
};

export const fetchScheduleBlocksByTenant = async (tenantId) => {
  return (await fetchScheduleByTenant(tenantId)).blocks;
};

export const createAppointmentByTenant = async (tenantId, appointment) => {
  if (!hasSupabase() || !tenantId) {
    return createMockAppointmentByTenant(tenantId, appointment);
  }

  const { professionals, rooms } = await fetchScheduleReferencesByTenant(tenantId);
  const professional = resolveByDisplayName(professionals, appointment?.professional, 'Profissional');
  const room = resolveByDisplayName(rooms, appointment?.room, 'Sala');
  const payload = buildAppointmentInsertPayload(tenantId, appointment, professional, room);

  await assertNoScheduleConflict(tenantId, {
    professionalId: professional.id,
    roomId: room.id,
    startsAt: payload.starts_at,
    durationMinutes: payload.duration_minutes,
  });

  const response = await supabase
    .from('appointments')
    .insert(payload)
    .select(appointmentSelect)
    .single();

  if (response.error) {
    throwScheduleWriteError(response.error);
  }

  return mapAppointment(response.data, buildById(professionals), buildById(rooms));
};

export const createAppointmentBlockByTenant = async (tenantId, block) => {
  if (!hasSupabase() || !tenantId) {
    return createMockAppointmentBlockByTenant(tenantId, block);
  }

  const { professionals, rooms } = await fetchScheduleReferencesByTenant(tenantId);
  const professional = resolveByDisplayName(professionals, block?.professional, 'Profissional');
  const room = resolveByDisplayName(rooms, block?.room, 'Sala');
  const payload = buildBlockInsertPayload(tenantId, block, professional, room);

  await assertNoScheduleConflict(tenantId, {
    professionalId: professional.id,
    roomId: room.id,
    startsAt: payload.starts_at,
    durationMinutes: payload.duration_minutes,
  });

  const response = await supabase
    .from('appointment_blocks')
    .insert(payload)
    .select(blockSelect)
    .single();

  if (response.error) {
    throwScheduleWriteError(response.error);
  }

  return mapBlock(response.data, buildById(professionals), buildById(rooms));
};

export const updateAppointmentStatusByTenant = async (tenantId, appointmentId, status) => {
  const nextStatus = assertValidStatus(status);

  if (!appointmentId) {
    throw createScheduleError(SCHEDULE_ERROR_MESSAGES.missingAppointment);
  }

  if (!hasSupabase() || !tenantId) {
    return updateMockAppointmentStatusByTenant(tenantId, appointmentId, nextStatus);
  }

  const { professionals, rooms } = await fetchScheduleReferencesByTenant(tenantId);
  const response = await supabase
    .from('appointments')
    .update({ status: nextStatus })
    .eq('tenant_id', tenantId)
    .eq('id', appointmentId)
    .select(appointmentSelect)
    .single();

  if (response.error) {
    throwScheduleWriteError(response.error);
  }

  return mapAppointment(response.data, buildById(professionals), buildById(rooms));
};

export const rescheduleAppointmentByTenant = async (tenantId, appointmentId, change = {}) => {
  if (!hasSupabase() || !tenantId) {
    return rescheduleMockAppointmentByTenant(tenantId, appointmentId, change);
  }

  const { professionals, rooms } = await fetchScheduleReferencesByTenant(tenantId);
  const professional = professionals.find((item) => (
    item.id === change.professionalId || item.displayName === cleanText(change.professional)
  ));
  const room = rooms.find((item) => (
    item.id === change.roomId || item.displayName === cleanText(change.room)
  ));

  if (!professional) throw createScheduleError(SCHEDULE_ERROR_MESSAGES.missingProfessional);
  if (!room) throw createScheduleError(SCHEDULE_ERROR_MESSAGES.missingRoom);

  const response = await supabase.rpc('reschedule_appointment', {
    p_actor_membership_id: change.actorMembershipId,
    p_appointment_id: appointmentId,
    p_expected_updated_at: change.expectedUpdatedAt,
    p_starts_at: buildStartsAt(change.date, change.time),
    p_duration_minutes: parseDuration(change.duration),
    p_professional_id: professional.id,
    p_room_id: room.id,
    p_reason_code: change.reasonCode,
  });

  if (response.error) {
    throwScheduleWriteError(response.error);
  }

  return response.data;
};

export const listProfessionalAvailabilityWindowsByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    return listMockProfessionalAvailabilityWindowsByTenant(tenantId, request);
  }

  const response = await supabase.rpc('list_professional_availability_windows', {
    p_actor_membership_id: request.actorMembershipId,
    p_professional_id: request.professionalId,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return (Array.isArray(response.data) ? response.data : []).map(mapAvailabilityWindow);
};

export const saveProfessionalAvailabilityWindowByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    const result = await saveMockProfessionalAvailabilityWindowByTenant(tenantId, request);
    return mapAvailabilityWindow(result);
  }

  const response = await supabase.rpc('save_professional_availability_window', {
    p_actor_membership_id: request.actorMembershipId,
    p_professional_id: request.professionalId,
    p_weekday: request.weekday,
    p_start_minute: request.startMinute,
    p_end_minute: request.endMinute,
    p_slot_interval_minutes: request.slotIntervalMinutes,
    p_window_id: request.windowId || null,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return mapAvailabilityWindow(response.data || {});
};

export const disableProfessionalAvailabilityWindowByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    const result = await disableMockProfessionalAvailabilityWindowByTenant(tenantId, request);
    return mapAvailabilityWindow(result);
  }

  const response = await supabase.rpc('disable_professional_availability_window', {
    p_actor_membership_id: request.actorMembershipId,
    p_window_id: request.windowId,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return mapAvailabilityWindow(response.data || {});
};

export const listProfessionalAvailabilityExceptionsByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    const result = await listMockProfessionalAvailabilityExceptionsByTenant(tenantId, request);
    return result.map(mapAvailabilityException);
  }
  const response = await supabase.rpc('list_professional_availability_exceptions', {
    p_actor_membership_id: request.actorMembershipId,
    p_professional_id: request.professionalId,
    p_date_from: request.dateFrom || null,
    p_date_to: request.dateTo || null,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return (Array.isArray(response.data) ? response.data : []).map(mapAvailabilityException);
};

export const saveProfessionalAvailabilityExceptionByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    return mapAvailabilityException(await saveMockProfessionalAvailabilityExceptionByTenant(tenantId, request));
  }
  const response = await supabase.rpc('save_professional_availability_exception', {
    p_actor_membership_id: request.actorMembershipId,
    p_professional_id: request.professionalId,
    p_exception_date: request.exceptionDate,
    p_exception_type: request.exceptionType,
    p_start_minute: request.startMinute,
    p_end_minute: request.endMinute,
    p_reason_code: request.reasonCode,
    p_exception_id: request.exceptionId || null,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return mapAvailabilityException(response.data || {});
};

export const disableProfessionalAvailabilityExceptionByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    return mapAvailabilityException(await disableMockProfessionalAvailabilityExceptionByTenant(tenantId, request));
  }
  const response = await supabase.rpc('disable_professional_availability_exception', {
    p_actor_membership_id: request.actorMembershipId,
    p_exception_id: request.exceptionId,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return mapAvailabilityException(response.data || {});
};

export const listAvailableAppointmentSlotsByTenant = async (tenantId, request = {}) => {
  if (!hasSupabase() || !tenantId) {
    const slots = await listMockAvailableAppointmentSlotsByTenant(tenantId, request);
    return slots.map((slot) => ({
      startsAt: slot.starts_at,
      timeLabel: slot.time_label,
      available: slot.available === true,
    }));
  }

  const response = await supabase.rpc('list_available_appointment_slots', {
    p_actor_membership_id: request.actorMembershipId,
    p_date: request.date,
    p_professional_id: request.professionalId,
    p_room_id: request.roomId,
    p_duration_minutes: request.durationMinutes,
    p_limit: request.limit ?? 12,
    p_exclude_appointment_id: request.excludeAppointmentId || null,
  });
  if (response.error) throwScheduleWriteError(response.error);
  return (response.data || []).map(mapAvailableSlot);
};
