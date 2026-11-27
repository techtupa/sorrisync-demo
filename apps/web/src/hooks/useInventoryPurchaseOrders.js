import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { fetchInventoryOrdersByTenant, fetchInventoryOrderByTenant, mutateInventoryOrderByTenant } from '@/portfolio/orders.js';

export const useInventoryPurchaseOrders = ({ sourceAvailable, onChanged } = {}) => {
  const { currentTenantId, user, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const allowed = Boolean(currentTenantId && canAccessModule('mod_estoque') && hasPermission('inventory.manage'));
  const scope = `${currentTenantId}:${user?.id || ''}:${allowed}`, epoch = useRef({ scope, generation: 0 });
  if (epoch.current.scope !== scope) epoch.current = { scope, generation: epoch.current.generation + 1 };
  const context = `${scope}:${epoch.current.generation}`, active = useRef(context), mounted = useRef(false), flight = useRef(null), sequence = useRef(0), detailSequence = useRef(0), detailId = useRef(null), visible = useRef(0), detailVisible = useRef(0);
  active.current = context;
  const [state, setState] = useState({ context, orders: [] }), [detail, setDetail] = useState(null), [saving, setSaving] = useState(false);
  const current = () => mounted.current && active.current === context;
  const refresh = useCallback(async (cursor = null) => {
    if (!allowed || active.current !== context) return;
    const token = ++sequence.current;
    setState(p => ({ ...(p.context === context ? p : { orders: [] }), context, loading: true, error: null }));
    try {
      let page = await fetchInventoryOrdersByTenant(currentTenantId, cursor), rows = page.orders;
      if (!Array.isArray(rows)) throw new Error('ORDER_LIST_INVALID');
      while (!cursor && rows.length < visible.current && page.next_cursor) {
        if (!mounted.current || active.current !== context || token !== sequence.current) return;
        page = await fetchInventoryOrdersByTenant(currentTenantId, page.next_cursor); rows = [...rows, ...page.orders];
      }
      if (mounted.current && active.current === context && token === sequence.current) {
        visible.current = cursor ? visible.current + rows.length : rows.length;
        setState(p => ({ context, orders: cursor ? [...new Map([...p.orders, ...rows].map(o => [o.id,o])).values()] : rows, nextCursor: page.next_cursor, loading: false }));
      }
    } catch { if (mounted.current && active.current === context && token === sequence.current) setState(p => ({ ...p, loading: false, error: 'Não foi possível atualizar os pedidos. O último resultado confirmado foi preservado.' })); }
  }, [allowed, context, currentTenantId]);
  const loadDetail = useCallback(async (id, cursor = null) => {
    if (!allowed || active.current !== context) return;
    const token = ++detailSequence.current;
    if (detailId.current !== id) detailVisible.current = 0;
    detailId.current = id;
    setDetail(p => ({ ...(p?.order?.id === id ? p : {}), context, id, loading: true, error: null }));
    try {
      let value = await fetchInventoryOrderByTenant(currentTenantId, id, cursor), purchases = value.purchases;
      if (!value.order?.id || !Array.isArray(purchases)) throw new Error('ORDER_DETAIL_INVALID');
      while (!cursor && purchases.length < detailVisible.current && value.next_cursor) {
        if (!mounted.current || active.current !== context || token !== detailSequence.current) return;
        const page = await fetchInventoryOrderByTenant(currentTenantId, id, value.next_cursor);
        // A different revision needs a fresh snapshot, never mixed receipt pages.
        if (page.order.version !== value.order.version) throw new Error('ORDER_DETAIL_CHANGED');
        purchases = [...purchases,...page.purchases]; value = { ...page, purchases };
      }
      if (mounted.current && active.current === context && token === detailSequence.current) {
        detailVisible.current = cursor ? detailVisible.current + purchases.length : purchases.length;
        setDetail(p => {
          if (cursor && p?.order?.version !== value.order.version) return { context,id,error:'O pedido mudou durante a consulta. Atualize o detalhe.',loading:false };
          return { ...value, context,id,purchases:cursor ? [...new Map([...(p?.purchases || []),...purchases].map(o=>[o.id,o])).values()] : purchases,loading:false };
        });
      }
    } catch { if (mounted.current && active.current === context && token === detailSequence.current) setDetail(p=>({...p,loading:false,error:'Não foi possível atualizar o pedido. Atualize antes de continuar.'})); }
  }, [allowed,context,currentTenantId]);
  useEffect(() => {
    mounted.current = true; flight.current = null; visible.current = 0; detailVisible.current = 0; detailId.current = null;
    setDetail(null); setSaving(false); setState({context,orders:[]}); void refresh();
    return () => { mounted.current = false; sequence.current++; detailSequence.current++; };
  }, [context,refresh]);
  const run = async (operation,input) => {
    if (!allowed || !current()) throw Object.assign(new Error('SS_INVENTORY_MANAGE_PERMISSION_DENIED'),{code:'42501'});
    if ((!sourceAvailable && !input.recovering) || flight.current) throw Object.assign(new Error('SS_INVENTORY_OPERATION_UNAVAILABLE'),{code:'PT409'});
    const token={}; flight.current=token; setSaving(true);
    try {
      const result=await mutateInventoryOrderByTenant(currentTenantId,operation,input);
      if (!current()) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      setState(p=>({...p,orders:p.orders.some(o=>o.id===result.order.id)?p.orders.map(o=>o.id===result.order.id?result.order:o):[result.order,...p.orders]}));
      await refresh(); if (!current()) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      if (detailId.current===result.order.id) await loadDetail(result.order.id);
      if (!current()) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      onChanged?.(); return result;
    } finally { if (current() && flight.current===token) { flight.current=null;setSaving(false); } }
  };
  return { context,allowed,saving,refresh,loadDetail,run,state:state.context===context?state:{orders:[]},detail:detail?.context===context?detail:null };
};
