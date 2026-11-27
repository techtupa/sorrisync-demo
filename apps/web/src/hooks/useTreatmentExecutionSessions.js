import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  buildTreatmentExecutionSessionsReadModel,
  getMockTreatmentExecutionSessionsByPatient,
  getTreatmentExecutionSessionsByPatient,
  recordMockTreatmentExecutionSessionByAppointmentLink,
  recordTreatmentExecutionSessionByAppointmentLink,
  treatmentExecutionSessionErrorMessage,
} from '@/repositories/index.js';

export const useTreatmentExecutionSessions = (patientId, linkedAppointments = [], scheduleEligibilityByItem = {}) => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(
    patientId
    && canAccessModule('mod_prontuario')
    && canAccessModule('mod_tratamentos')
    && canAccessModule('mod_agenda')
    && hasPermission('patients.read')
    && hasPermission('clinical_records.read')
    && hasPermission('treatment_plans.read')
    && hasPermission('appointments.read'),
  );
  const canManage = Boolean(
    canRead
    && hasPermission('clinical_records.manage')
    && hasPermission('treatment_plans.manage'),
  );
  const scope = `${currentTenantId || ''}:${patientId || ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sequenceRef = useRef(0);
  const inFlightRef = useRef(new Set());
  const [state, setState] = useState({ scope: '', rows: [], linkedAppointments: [], loading: false, error: '' });
  const [sessionInFlightId, setSessionInFlightId] = useState('');
  const [sessionError, setSessionError] = useState('');

  const refreshSessions = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    if (!canRead) {
      setState({ scope, rows: [], linkedAppointments: [], loading: false, error: '' });
      return [];
    }
    setState({ scope, rows: [], linkedAppointments: [], loading: true, error: '' });
    try {
      const result = await (isSupabaseMode
        ? getTreatmentExecutionSessionsByPatient(patientId)
        : getMockTreatmentExecutionSessionsByPatient({ tenantId: currentTenantId, patientId, canRead }));
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, rows: result.rows, linkedAppointments: result.linkedAppointments, loading: false, error: '' });
      }
      return result.rows;
    } catch (error) {
      const message = treatmentExecutionSessionErrorMessage(error);
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, rows: [], linkedAppointments: [], loading: false, error: message });
      }
      return [];
    }
  }, [canRead, currentTenantId, isSupabaseMode, patientId, scope]);

  useEffect(() => {
    inFlightRef.current.clear();
    setSessionInFlightId('');
    setSessionError('');
    refreshSessions();
    return () => { sequenceRef.current += 1; };
  }, [refreshSessions]);

  const recordSession = useCallback(async (input) => {
    if (!canManage || !input?.appointmentLinkId) throw new Error('SS_TREATMENT_SESSION_ACCESS_DENIED');
    if (inFlightRef.current.has(input.appointmentLinkId)) throw new Error('SS_TREATMENT_SESSION_CONCURRENT_CONFLICT');
    const requestScope = scope;
    inFlightRef.current.add(input.appointmentLinkId);
    setSessionInFlightId(input.appointmentLinkId);
    setSessionError('');
    try {
      const result = await (isSupabaseMode
        ? recordTreatmentExecutionSessionByAppointmentLink(input)
        : recordMockTreatmentExecutionSessionByAppointmentLink({
          tenantId: currentTenantId, patientId, canManage, ...input,
        }));
      if (scopeRef.current === requestScope) await refreshSessions();
      return result;
    } catch (error) {
      const message = treatmentExecutionSessionErrorMessage(error);
      error.userMessage ||= message;
      if (scopeRef.current === requestScope) setSessionError(message);
      throw error;
    } finally {
      inFlightRef.current.delete(input.appointmentLinkId);
      if (scopeRef.current === requestScope) {
        setSessionInFlightId((current) => current === input.appointmentLinkId ? '' : current);
      }
    }
  }, [canManage, currentTenantId, isSupabaseMode, patientId, refreshSessions, scope]);

  const rows = state.scope === scope ? state.rows : [];
  const effectiveLinks = state.scope === scope && state.linkedAppointments.length > 0
    ? state.linkedAppointments
    : linkedAppointments;
  const model = useMemo(
    () => buildTreatmentExecutionSessionsReadModel(rows, effectiveLinks, scheduleEligibilityByItem),
    [effectiveLinks, rows, scheduleEligibilityByItem],
  );

  return {
    ...model,
    canRead,
    canManage,
    loading: state.scope === scope && state.loading,
    error: state.scope === scope ? state.error : '',
    sessionError,
    sessionInFlightId,
    refreshSessions,
    recordSession,
    scopeKey: scope,
  };
};
