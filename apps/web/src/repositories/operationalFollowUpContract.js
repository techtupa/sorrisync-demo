export const OPERATIONAL_FOLLOW_UP_SOURCE_TYPES = Object.freeze({
  APPOINTMENT: 'appointment',
  LEAD: 'lead',
  OMNICHANNEL_CONVERSATION: 'omnichannel_conversation',
  PATIENT: 'patient',
});

export const OPERATIONAL_FOLLOW_UP_STATUSES = Object.freeze({
  DISMISSED: 'dismissed',
  DONE: 'done',
  IN_PROGRESS: 'in_progress',
  OPEN: 'open',
});

export const OPERATIONAL_FOLLOW_UP_PRIORITIES = Object.freeze({
  HIGH: 'high',
  LOW: 'low',
  NORMAL: 'normal',
});

export const OPERATIONAL_FOLLOW_UP_ACTIONS = Object.freeze({
  ASSIGN: 'assign',
  CLAIM: 'claim',
  COMPLETE: 'complete',
  DISMISS: 'dismiss',
  SET_DUE_AT: 'set_due_at',
  SET_PRIORITY: 'set_priority',
});

export const OPERATIONAL_FOLLOW_UP_DISMISSAL_REASONS = Object.freeze({
  DUPLICATE_SIGNAL: 'duplicate_signal',
  HANDLED_IN_SOURCE: 'handled_in_source',
  NOT_APPLICABLE: 'not_applicable',
});

export const isTerminalOperationalFollowUp = (item) => (
  item?.status === OPERATIONAL_FOLLOW_UP_STATUSES.DONE
  || item?.status === OPERATIONAL_FOLLOW_UP_STATUSES.DISMISSED
);
