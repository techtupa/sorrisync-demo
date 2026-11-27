import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatTreatmentQuoteMoney, validateTreatmentQuoteDecision } from '@/repositories/index.js';

const TreatmentQuoteDecisionModal = ({
  open, onOpenChange, quote, operation, title, description, options, confirmationText,
  submitLabel, onSubmit, isSaving, dataAttribute,
}) => {
  const [code, setCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setCode(''); setConfirmed(false); setRequestId(crypto.randomUUID()); setError('');
  }, [open, quote?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateTreatmentQuoteDecision({ quoteId: quote?.id, code, operation });
    if (!validation.valid || !confirmed) {
      setError(validation.valid ? 'Confirme a revisão antes de registrar a decisão.' : validation.message);
      return;
    }
    try {
      await onSubmit({ quoteId: quote.id, requestId, code });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível registrar a decisão agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[540px]" {...{ [dataAttribute]: '' }}>
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm"><strong>Orçamento v{quote?.versionNumber}</strong><br /><span className="text-muted-foreground">Total {formatTreatmentQuoteMoney(quote?.totalCents)}</span></div>
          <div className="space-y-2">
            <Label>Registro controlado</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger><SelectValue placeholder="Selecione uma opção" /></SelectTrigger>
              <SelectContent>{options.map((option) => <SelectItem key={option.code} value={option.code}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>{confirmationText}</span></label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Voltar</Button><Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{submitLabel}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentQuoteDecisionModal;
