import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APPOINTMENT_WAITLIST_DISMISS_REASON_LABELS } from '@/repositories/index.js';

const AppointmentWaitlistDismissDialog = ({ entry, isOpen, isSaving = false, onClose, onDismiss }) => {
  const [reason, setReason] = useState('');
  useEffect(() => { if (isOpen) setReason(''); }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader><DialogTitle>Dispensar da lista de espera</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">O histórico de {entry?.sourceDisplayName || 'esta entrada'} será preservado. Nenhum contato será enviado.</p>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
            <SelectContent>{Object.entries(APPOINTMENT_WAITLIST_DISMISS_REASON_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!reason || isSaving} variant="destructive" onClick={() => onDismiss?.({ expectedUpdatedAt: entry?.updatedAt, resolutionCode: reason })}>{isSaving ? 'Dispensando...' : 'Dispensar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentWaitlistDismissDialog;
