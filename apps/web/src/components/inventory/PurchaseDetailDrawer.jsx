import React, { useRef, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { createInventoryRequestId } from '@/repositories/index.js';
import { formatInventoryPurchaseMoney as money, formatInventoryPurchaseDate as date, inventoryPurchaseErrorMessage, isInventoryPurchaseKnownRefusal } from '@/repositories/inventoryPurchasesContract.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
const PurchaseDetailDrawer = ({ isOpen, onOpenChange, purchase, onReverse, onOpenOrder, isSaving }) => {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef(null);
  const reverseOperation = useRef(onReverse);
  if (onReverse) reverseOperation.current = onReverse;
  if (!purchase) return null;
  const reverse = async () => {
    if (!attempt.current || (!uncertain && (attempt.current.expectedVersion !== purchase.version || attempt.current.expectedOrderVersion !== purchase.order_version))) attempt.current = { requestId: createInventoryRequestId(), purchaseId: purchase.id, expectedVersion: purchase.version, orderId: purchase.order_id, expectedOrderVersion: purchase.order_version };
    setError(null);
    try { await reverseOperation.current({ ...attempt.current, recovering: uncertain }); setUncertain(false); setConfirm(false); }
    catch (failure) { setError(inventoryPurchaseErrorMessage(failure)); setUncertain(!isInventoryPurchaseKnownRefusal(failure)); }
  };
  return <Sheet open={isOpen} onOpenChange={(open) => !isSaving && !uncertain && onOpenChange(open)}>
    <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
      <SheetHeader><SheetTitle>Recebimento de compra</SheetTitle><SheetDescription>Registro operacional e histórico de estoque. Sem pagamento ou integração financeira.</SheetDescription></SheetHeader>
      <div className="space-y-5 py-6 min-w-0">
        <div><p className="font-semibold break-words">{purchase.supplier_name}</p><p className="text-xs text-muted-foreground break-all">{purchase.supplier_code}</p></div>
        <Badge variant="outline">{purchase.status === 'reversed' ? 'Estornado' : 'Recebido'}</Badge>
        <p className="text-sm">Registrado em {date(purchase.created_at)}</p>
        {purchase.reversed_at && <p className="text-sm">Estornado em {date(purchase.reversed_at)} · Registro incorreto</p>}
        <div className="space-y-3">{purchase.lines.map((line) => <div key={line.id} className="rounded-lg border border-border/50 p-3 space-y-1">
          <p className="font-medium break-words">{line.item_name}</p><p className="text-sm">{Number(line.quantity_hundredths) / 100} {INVENTORY_UNIT_LABELS[line.unit_code]} × {money(line.unit_cost_cents)}</p><p className="text-sm font-semibold">{money(line.total_cents)}</p>
        </div>)}</div>
        <p className="text-lg font-semibold">Total registrado: {money(purchase.total_cents)}</p>
        {onOpenOrder && <Button variant="outline" disabled={isSaving} onClick={onOpenOrder}>Ver pedido vinculado</Button>}
        {(onReverse || uncertain) && (purchase.status === 'received' || uncertain) && <div className="space-y-3 border-t pt-4">
          {!confirm ? <Button variant="outline" onClick={() => setConfirm(true)}>Estornar recebimento</Button> : <>
            <p className="text-sm">Motivo: registro incorreto. Confirmar retira do estoque todas as quantidades listadas acima. O histórico permanece; se faltar saldo em algum item, nada será retirado.</p>
            <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={isSaving || uncertain} onClick={() => setConfirm(false)}>Voltar</Button><Button disabled={isSaving} onClick={reverse}>{isSaving ? 'Estornando...' : uncertain ? 'Recuperar solicitação' : 'Confirmar estorno integral'}</Button></div>
          </>}
        </div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </SheetContent>
  </Sheet>;
};
export default PurchaseDetailDrawer;
