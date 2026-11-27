import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  createMockTreatmentQuoteShareLinkByQuote,
  createTreatmentQuoteShareLinkByQuote,
  fetchTreatmentQuoteShareStatus,
  getMockTreatmentQuoteShareStatusByQuote,
  reissueMockTreatmentQuoteShareLinkByQuote,
  reissueTreatmentQuoteShareLinkByQuote,
  revokeMockTreatmentQuoteShareLinkByQuote,
  revokeTreatmentQuoteShareLinkByQuote,
} from '@/repositories/index.js';

export const useTreatmentQuoteSharing = (patientId, quotes = [], canRead = false, canManage = false) => {
  const { currentTenantId, isSupabaseMode } = useAuth();
  const quoteIds = useMemo(() => quotes.map((quote) => quote.id), [quotes]);
  const quoteScope = quotes.map((quote) => `${quote.id}:${quote.status}`).join('|');
  const scope = `${currentTenantId || ''}:${patientId || ''}:${quoteScope}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sequenceRef = useRef(0);
  const [state, setState] = useState({ scope: '', statusByQuote: {}, loading: false, error: null });
  const [mutationInFlightId, setMutationInFlightId] = useState(null);

  const refresh = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    if (!canRead || quoteIds.length === 0) {
      setState({ scope, statusByQuote: {}, loading: false, error: null });
      return {};
    }
    setState((current) => ({ ...current, scope, loading: true, error: null }));
    try {
      const entries = await Promise.all(quoteIds.map(async (quoteId) => {
        const status = isSupabaseMode
          ? await fetchTreatmentQuoteShareStatus({ quoteId })
          : await getMockTreatmentQuoteShareStatusByQuote({ tenantId: currentTenantId, quoteId, canRead });
        return [quoteId, status];
      }));
      const statusByQuote = Object.fromEntries(entries);
      if (sequenceRef.current === sequence && scopeRef.current === scope) {
        setState({ scope, statusByQuote, loading: false, error: null });
      }
      return statusByQuote;
    } catch (error) {
      if (sequenceRef.current === sequence && scopeRef.current === scope) {
        setState({ scope, statusByQuote: {}, loading: false, error: error?.userMessage || 'Não foi possível consultar o estado dos links seguros.' });
      }
      return {};
    }
  }, [canRead, currentTenantId, isSupabaseMode, quoteIds, scope]);

  useEffect(() => {
    setMutationInFlightId(null);
    refresh();
    return () => { sequenceRef.current += 1; };
  }, [refresh]);

  const mutate = useCallback(async ({ operation, quoteId, requestId }) => {
    if (!canManage || mutationInFlightId) throw new Error('SS_TREATMENT_SHARE_ACCESS_DENIED');
    const mutationScope = scope;
    setMutationInFlightId(`${operation}:${quoteId}`);
    try {
      const args = { tenantId: currentTenantId, quoteId, requestId, canManage };
      const result = operation === 'create'
        ? await (isSupabaseMode ? createTreatmentQuoteShareLinkByQuote(args) : createMockTreatmentQuoteShareLinkByQuote(args))
        : operation === 'reissue'
          ? await (isSupabaseMode ? reissueTreatmentQuoteShareLinkByQuote(args) : reissueMockTreatmentQuoteShareLinkByQuote(args))
          : await (isSupabaseMode ? revokeTreatmentQuoteShareLinkByQuote(args) : revokeMockTreatmentQuoteShareLinkByQuote(args));
      if (scopeRef.current !== mutationScope) throw new Error('SS_TREATMENT_SHARE_SCOPE_CHANGED');
      setState((current) => ({
        ...current,
        statusByQuote: { ...current.statusByQuote, [quoteId]: { ...result, oneTimeToken: null } },
        error: null,
      }));
      return result;
    } finally {
      setMutationInFlightId(null);
    }
  }, [canManage, currentTenantId, isSupabaseMode, mutationInFlightId, scope]);

  const visibleState = state.scope === scope ? state : { statusByQuote: {}, loading: false, error: null };
  return {
    ...visibleState,
    mutationInFlight: Boolean(mutationInFlightId),
    mutationInFlightId,
    refresh,
    createShareLink: ({ quoteId, requestId }) => mutate({ operation: 'create', quoteId, requestId }),
    revokeShareLink: ({ quoteId, requestId }) => mutate({ operation: 'revoke', quoteId, requestId }),
    reissueShareLink: ({ quoteId, requestId }) => mutate({ operation: 'reissue', quoteId, requestId }),
  };
};
