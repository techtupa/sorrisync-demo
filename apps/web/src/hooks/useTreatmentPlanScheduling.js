import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  buildTreatmentPlanSchedulingReadModel,
  fetchTreatmentPlanItemAppointments,
  getMockTreatmentPlanItemAppointments,
  scheduleMockTreatmentPlanItemAppointment,
  scheduleTreatmentPlanItemAppointment,
  treatmentSchedulingErrorMessage,
} from '@/repositories/index.js';

const EMPTY_MODEL = buildTreatmentPlanSchedulingReadModel([]);

export const useTreatmentPlanScheduling = (patientId) => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(
    patientId
    && canAccessModule('mod_prontuario')
    && canAccessModule('mod_tratamentos')
    && canAccessModule('mod_agenda')
    && hasPermission('patients.read')
    && hasPermission('services.read')
    && hasPermission('clinical_records.read')
    && hasPermission('treatment_plans.read')
    && hasPermission('appointments.read'),
  );
  const canManage = Boolean(
    canRead
    && hasPermission('clinical_records.manage')
    && hasPermission('treatment_plans.manage')
    && hasPermission('appointments.manage'),
  );
  const scope = `${currentTenantId || ''}:${patientId || ''}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sequenceRef = useRef(0);
  const inFlightRef = useRef(new Set());
  const [state, setState] = useState({ scope: '', model: EMPTY_MODEL, loading: false, error: '' });
  const [scheduleInFlightId, setScheduleInFlightId] = useState('');
  const [scheduleError, setScheduleError] = useState('');

  const refreshLinks = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    if (!canRead) {
      setState({ scope, model: EMPTY_MODEL, loading: false, error: '' });
      return EMPTY_MODEL;
    }
    setState({ scope, model: EMPTY_MODEL, loading: true, error: '' });
    try {
      const model = await (isSupabaseMode
        ? fetchTreatmentPlanItemAppointments(patientId)
        : getMockTreatmentPlanItemAppointments({ tenantId: currentTenantId, patientId, canRead, canManage }));
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, model, loading: false, error: '' });
      }
      return model;
    } catch (error) {
      const message = treatmentSchedulingErrorMessage(error);
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, model: EMPTY_MODEL, loading: false, error: message });
      }
      return EMPTY_MODEL;
    }
  }, [canManage, canRead, currentTenantId, isSupabaseMode, patientId, scope]);

  useEffect(() => {
    inFlightRef.current.clear();
    setScheduleInFlightId('');
    setScheduleError('');
    refreshLinks();
    return () => { sequenceRef.current += 1; };
  }, [refreshLinks]);

  const scheduleItem = useCallback(async (input) => {
    if (!canManage || !input?.itemId) throw new Error('SS_TREATMENT_SCHEDULING_ACCESS_DENIED');
    if (inFlightRef.current.has(input.itemId)) throw new Error('SS_TREATMENT_SCHEDULING_CONCURRENT_CONFLICT');
    const requestScope = scope;
    inFlightRef.current.add(input.itemId);
    setScheduleInFlightId(input.itemId);
    setScheduleError('');
    try {
      const result = await (isSupabaseMode
        ? scheduleTreatmentPlanItemAppointment(input)
        : scheduleMockTreatmentPlanItemAppointment({ tenantId: currentTenantId, canManage, ...input }));
      if (scopeRef.current === requestScope) await refreshLinks();
      return result;
    } catch (error) {
      const message = treatmentSchedulingErrorMessage(error);
      if (scopeRef.current === requestScope) setScheduleError(message);
      error.userMessage ||= message;
      throw error;
    } finally {
      inFlightRef.current.delete(input.itemId);
      if (scopeRef.current === requestScope) {
        setScheduleInFlightId((current) => current === input.itemId ? '' : current);
      }
    }
  }, [canManage, currentTenantId, isSupabaseMode, refreshLinks, scope]);

  const visible = state.scope === scope ? state.model : EMPTY_MODEL;
  return {
    ...visible,
    canRead,
    canManage,
    loading: state.scope === scope && state.loading,
    error: state.scope === scope ? state.error : '',
    scheduleError,
    scheduleInFlightId,
    refreshLinks,
    scheduleItem,
    scopeKey: scope,
  };
};
