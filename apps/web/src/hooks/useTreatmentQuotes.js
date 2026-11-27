import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  acceptMockTreatmentPlanQuote,
  acceptTreatmentPlanQuote,
  buildTreatmentQuoteReadModel,
  cancelMockTreatmentPlanQuote,
  cancelTreatmentPlanQuote,
  declineMockTreatmentPlanQuote,
  declineTreatmentPlanQuote,
  fetchPatientTreatmentQuotes,
  getMockPatientTreatmentQuotes,
  issueMockTreatmentPlanQuote,
  issueTreatmentPlanQuote,
  treatmentQuoteErrorMessage,
} from '@/repositories/index.js';

const EMPTY_MODEL = buildTreatmentQuoteReadModel([], []);

export const useTreatmentQuotes = (patientId, activePlan = null) => {
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
  const canManage = Boolean(canRead
    && hasPermission('clinical_records.manage')
    && hasPermission('treatment_plans.manage'));
  const planId = activePlan?.id || '';
  const scope = `${currentTenantId || ''}:${patientId || ''}:${planId}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const requestSequence = useRef(0);
  const [state, setState] = useState({ scope: '', model: EMPTY_MODEL, loading: false, error: null });
  const [mutationInFlightId, setMutationInFlightId] = useState(null);

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
        ? fetchPatientTreatmentQuotes({ patientId, treatmentPlanId: planId || null, includeCandidates: canManage })
        : getMockPatientTreatmentQuotes({
          tenantId: currentTenantId, patientId, activePlan, canRead, includeCandidates: canManage,
        }));
      if (requestSequence.current === sequence && scopeRef.current === scope) {
        setState({ scope, model, loading: false, error: null });
      }
      return model;
    } catch (error) {
      if (requestSequence.current === sequence && scopeRef.current === scope) {
        setState({ scope, model: EMPTY_MODEL, loading: false, error: treatmentQuoteErrorMessage(error) });
      }
      return EMPTY_MODEL;
    }
  }, [activePlan, canManage, canRead, currentTenantId, isSupabaseMode, patientId, planId, scope]);

  useEffect(() => {
    setMutationInFlightId(null);
    refresh();
    return () => { requestSequence.current += 1; };
  }, [refresh]);

  const mutate = useCallback(async (operation, inFlightId) => {
    if (!canManage || mutationInFlightId) throw new Error('SS_TREATMENT_QUOTE_ACCESS_DENIED');
    setMutationInFlightId(inFlightId);
    try {
      const result = await operation();
      await refresh();
      return result;
    } finally {
      setMutationInFlightId(null);
    }
  }, [canManage, mutationInFlightId, refresh]);

  const issueQuote = useCallback((input) => mutate(() => (isSupabaseMode
    ? issueTreatmentPlanQuote({ treatmentPlanId: planId, ...input })
    : issueMockTreatmentPlanQuote({
      tenantId: currentTenantId, patientId, activePlan, canManage, treatmentPlanId: planId, ...input,
    })), `issue:${input.requestId}`), [activePlan, canManage, currentTenantId, isSupabaseMode, mutate, patientId, planId]);

  const acceptQuote = useCallback((input) => mutate(() => (isSupabaseMode
    ? acceptTreatmentPlanQuote(input)
    : acceptMockTreatmentPlanQuote({ tenantId: currentTenantId, canManage, ...input })),
  `accept:${input.requestId}`), [canManage, currentTenantId, isSupabaseMode, mutate]);

  const declineQuote = useCallback((input) => mutate(() => (isSupabaseMode
    ? declineTreatmentPlanQuote(input)
    : declineMockTreatmentPlanQuote({ tenantId: currentTenantId, canManage, ...input })),
  `decline:${input.requestId}`), [canManage, currentTenantId, isSupabaseMode, mutate]);

  const cancelQuote = useCallback((input) => mutate(() => (isSupabaseMode
    ? cancelTreatmentPlanQuote(input)
    : cancelMockTreatmentPlanQuote({ tenantId: currentTenantId, canManage, ...input })),
  `cancel:${input.requestId}`), [canManage, currentTenantId, isSupabaseMode, mutate]);

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
    issueQuote,
    acceptQuote,
    declineQuote,
    cancelQuote,
  };
};
