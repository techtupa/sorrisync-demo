import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { loadClinicReconciliationDetail, runClinicReconciliationMutation } from '@/repositories/index.js';
import { reconciliationErrorMessage } from '@/repositories/clinicFinanceReconciliationContract.js';

export const useClinicFinanceReconciliation = entry => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(currentTenantId && canAccessModule('mod_financeiro') && hasPermission('clinic_finance.read'));
  const canManage = Boolean(canRead && hasPermission('clinic_finance.manage'));
  const key = [currentTenantId, entry?.type, entry?.id, canRead, canManage, isSupabaseMode].join(':');
  const context = useRef(key); context.current = key;
  const alive = useRef(true), sequence = useRef(0), operation = useRef(null);
  const [state, setState] = useState({ key: null, data: null, loading: true, readError: null, mutationError: null, busy: false });
  useEffect(() => { alive.current = true; return () => { alive.current = false; sequence.current++; }; }, []);
  const load = useCallback(async (cursor = null) => {
    if (!alive.current || context.current !== key) return;
    const n = ++sequence.current;
    if (!canRead || !entry || (entry.tenantId && entry.tenantId !== currentTenantId)) {
      setState({ key, data: null, loading: false, readError: 'A clínica ou sua permissão não permite esta leitura.', mutationError: null, busy: false }); return;
    }
    setState(s => ({ ...s, key, data: null, loading: true, readError: null, ...(s.key !== key ? { busy: false, mutationError: null } : {}) }));
    try {
      const data = await loadClinicReconciliationDetail({ tenantId: currentTenantId, entry, cursor, isSupabaseMode, canManage });
      if (alive.current && context.current === key && sequence.current === n) setState(s => ({ ...s, key, data, loading: false }));
    } catch (error) {
      if (alive.current && context.current === key && sequence.current === n) setState(s => ({ ...s, key, data: null, loading: false, readError: reconciliationErrorMessage(error) }));
    }
  }, [canRead, canManage, currentTenantId, entry?.id, entry?.type, entry?.updatedAt, isSupabaseMode, key]);
  useEffect(() => { load(); return () => { sequence.current++; }; }, [load]);
  const mutate = async ({ action, requestId, head, draft }) => {
    if (!alive.current || context.current !== key || !canManage || state.key !== key || !state.data?.can_manage || state.loading) throw Error('TENANT_CONTEXT_CHANGED');
    if (operation.current?.key === key) throw Error('SS_RECON_UNAVAILABLE');
    const token = { key }; operation.current = token;
    setState(s => ({ ...s, busy: true, mutationError: null }));
    try {
      const result = await runClinicReconciliationMutation({ tenantId: currentTenantId, entry: state.data.entry, action, requestId, head, draft, isSupabaseMode, canManage });
      if (!alive.current || context.current !== key) throw Error('TENANT_CONTEXT_CHANGED');
      await load(); return result;
    } catch (error) {
      if (alive.current && context.current === key) setState(s => ({ ...s, mutationError: reconciliationErrorMessage(error) }));
      throw error;
    } finally {
      if (operation.current === token) { operation.current = null; if (alive.current && context.current === key) setState(s => ({ ...s, busy: false })); }
    }
  };
  return { ...(state.key === key ? state : { data: null, loading: true, readError: null, mutationError: null, busy: false }), canManage, load, mutate };
};
