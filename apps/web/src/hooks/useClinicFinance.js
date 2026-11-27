import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  cancelClinicPayableByTenant,
  cancelClinicReceivableByTenant,
  cancelMockClinicPayableByTenant,
  cancelMockClinicReceivableByTenant,
  clinicFinanceMutationErrorMessage,
  createClinicPayableByTenant,
  createClinicReceivableByTenant,
  createMockClinicPayableByTenant,
  createMockClinicReceivableByTenant,
  fetchClinicFinanceReadModelByTenant,
  getClinicFinanceReadModelByTenant,
  createEmptyClinicFinanceReadModel,
  loadClinicFinanceReadModel,
  reverseClinicPayableSettlementByTenant,
  reverseClinicReceivableSettlementByTenant,
  reverseMockClinicPayableSettlementByTenant,
  reverseMockClinicReceivableSettlementByTenant,
  settleClinicPayableByTenant,
  settleClinicReceivableByTenant,
  settleMockClinicPayableByTenant,
  settleMockClinicReceivableByTenant,
  clinicFinanceSettlementErrorMessage,
  updateClinicPayableByTenant,
  updateClinicReceivableByTenant,
  updateMockClinicPayableByTenant,
  updateMockClinicReceivableByTenant,
} from '@/repositories/index.js';

export const useClinicFinance = () => {
  const {
    currentTenantId,
    isSupabaseMode,
    canAccessModule,
    hasPermission,
  } = useAuth();
  const canRead = Boolean(
    currentTenantId
      && canAccessModule('mod_financeiro')
      && hasPermission('clinic_finance.read'),
  );
  const canManage = Boolean(canRead && hasPermission('clinic_finance.manage'));
  const requestIdRef = useRef(0);
  const mutationRequestIdRef = useRef(0);
  const settlementRequestIdRef = useRef(0);
  const tenantRef = useRef(currentTenantId);
  tenantRef.current = currentTenantId;
  const operationRef = useRef(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [mutationState, setMutationState] = useState({
    mutationInFlightId: null,
    mutationError: null,
    mutationResult: null,
  });
  const [settlementState, setSettlementState] = useState({
    settlementInFlightId: null,
    settlementError: null,
    settlementResult: null,
  });
  const [state, setState] = useState(() => ({
    data: createEmptyClinicFinanceReadModel(currentTenantId),
    loading: Boolean(currentTenantId && canRead),
    error: null,
    permissionDenied: false,
  }));

  useEffect(() => {
    tenantRef.current = currentTenantId;
    operationRef.current = null;
    mutationRequestIdRef.current += 1;
    settlementRequestIdRef.current += 1;
    setMutationState({ mutationInFlightId: null, mutationError: null, mutationResult: null });
    setSettlementState({ settlementInFlightId: null, settlementError: null, settlementResult: null });
  }, [currentTenantId]);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!currentTenantId || !canRead) {
      setState({
        data: createEmptyClinicFinanceReadModel(currentTenantId),
        loading: false,
        error: null,
        permissionDenied: Boolean(currentTenantId && !canRead),
      });
      return undefined;
    }

    setState({
      data: createEmptyClinicFinanceReadModel(currentTenantId),
      loading: true,
      error: null,
      permissionDenied: false,
    });

    loadClinicFinanceReadModel({
      tenantId: currentTenantId,
      canRead,
      isSupabaseMode,
      fetchSupabase: fetchClinicFinanceReadModelByTenant,
      fetchMock: getClinicFinanceReadModelByTenant,
    }).then((result) => {
      if (requestIdRef.current !== requestId) return;
      setState({ ...result, loading: false });
    });

    return () => {
      if (requestIdRef.current === requestId) requestIdRef.current += 1;
    };
  }, [canRead, currentTenantId, isSupabaseMode, reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);
  const clearMutationFeedback = useCallback(() => {
    setMutationState((current) => current.mutationInFlightId
      ? current
      : { mutationInFlightId: null, mutationError: null, mutationResult: null });
  }, []);
  const clearSettlementFeedback = useCallback(() => {
    setSettlementState((current) => current.settlementInFlightId
      ? current
      : { settlementInFlightId: null, settlementError: null, settlementResult: null });
  }, []);

  const runMutation = useCallback(async (mutationId, supabaseMutation, mockMutation, input) => {
    if (operationRef.current) throw Object.assign(new Error('Operação em andamento.'), { userMessage: 'Aguarde a confirmação da operação atual.' });
    if (tenantRef.current !== currentTenantId) throw Object.assign(new Error('TENANT_CONTEXT_CHANGED'), { userMessage: 'A clínica mudou. Atualize o lançamento antes de continuar.' });
    const mutationRequestId = mutationRequestIdRef.current + 1;
    mutationRequestIdRef.current = mutationRequestId;
    const tenantId = currentTenantId;

    if (!tenantId || !canManage) {
      const message = 'Seu perfil não possui permissão para esta operação.';
      setMutationState({ mutationInFlightId: null, mutationError: message, mutationResult: null });
      throw new Error(message);
    }

    const operation = {};
    operationRef.current = operation;
    setMutationState({ mutationInFlightId: mutationId, mutationError: null, mutationResult: null });
    try {
      const mutation = isSupabaseMode ? supabaseMutation : mockMutation;
      const result = await mutation({ tenantId, canManage: true, ...input });
      if (mutationRequestIdRef.current !== mutationRequestId || tenantRef.current !== tenantId) {
        const staleError = new Error('O tenant mudou durante a operação. Atualize a tela antes de continuar.');
        staleError.code = 'TENANT_CONTEXT_CHANGED';
        throw staleError;
      }
      setMutationState({ mutationInFlightId: null, mutationError: null, mutationResult: result });
      setReloadToken((value) => value + 1);
      return result;
    } catch (error) {
      const message = error?.userMessage || clinicFinanceMutationErrorMessage(error);
      if (mutationRequestIdRef.current === mutationRequestId && tenantRef.current === tenantId) {
        setMutationState({ mutationInFlightId: null, mutationError: message, mutationResult: null });
      }
      throw Object.assign(error instanceof Error ? error : new Error(message), { userMessage: message });
    } finally {
      if (operationRef.current === operation) operationRef.current = null;
    }
  }, [canManage, currentTenantId, isSupabaseMode]);

  const createReceivable = useCallback((draft) => runMutation(
    'create-receivable', createClinicReceivableByTenant, createMockClinicReceivableByTenant, { draft },
  ), [runMutation]);
  const createPayable = useCallback((draft) => runMutation(
    'create-payable', createClinicPayableByTenant, createMockClinicPayableByTenant, { draft },
  ), [runMutation]);
  const updateReceivable = useCallback((entry, draft) => runMutation(
    `update-receivable-${entry?.id || 'unknown'}`,
    updateClinicReceivableByTenant,
    updateMockClinicReceivableByTenant,
    { entryId: entry?.id, expectedUpdatedAt: entry?.updatedAt, draft },
  ), [runMutation]);
  const updatePayable = useCallback((entry, draft) => runMutation(
    `update-payable-${entry?.id || 'unknown'}`,
    updateClinicPayableByTenant,
    updateMockClinicPayableByTenant,
    { entryId: entry?.id, expectedUpdatedAt: entry?.updatedAt, draft },
  ), [runMutation]);
  const cancelReceivable = useCallback((entry, reasonCode) => runMutation(
    `cancel-receivable-${entry?.id || 'unknown'}`,
    cancelClinicReceivableByTenant,
    cancelMockClinicReceivableByTenant,
    { entryId: entry?.id, expectedUpdatedAt: entry?.updatedAt, reasonCode },
  ), [runMutation]);
  const cancelPayable = useCallback((entry, reasonCode) => runMutation(
    `cancel-payable-${entry?.id || 'unknown'}`,
    cancelClinicPayableByTenant,
    cancelMockClinicPayableByTenant,
    { entryId: entry?.id, expectedUpdatedAt: entry?.updatedAt, reasonCode },
  ), [runMutation]);

  const runSettlementMutation = useCallback(async (operationId, supabaseMutation, mockMutation, entry, input) => {
    if (operationRef.current) throw Object.assign(new Error('Operação em andamento.'), { userMessage: 'Aguarde a confirmação da operação atual.' });
    if (tenantRef.current !== currentTenantId || (entry?.tenantId && entry.tenantId !== currentTenantId)) throw Object.assign(new Error('TENANT_CONTEXT_CHANGED'), { userMessage: 'A clínica mudou. Atualize o lançamento antes de continuar.' });
    const requestSequence = settlementRequestIdRef.current + 1;
    settlementRequestIdRef.current = requestSequence;
    const tenantId = currentTenantId;
    if (!tenantId || !canManage) {
      const message = 'Seu perfil não possui permissão para esta operação.';
      setSettlementState({ settlementInFlightId: null, settlementError: message, settlementResult: null });
      throw new Error(message);
    }

    const operation = {};
    operationRef.current = operation;
    setSettlementState({ settlementInFlightId: operationId, settlementError: null, settlementResult: null });
    try {
      const mutation = isSupabaseMode ? supabaseMutation : mockMutation;
      const result = await mutation({ tenantId, canManage: true, entry, ...input });
      if (settlementRequestIdRef.current !== requestSequence || tenantRef.current !== tenantId) {
        const staleError = new Error('O tenant mudou durante a operação. Atualize a tela antes de continuar.');
        staleError.code = 'TENANT_CONTEXT_CHANGED';
        throw staleError;
      }
      setSettlementState({ settlementInFlightId: null, settlementError: null, settlementResult: result });
      setReloadToken((value) => value + 1);
      return result;
    } catch (error) {
      const message = error?.userMessage || clinicFinanceSettlementErrorMessage(error);
      if (settlementRequestIdRef.current === requestSequence && tenantRef.current === tenantId) {
        setSettlementState({ settlementInFlightId: null, settlementError: message, settlementResult: null });
      }
      throw Object.assign(error instanceof Error ? error : new Error(message), { userMessage: message });
    } finally {
      if (operationRef.current === operation) operationRef.current = null;
    }
  }, [canManage, currentTenantId, isSupabaseMode]);

  const settleReceivable = useCallback((entry, input) => runSettlementMutation(
    `settle-receivable-${entry?.id || 'unknown'}`,
    settleClinicReceivableByTenant,
    settleMockClinicReceivableByTenant,
    entry,
    input,
  ), [runSettlementMutation]);
  const settlePayable = useCallback((entry, input) => runSettlementMutation(
    `settle-payable-${entry?.id || 'unknown'}`,
    settleClinicPayableByTenant,
    settleMockClinicPayableByTenant,
    entry,
    input,
  ), [runSettlementMutation]);
  const reverseReceivableSettlement = useCallback((entry, input) => runSettlementMutation(
    `reverse-receivable-${entry?.id || 'unknown'}`,
    reverseClinicReceivableSettlementByTenant,
    reverseMockClinicReceivableSettlementByTenant,
    entry,
    input,
  ), [runSettlementMutation]);
  const reversePayableSettlement = useCallback((entry, input) => runSettlementMutation(
    `reverse-payable-${entry?.id || 'unknown'}`,
    reverseClinicPayableSettlementByTenant,
    reverseMockClinicPayableSettlementByTenant,
    entry,
    input,
  ), [runSettlementMutation]);

  return {
    ...state,
    canRead,
    canManage,
    createReceivable,
    updateReceivable,
    cancelReceivable,
    createPayable,
    updatePayable,
    cancelPayable,
    clearMutationFeedback,
    clearSettlementFeedback,
    settleReceivable,
    reverseReceivableSettlement,
    settlePayable,
    reversePayableSettlement,
    refresh,
    source: state.data.source,
    ...mutationState,
    ...settlementState,
  };
};

export default useClinicFinance;
