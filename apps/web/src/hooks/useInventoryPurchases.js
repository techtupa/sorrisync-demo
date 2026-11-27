import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  fetchInventoryPurchasesByTenant,
  recordInventoryPurchaseByTenant,
  reverseInventoryPurchaseByTenant,
  saveInventorySupplierByTenant,
} from '@/repositories/index.js';

export const useInventoryPurchases = ({ onChanged, sourceAvailable = false } = {}) => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const allowed = Boolean(currentTenantId && isSupabaseMode && canAccessModule('mod_estoque') && hasPermission('inventory.manage'));
  const context = `${currentTenantId}:${allowed}`;
  const activeContext = useRef(context);
  activeContext.current = context;
  const mounted = useRef(false);
  const inFlight = useRef(null);
  const readSequence = useRef(0);
  const visibleCount = useRef(0);
  const nextCursor = useRef(null);
  const [state, setState] = useState({ context, purchases: [], loading: false, error: null });
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(async (append = false) => {
    if (!allowed) return;
    const sequence = ++readSequence.current;
    setState((previous) => ({ ...(previous.context === context ? previous : { purchases: [] }), context, loading: true, error: null }));
    try {
      let page = await fetchInventoryPurchasesByTenant(currentTenantId, { cursor: append ? nextCursor.current : null });
      let rows = page.purchases;
      while (!append && rows.length < visibleCount.current && page.next_cursor) {
        if (!mounted.current || activeContext.current !== context || readSequence.current !== sequence) return;
        page = await fetchInventoryPurchasesByTenant(currentTenantId, { cursor: page.next_cursor });
        rows = [...rows, ...page.purchases];
      }
      if (mounted.current && activeContext.current === context && readSequence.current === sequence) {
        nextCursor.current = page.next_cursor;
        visibleCount.current = append ? visibleCount.current + rows.length : rows.length;
        setState((previous) => ({ context, purchases: append ? [...new Map([...previous.purchases, ...rows].map((p) => [p.id, p])).values()] : rows, nextCursor: page.next_cursor, loading: false, error: null }));
      }
    } catch {
      if (mounted.current && activeContext.current === context && readSequence.current === sequence) setState((previous) => ({ ...previous, loading: false, error: 'Não foi possível atualizar as compras. O último resultado confirmado foi preservado. Tente atualizar novamente.' }));
    }
  }, [allowed, context, currentTenantId]);
  useEffect(() => {
    mounted.current = true;
    inFlight.current = null;
    visibleCount.current = 0;
    nextCursor.current = null;
    setSaving(false);
    setState({ context, purchases: [], loading: allowed, error: null });
    void refresh();
    return () => { mounted.current = false; readSequence.current += 1; };
  }, [allowed, context, refresh]);
  const run = useCallback(async (operation, input) => {
    if (!allowed || activeContext.current !== context) throw Object.assign(new Error('SS_INVENTORY_MANAGE_PERMISSION_DENIED'), { code: '42501' });
    if (!sourceAvailable && !input.recovering) throw Object.assign(new Error('SS_INVENTORY_SOURCE_UNAVAILABLE'), { code: 'PT409' });
    if (inFlight.current) throw Object.assign(new Error('SS_INVENTORY_OPERATION_UNAVAILABLE'), { code: 'PT409' });
    const token = {};
    inFlight.current = token;
    setSaving(true);
    try {
      const result = await operation(currentTenantId, input);
      if (!mounted.current || activeContext.current !== context) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      if (Array.isArray(result.lines)) setState((previous) => ({ ...previous, purchases: previous.purchases.some((p) => p.id === result.id) ? previous.purchases.map((p) => p.id === result.id ? result : p) : [result, ...previous.purchases] }));
      await refresh();
      if (!mounted.current || activeContext.current !== context) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      onChanged?.();
      return result;
    } finally {
      if (mounted.current && activeContext.current === context && inFlight.current === token) { inFlight.current = null; setSaving(false); }
    }
  }, [allowed, context, currentTenantId, onChanged, refresh, sourceAvailable]);
  return {
    canManagePurchases: allowed, saving, refresh,
    loadMore: state.context === context && state.nextCursor && !state.loading ? () => refresh(true) : undefined,
    purchases: state.context === context && allowed ? state.purchases : [],
    loading: state.context === context && state.loading,
    error: state.context === context ? state.error : null,
    saveSupplier: (input) => run(saveInventorySupplierByTenant, input),
    receive: (input) => run(recordInventoryPurchaseByTenant, input),
    reverse: (input) => run(reverseInventoryPurchaseByTenant, input),
  };
};
