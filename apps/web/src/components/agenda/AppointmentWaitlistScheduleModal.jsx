import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppointmentSlotSuggestions from '@/components/agenda/AppointmentSlotSuggestions.jsx';
import {
  APPOINTMENT_WAITLIST_PERIOD_LABELS,
  isAppointmentWaitlistSlotInPeriod,
} from '@/repositories/index.js';

const AppointmentWaitlistScheduleModal = ({
  clearSuggestedSlots,
  entry,
  isOpen,
  isSaving = false,
  loadSuggestedSlots,
  onClose,
  onSchedule,
  professionals = [],
  rooms = [],
  slots = [],
  slotsError = '',
  slotsLoading = false,
}) => {
  const [date, setDate] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [time, setTime] = useState('');
  const filteredSlots = useMemo(() => slots.filter((slot) => (
    isAppointmentWaitlistSlotInPeriod(slot.timeLabel, entry?.preferredPeriod)
  )), [entry?.preferredPeriod, slots]);

  useEffect(() => {
    if (!isOpen || !entry) return;
    setDate(entry.earliestDate || '');
    setProfessionalId(entry.preferredProfessionalId || '');
    setRoomId('');
    setTime('');
  }, [entry, isOpen]);

  useEffect(() => setTime(''), [date, professionalId, roomId]);

  const selectedSlot = filteredSlots.find((slot) => slot.timeLabel === time);
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedSlot?.startsAt) return;
    await onSchedule?.({
      expectedUpdatedAt: entry.updatedAt,
      professionalId,
      roomId,
      startsAt: selectedSlot.startsAt,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader><DialogTitle>Agendar pela lista de espera</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-semibold">{entry?.sourceDisplayName}</p>
            <p className="text-muted-foreground">{entry?.serviceLabel} · {entry?.serviceDurationMinutes} min</p>
            <p className="mt-1 text-xs text-muted-foreground">Preferência: {APPOINTMENT_WAITLIST_PERIOD_LABELS[entry?.preferredPeriod] || 'Qualquer período'}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data *</label>
              <Input min={entry?.earliestDate} max={entry?.latestDate || undefined} required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional *</label>
              <Select required value={professionalId} onValueChange={setProfessionalId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{professionals.map((professional) => <SelectItem key={professional.id} value={professional.id}>{professional.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sala *</label>
              <Select required value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{rooms.map((room) => <SelectItem key={room.id} value={room.id}>{room.displayName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <AppointmentSlotSuggestions
            clearSuggestedSlots={clearSuggestedSlots}
            date={date}
            durationMinutes={entry?.serviceDurationMinutes}
            isOpen={isOpen}
            loadSuggestedSlots={loadSuggestedSlots}
            onSelect={setTime}
            professionalId={professionalId}
            roomId={roomId}
            slots={filteredSlots}
            slotsError={slotsError}
            slotsLoading={slotsLoading}
          />

          {entry?.preferredPeriod !== 'any' && !slotsLoading && slots.length > 0 && filteredSlots.length === 0 && (
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Nenhuma sugestão atende ao período preferido nesta data.</AlertDescription></Alert>
          )}

          <p className="text-xs font-medium text-muted-foreground">A disponibilidade é confirmada novamente ao agendar. A sugestão não reserva o horário.</p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!selectedSlot || isSaving} type="submit">{isSaving ? 'Agendando...' : 'Confirmar agendamento'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentWaitlistScheduleModal;
