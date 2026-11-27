import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ODONTOGRAM_FINDINGS,
  ODONTOGRAM_FINDING_LABELS,
  ODONTOGRAM_SURFACES,
  ODONTOGRAM_SURFACE_LABELS,
  ODONTOGRAM_WHOLE_TOOTH_FINDINGS,
  validateOdontogramFinding,
} from '@/repositories/index.js';

const OdontogramFindingModal = ({ open, onOpenChange, patientName, toothCode, onSubmit, isSaving }) => {
  const [surfaceCode, setSurfaceCode] = useState('');
  const [findingCode, setFindingCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');
  const requiresWholeTooth = ODONTOGRAM_WHOLE_TOOTH_FINDINGS.includes(findingCode);

  useEffect(() => {
    if (!open) return;
    setSurfaceCode(''); setFindingCode(''); setConfirmed(false); setError(''); setRequestId(crypto.randomUUID());
  }, [open, toothCode]);

  useEffect(() => {
    if (requiresWholeTooth) setSurfaceCode('whole_tooth');
  }, [requiresWholeTooth]);

  const summary = useMemo(() => (
    findingCode && surfaceCode
      ? `${ODONTOGRAM_FINDING_LABELS[findingCode]} • ${ODONTOGRAM_SURFACE_LABELS[surfaceCode]} • tooth ${toothCode}`
      : 'Complete os campos estruturados para revisar o registro.'
  ), [findingCode, surfaceCode, toothCode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateOdontogramFinding({ toothCode, surfaceCode, findingCode });
    if (!validation.valid || !confirmed) {
      setError(validation.valid ? 'Confirme a revisão dos dados antes de registrar.' : validation.message);
      return;
    }
    try {
      await onSubmit({ requestId, toothCode, surfaceCode, findingCode });
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível registrar o achado agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[560px]" data-odontogram-finding-modal>
        <DialogHeader>
          <DialogTitle>Registrar achado odontológico</DialogTitle>
          <DialogDescription>Este registro compõe o histórico clínico e não poderá ser editado ou excluído.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <p><span className="text-muted-foreground">Paciente:</span> {patientName}</p>
            <p><span className="text-muted-foreground">Dente FDI:</span> {toothCode}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="odontogram-finding">Achado</Label>
            <Select value={findingCode} onValueChange={setFindingCode}>
              <SelectTrigger id="odontogram-finding"><SelectValue placeholder="Selecione o achado" /></SelectTrigger>
              <SelectContent>{ODONTOGRAM_FINDINGS.map((code) => <SelectItem key={code} value={code}>{ODONTOGRAM_FINDING_LABELS[code]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="odontogram-surface">Superfície</Label>
            <Select value={surfaceCode} onValueChange={setSurfaceCode} disabled={requiresWholeTooth}>
              <SelectTrigger id="odontogram-surface"><SelectValue placeholder="Selecione a superfície" /></SelectTrigger>
              <SelectContent>{ODONTOGRAM_SURFACES.map((code) => <SelectItem key={code} value={code}>{ODONTOGRAM_SURFACE_LABELS[code]}</SelectItem>)}</SelectContent>
            </Select>
            {requiresWholeTooth && <p className="text-xs text-muted-foreground">Este tipo de achado usa obrigatoriamente o dente inteiro.</p>}
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Revisão:</strong> {summary}</div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Revisei o dente, a superfície e o achado. Confirmo que este é um registro manual, sem diagnóstico inferido pelo sistema.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Registrar achado</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OdontogramFindingModal;
