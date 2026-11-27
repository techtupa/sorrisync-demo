import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { APPOINTMENT_CHECK_IN_REVERT_REASONS } from '@/repositories/index.js';

const RevertAppointmentCheckInDialog = ({
  appointment,
  isOpen,
  isSaving = false,
  onClose,
  onConfirm,
}) => {
  const [reasonCode, setReasonCode] = useState('');

  useEffect(() => {
    setReasonCode('');
  }, [appointment?.appointmentId, isOpen]);

  const handleConfirm = async () => {
    if (!appointment || !reasonCode || isSaving) return;
    await onConfirm(appointment, reasonCode);
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-700" />
            Reverter check-in
          </DialogTitle>
          <DialogDescription>
            A chegada será marcada como revertida, sem apagar o histórico e sem alterar o status da consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">{appointment.patient}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check-in recorded at {appointment.checkedInTime || 'time unavailable'}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-in-revert-reason">Motivo controlado</Label>
            <Select value={reasonCode} onValueChange={setReasonCode} disabled={isSaving}>
              <SelectTrigger id="check-in-revert-reason" className="bg-background">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_CHECK_IN_REVERT_REASONS.map((reason) => (
                  <SelectItem key={reason.code} value={reason.code}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
            Confirme somente quando a chegada tiver sido registrada incorretamente ou precisar ser desfeita pelo motivo selecionado. Não há campo de texto livre.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!reasonCode || isSaving}>
            {isSaving ? 'Revertendo...' : 'Confirmar reversão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RevertAppointmentCheckInDialog;
