import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  createAppointmentWaitlistEntryByTenant,
  dismissAppointmentWaitlistEntryByTenant,
  listAppointmentWaitlistEntriesByTenant,
  scheduleAppointmentWaitlistEntryByTenant,
  updateAppointmentWaitlistEntryByTenant,
} from '@/repositories/index.js';

const EMPTY_FILTERS = Object.freeze({
  period: 'all',
  priority: 'all',
  search: '',
  serviceId: 'all',
});

const createEmptyState = (tenantId) => ({
  entries: [],
  error: '',
  feedback: '',
  loading: false,
  source: 'unavailable',
  tenantId,
});

export const useAppointmentWaitlist = ({ canManage = false, enabled = true } = {}) => {
  const { currentTenant, currentTenantId } = useAuth();
  const activeTenantIdRef = useRef(currentTenantId);
  const requestSequenceRef = useRef(0);
  const inFlightIdsRef = useRef(new Set());
  const [state, setState] = useState(() => createEmptyState(currentTenantId));
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [mutationInFlightId, setMutationInFlightId] = useState('');

  const refresh = useCallback(async () => {
    const tenantId = currentTenantId;
    const requestId = ++requestSequenceRef.current;
    activeTenantIdRef.current = tenantId;

    if (!enabled || !tenantId || !currentTenant?.membership_id) {
      setState(createEmptyState(tenantId));
      return { items: [], source: 'unavailable' };
    }

    setState((current) => ({
      ...current,
      entries: current.tenantId === tenantId ? current.entries : [],
      error: '',
      loading: true,
      tenantId,
    }));

    try {
      const result = await listAppointmentWaitlistEntriesByTenant(tenantId, {
        actorMembershipId: currentTenant.membership_id,
        status: 'open',
      });
      if (activeTenantIdRef.current !== tenantId || requestSequenceRef.current !== requestId) {
        return { ...result, staleTenant: true };
      }

      setState({
        entries: result.items || [],
        error: '',
        feedback: '',
        loading: false,
        source: result.source || 'unavailable',
        tenantId,
      });
      setSelectedEntry((current) => (
        current ? (result.items || []).find((entry) => entry.id === current.id) || null : null
      ));
      return result;
    } catch (error) {
      if (activeTenantIdRef.current === tenantId && requestSequenceRef.current === requestId) {
        setState((current) => ({
          ...current,
          entries: [],
          error: error?.message || 'Não foi possível carregar a lista de espera.',
          loading: false,
          source: 'error',
        }));
      }
      throw error;
    }
  }, [currentTenant?.membership_id, currentTenantId, enabled]);

  useEffect(() => {
    activeTenantIdRef.current = currentTenantId;
    requestSequenceRef.current += 1;
    inFlightIdsRef.current.clear();
    setState(createEmptyState(currentTenantId));
    setFilters({ ...EMPTY_FILTERS });
    setSelectedEntry(null);
    setMutationInFlightId('');
    refresh().catch(() => {});
    return () => { requestSequenceRef.current += 1; };
  }, [currentTenantId, refresh]);

  const runMutation = useCallback(async (lockId, mutation, successMessage) => {
    const tenantId = currentTenantId;
    if (!canManage) throw new Error('Seu perfil possui acesso somente para leitura.');
    if (!tenantId || !currentTenant?.membership_id) throw new Error('Clínica ativa não identificada para esta ação.');
    if (inFlightIdsRef.current.has(lockId)) throw new Error('Esta ação já está em andamento.');

    inFlightIdsRef.current.add(lockId);
    setMutationInFlightId(lockId);
    setState((current) => ({ ...current, error: '', feedback: '' }));

    try {
      const result = await mutation(tenantId, currentTenant.membership_id);
      if (activeTenantIdRef.current !== tenantId) return { ...result, staleTenant: true };
      await refresh();
      if (activeTenantIdRef.current === tenantId) {
        setState((current) => ({
          ...current,
          feedback: result.replayed ? 'A operação já estava registrada e foi mantida sem duplicação.' : successMessage,
        }));
      }
      return result;
    } catch (error) {
      if (activeTenantIdRef.current === tenantId) {
        setState((current) => ({ ...current, error: error?.message || 'Não foi possível concluir a ação.' }));
      }
      throw error;
    } finally {
      inFlightIdsRef.current.delete(lockId);
      if (activeTenantIdRef.current === tenantId) setMutationInFlightId('');
    }
  }, [canManage, currentTenant?.membership_id, currentTenantId, refresh]);

  const createEntry = useCallback((request) => runMutation(
    `create:${request.sourceType}:${request.sourceId}:${request.serviceId}`,
    (tenantId, membershipId) => createAppointmentWaitlistEntryByTenant(tenantId, {
      ...request,
      actorMembershipId: membershipId,
    }),
    'Entrada adicionada à lista de espera.',
  ), [runMutation]);

  const updateEntry = useCallback((entryId, request) => runMutation(
    entryId,
    (tenantId, membershipId) => updateAppointmentWaitlistEntryByTenant(tenantId, entryId, {
      ...request,
      actorMembershipId: membershipId,
    }),
    'Preferências atualizadas.',
  ), [runMutation]);

  const dismissEntry = useCallback((entryId, request) => runMutation(
    entryId,
    (tenantId, membershipId) => dismissAppointmentWaitlistEntryByTenant(tenantId, entryId, {
      ...request,
      actorMembershipId: membershipId,
    }),
    'Entrada dispensada e histórico preservado.',
  ), [runMutation]);

  const scheduleEntry = useCallback((entryId, request) => runMutation(
    entryId,
    (tenantId, membershipId) => scheduleAppointmentWaitlistEntryByTenant(tenantId, entryId, {
      ...request,
      actorMembershipId: membershipId,
    }),
    'Consulta agendada e entrada encerrada.',
  ), [runMutation]);

  const filteredEntries = useMemo(() => state.entries.filter((entry) => {
    const search = filters.search.trim().toLocaleLowerCase('pt-BR');
    return (!search || entry.sourceDisplayName.toLocaleLowerCase('pt-BR').includes(search))
      && (filters.serviceId === 'all' || entry.serviceId === filters.serviceId)
      && (filters.period === 'all' || entry.preferredPeriod === filters.period)
      && (filters.priority === 'all' || entry.priority === filters.priority);
  }), [filters, state.entries]);

  return {
    ...state,
    createEntry,
    dismissEntry,
    entries: filteredEntries,
    filters,
    mutationInFlightId,
    refresh,
    scheduleEntry,
    selectedEntry,
    setFilters,
    setSelectedEntry,
    updateEntry,
  };
};
