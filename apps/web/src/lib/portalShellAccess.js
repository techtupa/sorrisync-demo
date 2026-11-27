import { canAccessModuleByRule } from '../repositories/accessControlContract.js';

export const PORTAL_SHELL_SCOPES = {
  PLATFORM: 'platform',
  TENANT: 'tenant',
};

export const PORTAL_SHELL_GROUPS = [
  'Operations',
  'Clinical',
  'Management',
  'Administration',
  'Platform',
  'SaaS administration',
];

const MASTER_TENANT_ID = 'master_control';
const PLATFORM_ROLE_CODES = new Set(['platform_admin', 'platform_support', 'master_saas']);

const SOURCE_PORTAL_SHELL_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_crm',
    moduleCode: 'patients',
    permissionCodes: ['patients.read'],
    match: 'all',
    defaultRoutePriority: 100,
    hideWhenUnauthorized: true,
    iconKey: 'LayoutDashboard',
  },
  {
    id: 'central-operacional',
    label: 'Central Operacional',
    path: '/central-operacional',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_crm',
    moduleCode: 'patients',
    permissionCodes: ['patients.read'],
    match: 'all',
    defaultRoutePriority: 110,
    hideWhenUnauthorized: true,
    iconKey: 'Inbox',
  },
  {
    id: 'omnichannel-attendance',
    label: 'Omnichannel',
    path: '/omnichannel',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_omnichannel',
    moduleCode: 'omnichannel',
    permissionCodes: ['omnichannel.messages.read'],
    match: 'all',
    defaultRoutePriority: 10,
    hideWhenUnauthorized: true,
    iconKey: 'MessagesSquare',
  },
  {
    id: 'omnichannel-follow-ups',
    label: 'Acompanhamentos',
    path: '/acompanhamentos',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_omnichannel',
    moduleCode: 'omnichannel',
    permissionCodes: ['omnichannel.read', 'omnichannel.messages.read'],
    match: 'any',
    defaultRoutePriority: 25,
    hideWhenUnauthorized: true,
    iconKey: 'CheckSquare',
  },
  {
    id: 'omnichannel-contacts',
    label: 'Contatos Omnichannel',
    path: '/omnichannel/contatos',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_omnichannel',
    moduleCode: 'omnichannel',
    permissionCodes: ['omnichannel.messages.read'],
    match: 'all',
    defaultRoutePriority: 30,
    hideWhenUnauthorized: true,
    iconKey: 'Users',
  },
  {
    id: 'modo-recepcao',
    label: 'Front desk',
    path: '/modo-recepcao',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_agenda',
    moduleCode: 'appointments',
    permissionCodes: ['appointments.read'],
    match: 'all',
    defaultRoutePriority: 120,
    hideWhenUnauthorized: true,
    iconKey: 'PhoneCall',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    path: '/onboarding',
    group: 'Operations',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.read'],
    match: 'all',
    defaultRoutePriority: 130,
    hideWhenUnauthorized: true,
    iconKey: 'Rocket',
  },
  {
    id: 'minha-home',
    label: 'Minha Home',
    path: '/minha-home',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.read'],
    match: 'all',
    defaultRoutePriority: 200,
    hideWhenUnauthorized: true,
    iconKey: 'Home',
  },
  {
    id: 'pacientes',
    label: 'Patient CRM',
    path: '/pacientes',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_crm',
    moduleCode: 'patients',
    permissionCodes: ['patients.read'],
    match: 'all',
    defaultRoutePriority: 210,
    hideWhenUnauthorized: true,
    iconKey: 'Users',
  },
  {
    id: 'agenda',
    label: 'Schedule',
    path: '/agenda',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_agenda',
    moduleCode: 'appointments',
    permissionCodes: ['appointments.read'],
    match: 'all',
    defaultRoutePriority: 220,
    hideWhenUnauthorized: true,
    iconKey: 'Calendar',
  },
  {
    id: 'prontuario',
    label: 'Clinical record',
    path: '/prontuario',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_prontuario',
    moduleCode: 'clinical_records',
    permissionCodes: ['patients.read', 'clinical_records.read'],
    match: 'all',
    defaultRoutePriority: 225,
    hideWhenUnauthorized: true,
    iconKey: 'FileHeart',
  },
  {
    id: 'servicos',
    label: 'Serviços',
    path: '/servicos',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'services',
    permissionCodes: ['services.read'],
    match: 'all',
    defaultRoutePriority: 230,
    hideWhenUnauthorized: true,
    iconKey: 'Layers',
  },
  {
    id: 'laboratorios',
    label: 'Laboratórios',
    path: '/laboratorios',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_estoque',
    moduleCode: 'inventory',
    permissionCodes: ['inventory.read'],
    match: 'all',
    defaultRoutePriority: 240,
    hideWhenUnauthorized: true,
    iconKey: 'Beaker',
  },
  {
    id: 'estoque',
    label: 'Inventory',
    path: '/estoque',
    group: 'Clinical',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_estoque',
    moduleCode: 'inventory',
    permissionCodes: ['inventory.read'],
    match: 'all',
    defaultRoutePriority: 250,
    hideWhenUnauthorized: true,
    iconKey: 'Package',
  },
  {
    id: 'financeiro',
    label: 'Finance',
    path: '/financeiro',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_financeiro',
    moduleCode: 'clinic_finance',
    permissionCodes: ['clinic_finance.read'],
    match: 'all',
    defaultRoutePriority: 300,
    hideWhenUnauthorized: true,
    iconKey: 'DollarSign',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    path: '/marketing',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_crm',
    moduleCode: 'patients',
    permissionCodes: ['patients.read'],
    match: 'all',
    defaultRoutePriority: 310,
    hideWhenUnauthorized: true,
    iconKey: 'TrendingUp',
  },
  {
    id: 'omnichannel-management',
    label: 'Gestão Omnichannel',
    path: '/omnichannel/gestao',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_omnichannel',
    moduleCode: 'omnichannel',
    permissionCodes: ['omnichannel.read'],
    match: 'all',
    defaultRoutePriority: 20,
    hideWhenUnauthorized: true,
    iconKey: 'MessagesSquare',
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    path: '/relatorios',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_crm',
    moduleCode: 'patients',
    permissionCodes: ['patients.read'],
    match: 'all',
    defaultRoutePriority: 320,
    hideWhenUnauthorized: true,
    iconKey: 'BarChart3',
  },
  {
    id: 'documentos',
    label: 'Documentos',
    path: '/documentos',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_documentos',
    moduleCode: 'documents',
    permissionCodes: ['documents.read'],
    match: 'all',
    defaultRoutePriority: 330,
    hideWhenUnauthorized: true,
    iconKey: 'FolderOpen',
  },
  {
    id: 'templates',
    label: 'Templates',
    path: '/templates',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.read'],
    match: 'all',
    defaultRoutePriority: 340,
    hideWhenUnauthorized: true,
    iconKey: 'Grid3x3',
  },
  {
    id: 'integracoes',
    label: 'Integrações',
    path: '/integracoes',
    group: 'Management',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.manage'],
    match: 'all',
    defaultRoutePriority: 350,
    hideWhenUnauthorized: true,
    iconKey: 'Plug',
  },
  {
    id: 'portal-paciente',
    label: 'Portal do Paciente',
    path: '/portal-paciente',
    group: 'Administration',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_prontuario',
    moduleCode: 'clinical_records',
    permissionCodes: ['clinical_records.read'],
    match: 'all',
    defaultRoutePriority: 400,
    hideWhenUnauthorized: true,
    iconKey: 'MonitorSmartphone',
    blocked: true,
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    path: '/usuarios',
    group: 'Administration',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_usuarios',
    moduleCode: null,
    permissionCodes: ['tenant_users.read', 'roles.read', 'role_permissions.read'],
    match: 'all',
    defaultRoutePriority: 410,
    hideWhenUnauthorized: true,
    iconKey: 'LockKeyhole',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    path: '/configuracoes',
    group: 'Administration',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.read'],
    match: 'all',
    defaultRoutePriority: 420,
    hideWhenUnauthorized: true,
    iconKey: 'Settings',
  },
  {
    id: 'auditoria',
    label: 'Auditoria e Logs',
    path: '/auditoria',
    group: 'Administration',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_auditoria',
    moduleCode: null,
    permissionCodes: ['audit_logs.read'],
    match: 'all',
    defaultRoutePriority: 430,
    hideWhenUnauthorized: true,
    iconKey: 'ShieldAlert',
  },
  {
    id: 'ajuda-suporte',
    label: 'Ajuda e Suporte',
    path: '/ajuda-suporte',
    group: 'Administration',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.read'],
    match: 'all',
    defaultRoutePriority: 440,
    hideWhenUnauthorized: true,
    iconKey: 'LifeBuoy',
  },
  {
    id: 'legal-privacidade',
    label: 'Legal e Privacidade',
    path: '/legal-privacidade',
    group: 'Administration',
    scope: PORTAL_SHELL_SCOPES.TENANT,
    moduleId: 'mod_landing',
    moduleCode: 'clinic_settings',
    permissionCodes: ['clinic_settings.read'],
    match: 'all',
    defaultRoutePriority: 450,
    hideWhenUnauthorized: true,
    iconKey: 'ShieldCheck',
  },
  {
    id: 'demo-mode',
    label: 'Modo Demonstração',
    path: '/demo-mode',
    group: 'Platform',
    scope: PORTAL_SHELL_SCOPES.PLATFORM,
    moduleId: null,
    moduleCode: null,
    permissionCodes: [],
    match: 'any',
    defaultRoutePriority: 900,
    hideWhenUnauthorized: true,
    iconKey: 'PlayCircle',
  },
  {
    id: 'codex-supabase',
    label: 'Codex + Supabase',
    path: '/codex-supabase',
    group: 'Platform',
    scope: PORTAL_SHELL_SCOPES.PLATFORM,
    moduleId: null,
    moduleCode: null,
    permissionCodes: [],
    match: 'any',
    defaultRoutePriority: 910,
    hideWhenUnauthorized: true,
    iconKey: 'Code2',
  },
  {
    id: 'demo-export',
    label: 'Progresso MVP',
    path: '/demo-export',
    group: 'Platform',
    scope: PORTAL_SHELL_SCOPES.PLATFORM,
    moduleId: null,
    moduleCode: null,
    permissionCodes: [],
    match: 'any',
    defaultRoutePriority: 920,
    hideWhenUnauthorized: true,
    iconKey: 'CheckSquare',
  },
  {
    id: 'master-control',
    label: 'Master Control',
    path: '/master-control',
    group: 'SaaS administration',
    scope: PORTAL_SHELL_SCOPES.PLATFORM,
    moduleId: null,
    moduleCode: null,
    permissionCodes: [],
    match: 'any',
    defaultRoutePriority: 30,
    hideWhenUnauthorized: true,
    iconKey: 'Building2',
  },
  {
    id: 'quality-diagnostics',
    label: 'Testes & Diagnósticos',
    path: '/master-control?tab=testes',
    group: 'SaaS administration',
    scope: PORTAL_SHELL_SCOPES.PLATFORM,
    moduleId: null,
    moduleCode: null,
    permissionCodes: [],
    match: 'any',
    defaultRoutePriority: 40,
    hideWhenUnauthorized: true,
    iconKey: 'CheckSquare',
  },
];

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value];
};

const toUniqueArray = (value) => [...new Set(toArray(value))];

const getTenantId = (authContextLike = {}) => {
  return authContextLike.currentTenantId
    || authContextLike.currentTenant?.tenant_id
    || authContextLike.currentTenant?.id
    || null;
};

const getCurrentTenant = (authContextLike = {}) => {
  const tenantId = getTenantId(authContextLike);
  return authContextLike.currentTenant
    || toArray(authContextLike.availableTenants).find((tenant) => (
      tenant?.tenant_id === tenantId || tenant?.id === tenantId
    ))
    || null;
};

const hasTenantContext = (authContextLike = {}) => {
  const tenantId = getTenantId(authContextLike);
  return Boolean(tenantId && tenantId !== MASTER_TENANT_ID);
};

const getPlatformRoleIds = (authContextLike = {}) => {
  return toArray(authContextLike.platformRoles)
    .map((role) => role?.role_id || role?.id || null)
    .filter(Boolean);
};

const getAccessControlPermissionCodes = (authContextLike = {}) => {
  const accessControl = authContextLike.accessControl || {};
  const permissionCodesByRoleId = accessControl.permissionCodesByRoleId || {};
  const roleIds = getTenantId(authContextLike) === MASTER_TENANT_ID
    ? getPlatformRoleIds(authContextLike)
    : toArray(getCurrentTenant(authContextLike)?.role_id);

  return toUniqueArray(roleIds.flatMap((roleId) => permissionCodesByRoleId[roleId] || []));
};

const getPermissionCodes = (authContextLike = {}) => {
  const directPermissionCodes = toArray(authContextLike.permissionCodes || authContextLike.permissions);

  if (directPermissionCodes.length) {
    return toUniqueArray(directPermissionCodes);
  }

  return getAccessControlPermissionCodes(authContextLike);
};

const getTenantModuleCodes = (authContextLike = {}) => {
  const directModuleCodes = toArray(
    authContextLike.tenantModuleCodes
      || authContextLike.enabledModuleCodes
      || authContextLike.moduleCodes
  );

  if (directModuleCodes.length) {
    return toUniqueArray(directModuleCodes);
  }

  const tenantId = getTenantId(authContextLike);
  const accessControl = authContextLike.accessControl || {};
  return toUniqueArray(accessControl.tenantModuleCodesByTenantId?.[tenantId] || []);
};

const getPlatformRoleCodes = (authContextLike = {}) => {
  const roleCodes = toArray(authContextLike.platformRoles).map((role) => (
    role?.role_code || role?.code || role?.id || role
  ));

  const userRoleCode = authContextLike.user?.role;
  return userRoleCode ? [...roleCodes, userRoleCode] : roleCodes;
};

const hasPlatformAccess = (authContextLike = {}) => {
  if (authContextLike.hasPlatformAccess) return true;
  return getPlatformRoleCodes(authContextLike).some((roleCode) => PLATFORM_ROLE_CODES.has(roleCode));
};

const hasPermissionAccess = (authContextLike = {}, item = {}) => {
  const requiredPermissionCodes = toArray(item.permissionCodes);
  if (!requiredPermissionCodes.length) return true;

  const permissionSet = new Set(getPermissionCodes(authContextLike));
  if (item.match === 'all') {
    return requiredPermissionCodes.every((permissionCode) => permissionSet.has(permissionCode));
  }

  return requiredPermissionCodes.some((permissionCode) => permissionSet.has(permissionCode));
};

const hasModuleAccess = (authContextLike = {}, item = {}) => {
  if (!item.moduleId && !item.moduleCode) return true;

  if (item.moduleId && typeof authContextLike.canAccessModule === 'function') {
    return Boolean(authContextLike.canAccessModule(item.moduleId));
  }

  if (item.moduleId) {
    return canAccessModuleByRule(item.moduleId, {
      permissionCodes: getPermissionCodes(authContextLike),
      enabledModuleCodes: getTenantModuleCodes(authContextLike),
    });
  }

  const tenantModuleSet = new Set(getTenantModuleCodes(authContextLike));
  return tenantModuleSet.has(item.moduleCode);
};

const normalizePathname = (pathname = '/') => {
  if (pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
};

export const PORTAL_SHELL_ITEMS = SOURCE_PORTAL_SHELL_ITEMS.filter(item => ['/omnichannel','/agenda','/modo-recepcao','/pacientes','/prontuario','/financeiro','/estoque'].includes(item.path));

const splitRouteTarget = (routeTarget = '/') => {
  if (typeof routeTarget === 'object' && routeTarget !== null) {
    return {
      pathname: normalizePathname(routeTarget.pathname || '/'),
      search: routeTarget.search || '',
    };
  }

  const [pathWithHash, hashlessSearch = ''] = String(routeTarget || '/').split('?');
  const [pathname] = pathWithHash.split('#');
  const [search] = hashlessSearch.split('#');

  return {
    pathname: normalizePathname(pathname || '/'),
    search: search ? `?${search}` : '',
  };
};

const itemMatchesRouteTarget = (item = {}, routeTarget = {}) => {
  const itemTarget = splitRouteTarget(item.path);

  if (itemTarget.search) {
    return itemTarget.pathname === routeTarget.pathname && itemTarget.search === routeTarget.search;
  }

  return routeTarget.pathname === itemTarget.pathname
    || routeTarget.pathname.startsWith(`${itemTarget.pathname}/`);
};

export const isPlatformOnlyItem = (item = {}) => {
  return item.scope === PORTAL_SHELL_SCOPES.PLATFORM;
};

export const isTenantModuleItem = (item = {}) => {
  return item.scope === PORTAL_SHELL_SCOPES.TENANT && Boolean(item.moduleId || item.moduleCode);
};

export const canAccessPortalItem = (authContextLike = {}, item = {}) => {
  if (!item?.path || item.blocked === true) return false;

  if (isPlatformOnlyItem(item)) {
    return hasPlatformAccess(authContextLike);
  }

  if (item.scope !== PORTAL_SHELL_SCOPES.TENANT) {
    return false;
  }

  if (!hasTenantContext(authContextLike)) {
    return false;
  }

  if (authContextLike.isSupabaseMode === false) {
    return true;
  }

  return hasModuleAccess(authContextLike, item) && hasPermissionAccess(authContextLike, item);
};

export const getAuthorizedMenuItems = (authContextLike = {}) => {
  return PORTAL_SHELL_ITEMS.filter(item => canAccessPortalItem(authContextLike, item)
    && (authContextLike.currentTenantId !== 'tenant_harbor' || ['/omnichannel', '/pacientes'].includes(item.path)));
};

export const getPortalShellItemForPath = (routeTarget = '/') => {
  const normalizedRouteTarget = splitRouteTarget(routeTarget);
  const exactItem = PORTAL_SHELL_ITEMS.find((item) => {
    const itemTarget = splitRouteTarget(item.path);
    return itemTarget.pathname === normalizedRouteTarget.pathname
      && itemTarget.search === normalizedRouteTarget.search;
  });

  if (exactItem) return exactItem;

  return [...PORTAL_SHELL_ITEMS]
    .filter((item) => itemMatchesRouteTarget(item, normalizedRouteTarget))
    .sort((first, second) => splitRouteTarget(second.path).pathname.length - splitRouteTarget(first.path).pathname.length)[0]
    || null;
};

export const canAccessPortalRoute = (authContextLike = {}, routeTarget = '/') => {
  const item = getPortalShellItemForPath(routeTarget);

  if (!item) return true;

  return canAccessPortalItem(authContextLike, item);
};

export const getFirstAuthorizedRoute = (authContextLike = {}) => {
  const firstItem = [...getAuthorizedMenuItems(authContextLike)]
    .sort((first, second) => first.defaultRoutePriority - second.defaultRoutePriority)[0];

  return firstItem?.path || null;
};
