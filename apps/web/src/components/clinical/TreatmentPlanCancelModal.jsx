import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TREATMENT_PLAN_CANCELLATION_REASONS,
  TREATMENT_PLAN_CANCELLATION_REASON_LABELS,
  validateTreatmentPlanCancellation,
} from '@/repositories/index.js';

const TreatmentPlanCancelModal = ({ open, onOpenChange, item, onSubmit, isSaving }) => {
  const [reasonCode, setReasonCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReasonCode('');
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
    setError('');
  }, [open, item?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateTreatmentPlanCancellation({ itemId: item?.id, reasonCode });
    if (!validation.valid || !confirmed) {
      setError(validation.valid ? 'Confirme o cancelamento deste item.' : validation.message);
      return;
    }
    try {
      await onSubmit({ itemId: item.id, requestId, reasonCode });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível cancelar o item agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[520px]" data-treatment-plan-cancel-modal>
        <DialogHeader>
          <DialogTitle>Cancelar item do plano</DialogTitle>
          <DialogDescription>O item não será apagado. O motivo fechado e o histórico permanecerão preservados.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm"><strong>{item?.serviceName}</strong></div>
          <div className="space-y-2">
            <Label htmlFor="treatment-plan-cancel-reason">Motivo</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger id="treatment-plan-cancel-reason"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>{TREATMENT_PLAN_CANCELLATION_REASONS.map((code) => <SelectItem key={code} value={code}>{TREATMENT_PLAN_CANCELLATION_REASON_LABELS[code]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Revisei o paciente e confirmo o cancelamento. Entendo que o item continuará visível no histórico.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Voltar</Button>
            <Button type="submit" variant="destructive" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Cancelar item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentPlanCancelModal;
