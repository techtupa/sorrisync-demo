import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  appendClinicalRecordAddendum,
  appendClinicalRecordEntry,
  appendMockClinicalRecordAddendum,
  appendMockClinicalRecordEntry,
  fetchClinicalRecordTimeline,
  getMockClinicalRecordTimeline,
} from '@/repositories/index.js';

export const useClinicalRecord = (patientId) => {
  const { isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(patientId && canAccessModule('mod_prontuario') && hasPermission('patients.read') && hasPermission('clinical_records.read'));
  const canManage = Boolean(canRead && hasPermission('clinical_records.manage'));
  const [state, setState] = useState({ patientId: null, entries: [], loading: false, error: null });
  const [mutationInFlight, setMutationInFlight] = useState(false);

  const refresh = useCallback(async () => {
    if (!canRead) {
      setState({ patientId, entries: [], loading: false, error: null });
      return [];
    }
    setState((current) => ({ ...current, patientId, loading: true, error: null }));
    try {
      const entries = await (isSupabaseMode ? fetchClinicalRecordTimeline(patientId) : getMockClinicalRecordTimeline(patientId));
      setState({ patientId, entries, loading: false, error: null });
      return entries;
    } catch (error) {
      setState({ patientId, entries: [], loading: false, error: 'Leitura clínica indisponível para este perfil ou paciente.' });
      return [];
    }
  }, [canRead, isSupabaseMode, patientId]);

  useEffect(() => { refresh(); }, [refresh]);

  const mutate = useCallback(async (operation) => {
    if (!canManage || mutationInFlight) throw new Error('SS_CLINICAL_ACCESS_DENIED');
    setMutationInFlight(true);
    try {
      const result = await operation();
      await refresh();
      return result;
    } finally {
      setMutationInFlight(false);
    }
  }, [canManage, mutationInFlight, refresh]);

  const appendEntry = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? appendClinicalRecordEntry({ patientId, ...input })
      : appendMockClinicalRecordEntry({ patientId, ...input })
  )), [isSupabaseMode, mutate, patientId]);

  const appendAddendum = useCallback((input) => mutate(() => (
    isSupabaseMode
      ? appendClinicalRecordAddendum(input)
      : appendMockClinicalRecordAddendum({ patientId, ...input })
  )), [isSupabaseMode, mutate, patientId]);

  return {
    entries: state.patientId === patientId ? state.entries : [],
    loading: state.loading,
    error: state.error,
    canRead,
    canManage,
    mutationInFlight,
    refresh,
    appendEntry,
    appendAddendum,
  };
};
