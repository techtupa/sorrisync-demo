import { supabase } from '@/lib/supabaseClient.js';
import {
  clinicalProtocolTemplateErrorMessage,
  validateClinicalProtocolDefinition,
} from '../clinicalProtocolTemplateContract.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const requireUuid = (value) => {
  if (!uuidPattern.test(String(value || ''))) throw new Error('SS_PROTOCOL_INPUT_INVALID');
};

const unwrap = (response) => {
  if (response.error) {
    response.error.userMessage = clinicalProtocolTemplateErrorMessage(response.error);
    throw response.error;
  }
  return response.data;
};

export const fetchClinicalProtocolTemplates = async (tenantId) => {
  requireUuid(tenantId);
  const response = await supabase.from('clinical_protocol_templates')
    .select('id, tenant_id, title, status, draft_definition, draft_revision, last_published_revision, created_at, updated_at')
    .eq('tenant_id', tenantId).order('updated_at', { ascending: false });
  return unwrap(response) || [];
};

export const fetchClinicalProtocolTemplateVersions = async (tenantId, templateId) => {
  requireUuid(tenantId);
  requireUuid(templateId);
  const response = await supabase.from('clinical_protocol_template_versions')
    .select('id, tenant_id, template_id, version_number, source_revision, title, definition, published_at')
    .eq('tenant_id', tenantId).eq('template_id', templateId)
    .order('version_number', { ascending: false });
  return unwrap(response) || [];
};

export const saveClinicalProtocolTemplate = async ({ tenantId, templateId = null, title, definition, expectedRevision = null, requestId }) => {
  requireUuid(tenantId);
  requireUuid(requestId);
  if (templateId) requireUuid(templateId);
  const validation = validateClinicalProtocolDefinition(definition);
  if (!validation.valid || typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100) {
    const error = new Error('SS_PROTOCOL_INPUT_INVALID');
    error.userMessage = validation.message || 'Informe um título entre 3 e 100 caracteres.';
    throw error;
  }
  const data = unwrap(await supabase.rpc('save_clinical_protocol_template', {
    p_tenant_id: tenantId,
    p_template_id: templateId,
    p_title: title.trim(),
    p_definition: definition,
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(data) || data.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return data[0];
};

export const publishClinicalProtocolTemplate = async ({ templateId, expectedRevision, requestId, definition }) => {
  requireUuid(templateId);
  requireUuid(requestId);
  const validation = validateClinicalProtocolDefinition(definition, { publish: true });
  if (!validation.valid) {
    const error = new Error('SS_PROTOCOL_INPUT_INVALID');
    error.userMessage = validation.message;
    throw error;
  }
  const data = unwrap(await supabase.rpc('publish_clinical_protocol_template', {
    p_template_id: templateId,
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(data) || data.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return data[0];
};

export const archiveClinicalProtocolTemplate = async ({ templateId, expectedRevision, requestId }) => {
  requireUuid(templateId);
  requireUuid(requestId);
  const data = unwrap(await supabase.rpc('archive_clinical_protocol_template', {
    p_template_id: templateId,
    p_expected_revision: expectedRevision,
    p_request_id: requestId,
  }));
  if (!Array.isArray(data) || data.length !== 1) throw new Error('SS_PROTOCOL_EMPTY_RESULT');
  return data[0];
};
