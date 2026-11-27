
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  SCHEDULE_STATUSES as STATUSES,
} from '@/repositories/index.js';
import { toast } from 'sonner';
import AppointmentSlotSuggestions from '@/components/agenda/AppointmentSlotSuggestions.jsx';

const getTodayDateInputValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getDefaultAppointmentFormData = () => ({
  patient: '',
  patientId: null,
  procedure: '',
  professional: '',
  room: '',
  date: getTodayDateInputValue(),
  time: '09:00',
  duration: '60',
  status: STATUSES.AGENDADA,
  notes: '',
  phone: '',
  origin: 'Recepção',
});

const buildAppointmentFormData = (initialAppointment = {}) => {
  const appointment = initialAppointment ?? {};
  const defaults = getDefaultAppointmentFormData();

  return {
    ...defaults,
    ...appointment,
    duration: String(appointment.duration || defaults.duration),
    status: appointment.status || defaults.status,
  };
};

const NewAppointmentModal = ({
  isOpen,
  onClose,
  onSave,
  initialAppointment,
  professionals = Object.values(PROFESSIONALS),
  professionalResources = [],
  rooms = Object.values(ROOMS),
  roomResources = [],
  statuses = Object.values(STATUSES),
  clearSuggestedSlots,
  loadSuggestedSlots,
  slots = [],
  slotsError = '',
  slotsLoading = false,
}) => {
  const professionalOptions = professionals?.length ? professionals : Object.values(PROFESSIONALS);
  const roomOptions = rooms?.length ? rooms : Object.values(ROOMS);
  const statusOptions = statuses?.length ? statuses : Object.values(STATUSES);
  const [formData, setFormData] = useState(() => buildAppointmentFormData(initialAppointment));
  const selectedProfessionalId = useMemo(() => (
    professionalResources.find((item) => item.displayName === formData.professional)?.id || ''
  ), [formData.professional, professionalResources]);
  const selectedRoomId = useMemo(() => (
    roomResources.find((item) => item.displayName === formData.room)?.id || ''
  ), [formData.room, roomResources]);

  useEffect(() => {
    if (!isOpen) return;

    setFormData(buildAppointmentFormData(initialAppointment));
  }, [initialAppointment, isOpen]);

  const handleSubmit = async (event) => {
    event?.preventDefault?.();

    const newAppointment = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      duration: parseInt(formData.duration)
    };

    try {
      await onSave?.(newAppointment);
      toast.success('Consulta criada com sucesso!');
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Não foi possível salvar a consulta.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Nova Consulta</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-foreground">Paciente *</label>
              <Input
                required
                value={formData.patient}
                onChange={e => setFormData({...formData, patient: e.target.value})}
                placeholder="Nome do paciente"
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <label className="text-sm font-medium text-foreground">Telefone</label>
              <Input
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (202) 555-0100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Procedimento *</label>
            <Input
              required
              value={formData.procedure}
              onChange={e => setFormData({...formData, procedure: e.target.value})}
              placeholder="Ex: Avaliação, Clareamento..."
            />
          </div>

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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data *</label>
              <Input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Horário *</label>
              <Input
                type="time"
                required
                value={formData.time}
                onChange={e => setFormData({...formData, time: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Duração</label>
              <Select value={formData.duration} onValueChange={v => setFormData({...formData, duration: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1h</SelectItem>
                  <SelectItem value="90">1h 30min</SelectItem>
                  <SelectItem value="120">2h</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AppointmentSlotSuggestions
            clearSuggestedSlots={clearSuggestedSlots}
            date={formData.date}
            durationMinutes={Number(formData.duration)}
            isOpen={isOpen}
            loadSuggestedSlots={loadSuggestedSlots}
            onSelect={(time) => setFormData((current) => ({ ...current, time }))}
            professionalId={selectedProfessionalId}
            roomId={selectedRoomId}
            slots={slots}
            slotsError={slotsError}
            slotsLoading={slotsLoading}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Observações</label>
            <Textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Detalhes para o atendimento..."
              rows={2}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="shadow-sm" onClick={handleSubmit}>Agendar Consulta</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAppointmentModal;
