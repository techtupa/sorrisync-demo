import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarPlus, Loader2 } from 'lucide-react';
import AppointmentSlotSuggestions from '@/components/agenda/AppointmentSlotSuggestions.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ODONTOGRAM_SURFACE_LABELS,
  buildTreatmentSchedulingStartsAt,
  createTreatmentSchedulingRequestId,
} from '@/repositories/index.js';

const emptyForm = () => ({ date: '', time: '', professionalId: '', roomId: '', requestId: createTreatmentSchedulingRequestId() });

const TreatmentPlanAppointmentModal = ({
  clearSuggestedSlots,
  eligibility,
  isSaving,
  item,
  loadSuggestedSlots,
  onOpenChange,
  onSubmit,
  open,
  patientName,
  professionals = [],
  rooms = [],
  slots = [],
  slotsError = '',
  slotsLoading = false,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm());
    setError('');
  }, [item?.id, open]);

  const selectedProfessional = useMemo(
    () => professionals.find((entry) => entry.id === form.professionalId),
    [form.professionalId, professionals],
  );
  const selectedRoom = useMemo(
    () => rooms.find((entry) => entry.id === form.roomId),
    [form.roomId, rooms],
  );
  const durationMinutes = Number(eligibility?.durationMinutes || 0);
  const startsAt = buildTreatmentSchedulingStartsAt(form.date, form.time);
  const canSubmit = Boolean(
    eligibility?.canSchedule
    && startsAt
    && form.professionalId
    && form.roomId
    && !isSaving,
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;
    setError('');
    try {
      await onSubmit({
        itemId: item.id,
        requestId: form.requestId,
        startsAt,
        professionalId: form.professionalId,
        roomId: form.roomId,
        expectedItemUpdatedAt: eligibility.itemUpdatedAt,
      });
    } catch (caught) {
      setError(caught?.userMessage || caught?.message || 'Não foi possível criar a consulta na Agenda.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[600px]" data-treatment-scheduling-modal>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-primary" />Agendar procedimento</DialogTitle>
          <DialogDescription>Escolha uma alocação livre e confirme explicitamente a criação da consulta.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div><span className="text-muted-foreground">Paciente</span><p className="font-medium text-foreground">{patientName}</p></div>
            <div><span className="text-muted-foreground">Procedimento</span><p className="font-medium text-foreground">{item?.serviceName}</p></div>
            <div><span className="text-muted-foreground">Referência</span><p className="font-medium text-foreground">{item?.toothCode ? `Dente ${item.toothCode}${item.surfaceCode ? ` • ${ODONTOGRAM_SURFACE_LABELS[item.surfaceCode]}` : ''}` : 'Não se aplica'}</p></div>
            <div><span className="text-muted-foreground">Duração</span><p className="font-medium text-foreground">{durationMinutes} min</p></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="treatment-scheduling-date">Data</label>
              <Input id="treatment-scheduling-date" type="date" required value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value, time: '' }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="treatment-scheduling-time">Horário</label>
              <Input id="treatment-scheduling-time" type="time" required value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <Select value={form.professionalId} onValueChange={(value) => setForm((current) => ({ ...current, professionalId: value, time: '' }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{professionals.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sala/Cadeira</label>
              <Select value={form.roomId} onValueChange={(value) => setForm((current) => ({ ...current, roomId: value, time: '' }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{rooms.map((entry) => <SelectItem key={entry.id} value={entry.id}>{entry.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <AppointmentSlotSuggestions
            clearSuggestedSlots={clearSuggestedSlots}
            date={form.date}
            durationMinutes={durationMinutes}
            isOpen={open}
            loadSuggestedSlots={loadSuggestedSlots}
            onSelect={(time) => setForm((current) => ({ ...current, time }))}
            professionalId={form.professionalId}
            roomId={form.roomId}
            slots={slots}
            slotsError={slotsError}
            slotsLoading={slotsLoading}
          />

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground" data-treatment-scheduling-warning>
            Esta ação criará uma consulta na Agenda. Ela não conclui o procedimento, não cria cobrança e não movimenta Estoque.
            {startsAt && <p className="mt-2 font-medium">{form.date} às {form.time} · {durationMinutes} min · {selectedProfessional?.displayName || 'profissional pendente'} · {selectedRoom?.displayName || 'sala pendente'}.</p>}
          </div>

          {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => onOpenChange(false)}>Voltar</Button>
            <Button type="submit" disabled={!canSubmit} data-treatment-scheduling-confirm>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar agendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TreatmentPlanAppointmentModal;
