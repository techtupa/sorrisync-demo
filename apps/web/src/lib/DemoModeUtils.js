
export const DEMO_VERSION = 'SorriSync Demo v0.9';

export const DEMO_MESSAGES = {
  globalBanner: 'SorriSync está em modo demonstração. Nenhuma ação executa operação real.',
  frozenScope: 'Demo congelada para exportação',
  fakeDataWarning: 'Não use dados reais nesta demo',
  futurePhase: 'Essas funcionalidades serão avaliadas e implementadas na fase Codex + Supabase',
  dashboardNote: 'Backend, autenticação, banco de dados, integrações e storage serão implementados na próxima fase.',
  patientsNote: 'Dados de pacientes nesta versão são fictícios.',
  financeNote: 'Master Control representa a camada SaaS global. Financeiro da Clínica representa apenas a operação da clínica selecionada. Cada clínica será isolada por tenant_id no backend real.',
  masterNote: 'Master Control representa a camada SaaS global. Cada clínica será isolada por tenant_id no backend real.',
};

export const FICTIONAL_DATA_TYPES = [
  'Pacientes fictícios',
  'Valores fictícios',
  'Documentos fictícios',
  'Integrações simuladas',
  'Pagamentos simulados',
  'Fiscal/NFS-e simulado',
  'Uploads simulados',
  'Consentimentos simulados',
  'Logs simulados'
];

export const NOT_IMPLEMENTED_FEATURES = [
  'Backend', 'Supabase', 'Banco de dados', 'Login real', 'Auth real', 'RLS real',
  'Permissões reais', 'Upload real', 'Pagamento real', 'WhatsApp real', 'Instagram real',
  'Google Agenda real', 'Fiscal/NFS-e real', 'Webhooks reais', 'E-mails reais',
  'Notificações reais', 'Exportação real', 'Prontuário clínico real', 'Odontograma real', 'IA real'
];

export const HANDOFF_BLOCKS = [
  {
    title: 'O que o Horizon entregou',
    items: ['Frontend premium', 'Navegação visual', 'Design system inicial', 'Páginas públicas', 'Módulos internos', 'Fluxos mockados', 'Dados fictícios', 'Estrutura multi-tenant visual']
  },
  {
    title: 'O que o Codex deve fazer primeiro',
    items: ['Organizar código', 'Revisar componentes', 'Limpar duplicações', 'Estruturar rotas', 'Separar mocks por domínio', 'Preparar integração Supabase', 'Criar types/interfaces reais', 'Definir arquitetura frontend']
  },
  {
    title: 'Primeiras prioridades técnicas',
    items: ['Supabase Auth', 'Tenants', 'Tenant users', 'Users/Profiles', 'Roles/Permissions', 'RLS por tenant_id', 'CRM real', 'Agenda real', 'Financeiro real', 'Minha Home real', 'Storage de arquivos', 'Audit logs']
  }
];

export const CODEX_BACKLOG = [
  { priority: 'Prioridade 1 — Fundação SaaS', items: ['Supabase Project', 'Auth', 'PostgreSQL Tables', 'RLS Policies'] },
  { priority: 'Prioridade 2 — Core da clínica', items: ['CRM', 'Agenda', 'Pacientes', 'Financeiro'] },
  { priority: 'Prioridade 3 — White-label', items: ['Minha Home Customização', 'Tenant Switcher Logic'] },
  { priority: 'Prioridade 4 — Arquivos e auditoria', items: ['Storage Buckets', 'Audit Logs', 'Legal & Privacidade'] },
  { priority: 'Prioridade 5 — Integrações', items: ['Edge Functions', 'Webhooks', 'NFS-e', 'WhatsApp'] }
];

export const EXPORT_CHECKLIST = [
  { label: 'Marca SorriSync padronizada', status: 'Concluído visualmente' },
  { label: 'URLs corretas revisadas', status: 'Concluído visualmente' },
  { label: 'Sidebar organizada', status: 'Concluído visualmente' },
  { label: 'Topbar contextual', status: 'Concluído visualmente' },
  { label: 'Site público navegável', status: 'Concluído visualmente' },
  { label: 'App interno navegável', status: 'Concluído visualmente' },
  { label: 'Master Control separado da clínica', status: 'Concluído visualmente' },
  { label: 'Tenant Switcher visual criado', status: 'Concluído visualmente' },
  { label: 'Modo Demonstração criado', status: 'Concluído visualmente' },
  { label: 'Codex + Supabase mapeado', status: 'Concluído visualmente' },
  { label: 'Dados fictícios sinalizados', status: 'Concluído visualmente' },
  { label: 'Integrações marcadas como futuras', status: 'Concluído visualmente' },
  { label: 'Botões mockados com feedback', status: 'Concluído visualmente' },
  { label: 'Placeholders crus removidos', status: 'Concluído visualmente' },
  { label: 'Responsividade revisada', status: 'Concluído visualmente' },
  { label: 'tenant_id presente nos mocks principais', status: 'Concluído visualmente' },
  { label: 'Handoff para Codex criado', status: 'Concluído visualmente' }
];

export const MODULE_STATUS = [
  { group: 'Operação', modules: [{name: 'Dashboard', status: 'Concluído visualmente'}, {name: 'Central Operacional', status: 'Concluído visualmente'}, {name: 'Modo Recepção', status: 'Concluído visualmente'}, {name: 'Onboarding', status: 'Concluído visualmente'}] },
  { group: 'Gestão & Clínica', modules: [{name: 'Minha Home', status: 'Concluído visualmente'}, {name: 'Pacientes/CRM', status: 'Concluído visualmente'}, {name: 'Agenda', status: 'Concluído visualmente'}, {name: 'Financeiro', status: 'Concluído visualmente'}, {name: 'Marketing', status: 'Concluído visualmente'}, {name: 'Documentos', status: 'Concluído visualmente'}] },
  { group: 'Administração', modules: [{name: 'Portal do Paciente', status: 'Concluído visualmente'}, {name: 'Usuários', status: 'Concluído visualmente'}, {name: 'Configurações', status: 'Concluído visualmente'}, {name: 'Auditoria', status: 'Concluído visualmente'}] },
  { group: 'SaaS / Plataforma', modules: [{name: 'Master Control', status: 'Concluído visualmente'}, {name: 'Modo Demonstração', status: 'Concluído visualmente'}, {name: 'Codex + Supabase', status: 'Concluído visualmente'}] },
];

export const SMOKE_TEST = [
  { label: 'Abrir site público', status: 'OK visual' },
  { label: 'Abrir login visual', status: 'OK visual' },
  { label: 'Entrar no app visual', status: 'OK visual' },
  { label: 'Abrir Dashboard', status: 'OK visual' },
  { label: 'Abrir Minha Home', status: 'OK visual' },
  { label: 'Abrir CRM', status: 'OK visual' },
  { label: 'Abrir Agenda', status: 'OK visual' },
  { label: 'Abrir Financeiro', status: 'OK visual' },
  { label: 'Abrir Marketing', status: 'OK visual' },
  { label: 'Abrir Master Control', status: 'OK visual' },
  { label: 'Abrir Modo Demonstração', status: 'OK visual' },
  { label: 'Abrir Codex + Supabase', status: 'OK visual' },
  { label: 'Testar dropdown do avatar', status: 'OK visual' },
  { label: 'Testar tenant switcher', status: 'OK visual' },
  { label: 'Testar sidebar no mobile', status: 'OK visual' },
  { label: 'Testar uma modal', status: 'OK visual' },
  { label: 'Testar um drawer', status: 'OK visual' },
  { label: 'Testar um toast', status: 'OK visual' }
];
