import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarRange, Loader2, Pencil, Plus, Power } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PROFESSIONAL_AVAILABILITY_EXCEPTION_REASON_LABELS,
  PROFESSIONAL_AVAILABILITY_EXCEPTION_REASONS,
  PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPE_LABELS,
} from '@/repositories/index.js';

export const AGENDA_WEEKDAYS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado',
];
const INTERVAL_OPTIONS = [15, 30, 45, 60];
const DEFAULT_FORM = { windowId: '', weekday: '1', startTime: '08:00', endTime: '18:00', slotIntervalMinutes: '30' };
const getSaoPauloToday = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const getDefaultExceptionForm = () => ({
  exceptionDate: getSaoPauloToday(), exceptionType: 'unavailable', fullDay: false,
  startTime: '08:00', endTime: '18:00', reasonCode: 'operational_adjustment',
});
const minuteToTime = (value) => {
  const minute = Number(value);
  if (!Number.isInteger(minute) || minute < 0 || minute > 1440) return '';
  const normalized = minute === 1440 ? 0 : minute;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};
const timeToMinute = (value) => {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ''));
  return match ? (Number(match[1]) * 60) + Number(match[2]) : Number.NaN;
};
const formatDate = (value) => {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
};

const ProfessionalAvailabilityModal = ({
  availabilityError = '', availabilityInFlightId = '', availabilityLoading = false,
  canManage = true, disableAvailabilityWindow, disableException, exceptionInFlightId = '',
  exceptions = [], exceptionsError = '', exceptionsLoading = false, isOpen,
  loadAvailabilityWindows, onClose, professionals = [], refreshExceptions,
  saveAvailabilityWindow, saveException, windows = [],
}) => {
  const [professionalId, setProfessionalId] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [exceptionForm, setExceptionForm] = useState(getDefaultExceptionForm);
  const [windowToDisable, setWindowToDisable] = useState(null);
  const [exceptionToDisable, setExceptionToDisable] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setProfessionalId((current) => professionals.some((item) => item.id === current) ? current : professionals[0]?.id || '');
    setForm(DEFAULT_FORM);
    setExceptionForm(getDefaultExceptionForm());
    setWindowToDisable(null);
    setExceptionToDisable(null);
  }, [isOpen, professionals]);
  useEffect(() => {
    if (!isOpen || !professionalId) return;
    loadAvailabilityWindows?.(professionalId).catch(() => undefined);
    refreshExceptions?.(professionalId).catch(() => undefined);
  }, [isOpen, loadAvailabilityWindows, professionalId, refreshExceptions]);

  const sortedWindows = useMemo(() => [...windows].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute), [windows]);
  const sortedExceptions = useMemo(() => [...exceptions].sort((a, b) => a.exceptionDate.localeCompare(b.exceptionDate) || a.startMinute - b.startMinute), [exceptions]);
  const resetForm = () => setForm(DEFAULT_FORM);
  const handleEdit = (window) => setForm({
    windowId: window.id, weekday: String(window.weekday), startTime: minuteToTime(window.startMinute),
    endTime: window.endMinute === 1440 ? '23:59' : minuteToTime(window.endMinute),
    slotIntervalMinutes: String(window.slotIntervalMinutes),
  });
  const handleSave = async (event) => {
    event.preventDefault();
    const startMinute = timeToMinute(form.startTime);
    const endMinute = form.endTime === '23:59' ? 1440 : timeToMinute(form.endTime);
    if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute >= endMinute) {
      toast.error('Informe uma janela com horário inicial anterior ao horário final.');
      return;
    }
    try {
      const result = await saveAvailabilityWindow?.({
        professionalId, weekday: Number(form.weekday), startMinute, endMinute,
        slotIntervalMinutes: Number(form.slotIntervalMinutes), windowId: form.windowId || null,
      });
      toast.success(result?.replayed ? 'Disponibilidade já estava atualizada.' : 'Disponibilidade salva com sucesso.');
      resetForm();
    } catch (error) { toast.error(error?.message || 'Não foi possível salvar a disponibilidade.'); }
  };
  const handleSaveException = async (event) => {
    event.preventDefault();
    const fullDay = exceptionForm.exceptionType === 'unavailable' && exceptionForm.fullDay;
    const startMinute = fullDay ? 0 : timeToMinute(exceptionForm.startTime);
    const endMinute = fullDay ? 1440 : (exceptionForm.endTime === '23:59' ? 1440 : timeToMinute(exceptionForm.endTime));
    if (!exceptionForm.exceptionDate || !Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute >= endMinute) {
      toast.error('Informe uma data e uma faixa de horário válidas.');
      return;
    }
    try {
      const result = await saveException?.({
        professionalId, exceptionDate: exceptionForm.exceptionDate,
        exceptionType: exceptionForm.exceptionType, startMinute, endMinute,
        reasonCode: exceptionForm.reasonCode,
      });
      toast.success(result?.replayed ? 'A exceção já estava ativa.' : 'Exceção salva com sucesso.');
      setExceptionForm(getDefaultExceptionForm());
    } catch (error) { toast.error(error?.message || 'Não foi possível salvar a exceção de disponibilidade.'); }
  };
  const handleDisableWindow = async () => {
    if (!windowToDisable) return;
    try {
      const result = await disableAvailabilityWindow?.(windowToDisable);
      toast.success(result?.replayed ? 'A disponibilidade já estava inativa.' : 'Disponibilidade desativada.');
      setWindowToDisable(null);
    } catch (error) { toast.error(error?.message || 'Não foi possível desativar a disponibilidade.'); }
  };
  const handleDisableException = async () => {
    if (!exceptionToDisable) return;
    try {
      const result = await disableException?.(exceptionToDisable);
      toast.success(result?.replayed ? 'A exceção já estava inativa.' : 'Exceção desativada.');
      setExceptionToDisable(null);
    } catch (error) { toast.error(error?.message || 'Não foi possível desativar a exceção.'); }
  };
  const formLockId = form.windowId || `new:${professionalId}:${form.weekday}`;
  const exceptionLockId = `new:${professionalId}:${exceptionForm.exceptionDate}`;
  const busy = Boolean(availabilityInFlightId || exceptionInFlightId);

  return <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && !busy && onClose?.()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarRange className="h-5 w-5 text-primary" /> Disponibilidade semanal</DialogTitle>
          <DialogDescription>Gerencie a rotina semanal e exceções por data. Sugestões internas não reservam consultas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium">Profissional</label>
          <Select value={professionalId} onValueChange={(value) => { setProfessionalId(value); resetForm(); }}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{professionals.map((item) => <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Tabs defaultValue="weekly">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="weekly">Rotina semanal</TabsTrigger><TabsTrigger value="exceptions">Exceções por data</TabsTrigger></TabsList>
          <TabsContent value="weekly" className="space-y-5">
            {canManage && <form className="rounded-xl border border-border/60 bg-muted/20 p-4" onSubmit={handleSave}>
              <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{form.windowId ? 'Editar janela' : 'Nova janela'}</p>{form.windowId && <Button type="button" size="sm" variant="ghost" onClick={resetForm}>Cancelar edição</Button>}</div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-2 sm:col-span-2"><label className="text-xs font-medium">Dia da semana</label><Select value={form.weekday} onValueChange={(value) => setForm((current) => ({ ...current, weekday: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{AGENDA_WEEKDAYS.map((label, index) => <SelectItem key={label} value={String(index)}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><label className="text-xs font-medium" htmlFor="availability-start">Início</label><Input id="availability-start" type="time" required value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /></div>
                <div className="space-y-2"><label className="text-xs font-medium" htmlFor="availability-end">Fim</label><Input id="availability-end" type="time" required value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><label className="text-xs font-medium">Intervalo das sugestões</label><Select value={form.slotIntervalMinutes} onValueChange={(value) => setForm((current) => ({ ...current, slotIntervalMinutes: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{INTERVAL_OPTIONS.map((value) => <SelectItem key={value} value={String(value)}>{value} min</SelectItem>)}</SelectContent></Select></div>
                <div className="flex items-end sm:col-span-2"><Button type="submit" className="w-full" disabled={!professionalId || availabilityInFlightId === formLockId}>{availabilityInFlightId === formLockId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{form.windowId ? 'Salvar alterações' : 'Adicionar janela'}</Button></div>
              </div>
            </form>}
            {availabilityError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{availabilityError}</AlertDescription></Alert>}
            <div className="space-y-2"><p className="text-sm font-semibold">Janelas cadastradas</p>{availabilityLoading && <Loading text="Carregando disponibilidade..." />}{!availabilityLoading && sortedWindows.length === 0 && <Empty text="Nenhuma janela cadastrada para este profissional." />}{sortedWindows.map((window) => <div key={window.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex gap-2"><p className="text-sm font-medium">{AGENDA_WEEKDAYS[window.weekday]}</p><StatusBadge status={window.status} /></div><p className="mt-1 text-xs text-muted-foreground">{minuteToTime(window.startMinute)}–{window.endMinute === 1440 ? '24:00' : minuteToTime(window.endMinute)} · sugestões a cada {window.slotIntervalMinutes} min</p></div>{canManage && <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => handleEdit(window)}><Pencil className="mr-2 h-3.5 w-3.5" />{window.status === 'active' ? 'Editar' : 'Reativar'}</Button>{window.status === 'active' && <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setWindowToDisable(window)}><Power className="mr-2 h-3.5 w-3.5" />Desativar</Button>}</div>}</div>)}</div>
          </TabsContent>
          <TabsContent value="exceptions" className="space-y-5">
            <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Esta exceção altera apenas as sugestões futuras. Consultas já agendadas não serão modificadas.</AlertDescription></Alert>
            {canManage && <form className="rounded-xl border border-border/60 bg-muted/20 p-4" onSubmit={handleSaveException}>
              <p className="mb-3 text-sm font-semibold">Nova exceção</p>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-2 sm:col-span-2"><label className="text-xs font-medium" htmlFor="exception-date">Data</label><Input id="exception-date" type="date" required value={exceptionForm.exceptionDate} onChange={(event) => setExceptionForm((current) => ({ ...current, exceptionDate: event.target.value }))} /></div>
                <div className="space-y-2 sm:col-span-2"><label className="text-xs font-medium">Tipo</label><Select value={exceptionForm.exceptionType} onValueChange={(value) => setExceptionForm((current) => ({ ...current, exceptionType: value, fullDay: value === 'custom_hours' ? false : current.fullDay }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                {exceptionForm.exceptionType === 'unavailable' && <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" checked={exceptionForm.fullDay} onChange={(event) => setExceptionForm((current) => ({ ...current, fullDay: event.target.checked }))} /> Dia inteiro</label>}
                {!exceptionForm.fullDay && <><div className="space-y-2"><label className="text-xs font-medium" htmlFor="exception-start">Início</label><Input id="exception-start" type="time" required value={exceptionForm.startTime} onChange={(event) => setExceptionForm((current) => ({ ...current, startTime: event.target.value }))} /></div><div className="space-y-2"><label className="text-xs font-medium" htmlFor="exception-end">Fim</label><Input id="exception-end" type="time" required value={exceptionForm.endTime} onChange={(event) => setExceptionForm((current) => ({ ...current, endTime: event.target.value }))} /></div></>}
                <div className="space-y-2 sm:col-span-2"><label className="text-xs font-medium">Motivo</label><Select value={exceptionForm.reasonCode} onValueChange={(value) => setExceptionForm((current) => ({ ...current, reasonCode: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PROFESSIONAL_AVAILABILITY_EXCEPTION_REASONS.map((value) => <SelectItem key={value} value={value}>{PROFESSIONAL_AVAILABILITY_EXCEPTION_REASON_LABELS[value]}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex items-end sm:col-span-2"><Button type="submit" className="w-full" disabled={!professionalId || exceptionInFlightId === exceptionLockId}>{exceptionInFlightId === exceptionLockId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Salvar exceção</Button></div>
              </div>
            </form>}
            {exceptionsError && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{exceptionsError}</AlertDescription></Alert>}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Exceções recentes e futuras</p>
              {exceptionsLoading && <Loading text="Carregando exceções..." />}
              {!exceptionsLoading && sortedExceptions.length === 0 && <Empty text="Nenhuma exceção cadastrada para este profissional." />}
              {sortedExceptions.map((exception) => (
                <div key={exception.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <p className="text-sm font-medium">{formatDate(exception.exceptionDate)} · {PROFESSIONAL_AVAILABILITY_EXCEPTION_TYPE_LABELS[exception.exceptionType]}</p>
                      <StatusBadge status={exception.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {exception.startMinute === 0 && exception.endMinute === 1440 ? 'Dia inteiro' : `${minuteToTime(exception.startMinute)}–${exception.endMinute === 1440 ? '24:00' : minuteToTime(exception.endMinute)}`} · {PROFESSIONAL_AVAILABILITY_EXCEPTION_REASON_LABELS[exception.reasonCode]}
                    </p>
                    {exception.exceptionType === 'custom_hours' && <p className="mt-1 text-xs text-muted-foreground">A disponibilidade desta data possui um horário especial.</p>}
                    {exception.exceptionType === 'unavailable' && <p className="mt-1 text-xs text-muted-foreground">Este período está indisponível.</p>}
                  </div>
                  {canManage && exception.status === 'active' && <Button type="button" size="sm" variant="ghost" className="text-destructive" disabled={busy} onClick={() => setExceptionToDisable(exception)}><Power className="mr-2 h-3.5 w-3.5" />Desativar</Button>}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <DisableDialog open={Boolean(windowToDisable)} onOpenChange={(open) => !open && setWindowToDisable(null)} title="Desativar esta janela?" description="Ela deixará de gerar novas sugestões, mas o histórico será preservado. Nenhuma consulta existente será alterada." disabled={availabilityInFlightId === windowToDisable?.id} actionLabel="Desativar janela" onConfirm={handleDisableWindow} />
    <DisableDialog open={Boolean(exceptionToDisable)} onOpenChange={(open) => !open && setExceptionToDisable(null)} title="Desativar esta exceção?" description="O histórico será preservado e a disponibilidade voltará a ser calculada sem esta exceção. Consultas existentes permanecem intactas." disabled={exceptionInFlightId === exceptionToDisable?.id} actionLabel="Desativar exceção" onConfirm={handleDisableException} />
  </>;
};

const Loading = ({ text }) => <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{text}</p>;
const Empty = ({ text }) => <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{text}</p>;
const StatusBadge = ({ status }) => <Badge variant={status === 'active' ? 'secondary' : 'outline'}>{status === 'active' ? 'Ativa' : 'Inativa'}</Badge>;
const DisableDialog = ({ actionLabel, description, disabled, onConfirm, onOpenChange, open, title }) => <AlertDialog open={open} onOpenChange={onOpenChange}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={disabled}>Voltar</AlertDialogCancel><AlertDialogAction disabled={disabled} onClick={onConfirm}>{actionLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;

export default ProfessionalAvailabilityModal;
