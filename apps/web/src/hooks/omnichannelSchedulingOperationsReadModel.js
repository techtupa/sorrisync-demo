const SCHEDULING_ACTIVITY_TYPES = new Set([
  'scheduling_completed',
  'scheduling_exception',
  'scheduling_progress',
]);

const SCHEDULING_COMPLETED_OUTCOMES = new Set([
  'scheduling_booking_completed',
  'scheduling_cancelled',
  'scheduling_declined',
  'scheduling_presence_confirmed',
  'scheduling_rescheduled',
  'scheduling_status_checked',
]);

const SCHEDULING_WAITING_OUTCOMES = new Set([
  'scheduling_collecting',
  'scheduling_confirmation_pending',
  'scheduling_offered',
  'scheduling_retry_required',
]);

const PROCESSING_STALE_AFTER_MS = 15 * 60 * 1000;

const statusByOutcome = {
  scheduling_booking_completed: {
    description: 'A nova consulta foi concluída pelo fluxo server-side.',
    label: 'Consulta agendada',
    nextManualAction: 'Consultar o histórico quando necessário',
    tone: 'success',
  },
  scheduling_cancelled: {
    description: 'O cancelamento foi concluído após confirmação explícita.',
    label: 'Consulta cancelada',
    nextManualAction: 'Consultar o histórico quando necessário',
    tone: 'success',
  },
  scheduling_collecting: {
    description: 'O contato ainda está informando serviço, dia, período ou profissional.',
    label: 'Coletando preferências',
    nextManualAction: 'Aguardar a próxima resposta do contato',
    tone: 'info',
  },
  scheduling_confirmation_pending: {
    description: 'Nenhuma alteração será feita antes da confirmação explícita do contato.',
    label: 'Aguardando confirmação',
    nextManualAction: 'Aguardar a confirmação explícita do contato',
    tone: 'warning',
  },
  scheduling_declined: {
    description: 'O contato recusou a alteração e a consulta atual foi preservada.',
    label: 'Alteração recusada',
    nextManualAction: 'Consultar o histórico quando necessário',
    tone: 'neutral',
  },
  scheduling_handoff: {
    description: 'O fluxo automático foi interrompido com segurança e precisa de revisão humana.',
    label: 'Revisão humana necessária',
    nextManualAction: 'Assumir a conversa e revisar a Agenda',
    tone: 'danger',
  },
  scheduling_offered: {
    description: 'Opções server-side foram apresentadas e o contato ainda precisa escolher.',
    label: 'Aguardando escolha',
    nextManualAction: 'Aguardar a escolha do contato',
    tone: 'info',
  },
  scheduling_presence_confirmed: {
    description: 'A presença foi confirmada pelo fluxo server-side.',
    label: 'Presença confirmada',
    nextManualAction: 'Consultar o histórico quando necessário',
    tone: 'success',
  },
  scheduling_processing: {
    description: 'A operação foi aceita e aguarda conclusão server-side.',
    label: 'Processando na Agenda',
    nextManualAction: 'Aguardar a conclusão server-side',
    tone: 'info',
  },
  scheduling_rescheduled: {
    description: 'A remarcação foi concluída e verificada pelo servidor.',
    label: 'Consulta remarcada',
    nextManualAction: 'Consultar o histórico quando necessário',
    tone: 'success',
  },
  scheduling_retry_required: {
    description: 'A consulta atual foi preservada e uma nova preferência foi solicitada.',
    label: 'Nova opção solicitada',
    nextManualAction: 'Aguardar uma nova preferência do contato',
    tone: 'warning',
  },
  scheduling_status_checked: {
    description: 'O status da consulta foi consultado com retorno server-side verificado.',
    label: 'Status consultado',
    nextManualAction: 'Consultar o histórico quando necessário',
    tone: 'success',
  },
};

const emptySchedulingModel = Object.freeze({
  activityCount: 0,
  description: 'Nenhum fluxo de Agenda registrado nesta conversa.',
  hasSchedulingFlow: false,
  history: [],
  isActive: false,
  isCompleted: false,
  isProcessingStalled: false,
  isWaitingPatient: false,
  label: 'Sem fluxo de Agenda',
  latestAt: null,
  nextManualAction: 'Acompanhar a conversa',
  outcome: '',
  requiresHuman: false,
  settingsHref: '/configuracoes?tab=confirmacoes',
  statusKey: 'none',
  tone: 'neutral',
});

const safeToken = (value) => String(value || '')
  .replace(/[^a-z0-9._-]/gi, '')
  .slice(0, 80);

const safeText = (value, fallback = '', maximumLength = 240) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return (text || fallback).slice(0, maximumLength);
};

const getActivityTimestamp = (activity) => {
  const value = activity?.createdAt || activity?.created_at || activity?.updatedAt || activity?.updated_at;
  const timestamp = Date.parse(String(value || ''));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeActivity = (activity) => ({
  activityType: safeToken(activity?.activityType || activity?.activity_type),
  createdAt: activity?.createdAt || activity?.created_at || null,
  noteText: safeText(activity?.noteText || activity?.note_text),
  outcome: safeToken(activity?.outcome),
});

const buildHistoryItem = (activity) => {
  const status = statusByOutcome[activity.outcome] || {
    label: 'Marco da Agenda',
    tone: 'neutral',
  };

  return {
    createdAt: activity.createdAt,
    label: status.label,
    noteText: activity.noteText || 'Marco operacional sanitizado registrado pelo servidor.',
    outcome: activity.outcome,
    tone: status.tone,
  };
};

export const buildOmnichannelSchedulingOperationsModel = (
  activities = [],
  { now = new Date() } = {},
) => {
  const schedulingActivities = (Array.isArray(activities) ? activities : [])
    .map(normalizeActivity)
    .filter((activity) => SCHEDULING_ACTIVITY_TYPES.has(activity.activityType))
    .sort((first, second) => getActivityTimestamp(second) - getActivityTimestamp(first));

  if (!schedulingActivities.length) return { ...emptySchedulingModel };

  const latest = schedulingActivities[0];
  const latestTimestamp = getActivityTimestamp(latest);
  const nowTimestamp = now instanceof Date ? now.getTime() : Date.parse(String(now || ''));
  const isProcessingStalled = latest.outcome === 'scheduling_processing'
    && Number.isFinite(nowTimestamp)
    && latestTimestamp > 0
    && nowTimestamp - latestTimestamp >= PROCESSING_STALE_AFTER_MS;
  const status = isProcessingStalled
    ? {
        description: 'A operação está sem conclusão há mais de 15 minutos e precisa de revisão humana.',
        label: 'Processamento sem conclusão',
        nextManualAction: 'Assumir a conversa e verificar a Agenda',
        tone: 'danger',
      }
    : statusByOutcome[latest.outcome] || {
        description: latest.noteText || 'Marco operacional sanitizado registrado pelo servidor.',
        label: 'Fluxo de Agenda',
        nextManualAction: 'Revisar o histórico da conversa',
        tone: 'neutral',
      };
  const isCompleted = SCHEDULING_COMPLETED_OUTCOMES.has(latest.outcome);
  const requiresHuman = latest.outcome === 'scheduling_handoff' || isProcessingStalled;

  return {
    activityCount: schedulingActivities.length,
    description: status.description,
    hasSchedulingFlow: true,
    history: schedulingActivities.slice(0, 8).map(buildHistoryItem),
    isActive: !isCompleted,
    isCompleted,
    isProcessingStalled,
    isWaitingPatient: SCHEDULING_WAITING_OUTCOMES.has(latest.outcome),
    label: status.label,
    latestAt: latest.createdAt,
    nextManualAction: status.nextManualAction,
    outcome: latest.outcome,
    requiresHuman,
    settingsHref: emptySchedulingModel.settingsHref,
    statusKey: isProcessingStalled ? 'processing_stalled' : latest.outcome,
    tone: status.tone,
  };
};

export const isOmnichannelSchedulingActivity = (activity) => (
  SCHEDULING_ACTIVITY_TYPES.has(safeToken(activity?.activityType || activity?.activity_type))
);
