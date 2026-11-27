import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventoryPurchaseOrders } from '@/hooks/useInventoryPurchaseOrders.js';
import { createInventoryRequestId } from '@/repositories/index.js';
import { INVENTORY_ORDER_STATUS, formatInventoryOrderQuantity as quantity, inventoryOrderErrorMessage } from '@/repositories/inventoryOrdersContract.js';
import { formatInventoryPurchaseDate as date, isInventoryPurchaseKnownRefusal } from '@/repositories/inventoryPurchasesContract.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
import InventoryOrderForm from './InventoryOrderForm.jsx';
import PurchaseDetailDrawer from './PurchaseDetailDrawer.jsx';

const InventoryOrdersPanel = ({ sourceAvailable, items=[], suppliers=[], onChanged, onSaveSupplier, selectedId, onSelect, busy }) => {
  const orders=useInventoryPurchaseOrders({sourceAvailable,onChanged});
  const [search,setSearch]=useState(''),[status,setStatus]=useState('all'),[createOpen,setCreateOpen]=useState(false),[delivery,setDelivery]=useState(null),[receiptId,setReceiptId]=useState(null);
  const [confirm,setConfirm]=useState(false),[uncertain,setUncertain]=useState(false),[error,setError]=useState(null);const attempt=useRef(null);
  const {state}=orders,detail=orders.detail?.id===selectedId?orders.detail:null,saving=orders.saving||busy,order=detail?.order;
  useEffect(()=>{setSearch('');setStatus('all');setCreateOpen(false);setDelivery(null);onSelect(null);},[orders.context,onSelect]);
  useEffect(()=>{setReceiptId(null);setConfirm(false);setUncertain(false);setError(null);attempt.current=null;if(selectedId)void orders.loadDetail(selectedId);},[selectedId,orders.loadDetail]);
  const refresh=()=>{void orders.refresh();if(selectedId)void orders.loadDetail(selectedId);};
  const cancel=async()=>{
    if(!uncertain&&attempt.current?.expectedOrderVersion!==order.version)attempt.current={requestId:createInventoryRequestId(),orderId:order.id,expectedOrderVersion:order.version};
    setError(null);try{await orders.run('cancel',{...attempt.current,recovering:uncertain});setConfirm(false);setUncertain(false);}catch(e){setError(inventoryOrderErrorMessage(e));setUncertain(!isInventoryPurchaseKnownRefusal(e));}
  };
  if(!orders.allowed)return null;
  const rows=state.orders.filter(o=>(status==='all'||o.status===status)&&`${o.order_code} ${o.supplier_name}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const receipt=detail?.purchases?.find(p=>p.id===receiptId);
  const blocked=saving||detail?.loading||Boolean(detail?.error)||uncertain;
  return <section aria-label="Pedidos de compra" className="space-y-4 min-w-0">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Pedidos de compra</h2><p className="text-sm text-muted-foreground">Quantidades planejadas e entregas parciais, sem envio ao fornecedor.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={refresh} disabled={saving||state.loading||uncertain}>Atualizar pedidos</Button></div></div>
    <Card className="border-border/50 shadow-sm p-4"><div className="flex flex-col sm:flex-row gap-3"><Input aria-label="Buscar pedidos" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pedido ou fornecedor"/><select aria-label="Situação do pedido" className="min-w-0 rounded-md border border-input bg-background p-2 text-sm" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Todas as situações</option>{Object.entries(INVENTORY_ORDER_STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></Card>
    {state.loading&&<p role="status" className="text-sm">Atualizando pedidos...</p>}{state.error&&<p role="alert" className="text-sm text-destructive">{state.error}</p>}
    <Card className="border-border/50 shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Fornecedor</TableHead><TableHead>Situação</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{rows.map(o=><TableRow key={o.id}><TableCell className="max-w-48 break-all text-xs">{o.order_code}</TableCell><TableCell>{o.supplier_name}</TableCell><TableCell><Badge variant="outline">{INVENTORY_ORDER_STATUS[o.status]}</Badge></TableCell><TableCell><Button size="sm" variant="ghost" disabled={saving||uncertain} onClick={()=>onSelect(o.id)}>Ver pedido</Button></TableCell></TableRow>)}{!rows.length&&!state.loading&&!state.error&&<TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">Nenhum pedido encontrado.</TableCell></TableRow>}</TableBody></Table></div></Card>
    {state.nextCursor&&<Button variant="outline" disabled={state.loading||saving} onClick={()=>orders.refresh(state.nextCursor)}>Carregar pedidos anteriores</Button>}
    {selectedId&&<Sheet open onOpenChange={open=>!open&&!saving&&!uncertain&&!delivery&&onSelect(null)}><SheetContent className="w-full sm:max-w-2xl overflow-y-auto min-w-0"><SheetHeader><SheetTitle>Pedido de compra</SheetTitle><SheetDescription>Receba entregas até o restante ou cancele a pendência. O histórico é preservado.</SheetDescription></SheetHeader>
      <div className="py-6 space-y-4 min-w-0"><Button variant="outline" onClick={()=>orders.loadDetail(selectedId)} disabled={saving||uncertain||detail?.loading}>Atualizar pedido</Button>
        {detail?.loading&&<p role="status">Atualizando detalhe...</p>}{detail?.error&&<p role="alert" className="text-destructive">{detail.error}</p>}
        {order&&<><div><p className="font-semibold break-words">{order.supplier_name}</p><p className="text-xs break-all text-muted-foreground">{order.order_code}</p><p className="text-sm">Criado em {date(order.created_at)}</p></div><Badge variant="outline">{INVENTORY_ORDER_STATUS[order.status]}</Badge>
          {order.lines.map(l=><Card key={l.item_id}><CardContent className="p-3 space-y-1"><p className="font-medium break-words">{l.item_name} · {INVENTORY_UNIT_LABELS[l.unit_code]}</p><p className="text-sm">Pedido: {quantity(l.ordered_hundredths)} · Recebido: {quantity(l.received_hundredths)}</p><p className="text-sm">Em aberto: {quantity(l.remaining_hundredths)} · Cancelado: {quantity(l.canceled_hundredths)}</p><p className="text-xs text-muted-foreground">Recebido bruto: {quantity(l.gross_hundredths)} · Estornado: {quantity(l.reversed_hundredths)}</p></CardContent></Card>)}
          {['open','partial'].includes(order.status)&&<div className="flex flex-wrap gap-2"><Button disabled={blocked||!sourceAvailable} onClick={()=>setDelivery(order)}>Receber entrega</Button></div>}
          {confirm&&<div className="space-y-3 rounded-lg border p-3"><p className="text-sm">O restante em aberto listado acima não será recebido. As entregas e o estoque atual permanecem. Esta decisão é definitiva para novas entregas.</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={saving||uncertain} onClick={()=>setConfirm(false)}>Voltar</Button><Button disabled={saving} onClick={cancel}>{uncertain?'Recuperar solicitação':'Confirmar cancelamento do restante'}</Button></div></div>}
          {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
          <h3 className="font-semibold">Entregas registradas</h3>{detail.purchases?.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"><p className="text-sm">{date(p.created_at)} · {p.status==='reversed'?'Estornado':'Recebido'}</p></div>)}
          {!detail.purchases?.length&&!detail.loading&&<p className="text-sm text-muted-foreground">Nenhuma entrega registrada.</p>}{detail.next_cursor&&<Button variant="outline" disabled={blocked} onClick={()=>orders.loadDetail(order.id,detail.next_cursor)}>Carregar entregas anteriores</Button>}
        </>}
      </div></SheetContent></Sheet>}
    {createOpen&&<InventoryOrderForm items={items} suppliers={suppliers} onSaveSupplier={onSaveSupplier} onSubmit={input=>orders.run('create',input)} onClose={()=>setCreateOpen(false)} isSaving={saving}/>}
    {delivery&&<InventoryOrderForm order={delivery} items={items} suppliers={suppliers} onSubmit={input=>orders.run('receive',input)} onClose={()=>setDelivery(null)} isSaving={saving}/>}
    {receipt&&<PurchaseDetailDrawer key={receipt.id} isOpen onOpenChange={open=>!open&&setReceiptId(null)} purchase={receipt} onReverse={!detail?.error&&!detail?.loading?input=>orders.run('reverse',input):undefined} isSaving={saving}/>}
  </section>;
};
export default InventoryOrdersPanel;
