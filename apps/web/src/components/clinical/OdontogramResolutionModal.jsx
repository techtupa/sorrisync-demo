import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ODONTOGRAM_FINDING_LABELS,
  ODONTOGRAM_RESOLUTION_REASONS,
  ODONTOGRAM_RESOLUTION_REASON_LABELS,
  ODONTOGRAM_SURFACE_LABELS,
  validateOdontogramResolution,
} from '@/repositories/index.js';

const OdontogramResolutionModal = ({ open, onOpenChange, finding, onSubmit, isSaving }) => {
  const [reasonCode, setReasonCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReasonCode(''); setConfirmed(false); setError(''); setRequestId(crypto.randomUUID());
  }, [open, finding?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateOdontogramResolution({ findingId: finding?.id, reasonCode });
    if (!validation.valid || !confirmed) {
      setError(validation.valid ? 'Confirme a preservação do registro original antes de resolver.' : validation.message);
      return;
    }
    try {
      await onSubmit({ findingId: finding.id, requestId, reasonCode });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível resolver o achado agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[520px]" data-odontogram-resolution-modal>
        <DialogHeader>
          <DialogTitle>Resolver achado</DialogTitle>
          <DialogDescription>O registro original será preservado no histórico.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {finding && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              Dente {finding.toothCode} • {ODONTOGRAM_FINDING_LABELS[finding.findingCode]} • {ODONTOGRAM_SURFACE_LABELS[finding.surfaceCode]} • registrado em {new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(finding.createdAt))}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="odontogram-resolution-reason">Motivo da resolução</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger id="odontogram-resolution-reason"><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>{ODONTOGRAM_RESOLUTION_REASONS.map((code) => <SelectItem key={code} value={code}>{ODONTOGRAM_RESOLUTION_REASON_LABELS[code]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Confirmo a resolução controlada e a preservação do dente, superfície, achado, autoria e data originais.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar resolução</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OdontogramResolutionModal;
