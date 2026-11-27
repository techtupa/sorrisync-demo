import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  createMockOperationalFollowUpByTenant,
  getMockOperationalFollowUpsByTenant,
  listMockOperationalFollowUpAssigneesByTenant,
  mutateMockOperationalFollowUpByTenant,
} from '../mock/operationalFollowUpsRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const followUpSelect = `
  id,
  tenant_id,
  source_type,
  source_id,
  status,
  priority,
  due_at,
  assigned_user_id,
  resolution_code,
  resolved_at,
  created_at,
  updated_at
`;

const mapFollowUp = (row = {}) => ({
  id: row.id,
  tenantId: row.tenant_id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  status: row.status,
  priority: row.priority,
  dueAt: row.due_at || null,
  assignedUserId: row.assigned_user_id || null,
  resolutionCode: row.resolution_code || null,
  resolvedAt: row.resolved_at || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRpcItem = (payload) => mapFollowUp(payload?.item || {});

export const fetchOperationalFollowUpsByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getMockOperationalFollowUpsByTenant(tenantId);
  }

  const response = await supabase
    .from('operational_follow_ups')
    .select(followUpSelect)
    .eq('tenant_id', tenantId)
    .order('updated_at', { ascending: false });

  if (response.error) {
    const fallback = await getMockOperationalFollowUpsByTenant(tenantId);
    return { ...fallback, source: 'fallback' };
  }

  return {
    items: (response.data || []).map(mapFollowUp),
    source: 'supabase',
  };
};

export const createOperationalFollowUpByTenant = async (tenantId, payload = {}) => {
  if (!hasSupabase() || !tenantId) {
    return createMockOperationalFollowUpByTenant(tenantId, payload);
  }

  const response = await supabase.rpc('create_operational_follow_up', {
    p_due_at: payload.dueAt || null,
    p_priority: payload.priority || 'normal',
    p_source_id: payload.sourceId,
    p_source_type: payload.sourceType,
    p_tenant_id: tenantId,
  });

  if (response.error) throw response.error;

  return {
    item: mapRpcItem(response.data),
    replayed: Boolean(response.data?.replayed),
    source: 'supabase',
  };
};

export const mutateOperationalFollowUpByTenant = async (tenantId, followUpId, mutation = {}) => {
  if (!hasSupabase() || !tenantId) {
    return mutateMockOperationalFollowUpByTenant(tenantId, followUpId, mutation);
  }

  const response = await supabase.rpc('mutate_operational_follow_up', {
    p_action: mutation.action,
    p_assigned_user_id: mutation.assignedUserId || null,
    p_due_at: mutation.dueAt || null,
    p_follow_up_id: followUpId,
    p_priority: mutation.priority || null,
    p_resolution_code: mutation.resolutionCode || null,
    p_tenant_id: tenantId,
  });

  if (response.error) throw response.error;

  return { item: mapRpcItem(response.data), source: 'supabase' };
};

export const fetchOperationalFollowUpAssigneesByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return listMockOperationalFollowUpAssigneesByTenant(tenantId);
  }

  const response = await supabase.rpc('list_operational_follow_up_assignees', {
    p_tenant_id: tenantId,
  });

  if (response.error) {
    const fallback = await listMockOperationalFollowUpAssigneesByTenant(tenantId);
    return { ...fallback, source: 'fallback' };
  }

  return {
    source: 'supabase',
    users: (response.data || []).map((user) => ({
      id: user.user_id,
      displayName: user.display_name || 'Membro da equipe',
    })),
  };
};
