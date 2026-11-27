import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { fetchInventoryCostOverviewByTenant, fetchInventoryItemCostByTenant, setInventoryItemCostBasisByTenant } from '@/repositories/index.js';

export const useInventoryCosts = ({ sourceAvailable, refreshToken, onChanged } = {}) => {
  const { currentTenantId, user, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const allowed = Boolean(currentTenantId && isSupabaseMode && canAccessModule('mod_estoque') && hasPermission('inventory.manage'));
  const scope = `${currentTenantId}:${user?.id || ''}:${allowed}`, epoch = useRef({ scope, generation: 0 });
  if (epoch.current.scope !== scope) epoch.current = { scope, generation: epoch.current.generation+1 };
  const context = `${scope}:${epoch.current.generation}`, active = useRef(context), mounted = useRef(false), flight = useRef(null);
  const detailId = useRef(null), seq = useRef(0), overviewSeq = useRef(0);
  active.current = context;
  const [overview,setOverview] = useState(null), [detail,setDetail] = useState(null), [saving,setSaving] = useState(false);
  const [pending,setRecoveryPending] = useState(false);
  const detailRef = useRef(detail); detailRef.current = detail;
  const refresh = useCallback(async () => {
    if (!allowed || !sourceAvailable || active.current!==context) return;
    const token=++overviewSeq.current;
    setOverview({context,loading:true});
    try { const data=await fetchInventoryCostOverviewByTenant(currentTenantId);
      if (mounted.current && active.current===context && token===overviewSeq.current) setOverview({context,...data});
    } catch { if (mounted.current && active.current===context && token===overviewSeq.current) setOverview({context,error:true}); }
  },[allowed,sourceAvailable,context,currentTenantId]);
  const loadDetail = useCallback(async (id,cursor=null) => {
    if (!allowed || !sourceAvailable || active.current!==context) return;
    const token=++seq.current, previousId=detailId.current;detailId.current=id;
    const previous = detailRef.current;
    const revision=cursor && previous?.context===context && previous?.snapshot?.item_id===id ? previous.snapshot.revision : null;
    setDetail(p=>({...((p?.context===context && previousId===id)?p:{}),context,id,loading:true,error:false}));
    try { const data=await fetchInventoryItemCostByTenant(currentTenantId,id,cursor,revision);
      if (mounted.current && active.current===context && token===seq.current) setDetail(p=>{
        if(cursor && p?.snapshot?.revision!==data.snapshot.revision) return {context,id,error:true};
        return {...data,context,id,events:cursor?[...(p?.events||[]),...data.events]:data.events};
      });
    } catch { if (mounted.current && active.current===context && token===seq.current) setDetail({context,id,error:true}); }
  },[allowed,sourceAvailable,context,currentTenantId]);
  useEffect(()=>{mounted.current=true;flight.current=null;detailId.current=null;setDetail(null);setOverview(null);setSaving(false);setRecoveryPending(false);
    return()=>{mounted.current=false;seq.current++;overviewSeq.current++;};},[context]);
  useEffect(()=>{void refresh();},[refresh,refreshToken]);
  const run = async input => {
    const current=()=>mounted.current && active.current===context;
    if (!allowed || !current()) throw Object.assign(new Error('SS_INVENTORY_MANAGE_PERMISSION_DENIED'),{code:'42501'});
    if ((!sourceAvailable && !input.recovering)||flight.current) throw Object.assign(new Error('SS_INVENTORY_OPERATION_UNAVAILABLE'),{code:'PT409'});
    const token={};flight.current=token;setSaving(true);
    try { const result=await setInventoryItemCostBasisByTenant(currentTenantId,input);
      if (!current()) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      await refresh(); if(!current()) throw new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
      onChanged?.();return result;
    } finally {if(current() && flight.current===token){flight.current=null;setSaving(false);}}
  };
  return {context,allowed,saving,pending,setRecoveryPending,refresh,loadDetail,run,sourceAvailable,
    overview:overview?.context===context && sourceAvailable?overview:null,
    detail:detail?.context===context && sourceAvailable?detail:null};
};
