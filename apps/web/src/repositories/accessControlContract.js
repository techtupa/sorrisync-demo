export const BLOCKED_SENSITIVE_MODULE_IDS = new Set([
  'mod_fiscal',
  'mod_imagens',
  'mod_gcal',
  'mod_whatsapp',
  'mod_instagram',
  'mod_assinatura',
]);

export const CLINIC_ROLE_SCOPE = 'clinic';
export const PLATFORM_ROLE_SCOPE = 'platform';

export const CLINIC_ROLE_CODES = Object.freeze({
  OWNER: 'clinic_owner',
  ADMIN: 'clinic_admin',
  DENTIST: 'dentist',
  RECEPTIONIST: 'receptionist',
  ASSISTANT: 'assistant',
});

export const PROTECTED_CLINIC_ROLE_CODES = new Set([
  CLINIC_ROLE_CODES.OWNER,
]);

export const PRIVILEGED_CLINIC_ROLE_CODES = new Set([
  CLINIC_ROLE_CODES.ADMIN,
]);

export const OPERATIONAL_CLINIC_ROLE_CODES = new Set([
  CLINIC_ROLE_CODES.DENTIST,
  CLINIC_ROLE_CODES.RECEPTIONIST,
  CLINIC_ROLE_CODES.ASSISTANT,
]);

export const KNOWN_CLINIC_ROLE_CODES = new Set([
  ...PROTECTED_CLINIC_ROLE_CODES,
  ...PRIVILEGED_CLINIC_ROLE_CODES,
  ...OPERATIONAL_CLINIC_ROLE_CODES,
]);

export const MODULE_ACCESS_RULES = {
  mod_landing: {
    moduleCodes: ['clinic_settings', 'services'],
    permissionCodes: ['clinic_settings.read', 'services.read'],
    match: 'any',
  },
  mod_crm: {
    moduleCodes: ['patients'],
    permissionCodes: ['patients.read'],
    match: 'any',
  },
  mod_agenda: {
    moduleCodes: ['appointments'],
    permissionCodes: ['appointments.read'],
    match: 'any',
  },
  mod_usuarios: {
    moduleCodes: [],
    permissionCodes: ['tenant_users.read', 'roles.read', 'role_permissions.read'],
    match: 'all',
  },
  mod_documentos: {
    moduleCodes: ['documents'],
    permissionCodes: ['documents.read'],
    match: 'any',
  },
  mod_prontuario: {
    moduleCodes: ['clinical_records'],
    permissionCodes: ['patients.read', 'clinical_records.read'],
    match: 'all',
  },
  mod_tratamentos: {
    moduleCodes: ['treatment_plans'],
    permissionCodes: ['patients.read', 'services.read', 'clinical_records.read', 'treatment_plans.read'],
    match: 'all',
  },
  mod_auditoria: {
    moduleCodes: [],
    permissionCodes: ['audit_logs.read'],
    match: 'any',
  },
  mod_estoque: {
    moduleCodes: ['inventory'],
    permissionCodes: ['inventory.read'],
    match: 'any',
  },
  mod_financeiro: {
    moduleCodes: ['clinic_finance'],
    permissionCodes: ['clinic_finance.read'],
    match: 'all',
  },
  mod_omnichannel: {
    moduleCodes: ['omnichannel'],
    permissionCodes: [
      'omnichannel.read',
      'omnichannel.messages.read',
      'omnichannel.diagnostics.read',
      'omnichannel.diagnostics.manage',
    ],
    match: 'any',
  },
};

export const USERS_PERMISSION_MODULES = [
  {
    id: 'clinic_settings',
    name: 'Configuracoes',
    permissionCodes: ['clinic_settings.read', 'clinic_settings.manage'],
  },
  {
    id: 'services',
    name: 'Servicos',
    permissionCodes: ['services.read', 'services.manage'],
  },
  {
    id: 'patients',
    name: 'Pacientes/CRM',
    permissionCodes: ['patients.read', 'patients.manage'],
  },
  {
    id: 'appointments',
    name: 'Agenda',
    permissionCodes: ['appointments.read', 'appointments.manage'],
  },
  {
    id: 'tenant_users',
    name: 'Usuarios',
    permissionCodes: ['tenant_users.read', 'tenant_users.manage'],
  },
  {
    id: 'audit_logs',
    name: 'Auditoria',
    permissionCodes: ['audit_logs.read', 'audit_logs.write'],
  },
  {
    id: 'documents',
    name: 'Documentos metadata-only',
    permissionCodes: ['documents.read', 'documents.manage', 'documents.sensitive.read'],
  },
  {
    id: 'inventory',
    name: 'Estoque e Insumos',
    permissionCodes: ['inventory.read', 'inventory.manage'],
  },
  {
    id: 'omnichannel',
    name: 'Omnichannel Real',
    permissionCodes: [
      'omnichannel.read',
      'omnichannel.manage',
      'omnichannel.messages.read',
      'omnichannel.messages.manage',
      'omnichannel.diagnostics.read',
      'omnichannel.diagnostics.manage',
    ],
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    permissionCodes: ['clinic_finance.read'],
  },
  {
    id: 'storage_real',
    name: 'Storage real',
    permissionCodes: [],
    blocked: true,
  },
  {
    id: 'clinical_records',
    name: 'Prontuário clínico',
    permissionCodes: ['clinical_records.read', 'clinical_records.sensitive.read', 'clinical_records.manage'],
  },
  {
    id: 'treatment_plans',
    name: 'Planos de tratamento',
    permissionCodes: ['treatment_plans.read', 'treatment_plans.manage'],
  },
  {
    id: 'master_billing',
    name: 'Master financeiro',
    permissionCodes: [],
    blocked: true,
  },
];

export const ROLE_LABELS = {
  clinic_owner: 'Proprietário da clínica',
  clinic_admin: 'Administrador da clínica',
  dentist: 'Dentista',
  receptionist: 'Recepção',
  assistant: 'Assistente',
  platform_admin: 'Administrador SorriSync',
  platform_support: 'Suporte SorriSync',
};

export const STATUS_LABELS = {
  active: 'Ativo',
  invited: 'Pendente',
  inactive: 'Inativo',
  suspended: 'Suspenso',
};

export const TENANT_USER_INVITE_STATUS_LABELS = Object.freeze({
  pending: 'Pendente',
  expired: 'Expirado',
  accepted: 'Aceito',
  revoked: 'Revogado',
  reissued: 'Reemitido',
  invalid: 'Inválido',
});

export const TENANT_USER_INVITE_DURATION_HOURS = 72;

export const formatTenantUserInviteStatus = (status) => {
  return TENANT_USER_INVITE_STATUS_LABELS[status] || 'Inválido';
};

export const canReissueTenantUserInvite = (invite = {}) => {
  return ['pending', 'expired'].includes(invite.effective_status);
};

export const canRevokeTenantUserInvite = (invite = {}) => {
  return ['pending', 'expired'].includes(invite.effective_status);
};

export const buildTenantUserInvitePath = (token) => {
  const normalizedToken = String(token || '').trim();
  return normalizedToken ? `/aceitar-convite/${encodeURIComponent(normalizedToken)}` : '';
};

export const normalizePermissionCodes = (permissionCodes = []) => {
  return [...new Set(permissionCodes.filter(Boolean))].sort();
};

export const getRelationValue = (value) => {
  return Array.isArray(value) ? value[0] : value;
};

export const isValidClinicRoleForTenant = (role = {}, tenantId = null) => {
  if (!role?.id || role.scope !== CLINIC_ROLE_SCOPE || !tenantId) {
    return false;
  }

  return !role.tenant_id || role.tenant_id === tenantId;
};

export const isValidPlatformRole = (role = {}) => {
  return Boolean(role?.id && role.scope === PLATFORM_ROLE_SCOPE && !role.tenant_id);
};

export const classifyClinicRoleCode = (roleCode) => {
  if (PROTECTED_CLINIC_ROLE_CODES.has(roleCode)) return 'protected';
  if (PRIVILEGED_CLINIC_ROLE_CODES.has(roleCode)) return 'privileged';
  if (OPERATIONAL_CLINIC_ROLE_CODES.has(roleCode)) return 'operational';
  return 'unknown';
};

export const getAssignableClinicRoleCodes = (actorRoleCode) => {
  if (actorRoleCode === CLINIC_ROLE_CODES.OWNER) {
    return new Set([
      CLINIC_ROLE_CODES.ADMIN,
      ...OPERATIONAL_CLINIC_ROLE_CODES,
    ]);
  }

  if (actorRoleCode === CLINIC_ROLE_CODES.ADMIN) {
    return new Set(OPERATIONAL_CLINIC_ROLE_CODES);
  }

  return new Set();
};

export const getAllowedTenantMemberRoleOptions = ({
  actorRoleCode,
  roles = [],
  tenantId,
} = {}) => {
  const allowedCodes = getAssignableClinicRoleCodes(actorRoleCode);

  return roles
    .filter((role) => (
      allowedCodes.has(role?.code)
      && KNOWN_CLINIC_ROLE_CODES.has(role?.code)
      && isValidClinicRoleForTenant(role, tenantId)
      && role?.tenant_id == null
      && role?.is_system === true
    ))
    .map((role) => ({
      id: role.id,
      code: role.code,
      name: formatRoleName(role),
      classification: classifyClinicRoleCode(role.code),
    }));
};

export const canManageTenantMemberRole = ({
  actorRoleCode,
  actorUserId,
  hasManagePermission = false,
  member,
  tenantId,
} = {}) => {
  if (!hasManagePermission || !member?.id || member.status_code !== 'active') return false;
  if (tenantId && member.tenant_id !== tenantId) return false;
  if (member.role_tenant_id != null || member.role_is_system !== true) return false;
  if (!KNOWN_CLINIC_ROLE_CODES.has(member.role_code)) return false;
  if (member.role_code === CLINIC_ROLE_CODES.OWNER) return false;
  if (actorUserId && member.user_id === actorUserId) return false;

  if (actorRoleCode === CLINIC_ROLE_CODES.OWNER) return true;
  if (actorRoleCode !== CLINIC_ROLE_CODES.ADMIN) return false;

  return member.role_code !== CLINIC_ROLE_CODES.ADMIN
    && OPERATIONAL_CLINIC_ROLE_CODES.has(member.role_code);
};

export const formatRoleName = (role = {}) => {
  return ROLE_LABELS[role.code] || role.name || 'Perfil sem nome';
};

export const formatStatusLabel = (status) => {
  return STATUS_LABELS[status] || status || 'Ativo';
};

export const getModuleAccessLevel = (permissionCodes = [], module = {}) => {
  if (module.blocked) {
    return { level: 'blocked', label: 'Bloqueado' };
  }

  const codes = new Set(permissionCodes);
  const managePermission = module.permissionCodes?.find((code) => code.endsWith('.manage') || code.endsWith('.write'));
  const readPermission = module.permissionCodes?.find((code) => code.endsWith('.read') || code.endsWith('.sensitive.read'));

  if (managePermission && codes.has(managePermission)) {
    return { level: 'total', label: 'Total' };
  }

  if (readPermission && codes.has(readPermission)) {
    return { level: 'limited', label: 'Limitado' };
  }

  if (module.permissionCodes?.some((code) => codes.has(code))) {
    return { level: 'limited', label: 'Limitado' };
  }

  return { level: 'none', label: 'Sem acesso' };
};

export const getDisplayModulesForPermissionCodes = (permissionCodes = []) => {
  const labels = USERS_PERMISSION_MODULES
    .filter((module) => !module.blocked && module.permissionCodes?.some((code) => permissionCodes.includes(code)))
    .map((module) => module.name);

  return labels.length ? labels : ['Sem modulo real liberado'];
};

export const canAccessModuleByRule = (moduleId, { permissionCodes = [], enabledModuleCodes = [] } = {}) => {
  if (!moduleId || BLOCKED_SENSITIVE_MODULE_IDS.has(moduleId)) {
    return false;
  }

  const rule = MODULE_ACCESS_RULES[moduleId];
  if (!rule) {
    return false;
  }

  const permissionSet = new Set(permissionCodes);
  const moduleSet = new Set(enabledModuleCodes);
  const hasModuleFlag = !rule.moduleCodes?.length || rule.moduleCodes.some((moduleCode) => moduleSet.has(moduleCode));
  const hasPermission = !rule.permissionCodes?.length || (
    rule.match === 'all'
      ? rule.permissionCodes.every((permissionCode) => permissionSet.has(permissionCode))
      : rule.permissionCodes.some((permissionCode) => permissionSet.has(permissionCode))
  );

  return hasModuleFlag && hasPermission;
};

export const buildPermissionsMatrix = ({ roles = [], permissionCodesByRoleId = {} } = {}) => {
  return {
    roles: roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      scope: role.scope,
    })),
    modules: USERS_PERMISSION_MODULES.map((module) => ({
      id: module.id,
      name: module.name,
      blocked: Boolean(module.blocked),
      permissionsByRole: roles.reduce((acc, role) => {
        acc[role.id] = getModuleAccessLevel(permissionCodesByRoleId[role.id] || [], module);
        return acc;
      }, {}),
    })),
  };
};
