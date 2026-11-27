import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, DoorOpen, Eye, MapPin, PlayCircle, RotateCcw, UserCheck, UserRound, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SCHEDULE_STATUSES as STATUSES } from '@/repositories/index.js';

const statusConfig = {
  [STATUSES.AGENDADA]: { label: STATUSES.AGENDADA, className: 'bg-blue-100 text-blue-700 border-blue-200', icon: CalendarDays },
  [STATUSES.PENDENTE]: { label: STATUSES.PENDENTE, className: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock3 },
  [STATUSES.CONFIRMADA]: { label: STATUSES.CONFIRMADA, className: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
  [STATUSES.EM_ATENDIMENTO]: { label: STATUSES.EM_ATENDIMENTO, className: 'bg-orange-100 text-orange-700 border-orange-200', icon: PlayCircle },
  [STATUSES.FINALIZADA]: { label: STATUSES.FINALIZADA, className: 'bg-slate-100 text-slate-700 border-slate-200', icon: CheckCircle2 },
  [STATUSES.CANCELADA]: { label: STATUSES.CANCELADA, className: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
};

const attentionConfig = {
  late: 'bg-red-50 text-red-700 border-red-200',
  next: 'bg-primary/10 text-primary border-primary/20',
  confirmation: 'bg-amber-50 text-amber-700 border-amber-200',
};

const preparationConfig = {
  attention: { className: 'bg-amber-50 text-amber-700 border-amber-200', icon: AlertTriangle },
  review: { className: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock3 },
  ok: { className: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
};

const statusActionIcon = {
  confirm: CheckCircle2,
  start: PlayCircle,
  finish: CheckCircle2,
};

const StatusBadge = ({ appointment }) => {
  const config = statusConfig[appointment.status] || statusConfig[STATUSES.AGENDADA];
  const Icon = config.icon;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
      {appointment.operationalState && appointment.operationalState !== config.label && (
        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
          {appointment.operationalState}
        </Badge>
      )}
      {appointment.hasActiveCheckIn && (
        <Badge variant="outline" className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700">
          <UserCheck className="h-3 w-3" />
          Arrived{appointment.checkedInTime ? ` at ${appointment.checkedInTime}` : ''}
        </Badge>
      )}
    </div>
  );
};

const ResourceList = ({ emptyText, items = [], title }) => (
  <div className="rounded-lg border border-border/50 bg-card p-3">
    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{title}</p>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-md border border-border/40 bg-muted/20 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
            <Badge variant="outline" className="shrink-0 bg-background tabular-nums">{item.nextTime}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {item.appointments} consultas · {item.activeAppointments} ativas · {item.blocks} bloqueios
          </p>
        </div>
      ))}
      {!items.length && (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  </div>
);

const DayFlowList = ({ items = [] }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
    {items.map((item) => (
      <div key={item.id} className="rounded-lg border border-border/50 bg-muted/20 p-3 min-h-[148px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.range}</p>
          </div>
          <Badge variant="outline" className="shrink-0 bg-background tabular-nums">
            {item.total}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
          <div className="rounded-md bg-background/70 border border-border/40 p-2">
            <p className="text-muted-foreground">Ativas</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{item.active}</p>
          </div>
          <div className="rounded-md bg-background/70 border border-border/40 p-2">
            <p className="text-muted-foreground">A confirmar</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{item.toConfirm}</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/40">
          <p className="text-xs font-medium text-muted-foreground">Próximo ativo</p>
          <p className="text-xs text-foreground mt-1 truncate">
            {item.nextPatient ? `${item.nextTime} - ${item.nextPatient}` : item.nextTime}
          </p>
        </div>
      </div>
    ))}
    {!items.length && (
      <p className="text-sm text-muted-foreground">Sem períodos derivados da Agenda para hoje.</p>
    )}
  </div>
);

const PreparationList = ({ items = [] }) => (
  <div className="space-y-3">
    {items.map((item) => {
      const config = preparationConfig[item.severity] || preparationConfig.review;
      const Icon = config.icon;

      return (
        <div key={item.id} className="rounded-lg border border-border/50 bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <Badge variant="outline" className={`shrink-0 gap-1.5 ${config.className}`}>
              <Icon className="w-3 h-3" />
              {item.count}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{item.label}</p>
        </div>
      );
    })}
    {!items.length && (
      <p className="text-sm text-muted-foreground">Sem preparação derivada da Agenda para hoje.</p>
    )}
  </div>
);

const ReceptionModeTodayTab = ({
  attentionItems = [],
  blocks = [],
  canManageCheckIns = false,
  canManageStatus = false,
  canReadCrm = false,
  checkInError = '',
  checkInSourceLabel = 'Sem leitura',
  dayFlow = [],
  isAppointmentCheckInBusy = () => false,
  loading = false,
  onOpenAgenda,
  onOpenPatient,
  onRegisterArrival,
  onRequestCheckInReversal,
  onUpdateStatus,
  preparationItems = [],
  queue = [],
  resourceMap = { professionals: [], rooms: [] },
  sourceLabel = 'Agenda',
  statusUpdateInFlightId = '',
}) => {
  const queueById = useMemo(() => (
    new Map(queue.map((item) => [item.id, item]))
  ), [queue]);
  const professionalResources = resourceMap.professionals || [];
  const roomResources = resourceMap.rooms || [];
  const nextAppointments = queue
    .filter((item) => item.status !== STATUSES.CANCELADA && item.status !== STATUSES.FINALIZADA)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {checkInError && (
        <div className="lg:col-span-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {checkInError}
        </div>
      )}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Agenda de Hoje
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex bg-background text-muted-foreground">
                Check-in: {checkInSourceLabel}
              </Badge>
              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => onOpenAgenda?.()}>
                Open full schedule <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[86px]">Hora</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="hidden md:table-cell">Procedimento</TableHead>
                  <TableHead className="hidden lg:table-cell">Profissional / Sala</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((appointment) => {
                  const primaryAction = appointment.nextStatusAction;
                  const ActionIcon = statusActionIcon[primaryAction?.type] || CheckCircle2;
                  const statusUpdateKey = appointment.appointmentId || appointment.id;
                  const isStatusUpdating = Boolean(
                    statusUpdateInFlightId && statusUpdateInFlightId === statusUpdateKey
                  );
                  const isCheckInUpdating = isAppointmentCheckInBusy(appointment.appointmentId);
                  const primaryActionTitle = primaryAction
                    ? (
                      isStatusUpdating
                        ? 'Atualização de status em andamento pela Agenda.'
                        : appointment.statusActionBlockedReason || primaryAction.label
                    )
                    : undefined;

                  return (
                    <TableRow key={appointment.id} className="hover:bg-muted/30">
                      <TableCell className="font-semibold tabular-nums">{appointment.time}</TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{appointment.patient}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{appointment.procedure}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <p className="text-sm text-foreground">{appointment.procedure}</p>
                        <p className="text-xs text-muted-foreground">{appointment.origin}</p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <p className="text-sm font-medium">{appointment.professional}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {appointment.room}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge appointment={appointment} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {appointment.canRegisterCheckIn && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-700"
                              onClick={() => onRegisterArrival?.(appointment)}
                              disabled={!canManageCheckIns || isCheckInUpdating}
                              title={isCheckInUpdating ? 'Registro de chegada em andamento.' : 'Registrar chegada'}
                            >
                              <UserCheck className="w-4 h-4" />
                              <span className="sr-only">Registrar chegada</span>
                            </Button>
                          )}
                          {appointment.hasActiveCheckIn && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-700"
                              onClick={() => onRequestCheckInReversal?.(appointment)}
                              disabled={!canManageCheckIns || isCheckInUpdating}
                              title={isCheckInUpdating ? 'Ação de check-in em andamento.' : 'Reverter check-in'}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="sr-only">Reverter check-in</span>
                            </Button>
                          )}
                          {primaryAction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-primary"
                              onClick={() => onUpdateStatus?.(appointment, primaryAction.nextStatus)}
                              disabled={!canManageStatus || !appointment.canApplyStatusAction || isStatusUpdating}
                              title={primaryActionTitle}
                            >
                              <ActionIcon className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground"
                            onClick={() => onOpenAgenda?.(appointment)}
                            title="Abrir na Agenda"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {appointment.linkedPatientId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={() => onOpenPatient?.(appointment)}
                              disabled={!canReadCrm}
                              title="Abrir paciente"
                            >
                              <UserRound className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!queue.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      {loading ? 'Atualizando leitura da Agenda...' : 'Nenhuma consulta registrada para hoje nesta leitura da Agenda.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock3 className="w-5 h-5 text-primary" /> Fluxo do dia
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Leitura por períodos derivada da Agenda, sem fila própria ou estado novo.
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <DayFlowList items={dayFlow} />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Atenção operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {attentionItems.map((item) => {
              const appointment = queueById.get(item.queueItemId);

              return (
                <button
                  type="button"
                  key={item.id}
                  className="w-full text-left rounded-lg border border-border/50 bg-card p-3 hover:border-primary/40 transition-colors"
                  onClick={() => appointment && onOpenAgenda?.(appointment)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${attentionConfig[item.type] || 'bg-background text-muted-foreground border-border'}`}
                    >
                      {item.label}
                    </Badge>
                  </div>
                </button>
              );
            })}
            {!attentionItems.length && (
              <p className="text-sm text-muted-foreground">
                Nenhum ponto de atenção derivado da Agenda neste momento.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Preparação do dia
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <PreparationList items={preparationItems} />
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-muted/10">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock3 className="w-4 h-4 text-primary" /> Próximas consultas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {nextAppointments.map((appointment) => (
              <button
                type="button"
                key={appointment.id}
                className="w-full text-left flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card p-3 hover:border-primary/40 transition-colors"
                onClick={() => onOpenAgenda?.(appointment)}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{appointment.patient}</p>
                  <p className="text-xs text-muted-foreground truncate">{appointment.time} • {appointment.procedure}</p>
                </div>
                <Badge variant="outline" className="shrink-0 bg-background">{appointment.operationalState}</Badge>
              </button>
            ))}
            {!nextAppointments.length && (
              <p className="text-sm text-muted-foreground">Sem próximas consultas ativas na leitura atual.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DoorOpen className="w-4 h-4 text-primary" /> Bloqueios, salas e profissionais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Bloqueios do dia</p>
              <div className="space-y-2">
                {blocks.map((block) => (
                  <div key={block.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <p className="text-sm font-semibold text-foreground">{block.time} • {block.reason}</p>
                    <p className="text-xs text-muted-foreground">{block.professional} • {block.room}</p>
                  </div>
                ))}
                {!blocks.length && (
                  <p className="text-xs text-muted-foreground">Nenhum bloqueio registrado para hoje.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <ResourceList
                emptyText="Sem profissional alocado hoje."
                items={professionalResources}
                title="Mapa de profissionais"
              />
              <ResourceList
                emptyText="Sem sala alocada hoje."
                items={roomResources}
                title="Mapa de salas"
              />
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold text-emerald-800">Fonte operacional</p>
              <p className="text-xs text-emerald-700 mt-1">
                {sourceLabel}. A tela organiza o dia atual sem gravar fila própria.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceptionModeTodayTab;
