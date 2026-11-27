import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  archiveClinicalProtocolTemplate,
  clinicalProtocolTemplateErrorMessage,
  fetchClinicalProtocolTemplates,
  fetchClinicalProtocolTemplateVersions,
  publishClinicalProtocolTemplate,
  saveClinicalProtocolTemplate,
} from '@/repositories/index.js';

export const useClinicalProtocolTemplates = () => {
  const { currentTenant, currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(isSupabaseMode && currentTenantId
    && currentTenant?.slug === 'tenant_harbor'
    && canAccessModule('mod_prontuario') && canAccessModule('mod_tratamentos')
    && hasPermission('patients.read') && hasPermission('clinical_records.read')
    && hasPermission('treatment_plans.read') && hasPermission('treatment_protocols.read'));
  const canManage = Boolean(canRead && hasPermission('treatment_protocols.manage'));
  const canPublish = Boolean(canManage && hasPermission('treatment_protocols.publish'));
  const [state, setState] = useState({ scope: '', rows: [], loading: false, error: '' });
  const [versions, setVersions] = useState([]);
  const [versionsError, setVersionsError] = useState('');
  const [mutationInFlight, setMutationInFlight] = useState(false);
  const scope = `${currentTenantId || ''}:${canRead}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sequenceRef = useRef(0);
  const versionSequenceRef = useRef(0);

  const refresh = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    if (!canRead) {
      setState({ scope, rows: [], loading: false, error: '' });
      return [];
    }
    setState((old) => ({ ...old, scope, loading: true, error: '' }));
    try {
      const rows = await fetchClinicalProtocolTemplates(currentTenantId);
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, rows, loading: false, error: '' });
      }
      return rows;
    } catch (error) {
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, rows: [], loading: false, error: clinicalProtocolTemplateErrorMessage(error) });
      }
      return [];
    }
  }, [canRead, currentTenantId, scope]);

  const loadVersions = useCallback(async (templateId) => {
    const sequence = ++versionSequenceRef.current;
    setVersions([]);
    setVersionsError('');
    if (!canRead || !templateId) return [];
    try {
      const rows = await fetchClinicalProtocolTemplateVersions(currentTenantId, templateId);
      if (scopeRef.current === scope && versionSequenceRef.current === sequence) setVersions(rows);
      return rows;
    } catch (error) {
      if (scopeRef.current === scope && versionSequenceRef.current === sequence) {
        setVersionsError(clinicalProtocolTemplateErrorMessage(error));
      }
      return [];
    }
  }, [canRead, currentTenantId, scope]);

  useEffect(() => {
    versionSequenceRef.current += 1;
    setVersions([]);
    setVersionsError('');
    setMutationInFlight(false);
    refresh();
    return () => { sequenceRef.current += 1; };
  }, [refresh]);

  const mutate = useCallback(async (operation) => {
    if (!canManage || mutationInFlight) throw new Error('SS_PROTOCOL_ACCESS_DENIED');
    setMutationInFlight(true);
    try {
      const result = await operation();
      await refresh();
      if (result?.template_id) await loadVersions(result.template_id);
      return result;
    } finally {
      setMutationInFlight(false);
    }
  }, [canManage, mutationInFlight, refresh, loadVersions]);

  return {
    templates: state.scope === scope ? state.rows : [],
    versions,
    versionsError,
    loading: state.scope === scope && state.loading,
    error: state.scope === scope ? state.error : '',
    canRead,
    canManage,
    canPublish,
    mutationInFlight,
    refresh,
    loadVersions,
    saveTemplate: (input) => mutate(() => saveClinicalProtocolTemplate({ tenantId: currentTenantId, ...input })),
    publishTemplate: (input) => canPublish
      ? mutate(() => publishClinicalProtocolTemplate(input))
      : Promise.reject(new Error('SS_PROTOCOL_ACCESS_DENIED')),
    archiveTemplate: (input) => mutate(() => archiveClinicalProtocolTemplate(input)),
  };
};
