import {
  buildOdontogramReadModel,
  validateOdontogramFinding,
  validateOdontogramResolution,
} from '../odontogramContract.js';

const charts = new Map();
const creationRequests = new Map();
const resolutionRequests = new Map();
const now = () => new Date().toISOString();

const fail = (code, userMessage) => {
  const error = new Error(code);
  error.code = code;
  error.userMessage = userMessage;
  throw error;
};

const toRow = (chart, finding = null, mutationResult = null) => ({
  chart_id: chart.id,
  dentition_type: 'permanent',
  chart_status: 'active',
  finding_id: finding?.id || null,
  tooth_code: finding?.toothCode || null,
  surface_code: finding?.surfaceCode || null,
  finding_code: finding?.findingCode || null,
  lifecycle_status: finding?.lifecycleStatus || null,
  created_at: finding?.createdAt || null,
  author_display_name: finding?.authorDisplayName || null,
  resolved_at: finding?.resolvedAt || null,
  resolver_display_name: finding?.resolverDisplayName || null,
  resolution_reason_code: finding?.resolutionReasonCode || null,
  mutation_result: mutationResult,
});

export const getMockPatientOdontogram = async ({ tenantId, patientId, canRead = true }) => {
  if (!canRead) fail('SS_ODONTOGRAM_ACCESS_DENIED', 'Seu perfil não possui acesso a esta operação no odontograma.');
  const chart = charts.get(`${tenantId}:${patientId}`);
  return buildOdontogramReadModel(chart ? (chart.findings.length ? chart.findings.map((finding) => toRow(chart, finding)) : [toRow(chart)]) : []);
};

export const appendMockOdontogramFinding = async ({ tenantId, patientId, requestId, toothCode, surfaceCode, findingCode, canManage = true }) => {
  if (!canManage) fail('SS_ODONTOGRAM_ACCESS_DENIED', 'Seu perfil não possui acesso a esta operação no odontograma.');
  const validation = validateOdontogramFinding({ toothCode, surfaceCode, findingCode });
  if (!validation.valid) fail('SS_ODONTOGRAM_INPUT_INVALID', validation.message);
  const requestKey = `${tenantId}:${requestId}`;
  const replay = creationRequests.get(requestKey);
  if (replay) {
    if (replay.patientId !== patientId || replay.toothCode !== toothCode || replay.surfaceCode !== surfaceCode || replay.findingCode !== findingCode) {
      fail('SS_ODONTOGRAM_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
    }
    const replayChart = charts.get(replay.chartKey);
    return toRow(replayChart, replayChart.findings.find((finding) => finding.id === replay.findingId), 'idempotent');
  }

  const chartKey = `${tenantId}:${patientId}`;
  const chart = charts.get(chartKey) || { id: crypto.randomUUID(), patientId, findings: [] };
  if (chart.findings.some((finding) => finding.lifecycleStatus === 'active' && finding.toothCode === toothCode && finding.surfaceCode === surfaceCode && finding.findingCode === findingCode)) {
    fail('SS_ODONTOGRAM_DUPLICATE_ACTIVE', 'Este achado já está ativo para o dente e a superfície selecionados.');
  }
  const finding = {
    id: crypto.randomUUID(), toothCode, surfaceCode, findingCode,
    lifecycleStatus: 'active', createdAt: now(), authorDisplayName: 'Dentista demo',
    resolvedAt: null, resolverDisplayName: null, resolutionReasonCode: null,
  };
  chart.findings.push(finding);
  charts.set(chartKey, chart);
  creationRequests.set(requestKey, { chartKey, findingId: finding.id, patientId, toothCode, surfaceCode, findingCode });
  return toRow(chart, finding, 'changed');
};

export const resolveMockOdontogramFinding = async ({ tenantId, findingId, requestId, reasonCode, canManage = true }) => {
  if (!canManage) fail('SS_ODONTOGRAM_ACCESS_DENIED', 'Seu perfil não possui acesso a esta operação no odontograma.');
  const validation = validateOdontogramResolution({ findingId, reasonCode });
  if (!validation.valid) fail('SS_ODONTOGRAM_INPUT_INVALID', validation.message);
  const requestKey = `${tenantId}:${requestId}`;
  const replay = resolutionRequests.get(requestKey);
  if (replay) {
    if (replay.findingId !== findingId || replay.reasonCode !== reasonCode) fail('SS_ODONTOGRAM_REQUEST_ID_CONFLICT', 'Esta solicitação já foi usada em outra operação.');
    const replayChart = charts.get(replay.chartKey);
    return toRow(replayChart, replayChart.findings.find((finding) => finding.id === findingId), 'idempotent');
  }
  const chartEntry = [...charts.entries()].find(([key, chart]) => key.startsWith(`${tenantId}:`) && chart.findings.some((finding) => finding.id === findingId));
  if (!chartEntry) fail('SS_ODONTOGRAM_ACCESS_DENIED', 'Seu perfil não possui acesso a esta operação no odontograma.');
  const [chartKey, chart] = chartEntry;
  const finding = chart.findings.find((item) => item.id === findingId);
  if (finding.lifecycleStatus !== 'active') fail('SS_ODONTOGRAM_ALREADY_RESOLVED', 'Este achado já foi resolvido e permanece preservado no histórico.');
  finding.lifecycleStatus = 'resolved';
  finding.resolvedAt = now();
  finding.resolverDisplayName = 'Dentista demo';
  finding.resolutionReasonCode = reasonCode;
  resolutionRequests.set(requestKey, { chartKey, findingId, reasonCode });
  return toRow(chart, finding, 'changed');
};

export const resetMockOdontogram = () => {
  charts.clear();
  creationRequests.clear();
  resolutionRequests.clear();
};
