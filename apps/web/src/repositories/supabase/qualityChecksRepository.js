import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getQualityCheckRuns as getMockQualityCheckRuns,
  getQualityCheckSuites as getMockQualityCheckSuites,
  getQualityCheckSummary as getMockQualityCheckSummary,
  getQualityImpactPlans as getMockQualityImpactPlans,
} from '../mock/qualityChecksRepository.js';

const SUITE_STATUS_LABELS = {
  active: 'Ativa',
  inactive: 'Inativa',
};

const RUN_STATUS_LABELS = {
  queued: 'Fila',
  running: 'Rodando',
  success: 'Sucesso',
  warning: 'Atenção',
  failed: 'Falha',
  canceled: 'Cancelada',
};

const CRITICALITY_LABELS = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

const CATEGORY_LABELS = {
  'pre-deploy': 'Pré-deploy',
  'auth-permissoes': 'Auth e permissões',
  'master-control': 'Master Control',
  rotas: 'Rotas',
  supabase: 'Supabase',
  crm: 'CRM',
  agenda: 'Agenda',
  governanca: 'Governança',
  experiencia: 'Experiência',
  'minha-home': 'Minha Home',
  operacao: 'Operação',
  omnichannel: 'Omnichannel',
  conteudo: 'Conteúdo',
  seguranca: 'Segurança',
};

const IMPACT_LABELS = {
  'base-tecnica': 'Base técnica',
  'master-control': 'Master Control',
  'acesso-visual': 'Acesso visual',
  navegacao: 'Navegação',
  rls: 'RLS',
  pacientes: 'Pacientes',
  agenda: 'Agenda',
  auditoria: 'Auditoria',
  documentos: 'Documentos',
  producao: 'Produção',
  'github-actions': 'GitHub Actions',
  'runner-local': 'Runner local',
  'ambiente-e-secrets': 'Ambiente e secrets',
  catalogo: 'Catálogo',
  historico: 'Histórico',
  'historico-de-migrations': 'Histórico de migrations',
  documentacao: 'Documentação',
  experiencia: 'Experiência',
  frontend: 'Frontend',
  deploy: 'Deploy',
  'seo-publico': 'SEO público',
  'site-publico': 'Site público',
  'supabase-migrations': 'Supabase migrations',
  'seeds-e-verificacoes': 'Seeds e validações',
  'dados-sinteticos': 'Dados sintéticos',
  'seo-servicos': 'SEO e serviços',
  'indicador-visual': 'Indicador visual',
  'cobertura-de-modulos': 'Cobertura de módulos',
  'contratos-vitest': 'Contratos Vitest',
  repositories: 'Fronteira de dados',
  'evidencia-entrega': 'Evidência operacional',
  'evidencia-execucao': 'Evidência de execução',
  'status-qualidade': 'Status de qualidade',
  'higiene-worktree': 'Higiene do worktree',
  'frentes-paralelas': 'Coordenação de frentes',
  'isolamento-tenant': 'Multi-tenant',
  'prontidao-diagnosticos': 'Prontidão de diagnósticos',
  'validacao-final': 'Fechamento',
  'painel-diagnosticos': 'Painel de diagnósticos',
  'planejamento-impacto': 'Planejamento de impacto',
  'financeiro-clinica': 'Financeiro da Clinica',
  'auth-tenant-rls': 'Auth e permissões',
  'prontuario-odontograma': 'Prontuario e odontograma',
  'estoque-clinico': 'Estoque clinico',
  'scheduling-gateway': 'Agendamento multimodo',
  'scheduling-operational-center': 'Central operacional de agenda',
  'appointment-confirmations': 'Confirmações de consulta',
  'whatsapp-monthly-statements': 'Demonstrativos de WhatsApp',
};

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const formatDuration = (durationMs) => {
  if (!durationMs) return '-';
  return `${Math.round(durationMs / 1000)}s`;
};

const getLatestRunBySuite = (runs) => {
  return runs.reduce((acc, run) => {
    if (!run.suite_slug) return acc;
    if (!acc[run.suite_slug]) {
      acc[run.suite_slug] = run;
    }
    return acc;
  }, {});
};

const getAverageDurationBySuite = (runs) => {
  return runs.reduce((acc, run) => {
    if (!run.suite_slug || !run.duration_ms) return acc;

    const current = acc[run.suite_slug] || { total: 0, count: 0 };
    acc[run.suite_slug] = {
      total: current.total + run.duration_ms,
      count: current.count + 1,
    };

    return acc;
  }, {});
};

const mapRun = (run, suiteBySlug = {}) => ({
  id: run.id,
  suite_slug: run.suite_slug,
  suite_name: suiteBySlug[run.suite_slug]?.name || run.suite_slug,
  status: RUN_STATUS_LABELS[run.status] || run.status || 'Fila',
  environment: run.environment || 'local',
  source: run.source || 'local',
  requested_by: run.requested_by_label || run.requested_by || 'Sistema',
  branch: run.branch || '',
  git_sha: run.git_sha || '',
  started_at: run.started_at,
  finished_at: run.finished_at,
  duration_ms: run.duration_ms,
  summary: run.summary || run.error_message || 'Sem resumo.',
  github_run_url: run.github_run_url || null,
});

const mapSuite = (suite, runs) => {
  const latestRunBySuite = getLatestRunBySuite(runs);
  const averageDurationBySuite = getAverageDurationBySuite(runs);
  const latestRun = latestRunBySuite[suite.slug];
  const averageDuration = averageDurationBySuite[suite.slug];

  return {
    id: suite.id,
    slug: suite.slug,
    name: suite.name,
    description: suite.description || '',
    command: suite.command,
    category: CATEGORY_LABELS[suite.category] || suite.category || 'Geral',
    impact: IMPACT_LABELS[suite.impact] || suite.impact || 'Plataforma',
    criticality: CRITICALITY_LABELS[suite.criticality] || suite.criticality || 'Média',
    status: SUITE_STATUS_LABELS[suite.is_active ? 'active' : 'inactive'],
    last_status: latestRun ? RUN_STATUS_LABELS[latestRun.status] || latestRun.status : 'Sem execução',
    last_run_at: latestRun?.started_at || null,
    average_duration: averageDuration ? formatDuration(averageDuration.total / averageDuration.count) : '-',
    requires_production: Boolean(suite.requires_production),
    source: suite.source || 'local',
    sort_order: suite.sort_order || 100,
  };
};

const buildSummary = (suites, runs) => {
  const activeSuites = suites.filter((suite) => suite.status === 'Ativa');
  const failedRuns = runs.filter((run) => run.status === 'Falha');
  const attentionRuns = runs.filter((run) => run.status === 'Atenção');

  return {
    totalSuites: suites.length,
    activeSuites: activeSuites.length,
    latestStatus: runs[0]?.status || 'Sem execução',
    failedRuns: failedRuns.length,
    attentionRuns: attentionRuns.length,
    localSuites: suites.filter((suite) => !suite.requires_production).length,
  };
};

const getFallbackDashboard = () => ({
  suites: getMockQualityCheckSuites(),
  runs: getMockQualityCheckRuns(),
  summary: getMockQualityCheckSummary(),
  impactPlans: getMockQualityImpactPlans(),
});

export const fetchQualityChecksDashboard = async () => {
  if (!hasSupabase()) {
    return getFallbackDashboard();
  }

  const [suitesResponse, runsResponse] = await Promise.all([
    supabase
      .from('quality_check_suites')
      .select('id, slug, name, description, command, category, impact, criticality, source, is_active, requires_production, sort_order, created_at, updated_at')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    supabase
      .from('quality_check_runs')
      .select('id, suite_slug, status, environment, source, requested_by, requested_by_label, github_run_id, github_run_url, git_sha, branch, started_at, finished_at, duration_ms, summary, error_message, created_at')
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (suitesResponse.error || runsResponse.error) {
    return getFallbackDashboard();
  }

  const rawSuites = suitesResponse.data || [];
  const rawRuns = runsResponse.data || [];

  if (!rawSuites.length) {
    return getFallbackDashboard();
  }

  const suiteBySlug = rawSuites.reduce((acc, suite) => {
    acc[suite.slug] = suite;
    return acc;
  }, {});
  const runs = rawRuns.map((run) => mapRun(run, suiteBySlug));
  const suites = rawSuites.map((suite) => mapSuite(suite, rawRuns));

  return {
    suites,
    runs,
    summary: buildSummary(suites, runs),
    impactPlans: getMockQualityImpactPlans(),
  };
};

export const fetchQualityCheckSuites = async () => {
  return (await fetchQualityChecksDashboard()).suites;
};

export const fetchQualityCheckRuns = async () => {
  return (await fetchQualityChecksDashboard()).runs;
};

export const fetchQualityCheckSummary = async () => {
  return (await fetchQualityChecksDashboard()).summary;
};
