import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  INTERESTS,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  ORIGINS,
  RESPONSIBLES,
} from '@/repositories/index.js';
import { toast } from 'sonner';

const statusOptions = Object.values(LEAD_STATUSES).filter((status) => status !== LEAD_STATUSES.CONVERTIDO);
const priorityOptions = Object.values(LEAD_PRIORITIES);

const defaultOptions = {
  origins: Object.values(ORIGINS),
  interests: Object.values(INTERESTS),
  responsibles: Object.values(RESPONSIBLES),
};

const initialFormData = {
  name: '',
  phone: '',
  email: '',
  origin: '',
  interest: '',
  status: LEAD_STATUSES.NOVO_LEAD,
  priority: LEAD_PRIORITIES.NORMAL,
  followUpAt: '',
  estimatedValue: '',
  nextAction: 'Entrar em contato',
  responsible: '',
  notesSummary: '',
};

const fromDateTimeLocal = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const NewLeadModal = ({
  isOpen,
  onClose,
  onSave,
  options = defaultOptions,
  isSaving = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(initialFormData);
  const isBusy = isSubmitting || isSaving;

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const handleChange = (field, value) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Informe o nome do lead.');
      return;
    }

    const newLead = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      origin: formData.origin,
      interest: formData.interest,
      status: formData.status,
      priority: formData.priority,
      followUpAt: fromDateTimeLocal(formData.followUpAt),
      estimatedValue: Number(formData.estimatedValue || 0),
      nextAction: formData.nextAction,
      responsible: formData.responsible,
      notesSummary: formData.notesSummary,
    };

    try {
      setIsSubmitting(true);
      await onSave?.(newLead);
      toast.success('Lead salvo com sucesso!');
      onClose();
      resetForm();
    } catch {
      toast.error('Não foi possível salvar o lead agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open) => {
    if (!open && !isBusy) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Novo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do Lead *</label>
            <Input
              required
              value={formData.name}
              onChange={(event) => handleChange('name', event.target.value)}
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Telefone</label>
              <Input
                value={formData.phone}
                onChange={(event) => handleChange('phone', event.target.value)}
                placeholder="+1 (202) 555-0100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(event) => handleChange('email', event.target.value)}
                placeholder="lead@example.invalid"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Origem</label>
              <Select value={formData.origin} onValueChange={(value) => handleChange('origin', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.origins.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interesse</label>
              <Select value={formData.interest} onValueChange={(value) => handleChange('interest', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.interests.map((interest) => <SelectItem key={interest} value={interest}>{interest}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status Inicial</label>
              <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Follow-up</label>
              <Input
                type="datetime-local"
                value={formData.followUpAt}
                onChange={(event) => handleChange('followUpAt', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Estimado</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.estimatedValue}
                onChange={(event) => handleChange('estimatedValue', event.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <Select value={formData.responsible} onValueChange={(value) => handleChange('responsible', value)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {options.responsibles.map((responsible) => <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Próxima Ação</label>
              <Input
                value={formData.nextAction}
                onChange={(event) => handleChange('nextAction', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Resumo Operacional</label>
            <Textarea
              value={formData.notesSummary}
              onChange={(event) => handleChange('notesSummary', event.target.value)}
              placeholder="Contexto comercial do contato..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>Cancelar</Button>
            <Button type="submit" className="shadow-sm" disabled={isBusy}>Salvar Lead</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewLeadModal;
