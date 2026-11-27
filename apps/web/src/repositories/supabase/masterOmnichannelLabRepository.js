import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  createMockMasterOmnichannelScenario,
  createMockMasterOmnichannelScenarioVersion,
  getMockMasterOmnichannelLabOverview,
  listMockMasterOmnichannelLearningCases,
  listMockMasterOmnichannelRuns,
  listMockMasterOmnichannelScenarios,
  promoteMockMasterOmnichannelLearningCase,
  refreshMockMasterOmnichannelLearningCases,
  reviewMockMasterOmnichannelLearningCase,
  runMockMasterOmnichannelSimulator,
  updateMockMasterOmnichannelScenarioStatus,
} from '../mock/masterOmnichannelLabRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const ERROR_MESSAGES = {
  lab_mode_invalid: 'O modo de execução selecionado é inválido.',
  lab_no_active_scenarios: 'Não há cenários ativos para executar.',
  learning_case_must_be_accepted: 'Aceite o caso antes de transformá-lo em cenário sintético.',
  learning_case_not_found: 'O caso de aprendizado não foi localizado.',
  platform_access_required: 'Este laboratório é exclusivo para usuários Master.',
  platform_admin_write_required: 'Apenas Admin Master pode alterar ou executar esta suíte.',
  provider_lab_confirmation_required: 'Confirme explicitamente o laboratório sintético com IA real.',
  provider_lab_not_ready: 'A IA real ainda não está pronta para o laboratório sintético deste tenant.',
  scenario_key_already_exists: 'Já existe um cenário com esta chave.',
  scenario_active_version_conflict: 'Arquive a versão ativa antes de ativar outra versão deste cenário.',
  scenario_not_found: 'O cenário não foi localizado.',
  tenant_not_found: 'O tenant selecionado não foi localizado.',
};

const buildRepositoryError = (code, fallback) => {
  const error = new Error(ERROR_MESSAGES[code] || fallback || 'Não foi possível concluir a operação Omnichannel.');
  error.code = code || 'omnichannel_master_lab_failed';
  return error;
};

const invokeMasterLab = async (body) => {
  if (!hasSupabase()) throw buildRepositoryError('supabase_not_configured', 'Supabase não está configurado neste ambiente.');
  const { data, error } = await supabase.functions.invoke('omnichannel-master-lab', { body });
  if (error) throw buildRepositoryError(error.code, error.message);
  if (data?.error?.code) throw buildRepositoryError(data.error.code);
  return data || {};
};

const tenantPayload = (payload = {}) => ({
  tenant_id: payload.tenantId || undefined,
  tenant_slug: payload.tenantSlug || undefined,
});

const normalizeTenant = (tenant = {}) => ({
  id: tenant.id || '',
  name: tenant.name || tenant.slug || 'Tenant',
  plan: tenant.plan || '',
  slug: tenant.slug || tenant.id || '',
  status: tenant.status || 'unknown',
});

const normalizeOverview = (payload = {}) => ({
  baseline: payload.baseline || { passRate: 0, scenarios: 0, status: 'pending', turns: 0, version: '' },
  canWrite: Boolean(payload.can_write ?? payload.canWrite),
  counts: {
    activeScenarios: Number(payload.counts?.activeScenarios || 0),
    cases: Number(payload.counts?.cases || 0),
    casesByStatus: payload.counts?.casesByStatus || {},
    runs: Number(payload.counts?.runs || 0),
    scenarios: Number(payload.counts?.scenarios || 0),
  },
  gate: payload.gate || { ready: false, state: 'pending' },
  latestRun: payload.latest_run || payload.latestRun || null,
  roleCodes: payload.role_codes || payload.roleCodes || [],
  source: payload.source || 'Supabase',
  tenant: normalizeTenant(payload.tenant),
  tenants: (payload.tenants || []).map(normalizeTenant),
});

const normalizeCase = (item = {}) => ({
  caseCode: item.caseCode || 'CASE-PENDENTE',
  caseId: item.caseId || '',
  classification: item.classification || 'inconclusive_learning_case',
  expectedBehavior: item.expectedBehavior || 'human_review_before_conclusion',
  observedResult: item.observedResult || 'inconclusive_result',
  promotedScenarioKey: item.promotedScenarioKey || '',
  reviewReason: item.reviewReason || 'not_reviewed',
  severity: item.severity || 'medium',
  simulatorTarget: item.simulatorTarget || 'inconclusive_evidence_regression',
  sourceOccurredAt: item.sourceOccurredAt || null,
  status: item.status || 'new',
});

const normalizeScenario = (item = {}) => ({
  assertions: item.assertions || {},
  category: item.category || 'support',
  scenarioId: item.scenarioId || '',
  scenarioKey: item.scenarioKey || 'unknown',
  source: item.source || 'curated',
  status: item.status || 'draft',
  title: item.title || 'Cenário sintético',
  turnCount: Number(item.turnCount || 0),
  turns: Array.isArray(item.turns) ? item.turns : [],
  updatedAt: item.updatedAt || null,
  version: Number(item.version || 1),
});

const normalizeRun = (item = {}) => ({
  failureCount: Number(item.failureCount || 0),
  finishedAt: item.finishedAt || null,
  mode: item.mode || 'local_readonly',
  model: item.model || 'local-rule-based',
  passRate: Number(item.passRate || 0),
  provider: item.provider || 'off',
  resultSummary: item.resultSummary || {},
  runCode: item.runCode || 'RUN-PENDENTE',
  safetySummary: item.safetySummary || {},
  scenarioCount: Number(item.scenarioCount || 0),
  startedAt: item.startedAt || null,
  status: item.status || 'failed',
  turnCount: Number(item.turnCount || 0),
});

export const getMasterOmnichannelLabOverview = async (payload = {}) => {
  if (!hasSupabase()) return getMockMasterOmnichannelLabOverview(payload);
  try {
    return normalizeOverview(await invokeMasterLab({ action: 'get_suite_overview', ...tenantPayload(payload) }));
  } catch (error) {
    if (error.code === 'platform_access_required') throw error;
    const fallback = await getMockMasterOmnichannelLabOverview(payload);
    return { ...fallback, source: 'Fallback demo' };
  }
};

export const listMasterOmnichannelLearningCases = async (payload = {}) => {
  if (!hasSupabase()) return listMockMasterOmnichannelLearningCases(payload);
  try {
    const data = await invokeMasterLab({ action: 'list_learning_cases', ...tenantPayload(payload) });
    return (data.cases || []).map(normalizeCase);
  } catch (error) {
    if (error.code === 'platform_access_required') throw error;
    return listMockMasterOmnichannelLearningCases(payload);
  }
};

export const listMasterOmnichannelScenarios = async () => {
  if (!hasSupabase()) return listMockMasterOmnichannelScenarios();
  try {
    const data = await invokeMasterLab({ action: 'list_scenarios' });
    return (data.scenarios || []).map(normalizeScenario);
  } catch (error) {
    if (error.code === 'platform_access_required') throw error;
    return listMockMasterOmnichannelScenarios();
  }
};

export const listMasterOmnichannelRuns = async (payload = {}) => {
  if (!hasSupabase()) return listMockMasterOmnichannelRuns(payload);
  try {
    const data = await invokeMasterLab({ action: 'list_simulator_runs', ...tenantPayload(payload) });
    return (data.runs || []).map(normalizeRun);
  } catch (error) {
    if (error.code === 'platform_access_required') throw error;
    return listMockMasterOmnichannelRuns(payload);
  }
};

export const refreshMasterOmnichannelLearningCases = async (payload = {}) => {
  if (!hasSupabase()) return refreshMockMasterOmnichannelLearningCases(payload);
  const data = await invokeMasterLab({ action: 'refresh_learning_cases', ...tenantPayload(payload) });
  return { cases: (data.cases || []).map(normalizeCase), importedCount: Number(data.imported_count || 0) };
};

export const reviewMasterOmnichannelLearningCase = async (payload = {}) => {
  if (!hasSupabase()) return reviewMockMasterOmnichannelLearningCase(payload);
  const data = await invokeMasterLab({
    action: 'review_learning_case',
    case_id: payload.caseId,
    review_reason: payload.reviewReason,
    status: payload.status,
    ...tenantPayload(payload),
  });
  return normalizeCase(data.case);
};

export const promoteMasterOmnichannelLearningCase = async (payload = {}) => {
  if (!hasSupabase()) return promoteMockMasterOmnichannelLearningCase(payload);
  const data = await invokeMasterLab({
    action: 'promote_learning_case',
    case_id: payload.caseId,
    ...tenantPayload(payload),
  });
  return normalizeScenario(data.scenario);
};

export const createMasterOmnichannelScenario = async (payload = {}) => {
  if (!hasSupabase()) return createMockMasterOmnichannelScenario(payload);
  const data = await invokeMasterLab({ action: 'create_scenario', scenario: payload.scenario });
  return normalizeScenario(data.scenario);
};

export const createMasterOmnichannelScenarioVersion = async (payload = {}) => {
  if (!hasSupabase()) return createMockMasterOmnichannelScenarioVersion(payload);
  const data = await invokeMasterLab({
    action: 'create_scenario_version',
    scenario: payload.scenario,
    scenario_id: payload.scenarioId,
  });
  return normalizeScenario(data.scenario);
};

export const updateMasterOmnichannelScenarioStatus = async (payload = {}) => {
  if (!hasSupabase()) return updateMockMasterOmnichannelScenarioStatus(payload);
  const data = await invokeMasterLab({
    action: 'update_scenario_status',
    scenario_id: payload.scenarioId,
    status: payload.status,
  });
  return normalizeScenario(data.scenario);
};

export const runMasterOmnichannelSimulator = async (payload = {}) => {
  if (!hasSupabase()) return runMockMasterOmnichannelSimulator(payload);
  const data = await invokeMasterLab({
    action: 'run_simulator',
    confirmation: payload.confirmation || undefined,
    mode: payload.mode,
    scenario_ids: payload.scenarioIds || [],
    ...tenantPayload(payload),
  });
  return normalizeRun(data.run);
};

export const masterOmnichannelLabRepository = {
  createMasterOmnichannelScenario,
  createMasterOmnichannelScenarioVersion,
  getMasterOmnichannelLabOverview,
  listMasterOmnichannelLearningCases,
  listMasterOmnichannelRuns,
  listMasterOmnichannelScenarios,
  promoteMasterOmnichannelLearningCase,
  refreshMasterOmnichannelLearningCases,
  reviewMasterOmnichannelLearningCase,
  runMasterOmnichannelSimulator,
  updateMasterOmnichannelScenarioStatus,
};
