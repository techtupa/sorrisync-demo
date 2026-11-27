import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_TYPE_LABELS,
  INVENTORY_REASON_OPTIONS,
  INVENTORY_UNIT_LABELS,
  createInventoryRequestId,
  validateInventoryMovementInput,
} from '@/repositories/index.js';

const InventoryMovementModal = ({ isOpen, onOpenChange, item, initialType = 'entry', onSubmit, isSaving, operationError }) => {
  const [movementType, setMovementType] = useState(initialType);
  const [reasonCode, setReasonCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [requestId, setRequestId] = useState(createInventoryRequestId);
  const [localError, setLocalError] = useState(null);
  const reasonOptions = INVENTORY_REASON_OPTIONS[movementType] || [];
  const numericQuantity = Number(quantity || 0);
  const isReduction = ['consumption', 'adjustment_decrease'].includes(movementType);
  const projectedQuantity = Number(item?.current_quantity || 0) + (isReduction ? -numericQuantity : numericQuantity);
  const belowMinimum = projectedQuantity >= 0 && projectedQuantity < Number(item?.minimum_quantity || 0);

  useEffect(() => {
    if (!isOpen) return;
    setMovementType(initialType);
    setReasonCode('');
    setQuantity('');
    setRequestId(createInventoryRequestId());
    setLocalError(null);
  }, [initialType, isOpen, item?.id]);

  useEffect(() => {
    if (!reasonOptions.some((reason) => reason.value === reasonCode)) setReasonCode(reasonOptions[0]?.value || '');
  }, [movementType, reasonCode, reasonOptions]);

  const unitLabel = useMemo(
    () => INVENTORY_UNIT_LABELS[item?.unit_code] || item?.unit || 'Unidade',
    [item?.unit, item?.unit_code],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateInventoryMovementInput({ item, movementType, reasonCode, quantity });
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }
    setLocalError(null);
    try {
      await onSubmit?.({ ...validation.value, requestId });
      onOpenChange(false);
    } catch {
      // O hook fornece a mensagem saneada em operationError.
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Registrar movimentação</DialogTitle>
          <DialogDescription>O saldo projetado é informativo. A validação final ocorre no servidor.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Item</p>
              <p className="font-medium">{item.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo atual</p>
              <p className="font-medium tabular-nums">{item.current_quantity} {unitLabel}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVENTORY_MOVEMENT_TYPES.map((type) => <SelectItem key={type} value={type}>{INVENTORY_MOVEMENT_TYPE_LABELS[type]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((reason) => <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inventory-movement-quantity">Quantidade ({unitLabel})</Label>
              <Input id="inventory-movement-quantity" type="number" min="0.01" step={['gram', 'milliliter'].includes(item.unit_code) ? '0.01' : '1'} value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 p-4 text-sm">
            <p className="text-muted-foreground">Saldo projetado</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${projectedQuantity < 0 ? 'text-destructive' : ''}`}>{projectedQuantity} {unitLabel}</p>
            {belowMinimum && <p className="mt-2 flex items-center gap-2 text-amber-700"><AlertTriangle className="h-4 w-4" />O saldo ficará abaixo do estoque mínimo.</p>}
          </div>

          {(localError || operationError) && <p role="alert" className="text-sm text-destructive">{localError || operationError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || projectedQuantity < 0}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar movimentação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryMovementModal;
