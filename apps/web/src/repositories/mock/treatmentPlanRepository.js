import { getServicesByTenant } from '../../data/mockServices.js';
import {
  buildTreatmentPlanReadModel,
  validateTreatmentPlanCancellation,
  validateTreatmentPlanItem,
} from '../treatmentPlanContract.js';

const plansByPatient = new Map();
const appendRequests = new Map();
const completionRequests = new Map();
const cancellationRequests = new Map();
const now = () => new Date().toISOString();

const fail = (code, userMessage) => {
  const error = new Error(code);
  error.code = code;
  error.userMessage = userMessage;
  throw error;
};

const keyFor = (tenantId, patientId) => `${tenantId}:${patientId}`;
const requestKey = (tenantId, operation, requestId) => `${tenantId}:${operation}:${requestId}`;

const toRows = (plans) => plans.flatMap((plan) => plan.items.map((item) => ({
  plan_id: plan.id,
  plan_status: plan.status,
  plan_created_at: plan.createdAt,
  plan_completed_at: plan.completedAt,
  plan_cancelled_at: plan.cancelledAt,
  item_id: item.id,
  service_id: item.serviceId,
  service_name: item.serviceName,
  tooth_code: item.toothCode,
  surface_code: item.surfaceCode,
  odontogram_reference_present: Boolean(item.odontogramFindingId),
  sequence_number: item.sequenceNumber,
  priority_code: item.priority,
  item_status: item.status,
  item_created_at: item.createdAt,
  author_display_name: item.authorDisplayName,
  item_completed_at: item.completedAt,
  item_cancelled_at: item.cancelledAt,
  cancellation_reason_code: item.cancellationReasonCode,
})));

const serviceRows = (tenantId) => getServicesByTenant(tenantId)
  .filter((service) => service.status === 'Ativo' && service.useInAgenda !== false)
  .map((service) => ({ service_id: service.id, service_name: service.name }));

const findItem = (tenantId, itemId) => {
  for (const [scope, plans] of plansByPatient.entries()) {
    if (!scope.startsWith(`${tenantId}:`)) continue;
    for (const plan of plans) {
      const item = plan.items.find((candidate) => candidate.id === itemId);
      if (item) return { plan, item, patientId: scope.slice(scope.indexOf(':') + 1) };
    }
  }
  return null;
};

const recalculatePlan = (plan) => {
  if (plan.items.some((item) => item.status === 'planned')) return;
  if (plan.items.some((item) => item.status === 'completed')) {
    plan.status = 'completed';
    plan.completedAt = now();
  } else {
    plan.status = 'cancelled';
    plan.cancelledAt = now();
  }
};

export const getMockTreatmentPlanContextsByPatient = (tenantId, patientId) => (
  (plansByPatient.get(keyFor(tenantId, patientId)) || []).flatMap((plan) => (
    plan.items.map((item) => ({ plan, item, patientId }))
  ))
);

export const getMockTreatmentPlanItemContext = (tenantId, itemId) => findItem(tenantId, itemId);

export const getMockPatientTreatmentPlan = async ({ tenantId, patientId, canRead = true }) => {
  if (!canRead) fail('SS_TREATMENT_PLAN_ACCESS_DENIED', 'Seu perfil não possui acesso a este plano de tratamento.');
  return buildTreatmentPlanReadModel(toRows(plansByPatient.get(keyFor(tenantId, patientId)) || []), serviceRows(tenantId));
};

export const appendMockTreatmentPlanItem = async ({
  tenantId, patientId, serviceId, toothCode = null, surfaceCode = null,
  odontogramFindingId = null, priority, sequenceNumber, requestId, canManage = true,
}) => {
  if (!canManage) fail('SS_TREATMENT_PLAN_ACCESS_DENIED', 'Seu perfil não possui acesso a este plano de tratamento.');
  const validation = validateTreatmentPlanItem({ serviceId, toothCode, surfaceCode, priority, sequenceNumber });
  if (!validation.valid) fail('SS_TREATMENT_PLAN_INPUT_INVALID', validation.message);
  const services = serviceRows(tenantId);
  const service = services.find((candidate) => candidate.service_id === serviceId);
  if (!service) fail('SS_TREATMENT_PLAN_SERVICE_INVALID', 'O serviço selecionado não está ativo ou elegível para o plano.');

  const replayKey = requestKey(tenantId, 'append', requestId);
  const replay = appendRequests.get(replayKey);
  if (replay) {
    const found = findItem(tenantId, replay.itemId);
    if (!found || replay.patientId !== patientId || replay.serviceId !== serviceId || replay.toothCode !== toothCode || replay.surfaceCode !== surfaceCode || replay.odontogramFindingId !== odontogramFindingId || replay.priority !== priority || replay.sequenceNumber !== Number(sequenceNumber)) {
      fail('SS_TREATMENT_PLAN_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
    }
    return { ...toRows([found.plan]).find((row) => row.item_id === found.item.id), mutation_result: 'idempotent' };
  }

  const scope = keyFor(tenantId, patientId);
  const plans = plansByPatient.get(scope) || [];
  let plan = plans.find((candidate) => candidate.status === 'active');
  if (!plan) {
    plan = { id: crypto.randomUUID(), status: 'active', createdAt: now(), completedAt: null, cancelledAt: null, items: [] };
    plans.unshift(plan);
    plansByPatient.set(scope, plans);
  }
  if (plan.items.some((item) => item.status === 'planned' && item.serviceId === serviceId && item.toothCode === toothCode && item.surfaceCode === surfaceCode)) {
    fail('SS_TREATMENT_PLAN_DUPLICATE_PLANNED', 'Este procedimento já está planejado com as mesmas referências.');
  }
  const item = {
    id: crypto.randomUUID(), serviceId, serviceName: service.service_name,
    toothCode: toothCode || null, surfaceCode: surfaceCode || null,
    odontogramFindingId: odontogramFindingId || null,
    sequenceNumber: Number(sequenceNumber), priority, status: 'planned',
    createdAt: now(), authorDisplayName: 'Dentista demo',
    completedAt: null, cancelledAt: null, cancellationReasonCode: null,
  };
  plan.items.push(item);
  appendRequests.set(replayKey, { itemId: item.id, patientId, serviceId, toothCode, surfaceCode, odontogramFindingId, priority, sequenceNumber: Number(sequenceNumber) });
  return { ...toRows([plan]).find((row) => row.item_id === item.id), mutation_result: 'changed' };
};

export const completeMockTreatmentPlanItem = async ({ tenantId, itemId, requestId, canManage = true }) => {
  if (!canManage) fail('SS_TREATMENT_PLAN_ACCESS_DENIED', 'Seu perfil não possui acesso a este plano de tratamento.');
  const found = findItem(tenantId, itemId);
  if (!found) fail('SS_TREATMENT_PLAN_ACCESS_DENIED', 'Seu perfil não possui acesso a este plano de tratamento.');
  const replayKey = requestKey(tenantId, 'complete', requestId);
  const replayItemId = completionRequests.get(replayKey);
  if (replayItemId === itemId && found.item.status === 'completed') {
    return { ...toRows([found.plan]).find((row) => row.item_id === itemId), mutation_result: 'idempotent' };
  }
  if (replayItemId && replayItemId !== itemId) fail('SS_TREATMENT_PLAN_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
  if (found.item.status !== 'planned') fail('SS_TREATMENT_PLAN_ITEM_ALREADY_TERMINAL', 'Este item já foi concluído ou cancelado e permanece no histórico.');
  found.item.status = 'completed'; found.item.completedAt = now();
  completionRequests.set(replayKey, itemId); recalculatePlan(found.plan);
  return { ...toRows([found.plan]).find((row) => row.item_id === itemId), mutation_result: 'changed' };
};

export const cancelMockTreatmentPlanItem = async ({ tenantId, itemId, requestId, reasonCode, canManage = true }) => {
  if (!canManage) fail('SS_TREATMENT_PLAN_ACCESS_DENIED', 'Seu perfil não possui acesso a este plano de tratamento.');
  const validation = validateTreatmentPlanCancellation({ itemId, reasonCode });
  if (!validation.valid) fail('SS_TREATMENT_PLAN_INPUT_INVALID', validation.message);
  const found = findItem(tenantId, itemId);
  if (!found) fail('SS_TREATMENT_PLAN_ACCESS_DENIED', 'Seu perfil não possui acesso a este plano de tratamento.');
  const replayKey = requestKey(tenantId, 'cancel', requestId);
  const replay = cancellationRequests.get(replayKey);
  if (replay?.itemId === itemId && replay.reasonCode === reasonCode && found.item.status === 'cancelled') {
    return { ...toRows([found.plan]).find((row) => row.item_id === itemId), mutation_result: 'idempotent' };
  }
  if (replay && (replay.itemId !== itemId || replay.reasonCode !== reasonCode)) fail('SS_TREATMENT_PLAN_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
  if (found.item.status !== 'planned') fail('SS_TREATMENT_PLAN_ITEM_ALREADY_TERMINAL', 'Este item já foi concluído ou cancelado e permanece no histórico.');
  found.item.status = 'cancelled'; found.item.cancelledAt = now(); found.item.cancellationReasonCode = reasonCode;
  cancellationRequests.set(replayKey, { itemId, reasonCode }); recalculatePlan(found.plan);
  return { ...toRows([found.plan]).find((row) => row.item_id === itemId), mutation_result: 'changed' };
};

export const resetMockTreatmentPlans = () => {
  plansByPatient.clear(); appendRequests.clear(); completionRequests.clear(); cancellationRequests.clear();
};
