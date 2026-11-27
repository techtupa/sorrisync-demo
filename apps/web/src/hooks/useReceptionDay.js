import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { usePatients } from '@/hooks/usePatients.js';
import { useSchedule } from '@/hooks/useSchedule.js';
import { useAppointmentCheckIns } from '@/hooks/useAppointmentCheckIns.js';
import {
  buildReceptionDayModel,
  formatReceptionDateKeyInSaoPaulo,
} from '@/hooks/receptionDayReadModel.js';

export const useReceptionDay = ({ todayKey = formatReceptionDateKeyInSaoPaulo() } = {}) => {
  const { canAccessModule, hasPermission } = useAuth();
  const canReadCrm = canAccessModule('mod_crm') && hasPermission('patients.read');
  const canManageCrm = canReadCrm && hasPermission('patients.manage');
  const canReadCheckIns = canAccessModule('mod_agenda') && hasPermission('appointments.read');
  const canManageStatus = canAccessModule('mod_agenda') && hasPermission('appointments.manage');
  const scheduleState = useSchedule({ enabled: true }) || {};
  const patientsState = usePatients({ enabled: canReadCrm }) || {};
  const checkInState = useAppointmentCheckIns({
    appointments: scheduleState.appointments || [],
    canManage: canManageStatus,
    enabled: canReadCheckIns,
  });

  const model = useMemo(() => buildReceptionDayModel({
    appointments: scheduleState.appointments || [],
    blocks: scheduleState.blocks || [],
    checkIns: checkInState.items || [],
    patients: patientsState.patients || [],
    todayKey,
  }), [
    checkInState.items,
    patientsState.patients,
    scheduleState.appointments,
    scheduleState.blocks,
    todayKey,
  ]);

  return {
    ...model,
    canManageCheckIns: canManageStatus,
    canManageCrm,
    canManageStatus,
    canReadCrm,
    checkInError: checkInState.error,
    checkInFeedback: checkInState.feedback,
    checkInSourceLabel: checkInState.source === 'supabase'
      ? 'Supabase'
      : checkInState.source === 'mock'
        ? 'Fallback demo'
        : checkInState.source === 'error'
          ? 'Indisponível'
          : 'Sem leitura',
    isAppointmentCheckInBusy: checkInState.isAppointmentCheckInBusy,
    loading: Boolean(
      scheduleState.loading
      || checkInState.loading
      || (canReadCrm && patientsState.loading)
    ),
    registerArrival: checkInState.registerArrival,
    revertArrival: checkInState.revertArrival,
    refreshSchedule: scheduleState.refreshSchedule,
    updatePatient: patientsState.updatePatient,
    updateAppointmentStatus: scheduleState.updateAppointmentStatus,
  };
};
