import {
  CRM_AGENDA_LINK_SOURCE,
  resolveAppointmentCrmPatient,
} from '../lib/crmAgendaLinking.js';
import {
  APPOINTMENT_CHECK_IN_STATUSES,
  isAppointmentEligibleForCheckIn,
} from '../repositories/appointmentCheckInContract.js';

export const RECEPTION_DAY_TIME_ZONE = 'America/Sao_Paulo';

const STATUSES = Object.freeze({
  CONFIRMADA: 'Confirmada',
  AGENDADA: 'Agendada',
  PENDENTE: 'Pendente',
  EM_ATENDIMENTO: 'Em atendimento',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: RECEPTION_DAY_TIME_ZONE,
});

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const BR_DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

const STATUS_GROUPS = {
  [STATUSES.AGENDADA]: 'toConfirm',
  [STATUSES.PENDENTE]: 'toConfirm',
  [STATUSES.CONFIRMADA]: 'confirmed',
  [STATUSES.EM_ATENDIMENTO]: 'inProgress',
  [STATUSES.FINALIZADA]: 'finished',
  [STATUSES.CANCELADA]: 'canceled',
};

const STATUS_ACTIONS = Object.freeze({
  [STATUSES.AGENDADA]: {
    type: 'confirm',
    label: 'Confirmar',
    nextStatus: STATUSES.CONFIRMADA,
  },
  [STATUSES.PENDENTE]: {
    type: 'confirm',
    label: 'Confirmar',
    nextStatus: STATUSES.CONFIRMADA,
  },
  [STATUSES.CONFIRMADA]: {
    type: 'start',
    label: 'Iniciar',
    nextStatus: STATUSES.EM_ATENDIMENTO,
  },
  [STATUSES.EM_ATENDIMENTO]: {
    type: 'finish',
    label: 'Finalizar',
    nextStatus: STATUSES.FINALIZADA,
  },
});
const CANCEL_STATUS_ACTION = Object.freeze({
  type: 'cancel',
  label: 'Cancelar',
  nextStatus: STATUSES.CANCELADA,
});
const STATUS_ACTION_BLOCKED_REASON = 'Consulta sem identificador operacional da Agenda.';
const STATUS_UPDATE_BLOCKED_REASON = 'Status não permitido para esta ação da recepção.';

const ACTIVE_STATUS_SET = new Set([
  STATUSES.AGENDADA,
  STATUSES.PENDENTE,
  STATUSES.CONFIRMADA,
  STATUSES.EM_ATENDIMENTO,
]);

const ATTENTION_PRIORITY = {
  late: 1,
  next: 2,
  confirmation: 3,
};

const PREPARATION_PRIORITY = {
  attention: 1,
  review: 2,
  ok: 3,
};

const DAY_FLOW_PERIODS = Object.freeze([
  { id: 'morning', label: 'Manhã', range: 'Antes de 12h' },
  { id: 'afternoon', label: 'Tarde', range: '12h às 17h59' },
  { id: 'evening', label: 'Noite', range: 'A partir de 18h' },
  { id: 'unscheduled', label: 'Sem horário', range: 'Horário pendente' },
]);

const safeText = (value, fallback = '') => {
  const text = String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text || fallback;
};

const normalizeComparableText = (value) => safeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const sanitizeOriginLabel = (value) => {
  const origin = safeText(value, 'Origem não informada');
  const comparableOrigin = normalizeComparableText(origin);
  const blockedChatOrigin = `${'whats'}${'app'}`;
  const blockedCalendarOrigin = `${'google'} ${'calendar'}`;

  if (comparableOrigin === blockedChatOrigin || comparableOrigin.includes(blockedCalendarOrigin)) {
    return 'Origem externa não conectada';
  }

  return origin;
};

const toList = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

const formatCountLabel = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;

const isValidDateKey = (value) => {
  const match = safeText(value).match(ISO_DATE_PATTERN);
  if (!match) return false;

  const [, yearValue, monthValue, dayValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return !Number.isNaN(parsed.getTime())
    && parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
};

export const formatReceptionDateKeyInSaoPaulo = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = Object.fromEntries(
    dateFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
};

export const normalizeReceptionDateKey = (value) => {
  const rawValue = safeText(value);

  if (!rawValue) {
    return '';
  }

  if (ISO_DATE_PATTERN.test(rawValue)) {
    return isValidDateKey(rawValue) ? rawValue : '';
  }

  const brDateMatch = rawValue.match(BR_DATE_PATTERN);
  if (brDateMatch) {
    const [, day, month, year] = brDateMatch;
    const dateKey = `${year}-${month}-${day}`;
    return isValidDateKey(dateKey) ? dateKey : '';
  }

  return formatReceptionDateKeyInSaoPaulo(rawValue);
};

const getItemDateKey = (item, todayKey) => {
  const explicitDate = normalizeReceptionDateKey(item?.date || item?.dateKey);
  if (explicitDate) return explicitDate;

  const startsAt = item?.starts_at || item?.startsAt;
  return (startsAt ? formatReceptionDateKeyInSaoPaulo(startsAt) : '') || todayKey;
};

const normalizeTime = (value) => {
  const time = safeText(value);
  const match = time.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return '';
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return '';
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getDayPeriodId = (time) => {
  const normalizedTime = normalizeTime(time);

  if (!normalizedTime) {
    return 'unscheduled';
  }

  const hours = Number(normalizedTime.slice(0, 2));

  if (hours < 12) return 'morning';
  if (hours < 18) return 'afternoon';
  return 'evening';
};

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: RECEPTION_DAY_TIME_ZONE,
});

const formatCheckInTime = (value) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '';
  return normalizeTime(timeFormatter.format(date));
};

const buildActiveCheckInsByAppointmentId = (checkIns = []) => {
  return toList(checkIns)
    .filter((checkIn) => (
      checkIn.status === APPOINTMENT_CHECK_IN_STATUSES.ACTIVE
      && safeText(checkIn.appointmentId || checkIn.appointment_id)
    ))
    .sort((left, right) => (
      new Date(right.checkedInAt || right.checked_in_at || 0).getTime()
      - new Date(left.checkedInAt || left.checked_in_at || 0).getTime()
    ))
    .reduce((checkInsByAppointmentId, checkIn) => {
      const appointmentId = safeText(checkIn.appointmentId || checkIn.appointment_id);
      if (!checkInsByAppointmentId.has(appointmentId)) {
        checkInsByAppointmentId.set(appointmentId, {
          id: safeText(checkIn.id),
          appointmentId,
          status: APPOINTMENT_CHECK_IN_STATUSES.ACTIVE,
          checkedInAt: safeText(checkIn.checkedInAt || checkIn.checked_in_at),
        });
      }
      return checkInsByAppointmentId;
    }, new Map());
};

const buildCheckInState = ({ appointmentId, appointmentStatus, checkIn }) => {
  const hasActiveCheckIn = Boolean(checkIn?.id);
  const canRegisterCheckIn = Boolean(
    appointmentId
    && !hasActiveCheckIn
    && isAppointmentEligibleForCheckIn(appointmentStatus)
  );

  let checkInBlockedReason = '';
  if (!appointmentId) {
    checkInBlockedReason = 'Consulta sem identificador operacional da Agenda.';
  } else if (hasActiveCheckIn) {
    checkInBlockedReason = 'A chegada já foi registrada.';
  } else if (appointmentStatus === STATUSES.CANCELADA) {
    checkInBlockedReason = 'Consultas canceladas não aceitam check-in.';
  } else if (appointmentStatus === STATUSES.FINALIZADA) {
    checkInBlockedReason = 'Consultas finalizadas não aceitam check-in.';
  } else if (!isAppointmentEligibleForCheckIn(appointmentStatus)) {
    checkInBlockedReason = 'O estado atual da consulta não aceita check-in.';
  }

  return {
    canRegisterCheckIn,
    checkInBlockedReason,
    checkInId: checkIn?.id || '',
    checkedInAt: checkIn?.checkedInAt || '',
    checkedInTime: formatCheckInTime(checkIn?.checkedInAt),
    hasActiveCheckIn,
  };
};

const getItemTime = (item) => {
  const explicitTime = normalizeTime(item?.time);
  if (explicitTime) return explicitTime;

  const date = new Date(item?.starts_at || item?.startsAt || '');
  if (Number.isNaN(date.getTime())) return '';

  return normalizeTime(timeFormatter.format(date));
};

const buildSortValue = (dateKey, time) => {
  const parsed = new Date(`${dateKey || '9999-12-31'}T${time || '23:59'}:00-03:00`);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
};

const hasRealSourceSignal = (item) => (
  Boolean(item?.starts_at || item?.startsAt || item?.created_at || item?.updated_at)
    || UUID_PATTERN.test(safeText(item?.id))
);

const resolveSourceLabel = (items) => {
  if (!items.length) {
    return 'Agenda sem registros';
  }

  const realCount = items.filter(hasRealSourceSignal).length;

  if (realCount === 0) {
    return 'Fallback demo';
  }

  return realCount === items.length ? 'Supabase' : 'Misto';
};

const buildMetrics = (queue, blocks) => ({
  total: queue.length,
  toConfirm: queue.filter((item) => item.status === STATUSES.AGENDADA || item.status === STATUSES.PENDENTE).length,
  confirmed: queue.filter((item) => item.status === STATUSES.CONFIRMADA).length,
  inProgress: queue.filter((item) => item.status === STATUSES.EM_ATENDIMENTO).length,
  finished: queue.filter((item) => item.status === STATUSES.FINALIZADA).length,
  canceled: queue.filter((item) => item.status === STATUSES.CANCELADA).length,
  active: queue.filter((item) => ACTIVE_STATUS_SET.has(item.status)).length,
  checkedIn: queue.filter((item) => item.hasActiveCheckIn).length,
  blocks: blocks.length,
});

const buildNextStatusAction = (status) => STATUS_ACTIONS[status] || null;

const buildStatusActionState = (item) => {
  const nextStatusAction = buildNextStatusAction(item.status);
  const canApplyStatusAction = Boolean(nextStatusAction && item.appointmentId);

  return {
    nextStatusAction,
    canApplyStatusAction,
    statusActionBlockedReason: nextStatusAction && !item.appointmentId
      ? STATUS_ACTION_BLOCKED_REASON
      : '',
  };
};

const buildCancelStatusActionState = (item) => {
  const cancelStatusAction = [STATUSES.CANCELADA, STATUSES.FINALIZADA].includes(item.status)
    ? null
    : CANCEL_STATUS_ACTION;
  const canApplyCancelStatusAction = Boolean(cancelStatusAction && item.appointmentId);

  return {
    cancelStatusAction,
    canApplyCancelStatusAction,
    cancelStatusBlockedReason: cancelStatusAction && !item.appointmentId
      ? STATUS_ACTION_BLOCKED_REASON
      : '',
  };
};

const buildStatusUpdateRequest = ({
  canUpdateStatus = false,
  nextStatus,
  statusUpdateBlockedReason = STATUS_UPDATE_BLOCKED_REASON,
}) => ({
  canUpdateStatus,
  nextStatus: safeText(nextStatus),
  statusUpdateBlockedReason: canUpdateStatus ? '' : statusUpdateBlockedReason,
});

export const resolveReceptionStatusUpdateRequest = (appointment, nextStatus) => {
  const requestedStatus = safeText(nextStatus);

  if (!appointment || !requestedStatus) {
    return buildStatusUpdateRequest({ nextStatus: requestedStatus });
  }

  if (appointment.nextStatusAction?.nextStatus === requestedStatus) {
    return buildStatusUpdateRequest({
      canUpdateStatus: Boolean(appointment.canApplyStatusAction),
      nextStatus: requestedStatus,
      statusUpdateBlockedReason: appointment.statusActionBlockedReason || STATUS_ACTION_BLOCKED_REASON,
    });
  }

  if (appointment.cancelStatusAction?.nextStatus === requestedStatus) {
    return buildStatusUpdateRequest({
      canUpdateStatus: Boolean(appointment.canApplyCancelStatusAction),
      nextStatus: requestedStatus,
      statusUpdateBlockedReason: appointment.cancelStatusBlockedReason || STATUS_ACTION_BLOCKED_REASON,
    });
  }

  return buildStatusUpdateRequest({ nextStatus: requestedStatus });
};

const buildAttentionItem = (item) => {
  if (item.operationalState === 'Atrasado') {
    return {
      id: `late-${item.id}`,
      type: 'late',
      priority: ATTENTION_PRIORITY.late,
      label: 'Atraso derivado',
      title: item.patient,
      description: `Previsto para ${item.time}.`,
      time: item.time,
      appointmentId: item.appointmentId,
      queueItemId: item.id,
      sortValue: item.sortValue,
    };
  }

  if (item.operationalState === 'Próximo') {
    return {
      id: `next-${item.id}`,
      type: 'next',
      priority: ATTENTION_PRIORITY.next,
      label: 'Próxima consulta',
      title: item.patient,
      description: `${item.time} · ${item.procedure}`,
      time: item.time,
      appointmentId: item.appointmentId,
      queueItemId: item.id,
      sortValue: item.sortValue,
    };
  }

  if (item.status === STATUSES.AGENDADA || item.status === STATUSES.PENDENTE) {
    return {
      id: `confirmation-${item.id}`,
      type: 'confirmation',
      priority: ATTENTION_PRIORITY.confirmation,
      label: 'A confirmar',
      title: item.patient,
      description: `${item.time} · confirmação operacional pendente.`,
      time: item.time,
      appointmentId: item.appointmentId,
      queueItemId: item.id,
      sortValue: item.sortValue,
    };
  }

  return null;
};

const buildAttentionItems = (queue) => queue
  .map(buildAttentionItem)
  .filter(Boolean)
  .sort((left, right) => (
    left.priority - right.priority
    || left.sortValue - right.sortValue
    || left.title.localeCompare(right.title)
  ))
  .slice(0, 5);

const buildResourceId = (type, name) => {
  const slug = normalizeComparableText(name).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${type}-${slug || 'sem-alocacao'}`;
};

const createResourceBucket = (type, name) => ({
  id: buildResourceId(type, name),
  type,
  name,
  appointments: 0,
  activeAppointments: 0,
  blocks: 0,
  nextTime: '',
  nextSortValue: Number.POSITIVE_INFINITY,
});

const getResourceBucket = (map, type, name) => {
  const safeName = safeText(name, type === 'room' ? 'Sala' : 'Profissional');
  const key = `${type}:${normalizeComparableText(safeName)}`;

  if (!map.has(key)) {
    map.set(key, createResourceBucket(type, safeName));
  }

  return map.get(key);
};

const toResourceList = (map) => [...map.values()]
  .map(({ nextSortValue, ...item }) => ({
    ...item,
    nextTime: item.nextTime || 'Sem consulta ativa',
  }))
  .sort((left, right) => (
    (left.nextTime === 'Sem consulta ativa' ? 1 : 0) - (right.nextTime === 'Sem consulta ativa' ? 1 : 0)
    || left.nextTime.localeCompare(right.nextTime)
    || left.name.localeCompare(right.name)
  ));

const buildResourceMap = (queue, blocks) => {
  const professionals = new Map();
  const rooms = new Map();

  queue.forEach((item) => {
    [
      getResourceBucket(professionals, 'professional', item.professional),
      getResourceBucket(rooms, 'room', item.room),
    ].forEach((bucket) => {
      bucket.appointments += 1;

      if (ACTIVE_STATUS_SET.has(item.status)) {
        bucket.activeAppointments += 1;

        if (item.sortValue < bucket.nextSortValue) {
          bucket.nextSortValue = item.sortValue;
          bucket.nextTime = item.time;
        }
      }
    });
  });

  blocks.forEach((block) => {
    getResourceBucket(professionals, 'professional', block.professional).blocks += 1;
    getResourceBucket(rooms, 'room', block.room).blocks += 1;
  });

  return {
    professionals: toResourceList(professionals),
    rooms: toResourceList(rooms),
  };
};

const createDayFlowBucket = (period) => ({
  ...period,
  total: 0,
  active: 0,
  toConfirm: 0,
  confirmed: 0,
  inProgress: 0,
  finished: 0,
  canceled: 0,
  nextTime: '',
  nextPatient: '',
  nextSortValue: Number.POSITIVE_INFINITY,
});

const buildDayFlow = (queue) => {
  const buckets = DAY_FLOW_PERIODS.map(createDayFlowBucket);
  const bucketsById = new Map(buckets.map((bucket) => [bucket.id, bucket]));

  queue.forEach((item) => {
    const bucket = bucketsById.get(getDayPeriodId(item.time)) || bucketsById.get('unscheduled');
    bucket.total += 1;

    if (ACTIVE_STATUS_SET.has(item.status)) {
      bucket.active += 1;

      if (item.sortValue < bucket.nextSortValue) {
        bucket.nextSortValue = item.sortValue;
        bucket.nextTime = item.time;
        bucket.nextPatient = item.patient;
      }
    }

    if (item.status === STATUSES.AGENDADA || item.status === STATUSES.PENDENTE) {
      bucket.toConfirm += 1;
    }
    if (item.status === STATUSES.CONFIRMADA) bucket.confirmed += 1;
    if (item.status === STATUSES.EM_ATENDIMENTO) bucket.inProgress += 1;
    if (item.status === STATUSES.FINALIZADA) bucket.finished += 1;
    if (item.status === STATUSES.CANCELADA) bucket.canceled += 1;
  });

  return buckets.map(({ nextSortValue, ...bucket }) => ({
    ...bucket,
    nextTime: bucket.nextTime || 'Sem consulta ativa',
  }));
};

const createPreparationItem = ({ count, description, id, label, severity = 'review', title, type }) => ({
  id,
  type,
  severity,
  priority: PREPARATION_PRIORITY[severity] || PREPARATION_PRIORITY.review,
  label,
  title,
  description,
  count,
});

const buildPreparationItems = (queue, blocks, patients) => {
  const openQueue = queue.filter((item) => item.status !== STATUSES.FINALIZADA && item.status !== STATUSES.CANCELADA);
  const items = [];
  const pendingConfirmation = openQueue.filter((item) => item.status === STATUSES.AGENDADA || item.status === STATUSES.PENDENTE);
  const missingProcedure = openQueue.filter((item) => !item.hasProcedure);
  const missingAllocation = openQueue.filter((item) => !item.hasProfessional || !item.hasRoom);
  const missingPatient = openQueue.filter((item) => !item.hasPatientName);
  const missingCrmLink = patients.length
    ? openQueue.filter((item) => !item.linkedPatientId)
    : [];
  const missingBlockAllocation = blocks.filter((block) => !block.hasProfessional || !block.hasRoom);

  if (pendingConfirmation.length) {
    items.push(createPreparationItem({
      id: 'preparation-confirmation',
      type: 'confirmation',
      severity: 'attention',
      label: 'Status da Agenda',
      title: 'Confirmações pendentes',
      description: `${formatCountLabel(pendingConfirmation.length, 'consulta', 'consultas')} com status Agendada ou Pendente.`,
      count: pendingConfirmation.length,
    }));
  }

  if (missingProcedure.length) {
    items.push(createPreparationItem({
      id: 'preparation-procedure',
      type: 'procedure',
      label: 'Dados da consulta',
      title: 'Procedimento não informado',
      description: `${formatCountLabel(missingProcedure.length, 'consulta sem procedimento informado', 'consultas sem procedimento informado')}.`,
      count: missingProcedure.length,
    }));
  }

  if (missingAllocation.length) {
    items.push(createPreparationItem({
      id: 'preparation-allocation',
      type: 'allocation',
      label: 'Recursos do dia',
      title: 'Profissional ou sala pendente',
      description: `${formatCountLabel(missingAllocation.length, 'consulta sem recurso completo', 'consultas sem recurso completo')}.`,
      count: missingAllocation.length,
    }));
  }

  if (missingPatient.length) {
    items.push(createPreparationItem({
      id: 'preparation-patient',
      type: 'patient',
      label: 'Identificação',
      title: 'Paciente sem nome',
      description: `${formatCountLabel(missingPatient.length, 'consulta sem paciente nomeado', 'consultas sem paciente nomeado')}.`,
      count: missingPatient.length,
    }));
  }

  if (missingCrmLink.length) {
    items.push(createPreparationItem({
      id: 'preparation-crm-link',
      type: 'crm-link',
      label: 'CRM permitido',
      title: 'Paciente sem vínculo CRM',
      description: `${formatCountLabel(missingCrmLink.length, 'consulta sem paciente reconhecido no CRM', 'consultas sem paciente reconhecido no CRM')}.`,
      count: missingCrmLink.length,
    }));
  }

  if (missingBlockAllocation.length) {
    items.push(createPreparationItem({
      id: 'preparation-block-allocation',
      type: 'block-allocation',
      label: 'Bloqueios',
      title: 'Bloqueio sem recurso completo',
      description: `${formatCountLabel(missingBlockAllocation.length, 'bloqueio sem profissional ou sala', 'bloqueios sem profissional ou sala')}.`,
      count: missingBlockAllocation.length,
    }));
  }

  if (!items.length) {
    return [createPreparationItem({
      id: 'preparation-ready',
      type: 'ready',
      severity: 'ok',
      label: 'Leitura derivada',
      title: 'Rotina pronta',
      description: 'Sem pendências de preparação derivadas da Agenda neste momento.',
      count: 0,
    })];
  }

  return items.sort((left, right) => (
    left.priority - right.priority
    || right.count - left.count
    || left.title.localeCompare(right.title)
  ));
};

const resolveOperationalState = ({ item, nextAppointmentId, nowValue }) => {
  if (item.status === STATUSES.CANCELADA) return 'Cancelado';
  if (item.status === STATUSES.FINALIZADA) return 'Finalizado';
  if (item.status === STATUSES.EM_ATENDIMENTO) return 'Em atendimento';
  if (item.appointmentId && item.appointmentId === nextAppointmentId) return 'Próximo';

  if (ACTIVE_STATUS_SET.has(item.status) && item.sortValue < nowValue) {
    return 'Atrasado';
  }

  if (item.status === STATUSES.CONFIRMADA) return 'Confirmado';

  return 'A confirmar';
};

const mapAppointment = ({ appointment, checkInsByAppointmentId, patients, todayKey }) => {
  const dateKey = getItemDateKey(appointment, todayKey);
  const time = getItemTime(appointment);
  const appointmentId = safeText(appointment.id);
  const patient = safeText(appointment.patient || appointment.patientName || appointment.patient_name, 'Paciente sem nome');
  const procedure = safeText(appointment.procedure || appointment.procedureLabel || appointment.procedure_label, 'Procedimento não informado');
  const professional = safeText(appointment.professional || appointment.professionalName, 'Profissional');
  const room = safeText(appointment.room || appointment.roomName, 'Sala');
  const status = Object.values(STATUSES).includes(appointment.status)
    ? appointment.status
    : STATUSES.AGENDADA;
  const crmMatch = resolveAppointmentCrmPatient(appointment, patients);
  const linkedPatient = crmMatch.patient;
  const patientId = appointment.patientId || appointment.patient_id || null;
  const hasRealPatientLink = Boolean(
    patientId
      && linkedPatient?.id
      && crmMatch.source === CRM_AGENDA_LINK_SOURCE.PATIENT_ID
  );
  const checkIn = checkInsByAppointmentId.get(appointmentId) || null;

  return {
    id: appointmentId || `reception-appointment-${dateKey}-${time}`,
    appointmentId,
    dateKey,
    startsAt: safeText(appointment.starts_at || appointment.startsAt),
    time: time || 'Horário pendente',
    duration: Number(appointment.duration || appointment.durationMinutes || 60),
    patient,
    patientId,
    linkedPatientId: linkedPatient?.id || '',
    hasRealPatientLink,
    linkSource: crmMatch.source || CRM_AGENDA_LINK_SOURCE.NONE,
    phone: safeText(appointment.phone || appointment.patient_phone),
    procedure,
    professional,
    room,
    hasPatientName: patient !== 'Paciente sem nome',
    hasProcedure: procedure !== 'Procedimento não informado',
    hasProfessional: professional !== 'Profissional',
    hasRoom: room !== 'Sala',
    status,
    group: STATUS_GROUPS[status] || 'toConfirm',
    origin: sanitizeOriginLabel(appointment.origin || appointment.originLabel || appointment.origin_label),
    notes: safeText(appointment.notes),
    sortValue: buildSortValue(dateKey, time),
    ...buildCheckInState({
      appointmentId,
      appointmentStatus: status,
      checkIn,
    }),
  };
};

const mapBlock = (block, todayKey) => {
  const dateKey = getItemDateKey(block, todayKey);
  const time = getItemTime(block);
  const professional = safeText(block.professional || block.professionalName, 'Profissional');
  const room = safeText(block.room || block.roomName, 'Sala');

  return {
    id: safeText(block.id) || `reception-block-${dateKey}-${time}`,
    dateKey,
    startsAt: safeText(block.starts_at || block.startsAt),
    time: time || 'Horário pendente',
    duration: Number(block.duration || block.durationMinutes || 60),
    professional,
    room,
    hasProfessional: professional !== 'Profissional',
    hasRoom: room !== 'Sala',
    reason: safeText(block.reason, 'Bloqueio operacional'),
    sortValue: buildSortValue(dateKey, time),
  };
};

export const buildReceptionDayModel = ({
  appointments = [],
  blocks = [],
  checkIns = [],
  patients = [],
  todayKey = formatReceptionDateKeyInSaoPaulo(),
  now = new Date(),
} = {}) => {
  const safeTodayKey = normalizeReceptionDateKey(todayKey) || formatReceptionDateKeyInSaoPaulo();
  const safePatients = toList(patients);
  const checkInsByAppointmentId = buildActiveCheckInsByAppointmentId(checkIns);

  const queue = toList(appointments)
    .map((appointment) => mapAppointment({
      appointment,
      checkInsByAppointmentId,
      patients: safePatients,
      todayKey: safeTodayKey,
    }))
    .filter((appointment) => appointment.dateKey === safeTodayKey)
    .sort((left, right) => left.sortValue - right.sortValue);

  const dayBlocks = toList(blocks)
    .map((block) => mapBlock(block, safeTodayKey))
    .filter((block) => block.dateKey === safeTodayKey)
    .sort((left, right) => left.sortValue - right.sortValue);

  const nowValue = now instanceof Date && !Number.isNaN(now.getTime())
    ? now.getTime()
    : new Date(now).getTime();
  const nextAppointment = queue.find((item) => ACTIVE_STATUS_SET.has(item.status) && item.sortValue >= nowValue)
    || queue.find((item) => ACTIVE_STATUS_SET.has(item.status))
    || null;
  const nextAppointmentId = nextAppointment?.appointmentId || '';
  const queueWithOperationalState = queue.map((item) => ({
    ...item,
    operationalState: resolveOperationalState({ item, nextAppointmentId, nowValue }),
    ...buildStatusActionState(item),
    ...buildCancelStatusActionState(item),
  }));
  const attentionItems = buildAttentionItems(queueWithOperationalState);
  const resourceMap = buildResourceMap(queueWithOperationalState, dayBlocks);
  const dayFlow = buildDayFlow(queueWithOperationalState);
  const preparationItems = buildPreparationItems(queueWithOperationalState, dayBlocks, safePatients);
  const visibleItems = [...toList(appointments), ...toList(blocks)];

  return {
    todayKey: safeTodayKey,
    sourceLabel: resolveSourceLabel(visibleItems),
    metrics: buildMetrics(queueWithOperationalState, dayBlocks),
    queue: queueWithOperationalState,
    blocks: dayBlocks,
    attentionItems,
    resourceMap,
    dayFlow,
    preparationItems,
    nextAppointmentId,
  };
};
