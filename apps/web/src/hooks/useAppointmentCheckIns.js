import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  checkInAppointment,
  fetchAppointmentCheckInsByTenantAndAppointments,
  revertAppointmentCheckIn,
} from '@/repositories/index.js';

const createEmptyState = (tenantId) => ({
  error: '',
  feedback: '',
  items: [],
  loading: false,
  source: 'unavailable',
  tenantId,
});

export const useAppointmentCheckIns = ({
  appointments = [],
  canManage = false,
  enabled = true,
} = {}) => {
  const { currentTenantId } = useAuth();
  const appointmentKey = useMemo(() => (
    [...new Set(appointments.map((appointment) => appointment?.id).filter(Boolean))]
      .sort()
      .join(',')
  ), [appointments]);
  const activeTenantIdRef = useRef(currentTenantId);
  const requestSequenceRef = useRef(0);
  const inFlightAppointmentIdsRef = useRef(new Set());
  const [busyAppointmentIds, setBusyAppointmentIds] = useState([]);
  const [state, setState] = useState(() => createEmptyState(currentTenantId));

  const loadAppointmentCheckIns = useCallback(async () => {
    const tenantId = currentTenantId;
    const requestSequence = ++requestSequenceRef.current;
    const appointmentIds = appointmentKey ? appointmentKey.split(',') : [];
    activeTenantIdRef.current = tenantId;

    if (!enabled || !tenantId) {
      setState(createEmptyState(tenantId));
      return { items: [], source: 'unavailable' };
    }

    setState((current) => ({
      ...current,
      error: '',
      items: current.tenantId === tenantId ? current.items : [],
      loading: true,
      tenantId,
    }));

    try {
      const result = await fetchAppointmentCheckInsByTenantAndAppointments(tenantId, appointmentIds);

      if (
        activeTenantIdRef.current !== tenantId
        || requestSequenceRef.current !== requestSequence
      ) {
        return { ...result, staleTenant: true };
      }

      setState((current) => ({
        ...current,
        error: '',
        items: result.items || [],
        loading: false,
        source: result.source || 'unavailable',
        tenantId,
      }));

      return result;
    } catch (error) {
      if (
        activeTenantIdRef.current === tenantId
        && requestSequenceRef.current === requestSequence
      ) {
        setState((current) => ({
          ...current,
          error: error?.message || 'Não foi possível carregar os check-ins.',
          items: [],
          loading: false,
          source: 'error',
          tenantId,
        }));
      }

      throw error;
    }
  }, [appointmentKey, currentTenantId, enabled]);

  useEffect(() => {
    activeTenantIdRef.current = currentTenantId;
    requestSequenceRef.current += 1;
    inFlightAppointmentIdsRef.current.clear();
    setBusyAppointmentIds([]);
    setState(createEmptyState(currentTenantId));

    loadAppointmentCheckIns().catch(() => {});

    return () => {
      requestSequenceRef.current += 1;
    };
  }, [currentTenantId, loadAppointmentCheckIns]);

  const runMutation = useCallback(async (appointmentId, mutation) => {
    const tenantId = currentTenantId;

    if (!canManage) {
      throw new Error('Seu perfil possui acesso somente para leitura.');
    }
    if (!tenantId) {
      throw new Error('Clínica ativa não identificada para atualizar o check-in.');
    }
    if (!appointmentId) {
      throw new Error('Consulta sem identificador operacional da Agenda.');
    }
    if (inFlightAppointmentIdsRef.current.has(appointmentId)) {
      throw new Error('Já existe uma ação de check-in em andamento para esta consulta.');
    }

    inFlightAppointmentIdsRef.current.add(appointmentId);
    setBusyAppointmentIds([...inFlightAppointmentIdsRef.current]);
    setState((current) => ({ ...current, error: '', feedback: '' }));

    try {
      const result = await mutation(tenantId);
      if (activeTenantIdRef.current !== tenantId) return { ...result, staleTenant: true };

      setState((current) => ({
        ...current,
        feedback: result.replayed
          ? 'A operação já estava registrada e foi mantida sem duplicação.'
          : 'Check-in atualizado com sucesso.',
      }));
      await loadAppointmentCheckIns();
      return result;
    } catch (error) {
      if (activeTenantIdRef.current !== tenantId) {
        return { staleTenant: true };
      }

      setState((current) => ({
        ...current,
        error: error?.message || 'Não foi possível atualizar o check-in.',
      }));
      throw error;
    } finally {
      inFlightAppointmentIdsRef.current.delete(appointmentId);
      if (activeTenantIdRef.current === tenantId) {
        setBusyAppointmentIds([...inFlightAppointmentIdsRef.current]);
      }
    }
  }, [canManage, currentTenantId, loadAppointmentCheckIns]);

  const registerArrival = useCallback((appointmentId) => (
    runMutation(appointmentId, (tenantId) => checkInAppointment(tenantId, appointmentId))
  ), [runMutation]);

  const revertArrival = useCallback((appointmentId, checkInId, reasonCode) => (
    runMutation(
      appointmentId,
      (tenantId) => revertAppointmentCheckIn(tenantId, checkInId, reasonCode),
    )
  ), [runMutation]);

  return {
    ...state,
    busyAppointmentIds,
    isAppointmentCheckInBusy: (appointmentId) => busyAppointmentIds.includes(appointmentId),
    refreshAppointmentCheckIns: loadAppointmentCheckIns,
    registerArrival,
    revertArrival,
  };
};
