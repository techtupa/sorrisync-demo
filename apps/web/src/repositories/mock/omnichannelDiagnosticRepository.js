import {
  buildOmnichannelDiagnosticPayload,
  normalizeOmnichannelDiagnostic,
} from '../omnichannelDiagnosticContract.js';

const MOCK_DIAGNOSTIC_ID = 'mock-front-r6-omnichannel-diagnostic';

const createMockRow = (tenantId) => ({
  id: MOCK_DIAGNOSTIC_ID,
  tenant_id: tenantId,
  clinic_name: 'Clínica piloto demo',
  responsible_name: 'Responsável demo',
  responsible_role: 'Gestão da clínica',
  contact_phone: '',
  contact_email: '',
  city: 'São Paulo demo',
  state: 'SP',
  professionals_count: 5,
  attendants_count: 2,
  has_crc: true,
  whatsapp_numbers_count: 2,
  whatsapp_usage: {
    purposes: ['recepcao', 'agenda', 'crc'],
    accessType: 'shared_number',
    multipleUsersSameNumber: true,
    sharedPhysicalPhone: false,
    historyLossRisk: true,
    excludedNumberExists: false,
  },
  team_structure: {
    respondersCount: 2,
    hasReceptionCrcHandoff: true,
    hasSeparatedReceptionCommercial: false,
  },
  attendance_responsibilities: {
    leads: 'recepcao',
    activePatients: 'recepcao',
    scheduling: 'recepcao',
    confirmations: 'recepcao',
    rescheduling: 'recepcao',
    reactivation: 'gestao',
    budgetFollowUp: 'crc',
    sensitiveIssues: 'gestao',
  },
  current_channels: {
    channels: ['whatsapp', 'instagram'],
    notes: 'Fallback demo sem canal real conectado.',
  },
  future_channels: {
    channels: ['whatsapp'],
    notes: 'Primeira decisão do piloto fica limitada ao WhatsApp.',
  },
  message_volume: {
    dailyRange: '51_100',
    peakPeriods: ['manha', 'fim_de_tarde'],
    manualBacklog: 'Moderado',
    afterHoursRoutine: 'Sem rotina padronizada no demo.',
  },
  operational_pains: {
    items: ['sem_priorizacao', 'perda_de_historico', 'demora_na_resposta'],
    severity: 'alta',
  },
  desired_metrics: {
    items: ['tempo_primeira_resposta', 'conversas_sem_responsavel', 'agendamentos_originados'],
    primaryMetric: 'tempo_primeira_resposta',
  },
  current_flow_description: 'Fluxo demo: recepção centraliza contatos e repassa casos comerciais para gestão.',
  main_pain_description: 'Maior dor demo: priorização manual baixa e pouca visibilidade de responsável.',
  pilot_success_description: 'Piloto bem sucedido quando a equipe visualizar prioridades e responsáveis sem ativar automação.',
  first_channels_description: 'Iniciar por WhatsApp de recepção e agenda.',
  excluded_channels_description: 'Excluir canais externos, mídia e automações nesta etapa.',
  important_rules_description: 'Atendimento humano revisa toda mensagem antes de qualquer resposta.',
  privacy_notes: 'Coleta apenas institucional e operacional, sem nomes de pacientes ou histórico real.',
  mvp_priority: 'organizar_atendimento',
  success_criteria: 'reduzir_conversas_sem_responsavel',
  status: 'draft',
  submitted_at: null,
  reviewed_at: null,
  created_at: '2026-06-15T09:00:00.000Z',
  updated_at: '2026-06-15T09:00:00.000Z',
  source: 'mock',
});

const rowsByTenant = new Map();

const cloneRow = (row) => JSON.parse(JSON.stringify(row));

const getRowForTenant = (tenantId) => {
  if (!rowsByTenant.has(tenantId)) {
    rowsByTenant.set(tenantId, createMockRow(tenantId));
  }

  return rowsByTenant.get(tenantId);
};

const createId = () => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `mock-diagnostic-${Date.now()}`
);

const saveRow = (tenantId, form, status) => {
  const currentRow = getRowForTenant(tenantId);
  const payload = buildOmnichannelDiagnosticPayload(form, { status });
  const now = new Date().toISOString();
  const nextRow = {
    ...currentRow,
    ...payload,
    id: form.id || currentRow.id || createId(),
    tenant_id: tenantId,
    submitted_at: status === 'submitted' ? now : currentRow.submitted_at,
    updated_at: now,
    source: 'mock',
  };

  rowsByTenant.set(tenantId, nextRow);
  return normalizeOmnichannelDiagnostic(cloneRow(nextRow));
};

export const fetchOmnichannelPilotDiagnosticByTenant = async (tenantId) => {
  return normalizeOmnichannelDiagnostic(cloneRow(getRowForTenant(tenantId)));
};

export const saveOmnichannelPilotDiagnosticByTenant = async (tenantId, form) => {
  return saveRow(tenantId, form, 'draft');
};

export const submitOmnichannelPilotDiagnosticByTenant = async (tenantId, form) => {
  return saveRow(tenantId, form, 'submitted');
};
