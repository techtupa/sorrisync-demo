import { getScheduleAppointmentsByTenant } from './scheduleRepository.js';
import {
  APPOINTMENT_CHECK_IN_STATUSES,
  isAppointmentEligibleForCheckIn,
  isValidAppointmentCheckInRevertReason,
} from '../appointmentCheckInContract.js';

const checkInsByTenant = new Map();
let nextMockId = 1;

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

const getTenantRows = (tenantId) => {
  if (!checkInsByTenant.has(tenantId)) {
    checkInsByTenant.set(tenantId, []);
  }

  return checkInsByTenant.get(tenantId);
};

const findAppointment = (tenantId, appointmentId) => (
  getScheduleAppointmentsByTenant(tenantId).find((appointment) => appointment.id === appointmentId)
);

export const resetMockAppointmentCheckIns = () => {
  checkInsByTenant.clear();
  nextMockId = 1;
};

export const listMockAppointmentCheckInsByTenantAndAppointments = async (
  tenantId,
  appointmentIds = [],
) => {
  const allowedIds = new Set(appointmentIds.filter(Boolean));

  return {
    items: clone(getTenantRows(tenantId).filter((item) => allowedIds.has(item.appointmentId))),
    source: 'mock',
  };
};

export const checkInMockAppointmentByTenant = async (tenantId, appointmentId) => {
  const appointment = findAppointment(tenantId, appointmentId);

  if (!appointment) {
    throw new Error('Consulta não encontrada para a clínica atual.');
  }

  if (!isAppointmentEligibleForCheckIn(appointment.status)) {
    throw new Error('A chegada não pode ser registrada para o estado atual da consulta.');
  }

  const rows = getTenantRows(tenantId);
  const existing = rows.find((item) => (
    item.appointmentId === appointmentId
    && item.status === APPOINTMENT_CHECK_IN_STATUSES.ACTIVE
  ));

  if (existing) {
    return { item: clone(existing), replayed: true, source: 'mock' };
  }

  const timestamp = nowIso();
  const item = {
    id: `mock-appointment-check-in-${nextMockId++}`,
    appointmentId,
    status: APPOINTMENT_CHECK_IN_STATUSES.ACTIVE,
    checkedInAt: timestamp,
    revertedAt: null,
    revertReasonCode: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  rows.push(item);
  return { item: clone(item), replayed: false, source: 'mock' };
};

export const revertMockAppointmentCheckInByTenant = async (
  tenantId,
  checkInId,
  reasonCode,
) => {
  if (!isValidAppointmentCheckInRevertReason(reasonCode)) {
    throw new Error('Selecione um motivo de reversão válido.');
  }

  const rows = getTenantRows(tenantId);
  const index = rows.findIndex((item) => item.id === checkInId);
  const current = rows[index];

  if (!current) {
    throw new Error('Check-in não encontrado para a clínica atual.');
  }

  if (current.status === APPOINTMENT_CHECK_IN_STATUSES.REVERTED) {
    return { item: clone(current), replayed: true, source: 'mock' };
  }

  const timestamp = nowIso();
  const item = {
    ...current,
    status: APPOINTMENT_CHECK_IN_STATUSES.REVERTED,
    revertedAt: timestamp,
    revertReasonCode: reasonCode,
    updatedAt: timestamp,
  };

  rows[index] = item;
  return { item: clone(item), replayed: false, source: 'mock' };
};
