import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  appendMockTreatmentPlanItem,
  appendTreatmentPlanItem,
  buildTreatmentPlanReadModel,
  cancelMockTreatmentPlanItem,
  cancelTreatmentPlanItem,
  completeMockTreatmentPlanItem,
  completeTreatmentPlanItem,
  fetchPatientTreatmentPlan,
  getMockPatientTreatmentPlan,
  treatmentPlanErrorMessage,
} from '@/repositories/index.js';

const EMPTY_MODEL = buildTreatmentPlanReadModel([], []);

export const useTreatmentPlan = (patientId) => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(
    patientId
    && canAccessModule('mod_prontuario')
    && canAccessModule('mod_tratamentos')
    && hasPermission('patients.read')
    && hasPermission('services.read')
    && hasPermission('clinical_records.read')
    && hasPermission('treatment_plans.read'),
  );
  const canManage = Boolean(
    canRead
    && hasPermission('clinical_records.manage')
    && hasPermission('treatment_plans.manage'),
  );
  const [state, setState] = useState({ scope: '', model: EMPTY_MODEL, loading: false, error: null });
  const [mutationInFlightId, setMutationInFlightId] = useState(null);
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
        ? fetchPatientTreatmentPlan(patientId)
        : getMockPatientTreatmentPlan({ tenantId: currentTenantId, patientId, canRead }));
      if (requestSequence.current === sequence && scopeRef.current === scope) {
        setState({ scope, model, loading: false, error: null });
      }
      return model;
    } catch (error) {
      if (requestSequence.current === sequence && scopeRef.current === scope) {
        setState({ scope, model: EMPTY_MODEL, loading: false, error: treatmentPlanErrorMessage(error) });
      }
      return EMPTY_MODEL;
    }
  }, [canRead, currentTenantId, isSupabaseMode, patientId, scope]);

  useEffect(() => {
    setMutationInFlightId(null);
    refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  const mutate = useCallback(async (operation, inFlightId) => {
    if (!canManage || mutationInFlightId) throw new Error('SS_TREATMENT_PLAN_ACCESS_DENIED');
    setMutationInFlightId(inFlightId);
    try {
      const result = await operation();
      await refresh();
      return result;
    } finally {
      setMutationInFlightId(null);
    }
  }, [canManage, mutationInFlightId, refresh]);

  const appendItem = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? appendTreatmentPlanItem({ patientId, ...input })
      : appendMockTreatmentPlanItem({ tenantId: currentTenantId, patientId, canManage, ...input })
  ), `append:${input.requestId}`), [canManage, currentTenantId, isSupabaseMode, mutate, patientId]);

  const completeItem = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? completeTreatmentPlanItem(input)
      : completeMockTreatmentPlanItem({ tenantId: currentTenantId, canManage, ...input })
  ), `complete:${input.requestId}`), [canManage, currentTenantId, isSupabaseMode, mutate]);

  const cancelItem = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? cancelTreatmentPlanItem(input)
      : cancelMockTreatmentPlanItem({ tenantId: currentTenantId, canManage, ...input })
  ), `cancel:${input.requestId}`), [canManage, currentTenantId, isSupabaseMode, mutate]);

  const visibleModel = state.scope === scope ? state.model : EMPTY_MODEL;
  return {
    ...visibleModel,
    loading: state.scope === scope && state.loading,
    error: state.scope === scope ? state.error : null,
    source: isSupabaseMode ? 'supabase' : 'mock-demo',
    scopeKey: scope,
    canRead,
    canManage,
    mutationInFlight: Boolean(mutationInFlightId),
    mutationInFlightId,
    refresh,
    appendItem,
    completeItem,
    cancelItem,
  };
};
