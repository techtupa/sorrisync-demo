import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient.js';
import {
  DOCUMENT_AUDIT_ACTIONS,
  buildDocumentFolderMetadataPayload,
  buildDocumentMetadataAuditEvent,
  buildDocumentRecordMetadataPayload,
  createDocumentFolderByTenant as createMockDocumentFolderByTenant,
  createDocumentRecordByTenant as createMockDocumentRecordByTenant,
  getDocumentFoldersByTenant as getMockDocumentFoldersByTenant,
  getDocumentMetadataByTenant as getMockDocumentMetadataByTenant,
  getDocumentRecordsByTenant as getMockDocumentRecordsByTenant,
  recordDocumentMetadataAuditEventByTenant as recordMockDocumentMetadataAuditEventByTenant,
  sanitizeDocumentDescription,
  sanitizeDocumentLabel,
  sanitizeDocumentMetadata,
  updateDocumentRecordMetadataByTenant as updateMockDocumentRecordMetadataByTenant,
} from '../mock/documentsRepository.js';
import { recordClinicAuditEventByTenant } from './auditLogsRepository.js';

const hasSupabase = (client = supabase) => Boolean(client && (client !== supabase || isSupabaseConfigured));

const folderSelect = [
  'id',
  'tenant_id',
  'parent_folder_id',
  'folder_code',
  'display_name',
  'description',
  'sensitivity_level',
  'status',
  'sort_order',
  'created_at',
  'updated_at',
].join(', ');

const recordSelect = [
  'id',
  'tenant_id',
  'folder_id',
  'display_name',
  'document_type',
  'module_scope',
  'storage_bucket',
  'storage_path',
  'sensitivity_level',
  'status',
  'created_at',
  'updated_at',
].join(', ');

const getFallbackMetadata = (tenantId) => getMockDocumentMetadataByTenant(tenantId);

const metadataBytes = (metadata) => {
  const serialized = JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {});
  return new TextEncoder().encode(serialized).length;
};

const buildRedactedMetadataSummary = (metadata) => ({
  metadata_keys: Object.keys(metadata || {}).sort(),
  metadata_bytes: metadata ? metadataBytes(metadata) : null,
  metadata_redacted: true,
});

const buildStorageGuard = (row = {}) => ({
  storage_bucket: row.storage_bucket || 'tenant-private-documents',
  storage_path: null,
  storage_path_redacted: Boolean(row.storage_path),
  upload_enabled: false,
  download_enabled: false,
  metadata_only: true,
});

const mapFolder = (folder) => ({
  id: folder.id,
  tenant_id: folder.tenant_id,
  parent_folder_id: folder.parent_folder_id,
  folder_code: folder.folder_code,
  display_name: sanitizeDocumentLabel(folder.display_name, 'Pasta segura'),
  description: sanitizeDocumentDescription(folder.description) || '',
  sensitivity_level: folder.sensitivity_level || 'internal',
  status: folder.status || 'active',
  sort_order: folder.sort_order || 100,
  created_at: folder.created_at,
  updated_at: folder.updated_at,
  ...buildRedactedMetadataSummary(),
});

const mapRecord = (record) => ({
  id: record.id,
  tenant_id: record.tenant_id,
  folder_id: record.folder_id,
  display_name: sanitizeDocumentLabel(record.display_name, 'Metadado seguro'),
  document_type: record.document_type,
  module_scope: record.module_scope,
  ...buildStorageGuard(record),
  file_extension: null,
  mime_type: null,
  byte_size: null,
  sensitivity_level: record.sensitivity_level || 'internal',
  status: record.status || 'metadata_only',
  related_entity_type: null,
  related_entity_id: null,
  created_at: record.created_at,
  updated_at: record.updated_at,
  ...buildRedactedMetadataSummary(),
});

const mapFolderWithPayloadMetadata = (folder, payload) => ({
  ...mapFolder(folder),
  ...buildRedactedMetadataSummary(payload.metadata),
});

const mapRecordWithPayloadMetadata = (record, payload) => ({
  ...mapRecord(record),
  ...buildRedactedMetadataSummary(payload.metadata),
});

const cleanText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeDocumentWriteError = (error) => {
  const message = cleanText(error?.message);
  const details = cleanText(error?.details);
  const hint = cleanText(error?.hint);
  const code = cleanText(error?.code).toLowerCase();
  const searchable = `${message} ${details} ${hint}`.toLowerCase();

  if (!message && !code) {
    return error;
  }

  if (
    searchable.includes('document_records_no_storage_path_until_bucket_step_check') ||
    searchable.includes('document_records_status_metadata_only_until_bucket_step_check') ||
    searchable.includes('document_records_no_file_facts_until_upload_step_check') ||
    searchable.includes('document_records_no_related_entity_until_module_contract_check')
  ) {
    return new Error('Documentos continuam metadata-only; upload real e vinculos reais ainda nao estao habilitados.');
  }

  if (
    searchable.includes('document_records_metadata_no_sensitive_keys_check') ||
    searchable.includes('document_folders_metadata_no_sensitive_keys_check')
  ) {
    return new Error('Metadados de documento contem chaves sensiveis bloqueadas.');
  }

  if (code === 'pgrst116') {
    return new Error('Documento nao encontrado para o tenant atual.');
  }

  return error;
};

const throwDocumentWriteError = (error) => {
  throw normalizeDocumentWriteError(error);
};

const normalizeDocumentReadError = (error) => {
  const code = cleanText(error?.code);
  const message = `${cleanText(error?.message)} ${cleanText(error?.details)} ${cleanText(error?.hint)}`.toLowerCase();
  const permissionDenied = code === '42501' || code === 'PGRST301' || message.includes('permission denied');
  const safeError = new Error(
    permissionDenied
      ? 'Permissão insuficiente para ler metadados documentais neste tenant.'
      : 'Não foi possível ler metadados documentais no Supabase.',
  );
  safeError.code = code;
  safeError.permissionDenied = permissionDenied;
  return safeError;
};

export const recordDocumentMetadataAuditEventByTenant = async (tenantId, auditInput = {}) => {
  if (!hasSupabase() || !tenantId) {
    return recordMockDocumentMetadataAuditEventByTenant(tenantId, auditInput);
  }

  return recordClinicAuditEventByTenant(
    tenantId,
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

export const fetchDocumentMetadataByTenant = async (tenantId, { client = supabase } = {}) => {
  if (!hasSupabase(client) || !tenantId) {
    return getFallbackMetadata(tenantId);
  }

  const [foldersResponse, recordsResponse] = await Promise.all([
    client
      .from('document_folders')
      .select(folderSelect)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('display_name', { ascending: true }),
    client
      .from('document_records')
      .select(recordSelect)
      .eq('tenant_id', tenantId)
      .eq('status', 'metadata_only')
      .order('created_at', { ascending: false }),
  ]);

  if (foldersResponse.error || recordsResponse.error) {
    throw normalizeDocumentReadError(foldersResponse.error || recordsResponse.error);
  }

  const folders = (foldersResponse.data || []).map(mapFolder);
  const records = (recordsResponse.data || []).map(mapRecord);

  return {
    tenantId,
    folders,
    records,
    source: 'supabase',
    sourceBreakdown: {
      folders: 'supabase',
      records: 'supabase',
    },
    isFallback: false,
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

export const fetchDocumentFoldersByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getMockDocumentFoldersByTenant(tenantId);
  }

  return (await fetchDocumentMetadataByTenant(tenantId)).folders;
};

export const fetchDocumentRecordsByTenant = async (tenantId) => {
  if (!hasSupabase() || !tenantId) {
    return getMockDocumentRecordsByTenant(tenantId);
  }

  return (await fetchDocumentMetadataByTenant(tenantId)).records;
};

export const createDocumentFolderByTenant = async (tenantId, folder = {}) => {
  if (!hasSupabase() || !tenantId) {
    return createMockDocumentFolderByTenant(tenantId, folder);
  }

  const payload = buildDocumentFolderMetadataPayload(tenantId, folder);
  const response = await supabase
    .from('document_folders')
    .insert(payload)
    .select(folderSelect)
    .single();

  if (response.error) {
    throwDocumentWriteError(response.error);
  }

  const createdFolder = mapFolderWithPayloadMetadata(response.data, payload);
  await recordDocumentAuditEventSafely(tenantId, {
    action: DOCUMENT_AUDIT_ACTIONS.folderCreated,
    entityType: 'document_folder',
    entityId: createdFolder.id,
    payload,
  });

  return createdFolder;
};

export const createDocumentRecordByTenant = async (tenantId, record = {}) => {
  if (!hasSupabase() || !tenantId) {
    return createMockDocumentRecordByTenant(tenantId, record);
  }

  const payload = buildDocumentRecordMetadataPayload(tenantId, record);
  const response = await supabase
    .from('document_records')
    .insert(payload)
    .select(recordSelect)
    .single();

  if (response.error) {
    throwDocumentWriteError(response.error);
  }

  const createdRecord = mapRecordWithPayloadMetadata(response.data, payload);
  await recordDocumentAuditEventSafely(tenantId, {
    action: DOCUMENT_AUDIT_ACTIONS.recordCreated,
    entityType: 'document_record',
    entityId: createdRecord.id,
    payload,
  });

  return createdRecord;
};

export const updateDocumentRecordMetadataByTenant = async (tenantId, recordId, recordPatch = {}) => {
  if (!hasSupabase() || !tenantId) {
    return updateMockDocumentRecordMetadataByTenant(tenantId, recordId, recordPatch);
  }

  const safeMetadata = sanitizeDocumentMetadata(recordPatch.metadata);
  const updatePayload = {
    metadata: safeMetadata,
    storage_path: null,
    status: 'metadata_only',
  };

  if (typeof recordPatch.display_name === 'string') {
    updatePayload.display_name = sanitizeDocumentLabel(recordPatch.display_name, 'Metadado seguro');
  }

  const response = await supabase
    .from('document_records')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', recordId)
    .select(recordSelect)
    .single();

  if (response.error) {
    throwDocumentWriteError(response.error);
  }

  const updatedRecord = mapRecordWithPayloadMetadata(response.data, { metadata: safeMetadata });
  await recordDocumentAuditEventSafely(tenantId, {
    action: DOCUMENT_AUDIT_ACTIONS.recordUpdated,
    entityType: 'document_record',
    entityId: updatedRecord.id,
    payload: {
      ...updatedRecord,
      metadata: safeMetadata,
    },
  });

  return updatedRecord;
};
