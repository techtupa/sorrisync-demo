import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CLINIC_FINANCE_REVERSAL_REASONS,
  CLINIC_FINANCE_REVERSAL_REASON_LABELS,
  createClinicFinanceSettlementRequestId,
  validateClinicFinancePayment,
} from '@/repositories/index.js';

const TYPE_LABELS = {
  payable: 'pagamento',
  receivable: 'recebimento',
};

const FinanceSettlementReversalDialog = ({ isOpen, entry, submitting, settlementError, onClose, onConfirm }) => {
  const [reasonCode, setReasonCode] = useState('');
  const [requestId, setRequestId] = useState(() => createClinicFinanceSettlementRequestId());
  const [localError, setLocalError] = useState(null);
  const typeLabel = TYPE_LABELS[entry?.type] || 'baixa';
  const selectedEvent = entry?.activePaymentEvents?.find(event => event.id === entry.paymentEventId);

  useEffect(() => {
    if (!isOpen) return;
    setReasonCode('');
    setRequestId(createClinicFinanceSettlementRequestId());
    setLocalError(null);
  }, [entry?.id, entry?.paymentEventId, isOpen]);

  const handleConfirm = async () => {
    const validation = validateClinicFinancePayment({ entry, requestId, paymentEventId: entry?.paymentEventId, reversalReasonCode: reasonCode });
    if (!validation.valid) {
      setLocalError(validation.errors[0]);
      return;
    }
    setLocalError(null);
    try {
      await onConfirm({ requestId, paymentEventId: entry.paymentEventId, reversalReasonCode: reasonCode });
    } catch (error) {
      setLocalError(error?.userMessage || 'Não foi possível estornar a baixa.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto" data-clinic-finance-settlement-reversal-dialog={entry?.type || 'unknown'}>
        <DialogHeader>
          <DialogTitle>Estornar {typeLabel}</DialogTitle>
          <DialogDescription>Estorne somente o registro escolhido. O saldo será recalculado; os demais registros e todo o histórico permanecem preservados. Esta ação não devolve dinheiro.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Lançamento</p>
            <p className="font-semibold mt-1">{entry?.categoryLabel || '—'}</p>
            <p className="text-sm text-muted-foreground mt-1">{entry?.counterpartyLabel || '—'}</p>
            <p className="font-medium mt-2">{selectedEvent?.amountCents == null ? 'Valor histórico não registrado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedEvent.amountCents / 100)}</p>
            <p className="text-sm text-muted-foreground">{selectedEvent?.settlementDate ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(new Date(`${selectedEvent.settlementDate}T12:00:00Z`)) : 'Data não disponível'}</p>
          </div>

          <Select value={reasonCode} disabled={submitting} onValueChange={value => { setReasonCode(value); setRequestId(createClinicFinanceSettlementRequestId()); }}>
            <SelectTrigger aria-label="Motivo do estorno"><SelectValue placeholder="Selecione o motivo fechado" /></SelectTrigger>
            <SelectContent>
              {CLINIC_FINANCE_REVERSAL_REASONS.map((code) => (
                <SelectItem key={code} value={code}>{CLINIC_FINANCE_REVERSAL_REASON_LABELS[code]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(localError || settlementError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{localError || settlementError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Voltar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>{submitting ? 'Estornando...' : `Confirmar estorno do ${typeLabel}`}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceSettlementReversalDialog;
