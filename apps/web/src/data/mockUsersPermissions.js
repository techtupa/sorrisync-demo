
export const mockUsers = [
  { id: 'membership_1', user_id: '1', role_id: 'rol_1', role_code: 'clinic_owner', tenant_id: 'tenant_aurora', name: 'Dr. Avery Chen', email: 'Avery Chen@sorrisync.example.invalid', role: 'Proprietário da clínica', status: 'Ativo', status_code: 'active', last_access: '2026-05-31T14:30:00Z', modules: ['Todos'], created_at: '2025-01-10T10:00:00Z', updated_at: '2026-05-31T14:30:00Z' },
  { id: 'membership_2', user_id: 'usr_2', role_id: 'rol_3', role_code: 'dentist', tenant_id: 'tenant_aurora', name: 'Dr. Carlos Silva', email: 'carlos@sorrisync.example.invalid', role: 'Dentista', status: 'Ativo', status_code: 'active', last_access: '2026-05-31T09:15:00Z', modules: ['Agenda'], created_at: '2025-02-15T10:00:00Z', updated_at: '2026-05-31T09:15:00Z' },
  { id: 'membership_3', user_id: 'usr_3', role_id: 'rol_4', role_code: 'receptionist', tenant_id: 'tenant_aurora', name: 'Mariana Alves', email: 'recepcao@sorrisync.example.invalid', role: 'Recepção', status: 'Ativo', status_code: 'active', last_access: '2026-05-31T13:45:00Z', modules: ['Agenda', 'CRM'], created_at: '2025-01-20T10:00:00Z', updated_at: '2026-05-31T13:45:00Z' },
  { id: 'membership_4', user_id: 'usr_4', role_id: 'rol_5', role_code: 'assistant', tenant_id: 'tenant_aurora', name: 'Roberto Lima', email: 'assistente@sorrisync.example.invalid', role: 'Assistente', status: 'Ativo', status_code: 'active', last_access: '2026-05-30T16:20:00Z', modules: ['Agenda'], created_at: '2025-03-05T10:00:00Z', updated_at: '2026-05-30T16:20:00Z' },
  { id: 'membership_5', user_id: 'usr_5', role_id: 'rol_2', role_code: 'clinic_admin', tenant_id: 'tenant_aurora', name: 'Camila Torres', email: 'admin@sorrisync.example.invalid', role: 'Administrador da clínica', status: 'Ativo', status_code: 'active', last_access: '2026-05-15T11:00:00Z', modules: ['Configurações', 'Agenda', 'CRM'], created_at: '2025-04-10T10:00:00Z', updated_at: '2026-05-15T11:00:00Z' }
];

export const mockRoles = [
  { id: 'rol_1', tenant_id: 'tenant_aurora', code: 'clinic_owner', scope: 'clinic', is_system: true, name: 'Proprietário da clínica', description: 'Papel protegido e imutável nesta fatia.', users_count: 1, status: 'Sistema', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' },
  { id: 'rol_2', tenant_id: 'tenant_aurora', code: 'clinic_admin', scope: 'clinic', is_system: true, name: 'Administrador da clínica', description: 'Administração operacional da clínica.', users_count: 1, status: 'Sistema', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' },
  { id: 'rol_3', tenant_id: 'tenant_aurora', code: 'dentist', scope: 'clinic', is_system: true, name: 'Dentista', description: 'Acesso clínico para atendimento e agenda.', users_count: 1, status: 'Sistema', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' },
  { id: 'rol_4', tenant_id: 'tenant_aurora', code: 'receptionist', scope: 'clinic', is_system: true, name: 'Recepção', description: 'Acesso operacional para pacientes e agenda.', users_count: 1, status: 'Sistema', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' },
  { id: 'rol_5', tenant_id: 'tenant_aurora', code: 'assistant', scope: 'clinic', is_system: true, name: 'Assistente', description: 'Acesso limitado para apoio operacional.', users_count: 1, status: 'Sistema', created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z' }
];

export const mockPermissions = [
  { id: 'mod_1', name: 'Dashboard' },
  { id: 'mod_2', name: 'Minha Home' },
  { id: 'mod_3', name: 'Pacientes/CRM' },
  { id: 'mod_4', name: 'Agenda' },
  { id: 'mod_5', name: 'Financeiro' },
  { id: 'mod_6', name: 'DRE' },
  { id: 'mod_7', name: 'Fiscal/NFS-e' },
  { id: 'mod_8', name: 'Marketing' },
  { id: 'mod_9', name: 'Integrações' },
  { id: 'mod_10', name: 'Usuários' },
  { id: 'mod_11', name: 'Configurações' },
  { id: 'mod_12', name: 'Master Control' },
  { id: 'mod_13', name: 'Prontuário futuro' },
  { id: 'mod_14', name: 'IA futura' }
];

export const mockInvitations = [
  { id: 'inv_1', tenant_id: 'tenant_aurora', email: 'novo.dentista@sorrisync.example.invalid', role: 'Dentista', status: 'Pendente', expires_at: '2026-06-05T10:00:00Z', created_at: '2026-05-30T10:00:00Z', updated_at: '2026-05-30T10:00:00Z' },
  { id: 'inv_2', tenant_id: 'tenant_aurora', email: 'assistente@sorrisync.example.invalid', role: 'Recepção', status: 'Expirado', expires_at: '2026-05-20T10:00:00Z', created_at: '2026-05-10T10:00:00Z', updated_at: '2026-05-10T10:00:00Z' },
  { id: 'inv_3', tenant_id: 'tenant_aurora', email: 'contador@sorrisync.example.invalid', role: 'Financeiro', status: 'Aceito', expires_at: '2026-06-01T10:00:00Z', created_at: '2026-05-25T10:00:00Z', updated_at: '2026-05-26T10:00:00Z' }
];

export const mockAuditLogs = [
  { id: 'aud_1', tenant_id: 'tenant_aurora', user: 'Dr. Avery Chen', action: 'Login realizado', module: 'Autenticação', ip: '192.168.1.1', created_at: '2026-05-31T14:30:00Z', updated_at: '2026-05-31T14:30:00Z', status: 'Sucesso' },
  { id: 'aud_2', tenant_id: 'tenant_aurora', user: 'Dr. Avery Chen', action: 'Alterou permissões de Roberto Lima', module: 'Usuários', ip: '192.168.1.1', created_at: '2026-05-31T14:35:00Z', updated_at: '2026-05-31T14:35:00Z', status: 'Sucesso' },
  { id: 'aud_3', tenant_id: 'tenant_aurora', user: 'Mariana Alves', action: 'Tentativa de acesso negada', module: 'Financeiro', ip: '192.168.1.2', created_at: '2026-05-31T13:50:00Z', updated_at: '2026-05-31T13:50:00Z', status: 'Bloqueado' },
  { id: 'aud_4', tenant_id: 'tenant_aurora', user: 'Roberto Lima', action: 'Exportou relatório DRE', module: 'Financeiro', ip: '192.168.1.3', created_at: '2026-05-30T16:25:00Z', updated_at: '2026-05-30T16:25:00Z', status: 'Sucesso' },
  { id: 'aud_5', tenant_id: 'tenant_aurora', user: 'Sistema', action: 'Convite expirado', module: 'Usuários', ip: 'internal', created_at: '2026-05-20T10:00:00Z', updated_at: '2026-05-20T10:00:00Z', status: 'Aviso' },
  { id: 'aud_6', tenant_id: 'tenant_aurora', user: 'Dr. Carlos Silva', action: 'Login realizado', module: 'Autenticação', ip: '192.168.1.4', created_at: '2026-05-31T09:15:00Z', updated_at: '2026-05-31T09:15:00Z', status: 'Sucesso' },
  { id: 'aud_7', tenant_id: 'tenant_aurora', user: 'Suporte SorriSync', action: 'Acesso temporário iniciado', module: 'Master Control', ip: '10.0.0.1', created_at: '2026-05-31T10:00:00Z', updated_at: '2026-05-31T10:00:00Z', status: 'Aviso' },
  { id: 'aud_8', tenant_id: 'tenant_aurora', user: 'Dr. Avery Chen', action: 'Enviou convite para novo.dentista', module: 'Usuários', ip: '192.168.1.1', created_at: '2026-05-30T10:05:00Z', updated_at: '2026-05-30T10:05:00Z', status: 'Sucesso' }
];

export const getUsersByTenant = (tenantId) => mockUsers.filter(u => u.tenant_id === tenantId);
export const getRolesByTenant = (tenantId) => mockRoles.filter(r => r.tenant_id === tenantId);
export const getPermissionsByRole = () => mockPermissions;
export const getInvitationsByTenant = (tenantId) => mockInvitations.filter(i => i.tenant_id === tenantId);
export const getAuditLogsByTenant = (tenantId) => mockAuditLogs.filter(a => a.tenant_id === tenantId);
