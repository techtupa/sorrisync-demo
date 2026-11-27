import { getDefaultClinicTenant } from './tenantRepository.js';
import { recordClinicAuditEventByTenant } from './auditLogsRepository.js';

const DOCUMENT_STORAGE_BUCKET = 'tenant-private-documents';
const DOCUMENT_TYPES = ['metadata_card', 'legal_model', 'internal_asset', 'support_attachment'];
const DOCUMENT_MODULE_SCOPES = ['documents', 'legal', 'my_home', 'support'];
const DOCUMENT_SENSITIVITY_LEVELS = ['public', 'internal', 'restricted', 'sensitive'];
const MAX_METADATA_KEYS = 8;
const MAX_METADATA_BYTES = 2000;

export const DOCUMENT_AUDIT_ACTIONS = {
  folderCreated: 'documents.folder.metadata_created',
  recordCreated: 'documents.record.metadata_created',
  recordUpdated: 'documents.record.metadata_updated',
};

const SENSITIVE_DOCUMENT_METADATA_KEY_PATTERN =
  /filename|original_filename|file_name|path|storage_path|signed_url|public_url|url|patient|patient_id|cpf|cnpj|rg|email|mail|phone|telefone|whatsapp|ocr|content|file_content|payload|financeiro|financial|fiscal|prontuario|prontu[a\u00e1]rio|clinical|clinico|cl[i\u00ed]nico|credential|token|secret|password|senha/i;

const SENSITIVE_DOCUMENT_METADATA_VALUE_PATTERN = new RegExp(
  [
    'bearer\\s+[a-z0-9._-]+',
    ['service', 'role'].join('_'),
    ['access', 'token'].join('_'),
    ['signed', 'url'].join('_'),
    'signed\\s+url',
    '\\bpatient\\b',
    '\\bpaciente\\b',
    'financeiro',
    'financial',
    'fiscal',
    'prontuario',
    'prontu[a\\u00e1]rio',
    'clinical',
    'clinico',
    'cl[i\\u00ed]nico',
    '\\bocr\\b',
    '\\bpayload\\b',
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

const SENSITIVE_DOCUMENT_LABEL_PATTERN = new RegExp(
  [
    'filename',
    ['original', 'filename'].join('_'),
    ['file', 'name'].join('_'),
    ['storage', 'path'].join('_'),
    ['signed', 'url'].join('_'),
    ['public', 'url'].join('_'),
    'https?://',
    '\\b[A-Za-z0-9._-]+\\.(pdf|doc|docx|xls|xlsx|png|jpe?g|gif|webp|zip)\\b',
    '\\bpatient\\b',
    '\\bpaciente\\b',
    '\\bcpf\\b',
    '\\bcnpj\\b',
    '\\brg\\b',
    '\\bemail\\b',
    '\\bmail\\b',
    '\\bphone\\b',
    '\\btelefone\\b',
    '\\bwhatsapp\\b',
    'financeiro',
    'financial',
    'fiscal',
    'prontuario',
    'prontu[a\\u00e1]rio',
    'clinical',
    'clinico',
    'cl[i\\u00ed]nico',
    '\\bocr\\b',
    '\\bpayload\\b',
    'credential',
    'token',
    'secret',
    'password',
    'senha',
    '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b',
    '\\b\\d{2}\\.\\d{3}\\.\\d{3}\\/\\d{4}-\\d{2}\\b',
    '[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}',
    '\\(\\d{2}\\)\\s?\\d{4,5}-\\d{4}',
  ].join('|'),
  'i'
);

const mockFolderWritesByTenant = new Map();
const mockRecordWritesByTenant = new Map();

const resolveTenantId = (tenantId) => tenantId || getDefaultClinicTenant()?.tenant_id;

const cleanDocumentText = (value, maxLength = 120) => {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : '';
};

export const sanitizeDocumentLabel = (value, fallback = 'Metadado seguro') => {
  const safeValue = cleanDocumentText(value, 120);

  if (!safeValue || SENSITIVE_DOCUMENT_LABEL_PATTERN.test(safeValue)) {
    return fallback;
  }

  return safeValue;
};

export const sanitizeDocumentDescription = (value) => {
  const safeValue = cleanDocumentText(value, 240);

  if (!safeValue || SENSITIVE_DOCUMENT_LABEL_PATTERN.test(safeValue)) {
    return null;
  }

  return safeValue;
};

const metadataBytes = (metadata) => {
  const serialized = JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {});
  return new TextEncoder().encode(serialized).length;
};

const buildMetadataSummary = (keys = [], bytes = null) => ({
  metadata_keys: [...keys].sort(),
  metadata_bytes: bytes ?? 64 + keys.join('').length,
  metadata_redacted: true,
});

const buildStorageGuard = () => ({
  storage_bucket: DOCUMENT_STORAGE_BUCKET,
  storage_path: null,
  storage_path_redacted: false,
  upload_enabled: false,
  download_enabled: false,
  metadata_only: true,
});

const normalizeDocumentAuditAction = (action, fallback = DOCUMENT_AUDIT_ACTIONS.recordUpdated) => {
  const safeAction = cleanDocumentText(action, 100).toLowerCase();
  return Object.values(DOCUMENT_AUDIT_ACTIONS).includes(safeAction) ? safeAction : fallback;
};

const normalizeDocumentAuditEntityType = (entityType) => {
  const safeEntityType = cleanDocumentText(entityType, 80).toLowerCase();
  return ['document_folder', 'document_record'].includes(safeEntityType) ? safeEntityType : 'document_record';
};

const normalizeDocumentAuditReference = (value) => {
  const safeValue = cleanDocumentText(value, 120);
  return /^[A-Za-z0-9._:/#-]{8,160}$/.test(safeValue) ? safeValue : null;
};

const mapSensitivityToAuditLevel = (sensitivityLevel) => {
  const safeLevel = normalizeEnum(sensitivityLevel, DOCUMENT_SENSITIVITY_LEVELS, 'internal');
  return ['restricted', 'sensitive'].includes(safeLevel) ? 'sensitive' : 'operational';
};

export const buildDocumentMetadataAuditEvent = ({
  action,
  entityType,
  entityId,
  payload = {},
} = {}) => {
  const normalizedEntityType = normalizeDocumentAuditEntityType(entityType);
  const normalizedEntityId = normalizeDocumentAuditReference(entityId);
  const normalizedAction = normalizeDocumentAuditAction(action);
  const safeMetadata = sanitizeDocumentMetadata(payload.metadata);
  const metadataKeyCount = Object.keys(safeMetadata).length;
  const auditMetadata = {
    category: 'metadata_only',
    module_scope: normalizeEnum(payload.module_scope, DOCUMENT_MODULE_SCOPES, 'documents'),
    record_kind: normalizeEnum(payload.document_type, DOCUMENT_TYPES, 'metadata_card'),
    sensitivity_level: normalizeEnum(payload.sensitivity_level, DOCUMENT_SENSITIVITY_LEVELS, 'internal'),
    metadata_key_count: metadataKeyCount,
    metadata_redacted: true,
    storage_path_redacted: true,
    upload_enabled: false,
  };

  return {
    action: normalizedAction,
    entityType: normalizedEntityType,
    entityId: normalizedEntityId,
    sensitivityLevel: mapSensitivityToAuditLevel(payload.sensitivity_level),
    correlationId: `front-f:${normalizedEntityType}`,
    evidenceReference: normalizedEntityId ? `${normalizedEntityType}:${normalizedEntityId}`.slice(0, 160) : null,
    metadata: auditMetadata,
  };
};

export const recordDocumentMetadataAuditEventByTenant = async (tenantId, auditInput = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);

  if (!resolvedTenantId) {
    return null;
  }

  return recordClinicAuditEventByTenant(
    resolvedTenantId,
    buildDocumentMetadataAuditEvent(auditInput)
  );
};

const recordDocumentAuditEventSafely = async (tenantId, auditInput) => {
  try {
    return await recordDocumentMetadataAuditEventByTenant(tenantId, auditInput);
  } catch {
    return null;
  }
};

const createLocalId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeEnum = (value, allowedValues, fallback) => {
  const safeValue = cleanDocumentText(value, 80).toLowerCase();
  return allowedValues.includes(safeValue) ? safeValue : fallback;
};

const normalizeFolderCode = (value) => {
  const safeCode = cleanDocumentText(value, 60)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_:-]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return /^[a-z][a-z0-9_:-]{2,59}$/.test(safeCode) ? safeCode : `documents_${Date.now()}`;
};

const normalizeUuid = (value) => {
  const safeValue = cleanDocumentText(value, 80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safeValue)
    ? safeValue
    : null;
};

const metadataEntriesWithinLimit = (entries) => {
  return entries.reduce((safeMetadata, [key, value]) => {
    if (Object.keys(safeMetadata).length >= MAX_METADATA_KEYS) {
      return safeMetadata;
    }

    const nextMetadata = {
      ...safeMetadata,
      [key]: value,
    };

    return metadataBytes(nextMetadata) <= MAX_METADATA_BYTES ? nextMetadata : safeMetadata;
  }, {});
};

export const sanitizeDocumentMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }

  const safeEntries = Object.entries(metadata)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => {
      const safeKey = cleanDocumentText(key, 60);

      if (!/^[A-Za-z][A-Za-z0-9_:-]{0,59}$/.test(safeKey) || SENSITIVE_DOCUMENT_METADATA_KEY_PATTERN.test(safeKey)) {
        return null;
      }

      if (typeof value === 'string') {
        const safeValue = cleanDocumentText(value, 120);
        if (!safeValue || SENSITIVE_DOCUMENT_METADATA_VALUE_PATTERN.test(safeValue)) {
          return null;
        }
        return [safeKey, safeValue];
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
        return [safeKey, value];
      }

      if (typeof value === 'boolean') {
        return [safeKey, value];
      }

      return null;
    })
    .filter(Boolean);

  return metadataEntriesWithinLimit(safeEntries);
};

export const buildDocumentFolderMetadataPayload = (tenantId, folder = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const safeMetadata = sanitizeDocumentMetadata(folder.metadata);

  return {
    tenant_id: resolvedTenantId,
    parent_folder_id: normalizeUuid(folder.parent_folder_id),
    folder_code: normalizeFolderCode(folder.folder_code || folder.display_name),
    display_name: sanitizeDocumentLabel(folder.display_name, 'Pasta segura'),
    description: sanitizeDocumentDescription(folder.description),
    sensitivity_level: normalizeEnum(folder.sensitivity_level, DOCUMENT_SENSITIVITY_LEVELS, 'internal'),
    status: 'active',
    sort_order: Number.isFinite(Number(folder.sort_order)) ? Number(folder.sort_order) : 100,
    metadata: safeMetadata,
  };
};

export const buildDocumentRecordMetadataPayload = (tenantId, record = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const safeMetadata = sanitizeDocumentMetadata(record.metadata);

  return {
    tenant_id: resolvedTenantId,
    folder_id: normalizeUuid(record.folder_id),
    display_name: sanitizeDocumentLabel(record.display_name, 'Metadado seguro'),
    document_type: normalizeEnum(record.document_type, DOCUMENT_TYPES, 'metadata_card'),
    module_scope: normalizeEnum(record.module_scope, DOCUMENT_MODULE_SCOPES, 'documents'),
    storage_bucket: DOCUMENT_STORAGE_BUCKET,
    storage_path: null,
    file_extension: null,
    mime_type: null,
    byte_size: null,
    checksum_sha256: null,
    sensitivity_level: normalizeEnum(record.sensitivity_level, DOCUMENT_SENSITIVITY_LEVELS, 'internal'),
    status: 'metadata_only',
    related_entity_type: null,
    related_entity_id: null,
    metadata: safeMetadata,
  };
};

const mapFolderPayload = (payload, id = createLocalId('local-document-folder')) => ({
  id,
  tenant_id: payload.tenant_id,
  parent_folder_id: payload.parent_folder_id,
  folder_code: payload.folder_code,
  display_name: payload.display_name,
  description: payload.description || '',
  sensitivity_level: payload.sensitivity_level,
  status: payload.status,
  sort_order: payload.sort_order,
  ...buildMetadataSummary(Object.keys(payload.metadata), metadataBytes(payload.metadata)),
});

const mapRecordPayload = (payload, id = createLocalId('local-document-record')) => ({
  id,
  tenant_id: payload.tenant_id,
  folder_id: payload.folder_id,
  display_name: payload.display_name,
  document_type: payload.document_type,
  module_scope: payload.module_scope,
  ...buildStorageGuard(),
  file_extension: null,
  mime_type: null,
  byte_size: null,
  sensitivity_level: payload.sensitivity_level,
  status: payload.status,
  related_entity_type: null,
  related_entity_id: null,
  ...buildMetadataSummary(Object.keys(payload.metadata), metadataBytes(payload.metadata)),
});

const getTenantWrites = (store, tenantId) => {
  return store.get(tenantId) || [];
};

const setTenantWrites = (store, tenantId, items) => {
  store.set(tenantId, items);
};

const buildFolders = (tenantId) => [
  {
    id: `${tenantId || 'tenant'}-documents-folder-governance`,
    tenant_id: tenantId,
    folder_code: 'governanca_demo',
    display_name: 'Governanca demo',
    description: 'Metadados administrativos sinteticos.',
    sensitivity_level: 'internal',
    status: 'active',
    sort_order: 10,
    ...buildMetadataSummary(['demo', 'metadata_only', 'source']),
  },
  {
    id: `${tenantId || 'tenant'}-documents-folder-models`,
    tenant_id: tenantId,
    folder_code: 'modelos_demo',
    display_name: 'Modelos demo',
    description: 'Modelos internos sem arquivo real.',
    sensitivity_level: 'restricted',
    status: 'active',
    sort_order: 20,
    ...buildMetadataSummary(['demo', 'metadata_only', 'source']),
  },
  {
    id: `${tenantId || 'tenant'}-documents-folder-home-assets`,
    tenant_id: tenantId,
    folder_code: 'ativos_home_demo',
    display_name: 'Ativos da Home demo',
    description: 'Metadados de ativos visuais sinteticos.',
    sensitivity_level: 'internal',
    status: 'active',
    sort_order: 30,
    ...buildMetadataSummary(['demo', 'metadata_only', 'source']),
  },
];

const buildRecords = (tenantId, folders = buildFolders(tenantId)) => {
  const folderByCode = folders.reduce((acc, folder) => {
    acc[folder.folder_code] = folder;
    return acc;
  }, {});

  return [
    {
      id: `${tenantId || 'tenant'}-documents-record-governance`,
      tenant_id: tenantId,
      folder_id: folderByCode.governanca_demo?.id,
      display_name: 'Metadado demo administrativo',
      document_type: 'metadata_card',
      module_scope: 'documents',
      ...buildStorageGuard(),
      file_extension: null,
      mime_type: null,
      byte_size: null,
      sensitivity_level: 'internal',
      status: 'metadata_only',
      ...buildMetadataSummary(['demo', 'metadata_only', 'source', 'upload_enabled']),
    },
    {
      id: `${tenantId || 'tenant'}-documents-record-model`,
      tenant_id: tenantId,
      folder_id: folderByCode.modelos_demo?.id,
      display_name: 'Modelo demo interno',
      document_type: 'legal_model',
      module_scope: 'legal',
      ...buildStorageGuard(),
      file_extension: null,
      mime_type: null,
      byte_size: null,
      sensitivity_level: 'restricted',
      status: 'metadata_only',
      ...buildMetadataSummary(['demo', 'metadata_only', 'source', 'upload_enabled']),
    },
    {
      id: `${tenantId || 'tenant'}-documents-record-home-asset`,
      tenant_id: tenantId,
      folder_id: folderByCode.ativos_home_demo?.id,
      display_name: 'Ativo visual demo',
      document_type: 'internal_asset',
      module_scope: 'my_home',
      ...buildStorageGuard(),
      file_extension: null,
      mime_type: null,
      byte_size: null,
      sensitivity_level: 'internal',
      status: 'metadata_only',
      ...buildMetadataSummary(['demo', 'metadata_only', 'source', 'upload_enabled']),
    },
  ];
};

export const getDocumentFoldersByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return [
    ...buildFolders(resolvedTenantId),
    ...getTenantWrites(mockFolderWritesByTenant, resolvedTenantId),
  ];
};

export const getDocumentRecordsByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  return [
    ...buildRecords(resolvedTenantId, getDocumentFoldersByTenant(resolvedTenantId)),
    ...getTenantWrites(mockRecordWritesByTenant, resolvedTenantId),
  ];
};

export const getDocumentMetadataByTenant = (tenantId) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const folders = getDocumentFoldersByTenant(resolvedTenantId);
  const records = buildRecords(resolvedTenantId, folders);

  return {
    tenantId: resolvedTenantId,
    folders,
    records,
    source: 'mock',
    sourceBreakdown: {
      folders: 'mock',
      records: 'mock',
    },
    isFallback: true,
    storageMetadataOnly: true,
    storage: {
      bucket: 'tenant-private-documents',
      uploadEnabled: false,
      downloadEnabled: false,
      metadataOnly: true,
      rawMetadataRedacted: true,
      storagePathRedacted: true,
    },
  };
};

export const createDocumentFolderByTenant = async (tenantId, folder = {}) => {
  const payload = buildDocumentFolderMetadataPayload(tenantId, folder);
  const createdFolder = mapFolderPayload(payload);
  const currentWrites = getTenantWrites(mockFolderWritesByTenant, payload.tenant_id);

  setTenantWrites(mockFolderWritesByTenant, payload.tenant_id, [...currentWrites, createdFolder]);
  await recordDocumentAuditEventSafely(payload.tenant_id, {
    action: DOCUMENT_AUDIT_ACTIONS.folderCreated,
    entityType: 'document_folder',
    entityId: createdFolder.id,
    payload,
  });

  return createdFolder;
};

export const createDocumentRecordByTenant = async (tenantId, record = {}) => {
  const payload = buildDocumentRecordMetadataPayload(tenantId, record);
  const createdRecord = mapRecordPayload(payload);
  const currentWrites = getTenantWrites(mockRecordWritesByTenant, payload.tenant_id);

  setTenantWrites(mockRecordWritesByTenant, payload.tenant_id, [...currentWrites, createdRecord]);
  await recordDocumentAuditEventSafely(payload.tenant_id, {
    action: DOCUMENT_AUDIT_ACTIONS.recordCreated,
    entityType: 'document_record',
    entityId: createdRecord.id,
    payload,
  });

  return createdRecord;
};

export const updateDocumentRecordMetadataByTenant = async (tenantId, recordId, recordPatch = {}) => {
  const resolvedTenantId = resolveTenantId(tenantId);
  const currentRecords = getDocumentRecordsByTenant(resolvedTenantId);
  const existingRecord = currentRecords.find((record) => record.id === recordId);

  if (!existingRecord) {
    throw new Error('Documento nao encontrado para o tenant atual.');
  }

  const payload = buildDocumentRecordMetadataPayload(resolvedTenantId, {
    ...existingRecord,
    ...recordPatch,
    metadata: recordPatch.metadata,
  });
  const updatedRecord = mapRecordPayload(payload, existingRecord.id);
  const existingWrites = getTenantWrites(mockRecordWritesByTenant, resolvedTenantId);
  const nextWrites = existingWrites.some((record) => record.id === recordId)
    ? existingWrites.map((record) => (record.id === recordId ? updatedRecord : record))
    : [...existingWrites, updatedRecord];

  setTenantWrites(mockRecordWritesByTenant, resolvedTenantId, nextWrites);
  await recordDocumentAuditEventSafely(resolvedTenantId, {
    action: DOCUMENT_AUDIT_ACTIONS.recordUpdated,
    entityType: 'document_record',
    entityId: updatedRecord.id,
    payload,
  });

  return updatedRecord;
};
