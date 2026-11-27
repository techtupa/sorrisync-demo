import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createClinicFinanceRequestId,
  validateClinicFinanceMutationDraft,
} from '@/repositories/index.js';

const TYPE_LABELS = {
  receivable: 'conta a receber',
  payable: 'conta a pagar',
};

const initialForm = (entryType, entry) => ({
  description: entry?.description || '',
  categoryLabel: entry?.categoryLabel || '',
  counterpartyLabel: entry?.counterpartyLabel || '',
  amount: entry ? (entry.amountCents / 100).toFixed(2) : '',
  dueDate: entry?.dueDate || '',
  competenceMonth: entry?.competenceMonth?.slice(0, 7) || '',
  status: entry?.status || (entryType === 'receivable' ? 'open' : 'scheduled'),
  requestId: entry ? '' : createClinicFinanceRequestId(),
});

const FinanceEntryMutationModal = ({
  isOpen,
  mode = 'create',
  entryType = 'receivable',
  entry = null,
  submitting = false,
  mutationError = null,
  onClose,
  onSubmit,
}) => {
  const [form, setForm] = useState(() => initialForm(entryType, entry));
  const [localError, setLocalError] = useState(null);
  const isEditing = mode === 'edit';
  const typeLabel = TYPE_LABELS[entryType];

  useEffect(() => {
    if (!isOpen) return;
    setForm(initialForm(entryType, entry));
    setLocalError(null);
  }, [entry, entryType, isOpen, mode]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amountNumber = Number(String(form.amount).replace(',', '.'));
    const draft = {
      description: form.description,
      categoryLabel: form.categoryLabel,
      counterpartyLabel: form.counterpartyLabel,
      amountCents: Number.isFinite(amountNumber) ? Math.round(amountNumber * 100) : 0,
      currency: 'BRL',
      dueDate: form.dueDate,
      competenceMonth: form.competenceMonth ? `${form.competenceMonth}-01` : '',
      status: form.status,
      requestId: form.requestId,
      expectedUpdatedAt: entry?.updatedAt,
    };
    const validation = validateClinicFinanceMutationDraft(entryType, draft, { mode });
    if (!validation.valid) {
      setLocalError(validation.errors[0]);
      return;
    }
    setLocalError(null);
    try {
      await onSubmit(validation.value);
    } catch (error) {
      setLocalError(error?.userMessage || 'Não foi possível concluir a operação.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[590px] max-h-[92vh] overflow-y-auto" data-clinic-finance-mutation-modal={`${mode}-${entryType}`}>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Nova'} {typeLabel}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Altere somente os campos operacionais. O tipo e o status de liquidação permanecem bloqueados.'
              : 'Cadastre um lançamento manual sem movimentar dinheiro ou acionar integrações externas.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="finance-description">Descrição operacional</Label>
              <Textarea id="finance-description" value={form.description} onChange={(event) => setField('description', event.target.value)} maxLength={240} required className="resize-none" placeholder="Ex.: Lançamento manual QA" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finance-category">Categoria</Label>
              <Input id="finance-category" value={form.categoryLabel} onChange={(event) => setField('categoryLabel', event.target.value)} maxLength={80} required placeholder="Categoria operacional" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finance-counterparty">Identificação operacional</Label>
              <Input id="finance-counterparty" value={form.counterpartyLabel} onChange={(event) => setField('counterpartyLabel', event.target.value)} maxLength={80} required placeholder="Contraparte sintética" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finance-amount">Valor (R$)</Label>
              <Input id="finance-amount" type="number" min="0.01" max="9999999.99" step="0.01" value={form.amount} onChange={(event) => setField('amount', event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Input value="BRL" disabled aria-label="Moeda BRL" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finance-due-date">Vencimento</Label>
              <Input id="finance-due-date" type="date" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finance-competence">Competência</Label>
              <Input id="finance-competence" type="month" value={form.competenceMonth} onChange={(event) => setField('competenceMonth', event.target.value)} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Status</Label>
              {isEditing ? (
                <Input value={entry?.statusLabel || entry?.status || '—'} disabled aria-label="Status bloqueado" />
              ) : (
                <Select value={form.status} onValueChange={(value) => setField('status', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    {entryType === 'receivable'
                      ? <SelectItem value="open">Em aberto</SelectItem>
                      : <SelectItem value="scheduled">Agendado</SelectItem>}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm" data-clinic-finance-mutation-summary="true">
            <div className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /><p>Confirme o {typeLabel}, o valor, o vencimento e a competência. A operação será auditada; baixa integral e estorno usam um fluxo separado, sem conciliação.</p></div>
          </div>

          {(localError || mutationError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{localError || mutationError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Voltar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Salvando...' : isEditing ? 'Confirmar alteração' : 'Confirmar cadastro'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceEntryMutationModal;
