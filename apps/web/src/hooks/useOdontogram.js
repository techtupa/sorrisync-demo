import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  appendMockOdontogramFinding,
  appendOdontogramFinding,
  buildOdontogramReadModel,
  fetchPatientOdontogram,
  getMockPatientOdontogram,
  resolveMockOdontogramFinding,
  resolveOdontogramFinding,
} from '@/repositories/index.js';

const EMPTY_MODEL = buildOdontogramReadModel([]);

export const useOdontogram = (patientId) => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(patientId && canAccessModule('mod_prontuario') && hasPermission('patients.read') && hasPermission('clinical_records.read'));
  const canManage = Boolean(canRead && hasPermission('clinical_records.manage'));
  const [state, setState] = useState({ scope: '', model: EMPTY_MODEL, loading: false, error: null });
  const [mutationInFlightId, setMutationInFlightId] = useState(null);
  const [selectedTooth, setSelectedTooth] = useState('');
  const requestSequence = useRef(0);
  const scope = `${currentTenantId || ''}:${patientId || ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (scopeRef.current !== scope) return EMPTY_MODEL;
    if (!canRead) {
      setState({ scope, model: EMPTY_MODEL, loading: false, error: null });
      return EMPTY_MODEL;
    }
    setState({ scope, model: EMPTY_MODEL, loading: true, error: null });
    try {
      const model = await (isSupabaseMode
        ? fetchPatientOdontogram(patientId)
        : getMockPatientOdontogram({ tenantId: currentTenantId, patientId }));
      if (requestSequence.current === sequence && scopeRef.current === scope) setState({ scope, model, loading: false, error: null });
      return model;
    } catch (error) {
      if (requestSequence.current === sequence && scopeRef.current === scope) setState({ scope, model: EMPTY_MODEL, loading: false, error: 'Leitura do odontograma indisponível para este perfil ou paciente.' });
      return EMPTY_MODEL;
    }
  }, [canRead, currentTenantId, isSupabaseMode, patientId, scope]);

  useEffect(() => {
    setSelectedTooth('');
    setMutationInFlightId(null);
    refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  const mutate = useCallback(async (operation, inFlightId) => {
    if (!canManage || mutationInFlightId) throw new Error('SS_ODONTOGRAM_ACCESS_DENIED');
    setMutationInFlightId(inFlightId);
    try {
      const result = await operation();
      await refresh();
      return result;
    } finally {
      setMutationInFlightId(null);
    }
  }, [canManage, mutationInFlightId, refresh]);

  const appendFinding = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? appendOdontogramFinding({ patientId, ...input })
      : appendMockOdontogramFinding({ tenantId: currentTenantId, patientId, ...input })
  ), `append:${input.requestId}`), [currentTenantId, isSupabaseMode, mutate, patientId]);

  const resolveFinding = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? resolveOdontogramFinding(input)
      : resolveMockOdontogramFinding({ tenantId: currentTenantId, ...input })
  ), `resolve:${input.requestId}`), [currentTenantId, isSupabaseMode, mutate]);

  const visibleModel = state.scope === scope ? state.model : EMPTY_MODEL;
  return {
    ...visibleModel,
    loading: state.scope === scope && state.loading,
    error: state.scope === scope ? state.error : null,
    source: isSupabaseMode ? 'supabase' : 'mock-demo',
    scopeKey: scope,
    selectedTooth,
    setSelectedTooth,
    canRead,
    canManage,
    mutationInFlight: Boolean(mutationInFlightId),
    mutationInFlightId,
    refresh,
    appendFinding,
    resolveFinding,
  };
};
