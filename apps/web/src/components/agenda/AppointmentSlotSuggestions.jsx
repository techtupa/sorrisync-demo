import React, { useEffect } from 'react';
import { AlertCircle, Clock3, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const AppointmentSlotSuggestions = ({
  clearSuggestedSlots,
  date,
  durationMinutes,
  excludeAppointmentId = null,
  isOpen,
  loadSuggestedSlots,
  onSelect,
  professionalId,
  roomId,
  slots = [],
  slotsError = '',
  slotsLoading = false,
}) => {
  const isReady = Boolean(date && durationMinutes && professionalId && roomId);

  useEffect(() => {
    if (!isOpen || !isReady || !loadSuggestedSlots) {
      clearSuggestedSlots?.();
      return undefined;
    }

    const debounceId = window.setTimeout(() => {
      loadSuggestedSlots({
        date,
        durationMinutes: Number(durationMinutes),
        excludeAppointmentId,
        limit: 12,
        professionalId,
        roomId,
      }).catch(() => undefined);
    }, 300);

    return () => window.clearTimeout(debounceId);
  }, [
    clearSuggestedSlots,
    date,
    durationMinutes,
    excludeAppointmentId,
    isOpen,
    isReady,
    loadSuggestedSlots,
    professionalId,
    roomId,
  ]);

  useEffect(() => () => clearSuggestedSlots?.(), [clearSuggestedSlots]);

  if (!loadSuggestedSlots) return null;

  return (
    <section className="rounded-lg border border-border/60 bg-muted/20 p-3" aria-label="Horários sugeridos">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Horários sugeridos</p>
        </div>
        {slotsLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Carregando horários" />}
      </div>

      {!isReady && (
        <p className="text-xs text-muted-foreground">
          Selecione data, duração, profissional e sala para consultar a disponibilidade.
        </p>
      )}

      {isReady && !slotsLoading && !slotsError && slots.length === 0 && (
        <p className="text-xs text-muted-foreground">Não há horários disponíveis para esta data.</p>
      )}

      {isReady && slots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {slots.map((slot) => (
            <Button
              key={slot.startsAt}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 bg-background text-xs"
              onClick={() => onSelect?.(slot.timeLabel)}
            >
              {slot.timeLabel}
            </Button>
          ))}
        </div>
      )}

      {slotsError && (
        <Alert variant="destructive" className="mt-2 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{slotsError}</AlertDescription>
        </Alert>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground">
        A disponibilidade é confirmada novamente ao salvar. A sugestão não reserva o horário.
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Horários especiais e períodos indisponíveis, quando cadastrados, já estão refletidos nesta lista.
      </p>
    </section>
  );
};

export default AppointmentSlotSuggestions;
