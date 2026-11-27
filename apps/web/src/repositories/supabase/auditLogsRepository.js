import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  getClinicAuditLogsByTenant as getMockClinicAuditLogsByTenant,
  getPlatformAuditLogs as getMockPlatformAuditLogs,
  recordClinicAuditEventByTenant as recordMockClinicAuditEventByTenant,
  recordPlatformAuditEvent as recordMockPlatformAuditEvent,
  sanitizeAuditEventMetadata,
} from '../mock/auditLogsRepository.js';

const AUDIT_LOG_COLUMNS = `
  id,
  tenant_id,
  actor_user_id,
  actor_role,
  action,
  entity_type,
  entity_id,
  created_at,
  audit_scope,
  sensitivity_level,
  correlation_id,
  evidence_reference
`;

const REDACTED_SIGNAL_LABEL = 'Não exposto';

const hasSupabase = () => Boolean(isSupabaseConfigured && supabase);

const normalizeLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(Math.floor(parsed), 100);
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeAuditAction = (action) => {
  const safeAction = cleanText(action).toLowerCase();
  if (/^[a-z0-9][a-z0-9._:-]{2,99}$/.test(safeAction)) return safeAction;
  return 'audit.event_recorded';
};

const normalizeSensitivityLevel = (sensitivityLevel) => {
  const safeLevel = cleanText(sensitivityLevel).toLowerCase();
  return ['operational', 'sensitive', 'critical'].includes(safeLevel) ? safeLevel : 'operational';
};

const normalizeEntityType = (entityType) => {
  const safeEntityType = cleanText(entityType).toLowerCase();
  if (/^[a-z0-9][a-z0-9_:-]{1,79}$/.test(safeEntityType)) return safeEntityType;
  return 'audit_event';
};

const normalizeReference = (value, maxLength = 120) => {
  const safeValue = cleanText(value).slice(0, maxLength);
  return /^[A-Za-z0-9._:/#-]{8,160}$/.test(safeValue) ? safeValue : null;
};

const formatModule = (entityType, auditScope) => {
  if (auditScope === 'platform') return 'Master Control';
  if (!entityType) return 'Auditoria';

  return entityType
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
};

const severityFromSensitivity = (sensitivityLevel) => {
  if (sensitivityLevel === 'critical') return 'Crítico';
  if (sensitivityLevel === 'sensitive') return 'Sensível';
  return 'Normal';
};

const buildAuditEventRpcPayload = ({ auditScope, tenantId = null, event = {} }) => {
  return {
    p_audit_scope: auditScope,
    p_action: normalizeAuditAction(event.action),
    p_tenant_id: tenantId,
    p_entity_type: normalizeEntityType(event.entityType || event.entity_type),
    p_entity_id: normalizeReference(event.entityId || event.entity_id, 120),
    p_sensitivity_level: normalizeSensitivityLevel(event.sensitivityLevel || event.sensitivity_level),
    p_correlation_id: normalizeReference(event.correlationId || event.correlation_id, 120),
    p_evidence_reference: normalizeReference(event.evidenceReference || event.evidence_reference, 160),
    p_metadata: sanitizeAuditEventMetadata(event.metadata),
  };
};

const mapRecordedAuditEvent = (auditId, payload) => ({
  id: auditId,
  tenant_id: payload.p_tenant_id,
  audit_scope: payload.p_audit_scope,
  action: payload.p_action,
  entity_type: payload.p_entity_type,
  sensitivity_level: payload.p_sensitivity_level,
  correlation_id: payload.p_correlation_id,
  evidence_reference: payload.p_evidence_reference,
  source_signal: REDACTED_SIGNAL_LABEL,
  device_signal: REDACTED_SIGNAL_LABEL,
  ip_address: REDACTED_SIGNAL_LABEL,
  device: REDACTED_SIGNAL_LABEL,
  metadata_keys: [],
  metadata_bytes: 0,
  metadata_redacted: true,
  created_at: new Date().toISOString(),
});

const mapAuditLogRow = (row) => {
  const module = formatModule(row.entity_type, row.audit_scope);
  const sensitivityLevel = row.sensitivity_level || 'operational';

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    audit_scope: row.audit_scope,
    user_id: row.actor_user_id,
    user_name: row.actor_role || 'Ator registrado',
    user_profile: row.actor_role || '',
    actor_role: row.actor_role || '',
    module,
    action: row.action,
    entity_type: row.entity_type,
    description: `Evento de auditoria registrado em ${module}.`,
    severity: severityFromSensitivity(sensitivityLevel),
    sensitivity_level: sensitivityLevel,
    status: 'Registrado',
    created_at: row.created_at,
    source_signal: REDACTED_SIGNAL_LABEL,
    device_signal: REDACTED_SIGNAL_LABEL,
    ip_address: REDACTED_SIGNAL_LABEL,
    device: REDACTED_SIGNAL_LABEL,
    related_record_id: row.evidence_reference || row.correlation_id || null,
    correlation_id: row.correlation_id,
    evidence_reference: row.evidence_reference,
    metadata_keys: [],
    metadata_bytes: 0,
    metadata_redacted: true,
  };
};

export const fetchClinicAuditLogsByTenant = async (tenantId, { limit } = {}) => {
  if (!hasSupabase() || !tenantId) {
    return getMockClinicAuditLogsByTenant(tenantId, { limit });
  }

  const response = await supabase
    .from('audit_logs')
    .select(AUDIT_LOG_COLUMNS)
    .eq('audit_scope', 'clinic')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(normalizeLimit(limit));

  if (response.error) {
    return getMockClinicAuditLogsByTenant(tenantId, { limit });
  }

  return (response.data || []).map(mapAuditLogRow);
};

export const fetchPlatformAuditLogs = async ({ limit } = {}) => {
  if (!hasSupabase()) {
    return getMockPlatformAuditLogs({ limit });
  }

  const response = await supabase
    .from('audit_logs')
    .select(AUDIT_LOG_COLUMNS)
    .eq('audit_scope', 'platform')
    .is('tenant_id', null)
    .order('created_at', { ascending: false })
    .limit(normalizeLimit(limit));

  if (response.error) {
    return getMockPlatformAuditLogs({ limit });
  }

  return (response.data || []).map(mapAuditLogRow);
};

export const fetchAuditLogsByScope = async ({ tenantId, auditScope = 'clinic', limit } = {}) => {
  if (auditScope === 'platform') {
    return fetchPlatformAuditLogs({ limit });
  }

  return fetchClinicAuditLogsByTenant(tenantId, { limit });
};

export const recordClinicAuditEventByTenant = async (tenantId, event = {}) => {
  if (!hasSupabase() || !tenantId) {
    return recordMockClinicAuditEventByTenant(tenantId, event);
  }

  const payload = buildAuditEventRpcPayload({
    auditScope: 'clinic',
    tenantId,
    event,
  });

  const response = await supabase.rpc('record_audit_event', payload);

  if (response.error) {
    return recordMockClinicAuditEventByTenant(tenantId, event);
  }

  return mapRecordedAuditEvent(response.data, payload);
};

export const recordPlatformAuditEvent = async (event = {}) => {
  if (!hasSupabase()) {
    return recordMockPlatformAuditEvent(event);
  }

  const payload = buildAuditEventRpcPayload({
    auditScope: 'platform',
    event,
  });

  const response = await supabase.rpc('record_audit_event', payload);

  if (response.error) {
    return recordMockPlatformAuditEvent(event);
  }

  return mapRecordedAuditEvent(response.data, payload);
};
