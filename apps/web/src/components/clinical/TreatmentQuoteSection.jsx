import React, { useEffect, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, CircleDollarSign, FileText, Link2, Loader2, Plus, RefreshCw, RotateCw, ShieldOff, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast.js';
import { useTreatmentQuotes } from '@/hooks/useTreatmentQuotes.js';
import { useTreatmentQuoteSharing } from '@/hooks/useTreatmentQuoteSharing.js';
import {
  ODONTOGRAM_SURFACE_LABELS,
  TREATMENT_QUOTE_ACCEPTANCE_CHANNEL_LABELS,
  TREATMENT_QUOTE_CANCELLATION_REASON_LABELS,
  TREATMENT_QUOTE_DECLINE_REASON_LABELS,
  TREATMENT_QUOTE_STATUS_LABELS,
  TREATMENT_QUOTE_SHARE_STATUS_LABELS,
  buildTreatmentQuoteShareUrl,
  formatTreatmentQuoteMoney,
} from '@/repositories/index.js';
import TreatmentQuoteAcceptModal from './TreatmentQuoteAcceptModal.jsx';
import TreatmentQuoteCancelModal from './TreatmentQuoteCancelModal.jsx';
import TreatmentQuoteDeclineModal from './TreatmentQuoteDeclineModal.jsx';
import TreatmentQuoteIssueModal from './TreatmentQuoteIssueModal.jsx';
import TreatmentQuoteShareLinkModal from './TreatmentQuoteShareLinkModal.jsx';

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`))
  : 'Sem validade definida';
const statusVariant = (status) => status === 'accepted' ? 'default' : status === 'issued' ? 'outline' : 'secondary';

const QuoteCard = ({ quote, shareStatus, canManage, mutationInFlight, onAccept, onDecline, onCancel, onCreateLink, onReissueLink, onRevokeLink }) => {
  const publicDecision = shareStatus?.quoteDecisionSource === 'public_link';
  let decision = null;
  if (quote.acceptedAt) {
    decision = publicDecision
      ? `Aceite digital registrado pelo link seguro em ${formatDateTime(quote.acceptedAt)}`
      : `Aceito ${TREATMENT_QUOTE_ACCEPTANCE_CHANNEL_LABELS[quote.acceptanceChannel]?.toLowerCase() || ''} por ${quote.acceptedByDisplayName} em ${formatDateTime(quote.acceptedAt)}`;
  } else if (quote.declinedAt) {
    decision = publicDecision
      ? `Recusa digital registrada pelo link seguro em ${formatDateTime(quote.declinedAt)} • ${TREATMENT_QUOTE_DECLINE_REASON_LABELS[quote.declineReasonCode]}`
      : `Recusado por ${quote.declinedByDisplayName} em ${formatDateTime(quote.declinedAt)} • ${TREATMENT_QUOTE_DECLINE_REASON_LABELS[quote.declineReasonCode]}`;
  } else if (quote.cancelledAt) {
    decision = `Cancelado por ${quote.cancelledByDisplayName} em ${formatDateTime(quote.cancelledAt)} • ${TREATMENT_QUOTE_CANCELLATION_REASON_LABELS[quote.cancellationReasonCode]}`;
  }
  const linkStatus = shareStatus?.status || 'none';
  return (
    <Card className="border-border/60" data-treatment-quote data-treatment-quote-status={quote.status} data-treatment-quote-version={quote.versionNumber}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold">Orçamento v{quote.versionNumber}</h4><Badge variant={statusVariant(quote.status)}>{TREATMENT_QUOTE_STATUS_LABELS[quote.status]}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Emitido por {quote.issuedByDisplayName} em {formatDateTime(quote.issuedAt)} • {formatDate(quote.validUntil)}</p></div>
          <p className="text-lg font-semibold">{formatTreatmentQuoteMoney(quote.totalCents)}</p>
        </div>
        <div className="divide-y rounded-lg border">
          {quote.items.map((item) => <div key={item.id} className="flex flex-col justify-between gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center"><span>{item.serviceLabel}<span className="ml-2 text-xs text-muted-foreground">{item.toothCode ? `Dente ${item.toothCode}${item.surfaceCode ? ` • ${ODONTOGRAM_SURFACE_LABELS[item.surfaceCode]}` : ''}` : 'Sem referência odontográfica'}</span></span><strong>{formatTreatmentQuoteMoney(item.unitPriceCents)}</strong></div>)}
        </div>
        {decision && <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{decision}</p>}
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between" data-treatment-quote-share-status={linkStatus}>
          <div><p className="text-sm font-medium">{TREATMENT_QUOTE_SHARE_STATUS_LABELS[linkStatus] || 'Sem link'}</p><p className="text-xs text-muted-foreground">{shareStatus?.expiresAt ? `Válido até ${formatDateTime(shareStatus.expiresAt)}` : 'Nenhum token recuperável está armazenado.'}</p></div>
          {quote.status === 'issued' && canManage && <div className="flex flex-wrap gap-2" data-treatment-quote-share-actions>
            {linkStatus === 'none' && <Button size="sm" variant="outline" onClick={() => onCreateLink(quote)} disabled={mutationInFlight} data-treatment-quote-share-create><Link2 className="mr-2 h-4 w-4" />Gerar link seguro</Button>}
            {['active', 'expired', 'revoked'].includes(linkStatus) && <Button size="sm" variant="outline" onClick={() => onReissueLink(quote)} disabled={mutationInFlight} data-treatment-quote-share-reissue><RotateCw className="mr-2 h-4 w-4" />Reemitir link</Button>}
            {linkStatus === 'active' && <Button size="sm" variant="outline" onClick={() => onRevokeLink(quote)} disabled={mutationInFlight} data-treatment-quote-share-revoke><ShieldOff className="mr-2 h-4 w-4" />Revogar link</Button>}
          </div>}
        </div>
        {quote.status === 'issued' && canManage && <div className="flex flex-wrap gap-2" data-treatment-quote-write-actions><Button size="sm" onClick={() => onAccept(quote)} disabled={mutationInFlight}><CheckCircle2 className="mr-2 h-4 w-4" />Registrar aceite</Button><Button size="sm" variant="outline" onClick={() => onDecline(quote)} disabled={mutationInFlight}><XCircle className="mr-2 h-4 w-4" />Registrar recusa</Button><Button size="sm" variant="outline" onClick={() => onCancel(quote)} disabled={mutationInFlight}><Ban className="mr-2 h-4 w-4" />Cancelar orçamento</Button></div>}
      </CardContent>
    </Card>
  );
};

const TreatmentQuoteSection = ({ patient, activePlan, onQuoteChanged }) => {
  const { toast } = useToast();
  const {
    quotes, issuedQuote, acceptedQuote, candidates, loading, error, canRead, canManage,
    mutationInFlight, scopeKey, refresh, issueQuote, acceptQuote, declineQuote, cancelQuote,
  } = useTreatmentQuotes(patient?.id || '', activePlan);
  const {
    statusByQuote, loading: shareLoading, error: shareError,
    mutationInFlight: shareMutationInFlight,
    createShareLink, revokeShareLink, reissueShareLink,
  } = useTreatmentQuoteSharing(patient?.id || '', quotes, canRead, canManage);
  const [issueOpen, setIssueOpen] = useState(false);
  const [acceptTarget, setAcceptTarget] = useState(null);
  const [declineTarget, setDeclineTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [oneTimeShare, setOneTimeShare] = useState(null);

  useEffect(() => {
    setIssueOpen(false); setAcceptTarget(null); setDeclineTarget(null); setCancelTarget(null); setOneTimeShare(null);
  }, [patient?.id, scopeKey]);

  const showOneTimeShare = (result) => {
    const shareUrl = buildTreatmentQuoteShareUrl(result?.oneTimeToken);
    if (!shareUrl) throw new Error('SS_TREATMENT_SHARE_TOKEN_UNAVAILABLE');
    setOneTimeShare({ shareUrl, expiresAt: result.expiresAt });
  };
  const handleCreateLink = async (quote) => {
    try {
      const result = await createShareLink({ quoteId: quote.id, requestId: crypto.randomUUID() });
      showOneTimeShare(result);
      toast({ title: 'Link seguro gerado.', description: 'Copie o link na janela de exibição única. Nenhum envio foi realizado.' });
    } catch (shareMutationError) {
      toast({ title: 'Não foi possível gerar o link.', description: shareMutationError?.userMessage || 'Atualize a tela e tente novamente.', variant: 'destructive' });
    }
  };
  const handleReissueLink = async (quote) => {
    if (!window.confirm('Reemitir este link? O link anterior deixará de funcionar e o histórico será preservado.')) return;
    try {
      const result = await reissueShareLink({ quoteId: quote.id, requestId: crypto.randomUUID() });
      showOneTimeShare(result);
      toast({ title: 'Novo link gerado.', description: 'O link anterior não pode mais ser utilizado.' });
    } catch (shareMutationError) {
      toast({ title: 'Não foi possível reemitir o link.', description: shareMutationError?.userMessage || 'Atualize a tela e tente novamente.', variant: 'destructive' });
    }
  };
  const handleRevokeLink = async (quote) => {
    if (!window.confirm('Revogar este link seguro? Ele deixará de funcionar e o orçamento não será alterado.')) return;
    try {
      await revokeShareLink({ quoteId: quote.id, requestId: crypto.randomUUID() });
      toast({ title: 'Link revogado.', description: 'O histórico foi preservado e nenhuma decisão foi registrada.' });
    } catch (shareMutationError) {
      toast({ title: 'Não foi possível revogar o link.', description: shareMutationError?.userMessage || 'Atualize a tela e tente novamente.', variant: 'destructive' });
    }
  };
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(oneTimeShare?.shareUrl || '');
      toast({ title: 'Link copiado.', description: 'Compartilhe manualmente somente com a pessoa autorizada.' });
    } catch {
      toast({ title: 'Não foi possível copiar.', description: 'Selecione o link e copie manualmente.' });
    }
  };

  const handleIssue = async (input) => {
    const result = await issueQuote(input);
    await onQuoteChanged?.();
    toast({ title: `Orçamento v${result?.versionNumber || ''} emitido.`, description: 'Os valores foram preservados como snapshots internos, sem gerar cobrança.' });
    return result;
  };
  const handleAccept = async ({ quoteId, requestId, code }) => {
    const result = await acceptQuote({ quoteId, requestId, acceptanceChannel: code });
    await onQuoteChanged?.();
    toast({ title: 'Aceite manual registrado.', description: 'A decisão comunicada à clínica foi preservada; nenhuma assinatura ou cobrança foi criada.' });
    setAcceptTarget(null); return result;
  };
  const handleDecline = async ({ quoteId, requestId, code }) => {
    const result = await declineQuote({ quoteId, requestId, declineReasonCode: code });
    await onQuoteChanged?.();
    toast({ title: 'Recusa registrada.', description: 'A versão foi encerrada e permanece integralmente no histórico.' });
    setDeclineTarget(null); return result;
  };
  const handleCancel = async ({ quoteId, requestId, code }) => {
    const result = await cancelQuote({ quoteId, requestId, cancellationReasonCode: code });
    await onQuoteChanged?.();
    toast({ title: 'Orçamento cancelado.', description: 'A versão foi preservada e não movimentou o Financeiro.' });
    setCancelTarget(null); return result;
  };

  if (!canRead) return null;
  return (
    <section className="space-y-4 rounded-xl border p-4 sm:p-5" data-treatment-quote-section data-treatment-quote-access={canManage ? 'manage' : 'read-only'}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><p className="flex items-center gap-2 font-semibold"><CircleDollarSign className="h-5 w-5 text-emerald-600" />Orçamentos</p><p className="mt-1 text-sm text-muted-foreground">Versões internas em BRL ligadas aos itens planejados. O aceite é um registro manual da clínica.</p></div>
        {canManage && activePlan && !issuedQuote && !acceptedQuote && candidates.length > 0 && <Button onClick={() => setIssueOpen(true)} disabled={mutationInFlight} data-treatment-quote-issue-action><Plus className="mr-2 h-4 w-4" />Gerar orçamento</Button>}
      </div>

      {loading && <div className="flex items-center gap-2 rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando orçamentos...</div>}
      {(error || shareError) && <div className="flex flex-col justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" />{error || shareError}</p><Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div>}
      {!loading && !error && quotes.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center"><FileText className="mx-auto mb-2 h-7 w-7 text-muted-foreground" /><p className="text-sm font-medium">Nenhum orçamento registrado.</p><p className="mt-1 text-xs text-muted-foreground">Crie uma versão somente após revisar os itens planejados e seus valores.</p></div>}
      {!loading && !error && quotes.map((quote) => <QuoteCard key={quote.id} quote={quote} shareStatus={statusByQuote[quote.id]} canManage={canManage} mutationInFlight={mutationInFlight || shareMutationInFlight || shareLoading} onAccept={setAcceptTarget} onDecline={setDeclineTarget} onCancel={setCancelTarget} onCreateLink={handleCreateLink} onReissueLink={handleReissueLink} onRevokeLink={handleRevokeLink} />)}
      {!canManage && <div className="rounded-lg bg-muted/30 p-3 text-sm text-muted-foreground" data-treatment-quote-read-only>Modo somente leitura: os orçamentos podem ser consultados, mas emissão e decisões não estão disponíveis.</div>}
      {canManage && activePlan && !loading && candidates.length === 0 && !acceptedQuote && <p className="text-xs text-muted-foreground">Não há itens planejados elegíveis para uma nova versão.</p>}
      {acceptedQuote && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Este plano possui orçamento aceito. Novas versões ficam bloqueadas; os itens clínicos continuam com lifecycle próprio.</p>}

      {canManage && <>
        <TreatmentQuoteIssueModal open={issueOpen} onOpenChange={setIssueOpen} patientName={patient.name} treatmentPlanId={activePlan?.id || ''} candidates={candidates} onSubmit={handleIssue} isSaving={mutationInFlight} />
        <TreatmentQuoteAcceptModal open={Boolean(acceptTarget)} onOpenChange={(next) => !next && setAcceptTarget(null)} quote={acceptTarget} onSubmit={handleAccept} isSaving={mutationInFlight} />
        <TreatmentQuoteDeclineModal open={Boolean(declineTarget)} onOpenChange={(next) => !next && setDeclineTarget(null)} quote={declineTarget} onSubmit={handleDecline} isSaving={mutationInFlight} />
        <TreatmentQuoteCancelModal open={Boolean(cancelTarget)} onOpenChange={(next) => !next && setCancelTarget(null)} quote={cancelTarget} onSubmit={handleCancel} isSaving={mutationInFlight} />
        <TreatmentQuoteShareLinkModal open={Boolean(oneTimeShare)} onOpenChange={(next) => !next && setOneTimeShare(null)} shareUrl={oneTimeShare?.shareUrl || ''} expiresAt={oneTimeShare?.expiresAt || null} onCopy={handleCopyLink} />
      </>}
    </section>
  );
};

export default TreatmentQuoteSection;
