import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  buildOmnichannelOperationalQueueModel,
  filterOmnichannelOperationalQueue,
} from './omnichannelOperationalQueueReadModel.js';
import {
  buildOmnichannelManualReplyWindowState,
} from './omnichannelManualReplyWindowReadModel.js';
import {
  buildOmnichannelChannelFilters,
  buildOmnichannelSuggestedQueueFilters,
} from './omnichannelChannelQueueContextReadModel.js';
import { OMNICHANNEL_COLLABORATION_ACTIONS } from './omnichannelCollaborationReadModel.js';
import {
  addOmnichannelConversationActivity,
  addOmnichannelInternalNote,
  assignOmnichannelConversationToMe,
  getOmnichannelChannelStatus,
  linkOmnichannelConversationToLead,
  linkOmnichannelConversationToPatient,
  listOmnichannelConversationActivities,
  listOmnichannelConversationActivitiesBatch,
  listOmnichannelConversationEvents,
  listOmnichannelChannels,
  listOmnichannelConversations,
  listOmnichannelConversationTriageResults,
  listOmnichannelInternalNotes,
  listOmnichannelAutoReplyAttempts,
  listOmnichannelTriageFlows,
  listOmnichannelTriageIntents,
  listOmnichannelTriageQuestions,
  listOmnichannelTriageSettings,
  listOmnichannelMessagesByConversation,
  getOmnichannelConversationTriageResult,
  getOmnichannelMessageMediaAccess,
  generateOmnichannelAttendanceAssistantDraft,
  markOmnichannelConversationRead,
  markOmnichannelConversationResolved,
  recordOmnichannelAttendanceAssistantFeedback,
  reopenOmnichannelConversation,
  scheduleOmnichannelConversationNextAction,
  sendOmnichannelManualReply,
  unassignOmnichannelConversation,
  unlinkOmnichannelConversationContext,
  updateOmnichannelConversationPriority,
  updateOmnichannelConversationStatus,
  upsertOmnichannelConversationTriageResult,
} from '@/repositories/index.js';

const EMPTY_STATE = {
  channels: [],
  channelStatus: {
    channel: null,
    isConfigured: false,
    source: 'Sem acesso',
    status: 'not_configured',
    statusLabel: 'Não configurado',
  },
  conversations: [],
  activitiesByConversation: {},
  autoReplyAttempts: [],
  events: [],
  internalNotes: [],
  messages: [],
  selectedConversation: null,
  selectedConversationTriageResult: null,
  triageResultsByConversation: {},
  triageFlows: [],
  triageIntents: [],
  triageQuestions: [],
  triageSettings: null,
};

const CONVERSATION_DETAIL_CACHE_TTL_MS = 45 * 1000;
const DEFAULT_CONVERSATION_LIMIT = 40;
const CONVERSATION_LIMIT_STEP = 40;
const MAX_CONVERSATION_LIMIT = 100;

const EMPTY_CONVERSATION_DETAILS = {
  activities: [],
  autoReplyAttempts: [],
  events: [],
  internalNotes: [],
  messages: [],
  triageResult: null,
};

const normalizeConversationDetails = (details = {}) => ({
  activities: Array.isArray(details.activities) ? details.activities : [],
  autoReplyAttempts: Array.isArray(details.autoReplyAttempts) ? details.autoReplyAttempts : [],
  events: Array.isArray(details.events) ? details.events : [],
  internalNotes: Array.isArray(details.internalNotes) ? details.internalNotes : [],
  messages: Array.isArray(details.messages) ? details.messages : [],
  triageResult: details.triageResult || null,
});

const getMessageTimelineTime = (message = {}) => {
  const rawTime = message.receivedAt || message.sentAt || message.createdAt;
  const time = rawTime ? new Date(rawTime).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const buildConversationLiveFingerprint = (details = {}) => {
  const normalizedDetails = normalizeConversationDetails(details);
  const messages = normalizedDetails.messages
    .map((message) => [
      message.id,
      message.direction,
      message.providerStatus,
      message.receivedAt || message.sentAt || message.createdAt,
    ].filter(Boolean).join(':'))
    .join('|');
  const activities = normalizedDetails.activities
    .map((activity) => [
      activity.id,
      activity.activityType,
      activity.outcome,
      activity.nextActionAt,
      activity.createdAt,
    ].filter(Boolean).join(':'))
    .join('|');
  const internalNotes = normalizedDetails.internalNotes
    .map((note) => [note.id, note.createdAt].filter(Boolean).join(':'))
    .join('|');
  const events = normalizedDetails.events
    .map((event) => [event.id, event.eventType, event.createdAt].filter(Boolean).join(':'))
    .join('|');
  const autoReplyAttempts = normalizedDetails.autoReplyAttempts
    .map((attempt) => [
      attempt.id,
      attempt.conversationId,
      attempt.decision,
      attempt.safeReason,
      attempt.createdAt,
    ].filter(Boolean).join(':'))
    .join('|');

  return [messages, activities, internalNotes, events, autoReplyAttempts].join('::');
};

const hasNewMessageInDetails = (previousDetails = {}, nextDetails = {}) => {
  const previousIds = new Set(normalizeConversationDetails(previousDetails).messages
    .map((message) => message.id)
    .filter(Boolean));

  return normalizeConversationDetails(nextDetails).messages
    .some((message) => message.id && !previousIds.has(message.id));
};

const mergeConversationMessages = (messages = [], nextMessage = null) => {
  if (!nextMessage?.id) return Array.isArray(messages) ? messages : [];

  const safeMessages = Array.isArray(messages) ? messages : [];
  const existingIndex = safeMessages.findIndex((message) => message.id === nextMessage.id);
  const optimisticIndex = existingIndex >= 0 || !nextMessage.idempotencyKey
    ? -1
    : safeMessages.findIndex((message) => (
      message.idempotencyKey === nextMessage.idempotencyKey
      && message.isOptimisticManualReply
    ));
  const replaceIndex = existingIndex >= 0 ? existingIndex : optimisticIndex;
  const mergedMessages = replaceIndex >= 0
    ? safeMessages.map((message, index) => (index === replaceIndex ? { ...message, ...nextMessage, isOptimisticManualReply: false } : message))
    : [...safeMessages, nextMessage];

  return mergedMessages.sort((first, second) => getMessageTimelineTime(first) - getMessageTimelineTime(second));
};

const getAutoReplyAttemptTime = (attempt = {}) => {
  const rawTime = attempt.createdAt || attempt.updatedAt || attempt.sentAt;
  const time = rawTime ? new Date(rawTime).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
};

const getAutoReplyAttemptKey = (attempt = {}, index = 0) => (
  attempt.id || [
    attempt.conversationId || attempt.conversation_id || '',
    attempt.createdAt || attempt.created_at || '',
    attempt.decision || attempt.status || '',
    attempt.safeReason || attempt.safe_reason || '',
    attempt.sendStatus || attempt.send_status || '',
  ].filter(Boolean).join(':') || `attempt-${index}`
);

const mergeOmnichannelAutoReplyAttempts = (baseAttempts = [], selectedConversationAttempts = []) => {
  const attemptsByKey = new Map();
  [...selectedConversationAttempts, ...baseAttempts]
    .filter(Boolean)
    .forEach((attempt, index) => {
      const key = getAutoReplyAttemptKey(attempt, index);
      if (!attemptsByKey.has(key)) {
        attemptsByKey.set(key, attempt);
      }
    });

  return [...attemptsByKey.values()]
    .sort((first, second) => getAutoReplyAttemptTime(second) - getAutoReplyAttemptTime(first))
    .slice(0, 80);
};

const buildManualReplyMessageForTimeline = ({
  channelId,
  conversationId,
  idempotencyKey = '',
  resultMessage,
  tenantId,
  text,
}) => {
  if (!resultMessage?.id) return null;

  const sentAt = resultMessage.sentAt || resultMessage.createdAt || new Date().toISOString();
  const contentText = resultMessage.contentText || text;

  return {
    id: resultMessage.id,
    idempotencyKey,
    isOptimisticManualReply: false,
    tenant_id: resultMessage.tenant_id || tenantId,
    conversationId: resultMessage.conversationId || conversationId,
    channelId: resultMessage.channelId || channelId,
    contentText,
    createdAt: resultMessage.createdAt || sentAt,
    direction: 'outbound',
    directionLabel: resultMessage.directionLabel || 'Saída registrada',
    mediaAttachment: resultMessage.mediaAttachment || null,
    mediaMetadata: resultMessage.mediaMetadata || null,
    messagePreview: resultMessage.messagePreview || contentText,
    messageType: resultMessage.messageType || 'text',
    messageTypeLabel: resultMessage.messageTypeLabel || 'Texto',
    payloadSummary: resultMessage.payloadSummary || {},
    providerMessageId: resultMessage.providerMessageId || null,
    providerStatus: resultMessage.providerStatus || 'sent',
    receivedAt: null,
    sentAt,
    source: resultMessage.source || 'Supabase',
  };
};

const buildOptimisticManualReplyMessageForTimeline = ({
  channelId,
  conversationId,
  idempotencyKey,
  tenantId,
  text,
}) => {
  const sentAt = new Date().toISOString();
  const contentText = text;

  return {
    id: `manual-reply-pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    idempotencyKey,
    isOptimisticManualReply: true,
    tenant_id: tenantId,
    conversationId,
    channelId,
    contentText,
    createdAt: sentAt,
    direction: 'outbound',
    directionLabel: 'Saída registrada',
    mediaAttachment: null,
    mediaMetadata: null,
    messagePreview: contentText,
    messageType: 'text',
    messageTypeLabel: 'Texto',
    payloadSummary: {},
    providerMessageId: null,
    providerStatus: 'sending',
    receivedAt: null,
    sentAt,
    source: 'Local',
  };
};

const resolveSourceLabel = (...collections) => {
  const sources = collections.flat().map((item) => item?.source).filter(Boolean);
  if (sources.includes('Supabase') && sources.includes('Fallback demo')) return 'Misto';
  if (sources.includes('Supabase')) return 'Supabase';
  if (sources.includes('Fallback demo')) return 'Fallback demo';
  return 'Sem acesso';
};

export const useOmnichannelInbox = ({ enabled = true } = {}) => {
  const { canAccessModule, currentTenantId, hasPermission, user } = useAuth();
  const canReadOmnichannelMessages = enabled
    && canAccessModule('mod_omnichannel')
    && hasPermission('omnichannel.messages.read');
  const canReadOmnichannel = enabled
    && canAccessModule('mod_omnichannel')
    && (hasPermission('omnichannel.read') || canReadOmnichannelMessages);
  const canManage = enabled
    && canAccessModule('mod_omnichannel')
    && (
      hasPermission('omnichannel.manage')
      || hasPermission('omnichannel.messages.manage')
      || hasPermission('omnichannel.conversations.manage')
    );
  const canRecordActivity = enabled
    && canAccessModule('mod_omnichannel')
    && (
      hasPermission('omnichannel.manage')
      || hasPermission('omnichannel.messages.manage')
    );
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [state, setState] = useState(() => ({
    tenantId: currentTenantId,
    ...EMPTY_STATE,
  }));
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversationDetails, setIsLoadingConversationDetails] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [activeQueueFilter, setQueueFilter] = useState('respond_now');
  const [activeChannelFilter, setChannelFilter] = useState('all');
  const [activeSuggestedQueueFilter, setSuggestedQueueFilter] = useState('all');
  const [queueSearch, setQueueSearch] = useState('');
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activityError, setActivityError] = useState(null);
  const [noteError, setNoteError] = useState(null);
  const [sendReplyError, setSendReplyError] = useState(null);
  const [sendReplySuccess, setSendReplySuccess] = useState(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [attendanceAssistantDraft, setAttendanceAssistantDraft] = useState(null);
  const [attendanceAssistantError, setAttendanceAssistantError] = useState(null);
  const [isGeneratingAttendanceAssistantDraft, setIsGeneratingAttendanceAssistantDraft] = useState(false);
  const [attendanceAssistantFeedbackError, setAttendanceAssistantFeedbackError] = useState(null);
  const [isRecordingAttendanceAssistantFeedback, setIsRecordingAttendanceAssistantFeedback] = useState(false);
  const [isSavingTriageResult, setIsSavingTriageResult] = useState(false);
  const [triageResultError, setTriageResultError] = useState(null);
  const [triageResultSuccess, setTriageResultSuccess] = useState(null);
  const [activeCollaborationAction, setActiveCollaborationAction] = useState('');
  const [collaborationFeedback, setCollaborationFeedback] = useState(null);
  const [mediaAccessByMessageId, setMediaAccessByMessageId] = useState({});
  const [mediaAccessError, setMediaAccessError] = useState(null);
  const [activeMediaAccessMessageId, setActiveMediaAccessMessageId] = useState('');
  const [mediaDownloadError, setMediaDownloadError] = useState(null);
  const [mediaDownloadFeedback, setMediaDownloadFeedback] = useState(null);
  const [activeMediaDownloadMessageId, setActiveMediaDownloadMessageId] = useState('');
  const [liveRefreshNotice, setLiveRefreshNotice] = useState(null);
  const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState(null);
  const [conversationLimit, setConversationLimit] = useState(DEFAULT_CONVERSATION_LIMIT);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const mediaObjectUrlsRef = useRef(new Set());
  const stateRef = useRef(state);
  const selectedConversationIdRef = useRef(selectedConversationId);
  const conversationDetailsCacheRef = useRef(new Map());
  const conversationDetailsInFlightRef = useRef(new Map());
  const conversationDetailRequestIdRef = useRef(0);
  const attendanceAssistantRequestIdRef = useRef(0);
  const liveRefreshNoticeTimeoutRef = useRef(null);
  const liveRefreshInFlightRef = useRef(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearLiveRefreshNotice = useCallback(() => {
    if (liveRefreshNoticeTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(liveRefreshNoticeTimeoutRef.current);
    }
    liveRefreshNoticeTimeoutRef.current = null;
    setLiveRefreshNotice(null);
  }, []);

  const showLiveRefreshNotice = useCallback((message) => {
    const safeMessage = String(message || '').trim();
    if (!safeMessage) return;

    if (liveRefreshNoticeTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(liveRefreshNoticeTimeoutRef.current);
    }

    setLiveRefreshNotice({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: safeMessage,
    });

    if (typeof window !== 'undefined') {
      liveRefreshNoticeTimeoutRef.current = window.setTimeout(() => {
        liveRefreshNoticeTimeoutRef.current = null;
        setLiveRefreshNotice(null);
      }, 8_000);
    }
  }, []);

  const revokeMediaObjectUrl = useCallback((objectUrl) => {
    if (!objectUrl || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;

    URL.revokeObjectURL(objectUrl);
    mediaObjectUrlsRef.current.delete(objectUrl);
  }, []);

  const resetMediaState = useCallback(() => {
    setMediaAccessByMessageId((currentAccess) => {
      Object.values(currentAccess || {}).forEach((access) => {
        revokeMediaObjectUrl(access?.objectUrl);
      });

      return {};
    });
    setMediaAccessError(null);
    setMediaDownloadError(null);
    setMediaDownloadFeedback(null);
    setActiveMediaAccessMessageId('');
    setActiveMediaDownloadMessageId('');
  }, [revokeMediaObjectUrl]);

  const buildPreviewMediaAccess = useCallback((access) => {
    if (
      !access?.available
      || !access.blob
      || typeof URL === 'undefined'
      || typeof URL.createObjectURL !== 'function'
    ) {
      return access;
    }

    const objectUrl = URL.createObjectURL(access.blob);
    mediaObjectUrlsRef.current.add(objectUrl);
    const { blob, ...safeAccess } = access;

    return {
      ...safeAccess,
      objectUrl,
    };
  }, []);

  useEffect(() => () => {
    mediaObjectUrlsRef.current.forEach((objectUrl) => {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(objectUrl);
      }
    });
    mediaObjectUrlsRef.current.clear();
    if (liveRefreshNoticeTimeoutRef.current && typeof window !== 'undefined') {
      window.clearTimeout(liveRefreshNoticeTimeoutRef.current);
    }
    liveRefreshNoticeTimeoutRef.current = null;
  }, []);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    attendanceAssistantRequestIdRef.current += 1;
    setAttendanceAssistantDraft(null);
    setAttendanceAssistantError(null);
    setAttendanceAssistantFeedbackError(null);
    setIsGeneratingAttendanceAssistantDraft(false);
    setIsRecordingAttendanceAssistantFeedback(false);
  }, [currentTenantId, selectedConversationId]);

  const clearCollaborationFeedback = useCallback(() => {
    setCollaborationFeedback(null);
  }, []);

  const getConversationDetailsCacheKey = useCallback((conversationId) => (
    currentTenantId && conversationId ? `${currentTenantId}:${conversationId}` : ''
  ), [currentTenantId]);

  const readConversationDetailsCache = useCallback((conversationId) => {
    const cacheKey = getConversationDetailsCacheKey(conversationId);
    if (!cacheKey) return null;

    const cached = conversationDetailsCacheRef.current.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.cachedAt > CONVERSATION_DETAIL_CACHE_TTL_MS) {
      conversationDetailsCacheRef.current.delete(cacheKey);
      return null;
    }

    return cached.details;
  }, [getConversationDetailsCacheKey]);

  const writeConversationDetailsCache = useCallback((conversationId, details) => {
    const cacheKey = getConversationDetailsCacheKey(conversationId);
    if (!cacheKey) return null;

    const normalizedDetails = normalizeConversationDetails(details);
    conversationDetailsCacheRef.current.set(cacheKey, {
      cachedAt: Date.now(),
      details: normalizedDetails,
    });

    return normalizedDetails;
  }, [getConversationDetailsCacheKey]);

  const updateConversationDetailsCache = useCallback((conversationId, patch = {}) => {
    const currentDetails = readConversationDetailsCache(conversationId);
    if (!currentDetails) return null;

    return writeConversationDetailsCache(conversationId, {
      ...currentDetails,
      ...patch,
    });
  }, [readConversationDetailsCache, writeConversationDetailsCache]);

  const applyConversationDetails = useCallback((conversationId, details, { active = () => true, requestId = null } = {}) => {
    const normalizedDetails = normalizeConversationDetails(details);

    setState((previousState) => {
      if (
        !active()
        || previousState.tenantId !== currentTenantId
        || previousState.selectedConversation?.id !== conversationId
        || (requestId && requestId !== conversationDetailRequestIdRef.current)
      ) {
        return previousState;
      }

      const nextTriageResultsByConversation = {
        ...previousState.triageResultsByConversation,
      };

      if (normalizedDetails.triageResult) {
        nextTriageResultsByConversation[conversationId] = normalizedDetails.triageResult;
      } else {
        delete nextTriageResultsByConversation[conversationId];
      }

      return {
        ...previousState,
        activitiesByConversation: {
          ...previousState.activitiesByConversation,
          [conversationId]: normalizedDetails.activities,
        },
        autoReplyAttempts: mergeOmnichannelAutoReplyAttempts(
          previousState.autoReplyAttempts,
          normalizedDetails.autoReplyAttempts,
        ),
        events: normalizedDetails.events,
        internalNotes: normalizedDetails.internalNotes,
        messages: normalizedDetails.messages,
        selectedConversationTriageResult: normalizedDetails.triageResult,
        triageResultsByConversation: nextTriageResultsByConversation,
      };
    });

    return normalizedDetails;
  }, [currentTenantId]);

  const fetchConversationDetails = useCallback((conversationId) => {
    const resolvedConversationId = String(conversationId || '').trim();
    if (!currentTenantId || !resolvedConversationId) {
      return Promise.resolve(EMPTY_CONVERSATION_DETAILS);
    }

    const cacheKey = getConversationDetailsCacheKey(resolvedConversationId);
    const inFlight = conversationDetailsInFlightRef.current.get(cacheKey);
    if (inFlight) return inFlight;

    const request = Promise.all([
      listOmnichannelMessagesByConversation(currentTenantId, resolvedConversationId),
      listOmnichannelConversationEvents(currentTenantId, resolvedConversationId),
      listOmnichannelInternalNotes(currentTenantId, resolvedConversationId),
      getOmnichannelConversationTriageResult(currentTenantId, resolvedConversationId),
      listOmnichannelConversationActivities(currentTenantId, resolvedConversationId),
      listOmnichannelAutoReplyAttempts(currentTenantId, {
        conversationId: resolvedConversationId,
        limit: 8,
      }),
    ])
      .then(([messages, events, internalNotes, triageResult, activities, autoReplyAttempts]) => (
        writeConversationDetailsCache(resolvedConversationId, {
          activities,
          autoReplyAttempts,
          events,
          internalNotes,
          messages,
          triageResult,
        })
      ))
      .finally(() => {
        conversationDetailsInFlightRef.current.delete(cacheKey);
      });

    conversationDetailsInFlightRef.current.set(cacheKey, request);
    return request;
  }, [currentTenantId, getConversationDetailsCacheKey, writeConversationDetailsCache]);

  const loadConversationDetails = useCallback(async (conversationId, {
    active = () => true,
    preferCache = true,
  } = {}) => {
    const resolvedConversationId = String(conversationId || '').trim();
    if (!resolvedConversationId || !currentTenantId) {
      return EMPTY_CONVERSATION_DETAILS;
    }

    const requestId = conversationDetailRequestIdRef.current + 1;
    conversationDetailRequestIdRef.current = requestId;

    const cachedDetails = preferCache ? readConversationDetailsCache(resolvedConversationId) : null;
    if (cachedDetails) {
      if (active()) {
        setIsLoadingConversationDetails(false);
        applyConversationDetails(resolvedConversationId, cachedDetails, { active, requestId });
      }
      return cachedDetails;
    }

    if (active()) {
      setIsLoadingConversationDetails(true);
    }

    try {
      const details = await fetchConversationDetails(resolvedConversationId);
      if (active() && requestId === conversationDetailRequestIdRef.current) {
        applyConversationDetails(resolvedConversationId, details, { active, requestId });
      }
      return details;
    } catch {
      if (active() && requestId === conversationDetailRequestIdRef.current) {
        setError('Não foi possível atualizar a conversa selecionada.');
      }
      return EMPTY_CONVERSATION_DETAILS;
    } finally {
      if (active() && requestId === conversationDetailRequestIdRef.current) {
        setIsLoadingConversationDetails(false);
      }
    }
  }, [
    applyConversationDetails,
    currentTenantId,
    fetchConversationDetails,
    readConversationDetailsCache,
  ]);

  const loadInbox = useCallback(async ({
    active = () => true,
    forceSelectedConversationDetails = false,
    markBackgroundUpdate = false,
    silent = false,
  } = {}) => {
    if (!canReadOmnichannel || !currentTenantId) {
      if (active()) {
        conversationDetailsCacheRef.current.clear();
        conversationDetailsInFlightRef.current.clear();
        conversationDetailRequestIdRef.current += 1;
        setState({
          tenantId: currentTenantId,
          ...EMPTY_STATE,
        });
        setSelectedConversationId(null);
        selectedConversationIdRef.current = null;
        setIsLoading(false);
        setIsLoadingConversationDetails(false);
        setError(null);
        setActionError(null);
        setActivityError(null);
        setSendReplyError(null);
        setSendReplySuccess(null);
        setTriageResultError(null);
        setTriageResultSuccess(null);
        setActiveCollaborationAction('');
        setCollaborationFeedback(null);
        setLiveRefreshNotice(null);
        setIsLiveRefreshing(false);
        setLastRefreshAt(null);
        resetMediaState();
      }

      return EMPTY_STATE;
    }

    if (!silent) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [channels, conversations, channelStatus, triageSettingsList, triageFlows, triageIntents, autoReplyAttempts] = await Promise.all([
        listOmnichannelChannels(currentTenantId),
        listOmnichannelConversations(currentTenantId, {
          limit: conversationLimit,
        }),
        getOmnichannelChannelStatus(currentTenantId),
        listOmnichannelTriageSettings(currentTenantId),
        listOmnichannelTriageFlows(currentTenantId),
        listOmnichannelTriageIntents(currentTenantId),
        listOmnichannelAutoReplyAttempts(currentTenantId),
      ]);
      const triageSettings = triageSettingsList[0] || null;
      const activeTriageFlow = triageFlows.find((flow) => flow.status === 'active')
        || triageFlows[0]
        || null;
      const triageQuestions = activeTriageFlow
        ? await listOmnichannelTriageQuestions(currentTenantId, activeTriageFlow.id)
        : await listOmnichannelTriageQuestions(currentTenantId);
      const selectedConversationIdBeforeLoad = selectedConversationIdRef.current;
      const nextSelectedConversation = conversations.find((conversation) => conversation.id === selectedConversationIdBeforeLoad)
        || conversations[0]
        || null;
      let selectedConversationDetails = null;
      if (nextSelectedConversation) {
        try {
          selectedConversationDetails = (
            forceSelectedConversationDetails
              ? null
              : readConversationDetailsCache(nextSelectedConversation.id)
          ) || await fetchConversationDetails(nextSelectedConversation.id);
        } catch {
          selectedConversationDetails = readConversationDetailsCache(nextSelectedConversation.id);
        }
      }
      const conversationIds = conversations.map((conversation) => conversation.id);
      const [triageResultsByConversation, activitiesByConversation] = await Promise.all([
        listOmnichannelConversationTriageResults(currentTenantId, conversationIds),
        listOmnichannelConversationActivitiesBatch(currentTenantId, conversationIds),
      ]);

      if (active()) {
        setHasMoreConversations(
          conversations.length >= conversationLimit
          && conversationLimit < MAX_CONVERSATION_LIMIT,
        );
        const selectedConversationIdAtApply = selectedConversationIdRef.current;
        const selectedConversationForState = conversations.find((conversation) => conversation.id === selectedConversationIdAtApply)
          || nextSelectedConversation
          || null;
        const shouldApplyFetchedDetails = !selectedConversationForState
          || selectedConversationForState.id === nextSelectedConversation?.id;
        const cachedDetailsForCurrentSelection = selectedConversationForState
          ? readConversationDetailsCache(selectedConversationForState.id)
          : null;
        const detailsForState = shouldApplyFetchedDetails
          ? selectedConversationDetails
          : cachedDetailsForCurrentSelection;
        const nextSelectedConversationId = selectedConversationForState?.id || null;
        const previousState = stateRef.current;
        const previousSelectedDetails = previousState.tenantId === currentTenantId
          && previousState.selectedConversation?.id
          && previousState.selectedConversation.id === selectedConversationForState?.id
          ? {
            activities: previousState.activitiesByConversation?.[selectedConversationForState.id] || [],
            events: previousState.events,
            internalNotes: previousState.internalNotes,
            messages: previousState.messages,
            triageResult: previousState.selectedConversationTriageResult,
          }
          : null;
        const shouldShowLiveRefreshNotice = Boolean(
          markBackgroundUpdate
          && previousSelectedDetails
          && detailsForState
          && buildConversationLiveFingerprint(previousSelectedDetails) !== buildConversationLiveFingerprint(detailsForState),
        );
        const liveRefreshNoticeMessage = shouldShowLiveRefreshNotice
          ? hasNewMessageInDetails(previousSelectedDetails, detailsForState)
            ? 'Nova mensagem recebida.'
            : 'Leitura atualizada.'
          : '';

        selectedConversationIdRef.current = nextSelectedConversationId;
        setSelectedConversationId(nextSelectedConversationId);

        setState((previousState) => {
          const canPreservePreviousDetails = previousState.tenantId === currentTenantId && Boolean(selectedConversationForState);
          const nextActivitiesByConversation = {
            ...activitiesByConversation,
          };
          const nextTriageResultsByConversation = {
            ...triageResultsByConversation,
          };

          if (detailsForState && selectedConversationForState) {
            nextActivitiesByConversation[selectedConversationForState.id] = detailsForState.activities;

            if (detailsForState.triageResult) {
              nextTriageResultsByConversation[selectedConversationForState.id] = detailsForState.triageResult;
            } else {
              delete nextTriageResultsByConversation[selectedConversationForState.id];
            }
          }
          const nextAutoReplyAttempts = mergeOmnichannelAutoReplyAttempts(
            autoReplyAttempts,
            detailsForState?.autoReplyAttempts || [],
          );

          return {
            tenantId: currentTenantId,
            activitiesByConversation: nextActivitiesByConversation,
            autoReplyAttempts: nextAutoReplyAttempts,
            channels,
            channelStatus,
            conversations,
            events: detailsForState
              ? detailsForState.events
              : canPreservePreviousDetails ? previousState.events : EMPTY_STATE.events,
            internalNotes: detailsForState
              ? detailsForState.internalNotes
              : canPreservePreviousDetails ? previousState.internalNotes : EMPTY_STATE.internalNotes,
            messages: detailsForState
              ? detailsForState.messages
              : canPreservePreviousDetails ? previousState.messages : EMPTY_STATE.messages,
            selectedConversation: selectedConversationForState,
            selectedConversationTriageResult: detailsForState
              ? detailsForState.triageResult
              : canPreservePreviousDetails ? previousState.selectedConversationTriageResult : null,
            triageResultsByConversation: nextTriageResultsByConversation,
            triageFlows,
            triageIntents,
            triageQuestions,
            triageSettings,
          };
        });

        if (selectedConversationForState?.id && !detailsForState) {
          void loadConversationDetails(selectedConversationForState.id, { active, preferCache: true });
        }

        if (liveRefreshNoticeMessage) {
          showLiveRefreshNotice(liveRefreshNoticeMessage);
        }

        setLastRefreshAt(new Date().toISOString());
      }

      return {
        channels,
        channelStatus,
        conversations,
        activitiesByConversation,
        autoReplyAttempts: mergeOmnichannelAutoReplyAttempts(
          autoReplyAttempts,
          selectedConversationDetails?.autoReplyAttempts || [],
        ),
        messages: selectedConversationDetails?.messages || [],
        events: selectedConversationDetails?.events || [],
        internalNotes: selectedConversationDetails?.internalNotes || [],
        selectedConversation: nextSelectedConversation,
        selectedConversationTriageResult: selectedConversationDetails?.triageResult || null,
        triageResultsByConversation,
        triageFlows,
        triageIntents,
        triageQuestions,
        triageSettings,
      };
    } catch {
      if (active()) {
        setState({
          tenantId: currentTenantId,
          ...EMPTY_STATE,
        });
        setError('Não foi possível carregar a fundação omnichannel para este tenant.');
      }

      return EMPTY_STATE;
    } finally {
      if (active()) {
        setIsLoading(false);
      }
    }
  }, [
    canReadOmnichannel,
    currentTenantId,
    conversationLimit,
    fetchConversationDetails,
    loadConversationDetails,
    readConversationDetailsCache,
    resetMediaState,
    showLiveRefreshNotice,
  ]);

  useEffect(() => {
    let active = true;

    loadInbox({ active: () => active });

    return () => {
      active = false;
    };
  }, [loadInbox]);

  const selectConversation = useCallback((conversationId) => {
    const resolvedConversationId = conversationId || null;
    const cachedDetails = resolvedConversationId
      ? readConversationDetailsCache(resolvedConversationId)
      : null;

    selectedConversationIdRef.current = resolvedConversationId;
    setSelectedConversationId(resolvedConversationId);
    setActionError(null);
    setActivityError(null);
    setNoteError(null);
    setSendReplyError(null);
    setSendReplySuccess(null);
    setTriageResultError(null);
    setTriageResultSuccess(null);
    setActiveCollaborationAction('');
    setCollaborationFeedback(null);
    clearLiveRefreshNotice();
    resetMediaState();

    setState((previousState) => {
      if (previousState.tenantId !== currentTenantId) {
        return previousState;
      }

      if (!resolvedConversationId) {
        return {
          ...previousState,
          events: [],
          internalNotes: [],
          messages: [],
          selectedConversation: null,
          selectedConversationTriageResult: null,
        };
      }

      const selectedConversation = previousState.conversations.find((conversation) => conversation.id === resolvedConversationId)
        || previousState.selectedConversation;

      if (!cachedDetails) {
        return {
          ...previousState,
          selectedConversation,
        };
      }

      const nextTriageResultsByConversation = {
        ...previousState.triageResultsByConversation,
      };

      if (cachedDetails.triageResult) {
        nextTriageResultsByConversation[resolvedConversationId] = cachedDetails.triageResult;
      } else {
        delete nextTriageResultsByConversation[resolvedConversationId];
      }

      return {
        ...previousState,
        activitiesByConversation: {
          ...previousState.activitiesByConversation,
          [resolvedConversationId]: cachedDetails.activities,
        },
        events: cachedDetails.events,
        internalNotes: cachedDetails.internalNotes,
        messages: cachedDetails.messages,
        selectedConversation,
        selectedConversationTriageResult: cachedDetails.triageResult,
        triageResultsByConversation: nextTriageResultsByConversation,
      };
    });

    if (resolvedConversationId) {
      void loadConversationDetails(resolvedConversationId, { preferCache: true });
    } else {
      setIsLoadingConversationDetails(false);
    }
  }, [
    currentTenantId,
    clearLiveRefreshNotice,
    loadConversationDetails,
    readConversationDetailsCache,
    resetMediaState,
  ]);

  const refresh = useCallback(() => loadInbox(), [loadInbox]);
  const refreshLive = useCallback(() => {
    if (liveRefreshInFlightRef.current) {
      return liveRefreshInFlightRef.current;
    }

    setIsLiveRefreshing(true);
    const request = loadInbox({
      forceSelectedConversationDetails: true,
      markBackgroundUpdate: true,
      silent: true,
    }).finally(() => {
      if (liveRefreshInFlightRef.current === request) {
        liveRefreshInFlightRef.current = null;
        setIsLiveRefreshing(false);
      }
    });

    liveRefreshInFlightRef.current = request;
    return request;
  }, [loadInbox]);
  const refreshQueue = useCallback(() => loadInbox({ silent: true }), [loadInbox]);
  const loadMoreConversations = useCallback(() => {
    setConversationLimit((currentLimit) => (
      Math.min(currentLimit + CONVERSATION_LIMIT_STEP, MAX_CONVERSATION_LIMIT)
    ));
  }, []);

  const requestMessageMediaAccess = useCallback(async (messageId) => {
    const resolvedMessageId = String(messageId || '').trim();

    if (!canReadOmnichannel) {
      const permissionError = new Error('Perfil sem permissão para visualizar mídia Omnichannel.');
      setMediaAccessError(permissionError.message);
      throw permissionError;
    }

    if (!currentTenantId || !resolvedMessageId) {
      const missingContextError = new Error('Mídia indisponível para esta conversa.');
      setMediaAccessError(missingContextError.message);
      throw missingContextError;
    }

    setActiveMediaAccessMessageId(resolvedMessageId);
    setMediaAccessError(null);

    try {
      const access = buildPreviewMediaAccess(
        await getOmnichannelMessageMediaAccess(currentTenantId, resolvedMessageId, { mode: 'inline' }),
      );
      setMediaAccessByMessageId((currentAccess) => {
        revokeMediaObjectUrl(currentAccess?.[resolvedMessageId]?.objectUrl);

        return {
          ...currentAccess,
          [resolvedMessageId]: access,
        };
      });
      return access;
    } catch (mediaFailure) {
      const message = mediaFailure?.message || 'Não foi possível abrir a mídia segura.';
      setMediaAccessError(message);
      throw mediaFailure;
    } finally {
      setActiveMediaAccessMessageId('');
    }
  }, [buildPreviewMediaAccess, canReadOmnichannel, currentTenantId, revokeMediaObjectUrl]);

  const downloadMessageMedia = useCallback(async (messageId) => {
    const resolvedMessageId = String(messageId || '').trim();

    if (!canReadOmnichannel) {
      const permissionError = new Error('Perfil sem permissão para baixar mídia Omnichannel.');
      setMediaDownloadError(permissionError.message);
      throw permissionError;
    }

    if (
      !currentTenantId
      || !resolvedMessageId
      || typeof document === 'undefined'
      || typeof URL === 'undefined'
      || typeof URL.createObjectURL !== 'function'
    ) {
      const missingContextError = new Error('Download seguro indisponível para esta conversa.');
      setMediaDownloadError(missingContextError.message);
      throw missingContextError;
    }

    setActiveMediaDownloadMessageId(resolvedMessageId);
    setMediaDownloadError(null);
    setMediaDownloadFeedback(null);

    try {
      const access = await getOmnichannelMessageMediaAccess(currentTenantId, resolvedMessageId, { mode: 'download' });
      if (!access?.available || !access.blob) {
        throw new Error('Mídia segura indisponível para download.');
      }

      const objectUrl = URL.createObjectURL(access.blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = access.filename || 'arquivo-recebido.bin';
      anchor.rel = 'noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 0);
      setMediaDownloadFeedback('Download seguro preparado pelo proxy.');
      return access;
    } catch (mediaFailure) {
      const message = mediaFailure?.message || 'Não foi possível baixar a mídia segura.';
      setMediaDownloadError(message);
      throw mediaFailure;
    } finally {
      setActiveMediaDownloadMessageId('');
    }
  }, [canReadOmnichannel, currentTenantId]);

  const applyUpdatedConversation = useCallback((updatedConversation) => {
    if (!updatedConversation?.id) return null;

    setState((previousState) => {
      if (previousState.tenantId !== currentTenantId) {
        return previousState;
      }

      return {
        ...previousState,
        conversations: previousState.conversations.map((conversation) => (
          conversation.id === updatedConversation.id ? updatedConversation : conversation
        )),
        selectedConversation: previousState.selectedConversation?.id === updatedConversation.id
          ? updatedConversation
          : previousState.selectedConversation,
      };
    });

    return updatedConversation;
  }, [currentTenantId]);

  const runTriageAction = useCallback(async (action, {
    actionKey = OMNICHANNEL_COLLABORATION_ACTIONS.triage,
    successMessage = 'Atendimento atualizado.',
  } = {}) => {
    if (!canManage) {
      const permissionError = new Error('Perfil sem permissão para gerenciar a triagem Omnichannel.');
      setActionError(permissionError.message);
      setCollaborationFeedback({
        actionId: actionKey,
        message: permissionError.message,
        type: 'error',
      });
      throw permissionError;
    }

    if (!currentTenantId) {
      const tenantError = new Error('Tenant clínico não encontrado para a triagem Omnichannel.');
      setActionError(tenantError.message);
      setCollaborationFeedback({
        actionId: actionKey,
        message: tenantError.message,
        type: 'error',
      });
      throw tenantError;
    }

    setIsMutating(true);
    setActiveCollaborationAction(actionKey);
    setActionError(null);
    setCollaborationFeedback(null);

    try {
      const updatedConversation = await action();
      applyUpdatedConversation(updatedConversation);
      setCollaborationFeedback({
        actionId: actionKey,
        message: successMessage,
        type: 'success',
      });
      return updatedConversation;
    } catch (actionFailure) {
      const message = actionFailure?.message || 'Não foi possível salvar a triagem Omnichannel.';
      setActionError(message);
      setCollaborationFeedback({
        actionId: actionKey,
        message,
        type: 'error',
      });
      throw actionFailure;
    } finally {
      setIsMutating(false);
      setActiveCollaborationAction('');
    }
  }, [applyUpdatedConversation, canManage, currentTenantId]);

  const getSelectedConversationId = useCallback(() => {
    const conversationId = state.tenantId === currentTenantId ? state.selectedConversation?.id : null;

    if (!conversationId) {
      throw new Error('Selecione uma conversa antes de alterar a triagem.');
    }

    return conversationId;
  }, [currentTenantId, state.selectedConversation?.id, state.tenantId]);

  const refreshActivities = useCallback(async (conversationId = null) => {
    const resolvedConversationId = conversationId || getSelectedConversationId();
    const activities = await listOmnichannelConversationActivities(currentTenantId, resolvedConversationId);
    updateConversationDetailsCache(resolvedConversationId, { activities });

    setState((previousState) => {
      if (previousState.tenantId !== currentTenantId) {
        return previousState;
      }

      return {
        ...previousState,
        activitiesByConversation: {
          ...previousState.activitiesByConversation,
          [resolvedConversationId]: activities,
        },
      };
    });

    return activities;
  }, [currentTenantId, getSelectedConversationId, updateConversationDetailsCache]);

  const refreshSelectedConversationDetails = useCallback(async (conversationId = null) => {
    const resolvedConversationId = conversationId || getSelectedConversationId();
    const [events, internalNotes] = await Promise.all([
      listOmnichannelConversationEvents(currentTenantId, resolvedConversationId),
      listOmnichannelInternalNotes(currentTenantId, resolvedConversationId),
    ]);
    updateConversationDetailsCache(resolvedConversationId, { events, internalNotes });

    setState((previousState) => {
      if (previousState.tenantId !== currentTenantId || previousState.selectedConversation?.id !== resolvedConversationId) {
        return previousState;
      }

      return {
        ...previousState,
        events,
        internalNotes,
      };
    });

    return {
      events,
      internalNotes,
    };
  }, [currentTenantId, getSelectedConversationId, updateConversationDetailsCache]);

  const applyManualReplyMessageToState = useCallback((conversationId, message) => {
    if (!conversationId || !message?.id) return;

    const currentDetails = readConversationDetailsCache(conversationId);
    if (currentDetails) {
      writeConversationDetailsCache(conversationId, {
        ...currentDetails,
        messages: mergeConversationMessages(currentDetails.messages, message),
      });
    }

    setState((previousState) => {
      if (previousState.tenantId !== currentTenantId) {
        return previousState;
      }

      const messageTime = message.sentAt || message.createdAt || new Date().toISOString();
      const messagePreview = message.messagePreview || message.contentText || 'Saída registrada no atendimento.';
      const patchConversation = (conversation) => (
        conversation?.id === conversationId
          ? {
            ...conversation,
            lastHandledAt: messageTime,
            lastMessageAt: messageTime,
            latestMessagePreview: messagePreview,
            latestMessageType: message.messageType || 'text',
            latestMessageTypeLabel: message.messageTypeLabel || 'Texto',
            updatedAt: messageTime,
          }
          : conversation
      );

      return {
        ...previousState,
        conversations: previousState.conversations.map(patchConversation),
        messages: previousState.selectedConversation?.id === conversationId
          ? mergeConversationMessages(previousState.messages, message)
          : previousState.messages,
        selectedConversation: previousState.selectedConversation?.id === conversationId
          ? patchConversation(previousState.selectedConversation)
          : previousState.selectedConversation,
      };
    });
  }, [currentTenantId, readConversationDetailsCache, writeConversationDetailsCache]);

  const removeOptimisticManualReplyMessageFromState = useCallback((conversationId, idempotencyKey) => {
    if (!conversationId || !idempotencyKey) return;

    const removeOptimisticMessage = (messages = []) => (
      Array.isArray(messages)
        ? messages.filter((message) => !(
          message.idempotencyKey === idempotencyKey
          && message.isOptimisticManualReply
        ))
        : []
    );

    const currentDetails = readConversationDetailsCache(conversationId);
    if (currentDetails) {
      writeConversationDetailsCache(conversationId, {
        ...currentDetails,
        messages: removeOptimisticMessage(currentDetails.messages),
      });
    }

    setState((previousState) => {
      if (previousState.tenantId !== currentTenantId || previousState.selectedConversation?.id !== conversationId) {
        return previousState;
      }

      return {
        ...previousState,
        messages: removeOptimisticMessage(previousState.messages),
      };
    });
  }, [currentTenantId, readConversationDetailsCache, writeConversationDetailsCache]);

  const runActivityAction = useCallback(async (action) => {
    if (!canRecordActivity) {
      const permissionError = new Error('Perfil sem permissão para registrar retorno manual Omnichannel.');
      setActivityError(permissionError.message);
      throw permissionError;
    }

    if (!currentTenantId) {
      const tenantError = new Error('Tenant clínico não encontrado para o histórico operacional Omnichannel.');
      setActivityError(tenantError.message);
      throw tenantError;
    }

    const conversationId = getSelectedConversationId();
    setIsSavingActivity(true);
    setActivityError(null);

    try {
      const result = await action(conversationId);
      if (result?.conversation) {
        applyUpdatedConversation(result.conversation);
      }
      await refreshActivities(conversationId);
      await loadInbox({ silent: true });
      return result;
    } catch (activityFailure) {
      const message = activityFailure?.message || 'Não foi possível salvar o histórico operacional Omnichannel.';
      setActivityError(message);
      throw activityFailure;
    } finally {
      setIsSavingActivity(false);
    }
  }, [applyUpdatedConversation, canRecordActivity, currentTenantId, getSelectedConversationId, loadInbox, refreshActivities]);

  const addActivity = useCallback((activityInput) => (
    runActivityAction((conversationId) => addOmnichannelConversationActivity(currentTenantId, conversationId, activityInput))
  ), [currentTenantId, runActivityAction]);

  const scheduleNextAction = useCallback((nextActionAt, noteText = '') => (
    runActivityAction((conversationId) => scheduleOmnichannelConversationNextAction(currentTenantId, conversationId, nextActionAt, noteText))
  ), [currentTenantId, runActivityAction]);

  const markResolved = useCallback((noteText = '') => (
    runActivityAction((conversationId) => markOmnichannelConversationResolved(currentTenantId, conversationId, noteText))
  ), [currentTenantId, runActivityAction]);

  const reopenConversation = useCallback((noteText = '') => (
    runActivityAction((conversationId) => reopenOmnichannelConversation(currentTenantId, conversationId, noteText))
  ), [currentTenantId, runActivityAction]);

  const updateStatus = useCallback((status) => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => updateOmnichannelConversationStatus(currentTenantId, conversationId, status),
      {
        actionKey: OMNICHANNEL_COLLABORATION_ACTIONS.updateStatus,
        successMessage: 'Status atualizado',
      },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const updatePriority = useCallback((priority) => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => updateOmnichannelConversationPriority(currentTenantId, conversationId, priority),
      {
        actionKey: OMNICHANNEL_COLLABORATION_ACTIONS.updatePriority,
        successMessage: 'Prioridade atualizada',
      },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const linkPatient = useCallback((patientId) => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => linkOmnichannelConversationToPatient(currentTenantId, conversationId, patientId),
      { successMessage: 'Vínculo CRM atualizado' },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const linkLead = useCallback((leadId) => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => linkOmnichannelConversationToLead(currentTenantId, conversationId, leadId),
      { successMessage: 'Vínculo CRM atualizado' },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const unlinkContext = useCallback(() => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => unlinkOmnichannelConversationContext(currentTenantId, conversationId),
      { successMessage: 'Vínculo CRM removido' },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const assignToMe = useCallback(() => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => assignOmnichannelConversationToMe(currentTenantId, conversationId),
      {
        actionKey: OMNICHANNEL_COLLABORATION_ACTIONS.assign,
        successMessage: 'Atendimento assumido',
      },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const unassignConversation = useCallback(() => {
    const conversationId = getSelectedConversationId();
    return runTriageAction(
      () => unassignOmnichannelConversation(currentTenantId, conversationId),
      {
        actionKey: OMNICHANNEL_COLLABORATION_ACTIONS.unassign,
        successMessage: 'Responsável removido',
      },
    );
  }, [currentTenantId, getSelectedConversationId, runTriageAction]);

  const markSelectedConversationRead = useCallback(async () => {
    if (!canReadOmnichannel) {
      const permissionError = new Error('Perfil sem permissão para marcar conversa como lida.');
      setActionError(permissionError.message);
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.markRead,
        message: permissionError.message,
        type: 'error',
      });
      throw permissionError;
    }

    const conversationId = getSelectedConversationId();
    setActiveCollaborationAction(OMNICHANNEL_COLLABORATION_ACTIONS.markRead);
    setActionError(null);
    setCollaborationFeedback(null);

    try {
      await markOmnichannelConversationRead(currentTenantId, conversationId);
      await loadInbox({ silent: true });
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.markRead,
        message: 'Conversa marcada como lida',
        type: 'success',
      });
    } catch (readFailure) {
      const message = readFailure?.message || 'Não foi possível marcar a conversa como lida.';
      setActionError(message);
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.markRead,
        message,
        type: 'error',
      });
      throw readFailure;
    } finally {
      setActiveCollaborationAction('');
    }
  }, [canReadOmnichannel, currentTenantId, getSelectedConversationId, loadInbox]);

  const generateAttendanceAssistantDraft = useCallback(async () => {
    if (!canReadOmnichannel) {
      const permissionError = new Error('Perfil sem permissão para gerar sugestão segura.');
      setAttendanceAssistantError(permissionError.message);
      throw permissionError;
    }

    if (!currentTenantId) {
      const tenantError = new Error('Tenant clínico não encontrado para o assistente.');
      setAttendanceAssistantError(tenantError.message);
      throw tenantError;
    }

    const conversationId = getSelectedConversationId();
    if (!conversationId) {
      const conversationError = new Error('Selecione uma conversa antes de gerar sugestão.');
      setAttendanceAssistantError(conversationError.message);
      throw conversationError;
    }

    const requestId = attendanceAssistantRequestIdRef.current + 1;
    attendanceAssistantRequestIdRef.current = requestId;
    setIsGeneratingAttendanceAssistantDraft(true);
    setAttendanceAssistantError(null);

    try {
      const draft = await generateOmnichannelAttendanceAssistantDraft(currentTenantId, conversationId);

      if (attendanceAssistantRequestIdRef.current === requestId) {
        setAttendanceAssistantDraft(draft);
      }

      return draft;
    } catch (assistantFailure) {
      const message = assistantFailure?.message || 'Não foi possível atualizar a sugestão segura. Usando sugestão local.';

      if (attendanceAssistantRequestIdRef.current === requestId) {
        setAttendanceAssistantError(message);
        setAttendanceAssistantDraft(null);
      }

      throw assistantFailure;
    } finally {
      if (attendanceAssistantRequestIdRef.current === requestId) {
        setIsGeneratingAttendanceAssistantDraft(false);
      }
    }
  }, [canReadOmnichannel, currentTenantId, getSelectedConversationId]);

  const recordAttendanceAssistantFeedback = useCallback(async (input = {}) => {
    if (!canReadOmnichannel) {
      const permissionError = new Error('Perfil sem permissão para registrar feedback do assistente.');
      setAttendanceAssistantFeedbackError(permissionError.message);
      throw permissionError;
    }

    if (!currentTenantId) {
      const tenantError = new Error('Tenant clínico não encontrado para o feedback do assistente.');
      setAttendanceAssistantFeedbackError(tenantError.message);
      throw tenantError;
    }

    const conversationId = getSelectedConversationId();
    if (!conversationId) {
      const conversationError = new Error('Selecione uma conversa antes de registrar feedback.');
      setAttendanceAssistantFeedbackError(conversationError.message);
      throw conversationError;
    }

    setIsRecordingAttendanceAssistantFeedback(true);
    setAttendanceAssistantFeedbackError(null);

    try {
      return await recordOmnichannelAttendanceAssistantFeedback(currentTenantId, conversationId, input);
    } catch (feedbackFailure) {
      const message = feedbackFailure?.message || 'Não foi possível registrar o feedback do assistente.';
      setAttendanceAssistantFeedbackError(message);
      throw feedbackFailure;
    } finally {
      setIsRecordingAttendanceAssistantFeedback(false);
    }
  }, [canReadOmnichannel, currentTenantId, getSelectedConversationId]);

  const addInternalNote = useCallback(async (body) => {
    if (!canManage) {
      const permissionError = new Error('Perfil sem permissão para criar nota interna.');
      setNoteError(permissionError.message);
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.addNote,
        message: permissionError.message,
        type: 'error',
      });
      throw permissionError;
    }

    if (!currentTenantId) {
      const tenantError = new Error('Tenant clínico não encontrado para nota interna.');
      setNoteError(tenantError.message);
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.addNote,
        message: tenantError.message,
        type: 'error',
      });
      throw tenantError;
    }

    const conversationId = getSelectedConversationId();
    setIsSavingNote(true);
    setActiveCollaborationAction(OMNICHANNEL_COLLABORATION_ACTIONS.addNote);
    setNoteError(null);
    setCollaborationFeedback(null);

    try {
      const note = await addOmnichannelInternalNote(currentTenantId, conversationId, body);
      await refreshSelectedConversationDetails(conversationId);
      await refreshActivities(conversationId);
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.addNote,
        message: 'Nota interna salva — não enviada ao WhatsApp',
        type: 'success',
      });
      return note;
    } catch (noteFailure) {
      const message = noteFailure?.message || 'Não foi possível salvar a nota interna.';
      setNoteError(message);
      setCollaborationFeedback({
        actionId: OMNICHANNEL_COLLABORATION_ACTIONS.addNote,
        message,
        type: 'error',
      });
      throw noteFailure;
    } finally {
      setIsSavingNote(false);
      setActiveCollaborationAction('');
    }
  }, [canManage, currentTenantId, getSelectedConversationId, refreshActivities, refreshSelectedConversationDetails]);

  const saveConversationTriageResult = useCallback(async (input = {}) => {
    if (!canManage) {
      const permissionError = new Error('Perfil sem permissão para salvar resultado de triagem.');
      setTriageResultError(permissionError.message);
      throw permissionError;
    }

    if (!currentTenantId) {
      const tenantError = new Error('Tenant clínico não encontrado para resultado de triagem.');
      setTriageResultError(tenantError.message);
      throw tenantError;
    }

    const conversationId = getSelectedConversationId();
    setIsSavingTriageResult(true);
    setTriageResultError(null);
    setTriageResultSuccess(null);

    try {
      const triageResult = await upsertOmnichannelConversationTriageResult(currentTenantId, conversationId, input);
      updateConversationDetailsCache(conversationId, { triageResult });
      setState((previousState) => {
        if (previousState.tenantId !== currentTenantId || previousState.selectedConversation?.id !== conversationId) {
          return previousState;
        }

        return {
          ...previousState,
          selectedConversationTriageResult: triageResult,
          triageResultsByConversation: {
            ...previousState.triageResultsByConversation,
            [conversationId]: triageResult,
          },
        };
      });
      await refreshActivities(conversationId);
      setTriageResultSuccess('Resultado de triagem salvo — não enviado ao WhatsApp');
      return triageResult;
    } catch (triageFailure) {
      const message = triageFailure?.message || 'Não foi possível salvar o resultado de triagem.';
      setTriageResultError(message);
      throw triageFailure;
    } finally {
      setIsSavingTriageResult(false);
    }
  }, [canManage, currentTenantId, getSelectedConversationId, refreshActivities, updateConversationDetailsCache]);

  const manualReplyWindowState = useMemo(() => buildOmnichannelManualReplyWindowState({
    canManage,
    channelStatus: state.channelStatus,
    currentTenantId,
    messages: state.tenantId === currentTenantId ? state.messages : [],
    selectedConversation: state.tenantId === currentTenantId ? state.selectedConversation : null,
  }), [canManage, currentTenantId, state.channelStatus, state.messages, state.selectedConversation, state.tenantId]);

  const manualReplyBlockedReason = manualReplyWindowState.reason;

  const canSendManualReply = !manualReplyBlockedReason;

  const sendManualReply = useCallback(async (body) => {
    const text = String(body || '').replace(/\s+/g, ' ').trim();

    if (!text) {
      const emptyError = new Error('Escreva uma resposta antes de enviar.');
      setSendReplyError(emptyError.message);
      throw emptyError;
    }

    if (!canSendManualReply) {
      const blockedError = new Error(manualReplyBlockedReason || 'Envio manual indisponível para esta conversa.');
      setSendReplyError(blockedError.message);
      throw blockedError;
    }

    const conversationId = getSelectedConversationId();
    const channelId = state.selectedConversation?.channelId;
    const idempotencyKey = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setIsSendingReply(true);
    setSendReplyError(null);
    setSendReplySuccess(null);

    const optimisticManualReplyMessage = buildOptimisticManualReplyMessageForTimeline({
      channelId,
      conversationId,
      idempotencyKey,
      tenantId: currentTenantId,
      text,
    });
    applyManualReplyMessageToState(conversationId, optimisticManualReplyMessage);

    try {
      const result = await sendOmnichannelManualReply(currentTenantId, conversationId, channelId, {
        body: text,
        idempotencyKey,
      });
      const manualReplyMessage = buildManualReplyMessageForTimeline({
        channelId,
        conversationId,
        idempotencyKey,
        resultMessage: result?.message,
        tenantId: currentTenantId,
        text,
      });
      if (manualReplyMessage) {
        applyManualReplyMessageToState(conversationId, manualReplyMessage);
      } else {
        removeOptimisticManualReplyMessageFromState(conversationId, idempotencyKey);
      }
      setSendReplySuccess(result?.duplicate
        ? 'Resposta já registrada para esta tentativa.'
        : 'Resposta enviada e registrada no atendimento.');
      await loadInbox({ silent: true });
      return result;
    } catch (replyFailure) {
      removeOptimisticManualReplyMessageFromState(conversationId, idempotencyKey);
      const message = replyFailure?.message || 'Não foi possível enviar a resposta manual pelo WhatsApp.';
      setSendReplyError(message);
      throw replyFailure;
    } finally {
      setIsSendingReply(false);
    }
  }, [applyManualReplyMessageToState, canSendManualReply, currentTenantId, getSelectedConversationId, loadInbox, manualReplyBlockedReason, removeOptimisticManualReplyMessageFromState, state.selectedConversation?.channelId]);

  const source = useMemo(() => (
    resolveSourceLabel(
      state.channels,
      state.conversations,
      state.messages,
      state.events,
      state.internalNotes,
      state.selectedConversationTriageResult ? [{ source: state.selectedConversationTriageResult.sourceLabel }] : [],
      Object.values(state.triageResultsByConversation || {}).map((result) => ({ source: result.sourceLabel })),
      state.autoReplyAttempts,
      state.triageFlows,
      state.triageIntents,
      state.triageQuestions,
      state.triageSettings ? [state.triageSettings] : [],
      Object.values(state.activitiesByConversation || {}).flat(),
    )
  ), [
    state.activitiesByConversation,
    state.autoReplyAttempts,
    state.channels,
    state.conversations,
    state.events,
    state.internalNotes,
    state.messages,
    state.selectedConversationTriageResult,
    state.triageResultsByConversation,
    state.triageFlows,
    state.triageIntents,
    state.triageQuestions,
    state.triageSettings,
  ]);

  const operationalQueueModel = useMemo(() => (
    buildOmnichannelOperationalQueueModel({
      activitiesByConversation: state.tenantId === currentTenantId ? state.activitiesByConversation : EMPTY_STATE.activitiesByConversation,
      channels: state.tenantId === currentTenantId ? state.channels : EMPTY_STATE.channels,
      channelStatus: state.tenantId === currentTenantId ? state.channelStatus : EMPTY_STATE.channelStatus,
      conversations: state.tenantId === currentTenantId ? state.conversations : EMPTY_STATE.conversations,
      currentUserId: user?.id || null,
      now: new Date(),
      showFullPhone: canReadOmnichannelMessages,
      source,
      triageResultsByConversation: state.tenantId === currentTenantId ? state.triageResultsByConversation : EMPTY_STATE.triageResultsByConversation,
    })
  ), [canReadOmnichannelMessages, currentTenantId, source, state.activitiesByConversation, state.channelStatus, state.channels, state.conversations, state.tenantId, state.triageResultsByConversation, user?.id]);

  const visibleQueueItems = useMemo(() => (
    filterOmnichannelOperationalQueue(operationalQueueModel.queueItems, {
      channelFilter: activeChannelFilter,
      filter: activeQueueFilter,
      queueFilter: activeSuggestedQueueFilter,
      search: queueSearch,
    })
  ), [activeChannelFilter, activeQueueFilter, activeSuggestedQueueFilter, operationalQueueModel.queueItems, queueSearch]);

  const channelFilters = useMemo(() => (
    buildOmnichannelChannelFilters(state.tenantId === currentTenantId ? state.channels : EMPTY_STATE.channels, state.channelStatus)
      .map((filter) => ({
        ...filter,
        count: filter.id === 'all'
          ? operationalQueueModel.queueItems.length
          : operationalQueueModel.queueItems.filter((item) => item.channelFilterKey === filter.id).length,
      }))
  ), [currentTenantId, operationalQueueModel.queueItems, state.channelStatus, state.channels, state.tenantId]);

  const suggestedQueueFilters = useMemo(() => (
    buildOmnichannelSuggestedQueueFilters(operationalQueueModel.queueItems)
  ), [operationalQueueModel.queueItems]);

  const selectedQueueItem = useMemo(() => {
    if (!state.selectedConversation?.id) return null;
    return operationalQueueModel.queueItems.find((item) => item.conversationId === state.selectedConversation.id) || null;
  }, [operationalQueueModel.queueItems, state.selectedConversation?.id]);

  const implementationStatus = useMemo(() => ({
    isConfigured: Boolean(state.channelStatus?.isConfigured),
    source,
    state: state.channelStatus?.isConfigured ? 'Canal configurado' : 'Fundação real em configuração',
    status: state.channelStatus?.status || 'not_configured',
    statusLabel: state.channelStatus?.statusLabel || 'Não configurado',
  }), [source, state.channelStatus]);

  return {
    actionError,
    activeCollaborationAction,
    activeMediaDownloadMessageId,
    activeMediaAccessMessageId,
    activitiesByConversation: state.tenantId === currentTenantId ? state.activitiesByConversation : EMPTY_STATE.activitiesByConversation,
    activityError,
    addActivity,
    addInternalNote,
    assignToMe,
    attendanceAssistantDraft,
    attendanceAssistantError,
    attendanceAssistantFeedbackError,
    autoReplyAttempts: state.tenantId === currentTenantId ? state.autoReplyAttempts : EMPTY_STATE.autoReplyAttempts,
    canManage,
    canRecordActivity,
    canReadOmnichannel,
    canReadOmnichannelMessages,
    canSendManualReply,
    channels: state.tenantId === currentTenantId ? state.channels : EMPTY_STATE.channels,
    channelStatus: state.tenantId === currentTenantId ? state.channelStatus : EMPTY_STATE.channelStatus,
    channelFilters,
    clearCollaborationFeedback,
    clearLiveRefreshNotice,
    collaborationFeedback,
    conversations: state.tenantId === currentTenantId ? state.conversations : EMPTY_STATE.conversations,
    downloadMessageMedia,
    error,
    events: state.tenantId === currentTenantId ? state.events : EMPTY_STATE.events,
    generateAttendanceAssistantDraft,
    implementationStatus,
    internalNotes: state.tenantId === currentTenantId ? state.internalNotes : EMPTY_STATE.internalNotes,
    isConfigured: Boolean(state.channelStatus?.isConfigured),
    isLoading,
    isLoadingConversationDetails,
    isGeneratingAttendanceAssistantDraft,
    isLiveRefreshing,
    lastRefreshAt,
    hasMoreConversations,
    isMutating,
    isRecordingAttendanceAssistantFeedback,
    isSavingActivity,
    isSavingNote,
    isSavingTriageResult,
    isSendingReply,
    linkLead,
    linkPatient,
    loadMoreConversations,
    liveRefreshNotice,
    manualReplyBlockedReason,
    manualReplyWindowState,
    markResolved,
    markSelectedConversationRead,
    mediaAccessByMessageId,
    mediaAccessError,
    mediaDownloadError,
    mediaDownloadFeedback,
    messages: state.tenantId === currentTenantId ? state.messages : EMPTY_STATE.messages,
    noteError,
    operationalFilters: operationalQueueModel.filters,
    operationalQueue: operationalQueueModel.queueItems,
    operationalPriorityOverview: operationalQueueModel.priorityOverview,
    operationalSummary: operationalQueueModel.summary,
    refresh,
    refreshActivities,
    refreshLive,
    refreshQueue,
    recordAttendanceAssistantFeedback,
    reopenConversation,
    requestMessageMediaAccess,
    scheduleNextAction,
    saveConversationTriageResult,
    selectConversation,
    selectedConversation: state.tenantId === currentTenantId ? state.selectedConversation : null,
    selectedConversationActivities: state.tenantId === currentTenantId && state.selectedConversation?.id
      ? state.activitiesByConversation[state.selectedConversation.id] || []
      : [],
    selectedConversationEvents: state.tenantId === currentTenantId && state.selectedConversation?.id
      ? state.events
      : [],
    selectedConversationNotes: state.tenantId === currentTenantId && state.selectedConversation?.id
      ? state.internalNotes
      : [],
    selectedConversationTriageResult: state.tenantId === currentTenantId && state.selectedConversation?.id
      ? state.selectedConversationTriageResult
      : null,
    selectedQueueItem,
    sendManualReply,
    sendReplyError,
    sendReplySuccess,
    source,
    triageFlows: state.tenantId === currentTenantId ? state.triageFlows : EMPTY_STATE.triageFlows,
    triageIntents: state.tenantId === currentTenantId ? state.triageIntents : EMPTY_STATE.triageIntents,
    triageQuestions: state.tenantId === currentTenantId ? state.triageQuestions : EMPTY_STATE.triageQuestions,
    triageResultsByConversation: state.tenantId === currentTenantId ? state.triageResultsByConversation : EMPTY_STATE.triageResultsByConversation,
    triageResultError,
    triageResultSuccess,
    triageSettings: state.tenantId === currentTenantId ? state.triageSettings : EMPTY_STATE.triageSettings,
    unassignConversation,
    activeQueueFilter,
    activeChannelFilter,
    activeSuggestedQueueFilter,
    queueSearch,
    setChannelFilter,
    setQueueFilter,
    setQueueSearch,
    setSuggestedQueueFilter,
    suggestedQueueFilters,
    unlinkContext,
    updatePriority,
    updateStatus,
    visibleQueueItems,
  };
};
