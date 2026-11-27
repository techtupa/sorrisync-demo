
import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, MapPin, User, Calendar, CalendarClock, ExternalLink, Phone, FileText, CheckCircle2 } from 'lucide-react';
import { SCHEDULE_STATUSES as STATUSES } from '@/repositories/index.js';
import TimelineItem from '@/components/crm/TimelineItem';

const statusColors = {
  [STATUSES.CONFIRMADA]: 'bg-green-100 text-green-700',
  [STATUSES.AGENDADA]: 'bg-blue-100 text-blue-700',
  [STATUSES.PENDENTE]: 'bg-yellow-100 text-yellow-700',
  [STATUSES.EM_ATENDIMENTO]: 'bg-orange-100 text-orange-700',
  [STATUSES.FINALIZADA]: 'bg-gray-100 text-gray-700',
  [STATUSES.CANCELADA]: 'bg-red-100 text-red-700'
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const capitalize = (value) => {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : '';
};

const parseAppointmentDate = (appointment) => {
  if (DATE_PATTERN.test(appointment?.date || '')) {
    const [year, month, day] = appointment.date.split('-').map(Number);
    return new Date(year, month - 1, day, 12);
  }

  const date = new Date(appointment?.starts_at);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildAppointmentDateLabels = (appointment) => {
  const date = parseAppointmentDate(appointment);

  if (!date) {
    return {
      dateLabel: 'Data não informada',
      weekdayLabel: 'Dia não informado',
    };
  }

  return {
    dateLabel: capitalize(new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: 'long',
    }).format(date)),
    weekdayLabel: capitalize(new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
    }).format(date)),
  };
};

const buildPatientLinkDescription = (source) => {
  if (source === 'patient_id') {
    return 'Abrir paciente vinculado ao agendamento.';
  }

  if (source === 'phone') {
    return 'Paciente reconhecido pelo telefone no CRM.';
  }

  if (source === 'name') {
    return 'Paciente reconhecido pelo nome no CRM.';
  }

  return 'Consulta sem paciente reconhecido no CRM.';
};

const buildTimelinePatientDescription = (source) => {
  if (source === 'patient_id') {
    return 'Paciente vinculado ao CRM.';
  }

  if (source === 'phone' || source === 'name') {
    return 'Paciente reconhecido no CRM sem gravar novo vínculo.';
  }

  return 'Consulta avulsa sem paciente reconhecido.';
};

const AppointmentDrawer = ({
  appointment,
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  onOpenPatient,
  canOpenPatient = false,
  linkedPatientId = '',
  linkedPatientSource = 'none',
  canReschedule = false,
  onReschedule,
}) => {
  if (!appointment) return null;

  const initials = appointment.patient.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const { dateLabel, weekdayLabel } = buildAppointmentDateLabels(appointment);
  const hasLinkedPatient = Boolean(linkedPatientId);
  const patientLinkDescription = buildPatientLinkDescription(linkedPatientSource);
  const timelinePatientDescription = buildTimelinePatientDescription(linkedPatientSource);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto p-0 border-l border-border/50">

        <div className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetHeader className="text-left">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14 border border-border/50 shadow-sm">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle className="text-2xl font-bold leading-tight">{appointment.patient}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`border-0 ${statusColors[appointment.status]}`}>
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button className="flex-1 shadow-sm" onClick={() => onConfirm?.(appointment)}><CheckCircle2 className="w-4 h-4 mr-2" /> Confirmar</Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={!hasLinkedPatient || !canOpenPatient}
                onClick={() => onOpenPatient?.(appointment)}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Abrir CRM
              </Button>
            </div>
            {canReschedule && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 w-full text-primary hover:bg-primary/10 hover:text-primary"
                onClick={() => onReschedule?.(appointment)}
              >
                <CalendarClock className="mr-2 h-4 w-4" /> Reagendar
              </Button>
            )}
            {appointment.hasActiveCheckIn && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Reverta o check-in no Modo Recepção antes de reagendar esta consulta.
              </p>
            )}
          </SheetHeader>
        </div>

        <div className="p-6">
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-6 bg-muted/50">
              <TabsTrigger value="resumo" className="text-xs sm:text-sm">Resumo</TabsTrigger>
              <TabsTrigger value="paciente" className="text-xs sm:text-sm">Paciente</TabsTrigger>
              <TabsTrigger value="historico" className="text-xs sm:text-sm">Histórico</TabsTrigger>
              <TabsTrigger value="comunicacao" className="text-xs sm:text-sm">Contato</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-6 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Clock className="w-5 h-5 text-primary mb-2" />
                    <p className="text-2xl font-bold tabular-nums text-foreground">{appointment.time}</p>
                    <p className="text-xs text-muted-foreground">{appointment.duration} min</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Calendar className="w-5 h-5 text-primary mb-2" />
                    <p className="text-sm font-bold text-foreground">{dateLabel}</p>
                    <p className="text-xs text-muted-foreground">{weekdayLabel}</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Procedimento</p>
                  <p className="text-sm font-medium bg-muted/30 p-3 rounded-lg border border-border/50">{appointment.procedure}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold flex items-center gap-1"><User className="w-3 h-3" /> Profissional</p>
                    <p className="text-sm font-medium">{appointment.professional}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Sala</p>
                    <p className="text-sm font-medium">{appointment.room}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold flex items-center gap-1"><FileText className="w-3 h-3" /> Observações</p>
                  <div className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/50 min-h-[80px]">
                    {appointment.notes || <span className="text-muted-foreground italic">Nenhuma observação registrada.</span>}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="paciente" className="space-y-6 mt-0">
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-primary/5 p-4 rounded-xl border border-primary/20">
                  <div>
                    <p className="font-semibold text-primary">Cadastro operacional no CRM</p>
                    <p className="text-xs text-muted-foreground">
                      {patientLinkDescription}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-primary/10"
                    disabled={!hasLinkedPatient || !canOpenPatient}
                    onClick={() => onOpenPatient?.(appointment)}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> Abrir CRM
                  </Button>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Telefone</p>
                      <p className="text-sm font-medium">{appointment.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Origem do Lead</p>
                      <p className="text-sm font-medium">{appointment.origin}</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="mt-0">
              <div className="pt-2">
                <TimelineItem
                  date={`${dateLabel}, ${appointment.time || 'horário não informado'}`}
                  title="Consulta na agenda"
                  description={`${appointment.procedure} com ${appointment.professional}`}
                  icon={Clock}
                />
                <TimelineItem
                  date="Status operacional"
                  title={appointment.status}
                  description={appointment.notes || 'Sem observação operacional registrada.'}
                  icon={CheckCircle2}
                />
                <TimelineItem
                  date="Origem operacional"
                  title={appointment.origin || 'Origem não informada'}
                  description={timelinePatientDescription}
                  icon={Calendar}
                  isLast={true}
                />
              </div>
            </TabsContent>

            <TabsContent value="comunicacao" className="mt-0 space-y-4">
              <div className="bg-muted/30 border border-border/50 p-4 rounded-xl flex gap-3">
                <Phone className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Contato operacional</p>
                  <p className="text-xs text-muted-foreground mt-1">{appointment.phone || 'Telefone não informado.'}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2 font-medium">Sem envio automático conectado.</p>
                </div>
              </div>
              <div className="bg-muted/30 border border-border/50 p-4 rounded-xl flex gap-3">
                <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Registro da consulta</p>
                  <p className="text-xs text-muted-foreground mt-1">{appointment.notes || 'Sem observação operacional registrada.'}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-2 font-medium">Controle operacional pela recepção.</p>
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>

        <div className="p-6 border-t border-border/50 mt-auto bg-card">
          <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onCancel?.(appointment)}>
            Cancelar Consulta
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
};

export default AppointmentDrawer;
