const now = new Date('2026-06-04T17:45:00Z').getTime();

const buildAuditEvent = ({
  id,
  tenantId = null,
  auditScope,
  actorRole,
  action,
  module,
  entityType,
  sensitivityLevel = 'operational',
  status = 'Registrado',
  ageMs,
  entityId = null,
  correlationId,
  evidenceReference = null,
  metadataKeys = [],
}) => {
  const createdAt = typeof ageMs === 'number' ? new Date(now - ageMs).toISOString() : new Date().toISOString();
  const metadataBytes = metadataKeys.length ? 48 + metadataKeys.join('').length : 2;

  return {
    id,
    tenant_id: tenantId,
    audit_scope: auditScope,
    user_id: 'synthetic-audit-actor',
    user_name: auditScope === 'platform' ? 'Operador SorriSync' : 'Usuário demo',
    user_profile: actorRole,
    actor_role: actorRole,
    module,
    action,
    entity_type: entityType,
    description: `Evento sintético de auditoria em ${module}.`,
    severity: sensitivityLevel === 'critical' ? 'Crítico' : sensitivityLevel === 'sensitive' ? 'Sensível' : 'Normal',
    sensitivity_level: sensitivityLevel,
    status,
    created_at: createdAt,
    source_signal: 'Não exposto',
    device_signal: 'Não exposto',
    ip_address: 'Não exposto',
    device: 'Não exposto',
    related_record_id: evidenceReference || correlationId || entityId,
    correlation_id: correlationId || `${auditScope}-demo-${id}`,
    evidence_reference: evidenceReference,
    metadata_keys: metadataKeys,
    metadata_bytes: metadataBytes,
  };
};

const clinicAuditEvents = [
  buildAuditEvent({
    id: 'audit_clinic_001',
    tenantId: 'tenant_aurora',
    auditScope: 'clinic',
    actorRole: 'clinic_owner',
    action: 'clinic_settings.reviewed',
    module: 'Configuracoes',
    entityType: 'clinic_settings',
    ageMs: 20 * 60000,
    metadataKeys: ['demo', 'source'],
  }),
  buildAuditEvent({
    id: 'audit_clinic_002',
    tenantId: 'tenant_aurora',
    auditScope: 'clinic',
    actorRole: 'clinic_admin',
    action: 'permission.reviewed',
    module: 'Permissoes',
    entityType: 'role_permissions',
    sensitivityLevel: 'sensitive',
    status: 'Revisar',
    ageMs: 90 * 60000,
    metadataKeys: ['demo', 'permission_code'],
  }),
  buildAuditEvent({
    id: 'audit_clinic_003',
    tenantId: 'tenant_harbor',
    auditScope: 'clinic',
    actorRole: 'clinic_owner',
    action: 'support_access.reviewed',
    module: 'Suporte',
    entityType: 'platform_access_grants',
    sensitivityLevel: 'critical',
    status: 'Pendente',
    ageMs: 5 * 3600000,
    metadataKeys: ['demo', 'grant_status'],
  }),
];

const platformAuditEvents = [
  buildAuditEvent({
    id: 'audit_platform_001',
    auditScope: 'platform',
    actorRole: 'platform_admin',
    action: 'quality_check.reviewed',
    module: 'Master Control',
    entityType: 'quality_check_runs',
    ageMs: 12 * 60000,
    metadataKeys: ['demo', 'suite_slug'],
  }),
  buildAuditEvent({
    id: 'audit_platform_002',
    auditScope: 'platform',
    actorRole: 'platform_support',
    action: 'tenant_access.requested',
    module: 'Acesso Plataforma',
    entityType: 'platform_access_grants',
    sensitivityLevel: 'sensitive',
    status: 'Revisar',
    ageMs: 3 * 3600000,
    metadataKeys: ['demo', 'reason_code'],
  }),
];

const byMostRecent = (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

const normalizeLimit = (limit) => {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(Math.floor(parsed), 100);
};

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const SENSITIVE_METADATA_KEY_PATTERN =
  /password|senha|secret|token|api_key|credential|credencial|cpf|cnpj|rg|email|mail|phone|telefone|whatsapp|diagnosis|diagnostico|diagn[oó]stico|prontuario|prontu[aá]rio|clinical|clinico|cl[ií]nico|document|documento|file|arquivo|finance|financial|cartao|card|payload|integration|integracao|integra[cç][aã]o/i;

const SENSITIVE_METADATA_VALUE_PATTERN = new RegExp(
  [
    'bearer\\s+[a-z0-9._-]+',
    ['service', 'role'].join('_'),
    ['github', 'token'].join('_'),
    ['access', 'token'].join('_'),
    'password\\s*=',
    'secret\\s*=',
    'senha\\s*=',
    '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b',
    '\\b\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}\\b',
    '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}',
    '\\(\\d{2}\\)\\s?\\d{4,5}-\\d{4}',
  ].join('|'),
  'i'
);

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

export const sanitizeAuditEventMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  return Object.entries(metadata)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .slice(0, 8)
    .reduce((safeMetadata, [key, value]) => {
      const safeKey = cleanText(key).slice(0, 60);

      if (!/^[A-Za-z][A-Za-z0-9_:-]{0,59}$/.test(safeKey) || SENSITIVE_METADATA_KEY_PATTERN.test(safeKey)) {
        return safeMetadata;
      }

      if (typeof value === 'string') {
        const safeValue = cleanText(value).slice(0, 120);
        if (safeValue && !SENSITIVE_METADATA_VALUE_PATTERN.test(safeValue)) {
          safeMetadata[safeKey] = safeValue;
        }
        return safeMetadata;
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        safeMetadata[safeKey] = value;
      }

      return safeMetadata;
    }, {});
};

const limitRows = (events, limit) => events.slice(0, normalizeLimit(limit));

export const getClinicAuditLogsByTenant = (tenantId, { limit } = {}) => {
  if (!tenantId) return [];

  return limitRows(
    clinicAuditEvents
      .filter((event) => event.audit_scope === 'clinic' && event.tenant_id === tenantId)
      .sort(byMostRecent),
    limit
  );
};

export const getPlatformAuditLogs = ({ limit } = {}) => {
  return limitRows(
    platformAuditEvents
      .filter((event) => event.audit_scope === 'platform' && event.tenant_id === null)
      .sort(byMostRecent),
    limit
  );
};

export const getAuditLogsByScope = ({ tenantId, auditScope = 'clinic', limit } = {}) => {
  if (auditScope === 'platform') {
    return getPlatformAuditLogs({ limit });
  }

  return getClinicAuditLogsByTenant(tenantId, { limit });
};

const summarizeRecordedEvent = (event) => ({
  id: event.id,
  tenant_id: event.tenant_id,
  audit_scope: event.audit_scope,
  action: event.action,
  entity_type: event.entity_type,
  sensitivity_level: event.sensitivity_level,
  correlation_id: event.correlation_id,
  evidence_reference: event.evidence_reference,
  metadata_keys: event.metadata_keys,
  metadata_bytes: event.metadata_bytes,
  created_at: event.created_at,
});

const recordAuditEvent = ({ tenantId = null, auditScope, event = {} }) => {
  const metadata = sanitizeAuditEventMetadata(event.metadata);
  const metadataKeys = Object.keys(metadata).sort();
  const sensitivityLevel = normalizeSensitivityLevel(event.sensitivityLevel || event.sensitivity_level);
  const entityType = normalizeEntityType(event.entityType || event.entity_type);
  const correlationId = normalizeReference(event.correlationId || event.correlation_id, 120);
  const evidenceReference = normalizeReference(event.evidenceReference || event.evidence_reference, 160);
  const auditEvent = buildAuditEvent({
    id: `audit_${auditScope}_${Date.now()}`,
    tenantId,
    auditScope,
    actorRole: auditScope === 'platform' ? 'platform_admin' : 'clinic_admin',
    action: normalizeAuditAction(event.action),
    module: auditScope === 'platform' ? 'Master Control' : 'Auditoria',
    entityType,
    entityId: normalizeReference(event.entityId || event.entity_id, 120),
    sensitivityLevel,
    correlationId,
    evidenceReference,
    metadataKeys,
  });

  if (auditScope === 'platform') {
    platformAuditEvents.unshift(auditEvent);
  } else {
    clinicAuditEvents.unshift(auditEvent);
  }

  return summarizeRecordedEvent(auditEvent);
};

export const recordClinicAuditEventByTenant = async (tenantId, event = {}) => {
  if (!tenantId) return null;

  return recordAuditEvent({
    tenantId,
    auditScope: 'clinic',
    event,
  });
};

export const recordPlatformAuditEvent = async (event = {}) => {
  return recordAuditEvent({
    auditScope: 'platform',
    event,
  });
};
