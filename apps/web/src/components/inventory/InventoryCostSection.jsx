import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInventoryRequestId } from '@/repositories/index.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
import { formatInventoryOrderQuantity } from '@/repositories/inventoryOrdersContract.js';
import { formatInventoryCostValue, formatInventoryCostAverage, inventoryCostStateLabel, validateInventoryCostBasis,
  inventoryCostEventLabel, isInventoryCostKnownRefusal, inventoryCostErrorMessage } from '@/repositories/inventoryCostsContract.js';

export const InventoryCostOverview = ({ costs }) => {
  if (!costs?.allowed) return null;
  const o=costs.overview, ready=costs.sourceAvailable && o?.available && !o.loading && !o.error;
  const value=!ready?'Valoração indisponível':o.positive_items>0 && o.known_items===0?'Não calculado':formatInventoryCostValue(o.value_scaled);
  return <section aria-label="Valorização operacional da clínica" className="rounded-xl border border-border/50 bg-card p-4 mb-6 space-y-2 min-w-0">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-sm font-semibold">Valor com custo definido</h2><p className="text-xl font-bold break-words">{o?.loading?'Consultando valoração…':value}</p></div>
      <Button variant="outline" size="sm" onClick={costs.refresh} disabled={!costs.sourceAvailable || o?.loading}>Atualizar valoração</Button></div>
    {ready && <p className="text-sm text-muted-foreground">Cobertura {o.unknown_items>0?'parcial':'completa'} · {o.known_items} de {o.positive_items} itens com saldo têm custo definido. {o.unknown_items>0?`${o.unknown_items} sem custo informado. `:''}{o.inactive_items>0?`Inclui ${o.inactive_items} item(ns) inativo(s) com saldo.`:''}</p>}
    <p className="text-xs text-muted-foreground">Toda a clínica, incluindo inativos; os filtros da lista não alteram este subtotal. Custo desconhecido não é zero. Valor operacional, sem efeito financeiro ou fiscal.</p>
  </section>;
};

const InventoryCostSection = ({ itemId, costs, onBlockClose }) => {
  const [editing,setEditing]=useState(false),[price,setPrice]=useState(''),[error,setError]=useState(null),[uncertain,setUncertain]=useState(false),[stale,setStale]=useState(false);
  const attempt=useRef(null), s=costs.detail?.id===itemId?costs.detail:null;
  const snapshot=s?.snapshot, ready=Boolean(costs.sourceAvailable && snapshot?.available && !s.loading && !s.error);
  const blocked=costs.saving || uncertain, validation=validateInventoryCostBasis(price);
  const unit=INVENTORY_UNIT_LABELS[snapshot?.unit_code] || snapshot?.unit_code;
  const formSnapshot=uncertain?attempt.current?.snapshot:snapshot;
  useEffect(()=>{void costs.loadDetail(itemId);},[costs.loadDetail,itemId]);
  useEffect(()=>{onBlockClose(blocked);return()=>onBlockClose(false);},[blocked,onBlockClose]);
  const update=async()=>{setStale(false);setError(null);await Promise.all([costs.loadDetail(itemId),costs.refresh()]);};
  const submit=async event=>{
    event.preventDefault();if(costs.saving)return;
    if(!uncertain && (!ready || stale || !validation.valid)) {setError(validation.message || 'Atualize e revise o saldo antes de definir custo.');return;}
    if(!uncertain)attempt.current={itemId,requestId:createInventoryRequestId(),expectedRevision:snapshot.revision,expectedUpdatedAt:snapshot.item_updated_at,unitCostCents:validation.cents,snapshot};
    setError(null);
    try{await costs.run({...attempt.current,recovering:uncertain});setUncertain(false);setEditing(false);setPrice('');attempt.current=null;await costs.loadDetail(itemId);}
    catch(failure){setError(inventoryCostErrorMessage(failure));const known=isInventoryCostKnownRefusal(failure);setUncertain(!known);if(known){setStale(true);attempt.current=null;}}
  };
  return <section aria-label="Custeio operacional do item" className="rounded-xl border border-border/50 bg-card p-4 space-y-4 min-w-0">
    <div className="flex flex-wrap justify-between items-center gap-2"><h4 className="text-sm font-semibold">Custeio operacional</h4><Button size="sm" variant="outline" disabled={blocked || s?.loading || !costs.sourceAvailable} onClick={update}>Atualizar custo</Button></div>
    <p className="text-sm font-medium" role="status">{s?.loading?'Consultando custo…':inventoryCostStateLabel(ready?snapshot:null)}</p>
    {ready && <><dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">Saldo observado</dt><dd>{formatInventoryOrderQuantity(snapshot.quantity_hundredths)} {unit}</dd></div>
      <div><dt className="text-muted-foreground">Valor do saldo</dt><dd className="break-words">{formatInventoryCostValue(snapshot.value_scaled)}</dd></div>
      <div><dt className="text-muted-foreground">Custo médio operacional</dt><dd className="break-words">{formatInventoryCostAverage(snapshot)} / {unit}</dd></div>
      <div><dt className="text-muted-foreground">Origem da base</dt><dd>{snapshot.quantity_hundredths==='0'?'Sem saldo':snapshot.value_scaled===null?'Não informada':snapshot.manual_origin?'Inclui referência manual':'Recebimentos desde saldo zero'}</dd></div></dl>
      {!editing && snapshot.quantity_hundredths!=='0' && <Button variant="outline" onClick={()=>{setEditing(true);setStale(false);setError(null);setPrice('');}}>{snapshot.value_scaled===null?'Informar custo':'Corrigir custo'}</Button>}
    </>}
    {editing && <form onSubmit={submit} className="space-y-3 border-t border-border/50 pt-4">
      <p className="text-sm text-muted-foreground">Define o valor operacional para o saldo atual de {formSnapshot?formatInventoryOrderQuantity(formSnapshot.quantity_hundredths):'—'} {INVENTORY_UNIT_LABELS[formSnapshot?.unit_code] || formSnapshot?.unit_code}. Não altera quantidade, compras ou registros anteriores.</p>
      <div className="space-y-2"><Label htmlFor="inventory-cost-reference">Custo unitário de referência (R$)</Label><Input id="inventory-cost-reference" inputMode="decimal" value={price} disabled={blocked || !ready || stale} onChange={e=>setPrice(e.target.value)} required /></div>
      {validation.valid && formSnapshot && <p className="text-sm font-medium">Valor operacional resultante: {formatInventoryCostValue((BigInt(formSnapshot.quantity_hundredths)*BigInt(validation.cents)*10000n).toString())}</p>}
      {validation.valid && validation.cents==='0' && <p className="text-sm text-amber-700">Custo zero será registrado como uma referência informada, distinta de custo desconhecido.</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={costs.saving || (!uncertain && (!ready || stale || !validation.valid))}>{costs.saving?'Definindo…':uncertain?'Recuperar solicitação':validation.cents==='0'?'Definir custo zero':'Definir custo do saldo'}</Button><Button type="button" variant="outline" disabled={blocked} onClick={()=>{setEditing(false);setError(null);}}>Cancelar</Button></div>
      {uncertain && <p className="text-sm text-muted-foreground">Mantenha este detalhe aberto. A recuperação reutiliza os dados e a solicitação anteriores.</p>}
    </form>}
    {ready && <div className="space-y-3 border-t border-border/50 pt-4"><h5 className="text-sm font-semibold">Histórico de valoração</h5><p className="text-xs text-muted-foreground">Desde o início do custeio. Estornos usam a média vigente; preços dos documentos permanecem preservados.</p>
      <ol className="space-y-3">{s.events.map(e=><li key={e.id} className="text-sm border-b border-border/40 pb-2 break-words"><p className="font-medium">{inventoryCostEventLabel(e.kind)}</p><p>{formatInventoryCostValue(e.value_after)} · {formatInventoryOrderQuantity(e.quantity_after)} {INVENTORY_UNIT_LABELS[e.unit_code] || e.unit_code}</p><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString('en-US')} · revisão {e.revision}</p></li>)}</ol>
      {s.next_cursor && <Button size="sm" variant="outline" disabled={blocked || s.loading} onClick={()=>costs.loadDetail(itemId,s.next_cursor)}>Carregar mais eventos</Button>}
    </div>}
  </section>;
};
export default InventoryCostSection;
