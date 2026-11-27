
import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar, Plus, Ban, Users, CheckCircle,
  Clock, XCircle, Activity, LayoutList, CalendarDays,
  CalendarRange, Search, AlertCircle, Info, SlidersHorizontal, ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSchedule } from '@/hooks/useSchedule.js';
import { usePatients } from '@/hooks/usePatients.js';
import { usePatientLeads } from '@/hooks/usePatientLeads.js';
import { useServicesCatalog } from '@/hooks/useServicesCatalog.js';
import { useAppointmentWaitlist } from '@/hooks/useAppointmentWaitlist.js';
import {
  SCHEDULE_STATUSES as STATUSES,
  isAppointmentEligibleForRescheduling,
} from '@/repositories/index.js';
import DayCalendarView from '@/components/agenda/DayCalendarView';
import WeekCalendarView from '@/components/agenda/WeekCalendarView';
import AppointmentListView from '@/components/agenda/AppointmentListView';
import AppointmentDrawer from '@/components/agenda/AppointmentDrawer';
import NewAppointmentModal from '@/components/agenda/NewAppointmentModal';
import BlockTimeModal from '@/components/agenda/BlockTimeModal';
import RescheduleAppointmentModal from '@/components/agenda/RescheduleAppointmentModal';
import ProfessionalAvailabilityModal from '@/components/agenda/ProfessionalAvailabilityModal.jsx';
import AppointmentWaitlistDrawer from '@/components/agenda/AppointmentWaitlistDrawer.jsx';
import AppointmentWaitlistEntryModal from '@/components/agenda/AppointmentWaitlistEntryModal.jsx';
import AppointmentWaitlistScheduleModal from '@/components/agenda/AppointmentWaitlistScheduleModal.jsx';
import AppointmentWaitlistDismissDialog from '@/components/agenda/AppointmentWaitlistDismissDialog.jsx';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { resolveAppointmentCrmPatient } from '@/lib/crmAgendaLinking.js';
import {
  buildCrmLeadNavigationPath,
  buildCrmPatientNavigationPath,
  getCrmAgendaItemDateParam,
  resolveCrmAgendaAppointmentSearchParam,
  resolveCrmAgendaDateSearchParam,
} from '@/lib/crmAgendaNavigation.js';

const saoPauloDatePartsFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
});

const formatDateInputValue = (date) => {
  const parts = Object.fromEntries(
    saoPauloDatePartsFormatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;

  return `${year}-${month}-${day}`;
};

const getTodayDateInputValue = () => formatDateInputValue(new Date());

const isScheduleItemOnSelectedDate = (item, selectedDate, todayDate) => {
  const itemDate = getCrmAgendaItemDateParam(item);

  if (itemDate) {
    return itemDate === selectedDate;
  }

  return selectedDate === todayDate;
};

const buildVisibleStats = (appointments, fallbackStats) => {
  const confirmadas = appointments.filter((appointment) => (
    appointment.status === STATUSES.CONFIRMADA ||
    appointment.status === STATUSES.FINALIZADA ||
    appointment.status === STATUSES.EM_ATENDIMENTO
  )).length;
  const pendentes = appointments.filter((appointment) => (
    appointment.status === STATUSES.PENDENTE ||
    appointment.status === STATUSES.AGENDADA
  )).length;
  const canceladas = appointments.filter((appointment) => appointment.status === STATUSES.CANCELADA).length;

  return {
    total: appointments.length,
    confirmadas,
    pendentes,
    canceladas,
    ocupacao: fallbackStats.ocupacao,
  };
};

const buildNextAppointmentBadgeLabel = (appointment) => {
  if (!appointment) {
    return 'Livre';
  }

  if (appointment.status === STATUSES.CANCELADA) {
    return 'Cancelada';
  }

  return appointment.time || 'Horário pendente';
};

const AgendaPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccessModule, currentTenantId, hasPermission } = useAuth();
  const canOpenLinkedPatient = canAccessModule('mod_crm') && hasPermission('patients.read');
  const canManageAppointments = hasPermission('appointments.manage');
  const canViewWaitlist = canAccessModule('mod_agenda')
    && canAccessModule('mod_crm')
    && hasPermission('appointments.read')
    && hasPermission('patients.read');
  const canManageWaitlist = canViewWaitlist && canManageAppointments;
  const [view, setView] = useState('day');

  const [filters, setFilters] = useState({
    search: '',
    professional: 'all',
    room: 'all',
    status: 'all'
  });

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isWaitlistEntryModalOpen, setIsWaitlistEntryModalOpen] = useState(false);
  const [isWaitlistScheduleModalOpen, setIsWaitlistScheduleModalOpen] = useState(false);
  const [isWaitlistDismissDialogOpen, setIsWaitlistDismissDialogOpen] = useState(false);

  const {
    appointments: tenantAppointments,
    blocks: tenantBlocks,
    professionalOptions,
    roomOptions,
    statuses,
    stats,
    occupancy,
    professionals,
    rooms,
    availabilityError,
    availabilityInFlightId,
    availabilityLoading,
    availabilityWindows,
    disableException,
    exceptionInFlightId,
    exceptions,
    exceptionsError,
    exceptionsLoading,
    clearSuggestedSlots,
    createAppointment,
    createAppointmentBlock,
    disableAvailabilityWindow,
    loadAvailabilityWindows,
    loadSuggestedSlots,
    refreshSchedule,
    rescheduleAppointment,
    rescheduleInFlightId,
    refreshExceptions,
    saveAvailabilityWindow,
    saveException,
    slotsError,
    slotsLoading,
    suggestedSlots,
    updateAppointmentStatus,
  } = useSchedule();
  const { patients: crmPatients } = usePatients({ enabled: canOpenLinkedPatient });
  const { leads: crmLeads } = usePatientLeads({ enabled: canViewWaitlist });
  const { services: serviceCatalog = [] } = useServicesCatalog();
  const agendaServices = useMemo(() => serviceCatalog.filter((service) => (
    ['Ativo', 'active'].includes(service.status)
    && Boolean(service.useInAgenda ?? service.use_in_agenda)
    && Number(service.duration ?? service.duration_minutes) > 0
  )), [serviceCatalog]);
  const {
    createEntry: createWaitlistEntry,
    dismissEntry: dismissWaitlistEntry,
    entries: waitlistEntries,
    error: waitlistError,
    filters: waitlistFilters,
    loading: waitlistLoading,
    mutationInFlightId: waitlistMutationInFlightId,
    refresh: refreshWaitlist,
    scheduleEntry: scheduleWaitlistEntry,
    selectedEntry: selectedWaitlistEntry,
    setFilters: setWaitlistFilters,
    setSelectedEntry: setSelectedWaitlistEntry,
    updateEntry: updateWaitlistEntry,
  } = useAppointmentWaitlist({ canManage: canManageWaitlist, enabled: canViewWaitlist });
  const [selectedDate, setSelectedDate] = useState(() => (
    resolveCrmAgendaDateSearchParam(searchParams) || getTodayDateInputValue()
  ));
  const requestedAppointmentId = resolveCrmAgendaAppointmentSearchParam(searchParams);

  useEffect(() => {
    setSelectedAppointment(null);
    setIsDrawerOpen(false);
    setIsNewModalOpen(false);
    setIsBlockModalOpen(false);
    setIsRescheduleModalOpen(false);
    setIsAvailabilityModalOpen(false);
    setIsWaitlistOpen(false);
    setIsWaitlistEntryModalOpen(false);
    setIsWaitlistScheduleModalOpen(false);
    setIsWaitlistDismissDialogOpen(false);
    setSelectedWaitlistEntry(null);
    clearSuggestedSlots();
  }, [clearSuggestedSlots, currentTenantId, setSelectedWaitlistEntry]);

  useEffect(() => {
    const nextDate = resolveCrmAgendaDateSearchParam(searchParams) || getTodayDateInputValue();
    setSelectedDate((currentDate) => (currentDate === nextDate ? currentDate : nextDate));
    setView('day');
  }, [searchParams]);

  const todayDate = getTodayDateInputValue();
  const appointmentsForSelectedDate = useMemo(() => {
    return tenantAppointments.filter((appointment) => isScheduleItemOnSelectedDate(appointment, selectedDate, todayDate));
  }, [selectedDate, tenantAppointments, todayDate]);

  const blocksForSelectedDate = useMemo(() => {
    return tenantBlocks.filter((block) => isScheduleItemOnSelectedDate(block, selectedDate, todayDate));
  }, [selectedDate, tenantBlocks, todayDate]);

  const filteredAppointments = useMemo(() => {
    return appointmentsForSelectedDate.filter(app => {
      const matchSearch = filters.search ? app.patient.toLowerCase().includes(filters.search.toLowerCase()) || app.procedure.toLowerCase().includes(filters.search.toLowerCase()) : true;
      const matchProf = filters.professional !== 'all' ? app.professional === filters.professional : true;
      const matchRoom = filters.room !== 'all' ? app.room === filters.room : true;
      const matchStatus = filters.status !== 'all' ? app.status === filters.status : true;
      return matchSearch && matchProf && matchRoom && matchStatus;
    });
  }, [appointmentsForSelectedDate, filters]);

  const visibleStats = useMemo(() => (
    buildVisibleStats(appointmentsForSelectedDate, stats)
  ), [appointmentsForSelectedDate, stats]);
  const nextAppointment = appointmentsForSelectedDate.find(app => app.status !== 'Cancelada') || appointmentsForSelectedDate[0];
  const selectedAppointmentId = selectedAppointment?.id;
  const selectedAppointmentCrmMatch = useMemo(
    () => resolveAppointmentCrmPatient(selectedAppointment, crmPatients),
    [crmPatients, selectedAppointment],
  );

  useEffect(() => {
    if (!selectedAppointmentId) return;

    const stillBelongsToCurrentTenant = tenantAppointments.some(app => app.id === selectedAppointmentId);

    if (!stillBelongsToCurrentTenant) {
      setSelectedAppointment(null);
      setIsDrawerOpen(false);
      setIsRescheduleModalOpen(false);
    }
  }, [selectedAppointmentId, tenantAppointments]);

  useEffect(() => {
    if (!requestedAppointmentId) return;

    const targetAppointment = tenantAppointments.find((appointment) => appointment.id === requestedAppointmentId);

    if (!targetAppointment) return;

    const targetDate = getCrmAgendaItemDateParam(targetAppointment);
    const nextParams = new URLSearchParams(searchParams);

    if (targetDate) {
      setSelectedDate(targetDate);
      nextParams.set('date', targetDate);
    }

    setView('day');
    setSelectedAppointment(targetAppointment);
    setIsDrawerOpen(true);

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [requestedAppointmentId, searchParams, setSearchParams, tenantAppointments]);

  const handleSelectToday = () => {
    const today = getTodayDateInputValue();
    const nextParams = new URLSearchParams(searchParams);

    nextParams.set('date', today);
    nextParams.delete('appointment');
    setSelectedDate(today);
    setView('day');
    setSearchParams(nextParams, { replace: true });
  };

  const handleOpenDrawer = (app) => {
    setSelectedAppointment(app);
    setIsDrawerOpen(true);
  };

  const handleOpenLinkedPatient = (appointment) => {
    if (!canOpenLinkedPatient) {
      toast.error('Acesso ao CRM não disponível para este perfil.');
      return;
    }

    const { patient: matchedPatient } = resolveAppointmentCrmPatient(appointment, crmPatients);

    if (!matchedPatient?.id) {
      toast.error('Consulta sem paciente reconhecido no CRM.');
      return;
    }

    navigate(buildCrmPatientNavigationPath(matchedPatient));
  };

  const handleUpdateAppointmentStatus = async (appointment, status) => {
    if (!appointment?.id) return null;

    try {
      const updatedAppointment = await updateAppointmentStatus(appointment.id, status);

      if (selectedAppointment?.id === appointment.id) {
        setSelectedAppointment(updatedAppointment);
      }

      toast.success('Status da consulta atualizado.');
      return updatedAppointment;
    } catch (error) {
      toast.error(error?.message || 'Não foi possível atualizar a consulta.');
      return null;
    }
  };

  const handleStartAppointment = async (appointment) => {
    const updatedAppointment = await handleUpdateAppointmentStatus(appointment, STATUSES.EM_ATENDIMENTO);

    if (updatedAppointment) {
      handleOpenDrawer(updatedAppointment);
    }
  };

  const handleOpenReschedule = (appointment) => {
    if (!canManageAppointments || !isAppointmentEligibleForRescheduling(appointment)) return;
    setSelectedAppointment(appointment);
    setIsRescheduleModalOpen(true);
  };

  const handleRescheduleAppointment = async (change) => {
    if (!selectedAppointment?.id) {
      throw new Error('Consulta não encontrada.');
    }

    const updatedAppointment = await rescheduleAppointment(selectedAppointment.id, change);
    if (!updatedAppointment?.id) {
      throw new Error('O tenant foi alterado durante o reagendamento. Reabra a consulta e tente novamente.');
    }

    const targetDate = getCrmAgendaItemDateParam(updatedAppointment) || change.date;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('date', targetDate);
    nextParams.set('appointment', updatedAppointment.id);
    setSelectedAppointment(updatedAppointment);
    setSelectedDate(targetDate);
    setView('day');
    setSearchParams(nextParams, { replace: true });
    setIsRescheduleModalOpen(false);
    setIsDrawerOpen(true);
    toast.success('Consulta reagendada com segurança.');
    return updatedAppointment;
  };

  const handleOpenWaitlistCreate = () => {
    if (!canManageWaitlist) return;
    setSelectedWaitlistEntry(null);
    setIsWaitlistEntryModalOpen(true);
  };

  const handleOpenWaitlistEdit = (entry) => {
    if (!canManageWaitlist) return;
    setSelectedWaitlistEntry(entry);
    setIsWaitlistEntryModalOpen(true);
  };

  const handleOpenWaitlistSchedule = (entry) => {
    if (!canManageWaitlist) return;
    setSelectedWaitlistEntry(entry);
    setIsWaitlistScheduleModalOpen(true);
  };

  const handleOpenWaitlistDismiss = (entry) => {
    if (!canManageWaitlist) return;
    setSelectedWaitlistEntry(entry);
    setIsWaitlistDismissDialogOpen(true);
  };

  const handleSaveWaitlistEntry = async (request) => {
    try {
      if (selectedWaitlistEntry?.id) {
        await updateWaitlistEntry(selectedWaitlistEntry.id, request);
        toast.success('Preferências da lista de espera atualizadas.');
      } else {
        await createWaitlistEntry(request);
        toast.success('Entrada adicionada à lista de espera.');
      }
      setIsWaitlistEntryModalOpen(false);
      setSelectedWaitlistEntry(null);
    } catch (error) {
      toast.error(error?.message || 'Não foi possível salvar a entrada.');
    }
  };

  const handleDismissWaitlistEntry = async (request) => {
    if (!selectedWaitlistEntry?.id) return;
    try {
      await dismissWaitlistEntry(selectedWaitlistEntry.id, request);
      setIsWaitlistDismissDialogOpen(false);
      setSelectedWaitlistEntry(null);
      toast.success('Entrada dispensada; o histórico foi preservado.');
    } catch (error) {
      toast.error(error?.message || 'Não foi possível dispensar a entrada.');
    }
  };

  const handleScheduleWaitlistEntry = async (request) => {
    if (!selectedWaitlistEntry?.id) throw new Error('Entrada da lista de espera não encontrada.');

    try {
      const result = await scheduleWaitlistEntry(selectedWaitlistEntry.id, request);
      if (result?.staleTenant) throw new Error('A clínica ativa foi alterada. Reabra a lista e tente novamente.');

      const nextSchedule = await refreshSchedule();
      const appointmentId = result?.appointment?.id;
      const createdAppointment = nextSchedule?.appointments?.find((appointment) => appointment.id === appointmentId);
      const targetDate = getCrmAgendaItemDateParam(createdAppointment || result?.appointment);
      if (!appointmentId || !targetDate) throw new Error('A consulta foi criada, mas não pôde ser aberta na Agenda. Atualize a página.');

      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('date', targetDate);
      nextParams.set('appointment', appointmentId);
      setSelectedDate(targetDate);
      setView('day');
      setSearchParams(nextParams, { replace: true });
      setIsWaitlistScheduleModalOpen(false);
      setIsWaitlistOpen(false);
      setSelectedWaitlistEntry(null);
      if (createdAppointment) {
        setSelectedAppointment(createdAppointment);
        setIsDrawerOpen(true);
      }
      toast.success('Consulta criada e entrada encerrada com segurança.');
      return result;
    } catch (error) {
      toast.error(error?.message || 'Não foi possível agendar pela lista de espera.');
      throw error;
    }
  };

  const handleOpenWaitlistCrm = (entry) => {
    if (!canOpenLinkedPatient) {
      toast.error('Acesso ao CRM não disponível para este perfil.');
      return;
    }
    if (entry.sourceType === 'patient') {
      navigate(buildCrmPatientNavigationPath(entry.sourceId));
      return;
    }
    navigate(buildCrmLeadNavigationPath(entry.sourceId));
  };

  const statCards = [
    { icon: Calendar, label: selectedDate === todayDate ? 'Consultas hoje' : 'Consultas no dia', value: visibleStats.total, color: 'text-primary bg-primary/10' },
    { icon: CheckCircle, label: 'Confirmadas', value: visibleStats.confirmadas, color: 'text-green-600 bg-green-100' },
    { icon: Clock, label: 'Pendentes', value: visibleStats.pendentes, color: 'text-yellow-600 bg-yellow-100' },
    { icon: XCircle, label: 'Canceladas/Faltas', value: visibleStats.canceladas, color: 'text-red-600 bg-red-100' },
    { icon: Activity, label: 'Ocupação Média', value: `${visibleStats.ocupacao}%`, color: 'text-purple-600 bg-purple-100' }
  ];

  return (
    <>
      <Helmet>
        <title>Agenda Inteligente | SorriSync</title>
      </Helmet>

      <Layout>
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-1">
              Agenda Inteligente
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Visualize horários, confirme consultas e organize múltiplos profissionais.
            </p>
          </motion.div>
          {(canManageAppointments || canViewWaitlist) && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap gap-3">
              {canViewWaitlist && (
                <Button variant="outline" onClick={() => { setIsWaitlistOpen(true); refreshWaitlist().catch(() => {}); }} className="shadow-sm bg-card hover:bg-muted">
                  <ClipboardList className="w-4 h-4 mr-2" /> Lista de espera
                </Button>
              )}
              {canManageAppointments && (
                <>
                  <Button variant="outline" onClick={() => setIsAvailabilityModalOpen(true)} className="shadow-sm bg-card hover:bg-muted">
                    <SlidersHorizontal className="w-4 h-4 mr-2" /> Disponibilidade
                  </Button>
                  <Button variant="outline" onClick={() => setIsBlockModalOpen(true)} className="shadow-sm bg-card hover:bg-muted text-destructive hover:text-destructive border-destructive/20">
                    <Ban className="w-4 h-4 mr-2" /> Bloquear Horário
                  </Button>
                  <Button onClick={() => setIsNewModalOpen(true)} className="shadow-premium group">
                    <Plus className="w-4 h-4 mr-2" /> Nova Consulta
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 mb-8">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800/90 leading-relaxed">
              Confirmações automáticas e sincronização externa não estão ativas; a rotina usa status operacional, bloqueios e cadastro do CRM.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6"
        >
          {statCards.map((card, idx) => (
            <Card key={idx} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`p-2.5 rounded-xl ${card.color} mb-3`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-foreground leading-none mb-1">{card.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-6 bg-card border border-border/50 rounded-xl p-4 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center"
        >
          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto flex-1">
            <div className="relative min-w-[200px] flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                className="pl-9 bg-background h-9"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <Select value={filters.professional} onValueChange={v => setFilters({...filters, professional: v})}>
              <SelectTrigger className="w-[160px] h-9 bg-background">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos profissionais</SelectItem>
                {professionalOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
              <SelectTrigger className="w-[160px] h-9 bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-9" onClick={handleSelectToday}>Hoje</Button>
          </div>

          <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 w-full sm:w-auto">
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('day')}
              className={`flex-1 sm:flex-none ${view === 'day' ? 'shadow-sm' : ''}`}
            >
              <CalendarDays className="w-4 h-4 mr-2" /> Dia
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('week')}
              className={`flex-1 sm:flex-none ${view === 'week' ? 'shadow-sm' : ''}`}
            >
              <CalendarRange className="w-4 h-4 mr-2" /> Semana
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className={`flex-1 sm:flex-none ${view === 'list' ? 'shadow-sm' : ''}`}
            >
              <LayoutList className="w-4 h-4 mr-2" /> Lista
            </Button>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6 items-start mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="lg:col-span-3 order-2 lg:order-1"
          >
            {view === 'day' && <DayCalendarView appointments={filteredAppointments} blocks={blocksForSelectedDate} professionals={professionalOptions} selectedDate={selectedDate} onOpenDrawer={handleOpenDrawer} />}
            {view === 'week' && <WeekCalendarView appointments={filteredAppointments} onOpenDrawer={handleOpenDrawer} />}
            {view === 'list' && <AppointmentListView appointments={filteredAppointments} onOpenDrawer={handleOpenDrawer} onUpdateStatus={handleUpdateAppointmentStatus} />}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-6 order-1 lg:order-2"
          >
            <Card className="border-border/50 shadow-sm bg-gradient-to-br from-primary/10 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Próxima Consulta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-card p-3 rounded-lg border border-border/50 shadow-sm">
                  <p className="font-semibold text-foreground mb-0.5">{nextAppointment?.patient || 'Agenda livre'}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {nextAppointment ? `${nextAppointment.procedure} - ${nextAppointment.professional}` : 'Sem consulta destacada'}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0">{buildNextAppointmentBadgeLabel(nextAppointment)}</Badge>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" disabled={!nextAppointment} onClick={() => nextAppointment && handleStartAppointment(nextAppointment)}>
                      Iniciar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" /> Disponibilidade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {occupancy.map((occ, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center text-sm mb-1.5">
                      <span className="font-medium text-foreground">{occ.professional}</span>
                      <span className="text-muted-foreground">{occ.value}% ocupado</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${occ.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" /> Alertas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs font-semibold text-red-800">Urgência Solicitada</p>
                  <p className="text-xs text-red-700 mt-0.5">Paciente aguardando encaixe na recepção.</p>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <p className="text-xs font-semibold text-yellow-800">2 Retornos Pendentes</p>
                  <p className="text-xs text-yellow-700 mt-0.5">Pacientes aguardam contato manual da recepção.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <AppointmentDrawer
          appointment={selectedAppointment}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onConfirm={(appointment) => handleUpdateAppointmentStatus(appointment, STATUSES.CONFIRMADA)}
          onCancel={(appointment) => handleUpdateAppointmentStatus(appointment, STATUSES.CANCELADA)}
          onOpenPatient={handleOpenLinkedPatient}
          canOpenPatient={canOpenLinkedPatient}
          linkedPatientId={selectedAppointmentCrmMatch.patient?.id || ''}
          linkedPatientSource={selectedAppointmentCrmMatch.source}
          canReschedule={canManageAppointments && isAppointmentEligibleForRescheduling(selectedAppointment)}
          onReschedule={handleOpenReschedule}
        />

        <RescheduleAppointmentModal
          appointment={selectedAppointment}
          isOpen={isRescheduleModalOpen}
          isSaving={rescheduleInFlightId === selectedAppointment?.id}
          onClose={() => setIsRescheduleModalOpen(false)}
          onSave={handleRescheduleAppointment}
          professionals={professionals}
          rooms={rooms}
          clearSuggestedSlots={clearSuggestedSlots}
          loadSuggestedSlots={loadSuggestedSlots}
          slots={suggestedSlots}
          slotsError={slotsError}
          slotsLoading={slotsLoading}
        />

        <NewAppointmentModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onSave={createAppointment}
          professionals={professionalOptions}
          professionalResources={professionals}
          rooms={roomOptions}
          roomResources={rooms}
          statuses={statuses}
          clearSuggestedSlots={clearSuggestedSlots}
          loadSuggestedSlots={loadSuggestedSlots}
          slots={suggestedSlots}
          slotsError={slotsError}
          slotsLoading={slotsLoading}
        />

        <BlockTimeModal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          onSave={createAppointmentBlock}
          professionals={professionalOptions}
          rooms={roomOptions}
        />

        <ProfessionalAvailabilityModal
          availabilityError={availabilityError}
          availabilityInFlightId={availabilityInFlightId}
          availabilityLoading={availabilityLoading}
          canManage={canManageAppointments}
          disableAvailabilityWindow={disableAvailabilityWindow}
          disableException={disableException}
          exceptionInFlightId={exceptionInFlightId}
          exceptions={exceptions}
          exceptionsError={exceptionsError}
          exceptionsLoading={exceptionsLoading}
          isOpen={isAvailabilityModalOpen}
          loadAvailabilityWindows={loadAvailabilityWindows}
          onClose={() => setIsAvailabilityModalOpen(false)}
          professionals={professionals}
          refreshExceptions={refreshExceptions}
          saveAvailabilityWindow={saveAvailabilityWindow}
          saveException={saveException}
          windows={availabilityWindows}
        />

        <AppointmentWaitlistDrawer
          canManage={canManageWaitlist}
          entries={waitlistEntries}
          error={waitlistError}
          filters={waitlistFilters}
          isOpen={isWaitlistOpen}
          loading={waitlistLoading}
          onAdd={handleOpenWaitlistCreate}
          onClose={() => setIsWaitlistOpen(false)}
          onDismiss={handleOpenWaitlistDismiss}
          onEdit={handleOpenWaitlistEdit}
          onOpenCrm={handleOpenWaitlistCrm}
          onSchedule={handleOpenWaitlistSchedule}
          onUpdateFilters={setWaitlistFilters}
          services={agendaServices}
        />

        <AppointmentWaitlistEntryModal
          entry={selectedWaitlistEntry}
          isOpen={isWaitlistEntryModalOpen}
          isSaving={Boolean(waitlistMutationInFlightId)}
          leads={crmLeads}
          onClose={() => { setIsWaitlistEntryModalOpen(false); setSelectedWaitlistEntry(null); }}
          onSave={handleSaveWaitlistEntry}
          patients={crmPatients}
          professionals={professionals}
          services={agendaServices}
        />

        <AppointmentWaitlistScheduleModal
          clearSuggestedSlots={clearSuggestedSlots}
          entry={selectedWaitlistEntry}
          isOpen={isWaitlistScheduleModalOpen}
          isSaving={waitlistMutationInFlightId === selectedWaitlistEntry?.id}
          loadSuggestedSlots={loadSuggestedSlots}
          onClose={() => { setIsWaitlistScheduleModalOpen(false); setSelectedWaitlistEntry(null); }}
          onSchedule={handleScheduleWaitlistEntry}
          professionals={professionals}
          rooms={rooms}
          slots={suggestedSlots}
          slotsError={slotsError}
          slotsLoading={slotsLoading}
        />

        <AppointmentWaitlistDismissDialog
          entry={selectedWaitlistEntry}
          isOpen={isWaitlistDismissDialogOpen}
          isSaving={waitlistMutationInFlightId === selectedWaitlistEntry?.id}
          onClose={() => { setIsWaitlistDismissDialogOpen(false); setSelectedWaitlistEntry(null); }}
          onDismiss={handleDismissWaitlistEntry}
        />

      </Layout>
    </>
  );
};

export default AgendaPage;
