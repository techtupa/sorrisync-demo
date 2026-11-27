import {
  isOdontogramSurface,
  isOdontogramTooth,
} from './odontogramContract.js';

export const TREATMENT_PLAN_PRIORITIES = Object.freeze(['routine', 'priority']);
export const TREATMENT_PLAN_PRIORITY_LABELS = Object.freeze({
  routine: 'Rotina',
  priority: 'Prioritário',
});

export const TREATMENT_PLAN_STATUSES = Object.freeze(['active', 'completed', 'cancelled']);
export const TREATMENT_PLAN_STATUS_LABELS = Object.freeze({
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
});

export const TREATMENT_PLAN_ITEM_STATUSES = Object.freeze(['planned', 'completed', 'cancelled']);
export const TREATMENT_PLAN_ITEM_STATUS_LABELS = Object.freeze({
  planned: 'Planejado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
});

export const TREATMENT_PLAN_CANCELLATION_REASONS = Object.freeze([
  'registration_error',
  'no_longer_indicated',
  'replaced_by_another_item',
  'patient_declined',
]);

export const TREATMENT_PLAN_CANCELLATION_REASON_LABELS = Object.freeze({
  registration_error: 'Erro de cadastro',
  no_longer_indicated: 'Não mais indicado',
  replaced_by_another_item: 'Substituído por outro item',
  patient_declined: 'Paciente não prosseguiu',
});

export const isTreatmentPlanPriority = (value) => TREATMENT_PLAN_PRIORITIES.includes(String(value || ''));
export const isTreatmentPlanCancellationReason = (value) => TREATMENT_PLAN_CANCELLATION_REASONS.includes(String(value || ''));

export const validateTreatmentPlanItem = ({ serviceId, toothCode, surfaceCode, priority, sequenceNumber } = {}) => {
  if (!serviceId || !isTreatmentPlanPriority(priority)) {
    return { valid: false, message: 'Selecione um serviço e uma prioridade válidos.' };
  }
  if (!Number.isInteger(Number(sequenceNumber)) || Number(sequenceNumber) < 1 || Number(sequenceNumber) > 999) {
    return { valid: false, message: 'Informe uma sequência entre 1 e 999.' };
  }
  if (toothCode && !isOdontogramTooth(toothCode)) {
    return { valid: false, message: 'Selecione um dente permanente válido.' };
  }
  if (surfaceCode && (!toothCode || !isOdontogramSurface(surfaceCode))) {
    return { valid: false, message: 'A superfície exige um dente permanente e um código válido.' };
  }
  return { valid: true, message: '' };
};

export const validateTreatmentPlanCancellation = ({ itemId, reasonCode } = {}) => {
  if (!itemId || !isTreatmentPlanCancellationReason(reasonCode)) {
    return { valid: false, message: 'Selecione um motivo de cancelamento válido.' };
  }
  return { valid: true, message: '' };
};

const normalizeItem = (row) => ({
  id: row.item_id,
  planId: row.plan_id,
  serviceId: row.service_id,
  serviceName: row.service_name || 'Serviço indisponível',
  toothCode: row.tooth_code || null,
  surfaceCode: row.surface_code || null,
  odontogramReferencePresent: Boolean(row.odontogram_reference_present),
  sequenceNumber: Number(row.sequence_number),
  priority: row.priority_code,
  status: row.item_status,
  createdAt: row.item_created_at,
  authorDisplayName: row.author_display_name || 'Profissional da clínica',
  completedAt: row.item_completed_at || null,
  cancelledAt: row.item_cancelled_at || null,
  cancellationReasonCode: row.cancellation_reason_code || null,
  mutationResult: row.mutation_result || null,
});

export const buildTreatmentPlanReadModel = (rows = [], serviceRows = []) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  const plansById = new Map();

  for (const row of safeRows) {
    if (!row?.plan_id) continue;
    if (!plansById.has(row.plan_id)) {
      plansById.set(row.plan_id, {
        id: row.plan_id,
        status: row.plan_status,
        createdAt: row.plan_created_at,
        completedAt: row.plan_completed_at || null,
        cancelledAt: row.plan_cancelled_at || null,
        items: [],
      });
    }
    if (row.item_id) plansById.get(row.plan_id).items.push(normalizeItem(row));
  }

  const plans = [...plansById.values()].map((plan) => ({
    ...plan,
    items: plan.items.slice().sort((left, right) => left.sequenceNumber - right.sequenceNumber || left.createdAt.localeCompare(right.createdAt)),
  }));
  const activePlan = plans.find((plan) => plan.status === 'active') || null;
  const historicalPlans = plans.filter((plan) => plan.status !== 'active');
  const allItems = plans.flatMap((plan) => plan.items);
  const eligibleServices = (Array.isArray(serviceRows) ? serviceRows : [])
    .filter((service) => service?.service_id && service?.service_name)
    .map((service) => ({ id: service.service_id, name: service.service_name }));

  return {
    activePlan,
    historicalPlans,
    plans,
    plannedItems: activePlan?.items.filter((item) => item.status === 'planned') || [],
    completedItems: allItems.filter((item) => item.status === 'completed'),
    cancelledItems: allItems.filter((item) => item.status === 'cancelled'),
    eligibleServices,
  };
};

export const treatmentPlanErrorMessage = (error) => {
  const code = String(error?.code || error?.message || '');
  if (code.includes('SS_TREATMENT_PLAN_DUPLICATE_PLANNED')) return 'Este procedimento já está planejado com as mesmas referências.';
  if (code.includes('SS_TREATMENT_PLAN_SERVICE_INVALID')) return 'O serviço selecionado não está ativo ou elegível para o plano.';
  if (code.includes('SS_TREATMENT_PLAN_FINDING_INVALID') || code.includes('SS_TREATMENT_PLAN_FINDING_MISMATCH')) return 'A referência do odontograma não pertence a este paciente.';
  if (code.includes('SS_TREATMENT_PLAN_ITEM_ALREADY_TERMINAL')) return 'Este item já foi concluído ou cancelado e permanece no histórico.';
  if (code.includes('SS_TREATMENT_PLAN_REQUEST_ID_CONFLICT')) return 'Esta solicitação já foi usada em outra operação.';
  if (code.includes('SS_TREATMENT_PLAN_CONCURRENT_CONFLICT') || code === '23505') return 'A operação entrou em conflito com outra atualização. Atualize o plano e tente novamente.';
  if (code.includes('SS_TREATMENT_PLAN_INPUT_INVALID') || code === '22023') return 'Os dados estruturados do plano são inválidos.';
  if (code.includes('SS_TREATMENT_PLAN_ACCESS_DENIED') || code === '42501') return 'Seu perfil não possui acesso a este plano de tratamento.';
  return 'Não foi possível concluir a operação no plano de tratamento agora.';
};
