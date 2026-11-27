
export const TENANTS = [
  {
    id: 'tenant_aurora',
    name: 'Dr. Avery Chen',
    plan: 'Premium',
    status: 'Ativa',
    domain: 'aurora-dental.example.invalid',
    subdomain: 'aurorasorrisync.example.invalid',
    userCount: 5,
    activeModules: 8,
    mrr: 697,
    createdAt: '2025-01-15'
  },
  {
    id: 'tenant_harbor',
    name: 'Sorriso Jardim',
    plan: 'Profissional',
    status: 'Ativa',
    domain: 'sorrisojardim.com.br',
    subdomain: 'sorrisojardim.sorrisync.example.invalid',
    userCount: 3,
    activeModules: 5,
    mrr: 397,
    createdAt: '2025-03-10'
  },
  {
    id: 'tenant_odonto_prime',
    name: 'Odonto Prime',
    plan: 'Essencial',
    status: 'Trial',
    domain: '',
    subdomain: 'odontoprime.sorrisync.example.invalid',
    userCount: 1,
    activeModules: 3,
    mrr: 197,
    createdAt: '2026-05-25'
  }
];

export const SAAS_PLANS = [
  {
    name: 'Essencial',
    price: 197,
    users: 1,
    professionals: 1,
    domainSupport: false,
    features: ['CRM Básico', 'Agenda Simples', 'Financeiro Básico', 'Subdomínio SorriSync']
  },
  {
    name: 'Profissional',
    price: 397,
    users: 3,
    professionals: 3,
    domainSupport: true,
    features: ['Tudo do Essencial', 'Domínio Próprio', 'WhatsApp Básico', 'Relatórios Avançados']
  },
  {
    name: 'Premium',
    price: 697,
    users: 10,
    professionals: 5,
    domainSupport: true,
    features: ['Tudo do Profissional', 'WhatsApp Bot', 'Integração Instagram', 'NFS-e Automática', 'Prontuário Digital']
  },
  {
    name: 'Enterprise',
    price: 'Sob consulta',
    users: 'Ilimitado',
    professionals: 'Ilimitado',
    domainSupport: true,
    features: ['Tudo do Premium', 'Múltiplas Unidades', 'API Aberta', 'Gerente de Sucesso']
  }
];

export const MODULES = [
  { id: 'mod_landing', name: 'Landing Page', phase: 'MVP', description: 'Página pública de captação de pacientes.' },
  { id: 'mod_crm', name: 'CRM de Pacientes', phase: 'MVP', description: 'Gestão de leads e histórico de pacientes.' },
  { id: 'mod_agenda', name: 'Agenda Inteligente', phase: 'MVP', description: 'Agendamento visual e controle de profissionais.' },
  { id: 'mod_financeiro', name: 'Financeiro Pro', phase: 'MVP', description: 'Controle de receitas, despesas e fluxo de caixa.' },
  { id: 'mod_usuarios', name: 'Gestão de Usuários', phase: 'MVP', description: 'Controle de acesso e permissões da equipe.' },
  { id: 'mod_assinatura', name: 'Assinatura SaaS', phase: 'MVP', description: 'Gestão da assinatura do SorriSync.' },
  { id: 'mod_instagram', name: 'Integração Instagram', phase: 'Próxima Fase', description: 'Sincronização de mensagens do Direct.' },
  { id: 'mod_gcal', name: 'Google Calendar', phase: 'Próxima Fase', description: 'Sincronização bidirecional de agenda.' },
  { id: 'mod_whatsapp', name: 'Bot WhatsApp', phase: 'Próxima Fase', description: 'Atendimento automatizado 24h.' },
  { id: 'mod_prontuario', name: 'Prontuário Digital', phase: 'QA', description: 'Evolução clínica e odontograma permanente estruturado.' },
  { id: 'mod_tratamentos', name: 'Plano de Tratamento', phase: 'QA', description: 'Procedimentos clínicos estruturados com histórico preservado.' },
  { id: 'mod_documentos', name: 'Gestão de Documentos', phase: 'Futuro', description: 'Atestados, receitas e termos de consentimento.' },
  { id: 'mod_imagens', name: 'Imagens Radiográficas', phase: 'Futuro', description: 'Armazenamento de exames de imagem.' },
  { id: 'mod_relatorios', name: 'Relatórios Avançados', phase: 'Premium', description: 'Dashboards analíticos e exportação de dados.' },
  { id: 'mod_omnichannel', name: 'Omnichannel Real', phase: 'Próxima Fase', description: 'Fundação real para canais oficiais com WhatsApp Cloud API.' },
  { id: 'mod_ia', name: 'Assistente IA', phase: 'Premium', description: 'Sugestões de diagnóstico e respostas automáticas.' },
  { id: 'mod_automacoes', name: 'Automações de Marketing', phase: 'Premium', description: 'Régua de relacionamento e e-mail marketing.' },
  { id: 'mod_fiscal', name: 'NFS-e Automática', phase: 'Premium', description: 'Emissão de nota fiscal integrada com prefeituras.' }
];

export const USER_ROLES = [
  { id: 'master_saas', name: 'Master SaaS', description: 'Acesso total a todas as clínicas e configurações do sistema SaaS.' },
  { id: 'admin', name: 'Admin Clínica', description: 'Acesso total aos dados e configurações da própria clínica.' },
  { id: 'dentista', name: 'Dentista', description: 'Acesso à própria agenda, prontuários e pacientes vinculados.' },
  { id: 'recepcionista', name: 'Recepcionista', description: 'Acesso à agenda geral, cadastro de pacientes e recebimentos básicos.' },
  { id: 'financeiro', name: 'Financeiro', description: 'Acesso exclusivo ao módulo financeiro e relatórios de faturamento.' },
  { id: 'marketing', name: 'Marketing', description: 'Acesso ao CRM, Landing Page e integrações de captação.' }
];

export const FEATURE_FLAGS = {
  'tenant_aurora': ['mod_landing', 'mod_crm', 'mod_agenda', 'mod_financeiro', 'mod_usuarios', 'mod_assinatura', 'mod_relatorios', 'mod_omnichannel', 'mod_fiscal'],
  'tenant_harbor': ['mod_landing', 'mod_crm', 'mod_agenda', 'mod_financeiro', 'mod_usuarios', 'mod_omnichannel', 'mod_prontuario', 'mod_tratamentos'],
  'tenant_odonto_prime': ['mod_crm', 'mod_agenda', 'mod_financeiro']
};

export const getTenantById = (id) => TENANTS.find(t => t.id === id);
export const getPlanByName = (name) => SAAS_PLANS.find(p => p.name === name);
export const getModulesByTenant = (tenantId) => {
  const activeIds = FEATURE_FLAGS[tenantId] || [];
  return MODULES.filter(m => activeIds.includes(m.id));
};
export const getRolePermissions = (roleId) => USER_ROLES.find(r => r.id === roleId);
export const getTenantStats = () => {
  return {
    totalTenants: TENANTS.length,
    totalMrr: TENANTS.reduce((acc, t) => acc + t.mrr, 0),
    trials: TENANTS.filter(t => t.status === 'Trial').length,
    churn: 0,
    mostUsedPlan: 'Premium'
  };
};
