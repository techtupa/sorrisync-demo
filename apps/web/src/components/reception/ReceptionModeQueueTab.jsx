import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, FileText, PlayCircle, RotateCcw, Save, User, UserCheck, UserRound, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

const columns = [
  { id: 'toConfirm', title: 'A confirmar', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { id: 'confirmed', title: 'Confirmados', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'inProgress', title: 'Em atendimento', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'finished', title: 'Finalizados', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  { id: 'canceled', title: 'Cancelados', color: 'bg-red-50 border-red-200 text-red-700' },
];

const statusActionIcon = {
  confirm: CheckCircle2,
  start: PlayCircle,
  finish: CheckCircle2,
};

const ReceptionModeQueueTab = ({
  canManageCheckIns = false,
  canManageCrm = false,
  canManageStatus = false,
  canReadCrm = false,
  isAppointmentCheckInBusy = () => false,
  onOpenAgenda,
  onOpenPatient,
  onRegisterArrival,
  onRecordPostAttendance,
  onRequestCheckInReversal,
  onUpdateStatus,
  postAttendanceInFlightId = '',
  queue = [],
  statusUpdateInFlightId = '',
}) => {
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPostAttendanceFormOpen, setIsPostAttendanceFormOpen] = useState(false);
  const [postAttendanceNote, setPostAttendanceNote] = useState('');
  const [postAttendanceNextAction, setPostAttendanceNextAction] = useState('');

  useEffect(() => {
    if (!selectedAppointment?.id) return;
    const latestAppointment = queue.find((appointment) => appointment.id === selectedAppointment.id);
    if (!latestAppointment) {
      setSelectedAppointment(null);
      setIsDrawerOpen(false);
      setIsPostAttendanceFormOpen(false);
      return;
    }
    if (latestAppointment !== selectedAppointment) {
      setSelectedAppointment(latestAppointment);
    }
  }, [queue, selectedAppointment]);

  const openDrawer = (appointment) => {
    setSelectedAppointment(appointment);
    setIsPostAttendanceFormOpen(false);
    setPostAttendanceNote('');
    setPostAttendanceNextAction('');
    setIsDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open) => {
    setIsDrawerOpen(open);

    if (!open) {
      setIsPostAttendanceFormOpen(false);
      setPostAttendanceNote('');
      setPostAttendanceNextAction('');
    }
  };

  const handleUpdateStatus = (appointment, nextStatus, event) => {
    event?.stopPropagation?.();
    onUpdateStatus?.(appointment, nextStatus);
  };

  const handleSubmitPostAttendance = async (event) => {
    event?.preventDefault?.();

    const note = postAttendanceNote.trim();
    const nextAction = postAttendanceNextAction.trim();

    if (!note) return;
    if (!nextAction) return;

    const savedPatient = await onRecordPostAttendance?.(selectedAppointment, {
      note,
      nextAction,
    });

    if (savedPatient) {
      setIsPostAttendanceFormOpen(false);
      setPostAttendanceNote('');
      setPostAttendanceNextAction('');
    }
  };

  const selectedStatusAction = selectedAppointment?.nextStatusAction || null;
  const selectedStatusActionTitle = selectedStatusAction
    ? selectedAppointment.statusActionBlockedReason || selectedStatusAction.label
    : undefined;
  const selectedCancelAction = selectedAppointment?.cancelStatusAction || null;
  const selectedCancelActionTitle = selectedCancelAction
    ? selectedAppointment.cancelStatusBlockedReason || selectedCancelAction.label
    : undefined;
  const selectedStatusUpdateKey = selectedAppointment?.appointmentId || selectedAppointment?.id || '';
  const isSelectedStatusUpdating = Boolean(
    statusUpdateInFlightId && statusUpdateInFlightId === selectedStatusUpdateKey
  );
  const isSelectedPostAttendanceSaving = Boolean(
    postAttendanceInFlightId && postAttendanceInFlightId === selectedStatusUpdateKey
  );
  const isSelectedCheckInUpdating = isAppointmentCheckInBusy(selectedAppointment?.appointmentId);
  const canRecordPostAttendance = Boolean(
    selectedAppointment?.hasRealPatientLink && canManageCrm
  );
  const SelectedStatusActionIcon = statusActionIcon[selectedStatusAction?.type] || CheckCircle2;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Fila operacional do dia</h3>
          <p className="text-sm text-muted-foreground">
            Organização visual derivada dos status reais da Agenda.
          </p>
        </div>
        <Button variant="outline" className="bg-card shadow-sm md:self-start" onClick={() => onOpenAgenda?.()}>
          <CalendarDays className="w-4 h-4 mr-2" /> Abrir Agenda
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[560px]">
        {columns.map((column) => {
          const items = queue.filter((appointment) => appointment.group === column.id);

          return (
            <div key={column.id} className="flex-shrink-0 w-[280px] flex flex-col gap-3">
              <div className={`px-3 py-2 rounded-lg border ${column.color} font-semibold text-sm flex justify-between items-center`}>
                {column.title}
                <Badge variant="outline" className="bg-white/60">{items.length}</Badge>
              </div>

              <div className="flex-1 bg-muted/30 rounded-xl p-2 border border-border/50 border-dashed flex flex-col gap-2">
                {items.map((appointment) => {
                  const primaryAction = appointment.nextStatusAction;
                  const ActionIcon = statusActionIcon[primaryAction?.type] || CheckCircle2;
                  const statusUpdateKey = appointment.appointmentId || appointment.id;
                  const isStatusUpdating = Boolean(
                    statusUpdateInFlightId && statusUpdateInFlightId === statusUpdateKey
                  );
                  const primaryActionTitle = primaryAction
                    ? (
                      isStatusUpdating
                        ? 'Atualização de status em andamento pela Agenda.'
                        : appointment.statusActionBlockedReason || primaryAction.label
                    )
                    : undefined;

                  return (
                    <Card
                      key={appointment.id}
                      className="border-border/50 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => openDrawer(appointment)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <p className="font-bold text-sm text-foreground leading-tight">{appointment.patient}</p>
                          <Badge variant="secondary" className="text-[10px] tabular-nums">{appointment.time}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{appointment.procedure}</p>
                        <p className="text-[10px] text-muted-foreground mb-3">{appointment.professional} • {appointment.room}</p>
                        <Badge variant="outline" className="mb-3 bg-background text-muted-foreground border-border">
                          {appointment.operationalState}
                        </Badge>
                        {appointment.hasActiveCheckIn && (
                          <Badge variant="outline" className="mb-3 ml-1 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                            <UserCheck className="h-3 w-3" />
                            Arrived{appointment.checkedInTime ? ` at ${appointment.checkedInTime}` : ''}
                          </Badge>
                        )}

                        <div className="flex gap-1 mt-auto">
                          {primaryAction && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px] flex-1"
                              onClick={(event) => handleUpdateStatus(appointment, primaryAction.nextStatus, event)}
                              disabled={!canManageStatus || !appointment.canApplyStatusAction || isStatusUpdating}
                              title={primaryActionTitle}
                            >
                              {ActionIcon && <ActionIcon className="w-3 h-3 mr-1" />}
                              {primaryAction.label}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[10px]"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenAgenda?.(appointment);
                            }}
                          >
                            Abrir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {!items.length && (
                  <div className="h-20 flex items-center justify-center text-xs text-muted-foreground/60">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={isDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto custom-scrollbar p-0">
          {selectedAppointment && (
            <>
              <div className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 bg-background rounded-xl border border-border/50 shadow-sm shrink-0">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <Badge variant="outline" className="mb-2">{selectedAppointment.status}</Badge>
                    {selectedAppointment.hasActiveCheckIn && (
                      <Badge variant="outline" className="mb-2 ml-2 border-emerald-200 bg-emerald-50 text-emerald-700">
                        Arrived{selectedAppointment.checkedInTime ? ` at ${selectedAppointment.checkedInTime}` : ''}
                      </Badge>
                    )}
                    <SheetTitle className="text-xl font-bold text-foreground truncate pr-4">
                      {selectedAppointment.patient}
                    </SheetTitle>
                    <SheetDescription className="text-sm mt-1">
                      {selectedAppointment.procedure}
                    </SheetDescription>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedAppointment.canRegisterCheckIn && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRegisterArrival?.(selectedAppointment)}
                      disabled={!canManageCheckIns || isSelectedCheckInUpdating}
                      title={selectedAppointment.checkInBlockedReason || 'Registrar chegada'}
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      {isSelectedCheckInUpdating ? 'Registrando...' : 'Registrar chegada'}
                    </Button>
                  )}
                  {selectedAppointment.hasActiveCheckIn && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onRequestCheckInReversal?.(selectedAppointment)}
                      disabled={!canManageCheckIns || isSelectedCheckInUpdating}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" /> Reverter check-in
                    </Button>
                  )}
                  {selectedStatusAction && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(
                        selectedAppointment,
                        selectedStatusAction.nextStatus,
                      )}
                      disabled={!canManageStatus || !selectedAppointment.canApplyStatusAction || isSelectedStatusUpdating}
                      title={isSelectedStatusUpdating ? 'Atualização de status em andamento pela Agenda.' : selectedStatusActionTitle}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                    >
                      <SelectedStatusActionIcon className="w-4 h-4 mr-2" />
                      {selectedStatusAction.label}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => onOpenAgenda?.(selectedAppointment)}>
                    <CalendarDays className="w-4 h-4 mr-2" /> Abrir Agenda
                  </Button>
                  {selectedAppointment.linkedPatientId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenPatient?.(selectedAppointment)}
                      disabled={!canReadCrm}
                    >
                      <UserRound className="w-4 h-4 mr-2" /> Abrir CRM
                    </Button>
                  )}
                  {canRecordPostAttendance && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPostAttendanceFormOpen((isOpen) => !isOpen)}
                      disabled={isSelectedPostAttendanceSaving}
                    >
                      <FileText className="w-4 h-4 mr-2" /> Registrar pós-atendimento
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-border/50 rounded-xl bg-card">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Horário</p>
                    <p className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Clock3 className="w-4 h-4 text-muted-foreground" />
                      {selectedAppointment.time}
                    </p>
                  </div>
                  <div className="p-4 border border-border/50 rounded-xl bg-card">
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Local</p>
                    <p className="text-sm font-bold text-foreground leading-tight">
                      {selectedAppointment.professional}<br />
                      <span className="text-xs font-normal text-muted-foreground">{selectedAppointment.room}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Detalhes operacionais</h4>
                  <div className="p-4 border border-border/50 rounded-xl bg-card space-y-3">
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Contato:</span>
                      <span className="font-medium text-right">{selectedAppointment.phone || 'Não informado'}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Origem:</span>
                      <span className="font-medium text-right">{selectedAppointment.origin}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Estado visual:</span>
                      <span className="font-medium text-primary text-right">{selectedAppointment.operationalState}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Chegada operacional:</span>
                      <span className="font-medium text-right">
                        {selectedAppointment.hasActiveCheckIn
                          ? `Recorded${selectedAppointment.checkedInTime ? ` at ${selectedAppointment.checkedInTime}` : ''}`
                          : 'Não registrada'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Observação da Agenda</h4>
                    <p className="rounded-xl border border-border/50 bg-card p-4 text-sm text-muted-foreground">
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">Pós-atendimento operacional</h4>
                  {!selectedAppointment.hasRealPatientLink ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      Registro no CRM disponível apenas quando a consulta tem patient_id vinculado.
                    </div>
                  ) : !canManageCrm ? (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                      Perfil sem permissão para registrar pós-atendimento no CRM.
                    </div>
                  ) : isPostAttendanceFormOpen ? (
                    <form
                      className="rounded-xl border border-border/50 bg-card p-4 space-y-4"
                      onSubmit={handleSubmitPostAttendance}
                    >
                      <div className="space-y-2">
                        <Label htmlFor="post-attendance-note">Nota operacional/CRM *</Label>
                        <Textarea
                          id="post-attendance-note"
                          value={postAttendanceNote}
                          onChange={(event) => setPostAttendanceNote(event.target.value)}
                          maxLength={480}
                          rows={4}
                          placeholder="Registre combinado administrativo, retorno ou orientação de relacionamento."
                          disabled={isSelectedPostAttendanceSaving}
                          required
                        />
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Não é prontuário. Use apenas informação administrativa e de relacionamento.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="post-attendance-next-action">Próximo passo manual *</Label>
                        <Input
                          id="post-attendance-next-action"
                          value={postAttendanceNextAction}
                          onChange={(event) => setPostAttendanceNextAction(event.target.value)}
                          maxLength={160}
                          placeholder="Ex.: ligar para confirmar retorno"
                          disabled={isSelectedPostAttendanceSaving}
                          required
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsPostAttendanceFormOpen(false)}
                          disabled={isSelectedPostAttendanceSaving}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={
                            isSelectedPostAttendanceSaving
                            || !postAttendanceNote.trim()
                            || !postAttendanceNextAction.trim()
                          }
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSelectedPostAttendanceSaving ? 'Salvando...' : 'Salvar no CRM'}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                      <p className="text-xs font-medium text-emerald-800">
                        Consulta vinculada ao CRM. Use Registrar pós-atendimento para salvar nota operacional e próximo passo.
                      </p>
                    </div>
                  )}
                </div>

                {selectedCancelAction && (
                  <>
                    <Separator />
                    <Button
                      variant="outline"
                      className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleUpdateStatus(selectedAppointment, selectedCancelAction.nextStatus)}
                      disabled={!canManageStatus || !selectedAppointment.canApplyCancelStatusAction || isSelectedStatusUpdating}
                      title={isSelectedStatusUpdating ? 'Atualização de status em andamento pela Agenda.' : selectedCancelActionTitle}
                    >
                      <XCircle className="w-4 h-4 mr-2" /> Cancelar pela Agenda
                    </Button>
                  </>
                )}

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-bold text-emerald-800">Contrato da Frente N</p>
                  <p className="text-xs text-emerald-700 mt-1">
                    O check-in é um registro operacional separado: não cria fila e não altera automaticamente o status da consulta.
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ReceptionModeQueueTab;
