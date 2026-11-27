
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUSES, ORIGINS, INTERESTS, RESPONSIBLES } from '@/repositories/index.js';
import { toast } from 'sonner';

const defaultOptions = {
  statuses: Object.values(STATUSES),
  origins: Object.values(ORIGINS),
  interests: Object.values(INTERESTS),
  responsibles: Object.values(RESPONSIBLES),
};

const NewPatientModal = ({ isOpen, onClose, onSave, options = defaultOptions }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    origin: '',
    interest: '',
    status: STATUSES.NOVO_LEAD,
    responsible: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '', phone: '', email: '', origin: '', interest: '', status: STATUSES.NOVO_LEAD, responsible: '', notes: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newPatient = {
      id: Math.random().toString(36).substr(2, 9),
      ...formData,
      estimatedValue: 0,
      lastInteraction: new Date().toISOString(),
      nextAction: 'Entrar em contato',
      avatarInitials: formData.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NP',
      cpf: '',
      birthdate: null,
      address: ''
    };

    try {
      setIsSubmitting(true);
      if (onSave) {
        await onSave(newPatient);
      }
      toast.success('Paciente salvo com sucesso!');
      onClose();
      resetForm();
    } catch {
      toast.error('Não foi possível salvar o paciente agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Paciente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome Completo *</label>
            <Input
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone *</label>
              <Input
                required
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (202) 555-0100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="maria@example.invalid"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem *</label>
              <Select required value={formData.origin} onValueChange={v => setFormData({...formData, origin: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.origins.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interesse *</label>
              <Select required value={formData.interest} onValueChange={v => setFormData({...formData, interest: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.interests.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Inicial</label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <Select value={formData.responsible} onValueChange={v => setFormData({...formData, responsible: v})}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.responsibles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              value={formData.notes}
              onChange={e => setFormData({...formData, notes: e.target.value})}
              placeholder="Detalhes adicionais sobre o paciente..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" className="shadow-sm" disabled={isSubmitting}>Salvar Paciente</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientModal;
