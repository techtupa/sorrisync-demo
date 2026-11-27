import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ODONTOGRAM_SURFACE_LABELS,
  formatTreatmentQuoteMoney,
  parseTreatmentQuoteMoney,
  validateTreatmentQuoteIssue,
} from '@/repositories/index.js';

const initialSelection = (candidates) => Object.fromEntries(candidates.map((candidate) => [candidate.treatmentPlanItemId, {
  selected: true,
  value: candidate.defaultUnitPriceCents == null
    ? ''
    : (candidate.defaultUnitPriceCents / 100).toFixed(2).replace('.', ','),
}]));

const TreatmentQuoteIssueModal = ({ open, onOpenChange, patientName, treatmentPlanId, candidates, onSubmit, isSaving }) => {
  const [selection, setSelection] = useState({});
  const [validUntil, setValidUntil] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSelection(initialSelection(candidates));
    setValidUntil('');
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
    setError('');
  }, [candidates, open, treatmentPlanId]);

  const selectedItems = useMemo(() => candidates
    .filter((candidate) => selection[candidate.treatmentPlanItemId]?.selected)
    .map((candidate) => ({
      treatmentPlanItemId: candidate.treatmentPlanItemId,
      unitPriceCents: parseTreatmentQuoteMoney(selection[candidate.treatmentPlanItemId]?.value),
    })), [candidates, selection]);
  const totalCents = selectedItems.reduce((total, item) => total + (item.unitPriceCents || 0), 0);

  const updateSelection = (itemId, patch) => setSelection((current) => ({
    ...current,
    [itemId]: { ...current[itemId], ...patch },
  }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    const input = { requestId, validUntil: validUntil || null, items: selectedItems };
    const validation = validateTreatmentQuoteIssue({ treatmentPlanId, ...input });
    if (!validation.valid || !confirmed) {
      setError(validation.valid ? 'Confirme que revisou os itens e valores deste orçamento.' : validation.message);
      return;
    }
    setError('');
    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível emitir o orçamento agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]" data-treatment-quote-issue-modal>
        <DialogHeader>
          <DialogTitle>Gerar orçamento</DialogTitle>
          <DialogDescription>Selecione itens planejados e registre valores em reais. Esta emissão é interna e não cria cobrança, pagamento ou assinatura.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm"><span className="text-muted-foreground">Paciente:</span> {patientName}</div>
          <div className="space-y-3">
            {candidates.map((candidate) => {
              const state = selection[candidate.treatmentPlanItemId] || { selected: false, value: '' };
              const reference = candidate.toothCode
                ? `Dente ${candidate.toothCode}${candidate.surfaceCode ? ` • ${ODONTOGRAM_SURFACE_LABELS[candidate.surfaceCode]}` : ''}`
                : 'Sem referência odontográfica';
              return (
                <div key={candidate.treatmentPlanItemId} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_180px] sm:items-center" data-treatment-quote-candidate>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1" checked={state.selected} onChange={(event) => updateSelection(candidate.treatmentPlanItemId, { selected: event.target.checked })} />
                    <span><strong className="text-foreground">{candidate.serviceLabel}</strong><br /><span className="text-muted-foreground">{reference}</span></span>
                  </label>
                  <div className="space-y-1">
                    <Label htmlFor={`quote-value-${candidate.treatmentPlanItemId}`}>Valor em reais</Label>
                    <Input
                      id={`quote-value-${candidate.treatmentPlanItemId}`}
                      inputMode="decimal"
                      placeholder="0,00"
                      value={state.value}
                      disabled={!state.selected}
                      onChange={(event) => updateSelection(candidate.treatmentPlanItemId, { value: event.target.value })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="treatment-quote-valid-until">Validade (opcional)</Label>
              <Input id="treatment-quote-valid-until" type="date" min={new Date().toISOString().slice(0, 10)} value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3 text-right"><span className="text-sm text-muted-foreground">Total do orçamento</span><p className="text-xl font-semibold">{formatTreatmentQuoteMoney(totalCents)}</p></div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Valores sugeridos aparecem somente para preço fixo do catálogo marcado para orçamento. O catálogo é mutável; os valores acima serão snapshots imutáveis e precisam ser revisados.
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Revisei paciente, itens, referências, valores e validade. Entendo que este registro não é aceite digital, assinatura, cobrança ou pagamento.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Voltar</Button>
            <Button type="submit" disabled={isSaving || candidates.length === 0}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Emitir orçamento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentQuoteIssueModal;
