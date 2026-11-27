import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const TreatmentPlanCompleteModal = ({ open, onOpenChange, item, onSubmit, isSaving }) => {
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
    setError('');
  }, [open, item?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!item?.id || !confirmed) {
      setError('Confirme a conclusão clínica deste item.');
      return;
    }
    try {
      await onSubmit({ itemId: item.id, requestId });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível concluir o item agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[520px]" data-treatment-plan-complete-modal>
        <DialogHeader>
          <DialogTitle>Concluir item do plano</DialogTitle>
          <DialogDescription>A conclusão é definitiva e preserva o item original no histórico clínico.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm"><strong>{item?.serviceName}</strong><br /><span className="text-muted-foreground">Esta ação não gera cobrança, baixa financeira, consulta ou movimentação de estoque.</span></div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Confirmo que o procedimento deste item foi concluído e revisei o paciente correto.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Voltar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Concluir item</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentPlanCompleteModal;
