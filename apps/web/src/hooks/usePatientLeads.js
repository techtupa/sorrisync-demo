import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  LEAD_EVENT_TYPES,
  LEAD_PRIORITIES,
  createPatientLeadByTenant,
  convertPatientLeadByTenant,
  fetchPatientLeadEventsByTenant,
  fetchPatientLeadSummaryByTenant,
  fetchPatientLeadsByTenant,
  getPatientLeadEventsByTenant,
  getPatientLeadSummaryByTenant,
  getPatientLeadsByTenant,
  recordPatientLeadEventByTenant,
  updatePatientLeadByTenant,
} from '@/repositories/index.js';

const cleanText = (value) => {
  return typeof value === 'string' ? value.trim() : '';
};

const normalizeLeadLabel = (value) => cleanText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const terminalLeadStatuses = new Set(['convertido', 'perdido']);
const isOpenLead = (lead) => !terminalLeadStatuses.has(normalizeLeadLabel(lead?.status));
const isUrgentLead = (lead) => normalizeLeadLabel(lead?.priority) === normalizeLeadLabel(LEAD_PRIORITIES.URGENTE);

const buildLeadSummary = (leads) => ({
  total: leads.length,
  open: leads.filter(isOpenLead).length,
  converted: leads.filter((lead) => normalizeLeadLabel(lead.status) === 'convertido').length,
  lost: leads.filter((lead) => normalizeLeadLabel(lead.status) === 'perdido').length,
  scheduledFollowUps: leads.filter((lead) => lead.followUpAt && isOpenLead(lead)).length,
  urgent: leads.filter(isUrgentLead).length,
});

const EMPTY_LEAD_EVENTS = [];
const EMPTY_PATIENT_LEADS = [];
const EMPTY_LEAD_SUMMARY = buildLeadSummary(EMPTY_PATIENT_LEADS);

const getEventTime = (event) => {
  const time = new Date(event?.occurredAt).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getEventKey = (event) => {
  return event?.id || event?.sourceKey || `${event?.leadId}-${event?.type}-${event?.occurredAt}`;
};

const mergeLeadEvents = (...eventGroups) => {
  const eventsByKey = new Map();

  eventGroups.flat().filter(Boolean).forEach((event) => {
    eventsByKey.set(getEventKey(event), event);
  });

  return [...eventsByKey.values()].sort((first, second) => getEventTime(second) - getEventTime(first));
};

export const usePatientLeads = ({ enabled = true } = {}) => {
  const { currentTenantId, hasPermission } = useAuth();
  const [state, setState] = useState(() => ({
    tenantId: currentTenantId,
    events: enabled ? getPatientLeadEventsByTenant(currentTenantId) : EMPTY_LEAD_EVENTS,
    leads: enabled ? getPatientLeadsByTenant(currentTenantId) : EMPTY_PATIENT_LEADS,
    summary: enabled ? getPatientLeadSummaryByTenant(currentTenantId) : EMPTY_LEAD_SUMMARY,
  }));
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [converting, setConverting] = useState(false);
  const [recordingEvent, setRecordingEvent] = useState(false);
  const fallbackEvents = enabled ? getPatientLeadEventsByTenant(currentTenantId) : EMPTY_LEAD_EVENTS;
  const fallbackLeads = enabled ? getPatientLeadsByTenant(currentTenantId) : EMPTY_PATIENT_LEADS;
  const fallbackSummary = enabled ? getPatientLeadSummaryByTenant(currentTenantId) : EMPTY_LEAD_SUMMARY;
  const events = enabled ? (state.tenantId === currentTenantId ? state.events : fallbackEvents) : EMPTY_LEAD_EVENTS;
  const leads = enabled ? (state.tenantId === currentTenantId ? state.leads : fallbackLeads) : EMPTY_PATIENT_LEADS;
  const summary = enabled ? (state.tenantId === currentTenantId ? state.summary : fallbackSummary) : EMPTY_LEAD_SUMMARY;

  const assertEnabled = () => {
    if (!enabled) {
      throw new Error('CRM indisponivel para este perfil.');
    }
  };

  useEffect(() => {
    let active = true;

    if (!enabled) {
      setState({
        tenantId: currentTenantId,
        events: EMPTY_LEAD_EVENTS,
        leads: EMPTY_PATIENT_LEADS,
        summary: EMPTY_LEAD_SUMMARY,
      });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setState({
      tenantId: currentTenantId,
      events: getPatientLeadEventsByTenant(currentTenantId),
      leads: getPatientLeadsByTenant(currentTenantId),
      summary: getPatientLeadSummaryByTenant(currentTenantId),
    });
    setLoading(true);

    Promise.all([
      fetchPatientLeadEventsByTenant(currentTenantId),
      fetchPatientLeadsByTenant(currentTenantId),
      fetchPatientLeadSummaryByTenant(currentTenantId),
    ])
      .then(([nextEvents, nextLeads, nextSummary]) => {
        if (active) {
          setState({
            tenantId: currentTenantId,
            events: nextEvents,
            leads: nextLeads,
            summary: nextSummary,
          });
        }
      })
      .catch(() => {
        if (active) {
          setState({
            tenantId: currentTenantId,
            events: getPatientLeadEventsByTenant(currentTenantId),
            leads: getPatientLeadsByTenant(currentTenantId),
            summary: getPatientLeadSummaryByTenant(currentTenantId),
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

  const createLead = async (lead) => {
    if (!hasPermission('patients.manage')) throw new Error('This profile can only view leads.');
    assertEnabled();
    setCreating(true);

    try {
      const creation = await createPatientLeadByTenant(currentTenantId, lead);
      const createdLead = creation?.lead || creation;
      const creationEvents = creation?.event ? [creation.event] : [];
      const nextEvents = await fetchPatientLeadEventsByTenant(currentTenantId);

      setState((previousState) => {
        const baseLeads = previousState.tenantId === currentTenantId
          ? previousState.leads
          : getPatientLeadsByTenant(currentTenantId);
        const baseEvents = previousState.tenantId === currentTenantId
          ? previousState.events
          : getPatientLeadEventsByTenant(currentTenantId);
        const nextLeads = [
          createdLead,
          ...baseLeads.filter((leadItem) => leadItem.id !== createdLead.id),
        ];

        return {
          tenantId: currentTenantId,
          events: mergeLeadEvents(nextEvents, creationEvents, baseEvents),
          leads: nextLeads,
          summary: buildLeadSummary(nextLeads),
        };
      });

      return createdLead;
    } finally {
      setCreating(false);
    }
  };

  const updateLead = async (leadId, leadPatch) => {
    if (!hasPermission('patients.manage')) throw new Error('This profile can only view leads.');
    assertEnabled();
    setUpdating(true);

    try {
      const updateResult = await updatePatientLeadByTenant(currentTenantId, leadId, leadPatch);
      const updatedLead = updateResult?.lead || updateResult;
      const updateEvents = updateResult?.event ? [updateResult.event] : [];
      const nextEvents = await fetchPatientLeadEventsByTenant(currentTenantId);

      setState((previousState) => {
        const baseLeads = previousState.tenantId === currentTenantId
          ? previousState.leads
          : getPatientLeadsByTenant(currentTenantId);
        const baseEvents = previousState.tenantId === currentTenantId
          ? previousState.events
          : getPatientLeadEventsByTenant(currentTenantId);
        const nextLeads = baseLeads.map((lead) => (
          lead.id === updatedLead.id ? updatedLead : lead
        ));

        return {
          tenantId: currentTenantId,
          events: mergeLeadEvents(nextEvents, updateEvents, baseEvents),
          leads: nextLeads,
          summary: buildLeadSummary(nextLeads),
        };
      });

      return updatedLead;
    } finally {
      setUpdating(false);
    }
  };

  const convertLeadToPatient = async (leadId, overrides = {}) => {
    if (!hasPermission('patients.manage')) throw new Error('This profile can only view leads.');
    assertEnabled();
    setConverting(true);

    try {
      const conversion = await convertPatientLeadByTenant(currentTenantId, leadId, overrides);
      const nextEvents = await fetchPatientLeadEventsByTenant(currentTenantId);

      setState((previousState) => {
        const baseLeads = previousState.tenantId === currentTenantId
          ? previousState.leads
          : getPatientLeadsByTenant(currentTenantId);
        const baseEvents = previousState.tenantId === currentTenantId
          ? previousState.events
          : getPatientLeadEventsByTenant(currentTenantId);
        const nextLeads = baseLeads.map((lead) => (
          lead.id === conversion.lead.id ? conversion.lead : lead
        ));
        const conversionEvents = conversion.event ? [conversion.event] : [];

        return {
          tenantId: currentTenantId,
          events: mergeLeadEvents(nextEvents, conversionEvents, baseEvents),
          leads: nextLeads,
          summary: buildLeadSummary(nextLeads),
        };
      });

      return conversion;
    } finally {
      setConverting(false);
    }
  };

  const recordLeadEvent = async (leadId, event) => {
    if (!hasPermission('patients.manage')) throw new Error('This profile can only view leads.');
    assertEnabled();
    setRecordingEvent(true);

    try {
      const createdEvent = await recordPatientLeadEventByTenant(currentTenantId, leadId, event);

      setState((previousState) => {
        const baseEvents = previousState.tenantId === currentTenantId
          ? previousState.events
          : getPatientLeadEventsByTenant(currentTenantId);

        return {
          tenantId: currentTenantId,
          events: mergeLeadEvents([createdEvent], baseEvents),
          leads: previousState.tenantId === currentTenantId
            ? previousState.leads
            : getPatientLeadsByTenant(currentTenantId),
          summary: previousState.tenantId === currentTenantId
            ? previousState.summary
            : getPatientLeadSummaryByTenant(currentTenantId),
        };
      });

      return createdEvent;
    } finally {
      setRecordingEvent(false);
    }
  };

  const recordLeadContact = async (leadId, description) => {
    assertEnabled();
    setRecordingEvent(true);

    const occurredAt = new Date().toISOString();
    const eventDescription = cleanText(description) || 'Contato operacional registrado';

    try {
      const updateResult = await updatePatientLeadByTenant(currentTenantId, leadId, {
        lastContactAt: occurredAt,
        skipEvent: true,
      });
      const updatedLead = updateResult?.lead || updateResult;

      let createdEvent = null;

      try {
        createdEvent = await recordPatientLeadEventByTenant(currentTenantId, leadId, {
          type: LEAD_EVENT_TYPES.CONTACT_LOGGED,
          title: 'Contato registrado',
          description: eventDescription,
          channel: 'CRM',
          occurredAt,
          metadata: {
            source: 'use_patient_leads',
          },
        });
      } catch {
        // Contact event creation is complementary; the last contact timestamp must remain saved.
      }

      setState((previousState) => {
        const baseLeads = previousState.tenantId === currentTenantId
          ? previousState.leads
          : getPatientLeadsByTenant(currentTenantId);
        const baseEvents = previousState.tenantId === currentTenantId
          ? previousState.events
          : getPatientLeadEventsByTenant(currentTenantId);
        const nextLeads = baseLeads.map((lead) => (
          lead.id === updatedLead.id ? updatedLead : lead
        ));

        return {
          tenantId: currentTenantId,
          events: mergeLeadEvents(createdEvent ? [createdEvent] : [], baseEvents),
          leads: nextLeads,
          summary: buildLeadSummary(nextLeads),
        };
      });

      return updatedLead;
    } finally {
      setRecordingEvent(false);
    }
  };

  return {
    events,
    leads,
    summary,
    loading,
    creating,
    updating,
    converting,
    recordingEvent,
    createLead,
    updateLead,
    convertLeadToPatient,
    recordLeadEvent,
    recordLeadContact,
  };
};
