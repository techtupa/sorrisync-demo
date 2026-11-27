import { getUsersByTenant } from '../../data/mockUsersPermissions.js';
import {
  OPERATIONAL_FOLLOW_UP_ACTIONS,
  OPERATIONAL_FOLLOW_UP_DISMISSAL_REASONS,
  OPERATIONAL_FOLLOW_UP_PRIORITIES,
  OPERATIONAL_FOLLOW_UP_STATUSES,
} from '../operationalFollowUpContract.js';

const followUpsByTenant = new Map();
let nextMockId = 1;

const getTenantRows = (tenantId) => {
  if (!followUpsByTenant.has(tenantId)) {
    followUpsByTenant.set(tenantId, []);
  }

  return followUpsByTenant.get(tenantId);
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();
const isActive = (item) => [
  OPERATIONAL_FOLLOW_UP_STATUSES.OPEN,
  OPERATIONAL_FOLLOW_UP_STATUSES.IN_PROGRESS,
].includes(item?.status);

const assertActive = (item) => {
  if (!item) {
    throw new Error('Acompanhamento não encontrado neste tenant.');
  }

  if (!isActive(item)) {
    throw new Error('Acompanhamentos concluídos ou dispensados não podem ser reabertos.');
  }
};

export const resetMockOperationalFollowUps = () => {
  followUpsByTenant.clear();
  nextMockId = 1;
};

export const getMockOperationalFollowUpsByTenant = async (tenantId) => ({
  items: clone(getTenantRows(tenantId)),
  source: 'mock',
});

export const createMockOperationalFollowUpByTenant = async (tenantId, payload = {}) => {
  const rows = getTenantRows(tenantId);
  const existing = rows.find((item) => (
    item.sourceType === payload.sourceType
    && item.sourceId === payload.sourceId
    && isActive(item)
  ));

  if (existing) {
    return { item: clone(existing), replayed: true, source: 'mock' };
  }

  const timestamp = nowIso();
  const item = {
    id: `mock-operational-follow-up-${nextMockId++}`,
    tenantId,
    sourceType: payload.sourceType,
    sourceId: payload.sourceId,
    status: OPERATIONAL_FOLLOW_UP_STATUSES.OPEN,
    priority: payload.priority || OPERATIONAL_FOLLOW_UP_PRIORITIES.NORMAL,
    dueAt: payload.dueAt || null,
    assignedUserId: null,
    resolutionCode: null,
    resolvedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  rows.push(item);
  return { item: clone(item), replayed: false, source: 'mock' };
};

export const mutateMockOperationalFollowUpByTenant = async (tenantId, followUpId, mutation = {}) => {
  const rows = getTenantRows(tenantId);
  const index = rows.findIndex((item) => item.id === followUpId);
  const current = rows[index];
  assertActive(current);

  const next = { ...current, updatedAt: nowIso() };

  switch (mutation.action) {
    case OPERATIONAL_FOLLOW_UP_ACTIONS.CLAIM:
      next.assignedUserId = mutation.currentUserId;
      next.status = OPERATIONAL_FOLLOW_UP_STATUSES.IN_PROGRESS;
      break;
    case OPERATIONAL_FOLLOW_UP_ACTIONS.ASSIGN:
      if (!mutation.assignedUserId) throw new Error('Selecione um responsável ativo.');
      next.assignedUserId = mutation.assignedUserId;
      next.status = OPERATIONAL_FOLLOW_UP_STATUSES.IN_PROGRESS;
      break;
    case OPERATIONAL_FOLLOW_UP_ACTIONS.SET_DUE_AT:
      next.dueAt = mutation.dueAt || null;
      break;
    case OPERATIONAL_FOLLOW_UP_ACTIONS.SET_PRIORITY:
      if (!Object.values(OPERATIONAL_FOLLOW_UP_PRIORITIES).includes(mutation.priority)) {
        throw new Error('Prioridade inválida.');
      }
      next.priority = mutation.priority;
      break;
    case OPERATIONAL_FOLLOW_UP_ACTIONS.COMPLETE:
      next.status = OPERATIONAL_FOLLOW_UP_STATUSES.DONE;
      next.resolutionCode = 'completed';
      next.resolvedAt = next.updatedAt;
      break;
    case OPERATIONAL_FOLLOW_UP_ACTIONS.DISMISS:
      if (!Object.values(OPERATIONAL_FOLLOW_UP_DISMISSAL_REASONS).includes(mutation.resolutionCode)) {
        throw new Error('Selecione um motivo de dispensa controlado.');
      }
      next.status = OPERATIONAL_FOLLOW_UP_STATUSES.DISMISSED;
      next.resolutionCode = mutation.resolutionCode;
      next.resolvedAt = next.updatedAt;
      break;
    default:
      throw new Error('Ação de acompanhamento não suportada.');
  }

  rows[index] = next;
  return { item: clone(next), source: 'mock' };
};

export const listMockOperationalFollowUpAssigneesByTenant = async (tenantId) => ({
  source: 'mock',
  users: getUsersByTenant(tenantId)
    .filter((user) => user.status === 'Ativo')
    .map((user) => ({ id: user.id, displayName: user.name })),
});
