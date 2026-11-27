
export const mockMasterTenants = [
  {
    id: 'tenant_aurora',
    name: 'Dr. Avery Chen',
    responsible: 'Avery Chen',
    plan_id: 'plan_premium',
    plan_name: 'Premium',
    status: 'Ativa',
    domain: 'aurora-dental.example.invalid',
    subdomain: 'Avery Chen.sorrisync.example.invalid',
    users_count: 6,
    modules_active: 8,
    mrr: 697,
    next_billing: '2026-06-05T00:00:00Z',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-05-31T00:00:00Z'
  },
  {
    id: 'tenant_harbor',
    name: 'Clínica Sorriso Jardim',
    responsible: 'Carlos Eduardo',
    plan_id: 'plan_pro',
    plan_name: 'Profissional',
    status: 'Ativa',
    domain: 'Não configurado',
    subdomain: 'sorrisojardim.sorrisync.example.invalid',
    users_count: 8,
    modules_active: 6,
    mrr: 397,
    next_billing: '2026-06-10T00:00:00Z',
    created_at: '2025-11-15T00:00:00Z',
    updated_at: '2026-05-20T00:00:00Z'
  },
  {
    id: 'tenant_odonto_prime',
    name: 'Odonto Prime',
    responsible: 'Mariana Silva',
    plan_id: 'plan_essential',
    plan_name: 'Essencial',
    status: 'Trial',
    domain: 'Não configurado',
    subdomain: 'odontoprime.sorrisync.example.invalid',
    users_count: 4,
    modules_active: 4,
    mrr: 197,
    next_billing: '2026-06-05T00:00:00Z',
    created_at: '2026-05-20T00:00:00Z',
    updated_at: '2026-05-30T00:00:00Z'
  }
];

export const mockMasterSubscriptions = [
  { id: 'sub_1', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', plan: 'Premium', monthly_value: 697, status: 'Ativa', payment_method: 'Manual', next_billing: '2026-06-05T00:00:00Z', last_payment: '2026-05-05T00:00:00Z' },
  { id: 'sub_2', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', plan: 'Profissional', monthly_value: 397, status: 'Ativa', payment_method: 'Manual', next_billing: '2026-06-10T00:00:00Z', last_payment: '2026-05-10T00:00:00Z' },
  { id: 'sub_3', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', plan: 'Essencial', monthly_value: 197, status: 'Trial', payment_method: 'Não definida', next_billing: '2026-06-05T00:00:00Z', last_payment: null }
];

export const mockMasterAlerts = [
  { id: 'alt_1', type: 'warning', message: 'Odonto Prime encerra o Trial em 5 dias.', action: 'Contatar clínica' },
  { id: 'alt_2', type: 'info', message: 'Dr. Avery Chen atingiu 80% do limite de usuários.', action: 'Oferecer upgrade' },
  { id: 'alt_3', type: 'success', message: 'Receita recorrente ultrapassou R$ 1.200.', action: 'Ver métricas' },
  { id: 'alt_4', type: 'error', message: 'Falha de integração fiscal relatada por 2 clínicas.', action: 'Verificar logs' }
];

export const mockMasterLogs = [
  { id: 'log_1', date: '2026-05-31T14:30:00Z', action: 'Acesso modo suporte iniciado', tenant: 'Dr. Avery Chen', user: 'Master Admin' },
  { id: 'log_2', date: '2026-05-30T10:15:00Z', action: 'Nova clínica registrada (Trial)', tenant: 'Odonto Prime', user: 'Sistema' },
  { id: 'log_3', date: '2026-05-25T09:00:00Z', action: 'Pagamento manual confirmado', tenant: 'Clínica Sorriso Jardim', user: 'Master Admin' },
  { id: 'log_4', date: '2026-05-20T16:45:00Z', action: 'Upgrade de plano para Premium', tenant: 'Dr. Avery Chen', user: 'Master Admin' }
];

export const mockChartGrowth = [
  { name: 'Jan', clinicas: 0 },
  { name: 'Fev', clinicas: 1 },
  { name: 'Mar', clinicas: 1 },
  { name: 'Abr', clinicas: 2 },
  { name: 'Mai', clinicas: 3 },
  { name: 'Jun', clinicas: 5 }
];

export const mockChartRevenue = [
  { name: 'Jan', receita: 0 },
  { name: 'Fev', receita: 197 },
  { name: 'Mar', receita: 397 },
  { name: 'Abr', receita: 794 },
  { name: 'Mai', receita: 1291 },
  { name: 'Jun', receita: 2385 }
];

export const mockTenantModules = [
  { id: 'mod_1', module_key: 'minha_home', name: 'Minha Home', status: 'Ativo', min_plan: 'Essencial', description: 'Dashboard inicial e atalhos rápidos.' },
  { id: 'mod_2', module_key: 'crm', name: 'CRM Básico', status: 'Ativo', min_plan: 'Essencial', description: 'Gestão de pacientes e funil de vendas.' },
  { id: 'mod_3', module_key: 'agenda', name: 'Agenda', status: 'Ativo', min_plan: 'Essencial', description: 'Agendamento de consultas e bloqueios.' },
  { id: 'mod_4', module_key: 'financeiro', name: 'Financeiro', status: 'Ativo', min_plan: 'Profissional', description: 'Contas a pagar, receber e fluxo de caixa.' },
  { id: 'mod_5', module_key: 'marketing', name: 'Marketing', status: 'Ativo', min_plan: 'Premium', description: 'Campanhas, automações e captação de leads.' },
  { id: 'mod_6', module_key: 'integracoes', name: 'Integrações', status: 'Ativo', min_plan: 'Premium', description: 'Conexão com WhatsApp, Instagram e Google.' },
  { id: 'mod_7', module_key: 'usuarios', name: 'Usuários', status: 'Ativo', min_plan: 'Profissional', description: 'Gestão de acessos e permissões.' },
  { id: 'mod_8', module_key: 'dre', name: 'DRE Gerencial', status: 'Bloqueado', min_plan: 'Premium', description: 'Demonstrativo de resultados do exercício.' },
  { id: 'mod_9', module_key: 'fiscal', name: 'Fiscal/NFS-e', status: 'Futuro', min_plan: 'Premium', description: 'Emissão de notas fiscais de serviço.' },
  { id: 'mod_10', module_key: 'prontuario', name: 'Prontuário Eletrônico', status: 'Futuro', min_plan: 'Essencial', description: 'Evolução clínica e anamnese.' },
  { id: 'mod_11', module_key: 'estoque', name: 'Estoque', status: 'Futuro', min_plan: 'Profissional', description: 'Controle de materiais odontológicos.' },
  { id: 'mod_12', module_key: 'telemedicina', name: 'Telemedicina', status: 'Futuro', min_plan: 'Premium', description: 'Consultas online integradas.' },
  { id: 'mod_13', module_key: 'ia_assistant', name: 'Assistente IA', status: 'Futuro', min_plan: 'Enterprise', description: 'Inteligência artificial para diagnósticos.' },
  { id: 'mod_14', module_key: 'multi_unidade', name: 'Multi-unidade', status: 'Futuro', min_plan: 'Enterprise', description: 'Gestão de redes e franquias.' }
];

export const mockFeatureFlags = [
  { id: 'ff_1', feature_key: 'enable_crm_pipeline', name: 'Funil de CRM', status: 'Ativo', min_plan: 'Essencial', module: 'CRM', description: 'Habilita a visualização em Kanban no CRM.' },
  { id: 'ff_2', feature_key: 'enable_custom_domain', name: 'Domínio Próprio', status: 'Ativo', min_plan: 'Premium', module: 'Configurações', description: 'Permite configurar CNAME personalizado.' },
  { id: 'ff_3', feature_key: 'enable_financial_dre', name: 'DRE Gerencial', status: 'Ativo', min_plan: 'Premium', module: 'Financeiro', description: 'Habilita relatórios avançados de DRE.' },
  { id: 'ff_4', feature_key: 'enable_instagram_integration', name: 'Integração Instagram', status: 'Em breve', min_plan: 'Premium', module: 'Integrações', description: 'Captura de leads via Direct/Comentários.' },
  { id: 'ff_5', feature_key: 'enable_whatsapp_automation', name: 'Automação WhatsApp', status: 'Em breve', min_plan: 'Premium', module: 'Integrações', description: 'Envio automático de lembretes.' },
  { id: 'ff_6', feature_key: 'enable_google_calendar_sync', name: 'Sync Google Agenda', status: 'Em breve', min_plan: 'Profissional', module: 'Integrações', description: 'Sincronização bidirecional de agenda.' },
  { id: 'ff_7', feature_key: 'enable_nfse', name: 'Emissão NFS-e', status: 'Futuro', min_plan: 'Premium', module: 'Financeiro', description: 'Integração com prefeituras.' },
  { id: 'ff_8', feature_key: 'enable_ai_assistant', name: 'Assistente IA', status: 'Futuro', min_plan: 'Enterprise', module: 'Geral', description: 'Copiloto inteligente.' }
];

export const mockTenantFeatureFlags = [
  { id: 'tff_1', tenant_id: 'tenant_aurora', feature_key: 'enable_custom_domain', status: 'Ligado', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-01-10T00:00:00Z' },
  { id: 'tff_2', tenant_id: 'tenant_harbor', feature_key: 'enable_custom_domain', status: 'Bloqueado', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-01-10T00:00:00Z' },
  { id: 'tff_3', tenant_id: 'tenant_odonto_prime', feature_key: 'enable_custom_domain', status: 'Bloqueado', created_at: '2026-01-10T00:00:00Z', updated_at: '2026-01-10T00:00:00Z' }
];

export const mockSupportTickets = [
  { id: 'tkt_1', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', title: 'Configurar domínio próprio', category: 'Infraestrutura', priority: 'Alta', status: 'Em andamento', responsible: 'Suporte N2', created_at: '2026-05-30T10:00:00Z', updated_at: '2026-05-31T09:00:00Z' },
  { id: 'tkt_2', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', title: 'Dúvida sobre conciliação financeira', category: 'Dúvida', priority: 'Média', status: 'Aberto', responsible: 'Suporte N1', created_at: '2026-05-31T11:30:00Z', updated_at: '2026-05-31T11:30:00Z' },
  { id: 'tkt_3', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', title: 'Trial terminando - Extensão solicitada', category: 'Comercial', priority: 'Alta', status: 'Resolvido', responsible: 'Comercial', created_at: '2026-05-28T14:00:00Z', updated_at: '2026-05-29T16:00:00Z' },
  { id: 'tkt_4', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', title: 'Ativar módulo de Marketing', category: 'Onboarding', priority: 'Baixa', status: 'Aberto', responsible: 'CSM', created_at: '2026-05-31T15:00:00Z', updated_at: '2026-05-31T15:00:00Z' }
];

export const mockSupportSessions = [
  { id: 'ses_1', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', user: 'Master Admin', motive: 'Verificação de erro no DRE', start_time: '2026-05-30T14:00:00Z', duration: '25 min', status: 'Encerrada', audit: 'Auditada', created_at: '2026-05-30T14:00:00Z', updated_at: '2026-05-30T14:25:00Z' },
  { id: 'ses_2', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', user: 'Suporte N2', motive: 'Configuração inicial de agenda', start_time: '2026-05-28T09:00:00Z', duration: '45 min', status: 'Encerrada', audit: 'Auditada', created_at: '2026-05-28T09:00:00Z', updated_at: '2026-05-28T09:45:00Z' },
  { id: 'ses_3', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', user: 'CSM', motive: 'Acompanhamento de Trial', start_time: '2026-05-25T16:00:00Z', duration: '15 min', status: 'Encerrada', audit: 'Auditada', created_at: '2026-05-25T16:00:00Z', updated_at: '2026-05-25T16:15:00Z' }
];

export const mockOnboardingChecklists = [
  { id: 'onb_1', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', progress: 85, status: 'Em andamento', next_action: 'Configurar Domínio', responsible: 'CSM', created_at: '2025-01-10T00:00:00Z', updated_at: '2026-05-31T00:00:00Z' },
  { id: 'onb_2', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', progress: 60, status: 'Em andamento', next_action: 'Treinamento Financeiro', responsible: 'CSM', created_at: '2025-11-15T00:00:00Z', updated_at: '2026-05-20T00:00:00Z' },
  { id: 'onb_3', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', progress: 30, status: 'Trial', next_action: 'Apresentar Agenda', responsible: 'Comercial', created_at: '2026-05-20T00:00:00Z', updated_at: '2026-05-30T00:00:00Z' }
];

// --- NEW SAAS METRICS & LOGS DATA ---

export const saas_metrics_snapshots = [
  { id: 'snap_1', month: 'Jan', mrr: 0, arr: 0, arpa: 0, active_tenants: 0, trials: 0, churn_rate: 0, conversion_rate: 0, expansion_mrr: 0, created_at: '2026-01-31T23:59:59Z' },
  { id: 'snap_2', month: 'Fev', mrr: 197, arr: 2364, arpa: 197, active_tenants: 1, trials: 1, churn_rate: 0, conversion_rate: 100, expansion_mrr: 0, created_at: '2026-02-28T23:59:59Z' },
  { id: 'snap_3', month: 'Mar', mrr: 397, arr: 4764, arpa: 397, active_tenants: 1, trials: 2, churn_rate: 0, conversion_rate: 50, expansion_mrr: 200, created_at: '2026-03-31T23:59:59Z' },
  { id: 'snap_4', month: 'Abr', mrr: 794, arr: 9528, arpa: 397, active_tenants: 2, trials: 1, churn_rate: 0, conversion_rate: 100, expansion_mrr: 0, created_at: '2026-04-30T23:59:59Z' },
  { id: 'snap_5', month: 'Mai', mrr: 1291, arr: 15492, arpa: 430, active_tenants: 3, trials: 1, churn_rate: 0, conversion_rate: 67, expansion_mrr: 300, created_at: '2026-05-31T23:59:59Z' },
  { id: 'snap_6', month: 'Jun (Proj)', mrr: 2385, arr: 28620, arpa: 477, active_tenants: 5, trials: 2, churn_rate: 0, conversion_rate: 70, expansion_mrr: 400, created_at: '2026-06-30T23:59:59Z' }
];

export const tenant_usage_metrics = {
  active_users: 18,
  consultations: 86,
  leads: 74,
  budgets: 21,
  payments: 38,
  landing_pages: 3,
  domains: 1
};

export const module_adoption_metrics = [
  { name: 'CRM', adoption: 100, tenants: 3 },
  { name: 'Agenda', adoption: 100, tenants: 3 },
  { name: 'Minha Home', adoption: 100, tenants: 3 },
  { name: 'Financeiro', adoption: 66, tenants: 2 },
  { name: 'Marketing', adoption: 33, tenants: 1 },
  { name: 'Integrações', adoption: 33, tenants: 1 },
  { name: 'DRE', adoption: 0, tenants: 0 }
];

export const saas_funnel_events = [
  { stage: 'Leads', count: 12, conversion: null },
  { stage: 'Demos', count: 7, conversion: 58 },
  { stage: 'Trials', count: 3, conversion: 42 },
  { stage: 'Clientes', count: 2, conversion: 66 },
  { stage: 'Upgrades', count: 1, conversion: 50 }
];

export const tenant_health_scores = [
  { id: 'ths_1', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', health_score: 95, weekly_usage: 'Alto', modules_used: 8, pending_items: 0, churn_risk: 'Baixo', recommended_action: 'Manter relacionamento', updated_at: '2026-05-31T00:00:00Z' },
  { id: 'ths_2', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', health_score: 72, weekly_usage: 'Médio', modules_used: 5, pending_items: 2, churn_risk: 'Médio', recommended_action: 'Treinamento Financeiro', updated_at: '2026-05-31T00:00:00Z' },
  { id: 'ths_3', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', health_score: 45, weekly_usage: 'Baixo', modules_used: 2, pending_items: 4, churn_risk: 'Alto', recommended_action: 'Contato Comercial Urgente', updated_at: '2026-05-31T00:00:00Z' }
];

export const master_audit_logs = [
  { id: 'al_1', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', event_type: 'Plano Alterado', actor_id: 'master_admin', user: 'Master Admin', category: 'Plano', severity: 'Atenção', status: 'Sucesso', created_at: '2026-05-31T14:30:00Z', details: 'Upgrade de Profissional para Premium' },
  { id: 'al_2', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', event_type: 'Sessão Suporte Iniciada', actor_id: 'suporte_n2', user: 'Suporte N2', category: 'Suporte', severity: 'Info', status: 'Sucesso', created_at: '2026-05-31T11:15:00Z', details: 'Acesso temporário concedido por 45 min' },
  { id: 'al_3', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', event_type: 'Tenant Criado', actor_id: 'system', user: 'Sistema', category: 'Tenant', severity: 'Sucesso', status: 'Sucesso', created_at: '2026-05-30T09:00:00Z', details: 'Novo trial iniciado via Landing Page' },
  { id: 'al_4', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', event_type: 'Feature Flag Ativada', actor_id: 'master_admin', user: 'Master Admin', category: 'Feature Flags', severity: 'Info', status: 'Sucesso', created_at: '2026-05-29T16:45:00Z', details: 'Flag enable_custom_domain ativada' },
  { id: 'al_5', tenant_id: 'tenant_harbor', clinic: 'Clínica Sorriso Jardim', event_type: 'Falha de Pagamento', actor_id: 'system', user: 'Sistema', category: 'Assinatura', severity: 'Crítico', status: 'Falha', created_at: '2026-05-28T08:30:00Z', details: 'Cartão de crédito recusado (Final 4021)' },
  { id: 'al_6', tenant_id: 'tenant_odonto_prime', clinic: 'Odonto Prime', event_type: 'Módulo Bloqueado', actor_id: 'system', user: 'Sistema', category: 'Módulos', severity: 'Atenção', status: 'Sucesso', created_at: '2026-05-27T10:20:00Z', details: 'Módulo Financeiro bloqueado (Limite do plano)' },
  { id: 'al_7', tenant_id: 'tenant_aurora', clinic: 'Dr. Avery Chen', event_type: 'Exportação de Dados', actor_id: 'aurora-dental', user: 'Avery Chen', category: 'Segurança', severity: 'Atenção', status: 'Sucesso', created_at: '2026-05-26T15:10:00Z', details: 'Exportação completa de pacientes solicitada' },
  { id: 'al_8', tenant_id: 'global', clinic: 'Global', event_type: 'Atualização de Sistema', actor_id: 'devops', user: 'DevOps', category: 'Sistema', severity: 'Info', status: 'Sucesso', created_at: '2026-05-25T02:00:00Z', details: 'Deploy da versão v2.4.0 concluído' }
];
