import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getPatientTagAssignmentsByTenant as getMockPatientTagAssignmentsByTenant,
  getPatientTagsByTenant as getMockPatientTagsByTenant,
  getPatientTagsForPatientByTenant as getMockPatientTagsForPatientByTenant,
  getPatientTagSummaryByTenant as getMockPatientTagSummaryByTenant,
} from '../mock/patientTagsRepository.js';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const tagSelect = 'id, tenant_id, code, label, description, color, icon, is_active, sort_order, created_at, updated_at';
const assignmentSelect = 'tenant_id, patient_id, tag_id, assigned_at, created_at';

const sortTags = (tags) => {
  return [...tags].sort((a, b) => {
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return a.label.localeCompare(b.label);
  });
};

const buildAssignmentRows = (assignments, tags) => {
  const tagById = tags.reduce((acc, tag) => {
    acc[tag.id] = tag;
    return acc;
  }, {});

  return assignments
    .map((assignment) => ({
      ...assignment,
      tag: tagById[assignment.tag_id],
    }))
    .filter((assignment) => assignment.tag);
};

const fetchPatientTagsDashboardByTenant = async (tenantId) => {
  const fallback = {
    tags: getMockPatientTagsByTenant(tenantId),
    assignments: getMockPatientTagAssignmentsByTenant(tenantId),
  };

  if (!hasSupabase() || !tenantId) {
    return fallback;
  }

  const [tagsResponse, assignmentsResponse] = await Promise.all([
    supabase
      .from('patient_tags')
      .select(tagSelect)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true }),
    supabase
      .from('patient_tag_assignments')
      .select(assignmentSelect)
      .eq('tenant_id', tenantId)
      .order('assigned_at', { ascending: false }),
  ]);

  if (tagsResponse.error || assignmentsResponse.error) {
    return fallback;
  }

  const tags = sortTags(tagsResponse.data || []);
  if (!tags.length) {
    return fallback;
  }

  return {
    tags,
    assignments: buildAssignmentRows(assignmentsResponse.data || [], tags),
  };
};

export const fetchPatientTagsByTenant = async (tenantId) => {
  return (await fetchPatientTagsDashboardByTenant(tenantId)).tags;
};

export const fetchPatientTagAssignmentsByTenant = async (tenantId) => {
  return (await fetchPatientTagsDashboardByTenant(tenantId)).assignments;
};

export const fetchPatientTagsForPatientByTenant = async (tenantId, patientId) => {
  if (!hasSupabase() || !tenantId || !patientId) {
    return getMockPatientTagsForPatientByTenant(tenantId, patientId);
  }

  const { assignments } = await fetchPatientTagsDashboardByTenant(tenantId);
  return assignments
    .filter((assignment) => assignment.patient_id === patientId)
    .map((assignment) => assignment.tag);
};

export const fetchPatientTagSummaryByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getMockPatientTagSummaryByTenant(tenantId);
  }

  const { tags, assignments } = await fetchPatientTagsDashboardByTenant(tenantId);

  return tags.map((tag) => ({
    ...tag,
    patient_count: assignments.filter((assignment) => assignment.tag_id === tag.id).length,
  }));
};
