import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CLINIC_FINANCE_CANCELLATION_REASONS,
  CLINIC_FINANCE_CANCELLATION_REASON_LABELS,
} from '@/repositories/index.js';

const FinanceCancellationDialog = ({ isOpen, entry, submitting, mutationError, onClose, onConfirm }) => {
  const [reasonCode, setReasonCode] = useState('');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setReasonCode('');
    setLocalError(null);
  }, [entry?.id, isOpen]);

  const handleConfirm = async () => {
    if (!reasonCode) {
      setLocalError('Selecione um motivo de cancelamento.');
      return;
    }
    setLocalError(null);
    try {
      await onConfirm(reasonCode);
    } catch (error) {
      setLocalError(error?.userMessage || 'Não foi possível cancelar o lançamento.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[480px]" data-clinic-finance-cancellation-dialog="closed-reason">
        <DialogHeader>
          <DialogTitle>Cancelar lançamento</DialogTitle>
          <DialogDescription>O registro será preservado com status cancelado. Esta ação não exclui dados e não movimenta dinheiro.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Lançamento</p>
            <p className="font-semibold mt-1">{entry?.categoryLabel || '—'}</p>
            <p className="text-sm text-muted-foreground mt-1">{entry?.counterpartyLabel || '—'}</p>
          </div>

          <Select value={reasonCode} onValueChange={setReasonCode}>
            <SelectTrigger aria-label="Motivo do cancelamento"><SelectValue placeholder="Selecione o motivo fechado" /></SelectTrigger>
            <SelectContent>
              {CLINIC_FINANCE_CANCELLATION_REASONS.map((code) => (
                <SelectItem key={code} value={code}>{CLINIC_FINANCE_CANCELLATION_REASON_LABELS[code]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(localError || mutationError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{localError || mutationError}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Voltar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={submitting}>{submitting ? 'Cancelando...' : 'Confirmar cancelamento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceCancellationDialog;
