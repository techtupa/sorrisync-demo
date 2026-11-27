import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getPlanByName, getRolePermissions } from '@/data/mockTenants';
import {
  fetchAuthAccessControlContext,
  getTenantById as getSwitcherTenantById,
  getTenantsByUser,
} from '@/repositories/index.js';
import {
  canAccessModuleByRule,
  isValidClinicRoleForTenant,
  isValidPlatformRole,
  normalizePermissionCodes,
} from '@/repositories/accessControlContract.js';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient.js';
import {
  DEFAULT_CLINIC_TENANT_ID,
  MASTER_TENANT_ID,
  isKnownTenantId,
} from '@/lib/routeContext.js';

const AuthContext = createContext(null);

const STORAGE_KEYS = {
  user: 'portfolio_user',
  currentTenantId: 'portfolio_current_tenant_id',
  legacyAuthTenant: 'portfolio_tenant',
  legacyTenantContext: 'portfolio_tenant_id',
};

const PLATFORM_ACCESS_ROLES = ['platform_admin', 'platform_support'];

const EMPTY_ACCESS_CONTROL = {
  permissionCodesByRoleId: {},
  tenantModuleCodesByTenantId: {},
};

const PLAN_LABELS = {
  essential: 'Essencial',
  professional: 'Profissional',
  premium: 'Premium',
  enterprise: 'Enterprise',
};

const STATUS_LABELS = {
  active: 'Ativa',
  trial: 'Trial',
  suspended: 'Suspensa',
  canceled: 'Cancelada',
  inactive: 'Inativa',
};

const MASTER_CONTEXT = {
  id: MASTER_TENANT_ID,
  tenant_id: MASTER_TENANT_ID,
  slug: MASTER_TENANT_ID,
  name: 'SorriSync Master',
  plan: 'Master',
  status: 'Sistema',
  domain: 'admin.sorrisync.example.invalid',
  subdomain: 'master',
  active_users: 0,
  active_modules: ['Global Access', 'Billing', 'Feature Flags', 'Support'],
  user_profile: 'Master SaaS',
  health_score: 100,
  metadata: {
    color: 'master-control',
    specialty: 'Platform Admin',
  },
  isPlatformContext: true,
  source: 'supabase',
};

const normalizeTenantId = (tenantId) => {
  return isKnownTenantId(tenantId) ? tenantId : DEFAULT_CLINIC_TENANT_ID;
};

const readStoredTenantId = () => {
  return normalizeTenantId(
    localStorage.getItem(STORAGE_KEYS.currentTenantId) ||
    localStorage.getItem(STORAGE_KEYS.legacyTenantContext) ||
    localStorage.getItem(STORAGE_KEYS.legacyAuthTenant) ||
    DEFAULT_CLINIC_TENANT_ID
  );
};

const persistMockTenantId = (tenantId) => {
  const normalizedTenantId = normalizeTenantId(tenantId);
  localStorage.setItem(STORAGE_KEYS.currentTenantId, normalizedTenantId);
  localStorage.removeItem(STORAGE_KEYS.legacyAuthTenant);
  localStorage.removeItem(STORAGE_KEYS.legacyTenantContext);
  return normalizedTenantId;
};

const persistSupabaseTenantId = (tenantId) => {
  if (tenantId) {
    localStorage.setItem(STORAGE_KEYS.currentTenantId, tenantId);
  } else {
    localStorage.removeItem(STORAGE_KEYS.currentTenantId);
  }

  localStorage.removeItem(STORAGE_KEYS.legacyAuthTenant);
  localStorage.removeItem(STORAGE_KEYS.legacyTenantContext);
  return tenantId;
};

const getRelationValue = (value) => {
  return Array.isArray(value) ? value[0] : value;
};

const formatPlan = (plan) => PLAN_LABELS[plan] || plan || 'Plano não informado';
const formatStatus = (status) => STATUS_LABELS[status] || status || 'Ativo visual';

const mapSupabaseTenantMembership = (membership) => {
  const tenant = getRelationValue(membership?.tenants);
  const role = getRelationValue(membership?.roles);

  if (!tenant) return null;
  if (!isValidClinicRoleForTenant(role, tenant.id)) return null;

  return {
    id: tenant.id,
    tenant_id: tenant.id,
    slug: tenant.slug,
    name: tenant.name || 'Clínica',
    plan: formatPlan(tenant.plan),
    plan_code: tenant.plan,
    status: formatStatus(tenant.status),
    status_code: tenant.status,
    domain: tenant.custom_domain || '',
    customDomain: tenant.custom_domain || '',
    subdomain: tenant.subdomain || '',
    active_users: 0,
    active_modules: [],
    user_profile: role?.name || 'Usuário da clínica',
    role_id: role?.id || membership.role_id || null,
    role_code: role?.code || null,
    role_scope: role?.scope || null,
    health_score: null,
    last_access: null,
    next_action: null,
    metadata: tenant.metadata || {},
    membership_id: membership.id,
    membership_status: membership.status,
    source: 'supabase',
  };
};

const mapSupabasePlatformAccess = (platformUser) => {
  const role = getRelationValue(platformUser?.roles);

  if (!isValidPlatformRole(role)) return null;

  return {
    id: platformUser.id,
    status: platformUser.status,
    metadata: platformUser.metadata || {},
    role,
    role_id: role?.id || platformUser.role_id || null,
    role_code: role?.code || null,
    role_name: role?.name || 'Usuário da plataforma',
    role_scope: role?.scope || null,
  };
};

const mapSupabaseUser = (authUser, profile) => ({
  id: authUser.id,
  name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email || 'Usuário',
  email: profile?.email || authUser.email,
  role: profile?.is_platform_user ? 'platform_user' : 'clinic_user',
  avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url || null,
  source: 'supabase',
});

const resolveSupabaseTenantId = (tenants, hasPlatformAccess) => {
  const storedTenantId = localStorage.getItem(STORAGE_KEYS.currentTenantId);

  if (storedTenantId === MASTER_TENANT_ID && hasPlatformAccess) {
    return MASTER_TENANT_ID;
  }

  if (tenants.some((tenant) => tenant.tenant_id === storedTenantId)) {
    return storedTenantId;
  }

  return tenants[0]?.tenant_id || (hasPlatformAccess ? MASTER_TENANT_ID : null);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const isSupabaseMode = isSupabaseConfigured && Boolean(supabase);
  const [user, setUser] = useState(null);
  const [currentTenantId, setCurrentTenantId] = useState(DEFAULT_CLINIC_TENANT_ID);
  const [availableTenants, setAvailableTenants] = useState([]);
  const [supabaseProfile, setSupabaseProfile] = useState(null);
  const [platformRoles, setPlatformRoles] = useState([]);
  const [accessControl, setAccessControl] = useState(EMPTY_ACCESS_CONTROL);
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authRevalidating, setAuthRevalidating] = useState(false);
  const hasInitializedAuthRef = useRef(false);

  const hasPlatformAccess = platformRoles.some((platformRole) => {
    return PLATFORM_ACCESS_ROLES.includes(platformRole.role_code);
  });

  const getAvailableTenantsForMode = useCallback(() => {
    if (!isSupabaseMode) {
      return getTenantsByUser(user?.id || 'usr_1');
    }

    return hasPlatformAccess ? [...availableTenants, MASTER_CONTEXT] : availableTenants;
  }, [availableTenants, hasPlatformAccess, isSupabaseMode, user?.id]);

  const initializeMockContext = useCallback(() => {
    const storedUser = localStorage.getItem(STORAGE_KEYS.user);
    const storedTenant = readStoredTenantId();

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(STORAGE_KEYS.user);
        setUser(null);
      }
    } else {
      setUser(null);
    }

    setSupabaseProfile(null);
    setPlatformRoles([]);
    setAccessControl(EMPTY_ACCESS_CONTROL);
    setAvailableTenants(getTenantsByUser('usr_1'));
    setCurrentTenantId(storedTenant);
    persistMockTenantId(storedTenant);
    setAuthError(null);
    setAuthRevalidating(false);
    hasInitializedAuthRef.current = true;
    setLoading(false);
  }, []);

  const clearSupabaseContext = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.user);
    setUser(null);
    setSupabaseProfile(null);
    setPlatformRoles([]);
    setAccessControl(EMPTY_ACCESS_CONTROL);
    setAvailableTenants([]);
    setCurrentTenantId(null);
  }, []);

  const refreshAuthContext = useCallback(async ({ background = false } = {}) => {
    if (!isSupabaseMode || !supabase) {
      initializeMockContext();
      return null;
    }

    const shouldUseBackground = background && hasInitializedAuthRef.current;
    if (shouldUseBackground) {
      setAuthRevalidating(true);
    } else {
      setLoading(true);
      setAuthRevalidating(false);
    }
    setAuthError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        clearSupabaseContext();
        return null;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const authUser = userData.user;
      if (!authUser) {
        clearSupabaseContext();
        return null;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, avatar_url, status, is_platform_user, metadata')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) throw profileError;

      const { data: tenantMemberships, error: tenantUsersError } = await supabase
        .from('tenant_users')
        .select(`
          id,
          role_id,
          status,
          metadata,
          tenants (
            id,
            slug,
            name,
            status,
            plan,
            subdomain,
            custom_domain,
            metadata
          ),
          roles (
            id,
            code,
            name,
            scope,
            tenant_id
          )
        `)
        .eq('user_id', authUser.id)
        .eq('status', 'active');

      if (tenantUsersError) throw tenantUsersError;

      const { data: platformUsers, error: platformUsersError } = await supabase
        .from('platform_users')
        .select(`
          id,
          role_id,
          status,
          metadata,
          roles (
            id,
            code,
            name,
            scope,
            tenant_id
          )
        `)
        .eq('user_id', authUser.id)
        .eq('status', 'active');

      if (platformUsersError) throw platformUsersError;

      const mappedTenants = (tenantMemberships || [])
        .map(mapSupabaseTenantMembership)
        .filter(Boolean);
      const mappedPlatformRoles = (platformUsers || [])
        .map(mapSupabasePlatformAccess)
        .filter(Boolean);
      const nextHasPlatformAccess = mappedPlatformRoles.some((platformRole) => {
        return PLATFORM_ACCESS_ROLES.includes(platformRole.role_code);
      });
      const nextTenantId = resolveSupabaseTenantId(mappedTenants, nextHasPlatformAccess);
      const nextAccessControl = await fetchAuthAccessControlContext({
        tenantRoleIds: mappedTenants.map((tenant) => tenant.role_id),
        platformRoleIds: mappedPlatformRoles.map((platformRole) => platformRole.role_id),
        tenantIds: mappedTenants.map((tenant) => tenant.tenant_id),
      });

      setUser(mapSupabaseUser(authUser, profileData));
      setSupabaseProfile(profileData);
      setAvailableTenants(mappedTenants);
      setPlatformRoles(mappedPlatformRoles);
      setAccessControl(nextAccessControl);
      setCurrentTenantId(nextTenantId);
      persistSupabaseTenantId(nextTenantId);
      localStorage.removeItem(STORAGE_KEYS.user);

      return {
        user: authUser,
        profile: profileData,
        availableTenants: mappedTenants,
        platformRoles: mappedPlatformRoles,
        accessControl: nextAccessControl,
        currentTenantId: nextTenantId,
      };
    } catch {
      setAuthError('Não foi possível carregar seu perfil de acesso. Verifique as permissões da fundação Supabase.');
      if (!shouldUseBackground) {
        clearSupabaseContext();
      }
      return null;
    } finally {
      hasInitializedAuthRef.current = true;
      if (shouldUseBackground) {
        setAuthRevalidating(false);
      } else {
        setLoading(false);
        setAuthRevalidating(false);
      }
    }
  }, [clearSupabaseContext, initializeMockContext, isSupabaseMode]);

  useEffect(() => {
    refreshAuthContext();

    if (!isSupabaseMode || !supabase) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      refreshAuthContext({
        background: hasInitializedAuthRef.current && Boolean(session),
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isSupabaseMode, refreshAuthContext]);

  const login = useCallback((email, _password) => {
    const mockUser = {
      id: '1',
      name: 'Morgan Reed',
      email,
      role: 'clinic_admin',
      avatar: null,
    };

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(mockUser));
    persistMockTenantId(currentTenantId || DEFAULT_CLINIC_TENANT_ID);
    setUser(mockUser);
    setAvailableTenants(getTenantsByUser(mockUser.id));
    setAccessControl(EMPTY_ACCESS_CONTROL);
    setAuthError(null);
    return mockUser;
  }, [currentTenantId]);

  const signInWithPassword = useCallback(async (email, password) => {
    if (!isSupabaseMode || !supabase) {
      return login(email, password);
    }

    setLoading(true);
    setAuthError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError('E-mail ou senha inválidos.');
      setLoading(false);
      throw error;
    }

    const context = await refreshAuthContext();
    if (!context) {
      setAuthError('Login realizado, mas não foi possível carregar seu perfil de acesso.');
      throw new Error('auth_context_failed');
    }

    return context;
  }, [isSupabaseMode, login, refreshAuthContext]);

  const sendInviteAccessLink = useCallback(async ({ email, invitePath } = {}) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPath = String(invitePath || '').trim();

    if (!normalizedEmail || !normalizedPath.startsWith('/aceitar-convite/')) {
      throw new Error('SS_AUTH_INVITE_MAGIC_LINK_INVALID_INPUT');
    }

    if (!isSupabaseMode || !supabase) {
      return { sent: false, source: 'mock' };
    }

    const emailRedirectTo = new URL(normalizedPath, window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo,
      },
    });

    if (error) throw error;
    return { sent: true, source: 'supabase' };
  }, [isSupabaseMode]);

  const logout = useCallback(async () => {
    if (isSupabaseMode && supabase) {
      await supabase.auth.signOut();
      clearSupabaseContext();
      persistSupabaseTenantId(null);
      setAuthRevalidating(false);
      setLoading(false);
      return;
    }

    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.currentTenantId);
    localStorage.removeItem(STORAGE_KEYS.legacyAuthTenant);
    localStorage.removeItem(STORAGE_KEYS.legacyTenantContext);
    setUser(null);
    setCurrentTenantId(DEFAULT_CLINIC_TENANT_ID);
    setAvailableTenants(getTenantsByUser('usr_1'));
    setSupabaseProfile(null);
    setPlatformRoles([]);
    setAccessControl(EMPTY_ACCESS_CONTROL);
    setAuthError(null);
    setAuthRevalidating(false);
  }, [clearSupabaseContext, isSupabaseMode]);

  const switchTenant = useCallback((tenantId) => {
    if (!tenantId) return;

    if (isSupabaseMode) {
      const canUseMasterContext = tenantId === MASTER_TENANT_ID && hasPlatformAccess;
      const canUseClinicalTenant = availableTenants.some((tenant) => tenant.tenant_id === tenantId);

      if (!canUseMasterContext && !canUseClinicalTenant) return;

      persistSupabaseTenantId(tenantId);
      setCurrentTenantId(tenantId);
      return;
    }

    const normalizedTenantId = persistMockTenantId(tenantId);
    setCurrentTenantId(normalizedTenantId);
  }, [availableTenants, hasPlatformAccess, isSupabaseMode]);

  const getCurrentTenantData = useCallback(() => {
    if (isSupabaseMode) {
      return getAvailableTenantsForMode().find((tenant) => tenant.tenant_id === currentTenantId) || null;
    }

    return getSwitcherTenantById(currentTenantId) || null;
  }, [currentTenantId, getAvailableTenantsForMode, isSupabaseMode]);

  const getCurrentPlan = () => {
    const tenant = getCurrentTenantData();
    return tenant ? getPlanByName(tenant.plan) : null;
  };

  const getUserRole = () => {
    if (!user) return null;

    if (isSupabaseMode) {
      const tenant = getCurrentTenantData();
      const platformRole = platformRoles.find((role) => PLATFORM_ACCESS_ROLES.includes(role.role_code));

      return {
        id: tenant?.role_code || platformRole?.role_code || user.role,
        name: tenant?.user_profile || platformRole?.role_name || 'Usuário',
        scope: tenant?.role_scope || platformRole?.role_scope || 'clinic',
      };
    }

    return getRolePermissions(user.role);
  };

  const getCurrentProfile = () => {
    if (isSupabaseMode) {
      return getCurrentTenantData()?.user_profile
        || supabaseProfile?.full_name
        || getUserRole()?.name
        || 'Usuário';
    }

    return getCurrentTenantData()?.user_profile || getUserRole()?.name || 'Usuário';
  };

  const currentPermissionCodes = useMemo(() => {
    if (!isSupabaseMode || !user) return [];

    if (currentTenantId === MASTER_TENANT_ID) {
      return normalizePermissionCodes(
        platformRoles.flatMap((platformRole) => {
          return accessControl.permissionCodesByRoleId?.[platformRole.role_id] || [];
        })
      );
    }

    const tenant = availableTenants.find((tenantItem) => tenantItem.tenant_id === currentTenantId);
    return normalizePermissionCodes(accessControl.permissionCodesByRoleId?.[tenant?.role_id] || []);
  }, [
    accessControl.permissionCodesByRoleId,
    availableTenants,
    currentTenantId,
    isSupabaseMode,
    platformRoles,
    user,
  ]);

  const currentTenantModuleCodes = useMemo(() => {
    if (!isSupabaseMode || !currentTenantId || currentTenantId === MASTER_TENANT_ID) return [];

    return normalizePermissionCodes(accessControl.tenantModuleCodesByTenantId?.[currentTenantId] || []);
  }, [accessControl.tenantModuleCodesByTenantId, currentTenantId, isSupabaseMode]);

  const hasPermission = useCallback((permissionCode) => {
    if (!permissionCode || !user) return false;

    if (!isSupabaseMode) {
      const readOnly = currentTenantId === 'tenant_harbor';
      return !readOnly || /\.read$/.test(permissionCode);
    }

    return currentPermissionCodes.includes(permissionCode);
  }, [currentPermissionCodes, currentTenantId, isSupabaseMode, user]);

  const canAccessModule = (moduleId) => {
    if (isSupabaseMode) {
      if (!user || currentTenantId === MASTER_TENANT_ID) return false;

      return canAccessModuleByRule(moduleId, {
        permissionCodes: currentPermissionCodes,
        enabledModuleCodes: currentTenantModuleCodes,
      });
    }

    return Boolean(user && ['mod_omnichannel', 'mod_agenda', 'mod_crm', 'mod_prontuario', 'mod_tratamentos', 'mod_clinical_records', 'mod_financeiro', 'mod_estoque', 'mod_servicos'].includes(moduleId));
  };

  const value = {
    user,
    currentTenantId,
    currentTenant: getCurrentTenantData(),
    currentProfile: getCurrentProfile(),
    currentPlan: getCurrentPlan(),
    availableTenants: getAvailableTenantsForMode(),
    platformRoles,
    accessControl,
    permissionCodes: currentPermissionCodes,
    tenantModuleCodes: currentTenantModuleCodes,
    hasPlatformAccess,
    authError,
    authRevalidating,
    authMode: isSupabaseMode ? 'supabase' : 'mock',
    isSupabaseMode,
    isSupabaseConfigured,
    login,
    logout,
    signInWithPassword,
    sendInviteAccessLink,
    signOut: logout,
    refreshAuthContext,
    switchTenant,
    getCurrentTenantData,
    getUserRole,
    hasPermission,
    canAccessModule,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
