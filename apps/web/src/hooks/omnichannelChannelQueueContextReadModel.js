import {
  getOmnichannelTriageQueueLabel,
  normalizeOmnichannelTriageQueueKey,
} from '../repositories/omnichannelTriageBackendContract.js';

export const OMNICHANNEL_CHANNEL_FILTER_ALL = 'all';
export const OMNICHANNEL_QUEUE_FILTER_ALL = 'all';
export const OMNICHANNEL_QUEUE_NONE = 'none';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOCUMENT_PATTERN = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{8,}\d)/g;
const TECHNICAL_PROVIDER_PATTERN = /\b(?:phone_number_id|waba_id|provider_account_id|provider_message_id|payload|webhook|secret)\b/gi;

const toList = (value) => (Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') : []);

const safeText = (value, fallback = '', maxLength = 96) => {
  const rawText = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = rawText
    .replace(UUID_IN_TEXT_PATTERN, '')
    .replace(EMAIL_PATTERN, '')
    .replace(DOCUMENT_PATTERN, '')
    .replace(PHONE_PATTERN, '')
    .replace(TECHNICAL_PROVIDER_PATTERN, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const normalizeFilterKey = (value, prefix = 'filter') => {
  const normalized = safeText(value, '', 80)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized ? `${prefix}:${normalized}` : `${prefix}:sem-identificacao`;
};

const findChannelForConversation = ({ channels = [], channelStatus = null, conversation = null }) => {
  const conversationChannelId = conversation?.channelId || conversation?.channel_id || null;
  const resolvedChannels = toList(channels);

  if (conversationChannelId) {
    const directChannel = resolvedChannels.find((channel) => channel.id === conversationChannelId);
    if (directChannel) return directChannel;
  }

  if (channelStatus?.channel) return channelStatus.channel;
  return resolvedChannels[0] || null;
};

const resolveChannelLabel = ({ channel = null, channelStatus = null }) => {
  const label = safeText(
    channel?.displayName
      || channel?.display_name
      || channelStatus?.channel?.displayName
      || channelStatus?.channel?.display_name,
    '',
    72,
  );

  return label || 'WhatsApp oficial';
};

export const buildOmnichannelChannelContext = ({
  channelStatus = null,
  channels = [],
  conversation = null,
} = {}) => {
  const channel = findChannelForConversation({ channelStatus, channels, conversation });
  const label = resolveChannelLabel({ channel, channelStatus });
  const statusLabel = safeText(channel?.statusLabel || channelStatus?.statusLabel, 'Status do canal não informado', 48);
  const status = safeText(channel?.status || channelStatus?.status, 'not_configured', 48);
  const sourceLabel = safeText(channel?.source || channelStatus?.source, 'Fonte não informada', 48);

  return {
    filterKey: normalizeFilterKey(label, 'channel'),
    helper: 'Canal WhatsApp da clínica. Identificadores técnicos ficam fora da área clínica.',
    isConfigured: Boolean(channel?.isConfigured || channelStatus?.isConfigured || status === 'active'),
    label,
    sourceLabel,
    status,
    statusLabel,
  };
};

export const buildOmnichannelQueueContext = ({
  assistedQueue = null,
  selectedQueueItem = null,
  triageResult = null,
} = {}) => {
  const persistedQueue = triageResult?.suggestedQueue || triageResult?.suggested_queue || '';

  if (persistedQueue) {
    const queueKey = normalizeOmnichannelTriageQueueKey(persistedQueue);
    const label = safeText(triageResult?.suggestedQueueLabel, getOmnichannelTriageQueueLabel(queueKey), 64);

    return {
      badgeLabel: 'Fila sugerida',
      filterKey: queueKey,
      helper: 'Fila sugerida por resultado de triagem salvo. Ainda não é roteamento persistido por setor.',
      isPersisted: true,
      isSuggested: true,
      label,
      queueKey,
      sourceLabel: safeText(triageResult?.sourceLabel, 'Supabase', 48),
      stateLabel: `Fila sugerida: ${label}`,
      type: 'suggested_persisted',
    };
  }

  const localQueue = assistedQueue?.id || selectedQueueItem?.assistedQueue?.id || '';
  if (localQueue) {
    const queueKey = normalizeOmnichannelTriageQueueKey(localQueue);
    const label = safeText(assistedQueue?.label || selectedQueueItem?.assistedQueue?.label, getOmnichannelTriageQueueLabel(queueKey), 64);

    if (queueKey !== 'unclassified') {
      return {
        badgeLabel: 'Sugestão segura',
        filterKey: OMNICHANNEL_QUEUE_NONE,
        helper: 'Sugestão assistida, não salva como fila/setor da conversa.',
        isPersisted: false,
        isSuggested: true,
        label,
        queueKey,
        sourceLabel: 'Local',
        stateLabel: `Sugestão segura: ${label}`,
        type: 'suggested_local',
      };
    }
  }

  return {
    badgeLabel: 'Sem fila',
    filterKey: OMNICHANNEL_QUEUE_NONE,
    helper: 'Sem fila definida. O contrato atual ainda não possui setor ou roteamento persistido na conversa.',
    isPersisted: false,
    isSuggested: false,
    label: 'Sem fila definida',
    queueKey: OMNICHANNEL_QUEUE_NONE,
    sourceLabel: 'Não definida',
    stateLabel: 'Sem fila definida',
    type: 'none',
  };
};

export const buildOmnichannelChannelFilters = (channels = [], channelStatus = null) => {
  const resolvedChannels = toList(channels);
  const filters = resolvedChannels.map((channel) => {
    const context = buildOmnichannelChannelContext({
      channelStatus,
      channels: [channel],
      conversation: { channelId: channel.id },
    });

    return {
      count: 0,
      id: context.filterKey,
      label: context.label,
      statusLabel: context.statusLabel,
    };
  });

  if (!filters.length && channelStatus?.channel) {
    const context = buildOmnichannelChannelContext({ channelStatus, channels: [channelStatus.channel] });
    filters.push({
      count: 0,
      id: context.filterKey,
      label: context.label,
      statusLabel: context.statusLabel,
    });
  }

  return [
    { count: 0, id: OMNICHANNEL_CHANNEL_FILTER_ALL, label: 'Todos os canais', statusLabel: '' },
    ...filters,
  ];
};

export const buildOmnichannelSuggestedQueueFilters = (queueItems = []) => {
  const queueMap = new Map();

  toList(queueItems).forEach((item) => {
    const context = item.queueContext;
    if (!context?.isPersisted || !context.queueKey || context.queueKey === OMNICHANNEL_QUEUE_NONE) return;

    const current = queueMap.get(context.queueKey) || {
      count: 0,
      id: context.queueKey,
      label: context.label,
      stateLabel: context.stateLabel,
    };
    current.count += 1;
    queueMap.set(context.queueKey, current);
  });

  return [
    { count: toList(queueItems).length, id: OMNICHANNEL_QUEUE_FILTER_ALL, label: 'Todas', stateLabel: 'Todas as filas sugeridas' },
    ...[...queueMap.values()].sort((first, second) => first.label.localeCompare(second.label, 'pt-BR')),
  ];
};

const incrementDistribution = (map, key, label, helper = '') => {
  const current = map.get(key) || {
    count: 0,
    helper,
    id: key,
    label,
  };
  current.count += 1;
  map.set(key, current);
};

export const buildOmnichannelManagementChannelQueueModel = ({
  channels = [],
  queueItems = [],
  sourceLabel = 'Sem dados',
  triageResults = [],
} = {}) => {
  const channelMap = new Map();
  const queueMap = new Map();
  const items = toList(queueItems);

  items.forEach((item) => {
    const channelContext = item.channelContext || buildOmnichannelChannelContext({
      channelStatus: null,
      channels,
      conversation: item,
    });
    incrementDistribution(
      channelMap,
      channelContext.filterKey,
      channelContext.label,
      channelContext.statusLabel,
    );
  });

  toList(triageResults).forEach((result) => {
    const queueContext = buildOmnichannelQueueContext({ triageResult: result });
    if (!queueContext.isPersisted) return;

    incrementDistribution(
      queueMap,
      queueContext.queueKey,
      queueContext.label,
      'Fila sugerida por triagem persistida; ainda sem roteamento por setor.',
    );
  });

  const withoutSuggestedQueue = Math.max(0, items.length - [...queueMap.values()].reduce((total, item) => total + item.count, 0));
  if (withoutSuggestedQueue > 0) {
    queueMap.set(OMNICHANNEL_QUEUE_NONE, {
      count: withoutSuggestedQueue,
      helper: 'Conversas sem resultado de triagem com fila sugerida.',
      id: OMNICHANNEL_QUEUE_NONE,
      label: 'Sem fila definida',
    });
  }

  return {
    channelDistribution: [...channelMap.values()].sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, 'pt-BR')),
    helper: 'Canais WhatsApp são da clínica. Fila exibida aqui é sugerida por triagem, não roteamento persistido por setor.',
    queueDistribution: [...queueMap.values()].sort((first, second) => second.count - first.count || first.label.localeCompare(second.label, 'pt-BR')),
    sharedLineNote: 'Uma linha pode alimentar mais de uma fila quando a clínica usa número compartilhado.',
    sourceLabel,
    stateLabel: items.length ? 'Canais reais e filas sugeridas parciais' : 'Sem conversas carregadas',
  };
};
