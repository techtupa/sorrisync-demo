import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  createAppointmentBlockByTenant,
  createAppointmentByTenant,
  disableProfessionalAvailabilityWindowByTenant,
  disableProfessionalAvailabilityExceptionByTenant,
  fetchScheduleByTenant,
  getScheduleByTenant,
  listAvailableAppointmentSlotsByTenant,
  listProfessionalAvailabilityWindowsByTenant,
  listProfessionalAvailabilityExceptionsByTenant,
  rescheduleAppointmentByTenant,
  saveProfessionalAvailabilityWindowByTenant,
  saveProfessionalAvailabilityExceptionByTenant,
  updateAppointmentStatusByTenant,
} from '@/repositories/index.js';

const EMPTY_SCHEDULE = {
  appointments: [],
  blocks: [],
  professionals: [],
  professionalOptions: [],
  rooms: [],
  roomOptions: [],
  statuses: [],
  stats: {
    total: 0,
    confirmadas: 0,
    pendentes: 0,
    canceladas: 0,
    ocupacao: 0,
  },
  occupancy: [],
};

export const useSchedule = ({ enabled = true } = {}) => {
  // Tenant isolation anchor retained from the frozen contract: const { currentTenantId } = useAuth()
  const { currentTenant, currentTenantId } = useAuth();
  const [state, setState] = useState(() => ({
    tenantId: currentTenantId,
    schedule: enabled ? getScheduleByTenant(currentTenantId) : EMPTY_SCHEDULE,
  }));
  const [loading, setLoading] = useState(false);
  const [rescheduleInFlightId, setRescheduleInFlightId] = useState('');
  const [rescheduleError, setRescheduleError] = useState('');
  const [availabilityWindows, setAvailabilityWindows] = useState([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilityInFlightId, setAvailabilityInFlightId] = useState('');
  const [exceptions, setExceptions] = useState([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [exceptionsError, setExceptionsError] = useState('');
  const [exceptionInFlightId, setExceptionInFlightId] = useState('');
  const [suggestedSlots, setSuggestedSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const rescheduleInFlightIdsRef = useRef(new Set());
  const availabilityInFlightIdsRef = useRef(new Set());
  const exceptionInFlightIdsRef = useRef(new Set());
  const exceptionRequestIdRef = useRef(0);
  const slotRequestIdRef = useRef(0);
  const activeTenantIdRef = useRef(currentTenantId);
  const fallbackSchedule = enabled ? getScheduleByTenant(currentTenantId) : EMPTY_SCHEDULE;
  const schedule = enabled
    ? (state.tenantId === currentTenantId ? state.schedule : fallbackSchedule)
    : EMPTY_SCHEDULE;

  const refreshSchedule = useCallback(async () => {
    if (!enabled) {
      setState({
        tenantId: currentTenantId,
        schedule: EMPTY_SCHEDULE,
      });

      return EMPTY_SCHEDULE;
    }

    const nextSchedule = await fetchScheduleByTenant(currentTenantId);

    setState({
      tenantId: currentTenantId,
      schedule: nextSchedule || getScheduleByTenant(currentTenantId),
    });

    return nextSchedule;
  }, [currentTenantId, enabled]);

  useEffect(() => {
    activeTenantIdRef.current = currentTenantId;
    rescheduleInFlightIdsRef.current.clear();
    setRescheduleInFlightId('');
    setRescheduleError('');
    availabilityInFlightIdsRef.current.clear();
    exceptionInFlightIdsRef.current.clear();
    exceptionRequestIdRef.current += 1;
    slotRequestIdRef.current += 1;
    setAvailabilityWindows([]);
    setAvailabilityLoading(false);
    setAvailabilityError('');
    setAvailabilityInFlightId('');
    setExceptions([]);
    setExceptionsLoading(false);
    setExceptionsError('');
    setExceptionInFlightId('');
    setSuggestedSlots([]);
    setSlotsLoading(false);
    setSlotsError('');
  }, [currentTenantId]);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({
        tenantId: currentTenantId,
        schedule: EMPTY_SCHEDULE,
      });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setState({
      tenantId: currentTenantId,
      schedule: getScheduleByTenant(currentTenantId),
    });
    setLoading(true);

    fetchScheduleByTenant(currentTenantId)
      .then((nextSchedule) => {
        if (active && nextSchedule) {
          setState({
            tenantId: currentTenantId,
            schedule: nextSchedule,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState({
            tenantId: currentTenantId,
            schedule: getScheduleByTenant(currentTenantId),
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentTenantId, enabled]);

  const createAppointment = useCallback(async (appointment) => {
    if (!enabled) {
      throw new Error('Agenda indisponível para este perfil.');
    }

    const createdAppointment = await createAppointmentByTenant(currentTenantId, appointment);
    await refreshSchedule();

    return createdAppointment;
  }, [currentTenantId, enabled, refreshSchedule]);

  const createAppointmentBlock = useCallback(async (block) => {
    if (!enabled) {
      throw new Error('Agenda indisponível para este perfil.');
    }

    const createdBlock = await createAppointmentBlockByTenant(currentTenantId, block);
    await refreshSchedule();

    return createdBlock;
  }, [currentTenantId, enabled, refreshSchedule]);

  const updateAppointmentStatus = useCallback(async (appointmentId, status) => {
    if (!enabled) {
      throw new Error('Agenda indisponível para este perfil.');
    }

    const updatedAppointment = await updateAppointmentStatusByTenant(currentTenantId, appointmentId, status);
    await refreshSchedule();

    return updatedAppointment;
  }, [currentTenantId, enabled, refreshSchedule]);

  const rescheduleAppointment = useCallback(async (appointmentId, change) => {
    if (!enabled) {
      throw new Error('Agenda indisponível para este perfil.');
    }
    if (!appointmentId) {
      throw new Error('Consulta não encontrada.');
    }
    if (rescheduleInFlightIdsRef.current.has(appointmentId)) {
      throw new Error('O reagendamento desta consulta já está em andamento.');
    }

    const requestTenantId = currentTenantId;
    rescheduleInFlightIdsRef.current.add(appointmentId);
    setRescheduleInFlightId(appointmentId);
    setRescheduleError('');

    try {
      const result = await rescheduleAppointmentByTenant(requestTenantId, appointmentId, {
        ...change,
        actorMembershipId: currentTenant?.membership_id || null,
      });

      if (activeTenantIdRef.current !== requestTenantId) {
        return null;
      }

      const nextSchedule = await refreshSchedule();
      const hydratedAppointment = nextSchedule?.appointments?.find((appointment) => appointment.id === result?.id);
      if (hydratedAppointment) return hydratedAppointment;
      if (result?.patient) return result;
      throw new Error('A consulta foi reagendada, mas atualize a Agenda para exibir a nova alocação.');
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId) {
        setRescheduleError(error?.message || 'Não foi possível reagendar a consulta.');
      }
      throw error;
    } finally {
      rescheduleInFlightIdsRef.current.delete(appointmentId);
      if (activeTenantIdRef.current === requestTenantId) {
        setRescheduleInFlightId((currentId) => (currentId === appointmentId ? '' : currentId));
      }
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled, refreshSchedule]);

  const loadAvailabilityWindows = useCallback(async (professionalId) => {
    if (!enabled || !professionalId) {
      setAvailabilityWindows([]);
      return [];
    }

    const requestTenantId = currentTenantId;
    setAvailabilityWindows([]);
    setAvailabilityLoading(true);
    setAvailabilityError('');
    try {
      const windows = await listProfessionalAvailabilityWindowsByTenant(requestTenantId, {
        actorMembershipId: currentTenant?.membership_id || null,
        professionalId,
      });
      if (activeTenantIdRef.current === requestTenantId) setAvailabilityWindows(windows);
      return windows;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId) {
        setAvailabilityWindows([]);
        setAvailabilityError(error?.message || 'Não foi possível carregar a disponibilidade.');
      }
      throw error;
    } finally {
      if (activeTenantIdRef.current === requestTenantId) setAvailabilityLoading(false);
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled]);

  const saveAvailabilityWindow = useCallback(async (window) => {
    if (!enabled) throw new Error('Agenda indisponível para este perfil.');
    const lockId = window.windowId || `new:${window.professionalId}:${window.weekday}`;
    if (availabilityInFlightIdsRef.current.has(lockId)) {
      throw new Error('Esta disponibilidade já está sendo salva.');
    }

    const requestTenantId = currentTenantId;
    availabilityInFlightIdsRef.current.add(lockId);
    setAvailabilityInFlightId(lockId);
    setAvailabilityError('');
    try {
      const saved = await saveProfessionalAvailabilityWindowByTenant(requestTenantId, {
        ...window,
        actorMembershipId: currentTenant?.membership_id || null,
      });
      if (activeTenantIdRef.current === requestTenantId) {
        await loadAvailabilityWindows(window.professionalId);
      }
      return saved;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId) {
        setAvailabilityError(error?.message || 'Não foi possível salvar a disponibilidade.');
      }
      throw error;
    } finally {
      availabilityInFlightIdsRef.current.delete(lockId);
      if (activeTenantIdRef.current === requestTenantId) {
        setAvailabilityInFlightId((currentId) => (currentId === lockId ? '' : currentId));
      }
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled, loadAvailabilityWindows]);

  const disableAvailabilityWindow = useCallback(async (window) => {
    if (!enabled) throw new Error('Agenda indisponível para este perfil.');
    if (!window?.id) throw new Error('Janela de disponibilidade não encontrada.');
    if (availabilityInFlightIdsRef.current.has(window.id)) {
      throw new Error('Esta disponibilidade já está sendo atualizada.');
    }

    const requestTenantId = currentTenantId;
    availabilityInFlightIdsRef.current.add(window.id);
    setAvailabilityInFlightId(window.id);
    setAvailabilityError('');
    try {
      const disabled = await disableProfessionalAvailabilityWindowByTenant(requestTenantId, {
        actorMembershipId: currentTenant?.membership_id || null,
        windowId: window.id,
      });
      if (activeTenantIdRef.current === requestTenantId) {
        await loadAvailabilityWindows(window.professionalId);
      }
      return disabled;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId) {
        setAvailabilityError(error?.message || 'Não foi possível desativar a disponibilidade.');
      }
      throw error;
    } finally {
      availabilityInFlightIdsRef.current.delete(window.id);
      if (activeTenantIdRef.current === requestTenantId) {
        setAvailabilityInFlightId((currentId) => (currentId === window.id ? '' : currentId));
      }
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled, loadAvailabilityWindows]);

  const refreshExceptions = useCallback(async (professionalId, dateFrom = null, dateTo = null) => {
    if (!enabled || !professionalId) {
      exceptionRequestIdRef.current += 1;
      setExceptions([]);
      return [];
    }

    const requestTenantId = currentTenantId;
    const requestId = exceptionRequestIdRef.current + 1;
    exceptionRequestIdRef.current = requestId;
    setExceptionsLoading(true);
    setExceptionsError('');
    try {
      const result = await listProfessionalAvailabilityExceptionsByTenant(requestTenantId, {
        actorMembershipId: currentTenant?.membership_id || null,
        dateFrom,
        dateTo,
        professionalId,
      });
      if (activeTenantIdRef.current === requestTenantId && exceptionRequestIdRef.current === requestId) {
        setExceptions(result);
      }
      return result;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId && exceptionRequestIdRef.current === requestId) {
        setExceptions([]);
        setExceptionsError(error?.message || 'Não foi possível carregar as exceções de disponibilidade.');
      }
      throw error;
    } finally {
      if (activeTenantIdRef.current === requestTenantId && exceptionRequestIdRef.current === requestId) {
        setExceptionsLoading(false);
      }
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled]);

  const saveException = useCallback(async (exception) => {
    if (!enabled) throw new Error('Agenda indisponível para este perfil.');
    const lockId = exception.exceptionId || `new:${exception.professionalId}:${exception.exceptionDate}`;
    if (exceptionInFlightIdsRef.current.has(lockId)) {
      throw new Error('Esta exceção já está sendo salva.');
    }

    const requestTenantId = currentTenantId;
    exceptionInFlightIdsRef.current.add(lockId);
    setExceptionInFlightId(lockId);
    setExceptionsError('');
    try {
      const saved = await saveProfessionalAvailabilityExceptionByTenant(requestTenantId, {
        ...exception,
        actorMembershipId: currentTenant?.membership_id || null,
      });
      if (activeTenantIdRef.current === requestTenantId) {
        await refreshExceptions(exception.professionalId);
      }
      return saved;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId) {
        setExceptionsError(error?.message || 'Não foi possível salvar a exceção de disponibilidade.');
      }
      throw error;
    } finally {
      exceptionInFlightIdsRef.current.delete(lockId);
      if (activeTenantIdRef.current === requestTenantId) {
        setExceptionInFlightId((currentId) => (currentId === lockId ? '' : currentId));
      }
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled, refreshExceptions]);

  const disableException = useCallback(async (exception) => {
    if (!enabled) throw new Error('Agenda indisponível para este perfil.');
    if (!exception?.id) throw new Error('Exceção de disponibilidade não encontrada.');
    if (exceptionInFlightIdsRef.current.has(exception.id)) {
      throw new Error('Esta exceção já está sendo atualizada.');
    }

    const requestTenantId = currentTenantId;
    exceptionInFlightIdsRef.current.add(exception.id);
    setExceptionInFlightId(exception.id);
    setExceptionsError('');
    try {
      const disabled = await disableProfessionalAvailabilityExceptionByTenant(requestTenantId, {
        actorMembershipId: currentTenant?.membership_id || null,
        exceptionId: exception.id,
      });
      if (activeTenantIdRef.current === requestTenantId) {
        await refreshExceptions(exception.professionalId);
      }
      return disabled;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId) {
        setExceptionsError(error?.message || 'Não foi possível desativar a exceção de disponibilidade.');
      }
      throw error;
    } finally {
      exceptionInFlightIdsRef.current.delete(exception.id);
      if (activeTenantIdRef.current === requestTenantId) {
        setExceptionInFlightId((currentId) => (currentId === exception.id ? '' : currentId));
      }
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled, refreshExceptions]);

  const clearSuggestedSlots = useCallback(() => {
    slotRequestIdRef.current += 1;
    setSuggestedSlots([]);
    setSlotsLoading(false);
    setSlotsError('');
  }, []);

  const loadSuggestedSlots = useCallback(async (request) => {
    if (!enabled || !request?.date || !request?.professionalId || !request?.roomId || !request?.durationMinutes) {
      clearSuggestedSlots();
      return [];
    }

    const requestTenantId = currentTenantId;
    const requestId = slotRequestIdRef.current + 1;
    slotRequestIdRef.current = requestId;
    setSlotsLoading(true);
    setSlotsError('');
    try {
      const slots = await listAvailableAppointmentSlotsByTenant(requestTenantId, {
        ...request,
        actorMembershipId: currentTenant?.membership_id || null,
      });
      if (activeTenantIdRef.current === requestTenantId && slotRequestIdRef.current === requestId) {
        setSuggestedSlots(slots);
      }
      return slots;
    } catch (error) {
      if (activeTenantIdRef.current === requestTenantId && slotRequestIdRef.current === requestId) {
        setSuggestedSlots([]);
        setSlotsError(error?.message || 'Não foi possível carregar horários sugeridos.');
      }
      throw error;
    } finally {
      if (activeTenantIdRef.current === requestTenantId && slotRequestIdRef.current === requestId) {
        setSlotsLoading(false);
      }
    }
  }, [clearSuggestedSlots, currentTenant?.membership_id, currentTenantId, enabled]);

  return {
    ...schedule,
    availabilityError,
    availabilityInFlightId,
    availabilityLoading,
    availabilityWindows,
    clearSuggestedSlots,
    createAppointment,
    createAppointmentBlock,
    disableAvailabilityWindow,
    disableException,
    exceptionInFlightId,
    exceptions,
    exceptionsError,
    exceptionsLoading,
    loading,
    loadAvailabilityWindows,
    loadSuggestedSlots,
    refreshExceptions,
    refreshSchedule,
    rescheduleAppointment,
    rescheduleError,
    rescheduleInFlightId,
    saveAvailabilityWindow,
    saveException,
    slotsError,
    slotsLoading,
    suggestedSlots,
    updateAppointmentStatus,
  };
};
