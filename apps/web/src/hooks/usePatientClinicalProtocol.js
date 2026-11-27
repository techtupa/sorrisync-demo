import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  applyPatientClinicalProtocol,
  clinicalProtocolTemplateErrorMessage,
  completePatientClinicalProtocol,
  cancelPatientClinicalProtocol,
  completeClinicalProtocolItem,
  fetchPatientClinicalProtocol,
  revisePatientClinicalProtocol,
  releaseClinicalProtocolStep,
  revokeClinicalProtocolStepRelease,
  groupClinicalProtocolReleases,
  revokeClinicalProtocolGroupedVisit,
  setPatientClinicalProtocolPause,
  waiveClinicalProtocolCriterion,
  waivePatientClinicalProtocolStep,
} from '@/repositories/index.js';

const EMPTY = { planUpdatedAt: '', protocol: null, phases: [], steps: [], revisions: [], waivers: [], stepSessions: [], releases: [], visits: [], visitItems: [] };

export const usePatientClinicalProtocol = (planId) => {
  const { currentTenant, currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canRead = Boolean(isSupabaseMode && planId && currentTenantId
    && currentTenant?.slug === 'tenant_harbor'
    && canAccessModule('mod_prontuario') && canAccessModule('mod_tratamentos')
    && hasPermission('patients.read') && hasPermission('clinical_records.read')
    && hasPermission('treatment_plans.read') && hasPermission('treatment_protocols.read'));
  const canManage = Boolean(canRead && hasPermission('treatment_protocols.manage')
    && hasPermission('treatment_plans.manage') && hasPermission('clinical_records.manage'));
  const scope = `${currentTenantId || ''}:${planId || ''}:${canRead}`;
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const sequenceRef = useRef(0);
  const [state, setState] = useState({ scope: '', data: EMPTY, loading: false, error: '' });
  const [mutationInFlight, setMutationInFlight] = useState(false);

  const refresh = useCallback(async () => {
    const sequence = ++sequenceRef.current;
    if (!canRead) {
      setState({ scope, data: EMPTY, loading: false, error: '' });
      return EMPTY;
    }
    setState({ scope, data: EMPTY, loading: true, error: '' });
    try {
      const data = await fetchPatientClinicalProtocol(currentTenantId, planId);
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, data, loading: false, error: '' });
      }
      return data;
    } catch (error) {
      if (scopeRef.current === scope && sequenceRef.current === sequence) {
        setState({ scope, data: EMPTY, loading: false, error: clinicalProtocolTemplateErrorMessage(error) });
      }
      return EMPTY;
    }
  }, [canRead, currentTenantId, planId, scope]);

  useEffect(() => {
    setMutationInFlight(false);
    refresh();
    return () => { sequenceRef.current += 1; };
  }, [refresh]);

  const apply = useCallback(async ({ versionId, mapping, definition, plannedItemIds }) => {
    if (!canManage || mutationInFlight || state.scope !== scope || !state.data.planUpdatedAt) {
      throw new Error('SS_PROTOCOL_ACCESS_DENIED');
    }
    setMutationInFlight(true);
    try {
      const result = await applyPatientClinicalProtocol({
        planId, versionId, mapping, definition, plannedItemIds,
        expectedPlanUpdatedAt: state.data.planUpdatedAt,
        requestId: crypto.randomUUID(),
      });
      await refresh();
      return result;
    } finally {
      setMutationInFlight(false);
    }
  }, [canManage, mutationInFlight, planId, refresh, scope, state.data.planUpdatedAt, state.scope]);

  const revise = useCallback(async (updates) => {
    if (!canManage || mutationInFlight || state.scope !== scope || !state.data.protocol) {
      throw new Error('SS_PROTOCOL_ACCESS_DENIED');
    }
    setMutationInFlight(true);
    try {
      const result = await revisePatientClinicalProtocol({
        protocolId: state.data.protocol.id,
        expectedRevision: state.data.protocol.revision,
        updates,
        requestId: crypto.randomUUID(),
      });
      await refresh();
      return result;
    } finally {
      setMutationInFlight(false);
    }
  }, [canManage, mutationInFlight, refresh, scope, state.data.protocol, state.scope]);

  const mutateProtocol = useCallback(async (operation) => {
    if (!canManage || mutationInFlight || state.scope !== scope || !state.data.protocol) {
      throw new Error('SS_PROTOCOL_ACCESS_DENIED');
    }
    setMutationInFlight(true);
    try {
      const result = await operation(state.data.protocol);
      await refresh();
      return result;
    } finally {
      setMutationInFlight(false);
    }
  }, [canManage, mutationInFlight, refresh, scope, state.data.protocol, state.scope]);

  return {
    data: state.scope === scope ? state.data : EMPTY,
    loading: canRead && (state.scope !== scope || state.loading),
    error: state.scope === scope ? state.error : '',
    canRead,
    canManage,
    mutationInFlight,
    refresh,
    apply,
    revise,
    setPaused: (pause) => mutateProtocol((protocol) => setPatientClinicalProtocolPause({
      protocolId: protocol.id, pause, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
    waiveCriterion: (stepId, justification) => mutateProtocol((protocol) => waiveClinicalProtocolCriterion({
      stepId, criterionCode: 'previous_step', expectedRevision: protocol.revision,
      justification, requestId: crypto.randomUUID(),
    })),
    waiveStep: (stepId, justification) => mutateProtocol((protocol) => waivePatientClinicalProtocolStep({
      stepId, expectedRevision: protocol.revision, justification, requestId: crypto.randomUUID(),
    })),
    completeProtocol: () => mutateProtocol((protocol) => completePatientClinicalProtocol({
      protocolId: protocol.id, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
    cancelProtocol: (reasonCode) => mutateProtocol((protocol) => cancelPatientClinicalProtocol({
      protocolId: protocol.id, reasonCode, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
    completeItem: (itemId) => mutateProtocol((protocol) => completeClinicalProtocolItem({
      itemId, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
    releaseStep: (stepId, details) => mutateProtocol((protocol) => releaseClinicalProtocolStep({
      stepId, expectedRevision: protocol.revision, ...details, requestId: crypto.randomUUID(),
    })),
    revokeRelease: (releaseId) => mutateProtocol((protocol) => revokeClinicalProtocolStepRelease({
      releaseId, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
    groupReleases: (releaseIds, durationMinutes) => mutateProtocol((protocol) => groupClinicalProtocolReleases({
      releaseIds, durationMinutes, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
    revokeVisit: (visitId) => mutateProtocol((protocol) => revokeClinicalProtocolGroupedVisit({
      visitId, expectedRevision: protocol.revision, requestId: crypto.randomUUID(),
    })),
  };
};
