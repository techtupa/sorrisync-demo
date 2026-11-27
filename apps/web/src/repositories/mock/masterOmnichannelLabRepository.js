const TENANTS = [
  {
    id: 'tenant_aurora',
    name: 'Clínica Demo Avery Chen',
    plan: 'premium',
    slug: 'tenant_aurora',
    status: 'active',
  },
];

const SCENARIOS = [
  {
    assertions: { contextMemory: true, criticalSafety: true, noSilence: true },
    category: 'opening',
    scenarioId: 'scenario-demo-opening',
    scenarioKey: 'master_opening_identity_context',
    source: 'baseline_seed',
    status: 'active',
    title: 'Abertura preserva nome já informado',
    turnCount: 1,
    turns: [],
    updatedAt: '2026-07-17T12:00:00.000Z',
    version: 1,
  },
  {
    assertions: { contextMemory: true, criticalSafety: true, noSilence: true },
    category: 'scheduling',
    scenarioId: 'scenario-demo-scheduling',
    scenarioKey: 'master_scheduling_first_visit',
    source: 'baseline_seed',
    status: 'active',
    title: 'Agendamento preserva primeira avaliação',
    turnCount: 2,
    turns: [],
    updatedAt: '2026-07-17T12:00:00.000Z',
    version: 1,
  },
  {
    assertions: { criticalSafety: true, humanHandoff: true, noSilence: true },
    category: 'urgency',
    scenarioId: 'scenario-demo-urgency',
    scenarioKey: 'master_urgency_safe_handoff',
    source: 'baseline_seed',
    status: 'active',
    title: 'Urgência direciona para revisão humana',
    turnCount: 1,
    turns: [],
    updatedAt: '2026-07-17T12:00:00.000Z',
    version: 1,
  },
];

const RUNS = [
  {
    failureCount: 0,
    finishedAt: '2026-07-17T12:00:00.000Z',
    mode: 'local_readonly',
    model: 'local-rule-based',
    passRate: 100,
    provider: 'mock',
    resultSummary: {},
    runCode: 'RUN-DEMO-LOCAL',
    safetySummary: {
      providerExternalCalls: 0,
      realPatientData: false,
      sensitiveValuesExported: false,
      supabaseClinicalWrites: 0,
      whatsappSendMessageCalls: 0,
    },
    scenarioCount: 40,
    startedAt: '2026-07-17T11:59:00.000Z',
    status: 'go',
    turnCount: 63,
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

const readOnlyError = () => {
  const error = new Error('Esta ação exige Supabase autenticado e Admin Master.');
  error.code = 'master_lab_write_requires_supabase';
  throw error;
};

export const getMockMasterOmnichannelLabOverview = async () => ({
  baseline: {
    passRate: 100,
    scenarios: 40,
    status: 'go',
    turns: 63,
    version: 'r5_13_broad_local_readonly_pilot_simulator',
  },
  canWrite: false,
  counts: {
    activeScenarios: SCENARIOS.length,
    cases: 0,
    casesByStatus: {},
    runs: RUNS.length,
    scenarios: SCENARIOS.length,
  },
  gate: { ready: false, state: 'pending' },
  latestRun: clone(RUNS[0]),
  roleCodes: [],
  source: 'Fallback demo',
  tenant: clone(TENANTS[0]),
  tenants: clone(TENANTS),
});

export const listMockMasterOmnichannelLearningCases = async () => [];
export const listMockMasterOmnichannelScenarios = async () => clone(SCENARIOS);
export const listMockMasterOmnichannelRuns = async () => clone(RUNS);

export const createMockMasterOmnichannelScenario = readOnlyError;
export const createMockMasterOmnichannelScenarioVersion = readOnlyError;
export const promoteMockMasterOmnichannelLearningCase = readOnlyError;
export const refreshMockMasterOmnichannelLearningCases = readOnlyError;
export const reviewMockMasterOmnichannelLearningCase = readOnlyError;
export const runMockMasterOmnichannelSimulator = readOnlyError;
export const updateMockMasterOmnichannelScenarioStatus = readOnlyError;
