
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SCHEDULE_PROFESSIONALS as PROFESSIONALS,
  SCHEDULE_ROOMS as ROOMS,
} from '@/repositories/index.js';
import { toast } from 'sonner';

const BlockTimeModal = ({
  isOpen,
  onClose,
  onSave,
  professionals = Object.values(PROFESSIONALS),
  rooms = Object.values(ROOMS),
}) => {
  const professionalOptions = professionals?.length ? professionals : Object.values(PROFESSIONALS);
  const roomOptions = rooms?.length ? rooms : Object.values(ROOMS);
  const [formData, setFormData] = useState({
    professional: '',
    room: '',
    date: '2026-05-30',
    startTime: '12:00',
    endTime: '13:00',
    reason: 'Almoço'
  });

  const reasons = ['Almoço', 'Reunião', 'Manutenção', 'Procedimento Externo', 'Ausência Pessoal'];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Calculate duration in mins for mockup
    const [h1, m1] = formData.startTime.split(':').map(Number);
    const [h2, m2] = formData.endTime.split(':').map(Number);
    const duration = (h2 * 60 + m2) - (h1 * 60 + m1);

    const newBlock = {
      id: Math.random().toString(36).substr(2, 9),
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      time: formData.startTime,
      duration: duration > 0 ? duration : 60,
      professional: formData.professional,
      room: formData.room,
      reason: formData.reason
    };

    try {
      await onSave?.(newBlock);
      toast.success('Horário bloqueado com sucesso!');
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Não foi possível bloquear o horário.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Bloquear Horário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Profissional *</label>
              <Select required value={formData.professional} onValueChange={v => setFormData({...formData, professional: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {professionalOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sala/Cadeira *</label>
              <Select required value={formData.room} onValueChange={v => setFormData({...formData, room: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {roomOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Data *</label>
            <Input
              type="date"
              required
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Horário Inicial *</label>
              <Input
                type="time"
                required
                value={formData.startTime}
                onChange={e => setFormData({...formData, startTime: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Horário Final *</label>
              <Input
                type="time"
                required
                value={formData.endTime}
                onChange={e => setFormData({...formData, endTime: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Motivo</label>
            <Select required value={formData.reason} onValueChange={v => setFormData({...formData, reason: v})}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="destructive" className="shadow-sm">Bloquear Horário</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeModal;
