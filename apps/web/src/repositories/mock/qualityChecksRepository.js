import {
  qualityCheckRuns,
  qualityCheckSuites,
  qualityImpactPlans,
} from '@/data/mockQualityChecks.js';

const bySortOrder = (a, b) => a.sort_order - b.sort_order;
const byMostRecent = (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime();

export const getQualityCheckSuites = () => {
  return [...qualityCheckSuites].sort(bySortOrder);
};

export const getQualityCheckRuns = ({ suiteSlug, status } = {}) => {
  return qualityCheckRuns
    .filter((run) => !suiteSlug || run.suite_slug === suiteSlug)
    .filter((run) => !status || run.status === status)
    .sort(byMostRecent);
};

export const getQualityImpactPlans = () => {
  return [...qualityImpactPlans];
};

export const getQualityCheckSummary = () => {
  const suites = getQualityCheckSuites();
  const runs = getQualityCheckRuns();
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
