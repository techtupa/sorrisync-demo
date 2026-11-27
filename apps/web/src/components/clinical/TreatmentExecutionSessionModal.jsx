import React, { useEffect, useState } from 'react';
import { AlertCircle, ClipboardPlus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  CLINICAL_CONTENT_MAX_LENGTH,
  TREATMENT_EXECUTION_OUTCOMES,
  TREATMENT_EXECUTION_OUTCOME_LABELS,
  validateTreatmentExecutionSessionInput,
} from '@/repositories/index.js';

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';
const emptyForm = () => ({
  requestId: crypto.randomUUID(),
  outcomeCode: '',
  clinicalContent: '',
  confirmed: false,
});

const TreatmentExecutionSessionModal = ({ open, onOpenChange, onSubmit, isSaving, patientName, item, appointmentLink }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError('');
  }, [appointmentLink?.linkId, open]);

  const validation = validateTreatmentExecutionSessionInput({
    appointmentLinkId: appointmentLink?.linkId,
    requestId: form.requestId,
    outcomeCode: form.outcomeCode,
    clinicalContent: form.clinicalContent,
  });
  const canSubmit = validation.valid && form.confirmed && !isSaving;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validation.valid) {
      setError(validation.message);
      return;
    }
    if (!form.confirmed) {
      setError('Confirme que compreende o caráter finalizado e append-only do registro.');
      return;
    }
    setError('');
    try {
      await onSubmit({
        appointmentLinkId: appointmentLink.linkId,
        requestId: form.requestId,
        outcomeCode: form.outcomeCode,
        clinicalContent: validation.clinicalContent,
      });
    } catch (caught) {
      setError(caught?.userMessage || 'Não foi possível registrar a sessão clínica agora.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[680px]" data-treatment-execution-session-modal>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardPlus className="h-5 w-5 text-primary" />Registrar sessão clínica</DialogTitle>
          <DialogDescription>Documente a execução vinculada à consulta finalizada.</DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Paciente</span><p className="font-medium text-foreground">{patientName}</p></div>
            <div><span className="text-muted-foreground">Item do plano</span><p className="font-medium text-foreground">#{item?.sequenceNumber}</p></div>
            <div><span className="text-muted-foreground">Serviço</span><p className="font-medium text-foreground">{item?.serviceName}</p></div>
            <div><span className="text-muted-foreground">Consulta</span><p className="font-medium text-foreground">{formatDateTime(appointmentLink?.startsAt)}</p></div>
            <div className="sm:col-span-2"><span className="text-muted-foreground">Profissional</span><p className="font-medium text-foreground">{appointmentLink?.professional || 'Profissional da clínica'}</p></div>
          </div>

          <div className="space-y-2">
            <Label>Resultado da sessão</Label>
            <Select value={form.outcomeCode} onValueChange={(value) => setForm((current) => ({ ...current, outcomeCode: value }))}>
              <SelectTrigger data-treatment-session-outcome><SelectValue placeholder="Selecione o resultado" /></SelectTrigger>
              <SelectContent>
                {TREATMENT_EXECUTION_OUTCOMES.map((value) => <SelectItem key={value} value={value}>{TREATMENT_EXECUTION_OUTCOME_LABELS[value]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="treatment-session-clinical-content">Evolução clínica</Label>
            <Textarea
              id="treatment-session-clinical-content"
              rows={9}
              maxLength={CLINICAL_CONTENT_MAX_LENGTH}
              value={form.clinicalContent}
              onChange={(event) => setForm((current) => ({ ...current, clinicalContent: event.target.value }))}
              placeholder="Registre a evolução desta sessão em texto simples."
              required
            />
            <p className="text-xs text-muted-foreground">{form.clinicalContent.length}/5.000 caracteres. O texto ficará somente na timeline clínica autorizada.</p>
          </div>

          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <p>O registro criará uma evolução clínica finalizada e não poderá ser editado ou excluído.</p>
            <p>Registrar a sessão não conclui automaticamente o item do plano.</p>
            <div className="flex items-start gap-2 pt-1">
              <Checkbox id="treatment-session-confirm" checked={form.confirmed} onCheckedChange={(value) => setForm((current) => ({ ...current, confirmed: value === true }))} />
              <Label htmlFor="treatment-session-confirm" className="font-normal leading-5">Confirmo o resultado e a evolução clínica desta sessão.</Label>
            </div>
          </div>

          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Voltar</Button>
            <Button type="submit" disabled={!canSubmit} data-treatment-session-confirm-action>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar sessão clínica
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentExecutionSessionModal;
