import {
  OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS,
  buildOmnichannelManualPlaybooks,
} from './omnichannelManualPlaybookReadModel.js';

export const OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL = 'all';

export const OMNICHANNEL_REPLY_LIBRARY_FILTERS = [
  { id: OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL, label: 'Todos' },
  { id: 'scheduling', label: 'Agendamento' },
  { id: 'confirmation', label: 'Confirmação' },
  { id: 'reactivation', label: 'Reativação' },
  { id: 'follow_up', label: 'Follow-up' },
  { id: 'post_care', label: 'Pós-atendimento' },
  { id: 'crm', label: 'CRM' },
];

export const OMNICHANNEL_REPLY_LIBRARY_CATEGORIES = [
  { id: 'welcome', label: 'Acolhimento', filterIds: ['crm'] },
  { id: 'scheduling', label: 'Agendamento', filterIds: ['scheduling'] },
  { id: 'confirmation', label: 'Confirmação', filterIds: ['confirmation'] },
  { id: 'reactivation', label: 'Reativação', filterIds: ['reactivation'] },
  { id: 'follow_up', label: 'Follow-up', filterIds: ['follow_up'] },
  { id: 'post_care', label: 'Pós-atendimento', filterIds: ['post_care'] },
  { id: 'unlinked_crm', label: 'Sem vínculo CRM', filterIds: ['crm'] },
  { id: 'agenda_forwarding', label: 'Encaminhamento para agenda', filterIds: ['scheduling'] },
];

const PLAYBOOK_CATEGORY_BY_ID = {
  appointment_confirmation: 'confirmation',
  follow_up: 'follow_up',
  new_lead: 'welcome',
  post_care: 'post_care',
  reactivation: 'reactivation',
  scheduling: 'scheduling',
  unlinked_crm: 'unlinked_crm',
};

const ITEM_META_BY_PLAYBOOK_TEXT_ID = {
  'playbook-confirmation-text-1': {
    description: 'Confirmar presença sem enviar automaticamente.',
    title: 'Confirmar presença',
  },
  'playbook-confirmation-text-2': {
    description: 'Orientar ajuste de horário pela conversa.',
    title: 'Ajustar horário',
  },
  'playbook-confirmation-text-3': {
    description: 'Reforçar chegada e confirmação manual.',
    title: 'Orientar chegada',
  },
  'playbook-follow-up-text-1': {
    description: 'Retomar o próximo passo combinado.',
    title: 'Retomar combinado',
  },
  'playbook-follow-up-text-2': {
    description: 'Checar se o contato ainda precisa de ajuda.',
    title: 'Checar interesse',
  },
  'playbook-new-lead-text-1': {
    description: 'Acolher e entender o que a pessoa procura.',
    title: 'Acolher novo contato',
  },
  'playbook-new-lead-text-2': {
    description: 'Pedir nome e motivo do contato.',
    title: 'Confirmar dados básicos',
  },
  'playbook-new-lead-text-3': {
    description: 'Direcionar para avaliação, retorno ou agenda.',
    title: 'Entender intenção',
  },
  'playbook-post-care-text-1': {
    description: 'Acompanhar dúvidas após o atendimento.',
    title: 'Acompanhar pós-atendimento',
  },
  'playbook-post-care-text-2': {
    description: 'Checar se ficou alguma orientação pendente.',
    title: 'Checar orientação',
  },
  'playbook-reactivation-text-1': {
    description: 'Retomar avaliação ou retorno com cuidado.',
    title: 'Retomar avaliação',
  },
  'playbook-reactivation-text-2': {
    description: 'Oferecer próximo passo para reativação.',
    title: 'Oferecer retomada',
  },
  'playbook-scheduling-text-1': {
    description: 'Perguntar preferência de dia ou período.',
    title: 'Pedir preferência',
  },
  'playbook-scheduling-text-2': {
    categoryId: 'agenda_forwarding',
    description: 'Informar que a agenda será conferida manualmente.',
    title: 'Encaminhar para agenda',
  },
  'playbook-unlinked-text-1': {
    description: 'Pedir nome e motivo para localizar contexto.',
    title: 'Localizar atendimento',
  },
  'playbook-unlinked-text-2': {
    description: 'Confirmar informações básicas antes de seguir.',
    title: 'Confirmar vínculo',
  },
};

const GENERAL_REPLY_ITEMS = [
  {
    categoryId: 'welcome',
    description: 'Responder uma entrada recente com acolhimento.',
    id: 'library-general-acknowledge',
    text: 'Mensagem recebida. Vou conferir as informações e retorno por aqui em seguida.',
    title: 'Confirmar recebimento',
  },
  {
    categoryId: 'post_care',
    description: 'Encerrar mantendo o canal aberto para dúvidas.',
    id: 'library-general-closing',
    text: 'Perfeito, obrigado pelo retorno. Vou deixar seu atendimento registrado e seguimos por aqui se precisar.',
    title: 'Encerrar com segurança',
  },
];

const normalizeText = (value = '') => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const includesAny = (value, terms = []) => {
  const normalized = normalizeText(value);
  return terms.some((term) => normalized.includes(normalizeText(term)));
};

const categoryById = new Map(OMNICHANNEL_REPLY_LIBRARY_CATEGORIES.map((category) => [category.id, category]));

const getCategory = (categoryId) => categoryById.get(categoryId) || categoryById.get('welcome');

const createLibraryItem = ({
  categoryId,
  description,
  id,
  order = 0,
  playbookId = '',
  playbookTitle = '',
  text,
  title,
}) => {
  const category = getCategory(categoryId);

  return {
    categoryId: category.id,
    categoryLabel: category.label,
    dataAction: 'use-reply-library-text',
    description,
    filterIds: category.filterIds,
    id,
    order,
    playbookId,
    playbookTitle,
    text,
    title,
  };
};

const buildPlaybookItems = ({
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  navigationActions = null,
  nextAppointment = null,
  primaryActions = [],
  selectedQueueItem = null,
} = {}) => OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS
  .filter((option) => option.id !== OMNICHANNEL_MANUAL_PLAYBOOK_AUTO)
  .flatMap((option, playbookIndex) => {
    const playbook = buildOmnichannelManualPlaybooks({
      conversation,
      linkedLead,
      linkedPatient,
      navigationActions,
      nextAppointment,
      primaryActions,
      selectedPlaybookId: option.id,
      selectedQueueItem,
    });

    return playbook.suggestedTexts.map((textAction, textIndex) => {
      const meta = ITEM_META_BY_PLAYBOOK_TEXT_ID[textAction.id] || {};
      const categoryId = meta.categoryId || PLAYBOOK_CATEGORY_BY_ID[option.id] || 'welcome';

      return createLibraryItem({
        categoryId,
        description: meta.description || playbook.objective,
        id: `reply-library-${textAction.id}`,
        order: playbookIndex * 10 + textIndex,
        playbookId: option.id,
        playbookTitle: playbook.title,
        text: textAction.text,
        title: meta.title || playbook.title,
      });
    });
  });

const buildGeneralItems = () => GENERAL_REPLY_ITEMS.map((item, index) => createLibraryItem({
  ...item,
  order: 100 + index,
}));

const hasConversationCrmReference = ({ conversation, selectedQueueItem }) => Boolean(
  selectedQueueItem?.hasAnyLink
  || selectedQueueItem?.hasPatientLink
  || selectedQueueItem?.hasLeadLink
  || conversation?.patientId
  || conversation?.patient_id
  || conversation?.leadId
  || conversation?.lead_id
);

const scoreReplyItem = ({
  conversation = null,
  item,
  linkedLead = null,
  linkedPatient = null,
  nextAppointment = null,
  selectedPlaybookId = OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  selectedQueueItem = null,
} = {}) => {
  const reason = [
    selectedQueueItem?.reason,
    selectedQueueItem?.motivoOperacional,
    selectedQueueItem?.nextManualAction,
    selectedQueueItem?.primaryAttentionLabel,
    selectedQueueItem?.suggestedDestination,
    selectedQueueItem?.statusLabel,
    conversation?.status,
  ].filter(Boolean).join(' ');
  const hasResolvedCrmLink = Boolean(linkedPatient || linkedLead);
  const hasCrmReference = hasConversationCrmReference({ conversation, selectedQueueItem });
  const hasUnreadInbound = Boolean(selectedQueueItem?.hasUnreadInbound || conversation?.hasUnreadInbound);
  const hasStalledSignal = Boolean(
    selectedQueueItem?.withoutRecentTreatment
    || selectedQueueItem?.isStalled
    || includesAny(reason, ['parada', 'sem tratamento', 'reativ'])
  );
  const hasFollowUp = Boolean(
    selectedQueueItem?.isOverdue
    || selectedQueueItem?.isDueToday
    || includesAny(reason, ['retorno', 'follow-up', 'follow up', 'aguardando'])
  );
  const hasAgendaSignal = Boolean(
    nextAppointment
    || includesAny(reason, ['agenda', 'agend', 'horario', 'horário', 'disponibilidade', 'consulta'])
  );
  const isHighPriority = Boolean(
    selectedQueueItem?.isHighPriority
    || selectedQueueItem?.priority === 'high'
    || selectedQueueItem?.priority === 'urgent'
    || conversation?.priority === 'high'
    || conversation?.priority === 'urgent'
  );

  let score = 0;
  const reasons = [];

  if (
    selectedPlaybookId
    && selectedPlaybookId !== OMNICHANNEL_MANUAL_PLAYBOOK_AUTO
    && item.playbookId === selectedPlaybookId
  ) {
    score += 70;
    reasons.push('Playbook selecionado');
  }

  if (!hasResolvedCrmLink && !hasCrmReference && item.categoryId === 'unlinked_crm') {
    score += 65;
    reasons.push('Conversa sem vínculo CRM');
  }

  if (hasUnreadInbound && ['welcome', 'follow_up'].includes(item.categoryId)) {
    score += 45;
    reasons.push('Conversa não lida');
  }

  if (hasFollowUp && item.categoryId === 'follow_up') {
    score += 55;
    reasons.push('Retorno/follow-up');
  }

  if (hasStalledSignal && item.categoryId === 'reactivation') {
    score += 50;
    reasons.push('Conversa parada');
  }

  if (hasAgendaSignal && ['scheduling', 'agenda_forwarding', 'confirmation'].includes(item.categoryId)) {
    score += 45;
    reasons.push('Contexto de agenda');
  }

  if (nextAppointment && item.categoryId === 'confirmation') {
    score += 35;
    reasons.push('Consulta carregada');
  }

  if ((linkedLead || selectedQueueItem?.hasLeadLink) && ['welcome', 'scheduling'].includes(item.categoryId)) {
    score += 30;
    reasons.push('Lead vinculado');
  }

  if ((linkedPatient || selectedQueueItem?.hasPatientLink) && ['confirmation', 'follow_up', 'post_care'].includes(item.categoryId)) {
    score += 30;
    reasons.push('Paciente vinculado');
  }

  if (isHighPriority && ['follow_up', 'scheduling', 'welcome'].includes(item.categoryId)) {
    score += 25;
    reasons.push('Prioridade alta');
  }

  return {
    reasons,
    score,
  };
};

export const resolveOmnichannelSuggestedReplies = ({
  conversation = null,
  items = [],
  linkedLead = null,
  linkedPatient = null,
  maxItems = 3,
  nextAppointment = null,
  selectedPlaybookId = OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  selectedQueueItem = null,
} = {}) => {
  const scoredItems = items
    .map((item) => {
      const result = scoreReplyItem({
        conversation,
        item,
        linkedLead,
        linkedPatient,
        nextAppointment,
        selectedPlaybookId,
        selectedQueueItem,
      });

      return {
        ...item,
        isSuggestedByContext: result.score > 0,
        suggestionReason: result.reasons.slice(0, 2).join(' · ') || 'Resposta geral',
        suggestionScore: result.score,
      };
    })
    .filter((item) => item.suggestionScore > 0)
    .sort((first, second) => (
      second.suggestionScore - first.suggestionScore
      || first.order - second.order
      || first.title.localeCompare(second.title, 'pt-BR')
    ));

  const fallbackItems = items
    .filter((item) => ['welcome', 'scheduling', 'unlinked_crm'].includes(item.categoryId))
    .map((item) => ({
      ...item,
      isSuggestedByContext: false,
      suggestionReason: 'Resposta geral',
      suggestionScore: 0,
    }))
    .sort((first, second) => first.order - second.order);

  const uniqueItems = [];
  for (const item of [...scoredItems, ...fallbackItems]) {
    if (uniqueItems.some((currentItem) => currentItem.id === item.id)) continue;
    uniqueItems.push(item);
    if (uniqueItems.length >= maxItems) break;
  }

  return uniqueItems;
};

export const filterOmnichannelReplyLibrary = ({
  filterId = OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL,
  items = [],
  search = '',
} = {}) => {
  const normalizedSearch = normalizeText(search).trim();

  return items.filter((item) => {
    const matchesFilter = !filterId
      || filterId === OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL
      || item.filterIds.includes(filterId)
      || item.categoryId === filterId;
    const searchHaystack = [
      item.categoryLabel,
      item.description,
      item.playbookTitle,
      item.text,
      item.title,
    ].join(' ');
    const matchesSearch = !normalizedSearch || normalizeText(searchHaystack).includes(normalizedSearch);

    return matchesFilter && matchesSearch;
  });
};

export const buildOmnichannelPlaybookReplyGroups = ({ items = [] } = {}) => OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS
  .filter((option) => option.id !== OMNICHANNEL_MANUAL_PLAYBOOK_AUTO)
  .map((option) => ({
    id: option.id,
    items: items.filter((item) => item.playbookId === option.id),
    title: option.label,
  }))
  .filter((group) => group.items.length > 0);

export const buildOmnichannelReplyLibrary = ({
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  navigationActions = null,
  nextAppointment = null,
  primaryActions = [],
  selectedPlaybookId = OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  selectedQueueItem = null,
} = {}) => {
  const playbookItems = buildPlaybookItems({
    conversation,
    linkedLead,
    linkedPatient,
    navigationActions,
    nextAppointment,
    primaryActions,
    selectedQueueItem,
  });
  const items = [...playbookItems, ...buildGeneralItems()];
  const suggestedItems = resolveOmnichannelSuggestedReplies({
    conversation,
    items,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedPlaybookId,
    selectedQueueItem,
  });

  return {
    categories: OMNICHANNEL_REPLY_LIBRARY_CATEGORIES,
    emptyState: 'Nenhuma resposta encontrada para a busca e filtro atuais.',
    filters: OMNICHANNEL_REPLY_LIBRARY_FILTERS,
    items,
    playbookGroups: buildOmnichannelPlaybookReplyGroups({ items }),
    sourceLabel: 'Biblioteca local manual',
    suggestedItems,
    suggestionLabel: suggestedItems.some((item) => item.isSuggestedByContext)
      ? 'Sugeridas pelo contexto carregado.'
      : 'Respostas gerais para começar com segurança.',
  };
};
