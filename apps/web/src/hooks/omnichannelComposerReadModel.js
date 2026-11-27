export const OMNICHANNEL_COMPOSER_INSERT_ACTIONS = {
  append: 'append',
  cancel: 'cancel',
  choose: 'choose_insert_mode',
  insertNow: 'insert_now',
  replace: 'replace',
};

const DEFAULT_MAX_LENGTH = 1000;

const toSafeText = (value = '') => String(value || '').trim();

const normalizeDraftText = (value = '', maxLength = DEFAULT_MAX_LENGTH) => (
  String(value || '').slice(0, maxLength)
);

const hasGreeting = (text = '') => /(?:^|[^\p{L}\p{N}_])(ol[aá]|oi|bom dia|boa tarde|boa noite)(?=$|[^\p{L}\p{N}_])/iu.test(text);

const hasNextStepSignal = (text = '') => /\b(agenda|agendar|confirmar|hor[aá]rio|retorno|pr[oó]ximo|pr[oó]xima|passo|avaliar|verificar|conferir)\b/i.test(text);

export const resolveOmnichannelDraftBadge = ({
  conversationId = '',
  draftText = '',
} = {}) => {
  const hasLocalDraft = Boolean(conversationId && toSafeText(draftText));

  return {
    description: hasLocalDraft ? 'Texto não enviado' : '',
    hasLocalDraft,
    label: hasLocalDraft ? 'Rascunho' : '',
    microcopy: hasLocalDraft ? 'Rascunho desta sessão, ainda sem envio.' : '',
  };
};

export const buildOmnichannelComposerState = ({
  conversationId = '',
  draftSourcesByConversation = {},
  draftsByConversation = {},
  maxLength = DEFAULT_MAX_LENGTH,
} = {}) => {
  const safeConversationId = String(conversationId || '');
  const replyText = safeConversationId
    ? normalizeDraftText(draftsByConversation?.[safeConversationId], maxLength)
    : '';
  const draftBadge = resolveOmnichannelDraftBadge({
    conversationId: safeConversationId,
    draftText: replyText,
  });
  const draftConversationIds = Object.entries(draftsByConversation || {})
    .filter(([id, text]) => Boolean(id && toSafeText(text)))
    .map(([id]) => id);
  const lineCount = replyText ? replyText.split(/\r?\n/).length : 0;

  return {
    characterCount: replyText.length,
    draftBadge,
    draftConversationIds,
    draftSourceLabel: safeConversationId ? draftSourcesByConversation?.[safeConversationId] || '' : '',
    hasLocalDraft: draftBadge.hasLocalDraft,
    lineCount,
    replyText,
    sendDisabledReason: toSafeText(replyText) ? '' : 'sem texto',
  };
};

export const resolveOmnichannelInsertTextAction = ({
  currentText = '',
  incomingText = '',
  maxLength = DEFAULT_MAX_LENGTH,
} = {}) => {
  const safeIncomingText = toSafeText(incomingText);
  const safeCurrentText = toSafeText(currentText);

  if (!safeIncomingText) {
    return {
      action: OMNICHANNEL_COMPOSER_INSERT_ACTIONS.cancel,
      incomingText: '',
      nextText: normalizeDraftText(currentText, maxLength),
      requiresChoice: false,
    };
  }

  if (!safeCurrentText) {
    return {
      action: OMNICHANNEL_COMPOSER_INSERT_ACTIONS.insertNow,
      incomingText: safeIncomingText,
      nextText: normalizeDraftText(safeIncomingText, maxLength),
      requiresChoice: false,
    };
  }

  return {
    action: OMNICHANNEL_COMPOSER_INSERT_ACTIONS.choose,
    appendText: normalizeDraftText(`${safeCurrentText}\n\n${safeIncomingText}`, maxLength),
    incomingText: safeIncomingText,
    replaceText: normalizeDraftText(safeIncomingText, maxLength),
    requiresChoice: true,
  };
};

export const buildOmnichannelPreSendReview = ({
  canReadAgenda = false,
  canReadCrm = false,
  draftSourceLabel = '',
  replyText = '',
} = {}) => {
  const text = String(replyText || '');
  const trimmedText = toSafeText(text);
  const characterCount = text.length;
  const lineCount = trimmedText ? text.split(/\r?\n/).length : 0;
  const hasDraft = Boolean(trimmedText);
  const alerts = [];

  if (!hasDraft) {
    alerts.push('Texto vazio.');
  } else {
    if (trimmedText.length < 20) alerts.push('Mensagem muito curta.');
    if (trimmedText.length > 850) alerts.push('Mensagem longa; revise antes de enviar.');
    if (!hasGreeting(trimmedText)) alerts.push('Sem saudação simples.');
  }

  const checklist = hasDraft ? [
    hasNextStepSignal(trimmedText) ? 'Mensagem tem próximo passo.' : 'Confirme se há próximo passo.',
    'Tom claro e humano.',
    canReadCrm || canReadAgenda ? 'CRM/Agenda conferidos manualmente.' : 'Contexto operacional conferido.',
    draftSourceLabel ? `Texto veio de ${draftSourceLabel}.` : 'Biblioteca/playbook usados quando necessário.',
  ] : [];

  return {
    alerts: alerts.slice(0, 3),
    characterCount,
    hasDraft,
    items: checklist,
    lineCount,
    title: 'Antes de enviar',
  };
};
