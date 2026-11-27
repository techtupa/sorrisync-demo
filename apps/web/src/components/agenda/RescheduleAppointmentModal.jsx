import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CalendarClock, Loader2 } from 'lucide-react';
import { APPOINTMENT_RESCHEDULING_REASONS } from '@/repositories/index.js';
import AppointmentSlotSuggestions from '@/components/agenda/AppointmentSlotSuggestions.jsx';

const buildFormData = (appointment, professionals, rooms) => ({
  date: appointment?.date || '',
  time: appointment?.time || '',
  duration: String(appointment?.duration || 60),
  professionalId: appointment?.professionalId
    || professionals.find((item) => item.displayName === appointment?.professional)?.id
    || '',
  roomId: appointment?.roomId
    || rooms.find((item) => item.displayName === appointment?.room)?.id
    || '',
  reasonCode: '',
});

const RescheduleAppointmentModal = ({
  appointment,
  isOpen,
  isSaving = false,
  onClose,
  onSave,
  professionals = [],
  rooms = [],
  clearSuggestedSlots,
  loadSuggestedSlots,
  slots = [],
  slotsError = '',
  slotsLoading = false,
}) => {
  const [formData, setFormData] = useState(() => buildFormData(appointment, professionals, rooms));
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setFormData(buildFormData(appointment, professionals, rooms));
    setErrorMessage('');
  }, [appointment, isOpen, professionals, rooms]);

  const selectedProfessional = useMemo(
    () => professionals.find((item) => item.id === formData.professionalId),
    [formData.professionalId, professionals],
  );
  const selectedRoom = useMemo(
    () => rooms.find((item) => item.id === formData.roomId),
    [formData.roomId, rooms],
  );
  const selectedReason = APPOINTMENT_RESCHEDULING_REASONS.find((item) => item.code === formData.reasonCode);
  const canSubmit = Boolean(
    appointment?.id
    && formData.date
    && formData.time
    && formData.duration
    && formData.professionalId
    && formData.roomId
    && formData.reasonCode
    && !isSaving
  );

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (!canSubmit) return;

    setErrorMessage('');
    try {
      await onSave?.({
        ...formData,
        duration: Number.parseInt(formData.duration, 10),
        professional: selectedProfessional?.displayName || '',
        room: selectedRoom?.displayName || '',
        expectedUpdatedAt: appointment.updated_at,
      });
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível reagendar a consulta.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose?.()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Reagendar consulta
          </DialogTitle>
          <DialogDescription>
            Ajuste somente a alocação da consulta. Paciente, procedimento, status e observações serão preservados.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
            <p className="font-semibold text-foreground">{appointment?.patient}</p>
            <p className="text-muted-foreground">{appointment?.procedure} · {appointment?.status}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Atual: {appointment?.date} às {appointment?.time} · {appointment?.duration} min · {appointment?.professional} · {appointment?.room}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="col-span-2 space-y-2 sm:col-span-1">
              <label className="text-sm font-medium" htmlFor="reschedule-date">Nova data</label>
              <Input
                id="reschedule-date"
                type="date"
                required
                value={formData.date}
                onChange={(event) => setFormData((current) => ({ ...current, date: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="reschedule-time">Horário</label>
              <Input
                id="reschedule-time"
                type="time"
                required
                value={formData.time}
                onChange={(event) => setFormData((current) => ({ ...current, time: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duração</label>
              <Select value={formData.duration} onValueChange={(value) => setFormData((current) => ({ ...current, duration: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1h</SelectItem>
                  <SelectItem value="90">1h 30min</SelectItem>
                  <SelectItem value="120">2h</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <Select value={formData.professionalId} onValueChange={(value) => setFormData((current) => ({ ...current, professionalId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {professionals.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sala/Cadeira</label>
              <Select value={formData.roomId} onValueChange={(value) => setFormData((current) => ({ ...current, roomId: value }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <AppointmentSlotSuggestions
            clearSuggestedSlots={clearSuggestedSlots}
            date={formData.date}
            durationMinutes={Number(formData.duration)}
            excludeAppointmentId={appointment?.id || null}
            isOpen={isOpen}
            loadSuggestedSlots={loadSuggestedSlots}
            onSelect={(time) => setFormData((current) => ({ ...current, time }))}
            professionalId={formData.professionalId}
            roomId={formData.roomId}
            slots={slots}
            slotsError={slotsError}
            slotsLoading={slotsLoading}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo do reagendamento</label>
            <Select value={formData.reasonCode} onValueChange={(value) => setFormData((current) => ({ ...current, reasonCode: value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
              <SelectContent>
                {APPOINTMENT_RESCHEDULING_REASONS.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>{reason.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
              Novo horário: <strong>{formData.date} às {formData.time}</strong>, {formData.duration} min, com {selectedProfessional?.displayName || 'profissional pendente'}, em {selectedRoom?.displayName || 'sala pendente'}. Motivo: {selectedReason.label}.
            </div>
          )}

          {errorMessage && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar reagendamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RescheduleAppointmentModal;
