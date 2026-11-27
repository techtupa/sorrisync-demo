import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  APPOINTMENT_WAITLIST_PERIOD_LABELS,
  APPOINTMENT_WAITLIST_PRIORITY_LABELS,
} from '@/repositories/index.js';

const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

const buildForm = (entry) => ({
  earliestDate: entry?.earliestDate || today(),
  latestDate: entry?.latestDate || '',
  preferredPeriod: entry?.preferredPeriod || 'any',
  preferredProfessionalId: entry?.preferredProfessionalId || 'none',
  priority: entry?.priority || 'standard',
  serviceId: entry?.serviceId || '',
  source: entry ? `${entry.sourceType}:${entry.sourceId}` : '',
});

const AppointmentWaitlistEntryModal = ({
  entry = null,
  isOpen,
  isSaving = false,
  leads = [],
  onClose,
  onSave,
  patients = [],
  professionals = [],
  services = [],
}) => {
  const [form, setForm] = useState(() => buildForm(entry));
  const sourceOptions = useMemo(() => [
    ...patients.map((patient) => ({ id: patient.id, label: patient.name, type: 'patient' })),
    ...leads
      .filter((lead) => !(lead.convertedPatientId || lead.converted_patient_id))
      .map((lead) => ({ id: lead.id, label: lead.name, type: 'lead' })),
  ], [leads, patients]);

  useEffect(() => {
    if (isOpen) setForm(buildForm(entry));
  }, [entry, isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const [sourceType, sourceId] = form.source.split(':');
    await onSave?.({
      earliestDate: form.earliestDate,
      expectedUpdatedAt: entry?.updatedAt,
      latestDate: form.latestDate || null,
      preferredPeriod: form.preferredPeriod,
      preferredProfessionalId: form.preferredProfessionalId === 'none' ? null : form.preferredProfessionalId,
      priority: form.priority,
      serviceId: form.serviceId,
      sourceId,
      sourceType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar preferências' : 'Adicionar à lista de espera'}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Paciente ou lead existente *</label>
            <Select disabled={Boolean(entry)} required value={form.source} onValueChange={(source) => setForm((current) => ({ ...current, source }))}>
              <SelectTrigger><SelectValue placeholder="Selecione no CRM" /></SelectTrigger>
              <SelectContent>
                {sourceOptions.map((source) => (
                  <SelectItem key={`${source.type}:${source.id}`} value={`${source.type}:${source.id}`}>
                    {source.label} · {source.type === 'patient' ? 'Paciente' : 'Lead'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço *</label>
              <Select required value={form.serviceId} onValueChange={(serviceId) => setForm((current) => ({ ...current, serviceId }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional preferido</label>
              <Select value={form.preferredProfessionalId} onValueChange={(preferredProfessionalId) => setForm((current) => ({ ...current, preferredProfessionalId }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem preferência</SelectItem>
                  {professionals.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>{professional.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">A partir de *</label>
              <Input required type="date" value={form.earliestDate} onChange={(event) => setForm((current) => ({ ...current, earliestDate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Até</label>
              <Input min={form.earliestDate} type="date" value={form.latestDate} onChange={(event) => setForm((current) => ({ ...current, latestDate: event.target.value }))} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Select value={form.preferredPeriod} onValueChange={(preferredPeriod) => setForm((current) => ({ ...current, preferredPeriod }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPOINTMENT_WAITLIST_PERIOD_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={form.priority} onValueChange={(priority) => setForm((current) => ({ ...current, priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(APPOINTMENT_WAITLIST_PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">A entrada referencia o cadastro do CRM e não copia telefone, e-mail, observação ou conteúdo clínico.</p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={isSaving} type="submit">{isSaving ? 'Salvando...' : entry ? 'Salvar preferências' : 'Adicionar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentWaitlistEntryModal;
