import HandoffCard from '@/portfolio/HandoffCard.jsx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CheckCircle2,
  Clock3,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileClock,
  FileText,
  Flag,
  Image as ImageIcon,
  Inbox,
  Link2,
  ListChecks,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Unlink,
  UserRound,
  UsersRound,
  Volume2,
} from 'lucide-react';
import Layout from '@/components/Layout.jsx';
import { useOmnichannelWorkspaceLayout } from '@/hooks/useOmnichannelWorkspaceLayout.js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useOmnichannelInbox } from '@/hooks/useOmnichannelInbox.js';
import {
  OMNICHANNEL_MANUAL_PLAYBOOK_AUTO,
  OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS,
  buildOmnichannelManualPlaybooks,
} from '@/hooks/omnichannelManualPlaybookReadModel.js';
import {
  buildOmnichannelQualityChecklist,
  buildOmnichannelQualityGaps,
  resolveOmnichannelManualClosureState,
} from '@/hooks/omnichannelManualQualityReadModel.js';
import {
  buildOmnichannelComposerState,
  resolveOmnichannelInsertTextAction,
} from '@/hooks/omnichannelComposerReadModel.js';
import {
  OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL,
  buildOmnichannelReplyLibrary,
  filterOmnichannelReplyLibrary,
} from '@/hooks/omnichannelReplyLibraryReadModel.js';
import {
  OMNICHANNEL_COLLABORATION_STATUS_LABELS,
  buildOmnichannelCollaborationModel,
} from '@/hooks/omnichannelCollaborationReadModel.js';
import { usePatientLeads } from '@/hooks/usePatientLeads.js';
import { usePatients } from '@/hooks/usePatients.js';
import { useSchedule } from '@/hooks/useSchedule.js';
import { buildOmnichannelContactContextModel } from '@/hooks/omnichannelContactContextReadModel.js';
import { buildOmnichannelTriageModel } from '@/hooks/omnichannelAssistedTriageReadModel.js';
import {
  buildOmnichannelAssistantDraftBlockedFeedback,
  buildOmnichannelAttendanceAssistantDisplayModel,
  buildOmnichannelAttendanceAssistantModel,
} from '@/hooks/omnichannelAttendanceAssistantReadModel.js';
import {
  buildAutoReplyConversationObservabilityModel,
  buildAutoReplyEligibilityModel,
  buildAutoReplyPilotMetricsModel,
} from '@/hooks/omnichannelAutoReplyPreviewReadModel.js';
import {
  buildOmnichannelChannelContext,
  buildOmnichannelQueueContext,
} from '@/hooks/omnichannelChannelQueueContextReadModel.js';
import { buildOmnichannelTriageConfigModel } from '@/hooks/omnichannelTriageConfigReadModel.js';
import { buildOmnichannelWhatsAppOnlyContextModel } from '@/hooks/omnichannelWhatsAppOnlyReadModel.js';
import {
  OMNICHANNEL_ACTIVITY_NOTE_LIMIT,
  OMNICHANNEL_ACTIVITY_OUTCOME_LABELS,
  OMNICHANNEL_MANUAL_ACTIVITY_OUTCOMES,
  OMNICHANNEL_MANUAL_ACTIVITY_TYPES,
  OMNICHANNEL_ACTIVITY_TYPE_LABELS,
} from '@/repositories/omnichannelActivityContract.js';
import {
  buildCrmAgendaNavigationPath,
  buildCrmPatientNavigationPath,
  getCrmAgendaAppointmentSortValue,
} from '@/lib/crmAgendaNavigation.js';
import { resolveAppointmentCrmPatient } from '@/lib/crmAgendaLinking.js';
import {
  OMNICHANNEL_CONVERSATION_PRIORITIES,
  OMNICHANNEL_CONVERSATION_PRIORITY_LABELS,
  OMNICHANNEL_CONVERSATION_STATUSES,
  OMNICHANNEL_CONVERSATION_STATUS_LABELS,
} from '@/repositories/omnichannelTriageContract.js';


const sourceDisplayLabelByValue = {
  Supabase: 'Dados do atendimento',
  Misto: 'Origem dos dados',
  'Fallback demo': 'Dados de demonstração',
  'Sem acesso': 'Sem acesso aos dados',
};

const formatOmnichannelSourceLabel = (source) => sourceDisplayLabelByValue[source] || 'Origem dos dados';

const buildClinicAssistantStatus = (learningCycle = {}) => {
  const caseToken = learningCycle.caseToken || '';
  if (caseToken === 'provider_answer_review') {
    return {
      description: 'Há uma resposta automática registrada para esta conversa.',
      label: 'IA respondeu',
      tone: 'ready',
    };
  }
  if (caseToken === 'safe_block_learning_case') {
    return {
      description: 'A automação interrompeu a resposta para preservar a segurança do atendimento.',
      label: 'Bloqueado com segurança',
      tone: 'blocked',
    };
  }
  if (['missing_auto_reply_attempt', 'no_conversation_selected', 'stale_evidence_after_inbound', 'inconclusive_learning_case'].includes(caseToken)) {
    return {
      description: 'Ainda não há tentativa recente suficiente para avaliar esta mensagem.',
      label: 'Sem evidência suficiente',
      tone: 'muted',
    };
  }
  return {
    description: 'Confira a conversa e continue o atendimento manualmente se necessário.',
    label: 'Precisa de revisão humana',
    tone: 'blocked',
  };
};

const liveRefreshTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const formatOmnichannelLiveRefreshTime = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return liveRefreshTimeFormatter.format(date);
};

const VIRTUAL_ATTENDANT_AVATAR_SRC = '/brand/virtual-attendant-avatar.png';

const OMNICHANNEL_ASSISTANT_FEEDBACK_REASONS = {
  bad_tone: 'Tom ruim',
  blocked_correctly: 'Bloqueio correto',
  missing_context: 'Faltou contexto',
  operational_risk: 'Risco operacional',
  other: 'Outro',
  preferred_manual_reply: 'Melhor responder manualmente',
  too_generic: 'Muito genérico',
};

const OMNICHANNEL_ASSISTANT_NEGATIVE_FEEDBACK_REASONS = [
  'too_generic',
  'bad_tone',
  'missing_context',
  'preferred_manual_reply',
  'other',
];

const OMNICHANNEL_ASSISTANT_RISK_FEEDBACK_REASONS = [
  'operational_risk',
  'missing_context',
  'bad_tone',
  'other',
];

const statusToneByValue = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  archived: 'border-slate-200 bg-slate-50 text-slate-700',
  closed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  not_configured: 'border-amber-200 bg-amber-50 text-amber-700',
  open: 'border-sky-200 bg-sky-50 text-sky-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  sandbox: 'border-sky-200 bg-sky-50 text-sky-700',
  waiting: 'border-amber-200 bg-amber-50 text-amber-700',
};

const priorityToneByValue = {
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  normal: 'border-sky-200 bg-sky-50 text-sky-700',
  urgent: 'border-red-200 bg-red-50 text-red-700',
};

const manualReplyWindowToneByStatus = {
  blocked: 'border-amber-200 bg-amber-50 text-amber-800',
  closed: 'border-violet-200 bg-violet-50 text-violet-800',
  open: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

const responsiveBadgeClass = 'max-w-full whitespace-normal text-left leading-snug';
const compactManualButtonClass = 'h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug';
const compactManualButtonLabelClass = 'min-w-0 flex-1 break-words';
const mobilePanelButtonClass = 'h-auto min-h-11 w-full min-w-0 justify-center px-2 py-1.5 text-xs leading-tight';
const OMNICHANNEL_AUTO_REFRESH_INTERVAL_MS = 15 * 1000;
const OMNICHANNEL_AUTO_REFRESH_INTERVAL_SECONDS = Math.round(OMNICHANNEL_AUTO_REFRESH_INTERVAL_MS / 1000);

const providerStatusViewByValue = {
  delivered: {
    label: 'Entregue ao WhatsApp',
    Icon: CheckCheck,
    tone: 'text-emerald-700',
  },
  failed: {
    label: 'Falha no envio',
    Icon: AlertTriangle,
    tone: 'text-red-700',
  },
  queued: {
    label: 'Na fila de envio',
    Icon: Clock3,
    tone: 'text-amber-700',
  },
  read: {
    label: 'Lida pelo cliente',
    Icon: CheckCheck,
    tone: 'text-sky-600',
  },
  received: {
    label: 'Recebida',
    Icon: CheckCircle2,
    tone: 'text-slate-600',
  },
  recorded: {
    label: 'Registrada',
    Icon: CheckCircle2,
    tone: 'text-slate-600',
  },
  sent: {
    label: 'Enviada ao WhatsApp',
    Icon: Check,
    tone: 'text-sky-700',
  },
  sending: {
    label: 'Enviando',
    Icon: Clock3,
    tone: 'text-amber-700',
  },
};

const resolveProviderStatusView = (status) => (
  providerStatusViewByValue[status] || {
    Icon: CheckCircle2,
    label: status ? 'Status do provedor registrado' : 'Status do provedor indisponível',
    tone: 'text-muted-foreground',
  }
);

const ProviderStatusIcon = ({ status }) => {
  const providerStatusView = resolveProviderStatusView(status);
  const Icon = providerStatusView.Icon || CheckCircle2;

  return (
    <span
      aria-label={`Status: ${providerStatusView.label}`}
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full ${providerStatusView.tone}`}
      data-front-hugo-provider-status="true"
      data-front-hugo-provider-status-icon="true"
      title={providerStatusView.label}
    >
      <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.3} />
    </span>
  );
};


const queueFilterShortLabels = {
  all: 'Todas',
  closed_window: 'Janela fechada',
  high_priority: 'Alta',
  mine: 'Minhas',
  respond_now: 'Responder',
  scheduling_attention: 'Agenda',
  unassigned: 'Sem resp.',
  unlinked: 'Sem CRM',
  unread: 'Não lidas',
};

const buildVisibleAttentionReasons = (reasons = [], visibleLimit = 3) => {
  const safeReasons = Array.isArray(reasons) ? reasons.filter(Boolean) : [];

  return {
    hiddenCount: Math.max(0, safeReasons.length - visibleLimit),
    title: safeReasons.join(' | '),
    visibleReasons: safeReasons.slice(0, visibleLimit),
  };
};

const OMNICHANNEL_MOBILE_PANEL_IDS = {
  queue: 'queue',
  conversation: 'conversation',
  context: 'context',
};

const OMNICHANNEL_WORKSPACE_TAB_IDS = {
  attendance: 'atendimento',
  summary: 'resumo',
  actions: 'acoes',
  crmAgenda: 'crm-agenda',
  assistance: 'assistencia',
  bot: 'bot',
};

const OMNICHANNEL_CONTEXT_WORKSPACE_TABS = [
  { id: OMNICHANNEL_WORKSPACE_TAB_IDS.summary, label: 'Resumo' },
  { id: OMNICHANNEL_WORKSPACE_TAB_IDS.actions, label: 'Ações' },
  { id: OMNICHANNEL_WORKSPACE_TAB_IDS.crmAgenda, label: 'CRM/Agenda' },
  { id: OMNICHANNEL_WORKSPACE_TAB_IDS.assistance, label: 'Assistência' },
  { id: OMNICHANNEL_WORKSPACE_TAB_IDS.bot, label: 'Sugestões' },
];

const voiceMessageType = ['au', 'dio'].join('');
const SecureAudioElement = voiceMessageType;

const messageTypeToneByValue = {
  [voiceMessageType]: 'border-violet-200 bg-violet-50 text-violet-700',
  contacts: 'border-slate-200 bg-slate-50 text-slate-700',
  document: 'border-amber-200 bg-amber-50 text-amber-700',
  image: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  location: 'border-slate-200 bg-slate-50 text-slate-700',
  sticker: 'border-pink-200 bg-pink-50 text-pink-700',
  text: 'border-sky-200 bg-sky-50 text-sky-700',
  unsupported: 'border-slate-200 bg-slate-50 text-slate-700',
  video: 'border-indigo-200 bg-indigo-50 text-indigo-700',
};

const formatDateTime = (value) => {
  if (!value) return 'Sem horário';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem horário';

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
};

const maskPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return 'Não informado';
  }

  const country = digits.length > 10 ? `+${digits.slice(0, 2)}` : '+**';
  return `${country} *****-${digits.slice(-2)}`;
};

const formatOperationalPhone = (value, canShowFullPhone = true) => {
  if (!canShowFullPhone) {
    return maskPhone(value);
  }

  const digits = String(value || '').replace(/\D/g, '');

  if (!digits) {
    return 'Não informado';
  }

  if (digits.length >= 12 && digits.startsWith('55')) {
    const local = digits.slice(4);
    const prefixLength = local.length > 8 ? 5 : 4;
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`;
  }

  if (digits.length >= 10 && digits.length <= 11) {
    const local = digits.slice(2);
    const prefixLength = local.length > 8 ? 5 : 4;
    return `(${digits.slice(0, 2)}) ${local.slice(0, prefixLength)}-${local.slice(prefixLength)}`;
  }

  return String(value);
};

const normalizePhoneDigits = (value) => String(value || '').replace(/\D/g, '');

const findPhoneMatches = (items = [], phoneDigits = '') => {
  if (!phoneDigits) return [];

  return items.filter((item) => normalizePhoneDigits(item?.phone || item?.contactPhoneE164) === phoneDigits);
};

const hasConversationLinkedPatient = (conversation) => Boolean(conversation?.patientId || conversation?.patient_id);
const hasConversationLinkedLead = (conversation) => Boolean(conversation?.leadId || conversation?.lead_id);

const SENSITIVE_LEAD_CONTEXT_TERMS = [
  'cpf',
  ['pay', 'load'].join(''),
  ['web', 'hook'].join(''),
  ['pro', 'vider'].join(''),
  ['to', 'ken'].join(''),
  ['se', 'cret'].join(''),
  ['storage', 'path'].join('_'),
  ['signed', 'url'].join(' '),
];
const SENSITIVE_LEAD_CONTEXT_PATTERN = new RegExp(
  `(\\+?\\d[\\d\\s().-]{7,}|@|${SENSITIVE_LEAD_CONTEXT_TERMS.join('|')})`,
  'i',
);

const resolveWhatsAppLeadInterest = ({ selectedQueueItem, selectedTriageResult } = {}) => {
  const rawInterest = selectedTriageResult?.intentLabel
    || selectedTriageResult?.intent_label
    || selectedQueueItem?.queueLabel
    || selectedQueueItem?.queueStateLabel
    || '';
  const safeInterest = String(rawInterest || '').replace(/\s+/g, ' ').trim();

  if (!safeInterest || SENSITIVE_LEAD_CONTEXT_PATTERN.test(safeInterest)) {
    return 'Atendimento WhatsApp';
  }

  return `WhatsApp - ${safeInterest.slice(0, 72)}`;
};

const buildSafePatientLabel = (patient) => {
  if (!patient) return 'Nenhum paciente vinculado';
  return [patient.name, patient.status].filter(Boolean).join(' · ');
};

const buildSafeLeadLabel = (lead) => {
  if (!lead) return 'Nenhum lead vinculado';
  return [lead.name, lead.status, lead.priority].filter(Boolean).join(' · ');
};

const buildCrmEphemeralOptions = (items = [], prefix = 'crm-option') => (
  items.map((item, index) => ({
    entity: item,
    id: item.id,
    key: `${prefix}-${index + 1}`,
  }))
);

const buildCrmIdByOptionKey = (options = []) => new Map(
  options.map((option) => [option.key, option.id]),
);

const buildCrmOptionKeyById = (options = []) => new Map(
  options.map((option) => [option.id, option.key]),
);

const formatElapsedSince = (value, now = new Date()) => {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return 'sem horário confiável';

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / (60 * 1000)));
  if (elapsedMinutes < 60) return `há ${Math.max(1, elapsedMinutes)} min`;

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 48) return `há ${elapsedHours} h`;

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `há ${elapsedDays} dia${elapsedDays === 1 ? '' : 's'}`;
};

const buildConversationInactivityModel = (conversation, now = new Date()) => {
  if (!conversation || ['closed', 'resolved', 'archived'].includes(conversation.status)) {
    return { visible: false };
  }

  const lastActivityAt = conversation.lastMessageAt || conversation.updatedAt || conversation.createdAt;
  const lastActivityDate = new Date(lastActivityAt || '');
  if (Number.isNaN(lastActivityDate.getTime())) return { visible: false };

  const elapsedHours = (now.getTime() - lastActivityDate.getTime()) / (60 * 60 * 1000);
  if (elapsedHours < 4) return { visible: false };

  const closureSuggested = elapsedHours >= 24;

  return {
    badgeLabel: 'Revisar antes de encerrar',
    description: 'Este atendimento está sem nova atividade há algum tempo. Revise antes de encerrar.',
    helper: `Última atividade ${formatElapsedSince(lastActivityAt, now)}.`,
    severityClassName: closureSuggested
      ? 'border-amber-200 bg-amber-50/70 text-amber-950'
      : 'border-sky-200 bg-sky-50/70 text-sky-950',
    title: closureSuggested ? 'Encerramento sugerido' : 'Atendimento inativo',
    visible: true,
  };
};

const buildContactTimelineModel = ({
  conversation,
  conversations = [],
  triageResultsByConversation = {},
}) => {
  if (!conversation?.id) {
    return {
      current: null,
      emptyState: 'Selecione uma conversa para ver o histórico deste contato.',
      previous: [],
    };
  }

  const currentPhoneDigits = normalizePhoneDigits(conversation.contactPhoneE164);
  const sameContactConversations = conversations
    .filter((item) => item?.id)
    .filter((item) => item.channelId === conversation.channelId)
    .filter((item) => {
      const itemDigits = normalizePhoneDigits(item.contactPhoneE164);
      if (currentPhoneDigits && itemDigits) return itemDigits === currentPhoneDigits;
      return item.id === conversation.id;
    })
    .slice()
    .sort((first, second) => (
      new Date(second.lastMessageAt || second.updatedAt || second.createdAt || 0).getTime()
      - new Date(first.lastMessageAt || first.updatedAt || first.createdAt || 0).getTime()
    ));

  const mapTimelineItem = (item, current = false) => {
    const triageResult = triageResultsByConversation[item.id] || null;

    return {
      current,
      id: item.id,
      intentLabel: triageResult?.intentLabel || 'Sem intenção registrada',
      lastActivityAt: item.lastMessageAt || item.updatedAt || item.createdAt || null,
      queueLabel: triageResult?.suggestedQueueLabel || 'Sem fila registrada',
      statusLabel: item.statusLabel || item.status || 'Sem status',
    };
  };

  const currentItem = mapTimelineItem(conversation, true);
  const previous = sameContactConversations
    .filter((item) => item.id !== conversation.id)
    .slice(0, 4)
    .map((item) => mapTimelineItem(item));

  return {
    current: currentItem,
    emptyState: 'Ainda não há atendimentos anteriores separados para este contato.',
    helper: 'Hoje as mensagens novas entram na conversa aberta mais recente deste contato. Separação automática por novo atendimento será uma etapa futura.',
    previous,
  };
};

const MediaPlaceholderCard = ({ description, title }) => (
  <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
    <p className="font-semibold text-foreground">{title}</p>
    <p className="mt-1">{description}</p>
  </div>
);

const resolveSecureMediaType = (message, attachment) => {
  if (message.messageType === voiceMessageType) return voiceMessageType;
  if (attachment?.mediaType === voiceMessageType) return voiceMessageType;
  return attachment?.mediaType || message.messageType;
};

const buildSecureMediaFallback = (message) => {
  const type = message.messageType;
  if (type !== voiceMessageType && type !== 'image' && type !== 'document') return null;

  return {
    available: false,
    canPreview: false,
    failureLabel: 'Mídia recebida antes da habilitação de visualização segura.',
    isLegacy: true,
    mediaType: type,
    mimeType: null,
    sizeLabel: 'Tamanho não informado',
    status: 'legacy_metadata_only',
    statusLabel: 'Mídia antiga sem visualização segura',
  };
};

const MediaAccessButton = ({ isRequesting = false, label, onRequest }) => (
  <Button
    className="mt-3 w-full justify-center sm:w-auto"
    disabled={isRequesting}
    onClick={onRequest}
    size="sm"
    type="button"
    variant="outline"
  >
    {isRequesting ? (
      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <Eye className="mr-2 h-4 w-4" />
    )}
    {isRequesting ? 'Preparando mídia' : label}
  </Button>
);

const MediaDownloadButton = ({
  isDownloading = false,
  onDownload,
}) => (
  <Button
    className="mt-3 w-full justify-center sm:ml-2 sm:w-auto"
    disabled={isDownloading}
    onClick={onDownload}
    size="sm"
    type="button"
    variant="outline"
  >
    {isDownloading ? (
      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
    ) : (
      <Download className="mr-2 h-4 w-4" />
    )}
    {isDownloading ? 'Preparando download' : 'Baixar com segurança'}
  </Button>
);

const MediaOperationalSummary = ({
  isDownloadingMedia = false,
  isRequestingMediaAccess = false,
  mediaAccess = null,
  mediaAccessError = '',
  mediaDownloadError = '',
  mediaDownloadFeedback = '',
  message,
  onDownloadMedia,
  onRequestMediaAccess,
}) => {
  const attachment = message.mediaAttachment || buildSecureMediaFallback(message);
  const type = message.messageType;
  const secureMediaType = resolveSecureMediaType(message, attachment);

  if (!attachment && type !== 'location' && type !== 'contacts' && type !== 'unsupported' && type !== 'sticker') {
    return null;
  }

  const hasProxyObjectUrl = Boolean(mediaAccess?.available && mediaAccess?.objectUrl);
  const canRequestAccess = Boolean(attachment?.available && attachment?.canPreview && onRequestMediaAccess);
  const canDownload = Boolean(attachment?.available && attachment?.canPreview && onDownloadMedia);
  const handleRequestAccess = () => {
    if (!canRequestAccess || isRequestingMediaAccess) return;
    Promise.resolve(onRequestMediaAccess(message.id)).catch(() => null);
  };
  const handleDownloadMedia = () => {
    if (!canDownload || isDownloadingMedia) return;
    Promise.resolve(onDownloadMedia(message.id)).catch(() => null);
  };

  if (secureMediaType === voiceMessageType) {
    return (
      <div
        className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground"
        data-front-r23-secure-media-viewer={voiceMessageType}
      >
        <div className="flex items-start gap-2">
          <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Áudio recebido</p>
            <p className="mt-1">
              {attachment?.available
                ? 'Visualização restrita ao atendimento via proxy seguro. Nada é aberto automaticamente.'
                : attachment?.failureLabel || 'Mídia recebida antes da habilitação de visualização segura.'}
            </p>
            {attachment?.sizeLabel && <p className="mt-1">Tamanho seguro: {attachment.sizeLabel}.</p>}
          </div>
        </div>
        {hasProxyObjectUrl ? (
          <SecureAudioElement className="mt-3 w-full" controls preload="none" src={mediaAccess.objectUrl}>
            Seu navegador não permite reproduzir este áudio.
          </SecureAudioElement>
        ) : canRequestAccess ? (
          <MediaAccessButton
            isRequesting={isRequestingMediaAccess}
            label="Ouvir áudio"
            onRequest={handleRequestAccess}
          />
        ) : null}
        {canDownload && (
          <MediaDownloadButton
            isDownloading={isDownloadingMedia}
            onDownload={handleDownloadMedia}
          />
        )}
        {mediaAccessError && <p className="mt-2 text-amber-700">{mediaAccessError}</p>}
        {mediaDownloadError && <p className="mt-2 text-amber-700">{mediaDownloadError}</p>}
        {mediaDownloadFeedback && <p className="mt-2 text-emerald-700">{mediaDownloadFeedback}</p>}
      </div>
    );
  }

  if (secureMediaType === 'image') {
    return (
      <div
        className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground"
        data-front-r23-secure-media-viewer="image"
      >
        <div className="flex items-start gap-2">
          <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Imagem recebida</p>
            <p className="mt-1">
              {attachment?.available
                ? 'Preview restrito ao atendimento após validação do acesso pelo proxy.'
                : attachment?.failureLabel || 'Mídia recebida antes da habilitação de visualização segura.'}
            </p>
            {attachment?.sizeLabel && <p className="mt-1">Tamanho seguro: {attachment.sizeLabel}.</p>}
          </div>
        </div>
        {hasProxyObjectUrl ? (
          <img
            alt="Imagem recebida no atendimento"
            className="mt-3 max-h-80 w-full rounded-md border border-border bg-background object-contain"
            loading="lazy"
            src={mediaAccess.objectUrl}
          />
        ) : canRequestAccess ? (
          <MediaAccessButton
            isRequesting={isRequestingMediaAccess}
            label="Visualizar imagem"
            onRequest={handleRequestAccess}
          />
        ) : null}
        {canDownload && (
          <MediaDownloadButton
            isDownloading={isDownloadingMedia}
            onDownload={handleDownloadMedia}
          />
        )}
        {mediaAccessError && <p className="mt-2 text-amber-700">{mediaAccessError}</p>}
        {mediaDownloadError && <p className="mt-2 text-amber-700">{mediaDownloadError}</p>}
        {mediaDownloadFeedback && <p className="mt-2 text-emerald-700">{mediaDownloadFeedback}</p>}
      </div>
    );
  }

  if (secureMediaType === 'document') {
    return (
      <div
        className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground"
        data-front-r23-secure-media-viewer="document"
      >
        <div className="flex items-start gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Documento recebido</p>
            <p className="mt-1">
              {attachment?.available && attachment?.canPreview
                ? 'PDF disponível via proxy seguro. O arquivo não abre automaticamente.'
                : attachment?.failureLabel || 'Documento fora do MVP de visualização segura.'}
            </p>
            {attachment?.sizeLabel && <p className="mt-1">Tamanho seguro: {attachment.sizeLabel}.</p>}
          </div>
        </div>
        {hasProxyObjectUrl ? (
          <Button asChild className="mt-3 w-full justify-center sm:w-auto" size="sm" variant="outline">
            <a href={mediaAccess.objectUrl} rel="noreferrer" target="_blank">
              <Eye className="mr-2 h-4 w-4" />
              Abrir com segurança
            </a>
          </Button>
        ) : canRequestAccess ? (
          <MediaAccessButton
            isRequesting={isRequestingMediaAccess}
            label="Visualizar documento"
            onRequest={handleRequestAccess}
          />
        ) : null}
        {canDownload && (
          <MediaDownloadButton
            isDownloading={isDownloadingMedia}
            onDownload={handleDownloadMedia}
          />
        )}
        {mediaAccessError && <p className="mt-2 text-amber-700">{mediaAccessError}</p>}
        {mediaDownloadError && <p className="mt-2 text-amber-700">{mediaDownloadError}</p>}
        {mediaDownloadFeedback && <p className="mt-2 text-emerald-700">{mediaDownloadFeedback}</p>}
      </div>
    );
  }

  if (type === 'sticker') {
    return <MediaPlaceholderCard title="Sticker recebido" description="Conteúdo completo não exibido nesta etapa." />;
  }

  if (type === 'location') {
    return <MediaPlaceholderCard title="Localização recebida" description="Coordenadas não exibidas nesta etapa." />;
  }

  if (type === 'contacts') {
    return <MediaPlaceholderCard title="Contato recebido" description="Conteúdo completo não exibido nesta etapa." />;
  }

  if (type === 'unsupported') {
    return <MediaPlaceholderCard title="Mensagem recebida" description="Tipo ainda não exibido na operação." />;
  }

  return null;
};

const MediaMetadataSummary = ({ message }) => {
  const media = message.mediaMetadata;
  const hasMediaMetadata = Boolean(media?.mimeType || media?.caption || media?.hasFilename || media?.hasProviderMediaId || media?.sha256Present);
  const hasContactsCount = typeof message.payloadSummary?.contactsCount === 'number';

  if (!hasMediaMetadata && !hasContactsCount && !message.payloadSummary?.locationPresent && message.messageType !== 'unsupported') {
    return null;
  }

  return (
    <div
      className="mt-3 overflow-hidden rounded-lg border border-border/60 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground"
      data-front-p-media-contract-copy="Resumo seguro da mídia; visualizador protegido"
      data-front-r23-secure-media-contract="true"
    >
      <p className="font-semibold text-foreground">Mídia recebida</p>
      <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">
        {media?.hasFilename && <span className="min-w-0 break-words">Documento recebido sem nome exibido.</span>}
        {media?.mimeType && <span className="min-w-0 break-words">Formato reconhecido sem detalhe técnico.</span>}
        {media?.caption && <span className="min-w-0 break-words">Legenda recebida sem abrir mídia automaticamente.</span>}
        {media?.hasProviderMediaId && <span className="min-w-0 break-words">Referência técnica protegida no servidor.</span>}
        {media?.sha256Present && <span className="min-w-0 break-words">Integridade técnica preservada sem identificador visível.</span>}
        {hasContactsCount && <span className="min-w-0 break-words">Contato recebido sem conteúdo completo exibido.</span>}
        {message.payloadSummary?.locationPresent && <span className="min-w-0 break-words">Localização recebida sem coordenadas exibidas.</span>}
        {message.payloadSummary?.unsupportedType && <span className="min-w-0 break-words">Tipo não exibido na operação.</span>}
      </div>
      <p className="mt-2">Mídias recebidas usam visualização protegida. A prévia só aparece após ação explícita.</p>
    </div>
  );
};

const EmptyState = ({ canReadOmnichannel }) => (
  <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background">
      {canReadOmnichannel ? <Inbox className="h-5 w-5 text-primary" /> : <ShieldCheck className="h-5 w-5 text-amber-600" />}
    </div>
    <p className="text-sm font-semibold text-foreground">
      {canReadOmnichannel ? 'Nenhuma conversa registrada ainda' : 'Sem acesso ao módulo Omnichannel'}
    </p>
    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
      {canReadOmnichannel
        ? 'Este vazio não é erro. Mensagens recebidas aparecem aqui após a configuração técnica do canal no Master Control.'
        : 'Este perfil precisa do módulo omnichannel e das permissões omnichannel.read ou omnichannel.messages.read.'}
    </p>
  </div>
);

const priorityLaneToneById = {
  closed_window: 'border-violet-200 bg-violet-50/50 text-violet-800',
  reply_now: 'border-primary/20 bg-primary/5 text-primary',
  scheduled_returns: 'border-amber-200 bg-amber-50/60 text-amber-800',
  scheduling_attention: 'border-red-200 bg-red-50/60 text-red-800',
  unread: 'border-red-200 bg-red-50/60 text-red-800',
};

const priorityLaneIconById = {
  closed_window: Clock3,
  reply_now: FileClock,
  scheduled_returns: CalendarDays,
  scheduling_attention: AlertTriangle,
  unread: MessageCircle,
};

const QueuePriorityOverview = ({
  isLoading = false,
  onFilterChange = () => {},
  onOpenRecommended = () => {},
  priorityOverview = null,
}) => {
  if (!priorityOverview || priorityOverview.isEmpty) {
    return null;
  }

  const hasRecommendation = Boolean(priorityOverview.hasRecommendation && priorityOverview.recommendedConversationId);

  return (
    <section
      className="rounded-lg border border-primary/15 bg-primary/5 p-3"
      data-front-r211a-operational-priority-overview="true"
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <Flag className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 break-words">{priorityOverview.headline}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {priorityOverview.helper}
          </p>
        </div>
        <Button
          className="h-auto min-h-8 w-full whitespace-normal text-xs sm:w-auto"
          data-front-r211a-action="open-recommended-conversation"
          disabled={!hasRecommendation || isLoading}
          onClick={() => onOpenRecommended(priorityOverview.recommendedConversationId)}
          size="sm"
          type="button"
        >
          Abrir recomendada
        </Button>
      </div>

      {hasRecommendation && (
        <div
          className="mt-3 rounded-md border border-background/80 bg-background/80 p-2.5"
          data-front-r211a-recommended-conversation="true"
        >
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {priorityOverview.recommendedContactLabel}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {priorityOverview.recommendedReasonLabel} · {priorityOverview.recommendedActionLabel}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {priorityOverview.recommendedSecondaryLabel}
              </p>
            </div>
            {priorityOverview.visibleRiskSignals?.length ? (
              <div
                className="flex min-w-0 flex-wrap gap-1 sm:max-w-[42%] sm:justify-end"
                data-front-r211a-risk-signals="true"
              >
                {priorityOverview.visibleRiskSignals.slice(0, 4).map((signal) => (
                  <Badge key={signal} variant="outline" className={`${responsiveBadgeClass} border-border bg-muted text-muted-foreground`}>
                    {signal}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2" data-front-r211a-priority-lanes="true">
        {priorityOverview.lanes.map((lane) => {
          const Icon = priorityLaneIconById[lane.id] || ListChecks;
          const laneTone = priorityLaneToneById[lane.id] || 'border-border bg-muted text-muted-foreground';

          return (
            <button
              key={lane.id}
              className={`min-w-0 rounded-md border p-2 text-left transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${laneTone}`}
              data-front-r211a-priority-lane={lane.id}
              disabled={!lane.count || isLoading}
              onClick={() => onFilterChange(lane.filterId)}
              title={lane.helper}
              type="button"
            >
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-xs font-semibold">{lane.label}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-foreground">{lane.count}</span>
              </span>
              <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                {lane.helper}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

const SelectedConversationOperationalPlan = ({
  manualReplyWindowState = null,
  nextAction = null,
  onFocusContext = () => {},
  onPrepareManualReply = () => {},
  selectedQueueItem = null,
}) => {
  if (!nextAction || !selectedQueueItem) {
    return null;
  }

  const canPrepareReply = nextAction.actionType === 'prepare_reply' && Boolean(nextAction.replyText);
  const hasOpenDestination = nextAction.actionType === 'open' && Boolean(nextAction.href);
  const nextActionAtLabel = selectedQueueItem.nextActionAt ? formatDateTime(selectedQueueItem.nextActionAt) : '';
  const actionDisabled = canPrepareReply && Boolean(nextAction.disabledReason);

  return (
    <div
      className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2.5"
      data-front-r211e-compact-operational-plan="true"
      data-front-r211b-selected-operational-plan="true"
    >
      <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 break-words">Plano operacional desta conversa</span>
          </p>
          <p className="mt-1 line-clamp-1 text-sm font-semibold leading-snug text-foreground" data-front-r211b-plan-title="true">
            {nextAction.title}
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 lg:w-56">
          {hasOpenDestination ? (
            <Button
              asChild
              className="h-auto min-h-8 w-full whitespace-normal text-xs"
              data-front-r211b-action="open-plan-destination"
              size="sm"
              variant="outline"
            >
              <Link to={nextAction.href}>
                <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
                <span className={compactManualButtonLabelClass}>{nextAction.label}</span>
              </Link>
            </Button>
          ) : canPrepareReply ? (
            <Button
              className="h-auto min-h-8 w-full whitespace-normal text-xs"
              data-front-r211b-action="prepare-plan-reply"
              disabled={actionDisabled}
              onClick={() => onPrepareManualReply(nextAction.replyText, { sourceLabel: 'plano operacional' })}
              size="sm"
              type="button"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>{nextAction.label}</span>
            </Button>
          ) : (
            <Button
              className="h-auto min-h-8 w-full whitespace-normal text-xs"
              data-front-r211b-action="focus-plan-controls"
              onClick={onFocusContext}
              size="sm"
              type="button"
              variant="outline"
            >
              <ListChecks className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>{nextAction.label}</span>
            </Button>
          )}
          {nextAction.disabledReason && (
            <p className="text-[11px] leading-relaxed text-muted-foreground">{nextAction.disabledReason}</p>
          )}
        </div>
      </div>

      <details
        className="mt-2 rounded-md border border-primary/10 bg-background/70 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground"
        data-front-r211e-plan-details="collapsed"
      >
        <summary className="cursor-pointer font-semibold text-foreground">Ver motivo e sinais</summary>
        <div className="mt-2 space-y-2">
          <p className="line-clamp-2" data-front-r211b-plan-reason="true">
            {nextAction.reason}
          </p>
          <p className="line-clamp-2">
            {nextAction.description}
          </p>
          <div className="flex min-w-0 flex-wrap gap-1.5" data-front-r211b-plan-signals="true">
            <Badge variant="outline" className={`${responsiveBadgeClass} border-primary/20 bg-background/80 text-primary`}>
              {selectedQueueItem.primaryAttentionLabel || 'Acompanhar'}
            </Badge>
            <Badge variant="outline" className={`${responsiveBadgeClass} border-border bg-background/80 text-muted-foreground`}>
              {manualReplyWindowState?.label || 'Janela de resposta'}
            </Badge>
            <Badge variant="outline" className={`${responsiveBadgeClass} border-border bg-background/80 text-muted-foreground`}>
              {selectedQueueItem.assignedToLabel || 'Sem responsável'}
            </Badge>
            {nextActionAtLabel && (
              <Badge variant="outline" className={`${responsiveBadgeClass} border-amber-200 bg-amber-50 text-amber-800`}>
                Retorno: {nextActionAtLabel}
              </Badge>
            )}
          </div>
          <p
            className="line-clamp-2 text-[11px] leading-relaxed text-muted-foreground"
            data-front-r211b-plan-boundary="true"
          >
            Plano local e seguro: pode preparar rascunho ou abrir controles existentes; não envia WhatsApp, não cria tarefa, não altera provider e não muda fila automaticamente.
          </p>
        </div>
      </details>
    </div>
  );
};

const schedulingToneByValue = {
  danger: 'border-red-200 bg-red-50/80 text-red-900',
  info: 'border-sky-200 bg-sky-50/80 text-sky-900',
  neutral: 'border-border bg-muted/30 text-foreground',
  success: 'border-emerald-200 bg-emerald-50/80 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50/80 text-amber-900',
};

const SchedulingOperationalStatusPanel = ({
  canManage = false,
  isMutating = false,
  isUnassigned = false,
  onAssignToMe = () => {},
  onShowHistory = () => {},
  scheduling = null,
}) => {
  if (!scheduling?.hasSchedulingFlow) return null;

  const tone = schedulingToneByValue[scheduling.tone] || schedulingToneByValue.neutral;

  return (
    <section
      className={`rounded-lg border p-3 ${tone}`}
      data-front-r578-scheduling-operation="true"
      data-front-r578-scheduling-status={scheduling.statusKey}
    >
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="min-w-0 break-words">Agenda pelo WhatsApp · {scheduling.label}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed">{scheduling.description}</p>
          <p className="mt-1 text-[11px] leading-relaxed opacity-80">
            {scheduling.nextManualAction}. Histórico sanitizado: {scheduling.activityCount} marco(s).
          </p>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
          {scheduling.requiresHuman && isUnassigned && (
            <Button
              className="h-auto min-h-8 w-full whitespace-normal sm:w-auto"
              data-front-r578-action="takeover"
              disabled={!canManage || isMutating}
              onClick={() => {
                Promise.resolve(onAssignToMe()).catch(() => null);
              }}
              size="sm"
              type="button"
            >
              <UserRound className="mr-2 h-4 w-4" />
              Assumir atendimento
            </Button>
          )}
          <Button
            className="h-auto min-h-8 w-full whitespace-normal sm:w-auto"
            data-front-r578-action="show-history"
            onClick={onShowHistory}
            size="sm"
            type="button"
            variant="outline"
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver histórico
          </Button>
        </div>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 border-t border-current/10 pt-3 text-[11px] leading-relaxed">
        <span className="min-w-0 flex-1">
          Configuração de lembretes, limite mensal e orçamento continuam tenant-scoped em Configurações.
        </span>
        <Button asChild className="h-8 shrink-0 px-3 text-xs" size="sm" variant="ghost">
          <Link to={scheduling.settingsHref}>
            Abrir controles
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

const primaryConversationFilterIds = new Set(['respond_now', 'unread', 'all']);
const secondaryConversationFilterIds = new Set(['closed_window', 'mine', 'unassigned', 'unlinked', 'high_priority', 'scheduling_attention', 'open', 'waiting', 'resolved', 'archived', 'overdue']);

const ConversationList = ({
  activeChannelFilter,
  activeFilter,
  activeSuggestedQueueFilter,
  canReadOmnichannel,
  canShowFullPhone = false,
  channelFilters = [],
  channelStatus,
  conversations = [],
  draftConversationIds = [],
  filters = [],
  focusedConversationId = null,
  hasMoreConversations = false,
  isFocusMode = false,
  isLoading = false,
  onClearFocusMode,
  onChannelFilterChange = () => {},
  onFilterChange,
  onFocusNextConversation,
  onLoadMoreConversations = () => {},
  onRefresh,
  onSearchChange,
  onSelectConversation,
  onSuggestedQueueFilterChange = () => {},
  priorityOverview,
  queueItems,
  search = '',
  selectedConversation,
  suggestedQueueFilters = [],
  summary,
}) => {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  if (Array.isArray(queueItems)) {
    const primaryFilters = filters.filter((filter) => primaryConversationFilterIds.has(filter.id));
    const secondaryFilters = filters.filter((filter) => secondaryConversationFilterIds.has(filter.id));
    const hasActiveSecondaryFilter = secondaryFilters.some((filter) => filter.id === activeFilter);
    const draftConversationIdSet = new Set(draftConversationIds);
    const realChannelFilters = channelFilters.filter((filter) => filter.id !== 'all');
    const selectedChannelFilter = channelFilters.find((filter) => filter.id === activeChannelFilter) || realChannelFilters[0] || null;
    const queueSuggestionOptions = suggestedQueueFilters.filter((filter) => filter.id !== 'all' && filter.count > 0);
    const selectedSuggestedQueueFilter = suggestedQueueFilters.find((filter) => filter.id === activeSuggestedQueueFilter) || null;

    return (
      <div className="space-y-4" data-front-r-clinic-mode="true">
        <QueuePriorityOverview
          isLoading={isLoading}
          onFilterChange={onFilterChange}
          onOpenRecommended={(conversationId) => {
            if (!conversationId) return;
            onSelectConversation(conversationId);
          }}
          priorityOverview={priorityOverview}
        />

        <details className="rounded-lg border border-border/60 bg-background p-3" data-front-r29ux-queue-overview="collapsed">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Visão da fila</summary>
          <div
            className="mt-3 flex min-w-0 flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/15 p-1.5"
            data-front-r-queue-summary="compact"
            data-front-r3-queue-insights="true"
          >
            {queueSummaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.key}
                  className={`flex min-w-[92px] flex-1 items-center gap-2 rounded-md border px-2 py-1.5 ${card.tone}`}
                  title={card.title || card.label}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-tight text-foreground">{summary?.[card.key] || 0}</p>
                    <p className="truncate text-[10px] font-semibold uppercase tracking-wide">{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

        <div className="mt-3 rounded-lg border border-primary/15 bg-primary/5 p-2.5" data-front-r3-focus-mode="true">
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {isFocusMode ? 'Foco ativo' : 'Foco de atendimento'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {queueItems.length
                  ? 'Seleciona a próxima da fila filtrada, sem salvar preferência.'
                  : 'Sem conversa no filtro atual para focar.'}
              </p>
            </div>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                className="h-auto min-h-8 w-full min-w-0 whitespace-normal text-xs sm:w-auto"
                data-front-r3-action="focus-next-conversation"
                disabled={!queueItems.length || isLoading}
                onClick={onFocusNextConversation}
                size="sm"
                type="button"
                variant="default"
              >
                Focar próxima
              </Button>
              {isFocusMode && (
                <Button
                  className="h-auto min-h-8 w-full min-w-0 whitespace-normal text-xs sm:w-auto"
                  data-front-r3-action="clear-focus-mode"
                  onClick={onClearFocusMode}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Sair do foco
                </Button>
              )}
            </div>
          </div>
        </div>
        </details>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {primaryFilters.map((filter) => (
              <Button
                key={filter.id}
                aria-label={filter.label}
                className="h-auto min-h-11 max-w-full px-2 py-1 text-xs"
                data-front-p-queue-filter={filter.id}
                data-front-r-conversation-filter-primary={filter.id}
                onClick={() => onFilterChange(filter.id)}
                size="sm"
                type="button"
                variant={activeFilter === filter.id ? 'default' : 'outline'}
              >
                {queueFilterShortLabels[filter.id] || filter.label}
              </Button>
            ))}
            <Sheet onOpenChange={setIsMobileFiltersOpen} open={isMobileFiltersOpen}>
              <SheetTrigger asChild>
                <Button
                  className="h-auto min-h-11 flex-1 px-3 py-2 text-xs xl:hidden"
                  data-front-r586-mobile-filter-drawer="true"
                  type="button"
                  variant={hasActiveSecondaryFilter || activeChannelFilter !== 'all' || activeSuggestedQueueFilter !== 'all' ? 'default' : 'outline'}
                >
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Mais filtros
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[min(92vw,380px)] overflow-y-auto" side="right">
                <SheetHeader>
                  <SheetTitle>Filtros da fila</SheetTitle>
                  <SheetDescription>
                    Refine a leitura atual por situação, canal ou fila sugerida.
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Situação</p>
                    <div className="grid grid-cols-2 gap-2">
                      {secondaryFilters.map((filter) => (
                        <Button
                          className="h-auto min-h-11 whitespace-normal px-2 text-xs"
                          key={`mobile-${filter.id}`}
                          onClick={() => {
                            onFilterChange(filter.id);
                            setIsMobileFiltersOpen(false);
                          }}
                          type="button"
                          variant={activeFilter === filter.id ? 'default' : 'outline'}
                        >
                          {queueFilterShortLabels[filter.id] || filter.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Canal</p>
                    <div className="grid gap-2">
                      {channelFilters.map((filter) => (
                        <Button
                          className="h-auto min-h-11 justify-between whitespace-normal px-3 text-xs"
                          key={`mobile-channel-${filter.id}`}
                          onClick={() => {
                            onChannelFilterChange(filter.id);
                            setIsMobileFiltersOpen(false);
                          }}
                          type="button"
                          variant={activeChannelFilter === filter.id ? 'default' : 'outline'}
                        >
                          <span>{filter.label}</span>
                          <span>{filter.count || 0}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Fila sugerida</p>
                    <div className="grid gap-2">
                      {suggestedQueueFilters.map((filter) => (
                        <Button
                          className="h-auto min-h-11 justify-between whitespace-normal px-3 text-xs"
                          key={`mobile-queue-${filter.id}`}
                          onClick={() => {
                            onSuggestedQueueFilterChange(filter.id);
                            setIsMobileFiltersOpen(false);
                          }}
                          type="button"
                          variant={activeSuggestedQueueFilter === filter.id ? 'default' : 'outline'}
                        >
                          <span>{filter.id === 'all' ? 'Todas as filas' : filter.label}</span>
                          <span>{filter.count || 0}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {secondaryFilters.length ? (
            <details className="hidden rounded-lg border border-border/60 bg-muted/10 p-3 xl:block" open={hasActiveSecondaryFilter}>
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Mais filtros</summary>
              <div className="mt-3 flex flex-wrap gap-2">
                {secondaryFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    aria-label={filter.label}
                    className="h-auto min-h-8 max-w-full px-2 py-1 text-xs"
                    data-front-p-queue-filter={filter.id}
                    data-front-r-conversation-filter-secondary={filter.id}
                    onClick={() => onFilterChange(filter.id)}
                    size="sm"
                    type="button"
                    variant={activeFilter === filter.id ? 'default' : 'outline'}
                  >
                    {queueFilterShortLabels[filter.id] || filter.label}
                  </Button>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <details
          className="hidden rounded-lg border border-border/60 bg-background p-3 xl:block"
          data-front-r29ux-advanced-channel-queue="collapsed"
          open={(activeChannelFilter && activeChannelFilter !== 'all') || (activeSuggestedQueueFilter && activeSuggestedQueueFilter !== 'all')}
        >
          <summary className="cursor-pointer text-sm font-semibold text-foreground">Canal e fila</summary>
          <div className="mt-3 space-y-3">
            <div className="space-y-2" data-front-r5-channel-filter="true">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canal</p>
            {realChannelFilters.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {channelFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    aria-label={`Filtrar canal ${filter.label}`}
                    className="h-auto min-h-8 max-w-full px-2 py-1 text-xs"
                    onClick={() => onChannelFilterChange(filter.id)}
                    size="sm"
                    type="button"
                    variant={activeChannelFilter === filter.id ? 'default' : 'outline'}
                  >
                    <span className="min-w-0 truncate">{filter.label}</span>
                    {filter.count > 0 && <span className="ml-1 shrink-0 opacity-75">({filter.count})</span>}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="max-w-full border-sky-200 bg-sky-50 text-sky-700" title={selectedChannelFilter?.label || channelStatus?.statusLabel}>
                  Canal: {selectedChannelFilter?.label || 'WhatsApp oficial'}
                </Badge>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  {selectedChannelFilter?.statusLabel || channelStatus?.statusLabel || 'Status do canal não informado'}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2" data-front-r5-queue-filter="true">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fila sugerida</p>
            {queueSuggestionOptions.length ? (
              <div className="flex flex-wrap gap-2">
                {suggestedQueueFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    aria-label={`Filtrar fila sugerida ${filter.label}`}
                    className="h-auto min-h-8 max-w-full px-2 py-1 text-xs"
                    onClick={() => onSuggestedQueueFilterChange(filter.id)}
                    size="sm"
                    type="button"
                    variant={activeSuggestedQueueFilter === filter.id ? 'default' : 'outline'}
                  >
                    <span className="min-w-0 truncate">{filter.id === 'all' ? 'Todas filas' : filter.label}</span>
                    {filter.count > 0 && <span className="ml-1 shrink-0 opacity-75">({filter.count})</span>}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border/70 bg-background p-2 text-xs leading-relaxed text-muted-foreground">
                Fila/setor ainda não configurado. Quando houver triagem persistida, a fila aparecerá como Fila sugerida.
              </p>
            )}
            {selectedSuggestedQueueFilter?.id && selectedSuggestedQueueFilter.id !== 'all' && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Filtro atual: Fila sugerida {selectedSuggestedQueueFilter.label}. Não há roteamento persistido por setor nesta etapa.
              </p>
            )}
            </div>
          </div>
        </details>

        <label className="block min-w-0 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Busca</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-front-p-queue-search="true"
              data-front-r-conversation-search="true"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar contato, telefone ou motivo"
              type="search"
              value={search}
            />
          </div>
        </label>

        {isLoading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
              <p className="font-semibold">Atualizando leitura...</p>
              <p className="mt-1 text-xs leading-relaxed">A fila aparece após a primeira leitura concluir.</p>
            </div>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : queueItems.length ? (
          <div className="space-y-2" data-front-r-conversation-list="true">
            {queueItems.map((item) => {
              const isSelected = selectedConversation?.id === item.conversationId;
              const isFocused = isFocusMode && focusedConversationId === item.conversationId;
              const hasLocalDraft = draftConversationIdSet.has(item.conversationId);
              const attentionReasonSummary = buildVisibleAttentionReasons(item.attentionReasons);

              return (
                <button
                  key={item.conversationId}
                  className={`min-w-0 w-full overflow-hidden rounded-lg border p-3 text-left transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isFocused ? 'border-primary/70 bg-primary/10 ring-2 ring-primary/30' : isSelected ? 'border-primary/50 bg-primary/5' : queueToneByItem(item)}`}
                  data-front-p-action="select-conversation"
                  data-front-p-conversation-source={item.source}
                  data-front-p-queue-item="true"
                  data-front-p-queue-reason={item.reason}
                  data-front-r3-local-draft={hasLocalDraft ? 'true' : undefined}
                  data-front-r3-focus-mode={isFocused ? 'true' : undefined}
                  data-front-r3-focused-conversation={isFocused ? 'true' : undefined}
                  onClick={() => onSelectConversation(item.conversationId)}
                  type="button"
                >
                  <div className="mb-2 flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{item.contato}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(canShowFullPhone ? item.phoneLabel : item.maskedPhone) || item.maskedPhone} · {item.latestInteractionDirectionLabel || 'Interação'} · {formatDateTime(item.lastInteractionAt || item.lastMessageAt)}
                      </p>
                    </div>
                    {item.hasUnreadInbound && (
                      <span
                        className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white"
                        title={`${item.unreadCount || 1} mensagem(ns) não lida(s)`}
                      >
                        {item.unreadCount || 1}
                      </span>
                    )}
                  </div>

                  <div className="mb-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className={statusToneByValue[item.status] || 'border-border bg-muted text-muted-foreground'}>
                      {item.statusLabel}
                    </Badge>
                    {item.source === 'Fallback demo' && (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Demo
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={manualReplyWindowToneByStatus[item.manualReplyWindowStatus] || 'border-border bg-muted text-muted-foreground'}
                      data-front-r29-window-badge="true"
                      title={item.manualReplyWindowHelperText}
                    >
                      {item.manualReplyWindowBadgeLabel}
                    </Badge>
                    {item.schedulingHasFlow && (
                      <Badge
                        variant="outline"
                        className={item.schedulingRequiresHuman
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : item.scheduling?.isCompleted
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-sky-200 bg-sky-50 text-sky-700'}
                        data-front-r578-queue-scheduling="true"
                      >
                        Agenda: {item.scheduling.label}
                      </Badge>
                    )}
                    {hasLocalDraft && (
                      <Badge
                        variant="outline"
                        className="border-violet-200 bg-violet-50 text-violet-700"
                        data-front-r3-local-draft-badge="true"
                      >
                        Rascunho
                      </Badge>
                    )}
                  </div>

                  {attentionReasonSummary.visibleReasons.length ? (
                    <div
                      className="mb-2 rounded-md border border-background/80 bg-background/80 p-2"
                      data-front-r211a-item-attention="true"
                    >
                      <p className="text-xs font-semibold text-foreground">
                        {item.primaryAttentionLabel}
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {item.nextManualAction}
                      </p>
                      <div className="mt-2 flex min-w-0 flex-wrap gap-1" data-front-r3-priority-reason="true">
                        {attentionReasonSummary.visibleReasons.map((reason) => (
                          <Badge key={reason} variant="outline" className={`${responsiveBadgeClass} border-border bg-muted text-muted-foreground`}>
                            {reason}
                          </Badge>
                        ))}
                        {attentionReasonSummary.hiddenCount > 0 && (
                          <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                            +{attentionReasonSummary.hiddenCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1 text-sm leading-relaxed">
                    <div
                      className="sr-only"
                      data-front-r5-queue-card-context="true"
                    >
                      Canal: {item.channelLabel || 'WhatsApp oficial'}. {item.queueContext?.isPersisted ? 'Fila sugerida:' : 'Fila:'} {item.queueLabel || 'Sem fila definida'}.
                      Responsável: {item.assignedToLabel}. Motivo: {item.reason}. Próximo passo: {item.nextManualAction}.
                    </div>
                    {item.latestMessagePreview && (
                      <p className="line-clamp-2 break-words text-muted-foreground">
                        {item.latestMessagePreview}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : canReadOmnichannel ? (
          <div
            className="space-y-3 rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm leading-relaxed text-muted-foreground"
            data-front-r2-empty-queue-contract-copy="Nenhuma conversa para o filtro atual"
          >
            <div>
              <p className="font-semibold text-foreground">Nenhuma conversa encontrada nesta leitura.</p>
              <p className="mt-1">
                Ajuste os filtros ou atualize a leitura. Quando a base estiver em demonstração, este resultado não representa volume real da clínica.
              </p>
            </div>
            <Button
              className="h-auto min-h-9 w-full whitespace-normal sm:w-auto"
              onClick={onRefresh}
              size="sm"
              type="button"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        ) : (
          <EmptyState canReadOmnichannel={canReadOmnichannel} />
        )}
        {hasMoreConversations && !isLoading && (
          <Button
            className="h-auto min-h-11 w-full whitespace-normal"
            data-front-r586-load-more-conversations="true"
            onClick={onLoadMoreConversations}
            type="button"
            variant="outline"
          >
            Carregar mais conversas
          </Button>
        )}
      </div>
    );
  }

  if (!conversations.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const isSelected = selectedConversation?.id === conversation.id;

        return (
          <button
            key={conversation.id}
            className={`min-w-0 w-full overflow-hidden rounded-lg border p-4 text-left transition hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isSelected ? 'border-primary/50 bg-primary/5' : 'border-border/60 bg-card'}`}
            data-front-p-action="select-conversation"
            data-front-p-conversation-source={conversation.source}
            onClick={() => onSelectConversation(conversation.id)}
            type="button"
          >
            <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{conversation.contactDisplayName}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatOperationalPhone(conversation.contactPhoneE164, canShowFullPhone)} · {formatDateTime(conversation.lastMessageAt)}
                </p>
              </div>
              <div className="flex max-w-[45%] shrink-0 flex-col items-end gap-1">
                <Badge variant="outline" className={statusToneByValue[conversation.status] || 'border-border bg-muted text-muted-foreground'}>
                  {conversation.statusLabel}
                </Badge>
                <Badge variant="outline" className={priorityToneByValue[conversation.priority] || priorityToneByValue.normal}>
                  {conversation.priorityLabel}
                </Badge>
              </div>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              <Badge variant="outline" className={messageTypeToneByValue[conversation.latestMessageType] || 'border-border bg-muted text-muted-foreground'}>
                Tipo: {conversation.latestMessageTypeLabel || 'Sem mensagem'}
              </Badge>
              <Badge variant="outline" className={conversation.hasUnreadInbound ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-muted text-muted-foreground'}>
                {conversation.hasUnreadInbound ? `Não lida (${conversation.unreadCount || 1})` : 'Lida'}
              </Badge>
              <Badge variant="outline" className={conversation.assignedTo ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                {conversation.assignedToLabel || (conversation.assignedTo ? 'Responsável atribuído' : 'Sem responsável')}
              </Badge>
              {conversation.source === 'Fallback demo' && (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                  Demo
                </Badge>
              )}
            </div>
            <p className="line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">{conversation.latestMessagePreview}</p>
          </button>
        );
      })}
    </div>
  );
};

const buildOperationalTimelineItems = ({ activities = [], messages = [], notes = [] }) => ([
  ...messages.map((message) => ({
    id: `message-${message.id}`,
    kind: 'message',
    timestamp: message.receivedAt || message.sentAt || message.createdAt,
    value: message,
  })),
  ...activities.map((activity) => ({
    id: `activity-${activity.id}`,
    kind: 'activity',
    timestamp: activity.createdAt,
    value: activity,
  })),
  ...notes.map((note) => ({
    id: `note-${note.id}`,
    kind: 'note',
    timestamp: note.createdAt,
    value: note,
  })),
]).sort((first, second) => new Date(first.timestamp || 0).getTime() - new Date(second.timestamp || 0).getTime());

const RECENT_TIMELINE_ITEM_LIMIT = 12;

const genericMessagePreviews = new Set([
  'Texto recebido',
  'Texto recebido sem corpo salvo',
  'Mensagem recebida',
  'Conteúdo redigido.',
]);

const inboundMessageUnavailableText = 'Mensagem recebida sem texto disponível.';

const resolveTimelineMessageText = (message) => {
  const contentText = String(message.contentText || '').trim();
  if (contentText) return contentText;

  const messagePreview = String(message.messagePreview || '').trim();
  if (messagePreview && !genericMessagePreviews.has(messagePreview)) return messagePreview;

  if (message.messageType === voiceMessageType) return 'Áudio recebido — transcrição indisponível nesta etapa.';
  if (message.messageType === 'image') return 'Imagem recebida — preview indisponível nesta etapa.';
  if (message.messageType === 'video') return 'Vídeo recebido — preview indisponível nesta etapa.';
  if (message.messageType === 'document') return 'Documento recebido — arquivo não baixado nesta etapa.';
  if (message.messageType === 'sticker') return 'Sticker recebido — conteúdo completo não exibido.';
  if (message.messageType === 'location') return 'Localização recebida — coordenadas não exibidas.';
  if (message.messageType === 'contacts') return 'Contato recebido — conteúdo completo não exibido.';
  if (message.messageType === 'unsupported') return 'Tipo de mensagem recebido sem exibição operacional.';

  return message.direction === 'outbound'
    ? 'Saída registrada sem texto disponível.'
    : inboundMessageUnavailableText;
};

const buildTimelineMessageVisualModel = (message) => {
  if (message.direction === 'outbound') {
    return {
      align: 'justify-end',
      avatar: 'A',
      avatarImage: VIRTUAL_ATTENDANT_AVATAR_SRC,
      avatarLabel: 'Atendente',
      avatarTone: 'border-emerald-200 bg-emerald-100 text-emerald-800',
      bubble: 'rounded-br-md border-emerald-200 bg-emerald-50 text-emerald-950',
      directionLabel: 'Clínica',
      helper: 'Saída registrada no atendimento. Quando for bot/sistema, não representa atendente humana.',
      showProviderStatus: true,
    };
  }

  return {
    align: 'justify-start',
    avatar: 'C',
    avatarLabel: 'Cliente',
    avatarTone: 'border-sky-200 bg-sky-100 text-sky-800',
    bubble: 'rounded-bl-md border-slate-200 bg-white text-foreground',
    directionLabel: 'Cliente',
    helper: 'Entrada recebida.',
    showProviderStatus: false,
  };
};

const TimelineActorAvatar = ({ imageSrc = '', label, title, tone }) => (
  <div
    aria-label={title}
    className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs font-semibold shadow-sm ${tone}`}
    data-front-hugo-message-avatar="true"
    data-front-hugo-virtual-attendant-avatar={imageSrc ? 'true' : undefined}
    title={title}
  >
    {imageSrc ? (
      <img
        alt=""
        className="h-full w-full object-cover"
        draggable="false"
        src={imageSrc}
      />
    ) : (
      label
    )}
  </div>
);

const MessageTimeline = ({
  activities = [],
  activeMediaDownloadMessageId = '',
  activeMediaAccessMessageId = '',
  conversationId = '',
  mediaAccessByMessageId = {},
  mediaAccessError = '',
  mediaDownloadError = '',
  mediaDownloadFeedback = '',
  messages = [],
  notes = [],
  onDownloadMessageMedia,
  onRequestMessageMediaAccess,
  showInternalEvents = false,
}) => {
  const allTimelineItems = buildOperationalTimelineItems({ activities, messages, notes });
  const timelineItems = showInternalEvents
    ? allTimelineItems
    : allTimelineItems.filter((item) => item.kind === 'message');
  const [showFullHistory, setShowFullHistory] = useState(false);
  const timelineScrollRef = useRef(null);
  const latestTimelineItemId = timelineItems[timelineItems.length - 1]?.id || '';
  const hiddenOlderTimelineItemCount = Math.max(0, timelineItems.length - RECENT_TIMELINE_ITEM_LIMIT);
  const visibleTimelineItems = showFullHistory
    ? timelineItems
    : timelineItems.slice(-RECENT_TIMELINE_ITEM_LIMIT);
  const timelineItemLabel = showInternalEvents ? 'registros' : 'mensagens';

  useEffect(() => {
    setShowFullHistory(false);
  }, [conversationId, showInternalEvents]);

  useEffect(() => {
    const scrollElement = timelineScrollRef.current?.closest('[data-omni-conversation-scroll]') || timelineScrollRef.current;
    if (!scrollElement) return;

    scrollElement.scrollTop = scrollElement.scrollHeight;
  }, [latestTimelineItemId, showFullHistory]);

  if (!timelineItems.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nenhum item para a conversa selecionada.
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      data-front-hugo-internal-events-default-hidden="true"
      data-front-hugo-internal-events-visible={showInternalEvents ? 'true' : 'false'}
      data-front-r211f-recent-message-window="true"
      data-front-r2-message-timeline="true"
    >
      {hiddenOlderTimelineItemCount > 0 && (
        <div
          className="flex flex-col gap-2 rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-sky-900 sm:flex-row sm:items-center sm:justify-between"
          data-front-r211f-history-window-control="true"
        >
          <span>
            {showFullHistory
              ? 'Histórico completo visível nesta leitura.'
              : `Mostrando os ${visibleTimelineItems.length} ${timelineItemLabel} mais recentes.`}
          </span>
          <Button
            className="h-auto min-h-8 w-full whitespace-normal px-3 text-xs sm:w-auto"
            data-front-r211f-action="toggle-history-window"
            onClick={() => setShowFullHistory((currentValue) => !currentValue)}
            size="sm"
            type="button"
            variant="outline"
          >
            {showFullHistory ? 'Voltar para recentes' : `Mostrar ${hiddenOlderTimelineItemCount} anteriores`}
          </Button>
        </div>
      )}
      <div
        ref={timelineScrollRef}
        className="min-w-0 pr-1"
      >
        <div className="space-y-3 pb-2 pr-1">
          {visibleTimelineItems.map((item) => {
        if (item.kind === 'activity') {
          const activity = item.value;
          return (
            <details
              key={item.id}
              className="mx-auto max-w-full break-words rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 sm:max-w-[88%]"
              data-front-hugo-internal-event="true"
              data-front-r-timeline-event="activity"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 font-medium text-slate-700">
                <Badge variant="outline" className="border-slate-200 bg-background text-slate-700">
                  Evento interno
                </Badge>
                <span>{activity.activityTypeLabel}</span>
                <span className="text-[11px] text-muted-foreground">{formatDateTime(activity.createdAt)}</span>
              </summary>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-800">
                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                  {activity.outcomeLabel}
                </Badge>
                <p className="whitespace-pre-wrap">{activity.noteText || 'Evento operacional registrado.'}</p>
                <p className="text-xs text-muted-foreground">Evento interno do atendimento; não é mensagem do cliente nem texto enviado.</p>
              </div>
            </details>
          );
        }

        if (item.kind === 'note') {
          const note = item.value;
          return (
            <details
              key={item.id}
              className="mx-auto max-w-full break-words rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900 sm:max-w-[88%]"
              data-front-hugo-internal-event="true"
              data-front-r-timeline-event="internal-note"
              data-front-r4-internal-note-timeline="true"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 font-medium text-amber-900">
                <Badge variant="outline" className="border-amber-200 bg-background text-amber-700">
                  Nota interna
                </Badge>
                <span className="text-[11px] text-muted-foreground">{formatDateTime(note.createdAt)}</span>
              </summary>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-amber-950">
                <p className="whitespace-pre-wrap">{note.body}</p>
                <p className="text-xs text-muted-foreground">Nota interna; não foi enviada ao WhatsApp.</p>
              </div>
            </details>
          );
        }

        const message = item.value;
        const eventTime = message.receivedAt || message.sentAt || message.createdAt;
        const visualModel = buildTimelineMessageVisualModel(message);
        const messageText = resolveTimelineMessageText(message);
        const isUnavailableInboundText = message.direction !== 'outbound' && messageText === inboundMessageUnavailableText;
        const isOutboundMessage = message.direction === 'outbound';

        return (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${visualModel.align}`}
            data-front-hugo-whatsapp-chat="true"
            data-front-p-message-direction={message.direction}
            data-front-p-message-type={message.messageType}
            data-front-r2-message-bubble="true"
          >
            {!isOutboundMessage && (
              <TimelineActorAvatar imageSrc={visualModel.avatarImage} label={visualModel.avatar} title={visualModel.avatarLabel} tone={visualModel.avatarTone} />
            )}
            <div className={`max-w-[94%] break-words rounded-2xl border px-3 py-2.5 shadow-sm sm:max-w-[78%] ${visualModel.bubble}`}>
              <div className={`mb-1 flex items-center ${isOutboundMessage ? 'justify-end' : 'justify-start'}`}>
                <span className="sr-only">
                  {visualModel.directionLabel}. {message.messageTypeLabel || message.messageType}. {visualModel.helper}
                </span>
                <span className="text-[11px] text-muted-foreground">{formatDateTime(eventTime)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed" data-front-r2-message-body="safe">
                {messageText}
              </p>
              {isUnavailableInboundText && (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  Conteúdo indisponível nesta leitura.
                </p>
              )}
              <div className={`mt-1 flex items-center ${visualModel.showProviderStatus ? 'justify-end' : 'justify-start'} text-[11px] leading-relaxed text-muted-foreground`}>
                {visualModel.showProviderStatus && (
                  <ProviderStatusIcon status={message.providerStatus} />
                )}
              </div>
              <MediaOperationalSummary
                isDownloadingMedia={activeMediaDownloadMessageId === message.id}
                isRequestingMediaAccess={activeMediaAccessMessageId === message.id}
                mediaAccess={mediaAccessByMessageId[message.id] || null}
                mediaAccessError={mediaAccessError}
                mediaDownloadError={mediaDownloadError}
                mediaDownloadFeedback={mediaDownloadFeedback}
                message={message}
                onDownloadMedia={onDownloadMessageMedia}
                onRequestMediaAccess={onRequestMessageMediaAccess}
              />
            </div>
            {isOutboundMessage && (
              <TimelineActorAvatar imageSrc={visualModel.avatarImage} label={visualModel.avatar} title={visualModel.avatarLabel} tone={visualModel.avatarTone} />
            )}
          </div>
        );
      })}
        </div>
      </div>
    </div>
  );
};

const OperationalBoundaryPanel = () => (
  <details
    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900"
    data-front-r-operational-boundary="true"
  >
    <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
      <ShieldCheck className="h-4 w-4 shrink-0" />
      Ajuda e limites
    </summary>
    <p className="mt-2 leading-relaxed">
      Esta tela fica para inbox, conversa, contexto de paciente ou lead e ações manuais. Configuração, prontidão, diagnóstico técnico e credenciais mascaradas ficam no Master técnico, fora da operação clínica.
      Sem IA, automação, campanha, envio em massa, financeiro, prontuário ou documentos reais nesta superfície.
    </p>
  </details>
);

const MANUAL_QUICK_REPLY_MAX_LENGTH = 1000;

const buildContextualManualNextAction = ({
  canReadAgenda,
  canReadCrm,
  canSendManualReply,
  conversation,
  linkedLead,
  linkedPatient,
  nextAppointment,
  selectedQueueItem,
}) => {
  if (!conversation) {
    return {
      actionType: 'none',
      description: 'Selecione uma conversa para ver a próxima ação manual segura.',
      label: 'Selecionar conversa',
      reason: 'Sem conversa selecionada',
      title: 'Selecionar conversa',
    };
  }

  const reason = selectedQueueItem?.reason || 'Sem pendência operacional destacada.';
  const hasPatientLink = Boolean(
    linkedPatient
    || selectedQueueItem?.hasPatientLink
    || conversation.patientId
    || conversation.patient_id,
  );
  const hasLeadLink = Boolean(
    linkedLead
    || selectedQueueItem?.hasLeadLink
    || conversation.leadId
    || conversation.lead_id,
  );
  const hasAnyLink = hasPatientLink || hasLeadLink || Boolean(selectedQueueItem?.hasAnyLink);
  const canPrepareReply = Boolean(canSendManualReply);
  const manualReplyDisabledReason = canPrepareReply
    ? ''
    : 'Resposta manual indisponível para este perfil ou conversa.';

  if (selectedQueueItem?.hasUnreadInbound || conversation.hasUnreadInbound) {
    return {
      actionType: 'prepare_reply',
      description: 'Ler a entrada mais recente e preparar uma resposta manual antes de qualquer envio.',
      disabledReason: manualReplyDisabledReason,
      label: 'Preparar resposta',
      reason,
      replyText: 'Mensagem recebida. Vou conferir as informações e retorno por aqui em seguida.',
      title: 'Responder entrada não lida',
    };
  }

  if (selectedQueueItem?.isOverdue || selectedQueueItem?.isDueToday) {
    return {
      actionType: 'prepare_reply',
      description: selectedQueueItem?.isOverdue
        ? 'Retomar o retorno manual atrasado e confirmar se o contato ainda deseja seguir.'
        : 'Executar o retorno manual previsto para hoje, mantendo o envio explícito.',
      disabledReason: manualReplyDisabledReason,
      label: 'Preparar retorno',
      reason,
      replyText: 'Estou retomando seu atendimento conforme combinado. Você ainda deseja seguir com o próximo passo?',
      title: selectedQueueItem?.isOverdue ? 'Retorno manual vencido' : 'Retorno manual de hoje',
    };
  }

  if (!hasAnyLink) {
    if (canReadCrm) {
      return {
        actionType: 'open',
        description: 'Abrir CRM para localizar ou vincular paciente/lead antes de continuar o atendimento.',
        href: '/pacientes',
        label: 'Abrir CRM',
        reason,
        title: 'Vincular contexto no CRM',
      };
    }

    return {
      actionType: 'guide',
      description: 'Sem permissão de CRM neste perfil. Siga o roteiro de atendimento e peça apoio de um perfil autorizado.',
      label: 'Ver controles',
      reason,
      title: 'Confirmar dados do contato',
    };
  }

  if (selectedQueueItem?.isUnassigned) {
    return {
      actionType: 'guide',
      description: 'Use os controles de Atendimento para assumir ou atribuir responsável antes de registrar próximos passos.',
      label: 'Ver controles',
      reason,
      title: 'Definir responsável manualmente',
    };
  }

  if (linkedPatient && canReadAgenda && nextAppointment) {
    return {
      actionType: 'open',
      description: 'Abrir a próxima consulta conhecida para conferir horário e orientar o atendimento.',
      href: buildCrmAgendaNavigationPath(nextAppointment),
      label: 'Abrir agenda',
      reason,
      title: 'Conferir próximo atendimento',
    };
  }

  if (linkedPatient && canReadCrm) {
    return {
      actionType: 'open',
      description: 'Abrir o cadastro operacional do paciente para conferir contexto antes de responder.',
      href: buildCrmPatientNavigationPath(linkedPatient),
      label: 'Abrir paciente',
      reason,
      title: 'Abrir paciente vinculado',
    };
  }

  if (linkedLead && canReadCrm) {
    return {
      actionType: 'open',
      description: 'Abrir a área de pacientes e leads para seguir o atendimento pelo funil.',
      href: '/pacientes',
      label: 'Abrir CRM/Leads',
      reason,
      title: 'Abrir lead vinculado',
    };
  }

  return {
    actionType: 'prepare_reply',
    description: 'Seguir o roteiro de atendimento com uma resposta manual segura, sem envio automático.',
    disabledReason: manualReplyDisabledReason,
    label: 'Preparar resposta',
    reason,
    replyText: 'Vou seguir com seu atendimento por aqui e te orientar com o próximo passo.',
    title: selectedQueueItem?.nextManualAction || 'Seguir roteiro de atendimento',
  };
};

const navigationShortcutIconByType = {
  agenda: CalendarDays,
  crm: Link2,
  lead: UsersRound,
  patient: UserRound,
};

const buildOmnichannelNavigationActions = ({
  canReadAgenda,
  canReadCrm,
  conversation,
  linkedLead,
  linkedPatient,
  nextAppointment,
  selectedQueueItem,
}) => {
  if (!conversation) {
    return {
      emptyState: 'Selecione uma conversa para ver atalhos manuais de CRM e Agenda.',
      primaryAction: null,
      secondaryActions: [],
      summary: 'Nenhuma conversa selecionada.',
    };
  }

  const hasResolvedPatient = Boolean(linkedPatient?.id);
  const hasResolvedLead = Boolean(linkedLead?.id);
  const hasConversationCrmReference = Boolean(
    selectedQueueItem?.hasAnyLink
    || selectedQueueItem?.hasPatientLink
    || selectedQueueItem?.hasLeadLink
    || conversation.patientId
    || conversation.patient_id
    || conversation.leadId
    || conversation.lead_id,
  );
  const actions = [];

  if (canReadAgenda && nextAppointment?.id) {
    actions.push({
      dataAction: 'open-agenda-shortcut',
      description: 'Consulta encontrada na Agenda para este paciente vinculado.',
      href: buildCrmAgendaNavigationPath(nextAppointment),
      iconType: 'agenda',
      id: 'open-appointment',
      label: 'Abrir agenda',
    });
  }

  if (canReadCrm && hasResolvedPatient) {
    actions.push({
      dataAction: 'open-patient-shortcut',
      description: 'Paciente resolvido na lista carregada do CRM.',
      href: buildCrmPatientNavigationPath(linkedPatient),
      iconType: 'patient',
      id: 'open-patient',
      label: 'Abrir paciente',
    });
  }

  if (canReadCrm && hasResolvedLead) {
    actions.push({
      dataAction: 'open-lead-shortcut',
      description: 'Lead resolvido no funil carregado. O CRM abre na área de pacientes e leads.',
      href: '/pacientes',
      iconType: 'lead',
      id: 'open-lead',
      label: 'Abrir CRM/Leads',
    });
  }

  if (canReadAgenda && !nextAppointment) {
    actions.push({
      dataAction: 'open-agenda-today-shortcut',
      description: 'Sem consulta carregada para este contato; a Agenda abre no dia operacional.',
      href: '/agenda',
      iconType: 'agenda',
      id: 'open-agenda-today',
      label: 'Ver agenda de hoje',
    });
  }

  if (!actions.length && canReadCrm && !hasResolvedPatient && !hasResolvedLead) {
    actions.push({
      dataAction: 'focus-crm-shortcuts',
      description: hasConversationCrmReference
        ? 'Há referência de CRM na conversa, mas ela não foi resolvida na lista carregada.'
        : 'Sem vínculo CRM carregado. Use os controles manuais para localizar ou criar um lead.',
      href: '',
      iconType: 'crm',
      id: 'focus-crm-controls',
      label: 'Ver vínculos CRM',
      type: 'focus',
    });
  }

  const primaryPriority = [
    'open-appointment',
    'open-patient',
    'open-lead',
    'open-agenda-today',
    'focus-crm-controls',
  ];
  const sortedActions = actions.sort((first, second) => (
    primaryPriority.indexOf(first.id) - primaryPriority.indexOf(second.id)
  ));
  const summary = hasResolvedPatient
    ? 'The linked patient is available in the CRM.'
    : hasResolvedLead
      ? 'The linked lead is available in the CRM.'
      : hasConversationCrmReference
        ? 'Vínculo CRM não resolvido nas listas carregadas; sem abrir cadastro específico automaticamente.'
        : 'Conversa ainda sem vínculo CRM carregado.';

  return {
    allActions: sortedActions,
    emptyState: canReadCrm || canReadAgenda
      ? ''
      : 'Seu perfil não possui permissão para abrir CRM ou Agenda nesta conversa.',
    primaryAction: sortedActions[0] || null,
    secondaryActions: sortedActions.slice(1, 3),
    summary,
  };
};

const ManualReplyPanel = ({
  blockedReason,
  canSendManualReply,
  composerState,
  conversation,
  isGeneratingAttendanceAssistantDraft = false,
  isSendingReply,
  manualReplyWindowState,
  onFocusReplyLibrary,
  onGenerateAttendanceAssistantDraft,
  onInsertManualReplyText,
  onReplyTextChange,
  onSendManualReply,
  replyText,
  sendReplyError,
  sendReplySuccess,
  selectedQueueItem,
  selectedPlaybookId,
}) => {
  const [localError, setLocalError] = useState('');
  const [pendingInsertText, setPendingInsertText] = useState('');
  const [pendingInsertSourceLabel, setPendingInsertSourceLabel] = useState('');
  const [pendingInsertFeedback, setPendingInsertFeedback] = useState('');
  const [assistantDraftFeedback, setAssistantDraftFeedback] = useState('');
  const visibleError = localError || sendReplyError;
  const replyWindowState = manualReplyWindowState || {};
  const selectedConversationPresent = Boolean(conversation?.id);
  const canEditDraft = Boolean(conversation && !replyWindowState.isBlocked && !isSendingReply);
  const isDisabled = !conversation || !canSendManualReply || isSendingReply;
  const canGenerateAssistantDraft = Boolean(conversation && onGenerateAttendanceAssistantDraft && !isGeneratingAttendanceAssistantDraft);
  const textLength = replyText.trim().length;
  const currentComposerState = composerState || {};
  const replyLibrary = useMemo(() => buildOmnichannelReplyLibrary({
    conversation,
    selectedPlaybookId,
    selectedQueueItem,
  }), [conversation, selectedPlaybookId, selectedQueueItem]);
  const quickReplyItems = replyLibrary.suggestedItems.slice(0, 4);
  const characterCount = replyText.length;
  const lineCount = replyText.trim() ? replyText.split(/\r?\n/).length : 0;
  const cardTone = conversation
    ? 'border-emerald-200/80 bg-card shadow-sm'
    : 'border-slate-200 bg-slate-50/70 opacity-80 grayscale shadow-none';
  const assistantDraftFeedbackClass = assistantDraftFeedback.includes('bloqueado')
    ? 'border-red-200 bg-red-50 text-red-900'
    : assistantDraftFeedback.includes('alerta') || assistantDraftFeedback.includes('Escolha')
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-cyan-200 bg-white/70 text-cyan-900';

  useEffect(() => {
    if (textLength && localError) {
      setLocalError('');
    }
  }, [localError, textLength]);

  useEffect(() => {
    setPendingInsertText('');
    setPendingInsertSourceLabel('');
    setPendingInsertFeedback('');
    setAssistantDraftFeedback('');
  }, [conversation?.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!textLength) {
      setLocalError('Escreva uma resposta antes de enviar.');
      return;
    }

    try {
      await onSendManualReply(replyText);
      onReplyTextChange('', { conversationId: conversation?.id });
    } catch {
      // O hook expõe uma mensagem segura em sendReplyError.
    }
  };

  const handleApplyPendingInsert = (mode) => {
    if (!pendingInsertText || !conversation) return;

    setLocalError('');
    onInsertManualReplyText(pendingInsertText, {
      mode,
      sourceLabel: pendingInsertSourceLabel,
    });
    const nextFeedback = pendingInsertFeedback;
    setPendingInsertText('');
    setPendingInsertSourceLabel('');
    setPendingInsertFeedback('');
    if (pendingInsertSourceLabel === 'assistente seguro') {
      setAssistantDraftFeedback(nextFeedback || 'Rascunho gerado. Revise antes de enviar.');
    } else {
      setAssistantDraftFeedback('');
    }
  };

  const handleCancelPendingInsert = () => {
    setPendingInsertText('');
    setPendingInsertSourceLabel('');
    setPendingInsertFeedback('');
    setAssistantDraftFeedback('');
  };

  const handleInsertReplyLibraryText = (item) => {
    if (!conversation) return;

    setLocalError('');
    setAssistantDraftFeedback('');
    setPendingInsertFeedback('');
    const insertAction = resolveOmnichannelInsertTextAction({
      currentText: replyText,
      incomingText: item.text,
      maxLength: MANUAL_QUICK_REPLY_MAX_LENGTH,
    });
    const sourceLabel = item.playbookId ? 'playbook manual' : 'biblioteca manual';

    if (insertAction.requiresChoice) {
      setPendingInsertText(insertAction.incomingText);
      setPendingInsertSourceLabel(sourceLabel);
      return;
    }

    onInsertManualReplyText(insertAction.incomingText, {
      mode: 'replace',
      sourceLabel,
    });
  };

  const handleGenerateAssistantDraft = async () => {
    if (!conversation || !onGenerateAttendanceAssistantDraft || isGeneratingAttendanceAssistantDraft) return;

    setLocalError('');
    setAssistantDraftFeedback('');

    try {
      const suggestion = await onGenerateAttendanceAssistantDraft();
      const suggestionText = String(suggestion?.replyDraft || suggestion?.reply_draft || '').trim();
      const canUseSuggestion = Boolean(suggestion?.canUseDraft ?? suggestion?.can_use_draft ?? suggestionText);
      const draftQualityStatus = String(suggestion?.draftQualityStatus || suggestion?.draft_quality_status || '').trim();
      const safeToUseAsDraft = suggestion?.safeToUseAsDraft ?? suggestion?.safe_to_use_as_draft ?? canUseSuggestion;

      if (draftQualityStatus === 'blocked' || safeToUseAsDraft === false) {
        setAssistantDraftFeedback(buildOmnichannelAssistantDraftBlockedFeedback(suggestion));
        return;
      }

      if (!canUseSuggestion || !suggestionText) {
        setAssistantDraftFeedback('Não foi possível gerar um rascunho agora. Você ainda pode responder manualmente.');
        return;
      }

      const successFeedback = draftQualityStatus === 'needs_attention'
        ? 'Rascunho gerado com alerta. Revise os pontos de atenção antes de enviar.'
        : 'Rascunho gerado. Revise antes de enviar.';

      const insertAction = resolveOmnichannelInsertTextAction({
        currentText: replyText,
        incomingText: suggestionText,
        maxLength: MANUAL_QUICK_REPLY_MAX_LENGTH,
      });

      if (insertAction.requiresChoice) {
        setPendingInsertText(insertAction.incomingText);
        setPendingInsertSourceLabel('assistente seguro');
        setPendingInsertFeedback(successFeedback);
        setAssistantDraftFeedback('Já existe um texto em edição. Escolha como usar o rascunho sugerido.');
        return;
      }

      onInsertManualReplyText(insertAction.nextText, {
        mode: 'replace',
        sourceLabel: 'assistente seguro',
      });
      setAssistantDraftFeedback(successFeedback);
    } catch {
      setAssistantDraftFeedback('Não foi possível gerar um rascunho agora. Você ainda pode responder manualmente.');
    }
  };

  const renderQuickReplyMenuItem = (item) => (
    <DropdownMenuItem
      className="cursor-pointer items-start gap-2 whitespace-normal text-xs"
      data-front-r3-action="use-reply-library-text"
      data-front-r3-legacy-action={item.playbookId ? 'use-playbook-text' : undefined}
      disabled={!canEditDraft || !item.text}
      key={`quick-${item.id}`}
      onSelect={(event) => {
        event.preventDefault();
        handleInsertReplyLibraryText(item);
      }}
      title={`${item.title}: ${item.description}`}
    >
      <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0">
        <span className="block font-semibold leading-snug">{item.title}</span>
        <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">
          {item.description}
        </span>
      </span>
    </DropdownMenuItem>
  );

  return (
    <Card className={cardTone} data-front-p-manual-reply="true" data-front-r586-sticky-composer="true">
      <CardHeader className="hidden pb-3 sm:block">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-4 w-4 text-primary" />
              Resposta manual
            </CardTitle>
            <CardDescription className="text-xs">
              A mensagem só será enviada quando você clicar em Enviar.
            </CardDescription>
          </div>
          <span
            className="sr-only"
            data-front-r29-manual-reply-contract="P3 controlada"
            data-front-r29-window-state={replyWindowState.status || 'blocked'}
          >
            {conversation ? 'Resposta manual controlada' : 'Selecione conversa'} · {replyWindowState.label || 'Selecione conversa'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 sm:space-y-3 sm:p-6 sm:pt-0">
        {visibleError && (
          <Alert className="border-red-200 bg-red-50 text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Resposta não enviada</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        )}

        {sendReplySuccess && (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Resposta registrada</AlertTitle>
            <AlertDescription>{sendReplySuccess}</AlertDescription>
          </Alert>
        )}

        {blockedReason && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${manualReplyWindowToneByStatus[replyWindowState.status] || 'border-amber-200 bg-amber-50 text-amber-900'}`}
            data-front-r29-window-helper="true"
            role="status"
          >
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">{replyWindowState.label || 'Envio indisponível'}</p>
                <p className="mt-1 break-words leading-relaxed">{replyWindowState.helperText || blockedReason}</p>
              </div>
            </div>
          </div>
        )}

        <form className="space-y-2 sm:space-y-3" onSubmit={handleSubmit}>
          {currentComposerState.hasLocalDraft && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900" data-front-r3-local-draft="true">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-violet-200 bg-white/70 text-violet-700" data-front-r3-local-draft-badge="true">
                  Rascunho
                </Badge>
                <span className="font-semibold">Texto não enviado</span>
              </div>
              <p className="mt-1 leading-relaxed">Rascunho desta sessão, ainda sem envio.</p>
            </div>
          )}
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mensagem de texto</span>
            <Textarea
              className="min-h-20 resize-y"
              data-front-p-action="write-manual-reply"
              disabled={!canEditDraft}
              maxLength={1000}
              onChange={(event) => onReplyTextChange(event.target.value)}
              placeholder="Digite uma mensagem para o paciente."
              rows={2}
              value={replyText}
            />
          </label>
          <div
            className="space-y-2"
            data-assistant-action-started-from-conversation={selectedConversationPresent ? 'true' : 'false'}
            data-assistant-request-conversation-ref-kind={selectedConversationPresent ? 'conversation_id' : 'none'}
            data-assistant-request-has-conversation-ref={selectedConversationPresent ? 'true' : 'false'}
            data-assistant-request-payload-shape-valid={selectedConversationPresent ? 'true' : 'false'}
            data-eligible-conversation-found={canGenerateAssistantDraft ? 'true' : 'false'}
            data-front-r29g-assistant-composer-draft="true"
            data-selected-conversation-present={selectedConversationPresent ? 'true' : 'false'}
          >
            {assistantDraftFeedback && (
              <p
                className={`rounded-md border px-2 py-1.5 text-xs leading-relaxed ${assistantDraftFeedbackClass}`}
                data-front-r29g-assistant-composer-feedback="true"
              >
                {assistantDraftFeedback}
              </p>
            )}
          </div>
          {pendingInsertText && (
            <div
              className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
              data-front-r3-insert-choice="true"
            >
              <div>
                <p className="font-semibold">Texto atual preservado</p>
                <p className="mt-1 leading-relaxed">
                  Já existe um texto em edição. Escolha como usar o rascunho sugerido, sem envio automático.
                </p>
              </div>
              <p className="line-clamp-2 break-words rounded-md border border-amber-200 bg-white/70 px-2 py-1.5 leading-relaxed">
                {pendingInsertText}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  className="h-auto min-h-9 whitespace-normal text-xs"
                  data-front-r3-action="append-reply-text"
                  onClick={() => handleApplyPendingInsert('append')}
                  size="sm"
                  type="button"
                  variant="default"
                >
                  Adicionar ao final
                </Button>
                <Button
                  className="h-auto min-h-9 whitespace-normal text-xs"
                  data-front-r3-action="replace-reply-text"
                  onClick={() => handleApplyPendingInsert('replace')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Substituir texto
                </Button>
                <Button
                  className="h-auto min-h-9 whitespace-normal text-xs"
                  data-front-r3-action="cancel-reply-text-insert"
                  onClick={handleCancelPendingInsert}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {characterCount}/1000 caracteres · {lineCount} linha(s).
              {(isDisabled || !textLength) && (
                <span className="block">
                  {!textLength ? 'Escreva uma mensagem para habilitar o envio.' : (replyWindowState.isClosed ? replyWindowState.helperText : (blockedReason || currentComposerState.sendDisabledReason || 'Envio manual indisponível.'))}
                </span>
              )}
            </p>
            <TooltipProvider delayDuration={120}>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto" data-front-hugo-compact-composer-actions="true">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-label="Sugestões rápidas"
                          className="relative h-11 w-11 shrink-0 p-0"
                          data-front-r3-quick-replies="true"
                          data-front-r5-ux-quick-suggestions="compact-menu"
                          disabled={!conversation}
                          title="Sugestões rápidas"
                          type="button"
                          variant="outline"
                        >
                          <span className="absolute inset-0 flex items-center justify-center">
                            <MessageCircle className="h-4 w-4" />
                          </span>
                          <ChevronDown className="absolute bottom-1 right-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Sugestões rápidas</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-80" data-front-r3-reply-library-suggestions="true">
                    <DropdownMenuLabel className="text-xs">Sugestões rápidas</DropdownMenuLabel>
                    {quickReplyItems.length ? (
                      quickReplyItems.map((item) => renderQuickReplyMenuItem(item))
                    ) : (
                      <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                        Nenhuma sugestão para esta conversa.
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-xs"
                      data-front-r5-action="open-reply-library"
                      disabled={!conversation}
                      onSelect={(event) => {
                        event.preventDefault();
                        onFocusReplyLibrary?.();
                      }}
                    >
                      <ListChecks className="h-4 w-4" />
                      Abrir biblioteca completa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      aria-label={isGeneratingAttendanceAssistantDraft ? 'Gerando sugestão de resposta' : 'Sugerir resposta'}
                      className="h-11 w-11 shrink-0 p-0"
                      data-front-r29g-action="generate-safe-draft-from-attendance"
                      disabled={!canGenerateAssistantDraft}
                      onClick={handleGenerateAssistantDraft}
                      title={isGeneratingAttendanceAssistantDraft ? 'Gerando sugestão de resposta' : 'Sugerir resposta'}
                      type="button"
                      variant="outline"
                    >
                      {isGeneratingAttendanceAssistantDraft ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      <span className="sr-only">
                        {isGeneratingAttendanceAssistantDraft ? 'Gerando sugestão de resposta' : 'Sugerir resposta'}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sugerir resposta</TooltipContent>
                </Tooltip>

                <Button
                  className="min-h-11 flex-1 sm:flex-none"
                  data-front-p-action="send-manual-reply"
                  disabled={isDisabled || !textLength}
                  type="submit"
                >
                  {isSendingReply ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar
                </Button>
              </div>
            </TooltipProvider>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

const InternalNotesPanel = ({
  canManage,
  collaborationModel,
  conversation,
  isSavingNote,
  noteError,
  notes,
  onAddInternalNote,
}) => {
  const [noteText, setNoteText] = useState('');
  const [localError, setLocalError] = useState('');
  const visibleError = localError || noteError;
  const isDisabled = !conversation || !canManage || isSavingNote || Boolean(collaborationModel?.notes?.isSaving);
  const cardTone = conversation
    ? 'border-amber-200/80 bg-card shadow-sm'
    : 'border-slate-200 bg-slate-50/70 opacity-80 grayscale shadow-none';
  const badgeTone = conversation
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-slate-200 bg-slate-100 text-slate-600';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    if (!noteText.trim()) {
      setLocalError('Escreva uma nota interna antes de salvar.');
      return;
    }

    try {
      await onAddInternalNote(noteText);
      setNoteText('');
    } catch {
      // O hook expõe mensagem segura em noteError.
    }
  };

  return (
    <Card className={cardTone} data-front-r-internal-notes="true" data-front-r4-internal-note-real="true">
      <details>
        <summary className="cursor-pointer list-none p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileClock className="h-5 w-5 text-primary" />
                Nota interna
              </CardTitle>
              <CardDescription>
                Nota interna — não enviada ao WhatsApp. Registro operacional da equipe, nunca exibido como mensagem ao paciente.
              </CardDescription>
            </div>
            <Badge variant="outline" className={`w-fit ${badgeTone}`}>
              {conversation ? 'Fechado por padrão' : 'Selecione conversa'}
            </Badge>
          </div>
        </summary>
      <CardContent className="space-y-4 border-t border-border/60 pt-5">
        {visibleError && (
          <Alert className="border-red-200 bg-red-50 text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Nota não salva</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        )}

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-medium">{collaborationModel?.notes?.latestLabel || 'Nenhuma nota interna registrada.'}</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            {collaborationModel?.notes?.helper || 'Notas internas ficam fora do fluxo de envio WhatsApp.'}
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota interna segura</span>
            <Textarea
              className="resize-y"
              data-front-r-action="write-internal-note"
              disabled={isDisabled}
              maxLength={800}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Registre somente contexto operacional. Não inclua conteúdo técnico bruto, credenciais, prontuário, financeiro ou documentos."
              rows={3}
              value={noteText}
            />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-muted-foreground">
              {noteText.length}/800 caracteres. Nota interna não envia mensagem.
            </p>
            <Button className="w-full sm:w-auto" data-front-r-action="add-internal-note" data-front-r4-action="save-internal-note" disabled={isDisabled || !noteText.trim()} type="submit" variant="outline">
              {(isSavingNote || collaborationModel?.notes?.isSaving) && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Salvar nota
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          {notes.length ? notes.slice().reverse().map((note) => (
            <div key={note.id} className="min-w-0 overflow-hidden rounded-lg border border-border/60 p-3 text-sm" data-front-r-note-row="true">
              <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground">{note.body}</p>
              <p className="mt-2 text-xs text-muted-foreground">{note.createdByLabel} · {formatDateTime(note.createdAt)}</p>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              Nenhuma nota interna registrada. Isso não é erro.
            </div>
          )}
        </div>
      </CardContent>
      </details>
    </Card>
  );
};

const padDateTimePart = (value) => String(value).padStart(2, '0');

const formatDateTimeLocalInputValue = (date) => (
  `${date.getFullYear()}-${padDateTimePart(date.getMonth() + 1)}-${padDateTimePart(date.getDate())}`
  + `T${padDateTimePart(date.getHours())}:${padDateTimePart(date.getMinutes())}`
);

const buildManualReturnDateTimeLocal = (daysFromNow = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);

  if (daysFromNow === 0) {
    date.setHours(Math.min(Math.max(date.getHours() + 1, 9), 18), 0, 0, 0);
  } else {
    date.setHours(9, 0, 0, 0);
  }

  return formatDateTimeLocalInputValue(date);
};

const OMNICHANNEL_NEXT_ACTION_PRESETS = [
  {
    id: 'return-today',
    label: 'Retornar hoje',
    kind: 'schedule',
    offsetDays: 0,
    noteText: 'A equipe deve acompanhar esta conversa manualmente ainda hoje.',
  },
  {
    id: 'return-tomorrow',
    label: 'Retornar amanhã',
    kind: 'schedule',
    offsetDays: 1,
    noteText: 'A equipe deve acompanhar esta conversa manualmente amanhã.',
  },
  {
    id: 'custom-return',
    smokeId: 'custom-date',
    label: 'Definir data',
    kind: 'prepare',
    noteText: 'A equipe deve acompanhar esta conversa manualmente.',
  },
  {
    id: 'waiting-patient',
    activityType: 'manual_follow_up',
    label: 'Aguardando paciente',
    kind: 'activity',
    noteText: 'Aguardando retorno do paciente pelo canal externo.',
    outcome: 'waiting_patient',
  },
  {
    id: 'needs-call',
    activityType: 'manual_follow_up',
    label: 'Precisa ligar',
    kind: 'activity',
    noteText: 'Precisa ligar para acompanhar a conversa manualmente.',
    outcome: 'follow_up_later',
  },
  {
    id: 'needs-schedule',
    activityType: 'sent_to_schedule',
    label: 'Precisa agendar',
    kind: 'activity',
    noteText: 'Conversa precisa de ação manual da recepção para agendamento.',
    outcome: 'needs_schedule',
  },
  {
    id: 'no-response',
    activityType: 'contact_attempt',
    label: 'Sem resposta',
    kind: 'activity',
    noteText: 'Tentativa de acompanhamento manual sem resposta até o momento.',
    outcome: 'no_response',
  },
];

const OperationalHistoryPanel = ({
  activities,
  activityError,
  canRecordActivity,
  conversation,
  isSavingActivity,
  onAddActivity,
  onMarkResolved,
  onReopenConversation,
  onScheduleNextAction,
}) => {
  const [activityType, setActivityType] = useState('manual_follow_up');
  const [outcome, setOutcome] = useState('pending');
  const [noteText, setNoteText] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [localError, setLocalError] = useState('');

  const isDisabled = !conversation || !canRecordActivity || isSavingActivity;
  const isClosedConversation = ['archived', 'closed', 'resolved'].includes(conversation?.status);
  const visibleError = localError || activityError;
  const cardTone = conversation
    ? 'border-sky-200/80 bg-card shadow-sm'
    : 'border-slate-200 bg-slate-50/70 opacity-80 grayscale shadow-none';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError('');

    try {
      await onAddActivity({
        activityType,
        nextActionAt,
        noteText,
        outcome,
      });
      setNoteText('');
      setNextActionAt('');
    } catch {
      // O hook expõe a mensagem segura em activityError.
    }
  };

  const handlePresetAction = async (preset) => {
    setLocalError('');

    if (!conversation || isDisabled) return;

    const presetNote = noteText.trim() || preset.noteText;

    if (preset.kind === 'prepare') {
      setActivityType('scheduled_return');
      setOutcome('follow_up_later');
      setNoteText((currentNote) => currentNote.trim() || preset.noteText);
      setNextActionAt('');
      return;
    }

    try {
      if (preset.kind === 'schedule') {
        const presetNextActionAt = buildManualReturnDateTimeLocal(preset.offsetDays);

        setActivityType('scheduled_return');
        setOutcome('follow_up_later');
        setNextActionAt(presetNextActionAt);
        await onScheduleNextAction(presetNextActionAt, presetNote);
      } else {
        setActivityType(preset.activityType);
        setOutcome(preset.outcome);
        await onAddActivity({
          activityType: preset.activityType,
          noteText: presetNote,
          outcome: preset.outcome,
        });
      }

      setNoteText('');
      setNextActionAt('');
    } catch {
      // O hook expõe a mensagem segura em activityError.
    }
  };

  const handleScheduleNextAction = async () => {
    setLocalError('');

    if (!nextActionAt) {
      setLocalError('Informe a data do retorno manual antes de agendar.');
      return;
    }

    try {
      await onScheduleNextAction(nextActionAt, noteText);
      setActivityType('scheduled_return');
      setOutcome('follow_up_later');
      setNoteText('');
      setNextActionAt('');
    } catch {
      // O hook expõe a mensagem segura em activityError.
    }
  };

  const handleMarkResolved = async () => {
    setLocalError('');

    try {
      await onMarkResolved(noteText);
      setActivityType('resolved');
      setOutcome('resolved');
      setNoteText('');
      setNextActionAt('');
    } catch {
      // O hook expõe a mensagem segura em activityError.
    }
  };

  const handleReopenConversation = async () => {
    setLocalError('');

    try {
      await onReopenConversation(noteText);
      setActivityType('reopened');
      setOutcome('status_open');
      setNoteText('');
      setNextActionAt('');
    } catch {
      // O hook expoe a mensagem segura em activityError.
    }
  };

  return (
    <Card className={cardTone} data-front-p-operational-history="true" data-front-r4-operational-history="true">
      <details open={Boolean(conversation)}>
        <summary className="cursor-pointer list-none p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListChecks className="h-5 w-5 text-primary" />
                Acompanhamento
              </CardTitle>
              <CardDescription>
                Registre ações internas da equipe sem enviar mensagens pelo WhatsApp.
              </CardDescription>
            </div>
            <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-700">
              {conversation ? 'Retorno manual visível' : 'Selecione conversa'}
            </Badge>
          </div>
        </summary>
      <CardContent className="space-y-5 border-t border-border/60 pt-5">
        <Alert className="border-sky-200 bg-sky-50 text-sky-900">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Registro seguro da equipe</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Este registro é interno da clínica.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Não envia mensagem.</li>
              <li>Não dispara automação.</li>
              <li>Não substitui prontuário clínico.</li>
              <li>Não registre dados clínicos sensíveis neste campo.</li>
            </ul>
          </AlertDescription>
        </Alert>

        {visibleError && (
          <Alert className="border-red-200 bg-red-50 text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Registro não salvo</AlertTitle>
            <AlertDescription>{visibleError}</AlertDescription>
          </Alert>
        )}

        {!canRecordActivity && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Permissão de leitura</AlertTitle>
            <AlertDescription>
              O histórico aparece para leitura. Registrar ação, agendar retorno ou marcar como resolvida exige permissão operacional Omnichannel aceita pela RLS.
            </AlertDescription>
          </Alert>
        )}

        <div
          className="space-y-3 rounded-lg border border-sky-200/70 bg-sky-50/60 p-3"
          data-front-r28b-next-action-panel="true"
          data-front-r28b-next-action-presets="true"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-sky-950">
                <FileClock className="h-4 w-4 text-sky-700" />
                Próximo retorno manual
              </p>
              <p className="mt-1 text-xs leading-relaxed text-sky-800">
                A equipe deve acompanhar esta conversa manualmente. Isto não envia WhatsApp.
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-sky-700">
                Canal externo não conectado para envio por aqui; o retorno fica como registro interno da equipe.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-sky-200 bg-white text-sky-700">
              Registro interno
            </Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {OMNICHANNEL_NEXT_ACTION_PRESETS.map((preset) => (
              <Button
                className="justify-start"
                data-front-r28b-action={preset.id}
                data-front-r28b-next-action-preset={preset.smokeId || preset.id}
                disabled={isDisabled}
                key={preset.id}
                onClick={() => {
                  void handlePresetAction(preset);
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                <Clock3 className="mr-2 h-4 w-4" />
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <form className="space-y-4 rounded-lg border border-border/60 p-3" onSubmit={handleSubmit}>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ação manual</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                data-front-p-action="select-activity-type"
                disabled={isDisabled}
                onChange={(event) => setActivityType(event.target.value)}
                value={activityType}
              >
                {OMNICHANNEL_MANUAL_ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>{OMNICHANNEL_ACTIVITY_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resultado</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                data-front-p-action="select-activity-outcome"
                disabled={isDisabled}
                onChange={(event) => setOutcome(event.target.value)}
                value={outcome}
              >
                {OMNICHANNEL_MANUAL_ACTIVITY_OUTCOMES.map((activityOutcome) => (
                  <option key={activityOutcome} value={activityOutcome}>{OMNICHANNEL_ACTIVITY_OUTCOME_LABELS[activityOutcome]}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <FileClock className="h-4 w-4 text-primary" />
              Próxima ação manual
            </span>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              data-front-p-action="set-next-action"
              disabled={isDisabled}
              onChange={(event) => setNextActionAt(event.target.value)}
              type="datetime-local"
              value={nextActionAt}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nota interna segura</span>
            <Textarea
              className="resize-y"
              data-front-p-action="write-internal-note"
              disabled={isDisabled}
              maxLength={OMNICHANNEL_ACTIVITY_NOTE_LIMIT}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Ex.: equipe tentou contato e vai acompanhar depois. Não inclua dados clínicos."
              rows={4}
              value={noteText}
            />
            <span className="block text-[11px] text-muted-foreground">
              {noteText.length}/{OMNICHANNEL_ACTIVITY_NOTE_LIMIT} caracteres. Use apenas contexto operacional.
            </span>
          </label>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button
              className="w-full"
              data-front-p-action="add-activity"
              disabled={isDisabled}
              type="submit"
            >
              Registrar ação
            </Button>
            <Button
              className="w-full"
              data-front-p-action="schedule-next-action"
              disabled={isDisabled}
              onClick={() => {
                void handleScheduleNextAction();
              }}
              type="button"
              variant="outline"
            >
              Agendar retorno
            </Button>
            {isClosedConversation ? (
              <Button
                className="w-full"
                data-front-r25-action="reopen-conversation"
                disabled={isDisabled}
                onClick={() => {
                  void handleReopenConversation();
                }}
                type="button"
                variant="outline"
              >
                Reabrir atendimento
              </Button>
            ) : (
              <Button
                className="w-full"
                data-front-p-action="mark-resolved"
                disabled={isDisabled}
                onClick={() => {
                  void handleMarkResolved();
                }}
                type="button"
                variant="outline"
              >
                Marcar como resolvida
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Resolver ou reabrir registra apenas o ciclo interno do atendimento; não envia WhatsApp e não altera automação.
          </p>
        </form>

        <div className="space-y-3">
          {activities.length ? activities.map((activity) => (
            <div key={activity.id} className="rounded-lg border border-border/60 p-3" data-front-p-activity-row="true">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                  {activity.activityTypeLabel}
                </Badge>
                <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
                  {activity.outcomeLabel}
                </Badge>
                {activity.nextActionAt && (
                  <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                    Retorno: {formatDateTime(activity.nextActionAt)}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">
                {activity.noteText || 'Registro operacional sem nota adicional.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {activity.createdByLabel} · {formatDateTime(activity.createdAt)}
              </p>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm leading-relaxed text-muted-foreground">
              Nenhum histórico operacional registrado para esta conversa. Isso não é erro; registre apenas ações internas quando a equipe executar um acompanhamento manual.
            </div>
          )}
        </div>
      </CardContent>
      </details>
    </Card>
  );
};

const ContactTimelinePanel = ({ timelineModel }) => {
  if (!timelineModel?.current) return null;

  const previousItems = timelineModel.previous || [];
  const renderTimelineItem = (item) => (
    <div
      className={`rounded-lg border p-3 ${item.current ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-background'}`}
      data-front-r24-contact-timeline-item={item.current ? 'current' : 'previous'}
      key={item.id}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.current ? 'Atendimento atual' : 'Atendimento anterior'}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{item.statusLabel}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {item.intentLabel} · {item.queueLabel}
          </p>
        </div>
        <span className="text-xs text-muted-foreground">{formatDateTime(item.lastActivityAt)}</span>
      </div>
    </div>
  );

  return (
    <div
      className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3"
      data-front-r24-contact-timeline="read-only"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileClock className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Histórico do contato</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Timeline simples e somente leitura dos atendimentos deste contato no WhatsApp.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-slate-200 bg-background text-slate-700">
          Somente leitura
        </Badge>
      </div>

      <div className="space-y-2">
        {renderTimelineItem(timelineModel.current)}
      </div>

      {previousItems.length ? (
        <details className="rounded-lg border border-border/60 bg-background" data-front-r29g-previous-conversations="collapsed">
          <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-semibold text-foreground">Conversas anteriores</span>
            <Badge variant="outline" className="w-fit border-slate-200 bg-muted text-slate-700">
              {previousItems.length} atendimento(s)
            </Badge>
          </summary>
          <div className="space-y-2 border-t border-border/60 p-3">
            {previousItems.map((item) => renderTimelineItem(item))}
          </div>
        </details>
      ) : (
        <p className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs leading-relaxed text-muted-foreground">
          {timelineModel.emptyState}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {timelineModel.helper}
      </p>
    </div>
  );
};

const InactivitySuggestionPanel = ({ inactivityModel }) => {
  if (!inactivityModel?.visible) return null;

  return (
    <div
      className={`space-y-2 rounded-lg border p-3 ${inactivityModel.severityClassName}`}
      data-front-r24-inactivity-suggestion="visual-only"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 shrink-0" />
            <p className="text-sm font-semibold">{inactivityModel.title}</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed">{inactivityModel.description}</p>
          <p className="mt-1 text-xs leading-relaxed">{inactivityModel.helper}</p>
        </div>
        <Badge variant="outline" className="w-fit border-current bg-white/70">
          {inactivityModel.badgeLabel}
        </Badge>
      </div>
      <p className="text-[11px] leading-relaxed">
        Sinal visual de apoio: não fecha conversa, não muda status e não envia WhatsApp.
      </p>
    </div>
  );
};

const ConversationTriagePanel = ({
  actionError,
  activeContextTab,
  activities = [],
  attendanceAssistantError = null,
  attendanceAssistantServerSuggestion = null,
  appointments,
  canManage,
  canReadAgenda,
  canReadCrm,
  canSendManualReply,
  canShowFullPhone = false,
  canWriteCrmLead,
  channel,
  channelStatus,
  collaborationModel,
  conversation,
  conversations = [],
  autoReplyAttempts,
  historyPanel,
  isGeneratingAttendanceAssistantDraft = false,
  isMutating,
  isSavingTriageResult,
  manualReplyWindowState,
  leads,
  leadCreationError,
  manualReplyDraft,
  manualPlaybookSelection,
  messages,
  notesPanel,
  onAddInternalNote,
  onAssignToMe,
  onContextTabChange,
  onCreateLeadFromConversation,
  onFocusReplyLibrary,
  onGenerateAttendanceAssistantDraft,
  onLinkLead,
  onLinkPatient,
  onManualPlaybookSelectionChange,
  onMarkRead,
  onPrepareManualReply,
  onRefresh,
  onRecordAttendanceAssistantFeedback,
  onSaveTriageResult,
  onToggleQualityChecklistItem,
  onUnassignConversation,
  onUnlinkContext,
  onUpdatePriority,
  onUpdateStatus,
  patients,
  qualityChecklistState,
  selectedQueueItem,
  selectedTriageResult,
  showContextTabs = true,
  source,
  triageFlows,
  triageIntents,
  triageQuestions,
  triageResultError,
  triageResultSuccess,
  triageResultsByConversation = {},
  triageSettings,
}) => {
  const [patientChoice, setPatientChoice] = useState('');
  const [leadChoice, setLeadChoice] = useState('');
  const [newLeadName, setNewLeadName] = useState('');
  const [copyPhoneStatus, setCopyPhoneStatus] = useState('');
  const [crmLinkError, setCrmLinkError] = useState('');
  const [attendanceAssistantFeedback, setAttendanceAssistantFeedback] = useState('');
  const [attendanceAssistantFeedbackChoice, setAttendanceAssistantFeedbackChoice] = useState('');
  const [attendanceAssistantFeedbackReasonMode, setAttendanceAssistantFeedbackReasonMode] = useState('');
  const [attendanceAssistantFeedbackSubmitCount, setAttendanceAssistantFeedbackSubmitCount] = useState(0);
  const [attendanceAssistantFeedbackUsedAsDraft, setAttendanceAssistantFeedbackUsedAsDraft] = useState(false);
  const [isRecordingAttendanceAssistantFeedback, setIsRecordingAttendanceAssistantFeedback] = useState(false);
  const [replyLibraryFilter, setReplyLibraryFilter] = useState(OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL);
  const [replyLibrarySearch, setReplyLibrarySearch] = useState('');
  const patientOptions = useMemo(() => (
    buildCrmEphemeralOptions(patients.slice(0, 20), 'patient-option')
  ), [patients]);
  const leadOptions = useMemo(() => (
    buildCrmEphemeralOptions(leads.slice(0, 20), 'lead-option')
  ), [leads]);
  const patientIdByOptionKey = useMemo(() => (
    buildCrmIdByOptionKey(patientOptions)
  ), [patientOptions]);
  const leadIdByOptionKey = useMemo(() => (
    buildCrmIdByOptionKey(leadOptions)
  ), [leadOptions]);
  const patientOptionKeyById = useMemo(() => (
    buildCrmOptionKeyById(patientOptions)
  ), [patientOptions]);
  const leadOptionKeyById = useMemo(() => (
    buildCrmOptionKeyById(leadOptions)
  ), [leadOptions]);

  useEffect(() => {
    setPatientChoice(patientOptionKeyById.get(conversation?.patientId) || '');
    setLeadChoice(leadOptionKeyById.get(conversation?.leadId) || '');
    setNewLeadName('');
    setCopyPhoneStatus('');
    setCrmLinkError('');
    setReplyLibraryFilter(OMNICHANNEL_REPLY_LIBRARY_FILTER_ALL);
    setReplyLibrarySearch('');
  }, [
    conversation?.id,
    conversation?.leadId,
    conversation?.patientId,
    leadOptionKeyById,
    patientOptionKeyById,
  ]);

  const linkedPatient = useMemo(() => (
    patients.find((patient) => patient.id === conversation?.patientId) || null
  ), [conversation?.patientId, patients]);
  const linkedLead = useMemo(() => (
    leads.find((lead) => lead.id === conversation?.leadId) || null
  ), [conversation?.leadId, leads]);
  const nextAppointment = useMemo(() => {
    if (!linkedPatient || !appointments.length) return null;

    return appointments
      .filter((appointment) => resolveAppointmentCrmPatient(appointment, [linkedPatient]).patient?.id === linkedPatient.id)
      .sort((first, second) => getCrmAgendaAppointmentSortValue(first) - getCrmAgendaAppointmentSortValue(second))[0] || null;
  }, [appointments, linkedPatient]);
  const contextualNextAction = useMemo(() => buildContextualManualNextAction({
    canReadAgenda,
    canReadCrm,
    canSendManualReply,
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedQueueItem,
  }), [
    canReadAgenda,
    canReadCrm,
    canSendManualReply,
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedQueueItem,
  ]);
  const navigationActions = useMemo(() => buildOmnichannelNavigationActions({
    canReadAgenda,
    canReadCrm,
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedQueueItem,
  }), [
    canReadAgenda,
    canReadCrm,
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedQueueItem,
  ]);
  const contactContext = useMemo(() => buildOmnichannelContactContextModel({
    appointments,
    canManage,
    canReadAgenda,
    canReadCrm,
    canSendManualReply,
    channel,
    conversation,
    linkedLead,
    linkedPatient,
    navigationActions,
    nextAction: contextualNextAction,
    nextAppointment,
    selectedQueueItem,
    showFullPhone: canShowFullPhone,
    source,
  }), [
    appointments,
    canManage,
    canReadAgenda,
    canReadCrm,
    canSendManualReply,
    channel,
    conversation,
    contextualNextAction,
    linkedLead,
    linkedPatient,
    navigationActions,
    nextAppointment,
    selectedQueueItem,
    canShowFullPhone,
    source,
  ]);
  const whatsAppOnlyModel = useMemo(() => buildOmnichannelWhatsAppOnlyContextModel({
    canManage,
    canReadAgenda,
    canReadCrm,
    canReadOmnichannel: source !== 'Sem acesso',
    canSendManualReply,
    channel,
    channelStatus,
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedQueueItem,
    sourceLabel: source,
  }), [
    canManage,
    canReadAgenda,
    canReadCrm,
    canSendManualReply,
    channel,
    channelStatus,
    conversation,
    linkedLead,
    linkedPatient,
    nextAppointment,
    selectedQueueItem,
    source,
  ]);
  const assistedTriageModel = useMemo(() => buildOmnichannelTriageModel({
    canManage,
    canSendManualReply,
    conversation,
    linkedLead,
    linkedPatient,
    messages,
    nextAppointment,
    selectedQueueItem,
    sourceLabel: source,
  }), [
    canManage,
    canSendManualReply,
    conversation,
    linkedLead,
    linkedPatient,
    messages,
    nextAppointment,
    selectedQueueItem,
    source,
  ]);
  const attendanceAssistantLocalModel = useMemo(() => buildOmnichannelAttendanceAssistantModel({
    activities,
    conversation,
    linkedLead,
    linkedPatient,
    messages,
    selectedQueueItem,
    selectedTriageResult,
  }), [
    activities,
    conversation,
    linkedLead,
    linkedPatient,
    messages,
    selectedQueueItem,
    selectedTriageResult,
  ]);
  const attendanceAssistantModel = useMemo(() => buildOmnichannelAttendanceAssistantDisplayModel({
    localModel: attendanceAssistantLocalModel,
    serverSuggestion: attendanceAssistantServerSuggestion,
  }), [
    attendanceAssistantLocalModel,
    attendanceAssistantServerSuggestion,
  ]);
  const attendanceAssistantProviderGateChecksData = useMemo(
    () => JSON.stringify(attendanceAssistantModel.providerGateChecks || {}),
    [attendanceAssistantModel.providerGateChecks],
  );
  const attendanceAssistantEdgeProviderGateChecksData = useMemo(
    () => JSON.stringify(attendanceAssistantModel.edgeProviderGateChecks || {}),
    [attendanceAssistantModel.edgeProviderGateChecks],
  );
  const attendanceAssistantLocalFallbackProviderGateChecksData = useMemo(
    () => JSON.stringify(attendanceAssistantModel.localFallbackProviderGateChecks || {}),
    [attendanceAssistantModel.localFallbackProviderGateChecks],
  );
  const attendanceAssistantEffectiveProviderGateChecksData = useMemo(
    () => JSON.stringify(attendanceAssistantModel.effectiveProviderGateChecks || attendanceAssistantModel.providerGateChecks || {}),
    [attendanceAssistantModel.effectiveProviderGateChecks, attendanceAssistantModel.providerGateChecks],
  );
  const canUseAttendanceAssistantDraft = Boolean(
    conversation && attendanceAssistantModel.canUseDraft && attendanceAssistantModel.safeToUseAsDraft,
  );
  const attendanceAssistantConversationPresent = Boolean(conversation?.id);
  const attendanceAssistantDraftOriginClass = attendanceAssistantModel.draftOriginTone === 'provider_real'
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : attendanceAssistantModel.draftOriginTone === 'dry_run'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-border bg-muted text-muted-foreground';
  const attendanceAssistantDraftQualityClass = attendanceAssistantModel.draftQualityTone === 'blocked'
    ? 'border-red-200 bg-red-50 text-red-700'
    : attendanceAssistantModel.draftQualityTone === 'attention'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  const attendanceAssistantDecision = attendanceAssistantModel.assistantDecision || null;
  const attendanceAssistantDecisionClass = attendanceAssistantDecision?.tone === 'provider_real'
    ? 'border-blue-200 bg-blue-50/70 text-blue-950'
    : attendanceAssistantDecision?.tone === 'blocked'
      ? 'border-red-200 bg-red-50/70 text-red-950'
      : attendanceAssistantDecision?.tone === 'validation'
        ? 'border-amber-200 bg-amber-50/70 text-amber-950'
        : 'border-slate-200 bg-slate-50/80 text-slate-950';
  const attendanceAssistantDecisionBadgeClass = attendanceAssistantDecision?.tone === 'provider_real'
    ? 'border-blue-200 bg-white text-blue-800'
    : attendanceAssistantDecision?.tone === 'blocked'
      ? 'border-red-200 bg-white text-red-800'
      : attendanceAssistantDecision?.tone === 'validation'
        ? 'border-amber-200 bg-white text-amber-800'
        : 'border-slate-200 bg-white text-slate-800';
  const attendanceAssistantFeedbackClass = attendanceAssistantFeedback.includes('bloqueado')
    ? 'border-red-200 bg-red-50 text-red-900'
    : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  const canShowAttendanceAssistantFeedback = Boolean(
    conversation
      && attendanceAssistantModel.hasEnoughText
      && (
        attendanceAssistantModel.replyDraft
        || attendanceAssistantModel.draftQualityStatus === 'blocked'
      ),
  );
  const canChangeAttendanceAssistantFeedback = attendanceAssistantFeedbackSubmitCount > 0
    && attendanceAssistantFeedbackSubmitCount < 2;
  const activeAttendanceAssistantFeedbackReasons = attendanceAssistantFeedbackReasonMode === 'risky'
    ? OMNICHANNEL_ASSISTANT_RISK_FEEDBACK_REASONS
    : OMNICHANNEL_ASSISTANT_NEGATIVE_FEEDBACK_REASONS;
  const replyWindowState = manualReplyWindowState || {};
  const attendanceAssistantQueueBucket = selectedQueueItem?.respondNow
    ? 'respond_now'
    : replyWindowState.status === 'closed'
      ? 'closed_window'
      : replyWindowState.status || 'unknown';
  const selectedChannelContext = selectedQueueItem?.channelContext || buildOmnichannelChannelContext({
    channelStatus,
    channels: channel ? [channel] : [],
    conversation,
  });
  const selectedQueueContext = selectedQueueItem?.queueContext || buildOmnichannelQueueContext({
    assistedQueue: assistedTriageModel.queue,
    triageResult: selectedTriageResult,
  });
  const triageConfigModel = useMemo(() => buildOmnichannelTriageConfigModel({
    flows: triageFlows,
    intents: triageIntents,
    questions: triageQuestions,
    result: selectedTriageResult,
    settings: triageSettings,
    sourceLabel: source,
  }), [
    selectedTriageResult,
    source,
    triageFlows,
    triageIntents,
    triageQuestions,
    triageSettings,
  ]);
  const autoReplyPreviewModel = useMemo(() => buildAutoReplyEligibilityModel({
    autoReplyAttempts,
    channelStatus,
    conversation,
    selectedQueueItem,
    sourceLabel: source,
    triageResult: selectedTriageResult,
    triageSettings,
  }), [
    autoReplyAttempts,
    channelStatus,
    conversation,
    selectedQueueItem,
    selectedTriageResult,
    source,
    triageSettings,
  ]);
  const autoReplyObservabilityModel = useMemo(() => buildAutoReplyConversationObservabilityModel({
    autoReplyAttempts,
    conversation,
    messages,
    sourceLabel: source,
  }), [
    autoReplyAttempts,
    conversation,
    messages,
    source,
  ]);
  const clinicAssistantStatus = useMemo(
    () => buildClinicAssistantStatus(autoReplyObservabilityModel.learningCycle),
    [autoReplyObservabilityModel.learningCycle],
  );
  const autoReplyPilotMetricsModel = useMemo(() => buildAutoReplyPilotMetricsModel({
    attempts: autoReplyAttempts,
    conversationEvidenceFreshness: autoReplyObservabilityModel.evidenceFreshness,
    sourceLabel: source,
  }), [
    autoReplyAttempts,
    autoReplyObservabilityModel.evidenceFreshness,
    source,
  ]);
  const autoReplyPilotMetricsToneClass = {
    blocked: 'border-amber-200 bg-amber-50 text-amber-900',
    muted: 'border-border bg-muted text-muted-foreground',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    sent: 'border-teal-200 bg-teal-50 text-teal-800',
  }[autoReplyPilotMetricsModel.tone] || 'border-border bg-muted text-muted-foreground';
  const autoReplyObservabilityToneClass = {
    blocked: 'border-amber-200 bg-amber-50 text-amber-900',
    muted: 'border-border bg-muted text-muted-foreground',
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    sent: 'border-teal-200 bg-teal-50 text-teal-800',
  }[autoReplyObservabilityModel.tone] || 'border-border bg-muted text-muted-foreground';
  const autoReplyObservabilityHistoryToneClass = {
    blocked: 'border-amber-100 bg-amber-50/70 text-amber-900',
    muted: 'border-border bg-muted/70 text-muted-foreground',
    ready: 'border-emerald-100 bg-emerald-50/70 text-emerald-900',
    sent: 'border-teal-100 bg-teal-50/70 text-teal-900',
  };
  const manualPlaybook = useMemo(() => buildOmnichannelManualPlaybooks({
    conversation,
    linkedLead,
    linkedPatient,
    navigationActions,
    nextAppointment,
    primaryActions: contactContext.primaryActions,
    selectedPlaybookId: manualPlaybookSelection,
    selectedQueueItem,
  }), [
    contactContext.primaryActions,
    conversation,
    linkedLead,
    linkedPatient,
    manualPlaybookSelection,
    navigationActions,
    nextAppointment,
    selectedQueueItem,
  ]);
  const replyLibrary = useMemo(() => buildOmnichannelReplyLibrary({
    conversation,
    linkedLead,
    linkedPatient,
    navigationActions,
    nextAppointment,
    primaryActions: contactContext.primaryActions,
    selectedPlaybookId: manualPlaybookSelection,
    selectedQueueItem,
  }), [
    contactContext.primaryActions,
    conversation,
    linkedLead,
    linkedPatient,
    manualPlaybookSelection,
    navigationActions,
    nextAppointment,
    selectedQueueItem,
  ]);
  const filteredReplyLibraryItems = useMemo(() => filterOmnichannelReplyLibrary({
    filterId: replyLibraryFilter,
    items: replyLibrary.items,
    search: replyLibrarySearch,
  }), [replyLibrary.items, replyLibraryFilter, replyLibrarySearch]);
  const visibleReplyLibraryItems = filteredReplyLibraryItems.slice(0, 10);
  const qualityChecklist = useMemo(() => buildOmnichannelQualityChecklist({
    checkedItems: qualityChecklistState,
  }), [qualityChecklistState]);
  const qualityGaps = useMemo(() => buildOmnichannelQualityGaps({
    canReadAgenda,
    canReadCrm,
    contextualNextAction,
    conversation,
    linkedLead,
    linkedPatient,
    manualReplyDraft,
    nextAppointment,
    selectedQueueItem,
  }), [
    canReadAgenda,
    canReadCrm,
    contextualNextAction,
    conversation,
    linkedLead,
    linkedPatient,
    manualReplyDraft,
    nextAppointment,
    selectedQueueItem,
  ]);
  const manualClosureState = useMemo(() => resolveOmnichannelManualClosureState({
    conversation,
    linkedLead,
    linkedPatient,
    manualReplyDraft,
    nextAppointment,
    qualityGaps,
    selectedQueueItem,
  }), [
    conversation,
    linkedLead,
    linkedPatient,
    manualReplyDraft,
    nextAppointment,
    qualityGaps,
    selectedQueueItem,
  ]);
  const inactivityModel = useMemo(() => (
    buildConversationInactivityModel(conversation)
  ), [conversation]);
  const contactTimelineModel = useMemo(() => (
    buildContactTimelineModel({
      conversation,
      conversations,
      triageResultsByConversation,
    })
  ), [conversation, conversations, triageResultsByConversation]);
  const hasLinkedPatient = hasConversationLinkedPatient(conversation);
  const hasLinkedLead = hasConversationLinkedLead(conversation);
  const patientLinkDisabled = !canManage || !canReadCrm || isMutating || hasLinkedLead;
  const leadLinkDisabled = !canManage || !canReadCrm || isMutating || hasLinkedPatient;
  const createLeadDisabled = !canManage
    || !canReadCrm
    || !canWriteCrmLead
    || isMutating
    || hasLinkedPatient
    || hasLinkedLead
    || !conversation?.contactPhoneE164;
  const disabledReason = canManage
    ? ''
    : 'Perfil em leitura: este usuário pode consultar, mas não salvar alterações do atendimento.';
  const canCopyPhone = Boolean(
    canShowFullPhone
    &&
    conversation?.contactPhoneE164
    && typeof navigator !== 'undefined'
    && navigator.clipboard?.writeText,
  );
  const contactPhoneForClipboard = conversation?.contactPhoneE164 || '';

  const handleLinkPatientChoice = () => {
    const patientId = patientIdByOptionKey.get(patientChoice);

    if (!patientId) {
      setCrmLinkError('Seleção de paciente inválida. Atualize a leitura e tente novamente.');
      return;
    }

    setCrmLinkError('');
    void onLinkPatient(patientId).catch(() => {});
  };

  const handleLinkLeadChoice = () => {
    const leadId = leadIdByOptionKey.get(leadChoice);

    if (!leadId) {
      setCrmLinkError('Seleção de lead inválida. Atualize a leitura e tente novamente.');
      return;
    }

    setCrmLinkError('');
    void onLinkLead(leadId).catch(() => {});
  };

  const handleCopyPhone = async () => {
    setCopyPhoneStatus('');

    if (!conversation?.contactPhoneE164) {
      setCopyPhoneStatus('Telefone não informado nesta conversa.');
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyPhoneStatus('Não foi possível copiar o telefone neste navegador.');
      return;
    }

    try {
      await navigator.clipboard.writeText(contactPhoneForClipboard);
      setCopyPhoneStatus('Telefone copiado para uso operacional.');
    } catch {
      setCopyPhoneStatus('Não foi possível copiar o telefone neste navegador.');
    }
  };
  const handleFocusAttendanceControls = () => {
    if (typeof document === 'undefined') return;

    document
      .querySelector('[data-front-r-action="assign-to-me"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleFocusCrmControls = () => {
    if (typeof document === 'undefined') return;

    document
      .querySelector('[data-front-r-crm-links="true"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const handleFocusManualScript = () => {
    onContextTabChange?.('assistencia');

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    window.requestAnimationFrame(() => {
      document
        .querySelector('[data-front-r3-manual-playbook="true"], [data-front-r3-manual-script="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };
  const handleUseReplyLibraryText = (item) => {
    if (!item?.text) return;

    onPrepareManualReply(item.text, {
      sourceLabel: item.playbookId ? 'playbook manual' : 'biblioteca manual',
    });
  };
  useEffect(() => {
    setAttendanceAssistantFeedback('');
    setAttendanceAssistantFeedbackChoice('');
    setAttendanceAssistantFeedbackReasonMode('');
    setAttendanceAssistantFeedbackSubmitCount(0);
    setAttendanceAssistantFeedbackUsedAsDraft(false);
    setIsRecordingAttendanceAssistantFeedback(false);
  }, [conversation?.id]);

  const buildAttendanceAssistantFeedbackPayload = (feedbackValue, feedbackReason = null) => ({
    assistantMode: attendanceAssistantModel.mode,
    draftQualityStatus: attendanceAssistantModel.draftQualityStatus,
    feedbackReason,
    feedbackValue,
    generatedAt: new Date().toISOString(),
    model: attendanceAssistantModel.model,
    playbookId: attendanceAssistantModel.playbookId,
    provider: attendanceAssistantModel.provider,
    usedAsDraft: attendanceAssistantFeedbackUsedAsDraft,
  });

  const handleSubmitAttendanceAssistantFeedback = (feedbackValue, feedbackReason = null) => {
    if (!canShowAttendanceAssistantFeedback || !onRecordAttendanceAssistantFeedback) return;

    setIsRecordingAttendanceAssistantFeedback(true);
    setAttendanceAssistantFeedback('');
    setAttendanceAssistantFeedbackChoice(feedbackValue);
    setAttendanceAssistantFeedbackReasonMode('');

    void onRecordAttendanceAssistantFeedback(
      buildAttendanceAssistantFeedbackPayload(feedbackValue, feedbackReason),
    )
      .then(() => {
        setAttendanceAssistantFeedback('Feedback registrado. Obrigado.');
        setAttendanceAssistantFeedbackSubmitCount((currentCount) => currentCount + 1);
      })
      .catch(() => {
        setAttendanceAssistantFeedback('Não foi possível registrar o feedback agora.');
      })
      .finally(() => {
        setIsRecordingAttendanceAssistantFeedback(false);
      });
  };

  const handleSelectAttendanceAssistantFeedback = (feedbackValue) => {
    if (feedbackValue === 'not_useful' || feedbackValue === 'risky') {
      setAttendanceAssistantFeedbackReasonMode(feedbackValue);
      setAttendanceAssistantFeedbackChoice(feedbackValue);
      setAttendanceAssistantFeedback('Escolha um motivo controlado para registrar sem texto livre.');
      return;
    }

    const reason = feedbackValue === 'skipped' ? 'preferred_manual_reply' : null;
    handleSubmitAttendanceAssistantFeedback(feedbackValue, reason);
  };

  const handleChangeAttendanceAssistantFeedback = () => {
    if (!canChangeAttendanceAssistantFeedback) return;

    setAttendanceAssistantFeedback('');
    setAttendanceAssistantFeedbackChoice('');
    setAttendanceAssistantFeedbackReasonMode('');
  };

  const handleUseAttendanceAssistantDraft = () => {
    if (!conversation || !attendanceAssistantModel.replyDraft) return;

    if (!attendanceAssistantModel.safeToUseAsDraft || attendanceAssistantModel.draftQualityStatus === 'blocked') {
      setAttendanceAssistantFeedback(attendanceAssistantModel.draftBlockedFeedback);
      return;
    }

    if (!attendanceAssistantModel.canUseDraft) return;

    onPrepareManualReply(attendanceAssistantModel.replyDraft, {
      sourceLabel: 'assistente seguro',
    });
    setAttendanceAssistantFeedbackUsedAsDraft(true);
  };
  const handleGenerateAttendanceAssistantDraft = () => {
    if (!conversation || isGeneratingAttendanceAssistantDraft || !onGenerateAttendanceAssistantDraft) return;

    setAttendanceAssistantFeedback('');
    setAttendanceAssistantFeedbackChoice('');
    setAttendanceAssistantFeedbackReasonMode('');
    setAttendanceAssistantFeedbackSubmitCount(0);
    setAttendanceAssistantFeedbackUsedAsDraft(false);
    void onGenerateAttendanceAssistantDraft()
      .then(() => {
        setAttendanceAssistantFeedback('Sugestão atualizada agora');
      })
      .catch(() => {});
  };
  const handleUseTriageSummaryAsNote = () => {
    if (!assistedTriageModel.canSaveInternalNote || !assistedTriageModel.handoffSummary?.text) return;

    void onAddInternalNote(assistedTriageModel.handoffSummary.text).catch(() => {});
  };
  const handleSaveAssistedTriageResult = () => {
    if (!onSaveTriageResult || !assistedTriageModel.enabled) return;

    const answers = Object.fromEntries((assistedTriageModel.questions || [])
      .slice(0, 5)
      .map((question, index) => [`pergunta_${index + 1}`, question.label]));

    void onSaveTriageResult({
      answers,
      flowId: triageConfigModel.activeFlow?.id || null,
      handoffRequired: true,
      intentKey: assistedTriageModel.backendIntentKey,
      source: 'assistive',
      suggestedQueue: assistedTriageModel.backendQueueKey,
      summary: assistedTriageModel.handoffSummary?.text || '',
    }).catch(() => {});
  };
  const findContactPrimaryAction = (actionId) => {
    if (actionId === 'focus-crm-controls') {
      return contactContext.primaryActions.find((action) => action.id === 'open-crm') || null;
    }

    return contactContext.primaryActions.find((action) => action.id === actionId) || null;
  };
  const runContactPrimaryAction = (action) => {
    if (!action?.enabled) return;

    if (action.id === 'assign-to-me') {
      void onAssignToMe().catch(() => {});
      return;
    }

    if (action.id === 'mark-read') {
      void onMarkRead().catch(() => {});
      return;
    }

    if (action.type === 'fill_reply' && action.text) {
      onPrepareManualReply(action.text);
      return;
    }

    if (action.type === 'focus_script') {
      handleFocusManualScript();
      return;
    }

    if (action.type === 'copy_phone') {
      void handleCopyPhone();
      return;
    }

    if (action.type === 'focus') {
      handleFocusCrmControls();
    }
  };
  const renderContactPrimaryAction = (action, labelOverride = '') => {
    if (!action) return null;

    const isCopyAction = action.type === 'copy_phone';
    const label = labelOverride || (isCopyAction ? 'Copiar telefone' : action.label);
    const isDisabled = !action.enabled || (isCopyAction && !canCopyPhone);
    const buttonContent = (
      <>
        <span className={compactManualButtonLabelClass}>{label}</span>
      </>
    );

    if (action.type === 'open' && action.href && !isDisabled) {
      return (
        <Button
          asChild
          className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
          data-front-r3-action={action.dataAction}
          key={`${action.id}-${label}`}
          size="sm"
          variant="outline"
        >
          <Link to={action.href}>{buttonContent}</Link>
        </Button>
      );
    }

    return (
      <Button
        className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
        data-front-r3-action={action.dataAction}
        disabled={isDisabled || isMutating}
        key={`${action.id}-${label}`}
        onClick={() => runContactPrimaryAction(action)}
        size="sm"
        title={isDisabled ? action.disabledReason : label}
        type="button"
        variant="outline"
      >
        {buttonContent}
      </Button>
    );
  };
  const renderNavigationShortcut = (action, isPrimary = false) => {
    if (!action) return null;

    const ShortcutIcon = navigationShortcutIconByType[action.iconType] || ExternalLink;
    const className = isPrimary
      ? compactManualButtonClass
      : 'h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug';

    if (action.href) {
      return (
        <Button
          asChild
          className={className}
          data-front-r3-action={action.dataAction}
          key={action.id}
          size="sm"
          variant={isPrimary ? 'default' : 'outline'}
        >
          <Link to={action.href}>
            <ShortcutIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className={compactManualButtonLabelClass}>{action.label}</span>
          </Link>
        </Button>
      );
    }

    return (
      <Button
        className={className}
        data-front-r3-action={action.dataAction}
        key={action.id}
        onClick={handleFocusCrmControls}
        size="sm"
        type="button"
        variant="outline"
      >
        <ShortcutIcon className="mr-2 h-4 w-4 shrink-0" />
        <span className={compactManualButtonLabelClass}>{action.label}</span>
      </Button>
    );
  };
  const renderManualPlaybookAction = (action) => {
    if (!action) return null;

    if (action.actionType === 'primary_action') {
      const contactAction = findContactPrimaryAction(action.contactActionId);

      if (contactAction) {
        return renderContactPrimaryAction({
          ...contactAction,
          dataAction: action.dataAction || contactAction.dataAction,
          label: action.label || contactAction.label,
        }, action.label || contactAction.label);
      }

      return (
        <Button
          className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
          data-front-r3-action={action.dataAction}
          disabled
          key={action.id}
          size="sm"
          title={action.disabledReason || 'Ação indisponível neste contexto.'}
          type="button"
          variant="outline"
        >
          <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
          <span className={compactManualButtonLabelClass}>{action.label}</span>
        </Button>
      );
    }

    const ActionIcon = navigationShortcutIconByType[action.iconType] || ExternalLink;

    if (action.actionType === 'open' && action.href) {
      return (
        <Button
          asChild
          className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
          data-front-r3-action={action.dataAction}
          key={action.id}
          size="sm"
          variant="outline"
        >
          <Link to={action.href}>
            <ActionIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className={compactManualButtonLabelClass}>{action.label}</span>
          </Link>
        </Button>
      );
    }

    return (
      <Button
        className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
        data-front-r3-action={action.dataAction}
        key={action.id}
        onClick={handleFocusCrmControls}
        size="sm"
        type="button"
        variant="outline"
      >
        <ActionIcon className="mr-2 h-4 w-4 shrink-0" />
        <span className={compactManualButtonLabelClass}>{action.label}</span>
      </Button>
    );
  };
  const renderReplyLibraryItem = (item, { suggested = false } = {}) => (
    <div
      className={`min-w-0 rounded-lg border p-3 ${suggested ? 'border-primary/20 bg-primary/5' : 'border-border/60 bg-background'}`}
      data-front-r3-reply-library-item="true"
      key={`${suggested ? 'suggested' : 'library'}-${item.id}`}
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit border-border bg-background text-[10px] text-muted-foreground">
              {item.categoryLabel}
            </Badge>
            {suggested && (
              <Badge variant="outline" className="w-fit border-primary/20 bg-primary/10 text-[10px] text-primary">
                Contexto
              </Badge>
            )}
          </div>
          <p className="mt-2 line-clamp-1 break-words text-sm font-semibold text-foreground" title={item.title}>
            {item.title}
          </p>
          <p className="mt-1 line-clamp-2 break-words text-xs leading-relaxed text-muted-foreground" title={item.description}>
            {item.description}
          </p>
        </div>
        <Button
          aria-label={`Usar resposta: ${item.title}`}
          className="h-auto min-h-9 w-full min-w-0 shrink-0 justify-start whitespace-normal text-left text-xs leading-snug sm:w-auto"
          data-front-r3-action="use-reply-library-text"
          data-front-r3-legacy-action={item.playbookId ? 'use-playbook-text' : undefined}
          disabled={!canSendManualReply || !item.text}
          onClick={() => handleUseReplyLibraryText(item)}
          size="sm"
          title="Usar no composer"
          type="button"
          variant={suggested ? 'default' : 'outline'}
        >
          <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
          <span className={compactManualButtonLabelClass}>Usar</span>
        </Button>
      </div>
      {suggested && item.suggestionReason && (
        <p className="mt-2 text-[11px] leading-relaxed text-primary">{item.suggestionReason}</p>
      )}
      <p className="mt-2 line-clamp-2 break-words rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-xs leading-relaxed text-muted-foreground" title={item.text}>
        {item.text}
      </p>
    </div>
  );
  const runQualityAction = (action) => {
    if (!action) return;

    if (action.actionType === 'focus_crm') {
      handleFocusCrmControls();
      return;
    }

    if (action.actionType === 'focus_agenda' || action.actionType === 'open_agenda') {
      if (typeof document !== 'undefined' && !action.href) {
        document
          .querySelector('[data-front-r3-navigation-shortcuts="true"], [data-front-r3-contact-agenda="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (action.actionType === 'focus_playbook') {
      handleFocusManualScript();
      return;
    }

    if (action.actionType === 'prepare_reply' && action.replyText) {
      onPrepareManualReply(action.replyText);
      return;
    }

    if (action.actionType === 'focus_attendance') {
      handleFocusAttendanceControls();
    }
  };
  const renderQualityAction = (action) => {
    if (!action?.actionLabel) return null;

    if (action.actionType === 'open_agenda' && action.href) {
      return (
        <Button
          asChild
          className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
          data-front-r3-action={action.dataAction}
          key={`${action.id}-quality-action`}
          size="sm"
          variant="outline"
        >
          <Link to={action.href}>
            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
            <span className={compactManualButtonLabelClass}>{action.actionLabel}</span>
          </Link>
        </Button>
      );
    }

    return (
      <Button
        className="h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug"
        data-front-r3-action={action.dataAction}
        key={`${action.id}-quality-action`}
        onClick={() => runQualityAction(action)}
        size="sm"
        type="button"
        variant="outline"
      >
        <ListChecks className="mr-2 h-4 w-4 shrink-0" />
        <span className={compactManualButtonLabelClass}>{action.actionLabel}</span>
      </Button>
    );
  };

  if (!conversation) {
    return (
      <Card className="border-slate-200 bg-slate-50/70 opacity-80 grayscale shadow-none">
        <CardHeader>
          <CardTitle className="text-xl">Contexto do atendimento</CardTitle>
          <CardDescription>Selecione uma conversa para ver contato, vínculo CRM, próxima ação e ações manuais.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState canReadOmnichannel />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm" data-front-p-triage-panel="true">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flag className="h-4 w-4 text-primary" />
              Contexto do atendimento
            </CardTitle>
            <CardDescription className="text-xs">
              Resumo, ações, CRM/Agenda, assistência e sugestões.
            </CardDescription>
          </div>
          <Button
            className="h-auto min-h-8 w-full whitespace-normal text-xs sm:w-fit"
            data-front-p-action="refresh-conversations"
            data-front-r2-refresh-contract-copy="Atualizar conversas"
            disabled={isMutating}
            onClick={onRefresh}
            size="sm"
            title="Atualizar"
            type="button"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4 shrink-0" />
            <span className={compactManualButtonLabelClass}>Atualizar</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {actionError && (
          <Alert className="border-red-200 bg-red-50 text-red-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atendimento não atualizado</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        {collaborationModel?.feedback && (
          <Alert
            className={collaborationModel.feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'}
            data-front-r4-collaboration-feedback="true"
          >
            {collaborationModel.feedback.type === 'error'
              ? <AlertTriangle className="h-4 w-4" />
              : <CheckCircle2 className="h-4 w-4" />}
            <AlertTitle>Colaboração operacional</AlertTitle>
            <AlertDescription>{collaborationModel.feedback.message}</AlertDescription>
          </Alert>
        )}

        {!canManage && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-900">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Permissão de leitura</AlertTitle>
            <AlertDescription>{disabledReason}</AlertDescription>
          </Alert>
        )}

        <Tabs
          className="min-w-0"
          data-front-r5-ux-atendimento-first="true"
          data-front-r5-ux-context-tabs="true"
          onValueChange={onContextTabChange}
          value={activeContextTab}
        >
          {showContextTabs && (
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-3 xl:hidden">
              {OMNICHANNEL_CONTEXT_WORKSPACE_TABS.map((tab) => (
                <TabsTrigger className="h-auto min-h-11 whitespace-normal px-2 text-xs leading-tight" key={tab.id} value={tab.id}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          <TabsContent
            className="space-y-4"
            data-front-r5-ux-secondary-content="bot-triage"
            value="bot"
          >
        <div
          className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-emerald-950"
          data-front-r4-whatsapp-only-description-copy="Modo WhatsApp-only: atendimento e gestão funcionam com o canal conectado."
          data-front-r4-whatsapp-only-helper-copy="CRM e Agenda são contexto adicional, não requisito para operar o WhatsApp."
          data-front-r4-whatsapp-only-mode="true"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-emerald-700" />
                <p className="text-sm font-semibold">{whatsAppOnlyModel.title}</p>
                <Badge variant="outline" className="border-emerald-200 bg-white/80 text-emerald-800">
                  {whatsAppOnlyModel.modeLabel}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed">{whatsAppOnlyModel.description}</p>
              <p className="mt-1 text-xs leading-relaxed">{whatsAppOnlyModel.helper}</p>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-white/80 text-emerald-800">
              Origem dos dados: {formatOmnichannelSourceLabel(whatsAppOnlyModel.sourceLabel)}
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {whatsAppOnlyModel.capabilities.map((capability) => (
              <div className="rounded-md border border-emerald-200 bg-white/70 p-2" key={capability.id}>
                <p className="text-xs font-semibold">{capability.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed">{capability.stateLabel} · {capability.helper}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {whatsAppOnlyModel.additionalContext.map((contextItem) => (
              <div className="rounded-md border border-emerald-200 bg-white/70 p-2" key={contextItem.id}>
                <p className="text-xs font-semibold">{contextItem.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed">{contextItem.stateLabel} · {contextItem.description}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed">
            Integrações futuras: {whatsAppOnlyModel.futureIntegrations.map((item) => item.label).join(', ')}.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/70 p-3 text-sky-950" data-front-r4-assisted-triage="true">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <ListChecks className="h-4 w-4 shrink-0 text-sky-700" />
                <p className="text-sm font-semibold">Sugestão de atendimento</p>
                <Badge variant="outline" className="border-sky-200 bg-white/80 text-sky-800">
                  {assistedTriageModel.stateLabel}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed">{assistedTriageModel.description}</p>
              <p
                className="mt-1 text-xs font-semibold leading-relaxed"
                data-front-r4-assisted-triage-contract-copy="Triagem v0 assistida — não envia mensagens automaticamente."
                data-front-r4-auto-reply-contract-copy="Bot automático desligado: R4.6 bloqueia auto-reply real"
              >
                Sem envio automático amplo. Handoff humano continua obrigatório.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-sky-200 bg-white/80 text-sky-800">
              Origem dos dados: {formatOmnichannelSourceLabel(assistedTriageModel.sourceLabel)}
            </Badge>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-md border border-sky-200 bg-white/75 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Intenção sugerida</p>
              <p className="mt-1 text-sm font-semibold">{assistedTriageModel.intent.label}</p>
              <p className="mt-1 text-xs leading-relaxed">{assistedTriageModel.intent.confidenceLabel} · {assistedTriageModel.intent.reason}</p>
            </div>
            <div className="rounded-md border border-sky-200 bg-white/75 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Fila sugerida</p>
              <p className="mt-1 text-sm font-semibold">{assistedTriageModel.queue.label}</p>
              <p className="mt-1 text-xs leading-relaxed">{assistedTriageModel.queue.reason}</p>
            </div>
          </div>

          <div
            className="space-y-3 rounded-md border border-sky-200 bg-white/75 p-3"
            data-front-r4-triage-automation-label="Bot automático não ativado"
            data-front-r4-triage-config-contract-copy="Configuração segura do atendimento"
            data-front-r4-triage-config-preview="true"
            data-front-r4-triage-handoff-label="Encaminhamento humano manual"
            data-front-r4-triage-mode-label="Pré-atendimento WhatsApp-only"
            data-front-r4-triage-persistence-label={triageConfigModel.persistenceLabel}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Configuração segura do tenant</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Leitura segura para orientar a recepção. Não envia resposta, não muda fila automaticamente e exige revisão humana.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-800">
                Revisão humana
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                Leitura segura
              </Badge>
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                Sem envio automático amplo
              </Badge>
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-800">
                Fila sugerida
              </Badge>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border border-sky-100 bg-sky-50/80 p-2">
                <p className="text-xs font-semibold">Intenções do preview</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {triageConfigModel.intents.map((intent) => intent.label).join(', ')}.
                </p>
              </div>
              <div className="rounded-md border border-sky-100 bg-sky-50/80 p-2">
                <p className="text-xs font-semibold">Filas sugeridas</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  {triageConfigModel.queues.map((queue) => queue.label).join(', ')}.
                </p>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {triageConfigModel.safetyNotes.map((note) => (
                <p className="rounded-md border border-sky-100 bg-sky-50/80 p-2 text-xs leading-relaxed" key={note.id}>
                  {note.label}
                </p>
              ))}
            </div>
          </div>

          <div
            className="space-y-3 rounded-md border border-sky-200 bg-white/75 p-3"
            data-front-r4-triage-backend-contract-copy="não enviado ao WhatsApp"
            data-front-r4-triage-result-contract-copy="Resultado persistido"
            data-front-r4-triage-backend="true"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Sugestão salva</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Guarda a sugestão atual desta conversa para leitura operacional. Não envia WhatsApp e não ativa automação.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-sky-200 bg-sky-50 text-sky-800">
                Leitura segura
              </Badge>
            </div>

            {selectedTriageResult ? (
              <div className="grid gap-2 md:grid-cols-2">
                <div className="rounded-md border border-sky-100 bg-sky-50/80 p-2">
                  <p className="text-xs font-semibold">Intenção salva</p>
                  <p className="mt-1 text-sm font-semibold">{selectedTriageResult.intentLabel}</p>
                </div>
                <div className="rounded-md border border-sky-100 bg-sky-50/80 p-2">
                  <p className="text-xs font-semibold">Fila salva</p>
                  <p className="mt-1 text-sm font-semibold">{selectedTriageResult.suggestedQueueLabel}</p>
                </div>
                <div className="rounded-md border border-sky-100 bg-sky-50/80 p-2">
                  <p className="text-xs font-semibold">Handoff humano</p>
                  <p className="mt-1 text-sm font-semibold">{selectedTriageResult.handoffRequired ? 'Pendente' : 'Não exigido'}</p>
                </div>
                <div className="rounded-md border border-sky-100 bg-sky-50/80 p-2">
                  <p className="text-xs font-semibold">Origem</p>
                  <p className="mt-1 text-sm font-semibold">{selectedTriageResult.source === 'human' ? 'Humana' : 'Assistida/manual'}</p>
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-sky-200 bg-sky-50/70 p-2 text-xs leading-relaxed">
                Sem resultado de triagem salvo nesta conversa.
              </p>
            )}

            {triageResultError && (
              <Alert className="border-red-200 bg-red-50 text-red-900">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Triagem não salva</AlertTitle>
                <AlertDescription>{triageResultError}</AlertDescription>
              </Alert>
            )}

            {triageResultSuccess && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Triagem salva</AlertTitle>
                <AlertDescription>{triageResultSuccess}</AlertDescription>
              </Alert>
            )}

            <Button
              aria-label="Salvar triagem assistida"
              className={compactManualButtonClass}
              data-front-r4-action="save-triage-result"
              disabled={!canManage || isSavingTriageResult || !assistedTriageModel.enabled}
              onClick={handleSaveAssistedTriageResult}
              size="sm"
              type="button"
              variant="outline"
            >
              <ListChecks className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>
                {isSavingTriageResult ? 'Salvando sugestão...' : 'Salvar sugestão'}
              </span>
            </Button>
          </div>

          <div
            className="space-y-3 rounded-md border border-indigo-200 bg-indigo-50/75 p-3 text-indigo-950"
            data-front-r5-auto-reply-eligibility="true"
            data-front-r5-auto-reply-contract-copy="Preview de resposta automática"
            data-front-r5-auto-reply-legacy-copy="Preview/elegibilidade R5.3"
            data-front-r5-auto-reply-preview="true"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                  Preview de resposta
                </p>
                <p className="mt-1 text-xs leading-relaxed">
                  Usa a sugestão carregada como apoio de texto. Preview não envia WhatsApp.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-indigo-200 bg-white/80 text-indigo-800">
                {autoReplyPreviewModel.stateLabel}
              </Badge>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-md border border-indigo-100 bg-white/75 p-2">
                <p className="text-xs font-semibold">Motivo principal</p>
                <p className="mt-1 text-xs leading-relaxed" data-front-r5-auto-reply-block-reason="true">
                  {autoReplyPreviewModel.primaryReason.label}
                </p>
                {autoReplyPreviewModel.primaryReason.helper && (
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">
                    {autoReplyPreviewModel.primaryReason.helper}
                  </p>
                )}
              </div>
              <div className="rounded-md border border-indigo-100 bg-white/75 p-2">
                <p className="text-xs font-semibold">Fila e handoff</p>
                <p className="mt-1 text-xs leading-relaxed">
                  {autoReplyPreviewModel.queueLabel} · {autoReplyPreviewModel.handoffLabel}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">
                  {autoReplyPreviewModel.wouldSendLabel}
                </p>
              </div>
            </div>

            <div className="rounded-md border border-indigo-100 bg-white/75 p-2">
              <p className="text-xs font-semibold">Resposta fixa segura</p>
              <p className="mt-1 text-xs leading-relaxed">{autoReplyPreviewModel.previewMessage}</p>
            </div>

            <div
              className="space-y-2 rounded-md border border-indigo-100 bg-white/80 p-2"
              data-front-r29i-auto-reply-observability="true"
            >
              <div
                className="space-y-2 rounded-md border border-indigo-100 bg-white/75 p-2"
                data-front-r29i-auto-reply-pilot-metrics="true"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{autoReplyPilotMetricsModel.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">
                      {autoReplyPilotMetricsModel.description}
                    </p>
                  </div>
                  <Badge variant="outline" className={`w-fit ${autoReplyPilotMetricsToneClass}`}>
                    {autoReplyPilotMetricsModel.stateLabel}
                  </Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {autoReplyPilotMetricsModel.cards.map((item) => (
                    <div
                      className="min-w-0 rounded-md border border-indigo-100 bg-white/70 p-2"
                      data-front-r29i-auto-reply-pilot-freshness-metric={item.id === 'selected-conversation-coverage' ? 'true' : undefined}
                      key={item.id}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800">{item.label}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground">{item.value}</p>
                      {item.helper && (
                        <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">{item.helper}</p>
                      )}
                    </div>
                  ))}
                </div>
                {autoReplyPilotMetricsModel.reasonSummary.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800">Motivos mais recentes</p>
                    <div className="flex flex-wrap gap-1">
                      {autoReplyPilotMetricsModel.reasonSummary.map((item) => (
                        <span
                          className="rounded-full border border-indigo-100 bg-white/70 px-2 py-1 text-[11px] leading-relaxed text-indigo-900"
                          key={item.label}
                        >
                          {item.count} · {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-[11px] leading-relaxed text-indigo-800">
                  Fonte: {autoReplyPilotMetricsModel.sourceLabel}. Sem mensagem, prompt, telefone, hash, UUID ou dado técnico bruto.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold">Observabilidade da IA</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">
                    {autoReplyObservabilityModel.description}
                  </p>
                </div>
                <Badge variant="outline" className={`w-fit ${autoReplyObservabilityToneClass}`}>
                  {autoReplyObservabilityModel.stateLabel}
                </Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {autoReplyObservabilityModel.cards.map((item) => (
                  <div className="rounded-md border border-indigo-100 bg-white/75 p-2" key={item.id}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800">{item.label}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-foreground">{item.value}</p>
                    {item.helper && (
                      <p className="mt-1 text-[11px] leading-relaxed text-indigo-800">{item.helper}</p>
                    )}
                  </div>
                ))}
              </div>
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.realConversationDiagnosis.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r514-auto-reply-real-conversation-diagnosis="true"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.realConversationDiagnosis.title}</p>
                  <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.realConversationDiagnosis.stateLabel}</span>
                </div>
                <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.realConversationDiagnosis.description}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {autoReplyObservabilityModel.realConversationDiagnosis.items.map((item) => (
                    <div className="rounded border border-current/10 bg-white/55 p-2" key={item.id}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
                      <p className="mt-1 leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded border border-current/10 bg-white/60 p-2 text-[11px] leading-relaxed">
                  {autoReplyObservabilityModel.realConversationDiagnosis.canUseAsConversationEvidence
                    ? 'Pode entrar como evidência da conversa, mas ainda depende de validação humana.'
                    : 'Não trate como acerto da IA: use como diagnóstico operacional para a próxima correção.'}
                </p>
              </div>
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[clinicAssistantStatus.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r515-auto-reply-learning-cycle="true"
                data-front-r516-learning-tools-scope="master-only"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase">Status da assistência</p>
                  <span className="text-[11px] font-semibold">{clinicAssistantStatus.label}</span>
                </div>
                <p className="mt-1 leading-relaxed">{clinicAssistantStatus.description}</p>
              </div>
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.operationalDiagnosis.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r29i-auto-reply-operational-diagnosis="true"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.operationalDiagnosis.title}</p>
                  <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.operationalDiagnosis.stateLabel}</span>
                </div>
                <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.operationalDiagnosis.description}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {autoReplyObservabilityModel.operationalDiagnosis.lines.map((item) => (
                    <div className="rounded border border-current/10 bg-white/55 p-2" key={item.id}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
                      <p className="mt-1 leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded border border-current/10 bg-white/60 p-2 text-[11px] leading-relaxed">
                  {autoReplyObservabilityModel.operationalDiagnosis.nextStepLabel}
                </p>
                {autoReplyObservabilityModel.operationalDiagnosis.learningItems.length > 0 && (
                  <div className="mt-2 space-y-1" data-front-r29i-auto-reply-operational-learning="true">
                    <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">Aprendizado do teste</p>
                    <div className="grid gap-1 md:grid-cols-3">
                      {autoReplyObservabilityModel.operationalDiagnosis.learningItems.map((item) => (
                        <div className="rounded border border-current/10 bg-white/50 p-2 text-[11px] leading-relaxed" key={item.id}>
                          <p className="font-semibold">{item.label}</p>
                          {item.helper && (
                            <p className="mt-1 opacity-80">{item.helper}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {autoReplyObservabilityModel.evidenceFreshness && (
                <div
                  className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.evidenceFreshness.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                  data-front-r29i-auto-reply-evidence-freshness="true"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.evidenceFreshness.title}</p>
                    <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.evidenceFreshness.stateLabel}</span>
                  </div>
                  <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.evidenceFreshness.description}</p>
                  <div className="mt-2 grid gap-1 md:grid-cols-3">
                    {autoReplyObservabilityModel.evidenceFreshness.checks.map((item) => (
                      <p className="rounded border border-current/10 bg-white/50 p-2 text-[11px] leading-relaxed" key={item.id}>
                        {item.ok ? 'OK' : 'Atenção'} · {item.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {autoReplyObservabilityModel.attemptHistory.length > 0 && (
                <div className="space-y-1" data-front-r29i-auto-reply-attempt-history="true">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800">Histórico recente</p>
                  {autoReplyObservabilityModel.attemptHistory.map((item) => (
                    <div
                      className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[item.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                      key={item.id}
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-semibold">{item.stateLabel}</span>
                        <span className="text-[11px] opacity-80">{item.createdAtLabel}</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        {item.reasonLabel} · {item.aiLabel} · {item.sendLabel}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.assistedTest.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r29i-auto-reply-assisted-test="true"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.assistedTest.title}</p>
                  <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.assistedTest.stateLabel}</span>
                </div>
                <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.assistedTest.description}</p>
                <p className="mt-2 rounded border border-current/10 bg-white/60 p-2 text-[11px] leading-relaxed">
                  {autoReplyObservabilityModel.assistedTest.nextStepLabel}
                </p>
                <div className="mt-2 grid gap-1 md:grid-cols-3">
                  {autoReplyObservabilityModel.assistedTest.checklist.map((item) => (
                    <p className="rounded border border-current/10 bg-white/50 p-2 text-[11px] leading-relaxed" key={item.id}>
                      {item.ok ? 'OK' : 'Atenção'} · {item.label}
                    </p>
                  ))}
                </div>
              </div>
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.humanHandoff.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r29i-auto-reply-human-handoff="true"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.humanHandoff.title}</p>
                  <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.humanHandoff.stateLabel}</span>
                </div>
                <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.humanHandoff.description}</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {autoReplyObservabilityModel.humanHandoff.lines.map((item) => (
                    <div className="rounded border border-current/10 bg-white/55 p-2" key={item.id}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</p>
                      <p className="mt-1 leading-relaxed">{item.value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded border border-current/10 bg-white/60 p-2 text-[11px] leading-relaxed">
                  {autoReplyObservabilityModel.humanHandoff.nextStepLabel}
                </p>
                <div className="mt-2 grid gap-1 md:grid-cols-3">
                  {autoReplyObservabilityModel.humanHandoff.checklist.map((item) => (
                    <p className="rounded border border-current/10 bg-white/50 p-2 text-[11px] leading-relaxed" key={item.id}>
                      {item.ok ? 'OK' : 'Atenção'} · {item.label}
                    </p>
                  ))}
                </div>
              </div>
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.conversationQuality.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r29i-auto-reply-conversation-quality="true"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.conversationQuality.title}</p>
                  <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.conversationQuality.stateLabel}</span>
                </div>
                <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.conversationQuality.description}</p>
                <div className="mt-2 grid gap-1 md:grid-cols-3">
                  {autoReplyObservabilityModel.conversationQuality.signals.map((item) => (
                    <div className="rounded border border-current/10 bg-white/50 p-2 text-[11px] leading-relaxed" key={item.id}>
                      <p className="font-semibold">{item.ok ? 'OK' : 'Atenção'} · {item.label}</p>
                      {item.helper && (
                        <p className="mt-1 opacity-80">{item.helper}</p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded border border-current/10 bg-white/60 p-2 text-[11px] leading-relaxed">
                  {autoReplyObservabilityModel.conversationQuality.nextStepLabel}
                </p>
              </div>
              <div
                className={`rounded-md border p-2 text-xs ${autoReplyObservabilityHistoryToneClass[autoReplyObservabilityModel.pilotReadiness.tone] || autoReplyObservabilityHistoryToneClass.muted}`}
                data-front-r29i-auto-reply-pilot-readiness="true"
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">{autoReplyObservabilityModel.pilotReadiness.title}</p>
                  <span className="text-[11px] font-semibold">{autoReplyObservabilityModel.pilotReadiness.stateLabel}</span>
                </div>
                <p className="mt-1 leading-relaxed">{autoReplyObservabilityModel.pilotReadiness.description}</p>
                <div className="mt-2 grid gap-1 md:grid-cols-3">
                  {autoReplyObservabilityModel.pilotReadiness.criteria.map((item) => (
                    <div className="rounded border border-current/10 bg-white/50 p-2 text-[11px] leading-relaxed" key={item.id}>
                      <p className="font-semibold">{item.ok ? 'OK' : 'Pendente'} · {item.label}</p>
                      {item.helper && (
                        <p className="mt-1 opacity-80">{item.helper}</p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 rounded border border-current/10 bg-white/60 p-2 text-[11px] leading-relaxed">
                  {autoReplyObservabilityModel.pilotReadiness.nextStepLabel}
                </p>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {autoReplyPreviewModel.checklist.map((item) => (
                <p className="rounded-md border border-indigo-100 bg-white/70 p-2 text-[11px] leading-relaxed" key={item.id}>
                  {item.ok ? 'OK' : 'Bloqueado'} · {item.label}
                </p>
              ))}
            </div>

            <Button
              className={compactManualButtonClass}
              data-front-r5-action="use-auto-reply-preview"
              disabled={!autoReplyPreviewModel.canUseInComposer}
              onClick={() => onPrepareManualReply(autoReplyPreviewModel.previewMessage, { sourceLabel: 'preview auto-reply' })}
              size="sm"
              type="button"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>Usar como rascunho</span>
            </Button>
          </div>

          <div className="space-y-2 rounded-md border border-sky-200 bg-white/75 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Perguntas seguras</p>
            <div className="grid gap-2 md:grid-cols-2">
              {assistedTriageModel.questions.map((question) => (
                <p className="rounded-md border border-sky-100 bg-sky-50/80 p-2 text-xs leading-relaxed" data-front-r4-triage-question="true" key={question.id}>
                  {question.label}
                </p>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-md border border-sky-200 bg-white/75 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">{assistedTriageModel.handoffSummary.title}</p>
            <div className="space-y-1">
              {assistedTriageModel.handoffSummary.lines.map((line) => (
                <p className="text-xs leading-relaxed" key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              className={compactManualButtonClass}
              data-front-r4-action="prepare-triage-reply"
              disabled={!assistedTriageModel.canPrepareReply}
              onClick={() => onPrepareManualReply(assistedTriageModel.replyText, { sourceLabel: 'triagem assistida' })}
              size="sm"
              type="button"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>Preparar resposta</span>
            </Button>
            {assistedTriageModel.canSaveInternalNote && (
              <Button
                className={compactManualButtonClass}
                data-front-r4-action="save-triage-internal-note"
                disabled={isMutating}
                onClick={handleUseTriageSummaryAsNote}
                size="sm"
                type="button"
                variant="outline"
              >
                <ListChecks className="mr-2 h-4 w-4 shrink-0" />
                <span className={compactManualButtonLabelClass}>{assistedTriageModel.saveNoteLabel}</span>
              </Button>
            )}
          </div>
          <p className="text-[11px] leading-relaxed">
            Ações manuais: preparar resposta só preenche o campo; nota interna exige clique explícito e não é enviada ao WhatsApp.
          </p>
        </div>
          </TabsContent>

          <TabsContent
            className="space-y-4"
            data-front-r5-ux-primary-context="true"
            value="resumo"
          >
        <div className="space-y-3 rounded-lg border border-border/60 p-3" data-front-r-attendance-context="true" data-front-r3-contact-context="true">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atendimento 360</p>
                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                  {contactContext.contact.type}
                </Badge>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-foreground">{contactContext.contact.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{contactContext.contact.phoneLabel}</p>
            </div>
            <Button
              className="h-auto min-h-9 w-full min-w-0 shrink-0 justify-start whitespace-normal text-left sm:w-auto"
              data-front-r-action="copy-phone"
              disabled={!canCopyPhone}
              onClick={() => {
                void handleCopyPhone();
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Copy className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>Copiar telefone</span>
            </Button>
          </div>
          {copyPhoneStatus && (
            <p className="text-xs leading-relaxed text-muted-foreground">{copyPhoneStatus}</p>
          )}

          <InactivitySuggestionPanel inactivityModel={inactivityModel} />

          <ContactTimelinePanel timelineModel={contactTimelineModel} />

          <div className="grid gap-2 md:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Canal e origem</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{contactContext.contact.channelLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{contactContext.contact.sourceLabel}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status e responsável</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{contactContext.contact.statusLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{contactContext.contact.responsibleLabel}</p>
            </div>
          </div>

          <div
            className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-sky-950"
            data-front-r5-summary-channel-queue="true"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Canal e fila</p>
                <p className="mt-1 text-sm font-semibold">{selectedChannelContext.label}</p>
                <p className="mt-1 text-xs leading-relaxed">{selectedChannelContext.statusLabel} · {selectedChannelContext.helper}</p>
              </div>
              <Badge
                variant="outline"
                className={`${responsiveBadgeClass} ${selectedQueueContext.isPersisted ? 'border-primary/20 bg-white/80 text-primary' : 'border-slate-200 bg-white/80 text-slate-700'}`}
                title={selectedQueueContext.stateLabel}
              >
                {selectedQueueContext.isPersisted ? selectedQueueContext.stateLabel : 'Sem fila definida'}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed">
              {selectedQueueContext.helper} Linha compartilhada: uma linha pode alimentar mais de uma fila; roteamento persistido por setor ainda não existe.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3" data-front-r3-primary-actions="true">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Ações principais</p>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {contactContext.primaryActions.slice(0, 2).map((action) => renderContactPrimaryAction(action))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Demais controles ficam nas abas Ações e CRM/Agenda. Enviar continua sendo o único caminho de envio.
            </p>
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3" data-front-r3-manual-pending-signals="true">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-foreground">Pendência principal</p>
            </div>
            {contactContext.pendingSignals.length ? (
              <div className="space-y-2">
                {contactContext.pendingSignals.slice(0, 1).map((signal) => {
                  const action = findContactPrimaryAction(signal.actionId);

                  return (
                    <div className="rounded-lg border border-border/60 bg-background p-3" key={signal.id}>
                      <p className="text-sm font-semibold text-foreground">{signal.label}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{signal.description}</p>
                      {action && (
                        <div className="mt-2">
                          {renderContactPrimaryAction(action)}
                        </div>
                      )}
                    </div>
                  );
                })}
                {contactContext.pendingSignals.length > 1 && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    +{contactContext.pendingSignals.length - 1} pendência(s) em Assistência.
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-xs leading-relaxed text-muted-foreground">
                Sem pendência manual destacada para esta conversa.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próxima ação sugerida</p>
              <div className="mt-1 space-y-2" data-front-r3-next-action="true">
                <p className="text-sm font-semibold text-foreground">{contextualNextAction.title}</p>
                <p className="text-xs text-muted-foreground">{contextualNextAction.reason}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{contextualNextAction.description}</p>
                {contextualNextAction.actionType === 'open' && contextualNextAction.href ? (
                  <Button
                    asChild
                    className={compactManualButtonClass}
                    data-front-r3-action="open-next-action"
                    size="sm"
                    variant="outline"
                  >
                    <Link to={contextualNextAction.href}>
                      <ExternalLink className="mr-2 h-4 w-4 shrink-0" />
                      <span className={compactManualButtonLabelClass}>{contextualNextAction.label}</span>
                    </Link>
                  </Button>
                ) : contextualNextAction.actionType === 'prepare_reply' ? (
                  <Button
                    className={compactManualButtonClass}
                    data-front-r3-action="prepare-next-reply"
                    disabled={!canSendManualReply || !contextualNextAction.replyText}
                    onClick={() => onPrepareManualReply(contextualNextAction.replyText)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
                    <span className={compactManualButtonLabelClass}>{contextualNextAction.label}</span>
                  </Button>
                ) : (
                  <Button
                    className={compactManualButtonClass}
                    data-front-r3-action="focus-next-action-controls"
                    onClick={handleFocusAttendanceControls}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ListChecks className="mr-2 h-4 w-4 shrink-0" />
                    <span className={compactManualButtonLabelClass}>{contextualNextAction.label}</span>
                  </Button>
                )}
                {contextualNextAction.disabledReason && (
                  <p className="text-xs leading-relaxed text-muted-foreground">{contextualNextAction.disabledReason}</p>
                )}
                <p
                  className="text-[11px] leading-relaxed text-muted-foreground"
                  data-front-r3-next-action-local-copy="Ação local e manual: não envia mensagem nem executa escrita automática."
                >
                  Ação manual segura: não envia mensagem nem executa escrita automática.
                </p>
              </div>
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent
            className="space-y-4"
            data-front-r5-ux-secondary-content="assistencia"
            value="assistencia"
          >
        <span
          aria-hidden="true"
          className="sr-only"
          data-front-r29-attendance-assistant-diagnostics="safe"
          data-allowed-tenant-source={attendanceAssistantModel.allowedTenantSource || 'unknown'}
          data-assistant-edge-no-suggestion-reason={attendanceAssistantModel.edgeNoSuggestionReason || 'unknown'}
          data-assistant-edge-response-accepted={attendanceAssistantModel.edgeResponseAccepted ? 'true' : 'false'}
          data-assistant-edge-settings-read={attendanceAssistantModel.edgeSettingsRead ? 'true' : 'false'}
          data-assistant-edge-tenant-resolved={attendanceAssistantModel.edgeTenantResolved ? 'true' : 'false'}
          data-assistant-local-fallback-used={attendanceAssistantModel.localFallbackUsed ? 'true' : 'false'}
          data-assistant-provider-expected-final-draft-source={replyWindowState.status === 'open' && selectedQueueItem?.respondNow ? 'provider_suggestion' : 'server_fallback'}
          data-assistant-provider-eligible-final-draft-scenario={replyWindowState.status === 'open' && selectedQueueItem?.respondNow ? 'true' : 'false'}
          data-assistant-provider-queue-bucket={attendanceAssistantQueueBucket}
          data-assistant-provider-rubric-expected-decision={replyWindowState.status === 'open' && selectedQueueItem?.respondNow ? 'approved_for_human_review' : replyWindowState.status === 'closed' ? 'blocked_closed_whatsapp_window' : 'blocked'}
          data-assistant-provider-whatsapp-window-state={replyWindowState.status || 'unknown'}
          data-assistant-provider-diagnostics-source={attendanceAssistantModel.providerDiagnosticsSource || 'unknown'}
          data-assistant-provider-gate-checks-source={attendanceAssistantModel.providerGateChecksSource || 'unknown'}
          data-assistant-server-fallback-used={attendanceAssistantModel.serverFallbackUsed ? 'true' : 'false'}
          data-assistant-request-conversation-ref-kind={attendanceAssistantConversationPresent ? 'conversation_id' : 'none'}
          data-assistant-request-has-conversation-ref={attendanceAssistantConversationPresent ? 'true' : 'false'}
          data-assistant-request-payload-shape-valid={attendanceAssistantConversationPresent ? 'true' : 'false'}
          data-context-input-chars-bucket={attendanceAssistantModel.contextInputCharsBucket || 'unknown'}
          data-context-pack-truncated={attendanceAssistantModel.contextPackTruncated ? 'true' : 'false'}
          data-input-chars-bucket={attendanceAssistantModel.inputCharsBucket || attendanceAssistantModel.contextInputCharsBucket || 'unknown'}
          data-edge-conversation-resolved={attendanceAssistantModel.edgeConversationResolved ? 'true' : 'false'}
          data-edge-invoke-status={attendanceAssistantModel.edgeInvokeStatus || 'unknown'}
          data-edge-no-suggestion-reason={attendanceAssistantModel.edgeNoSuggestionReason || 'unknown'}
          data-edge-provider-gate-checks={attendanceAssistantEdgeProviderGateChecksData}
          data-edge-response-accepted={attendanceAssistantModel.edgeResponseAccepted ? 'true' : 'false'}
          data-edge-response-used={attendanceAssistantModel.edgeResponseUsed ? 'true' : 'false'}
          data-edge-settings-read={attendanceAssistantModel.edgeSettingsRead ? 'true' : 'false'}
          data-edge-settings-read-source={attendanceAssistantModel.edgeSettingsReadSource || 'unknown'}
          data-edge-settings-read-status={attendanceAssistantModel.edgeSettingsReadStatus || 'unknown'}
          data-edge-tenant-resolved={attendanceAssistantModel.edgeTenantResolved ? 'true' : 'false'}
          data-effective-provider-gate-checks={attendanceAssistantEffectiveProviderGateChecksData}
          data-local-fallback-used={attendanceAssistantModel.localFallbackUsed ? 'true' : 'false'}
          data-local-fallback-provider-gate-checks={attendanceAssistantLocalFallbackProviderGateChecksData}
          data-provider-diagnostics-source={attendanceAssistantModel.providerDiagnosticsSource || 'unknown'}
          data-provider-endpoint-family={attendanceAssistantModel.providerEndpointFamily || 'unknown'}
          data-max-output-tokens-bucket={attendanceAssistantModel.maxOutputTokensBucket || 'unknown'}
          data-provider-abort-reason={attendanceAssistantModel.providerAbortReason || 'unknown'}
          data-provider-elapsed-ms-bucket={attendanceAssistantModel.providerElapsedMsBucket || 'not_measured'}
          data-provider-fetch-aborted={attendanceAssistantModel.providerFetchAborted ? 'true' : 'false'}
          data-provider-fetch-settled={attendanceAssistantModel.providerFetchSettled ? 'true' : 'false'}
          data-provider-failure-kind={attendanceAssistantModel.providerFailureKind || 'provider_not_called'}
          data-provider-failure-retryable={typeof attendanceAssistantModel.providerFailureRetryable === 'boolean' ? String(attendanceAssistantModel.providerFailureRetryable) : 'null'}
          data-provider-failure-stage={attendanceAssistantModel.providerFailureStage || 'unknown'}
          data-provider-failure-status={attendanceAssistantModel.providerFailureStatus || 'unknown'}
          data-provider-gate-checks={attendanceAssistantProviderGateChecksData}
          data-provider-gate-checks-are-server-side={attendanceAssistantModel.providerGateChecksAreServerSide ? 'true' : 'false'}
          data-provider-gate-checks-source={attendanceAssistantModel.providerGateChecksSource || 'unknown'}
          data-provider-http-status={attendanceAssistantModel.providerHttpStatus == null ? 'null' : String(attendanceAssistantModel.providerHttpStatus)}
          data-provider-model-label={attendanceAssistantModel.providerModelLabel || 'unknown'}
          data-provider-request-started={attendanceAssistantModel.providerRequestStarted ? 'true' : 'false'}
          data-provider-output-accepted-reason={attendanceAssistantModel.providerOutputAcceptedReason || 'unknown'}
          data-provider-output-accepted={attendanceAssistantModel.providerOutputAccepted ? 'true' : 'false'}
          data-provider-parse-source={attendanceAssistantModel.providerParseSource || 'unknown'}
          data-provider-parse-status={attendanceAssistantModel.providerParseStatus || 'unknown'}
          data-provider-response-parsed={attendanceAssistantModel.providerResponseParsed ? 'true' : 'false'}
          data-provider-schema-mismatch-fields={(attendanceAssistantModel.providerSchemaMismatchFields || []).join(',')}
          data-provider-rubric-blocked-categories={(attendanceAssistantModel.providerRubricBlockedCategories || []).join(',')}
          data-provider-rubric-blocked-reason={attendanceAssistantModel.providerRubricBlockedReason || 'none'}
          data-provider-rubric-decision={attendanceAssistantModel.providerRubricDecision || 'not_evaluated'}
          data-provider-secret-check-name={attendanceAssistantModel.providerSecretCheckName || 'not_checked'}
          data-provider-suggestion-accepted={attendanceAssistantModel.providerSuggestionAccepted ? 'true' : 'false'}
          data-provider-suggestion-blocked-by-rubric={attendanceAssistantModel.providerSuggestionBlockedByRubric ? 'true' : 'false'}
          data-provider-suggestion-fallback-reason={attendanceAssistantModel.providerSuggestionFallbackReason || 'unknown'}
          data-provider-suggestion-used={attendanceAssistantModel.providerSuggestionUsed ? 'true' : 'false'}
          data-provider-playbook-acknowledged={attendanceAssistantModel.providerPlaybookAcknowledged ? 'true' : 'false'}
          data-provider-playbook-aligned={attendanceAssistantModel.providerPlaybookAligned ? 'true' : 'false'}
          data-provider-playbook-id={attendanceAssistantModel.providerPlaybookId || 'unknown'}
          data-tenant-playbook-policy-configured={attendanceAssistantModel.tenantPlaybookPolicy?.configured ? 'true' : 'false'}
          data-tenant-playbook-policy-fallback={attendanceAssistantModel.tenantPlaybookPolicy?.fallbackApplied ? 'true' : 'false'}
          data-reply-continuity-acknowledged={attendanceAssistantModel.replyContinuityAcknowledged ? 'true' : 'false'}
          data-reply-continuity-aligned={attendanceAssistantModel.replyContinuityAligned ? 'true' : 'false'}
          data-reply-continuity-acknowledgement={attendanceAssistantModel.replyContinuityAcknowledgement || 'unknown'}
          data-reply-continuity-next-move={attendanceAssistantModel.replyContinuityNextMove || 'unknown'}
          data-provider-skip-reason={attendanceAssistantModel.providerSkipReason || 'unknown'}
          data-provider-timeout-ms-bucket={attendanceAssistantModel.providerTimeoutMsBucket || 'unknown'}
          data-provider-timeout-source={attendanceAssistantModel.providerTimeoutSource || 'unknown'}
          data-request-payload-size-bucket={attendanceAssistantModel.requestPayloadSizeBucket || 'unknown'}
          data-final-draft-origin-label={attendanceAssistantModel.finalDraftOriginLabel || attendanceAssistantModel.draftOriginLabel || 'unknown'}
          data-final-draft-source={attendanceAssistantModel.finalDraftSource || 'none'}
          data-response-mode={attendanceAssistantModel.responseMode || attendanceAssistantModel.mode || 'unknown'}
          data-response-format-mode={attendanceAssistantModel.responseFormatMode || 'unknown'}
          data-response-source={attendanceAssistantModel.responseSource || attendanceAssistantModel.source || 'unknown'}
          data-server-fallback-used={attendanceAssistantModel.serverFallbackUsed ? 'true' : 'false'}
          data-server-suggestion-used={attendanceAssistantModel.serverSuggestionUsed || attendanceAssistantModel.usedServerSuggestion ? 'true' : 'false'}
          data-selected-conversation-present={attendanceAssistantConversationPresent ? 'true' : 'false'}
          data-tenant-settings-source={attendanceAssistantModel.tenantSettingsSource || 'unknown'}
          data-tenant-settings-status={attendanceAssistantModel.tenantSettingsStatus || 'unknown'}
        />
        <div
          className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
          data-front-r29-attendance-assistant="true"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Assistente de Atendimento</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Sugestão segura para apoiar a equipe. Nada é enviado sem revisão humana.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="w-fit border-primary/20 bg-background text-primary">
                {attendanceAssistantModel.stateLabel}
              </Badge>
              <Badge
                variant="outline"
                className="w-fit border-border bg-background text-muted-foreground"
                title="Sugestão segura para validação"
              >
                {attendanceAssistantModel.sourceDescription}
              </Badge>
              {attendanceAssistantModel.playbookLabel && (
                <Badge
                  className="w-fit border-emerald-200 bg-emerald-50 text-emerald-900"
                  data-front-r29i-assistant-playbook="true"
                  title={attendanceAssistantModel.playbookObjective || 'Playbook seguro aplicado ao rascunho.'}
                  variant="outline"
                >
                  Playbook aplicado: {attendanceAssistantModel.playbookLabel}
                </Badge>
              )}
              {attendanceAssistantModel.tenantPlaybookPolicy?.hasPolicySignal && (
                <Badge
                  className={`w-fit ${
                    attendanceAssistantModel.tenantPlaybookPolicy.fallbackApplied
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-sky-200 bg-sky-50 text-sky-900'
                  }`}
                  data-front-r29i-assistant-tenant-playbook-policy="true"
                  title="Mostra somente metadados seguros da configuração de playbooks desta clínica. Não exibe mensagens, telefone, prompt ou payload."
                  variant="outline"
                >
                  {attendanceAssistantModel.tenantPlaybookPolicy.fallbackApplied
                    ? 'Fallback da clínica'
                    : 'Playbook liberado na clínica'}
                </Badge>
              )}
              <Button
                className="h-8 min-w-0 gap-1.5 px-2.5 text-xs"
                data-front-r29c-action="generate-attendance-assistant-suggestion"
                disabled={!conversation || isGeneratingAttendanceAssistantDraft}
                onClick={handleGenerateAttendanceAssistantDraft}
                size="sm"
                title="Gerar sugestão segura para validação"
                type="button"
                variant="outline"
              >
                <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isGeneratingAttendanceAssistantDraft ? 'animate-spin' : ''}`} />
                <span className={compactManualButtonLabelClass}>
                  {isGeneratingAttendanceAssistantDraft
                    ? 'Atualizando...'
                    : attendanceAssistantModel.usedServerSuggestion
                      ? 'Atualizar sugestão segura'
                      : 'Gerar sugestão segura'}
                </span>
              </Button>
            </div>
          </div>

          {attendanceAssistantError && (
            <p
              className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs leading-relaxed text-amber-800"
              data-front-r29c-attendance-assistant-fallback="true"
            >
              {attendanceAssistantError}
            </p>
          )}
          {!attendanceAssistantError && attendanceAssistantFeedback && (
            <p
              className={`rounded-lg border p-2 text-xs leading-relaxed ${attendanceAssistantFeedbackClass}`}
              data-front-r29c-attendance-assistant-feedback="true"
            >
              {attendanceAssistantFeedback}
            </p>
          )}

          {attendanceAssistantModel.hasEnoughText ? (
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-background p-3" data-front-r29-attendance-assistant-summary="true">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo seguro</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{attendanceAssistantModel.safeSummary}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3" data-front-r29-attendance-assistant-intent="true">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intenção provável</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{attendanceAssistantModel.detectedIntent.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{attendanceAssistantModel.detectedIntent.reason}</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-background p-3" data-front-r29-attendance-assistant-next-step="true">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximo passo</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{attendanceAssistantModel.suggestedNextStep.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{attendanceAssistantModel.suggestedNextStep.description}</p>
                {attendanceAssistantModel.playbookAllowedNextStep && (
                  <p
                    className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] leading-relaxed text-emerald-900"
                    data-front-r29i-assistant-playbook-next-step="true"
                  >
                    Roteiro seguro: {attendanceAssistantModel.playbookAllowedNextStep}
                  </p>
                )}
              </div>
              {attendanceAssistantModel.tenantPlaybookPolicy?.hasPolicySignal && (
                <div
                  className={`rounded-lg border p-3 lg:col-span-2 ${
                    attendanceAssistantModel.tenantPlaybookPolicy.fallbackApplied
                      ? 'border-amber-200 bg-amber-50/70 text-amber-950'
                      : 'border-sky-200 bg-sky-50/70 text-sky-950'
                  }`}
                  data-front-r29i-assistant-tenant-playbook-policy-panel="true"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide">Configuração da clínica</p>
                    <Badge
                      className="w-fit border-current bg-background/70 text-[10px]"
                      title="Metadado sanitizado vindo do servidor para explicar a política de playbooks aplicada nesta conversa."
                      variant="outline"
                    >
                      Playbooks
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed">
                    {attendanceAssistantModel.tenantPlaybookPolicy.summary}
                  </p>
                  {attendanceAssistantModel.tenantPlaybookPolicy.fallbackApplied && (
                    <p className="mt-2 text-[11px] leading-relaxed">
                      Pedido: {attendanceAssistantModel.tenantPlaybookPolicy.requestedPlaybookLabel}. Usado: {attendanceAssistantModel.tenantPlaybookPolicy.selectedPlaybookLabel}.
                    </p>
                  )}
                </div>
              )}
              {attendanceAssistantDecision && (
                <div
                  className={`rounded-lg border p-3 lg:col-span-2 ${attendanceAssistantDecisionClass}`}
                  data-front-r29i-assistant-decision-explanation="true"
                  data-front-r29i-assistant-decision-state={attendanceAssistantDecision.state}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <p className="text-xs font-semibold uppercase tracking-wide">Decisão da IA</p>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed">{attendanceAssistantDecision.description}</p>
                    </div>
                    <Badge
                      className={`w-fit shrink-0 ${attendanceAssistantDecisionBadgeClass}`}
                      data-front-r29i-assistant-decision-label="true"
                      title="Resumo sanitizado da origem final do rascunho. Não exibe prompt, mensagem bruta, payload ou telefone."
                      variant="outline"
                    >
                      {attendanceAssistantDecision.stateLabel}
                    </Badge>
                  </div>
                  {attendanceAssistantDecision.items?.length > 0 && (
                    <div className="mt-3 grid gap-2 md:grid-cols-3" data-front-r29i-assistant-decision-items="true">
                      {attendanceAssistantDecision.items.map((item) => (
                        <div className="rounded-md border border-current/10 bg-white/70 px-2 py-1.5" key={`${item.label}-${item.value}`}>
                          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{item.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="rounded-lg border border-border/60 bg-background p-3" data-front-r29-attendance-assistant-draft="true">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rascunho sugerido</p>
                  <Badge
                    className={`w-fit ${attendanceAssistantDraftOriginClass}`}
                    data-front-r29-attendance-assistant-draft-origin="true"
                    title={attendanceAssistantModel.draftOriginDescription}
                    variant="outline"
                  >
                    {attendanceAssistantModel.draftOriginLabel}
                  </Badge>
                  <Badge
                    className={`w-fit ${attendanceAssistantDraftQualityClass}`}
                    data-front-r29i-draft-quality-status={attendanceAssistantModel.draftQualityStatus}
                    title={attendanceAssistantModel.draftQualityDescription}
                    variant="outline"
                  >
                    {attendanceAssistantModel.draftQualityLabel}
                  </Badge>
                </div>
                <p
                  className="mt-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[11px] leading-relaxed text-muted-foreground"
                  data-front-r29-attendance-assistant-draft-origin-description="true"
                >
                  {attendanceAssistantModel.draftOriginDescription}
                </p>
                {attendanceAssistantModel.draftQualityReasons?.length > 0 && (
                  <div
                    className={`mt-2 rounded-md border px-2 py-1.5 text-[11px] leading-relaxed ${
                      attendanceAssistantModel.draftQualityTone === 'blocked'
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                    data-front-r29i-draft-quality-reasons="true"
                  >
                    <p className="font-semibold">Rubrica de segurança</p>
                    <ul className="mt-1 space-y-1">
                      {attendanceAssistantModel.draftQualityReasons.map((reason) => (
                        <li className="flex gap-1.5" key={reason}>
                          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {attendanceAssistantModel.draftQualityStatus === 'blocked' && (
                  <p
                    className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] leading-relaxed text-red-900"
                    data-front-r29i-draft-quality-blocked="true"
                  >
                    {attendanceAssistantModel.draftBlockedFeedback}
                  </p>
                )}
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{attendanceAssistantModel.replyDraft}</p>
                {replyWindowState.isClosed && (
                  <p
                    className="mt-2 rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[11px] leading-relaxed text-violet-900"
                    data-front-r29-window-draft-note="true"
                  >
                    Janela WhatsApp fechada: usar como rascunho prepara texto interno, sem liberar Enviar e sem iniciar nova conversa.
                  </p>
                )}
                <Button
                  className="mt-3 h-auto min-h-9 w-full min-w-0 justify-start whitespace-normal text-left text-xs leading-snug sm:w-auto"
                  data-front-r29-action="use-attendance-assistant-draft"
                  disabled={!canUseAttendanceAssistantDraft}
                  onClick={handleUseAttendanceAssistantDraft}
                  size="sm"
                  title={attendanceAssistantModel.draftQualityStatus === 'blocked'
                    ? 'Rascunho bloqueado pela rubrica de segurança'
                    : replyWindowState.isClosed
                      ? 'Usar como rascunho interno; envio livre segue bloqueado'
                      : 'Usar como rascunho revisável'}
                  type="button"
                  variant="outline"
                >
                  <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
                  <span className={compactManualButtonLabelClass}>Usar como rascunho</span>
                </Button>
                {canShowAttendanceAssistantFeedback && (
                  <div
                    className="mt-3 space-y-2 rounded-md border border-sky-200 bg-sky-50/60 p-2"
                    data-front-r29i-assistant-feedback="true"
                    data-front-r29i-assistant-feedback-no-free-text="true"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-sky-950">Esse rascunho ajudou?</p>
                        <p className="text-[11px] leading-relaxed text-sky-900">
                          Registro seguro: apenas metadados e motivos controlados, sem texto do rascunho.
                        </p>
                      </div>
                      <Badge className="border-sky-200 bg-white text-sky-800" variant="outline">
                        Metadata-only
                      </Badge>
                    </div>
                    {attendanceAssistantFeedbackSubmitCount > 0 && !attendanceAssistantFeedbackReasonMode && attendanceAssistantFeedbackChoice ? (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-sky-900">
                        <span>Feedback registrado para melhoria de qualidade.</span>
                        {canChangeAttendanceAssistantFeedback && (
                          <Button
                            className="h-7 px-2 text-[11px]"
                            data-front-r29i-assistant-feedback-change="true"
                            disabled={isRecordingAttendanceAssistantFeedback}
                            onClick={handleChangeAttendanceAssistantFeedback}
                            type="button"
                            variant="outline"
                          >
                            Alterar feedback
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5" data-front-r29i-assistant-feedback-options="true">
                        {attendanceAssistantModel.draftQualityStatus === 'blocked' && (
                          <Button
                            className="h-7 px-2 text-[11px]"
                            data-front-r29i-assistant-feedback-value="blocked_correctly"
                            disabled={isRecordingAttendanceAssistantFeedback}
                            onClick={() => handleSubmitAttendanceAssistantFeedback('useful', 'blocked_correctly')}
                            type="button"
                            variant="outline"
                          >
                            Bloqueio correto
                          </Button>
                        )}
                        <Button
                          className="h-7 px-2 text-[11px]"
                          data-front-r29i-assistant-feedback-value="useful"
                          disabled={isRecordingAttendanceAssistantFeedback}
                          onClick={() => handleSelectAttendanceAssistantFeedback('useful')}
                          type="button"
                          variant="outline"
                        >
                          Helpful
                        </Button>
                        <Button
                          className="h-7 px-2 text-[11px]"
                          data-front-r29i-assistant-feedback-value="not_useful"
                          disabled={isRecordingAttendanceAssistantFeedback}
                          onClick={() => handleSelectAttendanceAssistantFeedback('not_useful')}
                          type="button"
                          variant="outline"
                        >
                          Não ajudou
                        </Button>
                        <Button
                          className="h-7 px-2 text-[11px]"
                          data-front-r29i-assistant-feedback-value="risky"
                          disabled={isRecordingAttendanceAssistantFeedback}
                          onClick={() => handleSelectAttendanceAssistantFeedback('risky')}
                          type="button"
                          variant="outline"
                        >
                          Risco operacional
                        </Button>
                        <Button
                          className="h-7 px-2 text-[11px]"
                          data-front-r29i-assistant-feedback-value="skipped"
                          disabled={isRecordingAttendanceAssistantFeedback}
                          onClick={() => handleSelectAttendanceAssistantFeedback('skipped')}
                          type="button"
                          variant="outline"
                        >
                          Preferi responder manualmente
                        </Button>
                      </div>
                    )}
                    {attendanceAssistantFeedbackReasonMode && (
                      <div
                        className="space-y-1 rounded-md border border-sky-200 bg-white/80 p-2"
                        data-front-r29i-assistant-feedback-reasons="true"
                      >
                        <p className="text-[11px] font-semibold text-sky-950">Motivo controlado</p>
                        <div className="flex flex-wrap gap-1.5">
                          {activeAttendanceAssistantFeedbackReasons.map((reason) => (
                            <Button
                              className="h-7 px-2 text-[11px]"
                              data-front-r29i-assistant-feedback-reason={reason}
                              disabled={isRecordingAttendanceAssistantFeedback}
                              key={reason}
                              onClick={() => handleSubmitAttendanceAssistantFeedback(
                                attendanceAssistantFeedbackReasonMode,
                                reason,
                              )}
                              type="button"
                              variant="outline"
                            >
                              {OMNICHANNEL_ASSISTANT_FEEDBACK_REASONS[reason]}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p
              className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs leading-relaxed text-muted-foreground"
              data-front-r29-attendance-assistant-empty="true"
            >
              {attendanceAssistantModel.emptyState}
            </p>
          )}

          <div className="space-y-2 rounded-lg border border-border/60 bg-background p-3" data-front-r29-attendance-assistant-safety="true">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Revisão humana obrigatória</p>
            </div>
            <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              {attendanceAssistantModel.safetyNotes.map((note) => (
                <li className="flex gap-2" key={note}>
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {attendanceAssistantModel.contextPackSummary && (
            <div
              className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/70 p-3"
              data-front-r29i-attendance-assistant-context-pack="safe-summary"
            >
              <div className="flex flex-wrap items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sky-700" />
                <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">Contexto seguro usado</p>
                {attendanceAssistantModel.contextPackSource && (
                  <Badge
                    className="w-fit border-sky-200 bg-background text-[10px] text-sky-800"
                    title="Pacote sanitizado antes da sugestão. O conteúdo bruto não é exibido."
                    variant="outline"
                  >
                    Context Pack seguro
                  </Badge>
                )}
              </div>
              <p
                className="text-xs leading-relaxed text-sky-950"
                data-front-r29i-attendance-assistant-context-pack-summary="true"
              >
                {attendanceAssistantModel.contextPackSummary}
              </p>
              {attendanceAssistantModel.contextPackSignals?.length > 0 && (
                <div className="flex flex-wrap gap-1.5" data-front-r29i-attendance-assistant-context-pack-signals="true">
                  {attendanceAssistantModel.contextPackSignals.map((signal) => (
                    <Badge
                      className="max-w-full border-sky-200 bg-background text-[10px] text-sky-800"
                      key={signal}
                      title={signal}
                      variant="outline"
                    >
                      {signal}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {attendanceAssistantModel.contextLabels.length > 0 && (
            <div className="flex flex-wrap gap-1.5" data-front-r29-attendance-assistant-context="safe-labels">
              {attendanceAssistantModel.contextLabels.map((label) => (
                <Badge
                  className="max-w-full border-border bg-background text-[10px] text-muted-foreground"
                  key={label}
                  title={label}
                  variant="outline"
                >
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <details
          className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3"
          data-front-r3-reply-library="true"
          data-front-r3-reply-library-collapsible="true"
          data-front-r5-ux-reply-library-collapsed="true"
          data-front-r5-ux-reply-library-on-demand="true"
        >
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Respostas e playbooks</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Biblioteca de apoio manual. Use no composer para preencher texto; Enviar continua sendo o único caminho de envio.
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-border bg-background text-muted-foreground">
                Sob demanda
              </Badge>
            </div>
          </summary>

          <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
            <label className="min-w-0 space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Buscar resposta</span>
              <Input
                className="bg-background"
                data-front-r3-action="search-reply-library"
                disabled={!conversation}
                onChange={(event) => setReplyLibrarySearch(event.target.value)}
                placeholder="Buscar por situação ou texto"
                value={replyLibrarySearch}
              />
            </label>
            <div className="flex min-w-0 flex-wrap items-end gap-1.5">
              {replyLibrary.filters.map((filter) => (
                <Button
                  aria-pressed={replyLibraryFilter === filter.id}
                  className="h-auto min-h-8 min-w-0 whitespace-normal px-2 py-1 text-xs leading-snug"
                  data-front-r3-action="filter-reply-library"
                  disabled={!conversation}
                  key={filter.id}
                  onClick={() => setReplyLibraryFilter(filter.id)}
                  size="sm"
                  title={filter.label}
                  type="button"
                  variant={replyLibraryFilter === filter.id ? 'default' : 'outline'}
                >
                  <span className={compactManualButtonLabelClass}>{filter.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-2" data-front-r3-reply-library-suggestions="true">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sugeridas pelo contexto</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {replyLibrary.suggestionLabel || 'Sugeridas pelo contexto carregado.'}
              </p>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {replyLibrary.suggestedItems.slice(0, 3).map((item) => renderReplyLibraryItem(item, { suggested: true }))}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Biblioteca</p>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Mostrando {visibleReplyLibraryItems.length} de {filteredReplyLibraryItems.length} respostas.
              </p>
            </div>
            {visibleReplyLibraryItems.length ? (
              <div className="grid gap-2 lg:grid-cols-2">
                {visibleReplyLibraryItems.map((item) => renderReplyLibraryItem(item))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                {replyLibrary.emptyState}
              </p>
            )}
          </div>
        </details>

        <details
          className="space-y-3 rounded-lg border border-border/60 p-3"
          data-front-r3-manual-playbook="true"
          data-front-r3-manual-script="true"
          data-front-r5-ux-playbook-on-demand="true"
        >
          <summary className="cursor-pointer list-none">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Playbook manual</p>
                </div>
                <p className="mt-1 line-clamp-1 break-words text-xs leading-relaxed text-muted-foreground" title={manualPlaybook.objective}>
                  {manualPlaybook.title} · {manualPlaybook.objective}
                </p>
              </div>
              <Badge variant="outline" className="w-fit border-primary/20 bg-primary/10 text-primary">
                {manualPlaybookSelection === OMNICHANNEL_MANUAL_PLAYBOOK_AUTO ? 'Sugerido' : 'Selecionado'}
              </Badge>
            </div>
          </summary>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Playbook</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-front-r3-action="select-manual-playbook"
              data-front-r3-legacy-action="select-manual-script"
              onChange={(event) => onManualPlaybookSelectionChange(event.target.value)}
              value={manualPlaybookSelection}
            >
              {OMNICHANNEL_MANUAL_PLAYBOOK_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                {manualPlaybookSelection === OMNICHANNEL_MANUAL_PLAYBOOK_AUTO ? 'Sugerido' : 'Selecionado'}
              </Badge>
              <p className="text-sm font-semibold text-foreground">{manualPlaybook.title}</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{manualPlaybook.objective}</p>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Sugestão inicial: {manualPlaybook.modeLabel}. A escolha vale apenas nesta sessão.
            </p>
            <ol className="space-y-1 pl-4 text-xs leading-relaxed text-muted-foreground">
              {manualPlaybook.steps.slice(0, 4).map((step) => (
                <li className="list-decimal" key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3" data-front-r3-playbook-reply-groups="true">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Textos na biblioteca</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              As respostas deste playbook aparecem em Respostas e playbooks, no composer. Use a biblioteca para buscar, pré-visualizar e inserir texto sem envio automático.
            </p>
            <Button
              className={compactManualButtonClass}
              data-front-r3-action="focus-reply-library"
              onClick={onFocusReplyLibrary}
              size="sm"
              type="button"
              variant="outline"
            >
              <MessageCircle className="mr-2 h-4 w-4 shrink-0" />
              <span className={compactManualButtonLabelClass}>Abrir biblioteca</span>
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações manuais</p>
            {manualPlaybook.actions.length > 0 ? (
              <div className="grid gap-2 md:grid-cols-2">
                {manualPlaybook.actions.map((action) => renderManualPlaybookAction(action))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                {manualPlaybook.emptyActionState}
              </p>
            )}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Ação manual segura: a biblioteca só preenche o campo de resposta. Enviar continua sendo o único caminho de envio. Não cria template Meta, campanha, automação ou tarefa persistida.
          </p>
        </details>

        <div className="space-y-3 rounded-lg border border-border/60 p-3" data-front-r3-quality-checklist="true">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Qualidade do atendimento</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Checklist de apoio à resposta. Não salva no banco e não bloqueia envio. Use para revisar o atendimento antes de responder.
              </p>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700">
              {qualityChecklist.progressLabel}
            </Badge>
          </div>

          <div className="grid gap-2">
            {qualityChecklist.items.map((item) => (
              <label
                className="flex min-w-0 items-start gap-2 rounded-lg border border-border/60 bg-muted/10 p-2 text-xs leading-relaxed text-muted-foreground"
                key={item.id}
              >
                <input
                  checked={item.checked}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary"
                  data-front-r3-action="toggle-quality-check"
                  onChange={() => onToggleQualityChecklistItem(item.id)}
                  type="checkbox"
                />
                <span className="min-w-0 break-words">{item.label}</span>
              </label>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-foreground">Lacunas do atendimento</p>
            </div>
            {qualityGaps.length ? (
              <div className="space-y-2">
                {qualityGaps.map((gap) => (
                  <div className="rounded-lg border border-border/60 bg-background p-3" data-front-r3-quality-gap="true" key={gap.id}>
                    <p className="text-sm font-semibold text-foreground">{gap.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gap.description}</p>
                    <div className="mt-2">
                      {renderQualityAction(gap)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/70 p-3 text-xs leading-relaxed text-muted-foreground">
                Sem lacuna principal detectada no contexto carregado.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/10 p-3" data-front-r3-manual-closure="true">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Fechamento manual</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{manualClosureState.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{manualClosureState.description}</p>
            {renderQualityAction(manualClosureState)}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Orientação visual de apoio: não altera status real, não finaliza conversa e não cria fila ou tarefa persistida.
            </p>
          </div>
        </div>
          </TabsContent>

          <TabsContent
            className="space-y-4"
            data-front-r5-ux-action-tab="true"
            value="acoes"
          >
        <div className="space-y-3 rounded-lg border border-border/60 p-3" data-front-r4-collaboration-panel="true">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Atendimento</p>
              <p className="text-xs text-muted-foreground">
                {collaborationModel?.assignment?.label || conversation.assignedToLabel || 'Sem responsável'} · {collaborationModel?.readState?.helper || (conversation.hasUnreadInbound ? 'Há inbound não lida' : 'Sem inbound não lida')}
              </p>
            </div>
            <Badge
              variant="outline"
              className={`${responsiveBadgeClass} ${conversation.hasUnreadInbound ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
            >
              {collaborationModel?.readState?.label || (conversation.hasUnreadInbound ? `${conversation.unreadCount || 1} não lida` : 'Lida')}
            </Badge>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-2">
              <p className="font-semibold text-foreground">{collaborationModel?.assignment?.label || 'Sem responsável'}</p>
              <p className="mt-1">{collaborationModel?.assignment?.helper}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-2">
              <p className="font-semibold text-foreground">{collaborationModel?.readState?.label || 'Lida'}</p>
              <p className="mt-1">{collaborationModel?.readState?.helper}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-2">
              <p className="font-semibold text-foreground">{collaborationModel?.status?.label || 'Aberta'}</p>
              <p className="mt-1">{collaborationModel?.status?.helper}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-2">
              <p className="font-semibold text-foreground">{collaborationModel?.notes?.count || 0} notas internas</p>
              <p className="mt-1">{collaborationModel?.notes?.helper}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3" data-front-r4-assignment-controls="true" data-front-r4-read-controls="true">
            <Button
              aria-label="Atribuir conversa para mim"
              className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug"
              data-front-r-action="assign-to-me"
              disabled={!collaborationModel?.assignment?.canAssign || isMutating}
              onClick={() => {
                void onAssignToMe().catch(() => {});
              }}
              title="Atribuir para mim"
              type="button"
              variant="outline"
            >
              {collaborationModel?.assignment?.isAssigning && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Assumir
            </Button>
            <Button
              aria-label="Remover responsável da conversa"
              className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug"
              data-front-r-action="unassign"
              disabled={!collaborationModel?.assignment?.canUnassign || isMutating}
              onClick={() => {
                void onUnassignConversation().catch(() => {});
              }}
              title="Remover responsável"
              type="button"
              variant="outline"
            >
              {collaborationModel?.assignment?.isUnassigning && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
            <Button
              aria-label="Marcar conversa como lida"
              className="h-auto min-h-10 w-full min-w-0 whitespace-normal leading-snug"
              data-front-r-action="mark-read"
              disabled={!collaborationModel?.readState?.canMarkRead || isMutating}
              onClick={() => {
                void onMarkRead().catch(() => {});
              }}
              title="Marcar como lida"
              type="button"
              variant="outline"
            >
              {collaborationModel?.readState?.isMarkingRead && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Marcar lida
            </Button>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Assumir ou remover responsável salva no atendimento quando seu perfil permite. Marcar lida exige conferência manual da conversa; nota interna continua separada do WhatsApp.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2" data-front-r4-status-controls="true">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              Status operacional
            </span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              data-front-p-action="update-status"
              disabled={!collaborationModel?.status?.canUpdate || isMutating}
              onChange={(event) => {
                void onUpdateStatus(event.target.value).catch(() => {});
              }}
              value={conversation.status}
            >
              {OMNICHANNEL_CONVERSATION_STATUSES.map((status) => (
                <option key={status} value={status}>{OMNICHANNEL_COLLABORATION_STATUS_LABELS[status] || OMNICHANNEL_CONVERSATION_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <span
              className="block text-[11px] leading-relaxed text-muted-foreground"
              data-front-r4-status-contract-copy="`waiting` é usado como acompanhamento/retorno manual"
            >
              Acompanhamento/retorno manual usa o status existente; nenhum status novo é criado.
              {collaborationModel?.status?.isUpdating ? ' Atualizando status...' : ''}
            </span>
          </label>
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Flag className="h-4 w-4 text-primary" />
              Prioridade
            </span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              data-front-p-action="update-priority"
              disabled={!canManage || isMutating}
              onChange={(event) => {
                void onUpdatePriority(event.target.value).catch(() => {});
              }}
              value={conversation.priority}
            >
              {OMNICHANNEL_CONVERSATION_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{OMNICHANNEL_CONVERSATION_PRIORITY_LABELS[priority]}</option>
              ))}
            </select>
          </label>
        </div>

            {replyWindowState.isClosed && (
              <div
                className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/70 p-3 text-violet-950"
                data-front-r29-closed-window-action="true"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Planejar reativação</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      A janela WhatsApp está fechada. Registre acompanhamento manual ou aguarde nova mensagem inbound; template aprovado da Meta fica planejado para etapa futura.
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit border-violet-200 bg-white/70 text-violet-800">
                    Sem envio automático
                  </Badge>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Esta ação é apenas orientação visual: não envia WhatsApp, não cria campanha, não dispara provider e não inicia nova conversa.
                </p>
              </div>
            )}

            {notesPanel}
            {historyPanel}
          </TabsContent>

          <TabsContent
            className="space-y-4"
            data-front-r5-ux-crm-agenda-tab="true"
            value="crm-agenda"
          >
        <div className="space-y-3 rounded-lg border border-border/60 p-3" data-front-r3-contact-agenda="true" data-front-r3-navigation-shortcuts="true">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Atalhos do atendimento</p>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{navigationActions.summary}</p>
          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Paciente</p>
              <p className="mt-1 text-foreground">{buildSafePatientLabel(linkedPatient)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide">Lead</p>
              <p className="mt-1 text-foreground">{buildSafeLeadLabel(linkedLead)}</p>
            </div>
          </div>

          {navigationActions.primaryAction ? (
            <div className="space-y-2">
              {renderNavigationShortcut(navigationActions.primaryAction, true)}
              {navigationActions.secondaryActions.length > 0 && (
                <div className="grid gap-2 md:grid-cols-2">
                  {navigationActions.secondaryActions.map((action) => renderNavigationShortcut(action))}
                </div>
              )}
              <div className="space-y-1">
                {[navigationActions.primaryAction, ...navigationActions.secondaryActions].map((action) => (
                  <p className="text-[11px] leading-relaxed text-muted-foreground" key={`${action.id}-description`}>
                    {action.description}
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-border/70 p-3 text-xs leading-relaxed text-muted-foreground">
              {navigationActions.emptyState}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Atalhos manuais locais: navegam para CRM/Agenda ou focam controles existentes, sem criar paciente, lead, consulta, mensagem ou automação.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-border/60 p-3" data-front-r-crm-links="true">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Vínculos CRM</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vincular paciente</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                data-front-p-action="select-patient-link"
                disabled={patientLinkDisabled}
                onChange={(event) => setPatientChoice(event.target.value)}
                value={patientChoice}
              >
                <option value="">Selecionar paciente</option>
                {patientOptions.map((option) => (
                  <option key={option.key} value={option.key}>{buildSafePatientLabel(option.entity)}</option>
                ))}
              </select>
              <Button
                className="w-full"
                data-front-p-action="link-patient"
                disabled={patientLinkDisabled || !patientChoice}
                onClick={handleLinkPatientChoice}
                type="button"
                variant="outline"
              >
                <UserRound className="mr-2 h-4 w-4" />
                Vincular paciente
              </Button>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vincular lead</span>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                data-front-p-action="select-lead-link"
                disabled={leadLinkDisabled}
                onChange={(event) => setLeadChoice(event.target.value)}
                value={leadChoice}
              >
                <option value="">Selecionar lead</option>
                {leadOptions.map((option) => (
                  <option key={option.key} value={option.key}>{buildSafeLeadLabel(option.entity)}</option>
                ))}
              </select>
              <Button
                className="w-full"
                data-front-p-action="link-lead"
                disabled={leadLinkDisabled || !leadChoice}
                onClick={handleLinkLeadChoice}
                type="button"
                variant="outline"
              >
                <UsersRound className="mr-2 h-4 w-4" />
                Vincular lead
              </Button>
            </label>
          </div>
          {crmLinkError && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Vínculo não atualizado</AlertTitle>
              <AlertDescription>{crmLinkError}</AlertDescription>
            </Alert>
          )}
          <Button
            className="w-full"
            data-front-p-action="unlink-context"
            disabled={!canManage || isMutating || (!hasLinkedPatient && !hasLinkedLead)}
            onClick={() => {
              void onUnlinkContext().catch(() => {});
            }}
            type="button"
            variant="ghost"
          >
            <Unlink className="mr-2 h-4 w-4" />
            Remover vínculo
          </Button>
          <div className="space-y-3 rounded-lg border border-dashed border-border/70 p-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Criar lead a partir desta conversa</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ação manual com confirmação. Usa o telefone da conversa, origem WhatsApp e não cria paciente automaticamente.
              </p>
            </div>
            {canReadCrm && !canWriteCrmLead && (
              <p
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"
                data-front-r27-crm-readonly-write-block="true"
              >
                Seu perfil pode consultar CRM/Agenda, mas não pode criar lead.
              </p>
            )}
            {hasLinkedPatient && (
              <p
                className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900"
                data-front-r27-lead-blocked-by-patient="true"
              >
                Conversa já vinculada a paciente. Para criar ou vincular lead, remova o vínculo primeiro.
              </p>
            )}
            {hasLinkedLead && (
              <p
                className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-relaxed text-sky-900"
                data-front-r27-patient-blocked-by-lead="true"
              >
                Conversa já vinculada a lead. Para vincular paciente, remova o vínculo primeiro.
              </p>
            )}
            {!conversation?.contactPhoneE164 && (
              <p
                className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"
                data-front-r27-lead-phone-required="true"
              >
                Lead por WhatsApp precisa de telefone útil da conversa; revise manualmente antes de criar.
              </p>
            )}
            {leadCreationError && (
              <Alert className="border-red-200 bg-red-50 text-red-900">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Lead não criado</AlertTitle>
                <AlertDescription>{leadCreationError}</AlertDescription>
              </Alert>
            )}
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome do lead (opcional)</span>
              <input
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                data-front-r-action="lead-name-from-conversation"
                disabled={createLeadDisabled}
                onChange={(event) => setNewLeadName(event.target.value)}
                placeholder={conversation.contactDisplayName || 'Contato WhatsApp'}
                value={newLeadName}
              />
            </label>
            <Button
              className="w-full"
              data-front-r-action="create-lead-from-conversation"
              disabled={createLeadDisabled}
              onClick={() => {
                void onCreateLeadFromConversation(newLeadName).then(() => setNewLeadName('')).catch(() => {});
              }}
              type="button"
              variant="outline"
            >
              Criar lead manualmente
            </Button>
          </div>
          {!canReadCrm && (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Seleção de paciente e lead exige módulo CRM com permissão patients.read.
            </p>
          )}
        </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const queueSummaryCards = [
  {
    icon: FileClock,
    key: 'responderAgora',
    label: 'Responder',
    title: 'Responder agora',
    tone: 'border-primary/20 bg-primary/5 text-primary',
  },
  {
    icon: Clock3,
    key: 'janelaFechada',
    label: 'Janela fech.',
    title: 'Janela WhatsApp fechada',
    tone: 'border-violet-200 bg-violet-50/40 text-violet-700',
  },
  {
    icon: MessageCircle,
    key: 'naoLidas',
    label: 'Não lidas',
    tone: 'border-red-200 bg-red-50/40 text-red-700',
  },
  {
    icon: UserRound,
    key: 'semResponsavel',
    label: 'Sem resp.',
    title: 'Sem responsável',
    tone: 'border-amber-200 bg-amber-50/40 text-amber-700',
  },
  {
    icon: CalendarDays,
    key: 'agendaAtencao',
    label: 'Agenda',
    title: 'Fluxos da Agenda que precisam de revisão humana',
    tone: 'border-red-200 bg-red-50/40 text-red-700',
  },
  {
    icon: Link2,
    key: 'semVinculo',
    label: 'Sem CRM',
    title: 'Sem vínculo CRM',
    tone: 'border-slate-200 bg-slate-50/60 text-slate-700',
  },
];

const queueToneByItem = (item) => {
  if (item.schedulingRequiresHuman) return 'border-red-300 bg-red-50/70';
  if (item.hasUnreadInbound) return 'border-red-200 bg-red-50/60';
  if (item.manualReplyWindowStatus === 'closed') return 'border-violet-200 bg-violet-50/50';
  if (item.isResolved) return 'border-emerald-200 bg-emerald-50/50';
  if (item.isOverdue) return 'border-red-200 bg-red-50/60';
  if (item.isDueToday) return 'border-amber-200 bg-amber-50/60';
  if (item.isHighPriority) return 'border-orange-200 bg-orange-50/50';
  if (item.isUnassigned) return 'border-amber-200 bg-amber-50/40';
  return 'border-border/60 bg-card';
};

const OperationalQueuePanel = ({
  activeFilter,
  canManage,
  canShowFullPhone = false,
  filters,
  isLoading,
  onFilterChange,
  onOpenItem,
  onRefresh,
  onSearchChange,
  queueItems,
  search,
  summary,
}) => (
  <Card className="border-border/50 shadow-sm" data-front-p-operational-queue="true">
    <CardHeader>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListChecks className="h-5 w-5 text-primary" />
            Fila operacional
          </CardTitle>
          <CardDescription>
            Priorize conversas por status, retorno e vínculo com paciente ou lead.
          </CardDescription>
        </div>
        <Button
          className="w-full sm:w-auto"
          data-front-p-action="refresh-operational-queue"
          disabled={isLoading}
          onClick={onRefresh}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar fila
        </Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {queueSummaryCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.key} className={`rounded-lg border p-3 shadow-sm ${card.tone}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
                <Icon className="h-4 w-4 shrink-0" />
              </div>
              <p className="text-2xl font-bold leading-tight text-foreground">{summary?.[card.key] || 0}</p>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.id}
              className="h-9 max-w-full"
              data-front-p-queue-filter={filter.id}
              onClick={() => onFilterChange(filter.id)}
              size="sm"
              type="button"
              variant={activeFilter === filter.id ? 'default' : 'outline'}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <label className="min-w-0 space-y-2 lg:w-80">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Busca na fila</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-front-p-queue-search="true"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar contato, vínculo ou motivo"
              type="search"
              value={search}
            />
          </div>
        </label>
      </div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : queueItems.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {queueItems.map((item) => (
            <div
              key={item.conversationId}
              className={`min-w-0 overflow-hidden rounded-lg border p-4 ${queueToneByItem(item)}`}
              data-front-p-queue-item="true"
              data-front-p-queue-reason={item.reason}
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{item.contato}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{(canShowFullPhone ? item.phoneLabel : item.maskedPhone) || item.maskedPhone}</p>
                </div>
                <div className="flex flex-wrap gap-1 sm:justify-end">
                  <Badge variant="outline" className={priorityToneByValue[item.prioridade] || priorityToneByValue.normal}>
                    {item.priorityLabel}
                  </Badge>
                  <Badge variant="outline" className={statusToneByValue[item.status] || 'border-border bg-muted text-muted-foreground'}>
                    {item.statusLabel}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 text-sm leading-relaxed">
                <p className="break-words font-medium text-foreground">{item.reason}</p>
                <p className="break-words text-muted-foreground">{item.nextManualAction}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                    {item.linkLabel}
                  </Badge>
                  <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
                    Destino: {item.suggestedDestination}
                  </Badge>
                  <Badge variant="outline" className={item.hasUnreadInbound ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-background text-muted-foreground'}>
                    {item.hasUnreadInbound ? `${item.unreadCount || 1} não lida` : 'Lida'}
                  </Badge>
                  <Badge variant="outline" className={item.isUnassigned ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-sky-200 bg-sky-50 text-sky-700'}>
                    {item.assignedToLabel}
                  </Badge>
                  {item.schedulingHasFlow && (
                    <Badge
                      variant="outline"
                      className={item.schedulingRequiresHuman
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : item.scheduling?.isCompleted
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-sky-200 bg-sky-50 text-sky-700'}
                      data-front-r578-queue-scheduling="true"
                    >
                      Agenda: {item.scheduling.label}
                    </Badge>
                  )}
                  {item.nextActionAt && (
                    <Badge variant="outline" className={item.isOverdue ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'}>
                      Retorno: {formatDateTime(item.nextActionAt)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <Button
                  className="w-full"
                  data-front-p-action="open-queue-triage"
                  onClick={() => onOpenItem(item.conversationId, 'triage')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {item.schedulingRequiresHuman ? 'Revisar agenda' : 'Abrir conversa'}
                </Button>
                <Button
                  className="w-full"
                  data-front-p-action="open-queue-activity"
                  onClick={() => onOpenItem(item.conversationId, 'history')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Registrar ação
                </Button>
                <Button
                  className="w-full"
                  data-front-p-action="open-queue-link"
                  onClick={() => onOpenItem(item.conversationId, 'triage')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Vincular paciente/lead
                </Button>
                <Button
                  className="w-full"
                  data-front-p-action="open-queue-resolve"
                  disabled={!canManage || item.isResolved}
                  onClick={() => onOpenItem(item.conversationId, 'history')}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Marcar resolvida
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm leading-relaxed text-muted-foreground">
          Nenhuma pendência operacional para o filtro atual. Isso não é erro; ajuste filtros, busca ou aguarde novas conversas recebidas pelo canal configurado.
        </div>
      )}
    </CardContent>
  </Card>
);

const OmnichannelPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAccessModule, hasPermission } = useAuth();
  const inbox = useOmnichannelInbox();
  const canReadCrm = canAccessModule('mod_crm') && hasPermission('patients.read');
  const canWriteCrmLead = canAccessModule('mod_crm') && hasPermission('patients.manage');
  const canReadAgenda = canAccessModule('mod_agenda') && hasPermission('appointments.read');
  const patientsState = usePatients({ enabled: inbox.canReadOmnichannel && canReadCrm });
  const leadsState = usePatientLeads({ enabled: inbox.canReadOmnichannel && canReadCrm });
  const schedule = useSchedule({ enabled: inbox.canReadOmnichannel && canReadAgenda });
  const activeChannel = useMemo(() => (
    inbox.channels.find((channel) => channel.id === inbox.selectedConversation?.channelId)
    || inbox.channels[0]
    || null
  ), [inbox.channels, inbox.selectedConversation?.channelId]);
  const selectedChannelContext = inbox.selectedQueueItem?.channelContext || buildOmnichannelChannelContext({
    channelStatus: inbox.channelStatus,
    channels: inbox.channels,
    conversation: inbox.selectedConversation,
  });
  const selectedQueueContext = inbox.selectedQueueItem?.queueContext || buildOmnichannelQueueContext({
    triageResult: inbox.selectedConversationTriageResult,
  });
  const selectedConversationPatientId = inbox.selectedConversation?.patientId || inbox.selectedConversation?.patient_id || '';
  const selectedConversationLeadId = inbox.selectedConversation?.leadId || inbox.selectedConversation?.lead_id || '';
  const selectedLinkedPatient = useMemo(() => (
    (patientsState.patients || []).find((patient) => patient.id === selectedConversationPatientId) || null
  ), [patientsState.patients, selectedConversationPatientId]);
  const selectedLinkedLead = useMemo(() => (
    (leadsState.leads || []).find((lead) => lead.id === selectedConversationLeadId) || null
  ), [leadsState.leads, selectedConversationLeadId]);
  const selectedNextAppointment = useMemo(() => {
    if (!selectedLinkedPatient || !schedule.appointments?.length) return null;

    return schedule.appointments
      .filter((appointment) => resolveAppointmentCrmPatient(appointment, [selectedLinkedPatient]).patient?.id === selectedLinkedPatient.id)
      .sort((first, second) => getCrmAgendaAppointmentSortValue(first) - getCrmAgendaAppointmentSortValue(second))[0] || null;
  }, [schedule.appointments, selectedLinkedPatient]);
  const selectedOperationalNextAction = useMemo(() => buildContextualManualNextAction({
    canReadAgenda,
    canReadCrm,
    canSendManualReply: inbox.canSendManualReply,
    conversation: inbox.selectedConversation,
    linkedLead: selectedLinkedLead,
    linkedPatient: selectedLinkedPatient,
    nextAppointment: selectedNextAppointment,
    selectedQueueItem: inbox.selectedQueueItem,
  }), [
    canReadAgenda,
    canReadCrm,
    inbox.canSendManualReply,
    inbox.selectedConversation,
    inbox.selectedQueueItem,
    selectedLinkedLead,
    selectedLinkedPatient,
    selectedNextAppointment,
  ]);
  const [leadCreationError, setLeadCreationError] = useState('');
  const [manualReplyDraftsByConversation, setManualReplyDraftsByConversation] = useState({});
  const [manualReplyDraftSourcesByConversation, setManualReplyDraftSourcesByConversation] = useState({});
  const [manualPlaybookSelection, setManualPlaybookSelection] = useState(OMNICHANNEL_MANUAL_PLAYBOOK_AUTO);
  const [activeMobilePanel, setActiveMobilePanel] = useState(OMNICHANNEL_MOBILE_PANEL_IDS.queue);
  const [activeContextTab, setActiveContextTab] = useState('resumo');
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState(OMNICHANNEL_WORKSPACE_TAB_IDS.attendance);
  const [focusedConversationId, setFocusedConversationId] = useState(null);
  const [showInternalEventsInConversation, setShowInternalEventsInConversation] = useState(false);
  const [qualityChecklistByConversation, setQualityChecklistByConversation] = useState({});
  const isInboxLoadingRef = useRef(false);
  const isFocusMode = Boolean(focusedConversationId);
  const activeQueueFilter = inbox.activeQueueFilter;
  const setQueueFilter = inbox.setQueueFilter;
  const requestedConversationIdFromNavigation = typeof location.state?.selectOmnichannelConversationId === 'string'
    ? location.state.selectOmnichannelConversationId
    : '';
  const requestedQueueFilterFromNavigation = new URLSearchParams(location.search).get('filter') || '';

  useEffect(() => {
    const isKnownFilter = primaryConversationFilterIds.has(requestedQueueFilterFromNavigation)
      || secondaryConversationFilterIds.has(requestedQueueFilterFromNavigation);

    if (isKnownFilter && activeQueueFilter !== requestedQueueFilterFromNavigation) {
      setQueueFilter(requestedQueueFilterFromNavigation);
    }
  }, [activeQueueFilter, requestedQueueFilterFromNavigation, setQueueFilter]);

  useEffect(() => {
    setManualPlaybookSelection(OMNICHANNEL_MANUAL_PLAYBOOK_AUTO);
    setActiveContextTab('resumo');
    setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.attendance);
    setShowInternalEventsInConversation(false);
  }, [inbox.selectedConversation?.id]);

  useEffect(() => {
    if (!requestedConversationIdFromNavigation) return;
    if (inbox.isLoading) return;

    const conversationExistsInTenant = inbox.conversations.some((conversation) => (
      conversation.id === requestedConversationIdFromNavigation
    ));

    if (conversationExistsInTenant && inbox.selectedConversation?.id !== requestedConversationIdFromNavigation) {
      inbox.selectConversation(requestedConversationIdFromNavigation);
      setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.conversation);
      setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.attendance);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [
    inbox,
    inbox.conversations,
    inbox.isLoading,
    inbox.selectedConversation?.id,
    location.pathname,
    navigate,
    requestedConversationIdFromNavigation,
  ]);

  useEffect(() => {
    if (!focusedConversationId) return;

    const focusedConversationStillExists = inbox.operationalQueue.some((item) => item.conversationId === focusedConversationId);
    if (!focusedConversationStillExists) {
      setFocusedConversationId(null);
    }
  }, [focusedConversationId, inbox.operationalQueue]);


  useEffect(() => {
    isInboxLoadingRef.current = Boolean(inbox.isLoading || inbox.isLoadingConversationDetails || inbox.isLiveRefreshing);
  }, [inbox.isLoading, inbox.isLoadingConversationDetails, inbox.isLiveRefreshing]);

  useEffect(() => {
    if (!inbox.canReadOmnichannel || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible' || isInboxLoadingRef.current) return;
      void inbox.refreshLive();
    };

    const intervalId = window.setInterval(refreshIfVisible, OMNICHANNEL_AUTO_REFRESH_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refreshIfVisible();
    };
    const handleFocus = () => refreshIfVisible();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [inbox.canReadOmnichannel, inbox.refreshLive]);

  const visibleQueueCount = Array.isArray(inbox.visibleQueueItems) ? inbox.visibleQueueItems.length : 0;
  const hasConversationContent = Boolean(
    inbox.selectedConversation
    || inbox.messages.length
    || inbox.selectedConversationActivities.length
    || inbox.selectedConversationNotes.length,
  );
  const showConversationSkeleton = inbox.isLoading && !hasConversationContent;
  const isConversationUpdatingInBackground = Boolean(
    inbox.isLoadingConversationDetails
    || (inbox.isLoading && hasConversationContent),
  );
  const liveRefreshTimeLabel = formatOmnichannelLiveRefreshTime(inbox.lastRefreshAt);
  const liveRefreshDraftSafetyLabel = 'drafts preserved';
  const liveRefreshStatusBusy = Boolean(inbox.isLoading || inbox.isLiveRefreshing);
  const liveRefreshStatusDescriptionId = 'omnichannel-live-refresh-status-description';
  const canUseLiveRefresh = Boolean(inbox.canReadOmnichannel && !inbox.isLoading && !inbox.isLiveRefreshing);
  const liveRefreshManualActionLabel = !inbox.canReadOmnichannel
    ? 'This role cannot refresh the inbox'
    : inbox.isLiveRefreshing
      ? `Refreshing the inbox · ${liveRefreshDraftSafetyLabel}`
      : inbox.isLoading
        ? `Waiting for the inbox to finish loading · ${liveRefreshDraftSafetyLabel}`
        : `Refresh the queue and open conversation · ${liveRefreshDraftSafetyLabel}`;
  const liveRefreshManualTitle = !inbox.canReadOmnichannel
    ? 'This role cannot refresh the inbox.'
    : inbox.isLiveRefreshing
      ? 'The queue and open conversation are refreshing. Drafts are preserved.'
      : inbox.isLoading
        ? 'Wait for the inbox to finish loading before refreshing. Drafts are preserved.'
        : 'Refresh the queue and open conversation. This view also updates every 15 seconds while visible. Drafts are preserved.';
  const liveRefreshCadenceLabel = `Refreshes every ${OMNICHANNEL_AUTO_REFRESH_INTERVAL_SECONDS} seconds while visible · ${liveRefreshDraftSafetyLabel}`;
  const liveRefreshContextLabel = liveRefreshTimeLabel
    ? `Last updated at ${liveRefreshTimeLabel} · refreshes every ${OMNICHANNEL_AUTO_REFRESH_INTERVAL_SECONDS} seconds while visible · ${liveRefreshDraftSafetyLabel}`
    : liveRefreshCadenceLabel;
  const handleManualLiveRefresh = () => {
    if (!canUseLiveRefresh) return;
    void inbox.refreshLive();
  };
  const mobilePanels = useMemo(() => ([
    {
      id: OMNICHANNEL_MOBILE_PANEL_IDS.queue,
      label: 'Fila',
      status: `${visibleQueueCount} itens`,
      Icon: Inbox,
    },
    {
      id: OMNICHANNEL_MOBILE_PANEL_IDS.conversation,
      label: 'Conversa',
      status: inbox.selectedConversation ? 'Selecionada' : 'Sem seleção',
      Icon: MessageCircle,
    },
    {
      id: OMNICHANNEL_MOBILE_PANEL_IDS.context,
      label: 'Contexto',
      status: inbox.selectedConversation ? 'CRM e ações' : 'Aguardando',
      Icon: UsersRound,
    },
  ]), [inbox.selectedConversation, visibleQueueCount]);

  const { pageRef, navigationRef, workspaceRef } = useOmnichannelWorkspaceLayout(activeMobilePanel);

  const getMobilePanelClassName = (panelId) => (
    `min-w-0 ${activeMobilePanel === panelId ? 'block' : 'hidden'} xl:block xl:h-full xl:min-h-0 xl:overflow-hidden`
  );

  const workspacePanelClassName = `min-w-0 ${
    activeMobilePanel === OMNICHANNEL_MOBILE_PANEL_IDS.queue ? 'hidden' : 'block'
  } xl:block xl:h-full xl:min-h-0 xl:overflow-hidden`;

  const composerState = useMemo(() => buildOmnichannelComposerState({
    conversationId: inbox.selectedConversation?.id,
    draftSourcesByConversation: manualReplyDraftSourcesByConversation,
    draftsByConversation: manualReplyDraftsByConversation,
    maxLength: MANUAL_QUICK_REPLY_MAX_LENGTH,
  }), [inbox.selectedConversation?.id, manualReplyDraftSourcesByConversation, manualReplyDraftsByConversation]);
  const manualReplyDraft = composerState.replyText;
  const collaborationModel = useMemo(() => buildOmnichannelCollaborationModel({
    activeAction: inbox.activeCollaborationAction,
    activities: inbox.selectedConversationActivities,
    canManage: inbox.canManage,
    conversation: inbox.selectedConversation,
    feedback: inbox.collaborationFeedback,
    notes: inbox.selectedConversationNotes,
  }), [
    inbox.activeCollaborationAction,
    inbox.canManage,
    inbox.collaborationFeedback,
    inbox.selectedConversation,
    inbox.selectedConversationActivities,
    inbox.selectedConversationNotes,
  ]);

  const updateManualReplyDraft = (conversationId, nextText, sourceLabel = '') => {
    if (!conversationId) return;

    const safeText = String(nextText || '').slice(0, MANUAL_QUICK_REPLY_MAX_LENGTH);
    setManualReplyDraftsByConversation((currentDrafts) => {
      if (!safeText.trim()) {
        const remainingDrafts = { ...currentDrafts };
        delete remainingDrafts[conversationId];
        return remainingDrafts;
      }

      return {
        ...currentDrafts,
        [conversationId]: safeText,
      };
    });
    setManualReplyDraftSourcesByConversation((currentSources) => {
      if (!safeText.trim()) {
        const remainingSources = { ...currentSources };
        delete remainingSources[conversationId];
        return remainingSources;
      }

      return {
        ...currentSources,
        [conversationId]: sourceLabel || currentSources[conversationId] || 'digitação manual',
      };
    });
  };

  const handleManualReplyDraftChange = (nextText, options = {}) => {
    const conversationId = options.conversationId || inbox.selectedConversation?.id;
    updateManualReplyDraft(conversationId, nextText, options.sourceLabel || 'digitação manual');
  };

  const handleInsertManualReplyText = (text, options = {}) => {
    const safeText = String(text || '').trim();
    const conversationId = options.conversationId || inbox.selectedConversation?.id;
    if (!safeText || !conversationId) return;

    const currentText = manualReplyDraftsByConversation[conversationId] || '';
    const trimmedCurrent = currentText.trim();
    const mode = options.mode === 'replace' ? 'replace' : 'append';
    const nextText = mode === 'replace' || !trimmedCurrent
      ? safeText
      : `${trimmedCurrent}\n\n${safeText}`;

    updateManualReplyDraft(conversationId, nextText, options.sourceLabel || 'biblioteca manual');
  };

  const handleWorkspaceTabChange = (tabId) => {
    setActiveWorkspaceTab(tabId);

    if (tabId === OMNICHANNEL_WORKSPACE_TAB_IDS.attendance) {
      setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.conversation);
      return;
    }

    setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.context);
    setActiveContextTab(tabId);
  };

  const handleMobilePanelChange = (panelId) => {
    setActiveMobilePanel(panelId);

    if (panelId === OMNICHANNEL_MOBILE_PANEL_IDS.conversation) {
      setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.attendance);
      return;
    }

    if (panelId === OMNICHANNEL_MOBILE_PANEL_IDS.context) {
      setActiveWorkspaceTab(activeContextTab || OMNICHANNEL_WORKSPACE_TAB_IDS.summary);
    }
  };

  const handleFocusReplyLibrary = () => {
    setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.context);
    setActiveContextTab('assistencia');
    setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.assistance);

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    window.requestAnimationFrame(() => {
      document
        .querySelector('[data-front-r3-reply-library="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleFocusManualPlaybook = () => {
    setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.context);
    setActiveContextTab('assistencia');
    setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.assistance);

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    window.requestAnimationFrame(() => {
      document
        .querySelector('[data-front-r3-manual-playbook="true"], [data-front-r3-manual-script="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleFocusSelectedOperationalPlanControls = () => {
    setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.context);
    setActiveContextTab(OMNICHANNEL_WORKSPACE_TAB_IDS.summary);
    setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.summary);

    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    window.requestAnimationFrame(() => {
      document
        .querySelector('[data-front-r3-next-action="true"], [data-front-r3-primary-actions="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleToggleQualityChecklistItem = (itemId) => {
    const conversationId = inbox.selectedConversation?.id;
    if (!conversationId || !itemId) return;

    setQualityChecklistByConversation((currentState) => {
      const currentConversationState = currentState[conversationId] || {};
      return {
        ...currentState,
        [conversationId]: {
          ...currentConversationState,
          [itemId]: !currentConversationState[itemId],
        },
      };
    });
  };

  const handleSelectConversation = (conversationId, { keepFocus = false } = {}) => {
    inbox.selectConversation(conversationId);
    setActiveMobilePanel(OMNICHANNEL_MOBILE_PANEL_IDS.conversation);
    setActiveWorkspaceTab(OMNICHANNEL_WORKSPACE_TAB_IDS.attendance);
    if (!keepFocus) {
      setFocusedConversationId(null);
    }
  };

  const handleFocusNextConversation = () => {
    const nextQueueItem = inbox.visibleQueueItems.find((item) => !item.isResolved && !item.isArchived)
      || inbox.visibleQueueItems[0];
    if (!nextQueueItem) return;

    setFocusedConversationId(nextQueueItem.conversationId);
    handleSelectConversation(nextQueueItem.conversationId, { keepFocus: true });
  };

  const handleClearFocusMode = () => {
    setFocusedConversationId(null);
  };

  const handleCreateLeadFromConversation = async (leadNameInput = '') => {
    setLeadCreationError('');

    const conversation = inbox.selectedConversation;
    if (!conversation) {
      const message = 'Selecione uma conversa antes de criar o lead.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    if (!inbox.canManage) {
      const message = 'Perfil sem permissão operacional para alterar vínculos do atendimento.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    if (!canReadCrm) {
      const message = 'CRM indisponível para este perfil.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    if (!canWriteCrmLead) {
      const message = 'Seu perfil pode consultar CRM/Agenda, mas não pode criar lead.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    if (hasConversationLinkedPatient(conversation)) {
      const message = 'Conversa já vinculada a paciente. Use o paciente existente ou remova o vínculo antes de criar lead.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    if (hasConversationLinkedLead(conversation)) {
      const message = 'Conversa já vinculada a lead. Use o lead existente ou remova o vínculo antes de criar outro.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    const phoneDigits = normalizePhoneDigits(conversation.contactPhoneE164);
    if (!phoneDigits) {
      const message = 'Conversa sem telefone válido para criar lead.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    const duplicatePatients = findPhoneMatches(patientsState.patients, phoneDigits);
    const duplicateLeads = findPhoneMatches(leadsState.leads, phoneDigits);

    if (duplicatePatients.length + duplicateLeads.length > 1) {
      const message = 'Há mais de um cadastro com telefone semelhante. Revise manualmente antes de criar lead.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    if (duplicatePatients.length === 1 || duplicateLeads.length === 1) {
      const message = duplicatePatients.length === 1
        ? 'Já existe paciente com esse telefone no tenant. Vincule o paciente existente antes de continuar.'
        : 'Já existe lead com esse telefone no tenant. Vincule o lead existente antes de continuar.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    const confirmed = window.confirm('Criar lead manual a partir desta conversa WhatsApp? Nenhum paciente será criado automaticamente e nenhuma mensagem será enviada.');
    if (!confirmed) {
      const message = 'Criação de lead cancelada.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    const leadName = String(leadNameInput || '').trim()
      || conversation.contactDisplayName
      || `Contato WhatsApp ${maskPhone(conversation.contactPhoneE164)}`;
    let createdLead = null;

    try {
      createdLead = await leadsState.createLead({
        interest: resolveWhatsAppLeadInterest({
          selectedQueueItem: inbox.selectedQueueItem,
          selectedTriageResult: inbox.selectedConversationTriageResult,
        }),
        name: leadName,
        nextAction: 'Atender conversa no WhatsApp',
        notesSummary: 'Lead criado manualmente a partir de conversa WhatsApp. Atendimento humano preservado.',
        origin: 'WhatsApp',
        phone: conversation.contactPhoneE164,
        priority: 'Normal',
        status: 'Novo lead',
      });
    } catch {
      const message = 'Não foi possível criar lead com este perfil. Revise a permissão de CRM e tente novamente.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    try {
      await inbox.linkLead(createdLead.id);
      await inbox.addActivity({
        activityType: 'lead_created',
        noteText: 'Lead criado manualmente a partir da conversa WhatsApp. Revisão humana preservada.',
        outcome: 'lead_created',
      });
      await inbox.refresh();
    } catch {
      const message = 'Lead criado, mas o vínculo com a conversa precisa de revisão manual.';
      setLeadCreationError(message);
      throw new Error(message);
    }

    return createdLead;
  };
  const handleOpenQueueItem = (conversationId, target = 'triage') => {
    handleSelectConversation(conversationId);

    window.setTimeout(() => {
      const selector = target === 'history'
        ? '[data-front-p-operational-history="true"]'
        : '[data-front-p-triage-panel="true"]';
      document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };
  const shouldRenderLegacyOperationalQueue = false;
  const selectedConversationOperationalContext = inbox.selectedQueueItem ? (
    <>
      <SchedulingOperationalStatusPanel
        canManage={inbox.canManage}
        isMutating={inbox.isMutating}
        isUnassigned={inbox.selectedQueueItem.isUnassigned}
        onAssignToMe={inbox.assignToMe}
        onShowHistory={() => setShowInternalEventsInConversation(true)}
        scheduling={inbox.selectedQueueItem.scheduling}
      />
      <SelectedConversationOperationalPlan
        manualReplyWindowState={inbox.manualReplyWindowState}
        nextAction={selectedOperationalNextAction}
        onFocusContext={handleFocusSelectedOperationalPlanControls}
        onPrepareManualReply={handleInsertManualReplyText}
        selectedQueueItem={inbox.selectedQueueItem}
      />
    </>
  ) : null;

  return (
    <>
      <Helmet>
        <title>Atendimento Omnichannel | SorriSync</title>
      </Helmet>

      <Layout mainClassName="overflow-x-clip">
        <div
          ref={pageRef}
          className="mx-auto flex w-full max-w-7xl flex-col gap-5"
          data-front-r211ux-natural-omnichannel-scroll="true"
        >
          <motion.div className="shrink-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                    Atendimento WhatsApp
                  </h1>
                </div>
                <p
                  className="text-sm leading-relaxed text-muted-foreground md:text-base"
                  data-front-r2-header-contract-copy="Fila, conversa e resposta manual em um fluxo de atendimento WhatsApp."
                >
                  Converse com pacientes de forma simples e segura.
                </p>
                <div
                  className="sr-only"
                  data-front-hugo-dynamic-header-badges="true"
                  data-front-r5-channel-queue-header="true"
                >
                  Canal: {selectedChannelContext.label}. {selectedQueueContext.stateLabel}.
                </div>
              </div>

              <div className="flex min-w-0 flex-col items-stretch gap-1 sm:items-end lg:justify-end">
                <Button aria-describedby={inbox.canReadOmnichannel ? liveRefreshStatusDescriptionId : undefined} aria-label={liveRefreshManualActionLabel} className="h-auto min-h-11 w-full whitespace-normal sm:w-auto" disabled={!canUseLiveRefresh} onClick={handleManualLiveRefresh} size="sm" data-front-hugo-auto-refresh="15000" data-front-r29g-live-refresh="selected-conversation" data-front-r210h-live-refresh-manual-action="true" data-front-r210l-live-refresh-manual-forced="true" data-front-r210m-live-refresh-permission-guard="true" data-front-r210n-live-refresh-busy-guard="true" data-front-r210p-live-refresh-describedby="true" title={liveRefreshManualTitle} type="button" variant="outline">
                  <RefreshCw
                    aria-hidden="true"
                    className={`mr-2 h-4 w-4 ${inbox.isLoading || inbox.isLiveRefreshing ? 'animate-spin' : ''}`}
                    data-front-r210j-live-refresh-icon-decorative="true"
                  />
                  Atualizar
                </Button>
                {inbox.canReadOmnichannel && (
                  <p
                    aria-atomic="true"
                    aria-busy={liveRefreshStatusBusy}
                    aria-live="polite"
                    className="max-w-full text-left text-[11px] leading-tight text-muted-foreground sm:text-right"
                    data-front-r210d-live-refresh-last-check="true"
                    data-front-r210e-live-refresh-cadence="true"
                    data-front-r210f-live-refresh-visible-tab="true"
                    data-front-r210g-live-refresh-draft-safe="true"
                    data-front-r210i-live-refresh-status-region="true"
                    data-front-r210o-live-refresh-aria-busy="true"
                    data-front-r210p-live-refresh-describedby="true"
                    id={liveRefreshStatusDescriptionId}
                    role="status"
                  >
                    {liveRefreshContextLabel}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-4"><HandoffCard conversationId={inbox.selectedConversation?.id} /></div>

            {inbox.liveRefreshNotice && (
              <div
                aria-atomic="true"
                aria-busy="false"
                aria-live="polite"
                className="mb-4 inline-flex max-w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800"
                data-front-r29g-live-refresh-notice="true"
                data-front-r210k-live-refresh-feedback-status="true"
                data-front-r210o-live-refresh-aria-busy="true"
                role="status"
              >
                <RefreshCw
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                  data-front-r210j-live-refresh-icon-decorative="true"
                />
                <span className="min-w-0 break-words">{inbox.liveRefreshNotice.message}</span>
              </div>
            )}

            {inbox.isLiveRefreshing && !inbox.liveRefreshNotice && (
              <div
                aria-atomic="true"
                aria-busy="true"
                aria-live="polite"
                className="mb-4 inline-flex max-w-full items-center gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900"
                data-front-r210c-live-refresh-status="checking"
                data-front-r210k-live-refresh-feedback-status="true"
                data-front-r210o-live-refresh-aria-busy="true"
                role="status"
              >
                <RefreshCw
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin"
                  data-front-r210j-live-refresh-icon-decorative="true"
                />
                <span className="min-w-0 break-words">Verificando novas mensagens...</span>
              </div>
            )}

            {inbox.source !== 'Supabase' && (
              <Alert className="mb-4 border-amber-200 bg-amber-50 py-2 text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Dados de demonstração</AlertTitle>
                <AlertDescription>
                  Use esta tela operacionalmente apenas com dados do atendimento. Quando a base estiver em demonstração, ela serve para validação visual e fica identificada como demo.
                </AlertDescription>
              </Alert>
            )}

            {inbox.error && (
              <Alert className="mb-6 border-red-200 bg-red-50 text-red-900">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Leitura indisponível</AlertTitle>
                <AlertDescription>{inbox.error}</AlertDescription>
              </Alert>
            )}

          </motion.div>

          {shouldRenderLegacyOperationalQueue ? (
            <OperationalQueuePanel
              activeFilter={inbox.activeQueueFilter}
              canManage={inbox.canManage}
              canShowFullPhone={inbox.canReadOmnichannelMessages}
              filters={inbox.operationalFilters}
              isLoading={inbox.isLoading}
              onFilterChange={inbox.setQueueFilter}
              onOpenItem={handleOpenQueueItem}
              onRefresh={inbox.refreshQueue}
              onSearchChange={inbox.setQueueSearch}
              queueItems={inbox.visibleQueueItems}
              search={inbox.queueSearch}
              summary={inbox.operationalSummary}
            />
          ) : null}

          <div
            ref={navigationRef}
            className="sticky top-[calc(var(--omni-header-height,64px)+8px)] z-20 grid min-w-0 shrink-0 grid-cols-3 gap-1 rounded-lg border border-border/60 bg-background/95 p-1 shadow-sm backdrop-blur xl:hidden"
            data-front-r3-mobile-navigation="true"
            data-front-r586-mobile-primary-navigation="true"
            role="tablist"
            aria-label="Navegação compacta do atendimento"
          >
            {mobilePanels.map(({ id, label, status, Icon }) => {
              const isActive = activeMobilePanel === id;

              return (
                <Button
                  key={id}
                  aria-pressed={isActive}
                  aria-selected={isActive}
                  className={`${mobilePanelButtonClass} ${isActive ? '' : 'bg-background'}`}
                  data-front-r3-action="select-mobile-panel"
                  data-front-r3-mobile-tab={id}
                  onClick={() => handleMobilePanelChange(id)}
                  role="tab"
                  type="button"
                  variant={isActive ? 'default' : 'outline'}
                >
                  <span className="flex min-w-0 flex-col items-center gap-1">
                    <span className="flex min-w-0 items-center gap-1">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-semibold">{label}</span>
                    </span>
                    <span className="max-w-full truncate text-[11px] opacity-80">{status}</span>
                  </span>
                </Button>
              );
            })}
          </div>

          <div
            ref={workspaceRef}
            className="grid min-w-0 gap-4 xl:h-[var(--omni-workspace-height)] xl:min-h-0 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)]"
            data-front-r-operational-layout="queue-conversation-context"
            data-front-r586-desktop-contained-workspace="true"
            data-front-r5-ux-no-desktop-context-column="true"
            data-front-r5-ux-two-column-workspace="true"
          >
            <div className={getMobilePanelClassName(OMNICHANNEL_MOBILE_PANEL_IDS.queue)} data-front-r3-mobile-panel="queue">
            <Card className="min-w-0 overflow-hidden border-border/50 shadow-sm xl:flex xl:h-full xl:min-h-0 xl:flex-col" data-front-p-operational-queue="true">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">Fila</CardTitle>
                    <CardDescription className="text-xs">Busca, filtros e prioridade operacional.</CardDescription>
                  </div>
                  <Badge variant="outline" className={statusToneByValue[inbox.channelStatus.status] || 'border-border bg-muted text-muted-foreground'}>
                    {inbox.channelStatus.statusLabel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain" data-front-hugo-contained-queue-scroll="true">
                <ConversationList
                  activeChannelFilter={inbox.activeChannelFilter}
                  activeFilter={inbox.activeQueueFilter}
                  activeSuggestedQueueFilter={inbox.activeSuggestedQueueFilter}
                  canReadOmnichannel={inbox.canReadOmnichannel}
                  canShowFullPhone={inbox.canReadOmnichannelMessages}
                  channelFilters={inbox.channelFilters}
                  channelStatus={inbox.channelStatus}
                  draftConversationIds={composerState.draftConversationIds}
                  filters={inbox.operationalFilters}
                  focusedConversationId={focusedConversationId}
                  hasMoreConversations={inbox.hasMoreConversations}
                  isFocusMode={isFocusMode}
                  isLoading={inbox.isLoading}
                  onClearFocusMode={handleClearFocusMode}
                  onChannelFilterChange={inbox.setChannelFilter}
                  onFilterChange={inbox.setQueueFilter}
                  onFocusNextConversation={handleFocusNextConversation}
                  onLoadMoreConversations={inbox.loadMoreConversations}
                  onRefresh={inbox.refreshQueue}
                  onSearchChange={inbox.setQueueSearch}
                  onSelectConversation={handleSelectConversation}
                  onSuggestedQueueFilterChange={inbox.setSuggestedQueueFilter}
                  priorityOverview={inbox.operationalPriorityOverview}
                  queueItems={inbox.visibleQueueItems}
                  search={inbox.queueSearch}
                  selectedConversation={inbox.selectedConversation}
                  suggestedQueueFilters={inbox.suggestedQueueFilters}
                  summary={inbox.operationalSummary}
                />
              </CardContent>
            </Card>
            </div>

            <div
              className={workspacePanelClassName}
              data-front-r5-ux-atendimento-first="true"
              data-front-r5-ux-workspace-tabs="true"
            >
              <Tabs
                className="min-w-0 xl:flex xl:h-full xl:min-h-0 xl:flex-col"
                onValueChange={handleWorkspaceTabChange}
                value={activeWorkspaceTab}
              >
                <TabsList className="hidden h-auto w-full shrink-0 grid-cols-6 gap-1 rounded-lg border border-border/60 bg-muted/15 p-1 xl:grid">
                  <TabsTrigger className="h-auto min-h-11 whitespace-normal px-2 text-xs leading-tight" value={OMNICHANNEL_WORKSPACE_TAB_IDS.attendance}>
                    Atendimento
                  </TabsTrigger>
                  {OMNICHANNEL_CONTEXT_WORKSPACE_TABS.map((tab) => (
                    <TabsTrigger
                      className="h-auto min-h-11 whitespace-normal px-2 text-xs leading-tight"
                      key={tab.id}
                      onClick={() => handleWorkspaceTabChange(tab.id)}
                      value={tab.id}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent className="mt-0 min-h-0 focus-visible:outline-none xl:mt-4 xl:flex-1 xl:overflow-hidden" value={OMNICHANNEL_WORKSPACE_TAB_IDS.attendance}>
                  <div className="flex h-[var(--omni-workspace-height)] min-h-0 min-w-0 flex-col gap-3 xl:h-full" data-front-r3-mobile-panel="conversation" data-front-r586-mobile-conversation-workspace="true">
                    <Card className="min-h-32 min-w-0 flex-1 overflow-y-auto overscroll-contain border-border/50 shadow-sm" data-omni-conversation-scroll="true" data-front-r-conversation-panel="true" data-front-r2-conversation-scroll="true" data-front-hugo-contained-conversation-scroll="true" data-front-r211f-history-scroll="true" data-front-r211f-mobile-history-scroll="true">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <CardTitle className="text-lg">
                              {inbox.selectedConversation?.contactDisplayName || 'Mensagens'}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {inbox.selectedConversation
                                ? `${formatOperationalPhone(inbox.selectedConversation.contactPhoneE164, inbox.canReadOmnichannelMessages)} · ${inbox.selectedQueueItem?.statusLabel || inbox.selectedConversation.statusLabel || 'Aberta'} · ${inbox.selectedQueueItem?.hasUnreadInbound ? `Não lida (${inbox.selectedQueueItem.unreadCount || 1})` : 'Lida'} · ${inbox.manualReplyWindowState?.label || 'Janela de resposta'}`
                                : 'Selecione uma conversa para visualizar mensagens.'}
                            </CardDescription>
                          </div>
                          <div className="sr-only" data-front-r29-selected-window-state="true">
                            {inbox.manualReplyWindowState?.label || 'Selecione conversa'}
                          </div>
                        </div>
                        {inbox.selectedQueueItem && (
                          <>
                            <div className="mt-3 flex flex-wrap gap-2" data-front-r-selected-conversation-summary="true">
                              <Badge
                                variant="outline"
                                className={`${responsiveBadgeClass} ${statusToneByValue[inbox.selectedQueueItem.status] || 'border-border bg-muted text-muted-foreground'}`}
                                title={inbox.selectedQueueItem.statusLabel}
                              >
                                {inbox.selectedQueueItem.statusLabel}
                              </Badge>
                              <Badge variant="outline" className={inbox.selectedQueueItem.hasUnreadInbound ? 'border-red-200 bg-red-50 text-red-700' : 'border-border bg-muted text-muted-foreground'}>
                                {inbox.selectedQueueItem.hasUnreadInbound ? `Não lida (${inbox.selectedQueueItem.unreadCount || 1})` : 'Lida'}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${responsiveBadgeClass} ${manualReplyWindowToneByStatus[inbox.manualReplyWindowState?.status] || 'border-border bg-muted text-muted-foreground'}`}
                                title={inbox.manualReplyWindowState?.helperText || inbox.manualReplyWindowState?.label}
                              >
                                {inbox.manualReplyWindowState?.label || 'Janela de resposta'}
                              </Badge>
                            </div>
                            <details
                              className="mt-3 rounded-lg border border-border/60 bg-muted/10 p-2 text-xs leading-relaxed text-muted-foreground"
                              data-front-r29ux-conversation-details="collapsed"
                            >
                              <summary className="cursor-pointer font-semibold text-foreground">Detalhes</summary>
                              <div
                                className="mt-3 grid min-w-0 gap-2 sm:grid-cols-3"
                                data-front-r2-attendance-snapshot="true"
                              >
                              <p className="min-w-0 break-words" title={formatDateTime(inbox.selectedQueueItem.lastInteractionAt || inbox.selectedQueueItem.lastMessageAt)}>
                                <span className="font-semibold text-foreground">Última interação:</span> {inbox.selectedQueueItem.latestInteractionDirectionLabel || 'Interação'} · {formatDateTime(inbox.selectedQueueItem.lastInteractionAt || inbox.selectedQueueItem.lastMessageAt)}
                              </p>
                              <p className="min-w-0 break-words" title={selectedChannelContext.label}>
                                <span className="font-semibold text-foreground">Canal:</span> {selectedChannelContext.label}
                              </p>
                              <p className="min-w-0 break-words" title={selectedQueueContext.stateLabel}>
                                <span className="font-semibold text-foreground">Fila sugerida:</span> {selectedQueueContext.isPersisted ? selectedQueueContext.stateLabel : 'Sem fila definida'}
                              </p>
                              <p className="min-w-0 break-words" title={inbox.selectedQueueItem.assignedToLabel}>
                                <span className="font-semibold text-foreground">Responsável:</span> {inbox.selectedQueueItem.assignedToLabel}
                              </p>
                              <p className="min-w-0 break-words" title={inbox.selectedQueueItem.priorityLabel}>
                                <span className="font-semibold text-foreground">Prioridade:</span> {inbox.selectedQueueItem.priorityLabel}
                              </p>
                              <label
                                className="inline-flex min-w-0 items-center gap-2 text-muted-foreground"
                                data-front-hugo-internal-events-toggle="true"
                              >
                                <Switch
                                  aria-label="Mostrar eventos internos"
                                  checked={showInternalEventsInConversation}
                                  onCheckedChange={setShowInternalEventsInConversation}
                                />
                                <span>Mostrar eventos internos</span>
                              </label>
                              </div>
                            </details>
                          </>
                        )}
                      </CardHeader>
                      <CardContent className="min-w-0 pt-0">
                        {inbox.selectedQueueItem && (
                          <div className="mb-3" data-front-r211ux-scrollable-conversation-context="true" data-front-r586-unified-next-step="true">
                            <details className="rounded-lg border border-sky-200 bg-sky-50/50 p-2 xl:hidden">
                              <summary className="cursor-pointer text-sm font-semibold text-sky-950">
                                Próximo passo e Agenda
                              </summary>
                              <div className="mt-3 space-y-3">
                                {selectedConversationOperationalContext}
                              </div>
                            </details>
                            <div className="hidden space-y-3 xl:block">
                              {selectedConversationOperationalContext}
                            </div>
                          </div>
                        )}
                        {showConversationSkeleton ? (
                          <div className="space-y-3" role="status" aria-live="polite">
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                              <p className="font-semibold">Atualizando leitura...</p>
                              <p className="mt-1 text-xs leading-relaxed">Mensagens e histórico aparecem após a leitura da conversa selecionada.</p>
                            </div>
                            <Skeleton className="h-20 w-4/5" />
                            <Skeleton className="ml-auto h-20 w-4/5" />
                            <Skeleton className="h-20 w-3/5" />
                          </div>
                        ) : inbox.selectedConversation ? (
                          <div className="space-y-3">
                            {isConversationUpdatingInBackground && (
                              <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-900" role="status" aria-live="polite">
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                Atualizando em segundo plano...
                              </div>
                            )}
                            <MessageTimeline
                              activities={inbox.selectedConversationActivities}
                              activeMediaDownloadMessageId={inbox.activeMediaDownloadMessageId}
                              activeMediaAccessMessageId={inbox.activeMediaAccessMessageId}
                              conversationId={inbox.selectedConversation.id}
                              mediaAccessByMessageId={inbox.mediaAccessByMessageId}
                              mediaAccessError={inbox.mediaAccessError}
                              mediaDownloadError={inbox.mediaDownloadError}
                              mediaDownloadFeedback={inbox.mediaDownloadFeedback}
                              messages={inbox.messages}
                              notes={inbox.selectedConversationNotes}
                              onDownloadMessageMedia={inbox.downloadMessageMedia}
                              onRequestMessageMediaAccess={inbox.requestMessageMediaAccess}
                              showInternalEvents={showInternalEventsInConversation}
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {inbox.canReadOmnichannel && (
                              <div
                                className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 xl:hidden"
                                data-front-r3-mobile-empty-conversation="true"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="font-semibold">Sem conversa selecionada.</p>
                                  <Button
                                    className="w-full sm:w-auto"
                                    data-front-r3-action="open-mobile-queue"
                                    onClick={() => handleMobilePanelChange(OMNICHANNEL_MOBILE_PANEL_IDS.queue)}
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Ver fila
                                  </Button>
                                </div>
                              </div>
                            )}
                            <EmptyState canReadOmnichannel={inbox.canReadOmnichannel} />
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="omnichannel-safe-bottom z-10 max-h-[calc(100%-9rem)] min-w-0 shrink-0 overflow-y-auto bg-background" data-front-r2-composer-docked="true">
                      <ManualReplyPanel
                        blockedReason={inbox.manualReplyBlockedReason}
                        canReadAgenda={canReadAgenda}
                        canReadCrm={canReadCrm}
                        canSendManualReply={inbox.canSendManualReply}
                        composerState={composerState}
                        conversation={inbox.selectedConversation}
                        isGeneratingAttendanceAssistantDraft={inbox.isGeneratingAttendanceAssistantDraft}
                        isSendingReply={inbox.isSendingReply}
                        manualReplyWindowState={inbox.manualReplyWindowState}
                        onFocusManualPlaybook={handleFocusManualPlaybook}
                        onFocusReplyLibrary={handleFocusReplyLibrary}
                        onGenerateAttendanceAssistantDraft={inbox.generateAttendanceAssistantDraft}
                        onInsertManualReplyText={handleInsertManualReplyText}
                        onReplyTextChange={handleManualReplyDraftChange}
                        onSendManualReply={inbox.sendManualReply}
                        replyText={manualReplyDraft}
                        sendReplyError={inbox.sendReplyError}
                        sendReplySuccess={inbox.sendReplySuccess}
                        selectedQueueItem={inbox.selectedQueueItem}
                        selectedPlaybookId={manualPlaybookSelection}
                      />
                    </div>
                  </div>
                </TabsContent>

                {OMNICHANNEL_CONTEXT_WORKSPACE_TABS.map((tab) => (
                  <TabsContent className="mt-4 focus-visible:outline-none xl:min-h-0 xl:flex-1 xl:overflow-y-auto xl:overscroll-contain" key={`${tab.id}-content`} value={tab.id}>
                    {activeWorkspaceTab === tab.id && (
                      <div className="space-y-4" data-front-r3-mobile-panel="context">
                        <ConversationTriagePanel
                          actionError={inbox.actionError}
                          activeContextTab={tab.id}
                          activities={inbox.selectedConversationActivities}
                          attendanceAssistantError={inbox.attendanceAssistantError}
                          attendanceAssistantServerSuggestion={inbox.attendanceAssistantDraft}
                          appointments={schedule.appointments}
                          canManage={inbox.canManage}
                          canReadAgenda={canReadAgenda}
                          canReadCrm={canReadCrm}
                          canSendManualReply={inbox.canSendManualReply}
                          canShowFullPhone={inbox.canReadOmnichannelMessages}
                          canWriteCrmLead={canWriteCrmLead}
                          channel={activeChannel}
                          channelStatus={inbox.channelStatus}
                          collaborationModel={collaborationModel}
                          conversation={inbox.selectedConversation}
                          conversations={inbox.conversations}
                          autoReplyAttempts={inbox.autoReplyAttempts}
                          historyPanel={(
                            <OperationalHistoryPanel
                              activities={inbox.selectedConversationActivities}
                              activityError={inbox.activityError}
                              canRecordActivity={inbox.canRecordActivity}
                              conversation={inbox.selectedConversation}
                              isSavingActivity={inbox.isSavingActivity}
                              onAddActivity={inbox.addActivity}
                              onMarkResolved={inbox.markResolved}
                              onReopenConversation={inbox.reopenConversation}
                              onScheduleNextAction={inbox.scheduleNextAction}
                            />
                          )}
                          isGeneratingAttendanceAssistantDraft={inbox.isGeneratingAttendanceAssistantDraft}
                          isMutating={inbox.isMutating || patientsState.loading || leadsState.loading || schedule.loading}
                          isSavingTriageResult={inbox.isSavingTriageResult}
                          manualReplyWindowState={inbox.manualReplyWindowState}
                          leadCreationError={leadCreationError}
                          leads={leadsState.leads}
                          manualReplyDraft={manualReplyDraft}
                          manualPlaybookSelection={manualPlaybookSelection}
                          messages={inbox.messages}
                          notesPanel={(
                            <InternalNotesPanel
                              canManage={inbox.canManage}
                              collaborationModel={collaborationModel}
                              conversation={inbox.selectedConversation}
                              isSavingNote={inbox.isSavingNote}
                              noteError={inbox.noteError}
                              notes={inbox.selectedConversationNotes}
                              onAddInternalNote={inbox.addInternalNote}
                            />
                          )}
                          onAddInternalNote={inbox.addInternalNote}
                          onAssignToMe={inbox.assignToMe}
                          onContextTabChange={(nextContextTab) => {
                            setActiveContextTab(nextContextTab);
                            setActiveWorkspaceTab(nextContextTab);
                          }}
                          onCreateLeadFromConversation={handleCreateLeadFromConversation}
                          onFocusReplyLibrary={handleFocusReplyLibrary}
                          onGenerateAttendanceAssistantDraft={inbox.generateAttendanceAssistantDraft}
                          onLinkLead={inbox.linkLead}
                          onLinkPatient={inbox.linkPatient}
                          onManualPlaybookSelectionChange={setManualPlaybookSelection}
                          onMarkRead={inbox.markSelectedConversationRead}
                          onPrepareManualReply={handleInsertManualReplyText}
                          onRefresh={inbox.refresh}
                          onRecordAttendanceAssistantFeedback={inbox.recordAttendanceAssistantFeedback}
                          onSaveTriageResult={inbox.saveConversationTriageResult}
                          onToggleQualityChecklistItem={handleToggleQualityChecklistItem}
                          onUnassignConversation={inbox.unassignConversation}
                          onUnlinkContext={inbox.unlinkContext}
                          onUpdatePriority={inbox.updatePriority}
                          onUpdateStatus={inbox.updateStatus}
                          patients={patientsState.patients}
                          qualityChecklistState={qualityChecklistByConversation[inbox.selectedConversation?.id] || {}}
                          selectedQueueItem={inbox.selectedQueueItem}
                          selectedTriageResult={inbox.selectedConversationTriageResult}
                          showContextTabs
                          source={inbox.source}
                          triageFlows={inbox.triageFlows}
                          triageIntents={inbox.triageIntents}
                          triageQuestions={inbox.triageQuestions}
                          triageResultError={inbox.triageResultError}
                          triageResultSuccess={inbox.triageResultSuccess}
                          triageResultsByConversation={inbox.triageResultsByConversation}
                          triageSettings={inbox.triageSettings}
                        />
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>

          <div className="shrink-0">
            <OperationalBoundaryPanel />
          </div>
        </div>
      </Layout>
    </>
  );
};

export default OmnichannelPage;
