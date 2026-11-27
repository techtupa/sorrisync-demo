import { supabase, supabaseUrl } from '@/lib/supabaseClient.js';
import {
  USERS_PERMISSION_MODULES,
  buildTenantUserInvitePath,
  buildPermissionsMatrix,
  formatRoleName,
  formatStatusLabel,
  getDisplayModulesForPermissionCodes,
  getRelationValue,
  isValidClinicRoleForTenant,
  normalizePermissionCodes,
} from '../accessControlContract.js';

const EMPTY_ACCESS_CONTROL = {
  permissionCodesByRoleId: {},
  tenantModuleCodesByTenantId: {},
  source: 'supabase',
};

const getUniqueValues = (values = []) => {
  return [...new Set(values.filter(Boolean))];
};

const mapPermissionRowsByRoleId = (rows = []) => {
  return rows.reduce((acc, row) => {
    const permission = getRelationValue(row.permissions);
    if (!row.role_id || !permission?.code) return acc;

    if (!acc[row.role_id]) {
      acc[row.role_id] = [];
    }

    acc[row.role_id].push(permission.code);
    return acc;
  }, {});
};

const fetchPermissionCodesByRoleId = async (roleIds = []) => {
  const uniqueRoleIds = getUniqueValues(roleIds);
  if (!uniqueRoleIds.length) return {};

  const { data, error } = await supabase
    .from('role_permissions')
    .select(`
      role_id,
      permissions (
        code,
        module,
        action
      )
    `)
    .in('role_id', uniqueRoleIds);

  if (error) throw error;

  const grouped = mapPermissionRowsByRoleId(data || []);

  return uniqueRoleIds.reduce((acc, roleId) => {
    acc[roleId] = normalizePermissionCodes(grouped[roleId] || []);
    return acc;
  }, {});
};

const fetchTenantModuleCodesByTenantId = async (tenantIds = []) => {
  const uniqueTenantIds = getUniqueValues(tenantIds);
  if (!uniqueTenantIds.length) return {};

  const { data, error } = await supabase
    .from('tenant_modules')
    .select('tenant_id, module_code, enabled')
    .in('tenant_id', uniqueTenantIds);

  if (error) throw error;

  const grouped = (data || []).reduce((acc, row) => {
    if (!row.tenant_id || !row.enabled || !row.module_code) return acc;

    if (!acc[row.tenant_id]) {
      acc[row.tenant_id] = [];
    }

    acc[row.tenant_id].push(row.module_code);
    return acc;
  }, {});

  return uniqueTenantIds.reduce((acc, tenantId) => {
    acc[tenantId] = normalizePermissionCodes(grouped[tenantId] || []);
    return acc;
  }, {});
};

const fetchClinicRolesByTenant = async (tenantId) => {
  const { data: globalRoles, error: globalRolesError } = await supabase
    .from('roles')
    .select('id, tenant_id, code, name, scope, description, is_system, created_at, updated_at')
    .eq('scope', 'clinic')
    .is('tenant_id', null)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (globalRolesError) throw globalRolesError;

  const { data: tenantRoles, error: tenantRolesError } = await supabase
    .from('roles')
    .select('id, tenant_id, code, name, scope, description, is_system, created_at, updated_at')
    .eq('scope', 'clinic')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });

  if (tenantRolesError) throw tenantRolesError;

  return [...(globalRoles || []), ...(tenantRoles || [])].map((role) => ({
    id: role.id,
    tenant_id: role.tenant_id,
    code: role.code,
    name: formatRoleName(role),
    scope: role.scope,
    description: role.description || 'Perfil clinico com permissoes controladas por Supabase.',
    status: role.is_system ? 'Sistema' : 'Ativo',
    is_system: Boolean(role.is_system),
    users_count: 0,
    created_at: role.created_at,
    updated_at: role.updated_at,
    source: 'supabase',
  }));
};

const fetchTenantMemberships = async (tenantId) => {
  const { data, error } = await supabase
    .from('tenant_users')
    .select(`
      id,
      tenant_id,
      user_id,
      role_id,
      status,
      accepted_at,
      created_at,
      updated_at,
      roles (
        id,
        code,
        name,
        scope,
        tenant_id,
        is_system
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data || [];
};

const fetchProfilesByUserId = async (userIds = []) => {
  const uniqueUserIds = getUniqueValues(userIds);
  if (!uniqueUserIds.length) return {};

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, status, metadata, created_at, updated_at')
    .in('id', uniqueUserIds);

  if (error) throw error;

  return (data || []).reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {});
};

export const fetchAuthAccessControlContext = async ({
  tenantRoleIds = [],
  platformRoleIds = [],
  tenantIds = [],
} = {}) => {
  if (!supabase) return EMPTY_ACCESS_CONTROL;

  const roleIds = getUniqueValues([...tenantRoleIds, ...platformRoleIds]);
  const [permissionCodesByRoleId, tenantModuleCodesByTenantId] = await Promise.all([
    fetchPermissionCodesByRoleId(roleIds),
    fetchTenantModuleCodesByTenantId(tenantIds),
  ]);

  return {
    permissionCodesByRoleId,
    tenantModuleCodesByTenantId,
    source: 'supabase',
  };
};

export const updateTenantMemberRole = async ({ membershipId, roleId } = {}) => {
  if (!supabase) {
    throw new Error('SS_AUTH_SUPABASE_UNAVAILABLE');
  }

  if (!membershipId || !roleId) {
    throw new Error('SS_AUTH_INVALID_INPUT');
  }

  const { data, error } = await supabase
    .rpc('update_tenant_member_role', {
      p_membership_id: membershipId,
      p_role_id: roleId,
    })
    .single();

  if (error) throw error;

  return {
    membership_id: data?.membership_id || membershipId,
    role_id: data?.role_id || roleId,
    role_code: data?.role_code || null,
    role_name: data?.role_name || null,
    membership_status: data?.membership_status || null,
    changed: Boolean(data?.changed),
    source: 'supabase',
  };
};

const requireInviteSupabase = () => {
  if (!supabase) throw new Error('SS_AUTH_INVITE_SUPABASE_UNAVAILABLE');
};

const mapTenantUserInvite = (row = {}, source = 'supabase') => ({
  id: row.invite_id || row.id || null,
  email_masked: row.email_masked || null,
  role_code: row.role_code || null,
  role_name: row.role_name || null,
  stored_status: row.stored_status || row.status || null,
  effective_status: row.effective_status || row.status || null,
  expires_at: row.expires_at || null,
  created_at: row.created_at || null,
  updated_at: row.updated_at || null,
  source,
});

const mapCreatedTenantUserInvite = (row = {}, source = 'supabase') => {
  const invitation = mapTenantUserInvite(row, source);
  const token = row.invite_token || null;
  return {
    ...invitation,
    invite_path: buildTenantUserInvitePath(token),
  };
};

export const createTenantUserInvite = async ({ membershipId, email, roleId } = {}) => {
  requireInviteSupabase();
  if (!membershipId || !email || !roleId) throw new Error('SS_AUTH_INVITE_INVALID_INPUT');

  const { data, error } = await supabase
    .rpc('create_tenant_user_invite', {
      p_actor_membership_id: membershipId,
      p_email: email,
      p_role_id: roleId,
    })
    .single();

  if (error) throw error;
  return mapCreatedTenantUserInvite(data);
};

const canSimulateTenantInviteEmail = Boolean(
  import.meta.env.DEV && import.meta.env.VITE_TENANT_INVITE_EMAIL_SIMULATION === 'true'
  && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::[0-9]+)?\/?$/.test(supabaseUrl ?? ''),
);

const canUseTenantInviteEmail = canSimulateTenantInviteEmail || Boolean(
  import.meta.env.PROD && /^https:\/\/demo-project\.supabase\.co\/?$/.test(supabaseUrl ?? ''),
);

export const getTenantInviteEmailMode = async (membershipId) => {
  if (!canUseTenantInviteEmail || !supabase || !membershipId) return null;
  const { data, error } = await supabase.functions.invoke('tenant-invite-email', {
    body: { action: 'availability', membershipId },
  });
  if (error) return null;
  const expected = canSimulateTenantInviteEmail ? 'simulation' : 'live';
  return data?.status === expected ? expected : null;
};

export const sendTenantUserInviteEmail = async ({ membershipId, invite, email, operationId }) => {
  if (!canUseTenantInviteEmail || !supabase) return { status: 'disabled' };
  const token = /^\/aceitar-convite\/(ssinv_[a-f0-9]{64})$/.exec(invite?.invite_path ?? '')?.[1];
  if (!token || !membershipId || !invite?.id) return { status: 'cancelled' };
  const { data, error } = await supabase.functions.invoke('tenant-invite-email', {
    body: { membershipId, inviteId: invite.id, email, token, operationId },
  });
  // A lost response cannot distinguish an untouched request from one already accepted.
  return error ? { status: 'unknown' } : data;
};

export const listTenantUserInvites = async ({ membershipId } = {}) => {
  requireInviteSupabase();
  if (!membershipId) throw new Error('SS_AUTH_INVITE_INVALID_INPUT');

  const { data, error } = await supabase.rpc('list_tenant_user_invites', {
    p_actor_membership_id: membershipId,
  });

  if (error) throw error;
  return (data || []).map((row) => mapTenantUserInvite(row));
};

export const revokeTenantUserInvite = async ({ membershipId, inviteId } = {}) => {
  requireInviteSupabase();
  if (!membershipId || !inviteId) throw new Error('SS_AUTH_INVITE_INVALID_INPUT');

  const { data, error } = await supabase
    .rpc('revoke_tenant_user_invite', {
      p_actor_membership_id: membershipId,
      p_invite_id: inviteId,
    })
    .single();

  if (error) throw error;
  return {
    id: data?.invite_id || inviteId,
    effective_status: data?.effective_status || 'revoked',
    changed: Boolean(data?.changed),
    source: 'supabase',
  };
};

export const reissueTenantUserInvite = async ({ membershipId, inviteId } = {}) => {
  requireInviteSupabase();
  if (!membershipId || !inviteId) throw new Error('SS_AUTH_INVITE_INVALID_INPUT');

  const { data, error } = await supabase
    .rpc('reissue_tenant_user_invite', {
      p_actor_membership_id: membershipId,
      p_invite_id: inviteId,
    })
    .single();

  if (error) throw error;
  return mapCreatedTenantUserInvite(data);
};

export const resolveTenantUserInvite = async ({ token } = {}) => {
  requireInviteSupabase();
  if (!token) return { valid: false, effective_status: 'invalid', source: 'supabase' };

  const { data, error } = await supabase
    .rpc('resolve_tenant_user_invite', { p_token: token })
    .single();

  if (error) throw error;
  return {
    valid: Boolean(data?.valid),
    effective_status: data?.effective_status || 'invalid',
    tenant_name: data?.tenant_name || null,
    role_name: data?.role_name || null,
    email_masked: data?.email_masked || null,
    expires_at: data?.expires_at || null,
    source: 'supabase',
  };
};

export const acceptTenantUserInvite = async ({ token } = {}) => {
  requireInviteSupabase();
  if (!token) throw new Error('SS_AUTH_INVITE_INVALID_TOKEN');

  const { data, error } = await supabase
    .rpc('accept_tenant_user_invite', { p_token: token })
    .single();

  if (error) throw error;
  return {
    membership_id: data?.membership_id || null,
    tenant_name: data?.tenant_name || null,
    role_code: data?.role_code || null,
    role_name: data?.role_name || null,
    membership_status: data?.membership_status || null,
    result: data?.result || null,
    source: 'supabase',
  };
};

export const fetchUsersPermissionsDashboardByTenant = async (tenantId) => {
  if (!tenantId) {
    return {
      users: [],
      roles: [],
      matrix: buildPermissionsMatrix(),
      summary: {
        activeUsers: 0,
        pendingInvitations: 0,
        configuredRoles: 0,
        protectedModules: 0,
        accessesToday: 0,
        securityLogs: 0,
      },
      source: 'supabase',
    };
  }

  const [memberships, roles] = await Promise.all([
    fetchTenantMemberships(tenantId),
    fetchClinicRolesByTenant(tenantId),
  ]);
  const safeMemberships = memberships.filter((membership) => {
    return isValidClinicRoleForTenant(getRelationValue(membership.roles), tenantId);
  });
  const profilesByUserId = await fetchProfilesByUserId(safeMemberships.map((membership) => membership.user_id));
  const permissionCodesByRoleId = await fetchPermissionCodesByRoleId(roles.map((role) => role.id));
  const membershipCountByRoleId = safeMemberships.reduce((acc, membership) => {
    acc[membership.role_id] = (acc[membership.role_id] || 0) + 1;
    return acc;
  }, {});
  const rolesWithCounts = roles.map((role) => ({
    ...role,
    users_count: membershipCountByRoleId[role.id] || 0,
    permissions: permissionCodesByRoleId[role.id] || [],
  }));

  const users = safeMemberships.map((membership) => {
    const profile = profilesByUserId[membership.user_id] || {};
    const role = getRelationValue(membership.roles) || {};
    const permissionCodes = permissionCodesByRoleId[membership.role_id] || [];

    return {
      id: membership.id,
      user_id: membership.user_id,
      tenant_id: membership.tenant_id,
      name: profile.full_name || profile.email || 'Usuario da clinica',
      email: profile.email || 'email nao informado',
      role: formatRoleName(role),
      role_code: role.code,
      role_id: membership.role_id,
      role_tenant_id: role.tenant_id,
      role_is_system: role.is_system === true,
      status: formatStatusLabel(membership.status || profile.status),
      status_code: membership.status || profile.status,
      last_access: profile.metadata?.last_access_at || membership.accepted_at || membership.updated_at || membership.created_at,
      modules: getDisplayModulesForPermissionCodes(permissionCodes),
      permissions: permissionCodes,
      created_at: membership.created_at,
      updated_at: membership.updated_at,
      source: 'supabase',
    };
  });

  const matrix = buildPermissionsMatrix({
    roles: rolesWithCounts,
    permissionCodesByRoleId,
  });
  const enabledModuleRows = await fetchTenantModuleCodesByTenantId([tenantId]);

  return {
    users,
    roles: rolesWithCounts,
    matrix,
    summary: {
      activeUsers: users.filter((user) => user.status_code === 'active').length,
      pendingInvitations: users.filter((user) => user.status_code === 'invited').length,
      configuredRoles: rolesWithCounts.length,
      protectedModules: USERS_PERMISSION_MODULES.filter((module) => !module.blocked).length,
      accessesToday: 0,
      securityLogs: 0,
      enabledTenantModules: enabledModuleRows[tenantId]?.length || 0,
    },
    source: 'supabase',
  };
};
