import {
  getPermissionsByRole,
  getRolesByTenant,
  getUsersByTenant,
} from '../../data/mockUsersPermissions.js';
import { FEATURE_FLAGS } from '../../data/mockTenants.js';
import {
  CLINIC_ROLE_CODES,
  KNOWN_CLINIC_ROLE_CODES,
  OPERATIONAL_CLINIC_ROLE_CODES,
  USERS_PERMISSION_MODULES,
  buildPermissionsMatrix,
  buildTenantUserInvitePath,
  canManageTenantMemberRole,
  formatRoleName,
  getDisplayModulesForPermissionCodes,
} from '../accessControlContract.js';

const MOCK_ROLE_PERMISSION_CODES = {
  clinic_owner: [
    'tenant_users.read',
    'tenant_users.manage',
    'roles.read',
    'role_permissions.read',
    'audit_logs.write',
    'clinic_settings.manage',
    'services.manage',
    'patients.manage',
    'appointments.manage',
    'documents.manage',
    'documents.sensitive.read',
  ],
  clinic_admin: [
    'tenant_users.read',
    'tenant_users.manage',
    'roles.read',
    'role_permissions.read',
    'audit_logs.write',
    'clinic_settings.manage',
    'services.manage',
    'patients.manage',
    'appointments.manage',
    'tenant_users.manage',
    'audit_logs.read',
    'documents.manage',
    'documents.sensitive.read',
    'omnichannel.diagnostics.read',
    'omnichannel.diagnostics.manage',
  ],
  dentist: [
    'clinic_settings.read',
    'services.read',
    'patients.manage',
    'appointments.manage',
    'documents.read',
  ],
  receptionist: [
    'clinic_settings.read',
    'services.read',
    'patients.manage',
    'appointments.manage',
  ],
  assistant: [
    'clinic_settings.read',
    'services.read',
    'patients.read',
    'appointments.read',
  ],
};

const roleOverridesByTenant = new Map();
const tenantUserInvitesById = new Map();
const tenantUserInviteMemberships = new Map();
const tenantUserInviteAudit = [];

const normalizeInviteEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  if (
    normalized.length < 6
    || normalized.length > 254
    || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9][a-z0-9.-]*\.[a-z]{2,63}$/.test(normalized)
    || normalized.split('@')[0].length > 64
    || /(^\.|\.$|\.\.)/.test(normalized.split('@')[0])
    || /(^-|-$|\.\.|\.-|-\.)/.test(normalized.split('@')[1])
  ) {
    throw new Error('SS_AUTH_INVITE_EMAIL_INVALID');
  }
  return normalized;
};

const mockHash = (value) => {
  const input = String(value || '');
  let first = 2166136261;
  let second = 2246822519;
  for (let index = 0; index < input.length; index += 1) {
    first = Math.imul(first ^ input.charCodeAt(index), 16777619) >>> 0;
    second = Math.imul(second ^ input.charCodeAt(index), 3266489917) >>> 0;
  }
  const block = `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`;
  return block.repeat(4);
};

const maskInviteEmail = (normalizedEmail) => {
  const [localPart, domain] = normalizedEmail.split('@');
  return `${localPart.slice(0, 1)}${'*'.repeat(Math.max(3, localPart.length - 1))}@${domain}`;
};

const randomInviteToken = () => {
  const values = new Uint8Array(32);
  globalThis.crypto.getRandomValues(values);
  return `ssinv_${[...values].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
};

const getEffectiveInviteStatus = (invite, now = new Date()) => {
  if (invite.status === 'pending' && new Date(invite.expires_at).getTime() <= now.getTime()) return 'expired';
  return invite.status;
};

const mapMockTenantUserInvite = (invite, now = new Date()) => ({
  id: invite.id,
  email_masked: invite.email_masked,
  role_code: invite.role_code,
  role_name: invite.role_name,
  stored_status: invite.status,
  effective_status: getEffectiveInviteStatus(invite, now),
  expires_at: invite.expires_at,
  created_at: invite.created_at,
  updated_at: invite.updated_at,
  source: 'mock',
});

const assertMockInviteManager = ({ actorRoleCode, hasManagePermission }) => {
  if (!hasManagePermission || ![CLINIC_ROLE_CODES.OWNER, CLINIC_ROLE_CODES.ADMIN].includes(actorRoleCode)) {
    throw new Error('SS_AUTH_INVITE_PERMISSION_DENIED');
  }
};

const recordMockInviteAudit = (action, roleCode, previousStatus, nextStatus, actorRoleCode, result) => {
  tenantUserInviteAudit.push({
    action,
    invited_role: roleCode,
    previous_status: previousStatus,
    next_status: nextStatus,
    ...([CLINIC_ROLE_CODES.OWNER, CLINIC_ROLE_CODES.ADMIN].includes(actorRoleCode)
      ? { actor_privilege_class: actorRoleCode === CLINIC_ROLE_CODES.OWNER ? 'owner' : 'admin' }
      : {}),
    result,
    has_expiration: true,
  });
};

const getMockPermissionCodesForRole = (roleCode) => {
  return MOCK_ROLE_PERMISSION_CODES[roleCode] || [];
};

const mapMockRole = (role) => {
  const permissionCodes = getMockPermissionCodesForRole(role.code);

  return {
    ...role,
    tenant_id: null,
    name: formatRoleName(role),
    scope: 'clinic',
    is_system: true,
    permissions: permissionCodes,
  };
};

const getRoleOverrideKey = (tenantId, membershipId) => `${tenantId}:${membershipId}`;

const getMockRoleById = (tenantId, roleId) => {
  return getRolesByTenant(tenantId).map(mapMockRole).find((role) => role.id === roleId) || null;
};

const applyMockRoleOverride = (tenantId, user) => {
  const roleId = roleOverridesByTenant.get(getRoleOverrideKey(tenantId, user.id)) || user.role_id;
  const role = getMockRoleById(tenantId, roleId);
  if (!role || !KNOWN_CLINIC_ROLE_CODES.has(role.code)) return null;

  const permissions = getMockPermissionCodesForRole(role.code);
  return {
    ...user,
    role_id: role.id,
    role_code: role.code,
    role: role.name,
    role_tenant_id: role.tenant_id,
    role_is_system: role.is_system === true,
    status_code: user.status_code || (user.status === 'Ativo' ? 'active' : 'inactive'),
    modules: getDisplayModulesForPermissionCodes(permissions),
    permissions,
    source: 'mock',
  };
};

export const getMockAccessControlContext = ({ tenantIds = [], roleIds = [] } = {}) => {
  const tenantModuleCodesByTenantId = tenantIds.reduce((acc, tenantId) => {
    acc[tenantId] = FEATURE_FLAGS[tenantId] || [];
    return acc;
  }, {});

  const permissionCodesByRoleId = roleIds.reduce((acc, roleId) => {
    const role = getPermissionsByRole(roleId);
    acc[roleId] = role ? ['clinic_settings.manage', 'services.manage', 'patients.manage', 'appointments.manage'] : [];
    return acc;
  }, {});

  return {
    permissionCodesByRoleId,
    tenantModuleCodesByTenantId,
    source: 'mock',
  };
};

export const getMockUsersPermissionsDashboardByTenant = (tenantId) => {
  const users = getUsersByTenant(tenantId)
    .map((user) => applyMockRoleOverride(tenantId, user))
    .filter(Boolean);
  const membershipCountByRoleId = users.reduce((acc, user) => {
    acc[user.role_id] = (acc[user.role_id] || 0) + 1;
    return acc;
  }, {});
  const roles = getRolesByTenant(tenantId).map(mapMockRole).map((role) => ({
    ...role,
    users_count: membershipCountByRoleId[role.id] || 0,
  }));
  const permissionCodesByRoleId = roles.reduce((acc, role) => {
    acc[role.id] = role.permissions || [];
    return acc;
  }, {});
  const matrix = buildPermissionsMatrix({ roles, permissionCodesByRoleId });
  const activeUsers = users.filter((user) => user.status === 'Ativo').length;

  return {
    users,
    roles,
    permissions: getPermissionsByRole(),
    matrix,
    summary: {
      activeUsers,
      pendingInvitations: users.filter((user) => user.status_code === 'invited').length,
      configuredRoles: roles.length,
      protectedModules: USERS_PERMISSION_MODULES.filter((module) => !module.blocked).length,
      accessesToday: 18,
      securityLogs: 32,
    },
    source: 'mock',
  };
};

export const updateMockTenantMemberRoleByTenant = ({
  tenantId,
  membershipId,
  roleId,
  actorRoleCode = CLINIC_ROLE_CODES.OWNER,
  actorUserId = null,
} = {}) => {
  const target = getMockUsersPermissionsDashboardByTenant(tenantId).users
    .find((user) => user.id === membershipId);
  const nextRole = getMockRoleById(tenantId, roleId);

  if (!target) throw new Error('SS_AUTH_TARGET_NOT_FOUND');
  if (!nextRole) throw new Error('SS_AUTH_ROLE_NOT_FOUND');
  if (!KNOWN_CLINIC_ROLE_CODES.has(nextRole.code)) throw new Error('SS_AUTH_ROLE_NOT_ALLOWED');
  if (nextRole.code === CLINIC_ROLE_CODES.OWNER) throw new Error('SS_AUTH_OWNER_ASSIGNMENT_FORBIDDEN');

  const canManage = canManageTenantMemberRole({
    actorRoleCode,
    actorUserId,
    hasManagePermission: true,
    member: target,
    tenantId,
  });
  if (!canManage) throw new Error('SS_AUTH_PERMISSION_DENIED');

  if (
    actorRoleCode === CLINIC_ROLE_CODES.ADMIN
    && !OPERATIONAL_CLINIC_ROLE_CODES.has(nextRole.code)
  ) {
    throw new Error('SS_AUTH_ADMIN_HIERARCHY_FORBIDDEN');
  }

  const changed = target.role_id !== nextRole.id;
  if (changed) {
    roleOverridesByTenant.set(getRoleOverrideKey(tenantId, membershipId), nextRole.id);
  }

  return {
    membership_id: membershipId,
    role_id: nextRole.id,
    role_code: nextRole.code,
    role_name: nextRole.name,
    membership_status: target.status_code,
    changed,
    source: 'mock',
    audit: {
      action: 'tenant_member_role.updated',
      previous_role: target.role_code,
      new_role: nextRole.code,
      actor_privilege_class: actorRoleCode === CLINIC_ROLE_CODES.OWNER ? 'owner' : 'admin',
      target_membership_status: target.status_code,
      result: changed ? 'allowed_changed' : 'allowed_no_change',
    },
  };
};

export const createMockTenantUserInviteByTenant = ({
  tenantId,
  email,
  roleId,
  actorRoleCode = CLINIC_ROLE_CODES.OWNER,
  hasManagePermission = true,
  now = new Date(),
} = {}) => {
  assertMockInviteManager({ actorRoleCode, hasManagePermission });
  if (!tenantId || !roleId) throw new Error('SS_AUTH_INVITE_INVALID_INPUT');

  const role = getMockRoleById(tenantId, roleId);
  if (!role || ![CLINIC_ROLE_CODES.ADMIN, ...OPERATIONAL_CLINIC_ROLE_CODES].includes(role.code)) {
    throw new Error('SS_AUTH_INVITE_ROLE_FORBIDDEN');
  }
  if (actorRoleCode === CLINIC_ROLE_CODES.ADMIN && role.code === CLINIC_ROLE_CODES.ADMIN) {
    throw new Error('SS_AUTH_INVITE_ADMIN_HIERARCHY_FORBIDDEN');
  }

  const normalizedEmail = normalizeInviteEmail(email);
  const emailHash = mockHash(normalizedEmail);
  const duplicate = [...tenantUserInvitesById.values()].find((invite) => (
    invite.tenant_id === tenantId && invite.email_hash === emailHash && invite.status === 'pending'
  ));
  if (duplicate) throw new Error('convite_pending_exists');

  const token = randomInviteToken();
  const createdAt = now.toISOString();
  const invite = {
    id: globalThis.crypto.randomUUID(),
    tenant_id: tenantId,
    email_hash: emailHash,
    email_masked: maskInviteEmail(normalizedEmail),
    role_id: role.id,
    role_code: role.code,
    role_name: role.name,
    token_hash: mockHash(token),
    status: 'pending',
    expires_at: new Date(now.getTime() + (72 * 60 * 60 * 1000)).toISOString(),
    created_at: createdAt,
    updated_at: createdAt,
  };
  tenantUserInvitesById.set(invite.id, invite);
  recordMockInviteAudit('tenant_user_invite.created', role.code, 'none', 'pending', actorRoleCode, 'changed');

  return {
    ...mapMockTenantUserInvite(invite, now),
    invite_path: buildTenantUserInvitePath(token),
  };
};

export const listMockTenantUserInvitesByTenant = ({
  tenantId,
  actorRoleCode = CLINIC_ROLE_CODES.OWNER,
  hasManagePermission = true,
  now = new Date(),
} = {}) => {
  assertMockInviteManager({ actorRoleCode, hasManagePermission });
  return [...tenantUserInvitesById.values()]
    .filter((invite) => invite.tenant_id === tenantId)
    .sort((first, second) => second.created_at.localeCompare(first.created_at))
    .map((invite) => mapMockTenantUserInvite(invite, now));
};

export const revokeMockTenantUserInviteByTenant = ({
  tenantId,
  inviteId,
  actorRoleCode = CLINIC_ROLE_CODES.OWNER,
  hasManagePermission = true,
  now = new Date(),
} = {}) => {
  assertMockInviteManager({ actorRoleCode, hasManagePermission });
  const invite = tenantUserInvitesById.get(inviteId);
  if (!invite || invite.tenant_id !== tenantId) throw new Error('SS_AUTH_INVITE_NOT_FOUND');
  if (invite.status === 'accepted') throw new Error('SS_AUTH_INVITE_ACCEPTED');
  if (invite.status === 'reissued') throw new Error('SS_AUTH_INVITE_REISSUED');

  const previousStatus = getEffectiveInviteStatus(invite, now);
  const changed = invite.status === 'pending';
  if (changed) {
    invite.status = 'revoked';
    invite.updated_at = now.toISOString();
  }
  recordMockInviteAudit('tenant_user_invite.revoked', invite.role_code, previousStatus, 'revoked', actorRoleCode, changed ? 'changed' : 'idempotent');
  return { id: invite.id, effective_status: 'revoked', changed, source: 'mock' };
};

export const reissueMockTenantUserInviteByTenant = ({
  tenantId,
  inviteId,
  actorRoleCode = CLINIC_ROLE_CODES.OWNER,
  hasManagePermission = true,
  now = new Date(),
} = {}) => {
  assertMockInviteManager({ actorRoleCode, hasManagePermission });
  const invite = tenantUserInvitesById.get(inviteId);
  if (!invite || invite.tenant_id !== tenantId) throw new Error('SS_AUTH_INVITE_NOT_FOUND');
  if (invite.status === 'accepted') throw new Error('SS_AUTH_INVITE_ACCEPTED');
  if (invite.status === 'revoked') throw new Error('SS_AUTH_INVITE_REVOKED');
  if (invite.status === 'reissued') throw new Error('SS_AUTH_INVITE_REISSUED');
  if (actorRoleCode === CLINIC_ROLE_CODES.ADMIN && invite.role_code === CLINIC_ROLE_CODES.ADMIN) {
    throw new Error('SS_AUTH_INVITE_ADMIN_HIERARCHY_FORBIDDEN');
  }

  const previousStatus = getEffectiveInviteStatus(invite, now);
  invite.status = 'reissued';
  invite.updated_at = now.toISOString();

  const token = randomInviteToken();
  const createdAt = now.toISOString();
  const nextInvite = {
    ...invite,
    id: globalThis.crypto.randomUUID(),
    token_hash: mockHash(token),
    status: 'pending',
    expires_at: new Date(now.getTime() + (72 * 60 * 60 * 1000)).toISOString(),
    created_at: createdAt,
    updated_at: createdAt,
    reissued_from_id: invite.id,
  };
  tenantUserInvitesById.set(nextInvite.id, nextInvite);
  recordMockInviteAudit('tenant_user_invite.reissued', invite.role_code, previousStatus, 'pending', actorRoleCode, 'changed');
  return {
    ...mapMockTenantUserInvite(nextInvite, now),
    invite_path: buildTenantUserInvitePath(token),
  };
};

export const resolveMockTenantUserInvite = ({ token, now = new Date() } = {}) => {
  const tokenHash = mockHash(String(token || '').trim());
  const invite = [...tenantUserInvitesById.values()].find((candidate) => candidate.token_hash === tokenHash);
  if (!invite) return { valid: false, effective_status: 'invalid', source: 'mock' };

  const effectiveStatus = getEffectiveInviteStatus(invite, now);
  return {
    valid: effectiveStatus === 'pending',
    effective_status: effectiveStatus,
    tenant_name: 'Clínica de demonstração',
    role_name: invite.role_name,
    email_masked: invite.email_masked,
    expires_at: invite.expires_at,
    source: 'mock',
  };
};

export const acceptMockTenantUserInvite = ({ token, userId, userEmail, now = new Date() } = {}) => {
  if (!userId) throw new Error('SS_AUTH_INVITE_AUTHENTICATION_REQUIRED');
  const tokenHash = mockHash(String(token || '').trim());
  const invite = [...tenantUserInvitesById.values()].find((candidate) => candidate.token_hash === tokenHash);
  if (!invite) throw new Error('SS_AUTH_INVITE_INVALID_TOKEN');

  const membershipKey = `${invite.tenant_id}:${userId}`;
  const existingMembership = tenantUserInviteMemberships.get(membershipKey);
  if (invite.status === 'accepted') {
    if (invite.accepted_by === userId && existingMembership?.status === 'active') {
      return { ...existingMembership, result: 'idempotent', source: 'mock' };
    }
    throw new Error('SS_AUTH_INVITE_ACCEPTED');
  }
  if (invite.status === 'revoked') throw new Error('SS_AUTH_INVITE_REVOKED');
  if (invite.status === 'reissued') throw new Error('SS_AUTH_INVITE_REISSUED');
  if (getEffectiveInviteStatus(invite, now) === 'expired') throw new Error('SS_AUTH_INVITE_EXPIRED');
  if (mockHash(normalizeInviteEmail(userEmail)) !== invite.email_hash) throw new Error('SS_AUTH_INVITE_EMAIL_MISMATCH');
  if (existingMembership && existingMembership.status !== 'active') {
    throw new Error('SS_AUTH_INVITE_INACTIVE_MEMBERSHIP');
  }

  const membership = existingMembership || {
    membership_id: globalThis.crypto.randomUUID(),
    membership_status: 'active',
    status: 'active',
    tenant_name: 'Clínica de demonstração',
    role_code: invite.role_code,
    role_name: invite.role_name,
  };
  tenantUserInviteMemberships.set(membershipKey, membership);
  invite.status = 'accepted';
  invite.accepted_by = userId;
  invite.updated_at = now.toISOString();
  recordMockInviteAudit('tenant_user_invite.accepted', invite.role_code, 'pending', 'accepted', null, existingMembership ? 'existing_active' : 'created');
  return { ...membership, result: existingMembership ? 'existing_active' : 'created', source: 'mock' };
};

export const setMockTenantUserInviteMembershipForTests = ({ tenantId, userId, status = 'inactive' } = {}) => {
  tenantUserInviteMemberships.set(`${tenantId}:${userId}`, {
    membership_id: globalThis.crypto.randomUUID(),
    membership_status: status,
    status,
    tenant_name: 'Clínica de demonstração',
    role_code: CLINIC_ROLE_CODES.ASSISTANT,
    role_name: 'Assistente',
  });
};

export const getMockTenantUserInviteAuditForTests = () => [...tenantUserInviteAudit];
