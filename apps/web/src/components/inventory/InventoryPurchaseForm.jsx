import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInventoryRequestId } from '@/repositories/index.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
import { formatInventoryPurchaseMoney, inventoryPurchaseErrorMessage, isInventoryPurchaseKnownRefusal, validateInventoryPurchaseInput } from '@/repositories/inventoryPurchasesContract.js';
import NewSupplierModal from './NewSupplierModal.jsx';

const newLine = () => ({ key: createInventoryRequestId(), itemId: '', quantity: '', unitCost: '' });
const selectClass = 'w-full min-w-0 rounded-md border border-input bg-background p-2 text-sm';

const InventoryPurchaseForm = ({ isOpen, onOpenChange, suppliers, items, onSubmit, onSaveSupplier, isSaving }) => {
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState(() => [newLine()]);
  const [newSupplierOpen, setNewSupplierOpen] = useState(false);
  const [createdSuppliers, setCreatedSuppliers] = useState([]);
  const [error, setError] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef(null);
  const allSuppliers = [...suppliers, ...createdSuppliers.filter((s) => !suppliers.some((existing) => existing.id === s.id))];
  const validation = validateInventoryPurchaseInput({ supplierId, lines }, items, allSuppliers);
  const blocked = isSaving || uncertain;
  const updateLine = (key, field, value) => setLines((current) => current.map((line) => line.key === key ? { ...line, [field]: value } : line));
  const submit = async (event) => {
    event.preventDefault();
    if (!uncertain && !validation.valid) { setError(validation.message); return; }
    const input = uncertain ? attempt.current.input : { supplierId, lines: validation.value.lines };
    const signature = JSON.stringify(input);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, input, requestId: createInventoryRequestId() };
    setError(null);
    try { await onSubmit({ ...input, requestId: attempt.current.requestId, recovering: uncertain }); setUncertain(false); onOpenChange(false); }
    catch (failure) { setError(inventoryPurchaseErrorMessage(failure)); setUncertain(!isInventoryPurchaseKnownRefusal(failure)); }
  };
  return <Dialog open={isOpen} onOpenChange={(open) => !blocked && onOpenChange(open)}>
    <DialogContent className="sm:max-w-[760px] max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle><DialogDescription>Informe os materiais já recebidos. A confirmação registra a compra e atualiza o estoque, sem efeito financeiro.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-5 min-w-0">
        <div className="space-y-2"><Label htmlFor="receipt-supplier">Fornecedor</Label><div className="flex flex-col sm:flex-row gap-2">
          <select id="receipt-supplier" className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={blocked} required>
            <option value="">Selecione um fornecedor ativo</option>{allSuppliers.filter((s) => s.lifecycle_status === 'active').map((s) => <option key={s.id} value={s.id}>{s.name} · {s.supplier_code}</option>)}
          </select><Button type="button" variant="outline" className="shrink-0" disabled={blocked} onClick={() => setNewSupplierOpen(true)}>Novo fornecedor</Button>
        </div></div>
        <div className="space-y-4">{lines.map((line, index) => {
          const item = items.find((i) => i.id === line.itemId);
          return <div key={line.key} className="rounded-lg border border-border/50 p-3 space-y-3 min-w-0">
            <div className="space-y-2"><Label htmlFor={`receipt-item-${line.key}`}>Item {index + 1}</Label><select id={`receipt-item-${line.key}`} className={selectClass} value={line.itemId} onChange={(e) => updateLine(line.key, 'itemId', e.target.value)} disabled={blocked} required>
              <option value="">Selecione um item ativo</option>{items.filter((i) => i.lifecycle_status === 'active').map((i) => <option key={i.id} value={i.id}>{i.name} · {i.item_code}</option>)}
            </select></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2"><Label htmlFor={`receipt-quantity-${line.key}`}>Quantidade{item ? ` (${INVENTORY_UNIT_LABELS[item.unit_code] || item.unit})` : ''}</Label><Input id={`receipt-quantity-${line.key}`} inputMode="decimal" value={line.quantity} onChange={(e) => updateLine(line.key, 'quantity', e.target.value)} disabled={blocked} required /></div>
              <div className="space-y-2"><Label htmlFor={`receipt-cost-${line.key}`}>Custo unitário (R$)</Label><Input id={`receipt-cost-${line.key}`} inputMode="decimal" value={line.unitCost} onChange={(e) => updateLine(line.key, 'unitCost', e.target.value)} disabled={blocked} required /></div>
            </div>
            <Button type="button" size="sm" variant="ghost" disabled={blocked || lines.length === 1} onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}>Remover item {index + 1}</Button>
          </div>;
        })}</div>
        <Button type="button" variant="outline" disabled={blocked || lines.length >= 50} onClick={() => setLines((current) => [...current, newLine()])}>Adicionar item</Button>
        <p className="text-sm font-semibold">Total registrado: {validation.valid ? formatInventoryPurchaseMoney(validation.value.totalCents) : 'preencha os itens'}</p>
        <p className="text-xs text-muted-foreground">Custo por unidade cadastrada, sem conversão. Valores de linha arredondados ao centavo; até 50 itens e R$ 9.999.999,99 por recebimento.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={blocked} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Registrando...' : uncertain ? 'Recuperar solicitação' : 'Registrar recebimento'}</Button></DialogFooter>
      </form>
      {newSupplierOpen && <NewSupplierModal isOpen onOpenChange={(open, result) => { setNewSupplierOpen(open); if (result) { setCreatedSuppliers((current) => [...current, { id: result.id, name: result.display_name, supplier_code: result.supplier_code, lifecycle_status: result.status }]); setSupplierId(result.id); } }} suppliers={allSuppliers} onSubmit={onSaveSupplier} isSaving={isSaving} />}
    </DialogContent>
  </Dialog>;
};
export default InventoryPurchaseForm;
