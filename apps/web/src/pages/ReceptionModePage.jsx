import HandoffCard from '@/portfolio/HandoffCard.jsx';
import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReceptionModePageHeader from '@/components/reception/ReceptionModePageHeader.jsx';
import ReceptionModeQueueTab from '@/components/reception/ReceptionModeQueueTab.jsx';
import ReceptionModeSummaryCards from '@/components/reception/ReceptionModeSummaryCards.jsx';
import ReceptionModeTodayTab from '@/components/reception/ReceptionModeTodayTab.jsx';
import ClinicalProtocolToScheduleTab from '@/components/reception/ClinicalProtocolToScheduleTab.jsx';
import RevertAppointmentCheckInDialog from '@/components/reception/RevertAppointmentCheckInDialog.jsx';
import { usePatientInteractions } from '@/hooks/usePatientInteractions.js';
import { useReceptionDay } from '@/hooks/useReceptionDay.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { resolveReceptionStatusUpdateRequest } from '@/hooks/receptionDayReadModel.js';
import {
  buildCrmAgendaNavigationPath,
  buildCrmPatientNavigationPath,
} from '@/lib/crmAgendaNavigation.js';

const formatReceptionDayLabel = (todayKey) => {
  if (!todayKey) return '';

  const date = new Date(`${todayKey}T12:00:00-03:00`);

  if (Number.isNaN(date.getTime())) {
    return todayKey;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
};

const buildAgendaDayPath = (todayKey) => {
  const params = new URLSearchParams();

  if (todayKey) {
    params.set('date', todayKey);
  }

  const query = params.toString();
  return query ? `/agenda?${query}` : '/agenda';
};

const ReceptionModePage = () => {
  const { currentTenant, isSupabaseMode, hasPermission } = useAuth();
  const canSeeProtocolQueue = isSupabaseMode && currentTenant?.slug === 'tenant_harbor'
    && hasPermission('treatment_protocols.schedule') && hasPermission('appointments.manage');
  const navigate = useNavigate();
  const [statusUpdateInFlightId, setStatusUpdateInFlightId] = useState('');
  const [postAttendanceInFlightId, setPostAttendanceInFlightId] = useState('');
  const [appointmentToRevert, setAppointmentToRevert] = useState(null);
  const {
    attentionItems,
    blocks,
    canManageCheckIns,
    canManageCrm,
    canManageStatus,
    canReadCrm,
    checkInError,
    checkInSourceLabel,
    dayFlow,
    isAppointmentCheckInBusy,
    loading,
    metrics,
    preparationItems,
    queue,
    registerArrival,
    resourceMap,
    revertArrival,
    sourceLabel,
    todayKey,
    updateAppointmentStatus,
    updatePatient,
  } = useReceptionDay();

  useEffect(() => {
    if (!appointmentToRevert?.appointmentId) return;

    const stillAvailable = queue.some((appointment) => (
      appointment.appointmentId === appointmentToRevert.appointmentId
      && appointment.checkInId === appointmentToRevert.checkInId
    ));

    if (!stillAvailable) setAppointmentToRevert(null);
  }, [appointmentToRevert, queue]);
  const { recordPatientInteraction } = usePatientInteractions();
  const todayLabel = useMemo(() => formatReceptionDayLabel(todayKey), [todayKey]);

  const handleOpenAgenda = (appointment) => {
    if (appointment?.appointmentId) {
      navigate(buildCrmAgendaNavigationPath({
        id: appointment.appointmentId,
        date: appointment.dateKey,
        starts_at: appointment.startsAt,
        time: appointment.time,
      }));
      return;
    }

    navigate(buildAgendaDayPath(todayKey));
  };

  const handleOpenCrm = () => {
    if (!canReadCrm) {
      toast.error('Acesso ao CRM não disponível para este perfil.');
      return;
    }

    navigate('/pacientes');
  };

  const handleOpenPatient = (appointment) => {
    if (!canReadCrm) {
      toast.error('Acesso ao CRM não disponível para este perfil.');
      return;
    }

    if (!appointment?.linkedPatientId) {
      toast.error('Consulta sem paciente reconhecido no CRM.');
      return;
    }

    navigate(buildCrmPatientNavigationPath(appointment.linkedPatientId));
  };

  const handleUpdateStatus = async (appointment, nextStatus) => {
    if (!canManageStatus) {
      toast.error('Perfil sem permissão para alterar status da Agenda.');
      return;
    }

    const statusUpdateKey = appointment?.appointmentId || appointment?.id || '';

    if (statusUpdateKey && statusUpdateInFlightId === statusUpdateKey) {
      toast.error('Atualização de status já está em andamento para esta consulta.');
      return;
    }

    const statusUpdateRequest = resolveReceptionStatusUpdateRequest(appointment, nextStatus);

    if (!statusUpdateRequest.canUpdateStatus) {
      toast.error(statusUpdateRequest.statusUpdateBlockedReason);
      return;
    }

    if (!appointment?.appointmentId) {
      toast.error('Consulta sem identificador operacional da Agenda.');
      return;
    }

    if (!updateAppointmentStatus) {
      toast.error('Atualização da Agenda indisponível neste momento.');
      return;
    }

    setStatusUpdateInFlightId(statusUpdateKey);

    try {
      await updateAppointmentStatus(appointment.appointmentId, statusUpdateRequest.nextStatus);
      toast.success('Status atualizado pela Agenda.');
    } catch (error) {
      toast.error(error?.message || 'Não foi possível atualizar o status da consulta.');
    } finally {
      setStatusUpdateInFlightId((currentStatusUpdateId) => (
        currentStatusUpdateId === statusUpdateKey ? '' : currentStatusUpdateId
      ));
    }
  };

  const handleRegisterArrival = async (appointment) => {
    if (!canManageCheckIns) {
      toast.error('Perfil sem permissão para registrar chegada.');
      return null;
    }

    if (!appointment?.canRegisterCheckIn) {
      toast.error(appointment?.checkInBlockedReason || 'Check-in indisponível para esta consulta.');
      return null;
    }

    try {
      const result = await registerArrival(appointment.appointmentId);
      if (result?.staleTenant) return null;
      toast.success(result?.replayed
        ? 'A chegada já estava registrada; nenhuma duplicação foi criada.'
        : 'Arrival recorded.');
      return result;
    } catch (error) {
      toast.error(error?.message || 'Não foi possível registrar a chegada.');
      return null;
    }
  };

  const handleConfirmReversal = async (appointment, reasonCode) => {
    if (!canManageCheckIns) {
      toast.error('Perfil sem permissão para reverter check-in.');
      return null;
    }

    if (!appointment?.hasActiveCheckIn || !appointment?.checkInId) {
      toast.error('Não existe check-in ativo para reverter.');
      return null;
    }

    try {
      const result = await revertArrival(
        appointment.appointmentId,
        appointment.checkInId,
        reasonCode,
      );
      if (result?.staleTenant) return null;
      toast.success(result?.replayed
        ? 'O check-in já estava revertido.'
        : 'Check-in revertido sem alterar o status da consulta.');
      setAppointmentToRevert(null);
      return result;
    } catch (error) {
      toast.error(error?.message || 'Não foi possível reverter o check-in.');
      return null;
    }
  };

  const handleRecordPostAttendance = async (appointment, formData = {}) => {
    if (!canManageCrm) {
      toast.error('Perfil sem permissão para registrar pós-atendimento no CRM.');
      return null;
    }

    if (!appointment?.hasRealPatientLink || !appointment?.patientId) {
      toast.error('Registro disponível apenas para consulta com patient_id vinculado ao CRM.');
      return null;
    }

    if (!updatePatient) {
      toast.error('Atualização do paciente indisponível neste momento.');
      return null;
    }

    const postAttendanceKey = appointment.appointmentId || appointment.id || '';

    if (postAttendanceKey && postAttendanceInFlightId === postAttendanceKey) {
      toast.error('Registro de pós-atendimento já está em andamento para esta consulta.');
      return null;
    }

    const occurredAt = new Date().toISOString();

    setPostAttendanceInFlightId(postAttendanceKey);

    try {
      await recordPatientInteraction(appointment.patientId, {
        title: 'Pós-atendimento operacional',
        description: formData.note,
        nextAction: formData.nextAction,
        channel: 'Recepção',
        occurredAt,
        appointmentLink: 'patient_id',
      });

      const updatedPatient = await updatePatient(appointment.patientId, {
        nextAction: formData.nextAction,
        lastInteraction: occurredAt,
      });

      toast.success('Pós-atendimento registrado no CRM.');
      return updatedPatient;
    } catch (error) {
      toast.error(error?.message || 'Não foi possível registrar o pós-atendimento.');
      return null;
    } finally {
      setPostAttendanceInFlightId((currentPostAttendanceId) => (
        currentPostAttendanceId === postAttendanceKey ? '' : currentPostAttendanceId
      ));
    }
  };

  return (
    <>
      <Helmet>
        <title>Modo Recepção | SorriSync</title>
      </Helmet>

      <Layout>
        <ReceptionModePageHeader
          canOpenCrm={canReadCrm}
          onOpenAgenda={() => handleOpenAgenda()}
          onOpenCrm={handleOpenCrm}
          sourceLabel={sourceLabel}
          todayLabel={todayLabel}
        />

        <HandoffCard review />

        <ReceptionModeSummaryCards metrics={metrics} sourceLabel={sourceLabel} />

        <Tabs defaultValue="hoje" className="w-full mb-12">
          <TabsList className="w-full justify-start bg-muted/50 p-1 h-12 overflow-x-auto custom-scrollbar mb-8">
            <TabsTrigger value="hoje" className="text-sm px-4 py-2">Hoje</TabsTrigger>
            <TabsTrigger value="fila" className="text-sm px-4 py-2">Fila do dia</TabsTrigger>
            {canSeeProtocolQueue && <TabsTrigger value="a-agendar" className="text-sm px-4 py-2">A agendar</TabsTrigger>}
          </TabsList>

          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
            <TabsContent value="hoje" className="outline-none m-0">
              <ReceptionModeTodayTab
                attentionItems={attentionItems}
                blocks={blocks}
                canManageCheckIns={canManageCheckIns}
                canManageStatus={canManageStatus}
                canReadCrm={canReadCrm}
                checkInError={checkInError}
                checkInSourceLabel={checkInSourceLabel}
                dayFlow={dayFlow}
                isAppointmentCheckInBusy={isAppointmentCheckInBusy}
                loading={loading}
                onRegisterArrival={handleRegisterArrival}
                onOpenAgenda={handleOpenAgenda}
                onOpenPatient={handleOpenPatient}
                onRequestCheckInReversal={setAppointmentToRevert}
                onUpdateStatus={handleUpdateStatus}
                preparationItems={preparationItems}
                queue={queue}
                resourceMap={resourceMap}
                sourceLabel={sourceLabel}
                statusUpdateInFlightId={statusUpdateInFlightId}
              />
            </TabsContent>
            <TabsContent value="fila" className="outline-none m-0">
              <ReceptionModeQueueTab
                canManageCheckIns={canManageCheckIns}
                canManageCrm={canManageCrm}
                canManageStatus={canManageStatus}
                canReadCrm={canReadCrm}
                isAppointmentCheckInBusy={isAppointmentCheckInBusy}
                onOpenAgenda={handleOpenAgenda}
                onOpenPatient={handleOpenPatient}
                onRegisterArrival={handleRegisterArrival}
                onRecordPostAttendance={handleRecordPostAttendance}
                onRequestCheckInReversal={setAppointmentToRevert}
                onUpdateStatus={handleUpdateStatus}
                postAttendanceInFlightId={postAttendanceInFlightId}
                queue={queue}
                statusUpdateInFlightId={statusUpdateInFlightId}
              />
            </TabsContent>
            {canSeeProtocolQueue && <TabsContent value="a-agendar" className="outline-none m-0"><ClinicalProtocolToScheduleTab /></TabsContent>}
          </motion.div>
        </Tabs>
      </Layout>

      <RevertAppointmentCheckInDialog
        appointment={appointmentToRevert}
        isOpen={Boolean(appointmentToRevert)}
        isSaving={Boolean(
          appointmentToRevert?.appointmentId
          && isAppointmentCheckInBusy(appointmentToRevert.appointmentId)
        )}
        onClose={() => setAppointmentToRevert(null)}
        onConfirm={handleConfirmReversal}
      />
    </>
  );
};

export default ReceptionModePage;
