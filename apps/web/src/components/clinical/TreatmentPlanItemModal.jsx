import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ODONTOGRAM_SURFACES,
  ODONTOGRAM_SURFACE_LABELS,
  ODONTOGRAM_TEETH,
  TREATMENT_PLAN_PRIORITIES,
  TREATMENT_PLAN_PRIORITY_LABELS,
  validateTreatmentPlanItem,
} from '@/repositories/index.js';

const OPTIONAL_VALUE = 'not_applicable';

const TreatmentPlanItemModal = ({ open, onOpenChange, patientName, eligibleServices, suggestedSequence, onSubmit, isSaving }) => {
  const [serviceId, setServiceId] = useState('');
  const [toothCode, setToothCode] = useState(OPTIONAL_VALUE);
  const [surfaceCode, setSurfaceCode] = useState(OPTIONAL_VALUE);
  const [priority, setPriority] = useState('routine');
  const [sequenceNumber, setSequenceNumber] = useState(String(suggestedSequence || 1));
  const [confirmed, setConfirmed] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setServiceId('');
    setToothCode(OPTIONAL_VALUE);
    setSurfaceCode(OPTIONAL_VALUE);
    setPriority('routine');
    setSequenceNumber(String(suggestedSequence || 1));
    setConfirmed(false);
    setRequestId(crypto.randomUUID());
    setError('');
  }, [open, suggestedSequence]);

  useEffect(() => {
    if (toothCode === OPTIONAL_VALUE) setSurfaceCode(OPTIONAL_VALUE);
  }, [toothCode]);

  const selectedService = eligibleServices.find((service) => service.id === serviceId);
  const normalizedTooth = toothCode === OPTIONAL_VALUE ? null : toothCode;
  const normalizedSurface = surfaceCode === OPTIONAL_VALUE ? null : surfaceCode;
  const summary = useMemo(() => {
    const references = normalizedTooth
      ? `dente ${normalizedTooth}${normalizedSurface ? ` • ${ODONTOGRAM_SURFACE_LABELS[normalizedSurface]}` : ''}`
      : 'sem referência odontográfica';
    return selectedService
      ? `${selectedService.name} • ${references} • ${TREATMENT_PLAN_PRIORITY_LABELS[priority]} • sequência ${sequenceNumber}`
      : 'Selecione os campos estruturados para revisar o item.';
  }, [normalizedSurface, normalizedTooth, priority, selectedService, sequenceNumber]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const input = {
      requestId,
      serviceId,
      toothCode: normalizedTooth,
      surfaceCode: normalizedSurface,
      odontogramFindingId: null,
      priority,
      sequenceNumber: Number(sequenceNumber),
    };
    const validation = validateTreatmentPlanItem(input);
    if (!validation.valid || !confirmed) {
      setError(validation.valid ? 'Confirme a revisão do item antes de registrar.' : validation.message);
      return;
    }
    setError('');
    try {
      await onSubmit(input);
      onOpenChange(false);
    } catch (submissionError) {
      setError(submissionError?.userMessage || 'Não foi possível adicionar o item agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[620px]" data-treatment-plan-item-modal>
        <DialogHeader>
          <DialogTitle>Adicionar procedimento ao plano</DialogTitle>
          <DialogDescription>O item será registrado no histórico clínico. Valores, cobrança e agendamento não fazem parte desta operação.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3 text-sm"><span className="text-muted-foreground">Paciente:</span> {patientName}</div>
          <div className="space-y-2">
            <Label htmlFor="treatment-plan-service">Serviço clínico ativo</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="treatment-plan-service"><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
              <SelectContent>{eligibleServices.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent>
            </Select>
            {eligibleServices.length === 0 && <p className="text-xs text-amber-700">Nenhum serviço ativo e elegível está disponível neste tenant.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="treatment-plan-tooth">Dente permanente (opcional)</Label>
              <Select value={toothCode} onValueChange={setToothCode}>
                <SelectTrigger id="treatment-plan-tooth"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={OPTIONAL_VALUE}>Não se aplica</SelectItem>
                  {ODONTOGRAM_TEETH.map((code) => <SelectItem key={code} value={code}>Dente {code}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment-plan-surface">Superfície (opcional)</Label>
              <Select value={surfaceCode} onValueChange={setSurfaceCode} disabled={!normalizedTooth}>
                <SelectTrigger id="treatment-plan-surface"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={OPTIONAL_VALUE}>Não se aplica</SelectItem>
                  {ODONTOGRAM_SURFACES.map((code) => <SelectItem key={code} value={code}>{ODONTOGRAM_SURFACE_LABELS[code]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="treatment-plan-priority">Prioridade clínica</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="treatment-plan-priority"><SelectValue /></SelectTrigger>
                <SelectContent>{TREATMENT_PLAN_PRIORITIES.map((code) => <SelectItem key={code} value={code}>{TREATMENT_PLAN_PRIORITY_LABELS[code]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatment-plan-sequence">Sequência</Label>
              <input
                id="treatment-plan-sequence"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                type="number"
                min="1"
                max="999"
                value={sequenceNumber}
                onChange={(event) => setSequenceNumber(event.target.value)}
                required
              />
            </div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
            <strong>Revisão:</strong> {summary}<br />
            O plano registra procedimentos clínicos planejados. Ele não cria consultas, cobranças ou movimentações financeiras.
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>Revisei o serviço, as referências e a sequência. Entendo que este registro não cria orçamento, cobrança, consulta ou movimentação de estoque.</span>
          </label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || eligibleServices.length === 0}>{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Adicionar procedimento</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentPlanItemModal;
