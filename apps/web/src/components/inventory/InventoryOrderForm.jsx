import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInventoryRequestId } from '@/repositories/index.js';
import { validateInventoryOrder, validateInventoryOrderDelivery, inventoryOrderErrorMessage, formatInventoryOrderQuantity } from '@/repositories/inventoryOrdersContract.js';
import { isInventoryPurchaseKnownRefusal, formatInventoryPurchaseMoney } from '@/repositories/inventoryPurchasesContract.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
import NewSupplierModal from './NewSupplierModal.jsx';

const selectClass = 'w-full min-w-0 rounded-md border border-input bg-background p-2 text-sm';
const row = () => ({ key: createInventoryRequestId(), itemId: '', quantity: '', unitCost: '' });
const InventoryOrderForm = ({ order, replenishment, review, items, suppliers, onSaveSupplier, onSubmit, onClose, isSaving }) => {
  const [supplierId,setSupplierId]=useState(order?.supplier_id || ''),[extraSuppliers,setExtraSuppliers]=useState([]),[supplierOpen,setSupplierOpen]=useState(false);
  const [lines,setLines]=useState(()=>{
    if (order) return order.lines.filter(l=>BigInt(l.remaining_hundredths)>0n).map(l=>({...row(),itemId:l.item_id}));
    if (replenishment) return [{ ...row(), itemId: replenishment.item_id, quantity: formatInventoryOrderQuantity(replenishment.suggested_hundredths).replaceAll('.', '') }];
    return [row()];
  });
  const [error,setError]=useState(null),[uncertain,setUncertain]=useState(false);const attempt=useRef(null);
  const allSuppliers=[...suppliers,...extraSuppliers.filter(s=>!suppliers.some(x=>x.id===s.id))];
  const validation=order?validateInventoryOrderDelivery(order,lines,items,allSuppliers):validateInventoryOrder({supplierId,lines},items,allSuppliers);
  const blocked=isSaving||uncertain;
  const update=(key,field,value)=>setLines(p=>p.map(l=>l.key===key?{...l,[field]:value}:l));
  const submit=async event=>{
    event.preventDefault();
    if (!uncertain && review?.blocked) return;
    if(!uncertain&&!validation.valid){setError(validation.message);return;}
    if(!uncertain){const input=order?{orderId:order.id,expectedOrderVersion:order.version,lines:validation.value.lines}:validation.value;
      if (replenishment) input.replenishmentRevision = replenishment.revision;
      const signature=JSON.stringify(input);if(attempt.current?.signature!==signature)attempt.current={signature,input:{...input,requestId:createInventoryRequestId()}};}
    setError(null);
    try{await onSubmit({...attempt.current.input,recovering:uncertain});setUncertain(false);onClose();}
    catch(e){setError(inventoryOrderErrorMessage(e));setUncertain(!isInventoryPurchaseKnownRefusal(e));}
  };
  return <Dialog open onOpenChange={open=>!open&&!blocked&&onClose()}><DialogContent className="sm:max-w-[760px] max-h-[90dvh] overflow-y-auto min-w-0">
    <DialogHeader><DialogTitle>{order?'Receber entrega':'Novo pedido'}</DialogTitle><DialogDescription>{order?'Informe somente os materiais já recebidos, até o restante. Uma confirmação atualiza o estoque e o pedido.':'Registre as quantidades planejadas. O pedido não altera estoque, não é enviado ao fornecedor e não gera efeito financeiro.'}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-5 min-w-0">
      {review?.message&&<p role="status" className="text-sm text-muted-foreground">{review.message}</p>}
      {review?.retry&&<Button type="button" variant="outline" disabled={blocked} onClick={review.retry}>Recalcular reposição</Button>}
      {order?<p className="font-medium break-words">{order.supplier_name}</p>:<div className="space-y-2"><Label htmlFor="order-supplier">Fornecedor do pedido</Label><div className="flex flex-col sm:flex-row gap-2"><select id="order-supplier" className={selectClass} value={supplierId} disabled={blocked} onChange={e=>setSupplierId(e.target.value)}><option value="">Selecione um fornecedor ativo</option>{allSuppliers.filter(s=>s.lifecycle_status==='active').map(s=><option key={s.id} value={s.id}>{s.name} · {s.supplier_code}</option>)}</select>{onSaveSupplier&&<Button type="button" variant="outline" disabled={blocked} onClick={()=>setSupplierOpen(true)}>Novo fornecedor</Button>}</div></div>}
      {lines.map((l,index)=>{const item=items.find(i=>i.id===l.itemId),expected=order?.lines.find(i=>i.item_id===l.itemId);return <div key={l.key} className="rounded-lg border border-border/50 p-3 space-y-3 min-w-0">
        {replenishment?<p className="font-medium break-words">{replenishment.item_name}</p>:order?<div><p className="font-medium break-words">{expected.item_name}</p><p className="text-xs text-muted-foreground">Restante: {formatInventoryOrderQuantity(expected.remaining_hundredths)} {INVENTORY_UNIT_LABELS[expected.unit_code]}</p></div>:<div className="space-y-2"><Label htmlFor={`order-item-${l.key}`}>Item do pedido {index+1}</Label><select id={`order-item-${l.key}`} className={selectClass} value={l.itemId} disabled={blocked} onChange={e=>update(l.key,'itemId',e.target.value)}><option value="">Selecione um item ativo</option>{items.filter(i=>i.lifecycle_status==='active').map(i=><option key={i.id} value={i.id}>{i.name} · {i.item_code}</option>)}</select></div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor={`order-quantity-${l.key}`}>{order?`Quantity received for ${expected.item_name}`:`Quantidade pedida ${index+1}`}{item?` (${INVENTORY_UNIT_LABELS[item.unit_code] || item.unit})`:''}</Label><Input id={`order-quantity-${l.key}`} value={l.quantity} inputMode="decimal" disabled={blocked} onChange={e=>update(l.key,'quantity',e.target.value)}/></div>
          {order&&<div className="space-y-2"><Label htmlFor={`order-cost-${l.key}`}>Custo de {expected.item_name} (R$)</Label><Input id={`order-cost-${l.key}`} value={l.unitCost} inputMode="decimal" disabled={blocked} onChange={e=>update(l.key,'unitCost',e.target.value)}/></div>}</div>
        {!order&&!replenishment&&<Button type="button" variant="ghost" disabled={blocked||lines.length===1} onClick={()=>setLines(p=>p.filter(x=>x.key!==l.key))}>Remover item {index+1}</Button>}
      </div>;})}
      {!order&&!replenishment&&<Button type="button" variant="outline" disabled={blocked||lines.length>=50} onClick={()=>setLines(p=>[...p,row()])}>Adicionar item ao pedido</Button>}
      {order&&<><p className="text-sm font-semibold">Total desta entrega: {validation.valid?formatInventoryPurchaseMoney(validation.value.totalCents):'preencha a entrega'}</p><p className="text-xs text-muted-foreground">Deixe em branco ou zero os itens que não chegaram. Custo por unidade cadastrada; sem conversão. Até R$ 9.999.999,99 por recebimento.</p></>}
      {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter><Button type="button" variant="outline" disabled={blocked} onClick={onClose}>Voltar</Button><Button type="submit" disabled={isSaving||(!uncertain&&review?.blocked)}>{isSaving?'Registrando...':uncertain?'Recuperar solicitação':order?'Registrar recebimento':'Criar pedido'}</Button></DialogFooter>
    </form>
    {supplierOpen&&<NewSupplierModal isOpen onOpenChange={(open,result)=>{setSupplierOpen(open);if(result){setExtraSuppliers(p=>[...p,{id:result.id,name:result.display_name,supplier_code:result.supplier_code,lifecycle_status:result.status}]);setSupplierId(result.id);}}} suppliers={allSuppliers} onSubmit={onSaveSupplier} isSaving={isSaving}/>}</DialogContent></Dialog>;
};
export default InventoryOrderForm;
