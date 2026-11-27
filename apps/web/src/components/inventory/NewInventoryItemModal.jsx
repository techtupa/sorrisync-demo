import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  INVENTORY_UNITS,
  INVENTORY_UNIT_LABELS,
  createInventoryRequestId,
  validateInventoryItemInput,
} from '@/repositories/index.js';

const emptyForm = () => ({
  displayName: '',
  itemCode: '',
  categoryId: '',
  unit: 'unit',
  minimumQuantity: '0',
  requestId: createInventoryRequestId(),
});

const NewInventoryItemModal = ({
  isOpen,
  onOpenChange,
  item = null,
  categories = [],
  onSubmit,
  isSaving = false,
  operationError = null,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [localError, setLocalError] = useState(null);
  const activeCategories = useMemo(
    () => categories.filter((category) => category.status === 'Ativa'),
    [categories],
  );

  useEffect(() => {
    if (!isOpen) return;
    setLocalError(null);
    setForm(item ? {
      displayName: item.name,
      itemCode: item.item_code,
      categoryId: item.category_id || '',
      unit: item.unit_code || item.unit || 'unit',
      minimumQuantity: String(item.minimum_quantity ?? 0),
      requestId: createInventoryRequestId(),
    } : emptyForm());
  }, [isOpen, item]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateInventoryItemInput(form);
    if (!validation.valid) {
      setLocalError(validation.message);
      return;
    }
    setLocalError(null);
    try {
      await onSubmit?.({
        ...validation.value,
        requestId: form.requestId,
        expectedUpdatedAt: item?.updated_at,
      });
      onOpenChange(false);
    } catch {
      // O hook fornece a mensagem saneada em operationError.
    }
  };

  const blockedByCategories = activeCategories.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{item ? 'Editar item de estoque' : 'Novo item de estoque'}</DialogTitle>
          <DialogDescription>
            {item
              ? 'Atualize somente os campos operacionais. O saldo não é editado por este formulário.'
              : 'Cadastre o item com saldo zero. O estoque inicial deve ser registrado em uma entrada separada.'}
          </DialogDescription>
        </DialogHeader>

        {blockedByCategories && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Nenhuma categoria ativa está disponível. O cadastro fica bloqueado e nenhuma categoria será criada automaticamente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="inventory-item-name">Nome do item</Label>
              <Input id="inventory-item-name" value={form.displayName} onChange={(event) => setField('displayName', event.target.value)} placeholder="Ex.: Material QA sintético" maxLength={140} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory-item-code">Código interno</Label>
              <Input id="inventory-item-code" value={form.itemCode} onChange={(event) => setField('itemCode', event.target.value.toLowerCase())} placeholder="material_qa" maxLength={64} required />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoryId} onValueChange={(value) => setField('categoryId', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                <SelectContent>
                  {activeCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={(value) => setField('unit', value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((unit) => <SelectItem key={unit} value={unit}>{INVENTORY_UNIT_LABELS[unit]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inventory-minimum-quantity">Estoque mínimo</Label>
              <Input id="inventory-minimum-quantity" type="number" min="0" step={['gram', 'milliliter'].includes(form.unit) ? '0.01' : '1'} value={form.minimumQuantity} onChange={(event) => setField('minimumQuantity', event.target.value)} required />
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">Resumo</p>
            <p className="mt-1 text-muted-foreground">
              {form.displayName || 'Item sem nome'} · {INVENTORY_UNIT_LABELS[form.unit]} · mínimo {form.minimumQuantity || '0'}.
              {item ? ' O saldo e o histórico serão preservados.' : ' O saldo inicial será zero.'}
            </p>
          </div>

          {(localError || operationError) && <p role="alert" className="text-sm text-destructive">{localError || operationError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || blockedByCategories}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {item ? 'Salvar alterações' : 'Criar item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewInventoryItemModal;
