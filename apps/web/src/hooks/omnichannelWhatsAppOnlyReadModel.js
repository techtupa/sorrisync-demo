const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_IN_TEXT_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}\b/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const DOCUMENT_PATTERN = /\b(?:\d{3}\.?\d{3}\.?\d{3}-?\d{2}|\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})\b/g;
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{8,}\d)/g;

const cleanText = (value, fallback = 'Não informado', maxLength = 120) => {
  const rawText = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  const normalized = rawText
    .replace(UUID_IN_TEXT_PATTERN, '')
    .replace(EMAIL_PATTERN, '')
    .replace(DOCUMENT_PATTERN, '')
    .replace(PHONE_PATTERN, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const text = normalized && !UUID_PATTERN.test(normalized) ? normalized : fallback;

  return text.length > maxLength ? `${text.slice(0, maxLength - 3).trim()}...` : text;
};

const normalizeSourceLabel = (value) => {
  const source = cleanText(value, 'Sem acesso', 32);
  if (source === 'Supabase' || source === 'Misto' || source === 'Fallback demo' || source === 'Sem acesso') {
    return source;
  }

  return source || 'Sem acesso';
};

const toCount = (value) => {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const resolveWhatsAppOnlyModeLabel = ({
  canReadOmnichannel = true,
  channelStatus = null,
  hasOperationalSignal = false,
  sourceLabel = 'Sem acesso',
} = {}) => {
  if (!canReadOmnichannel) return 'Sem acesso';
  if (sourceLabel === 'Fallback demo') return 'Fallback demo';

  const status = String(channelStatus?.status || '').toLowerCase();
  if (hasOperationalSignal || ['active', 'sandbox', 'connected'].includes(status)) {
    return 'WhatsApp conectado';
  }

  return 'Integração futura';
};

const buildCapability = ({ enabled = false, id, label, stateLabel = '', helper = '' }) => ({
  enabled: Boolean(enabled),
  helper: cleanText(helper, 'Capacidade operacional manual.', 140),
  id,
  label: cleanText(label, 'Capacidade WhatsApp', 64),
  stateLabel: cleanText(stateLabel || (enabled ? 'Disponível' : 'Indisponível neste perfil'), 'Disponível', 64),
});

export const WHATSAPP_ONLY_FUTURE_INTEGRATIONS = [
  'Agenda externa',
  'Sistema odontológico',
  'Prontuário',
  'Financeiro',
  'CRM externo',
  'IA',
  'Automações',
  'Campanhas',
].map((label) => ({
  id: label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  label,
  stateLabel: 'Integração futura',
}));

export const buildOmnichannelWhatsAppOnlyContextModel = ({
  canManage = false,
  canReadAgenda = false,
  canReadCrm = false,
  canReadOmnichannel = true,
  canSendManualReply = false,
  channel = null,
  channelStatus = null,
  conversation = null,
  linkedLead = null,
  linkedPatient = null,
  nextAppointment = null,
  selectedQueueItem = null,
  sourceLabel = '',
} = {}) => {
  const source = normalizeSourceLabel(sourceLabel);
  const hasConversation = Boolean(conversation || selectedQueueItem);
  const hasChannelSignal = Boolean(channel || channelStatus?.status);
  const modeLabel = resolveWhatsAppOnlyModeLabel({
    canReadOmnichannel,
    channelStatus,
    hasOperationalSignal: hasConversation || hasChannelSignal,
    sourceLabel: source,
  });
  const hasCrmContext = Boolean(linkedPatient || linkedLead);
  const hasAgendaContext = Boolean(nextAppointment);

  return {
    additionalContext: [
      {
        description: hasCrmContext
          ? 'CRM SorriSync entra como contexto adicional para acelerar o atendimento.'
          : 'WhatsApp conectado. Sem vínculo CRM nesta conversa.',
        id: 'crm',
        label: 'CRM SorriSync',
        stateLabel: hasCrmContext ? 'Contexto SorriSync disponível' : 'Contexto CRM/Agenda ausente',
      },
      {
        description: hasAgendaContext
          ? 'Agenda SorriSync aparece como contexto adicional já carregado.'
          : 'Agenda é contexto adicional; a conversa continua operável sem consulta carregada.',
        id: 'agenda',
        label: 'Agenda SorriSync',
        stateLabel: hasAgendaContext ? 'Contexto SorriSync disponível' : 'Contexto CRM/Agenda ausente',
      },
    ],
    capabilities: [
      buildCapability({
        enabled: canReadOmnichannel,
        helper: 'Conversas e mensagens do canal conectado ficam na fila de atendimento.',
        id: 'conversations',
        label: 'Conversas e mensagens',
      }),
      buildCapability({
        enabled: canReadOmnichannel,
        helper: 'Fila, filtros, prioridade, não lidas e modo foco usam dados já carregados.',
        id: 'queue',
        label: 'Fila e modo foco',
      }),
      buildCapability({
        enabled: canManage,
        helper: 'Assumir, remover responsável, marcar lida e status usam ações manuais existentes.',
        id: 'collaboration',
        label: 'Responsável, status e leitura',
      }),
      buildCapability({
        enabled: canManage,
        helper: 'Nota interna fica separada do envio WhatsApp e não substitui prontuário.',
        id: 'internal-notes',
        label: 'Notas internas',
      }),
      buildCapability({
        enabled: canSendManualReply,
        helper: 'Biblioteca e playbooks apenas preenchem o texto; Enviar continua explícito.',
        id: 'manual-replies',
        label: 'Respostas e playbooks',
      }),
      buildCapability({
        enabled: Boolean(conversation?.contactPhoneE164 || selectedQueueItem?.phone),
        helper: 'A tela mostra telefone mascarado; copiar exige ação manual.',
        id: 'masked-phone',
        label: 'Telefone mascarado',
      }),
    ],
    description: 'Modo WhatsApp-only: atendimento e gestão funcionam com o canal conectado.',
    futureIntegrations: WHATSAPP_ONLY_FUTURE_INTEGRATIONS,
    helper: 'CRM e Agenda são contexto adicional, não requisito para operar o WhatsApp.',
    modeLabel,
    sourceLabel: source,
    title: 'Modo WhatsApp-only',
    unavailableContextLabel: canReadCrm || canReadAgenda
      ? 'Contexto externo opcional'
      : 'Sem CRM/Agenda neste perfil',
  };
};

export const buildOmnichannelWhatsAppOnlyManagementModel = ({
  canReadOmnichannel = true,
  clinicName = 'Clínica selecionada',
  isConfigured = false,
  sourceLabel = '',
  summary = {},
} = {}) => {
  const source = normalizeSourceLabel(sourceLabel);
  const clinicLabel = String(clinicName || '').trim() || 'Clínica selecionada';
  const modeLabel = resolveWhatsAppOnlyModeLabel({
    canReadOmnichannel,
    channelStatus: { status: isConfigured ? 'active' : 'not_configured' },
    hasOperationalSignal: toCount(summary.totalConversations) > 0,
    sourceLabel: source,
  });

  return {
    contextNote: 'Integrações com outros sistemas podem ampliar o contexto, mas não são necessárias para operar o WhatsApp.',
    description: `A gestão de ${clinicLabel} acompanha fila, risco e capacidade manual com sinais do atendimento WhatsApp, mesmo sem CRM ou Agenda.`,
    futureIntegrations: WHATSAPP_ONLY_FUTURE_INTEGRATIONS,
    modeLabel,
    signals: [
      {
        count: toCount(summary.openConversations),
        id: 'open',
        label: 'Conversas abertas',
      },
      {
        count: toCount(summary.unassignedConversations),
        id: 'unassigned',
        label: 'Sem responsável',
      },
      {
        count: toCount(summary.unreadConversations),
        id: 'unread',
        label: 'Não lidas',
      },
      {
        count: toCount(summary.stalledConversations || summary.untreatedConversations),
        id: 'stalled',
        label: 'Paradas',
      },
      {
        count: toCount(summary.highPriorityConversations),
        id: 'high-priority',
        label: 'Alta prioridade',
      },
      {
        count: toCount(summary.respondNowConversations),
        id: 'respond-now',
        label: 'Responder agora',
      },
    ],
    sourceLabel: source,
    title: 'WhatsApp-only para gestão',
  };
};
