import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ban, CalendarPlus, CheckCircle2, ClipboardCheck, ClipboardList, ExternalLink, Loader2, Plus, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast.js';
import { useTreatmentPlan } from '@/hooks/useTreatmentPlan.js';
import { useTreatmentPlanScheduling } from '@/hooks/useTreatmentPlanScheduling.js';
import { useTreatmentExecutionSessions } from '@/hooks/useTreatmentExecutionSessions.js';
import { useSchedule } from '@/hooks/useSchedule.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { usePatientClinicalProtocol } from '@/hooks/usePatientClinicalProtocol.js';
import {
  ODONTOGRAM_SURFACE_LABELS,
  TREATMENT_EXECUTION_OUTCOME_LABELS,
  TREATMENT_PLAN_CANCELLATION_REASON_LABELS,
  TREATMENT_PLAN_ITEM_STATUS_LABELS,
  TREATMENT_PLAN_PRIORITY_LABELS,
  TREATMENT_PLAN_STATUS_LABELS,
} from '@/repositories/index.js';
import TreatmentPlanCancelModal from './TreatmentPlanCancelModal.jsx';
import TreatmentPlanCompleteModal from './TreatmentPlanCompleteModal.jsx';
import TreatmentPlanItemModal from './TreatmentPlanItemModal.jsx';
import TreatmentPlanAppointmentModal from './TreatmentPlanAppointmentModal.jsx';
import TreatmentExecutionSessionModal from './TreatmentExecutionSessionModal.jsx';
import TreatmentQuoteSection from './TreatmentQuoteSection.jsx';
import PatientClinicalProtocolSection from './PatientClinicalProtocolSection.jsx';
import ClinicalProtocolSessionModal from './ClinicalProtocolSessionModal.jsx';
import ClinicalProtocolVisitModal from './ClinicalProtocolVisitModal.jsx';

const formatDateTime = (value) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

const statusVariant = (status) => status === 'completed' ? 'default' : status === 'cancelled' ? 'secondary' : 'outline';

const ItemCard = ({
  appointmentLinks = [],
  canManage,
  eligibility,
  item,
  mutationInFlight,
  onCancel,
  onComplete,
  onOpenClinicalTimeline,
  onOpenAgenda,
  onRecordSession,
  onSchedule,
  sessionInFlight,
  sessionsByAppointmentLink = {},
  sessionsByItem = {},
  canManageSessions,
  schedulingInFlight,
  protocolManaged,
}) => {
  const activeLink = appointmentLinks.find((link) => ['Agendada', 'Pendente', 'Confirmada', 'Em atendimento'].includes(link.status));
  const finalizedLinks = appointmentLinks.filter((link) => link.status === 'Finalizada');
  const cancelledLinks = appointmentLinks.filter((link) => link.status === 'Cancelada');
  const itemSessions = sessionsByItem[item.id] || [];
  const undocumentedFinalizedLink = finalizedLinks.find((link) => !sessionsByAppointmentLink[link.linkId]);
  const canSchedule = !protocolManaged && item.status === 'planned' && eligibility?.canSchedule && !activeLink;
  const scheduleLabel = itemSessions.length > 0 ? 'Agendar próxima sessão'
    : cancelledLinks.length > 0 ? 'Agendar novamente' : 'Agendar procedimento';
  return (
  <Card className="border-border/60" data-treatment-plan-item={item.id} data-treatment-plan-item-status={item.status}>
    <CardContent className="p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">#{item.sequenceNumber}</Badge>
            <Badge variant={statusVariant(item.status)}>{TREATMENT_PLAN_ITEM_STATUS_LABELS[item.status]}</Badge>
            {item.priority === 'priority' && <Badge className="border-amber-200 bg-amber-50 text-amber-800" variant="outline">Prioritário</Badge>}
          </div>
          <p className="mt-3 font-semibold text-foreground">{item.serviceName}</p>
          <dl className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <div><dt className="inline">Referência: </dt><dd className="inline text-foreground">{item.toothCode ? `Tooth ${item.toothCode}${item.surfaceCode ? ` • ${ODONTOGRAM_SURFACE_LABELS[item.surfaceCode]}` : ''}` : 'Não se aplica'}</dd></div>
            <div><dt className="inline">Priority: </dt><dd className="inline text-foreground">{TREATMENT_PLAN_PRIORITY_LABELS[item.priority]}</dd></div>
            <div><dt className="inline">Registrado por: </dt><dd className="inline text-foreground">{item.authorDisplayName}</dd></div>
            <div><dt className="inline">Data: </dt><dd className="inline text-foreground">{formatDateTime(item.createdAt)}</dd></div>
            {item.completedAt && <div><dt className="inline">Concluído em: </dt><dd className="inline text-foreground">{formatDateTime(item.completedAt)}</dd></div>}
            {item.cancelledAt && <div><dt className="inline">Cancelado em: </dt><dd className="inline text-foreground">{formatDateTime(item.cancelledAt)}</dd></div>}
            {item.cancellationReasonCode && <div className="sm:col-span-2"><dt className="inline">Motivo: </dt><dd className="inline text-foreground">{TREATMENT_PLAN_CANCELLATION_REASON_LABELS[item.cancellationReasonCode]}</dd></div>}
          </dl>
        </div>
        {item.status === 'planned' && canManage && !protocolManaged && (
          <div className="flex shrink-0 flex-wrap gap-2" data-treatment-plan-write-actions>
            <Button size="sm" onClick={() => onComplete(item)} disabled={mutationInFlight || schedulingInFlight}><CheckCircle2 className="mr-2 h-4 w-4" />Marcar como concluído</Button>
            <Button size="sm" variant="outline" onClick={() => onCancel(item)} disabled={mutationInFlight || schedulingInFlight}><Ban className="mr-2 h-4 w-4" />Cancelar item</Button>
          </div>
        )}
      </div>
      <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-3" data-treatment-scheduling-item={item.id} data-treatment-execution-sessions-item={item.id}>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sessões clínicas</p>
            {activeLink && <p className="mt-1 text-sm text-foreground">{formatDateTime(activeLink.startsAt)} · {activeLink.status}</p>}
            {!activeLink && undocumentedFinalizedLink && <p className="mt-1 text-sm font-medium text-amber-800">Consulta finalizada em {formatDateTime(undocumentedFinalizedLink.startsAt)}. Registre a sessão clínica antes de agendar outra sessão.</p>}
            {!activeLink && !undocumentedFinalizedLink && itemSessions.length > 0 && <p className="mt-1 text-sm text-foreground">{itemSessions.length} sessão{itemSessions.length === 1 ? '' : 'ões'} registrada{itemSessions.length === 1 ? '' : 's'} neste procedimento.</p>}
            {!activeLink && !undocumentedFinalizedLink && itemSessions.length === 0 && cancelledLinks.length > 0 && <p className="mt-1 text-sm text-muted-foreground">Última consulta cancelada em {formatDateTime(cancelledLinks[0].startsAt)}. O vínculo permanece no histórico.</p>}
            {!activeLink && !undocumentedFinalizedLink && eligibility?.code === 'accepted_quote_required' && (
              <><p className="mt-1 text-sm font-medium text-amber-800">Aguardando aceite do orçamento</p><p className="mt-1 text-xs text-muted-foreground">O agendamento pelo plano fica disponível após o registro de aceite do orçamento.</p></>
            )}
            {!activeLink && !undocumentedFinalizedLink && eligibility?.code === 'accepted_quote_item_required' && <p className="mt-1 text-xs text-muted-foreground">O orçamento aceito não inclui este procedimento.</p>}
            {!activeLink && item.status !== 'planned' && <p className="mt-1 text-xs text-muted-foreground">Item encerrado: nenhuma nova consulta pode ser criada por este atalho.</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {activeLink && <Button size="sm" variant="outline" onClick={() => onOpenAgenda(activeLink)} data-treatment-scheduling-open-agenda><ExternalLink className="mr-2 h-4 w-4" />Ver na Agenda</Button>}
            {undocumentedFinalizedLink && canManageSessions && !protocolManaged && item.status === 'planned' && (
              <Button size="sm" onClick={() => onRecordSession(item, undocumentedFinalizedLink)} disabled={mutationInFlight || schedulingInFlight || sessionInFlight} data-treatment-session-record-action><ClipboardCheck className="mr-2 h-4 w-4" />Registrar sessão</Button>
            )}
            {canSchedule && <Button size="sm" variant="outline" onClick={() => onSchedule(item)} disabled={mutationInFlight || schedulingInFlight} data-treatment-scheduling-action><CalendarPlus className="mr-2 h-4 w-4" />{scheduleLabel}</Button>}
          </div>
        </div>
        {appointmentLinks.length > 0 && (
          <div className="mt-3 space-y-2 border-t pt-2" data-treatment-scheduling-history data-treatment-session-history>
            {appointmentLinks.map((link) => {
              const session = sessionsByAppointmentLink[link.linkId];
              return (
                <div key={link.linkId || link.id} className="flex flex-col justify-between gap-2 rounded-md bg-background/70 px-3 py-2 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs text-foreground">{link.status} · {formatDateTime(link.startsAt)} · {link.professional}</p>
                    {session && <p className="mt-1 text-xs text-muted-foreground">{TREATMENT_EXECUTION_OUTCOME_LABELS[session.outcomeCode]} · {session.recordedByDisplayName} · {formatDateTime(session.performedAt)}</p>}
                    {link.status === 'Finalizada' && !session && <p className="mt-1 text-xs text-amber-800">Sessão clínica ainda não registrada.</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" variant="ghost" onClick={() => onOpenAgenda(link)}><ExternalLink className="mr-2 h-3.5 w-3.5" />Ver na Agenda</Button>
                    {session && onOpenClinicalTimeline && <Button size="sm" variant="ghost" onClick={onOpenClinicalTimeline} data-treatment-session-open-clinical>Ver evolução clínica</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
  );
};

const PlanSection = ({ appointmentLinksByItem, eligibilityByItem, plan, title, canManage, mutationInFlight, onComplete, onCancel, onOpenClinicalTimeline, onOpenAgenda, onRecordSession, onSchedule, schedulingInFlightId, sessionInFlightId, sessionsByAppointmentLink, sessionsByItem, canManageSessions, protocolManaged = false }) => {
  if (!plan) return null;
  const planned = plan.items.filter((item) => item.status === 'planned').length;
  const completed = plan.items.filter((item) => item.status === 'completed').length;
  const cancelled = plan.items.filter((item) => item.status === 'cancelled').length;
  return (
    <section className="space-y-4" data-treatment-plan={plan.id} data-treatment-plan-status={plan.status}>
      <div className="flex flex-col justify-between gap-3 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{title}</h3><Badge variant={statusVariant(plan.status)}>{TREATMENT_PLAN_STATUS_LABELS[plan.status]}</Badge></div>
          <p className="mt-1 text-xs text-muted-foreground">Criado em {formatDateTime(plan.createdAt)}</p>
        </div>
        <p className="text-sm text-muted-foreground">{planned} planned • {completed} completed • {cancelled} canceled</p>
      </div>
      {plan.items.map((item) => <ItemCard key={item.id} item={item} appointmentLinks={appointmentLinksByItem[item.id] || []} canManage={canManage} eligibility={eligibilityByItem[item.id]} mutationInFlight={mutationInFlight} onComplete={onComplete} onCancel={onCancel} onOpenClinicalTimeline={onOpenClinicalTimeline} onOpenAgenda={onOpenAgenda} onRecordSession={onRecordSession} onSchedule={onSchedule} schedulingInFlight={schedulingInFlightId === item.id} sessionInFlight={Boolean(sessionInFlightId)} sessionsByAppointmentLink={sessionsByAppointmentLink} sessionsByItem={sessionsByItem} canManageSessions={canManageSessions} protocolManaged={protocolManaged} />)}
    </section>
  );
};

const TreatmentPlanPanel = ({ patient, onClinicalTimelineChanged, onOpenClinicalTimeline }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentTenant, isSupabaseMode, hasPermission } = useAuth();
  const canOpenProtocolLibrary = isSupabaseMode
    && currentTenant?.slug === 'tenant_harbor'
    && hasPermission('treatment_protocols.read');
  const {
    activePlan, historicalPlans, eligibleServices, loading, error, canRead, canManage,
    mutationInFlight, scopeKey, refresh, appendItem, completeItem, cancelItem,
  } = useTreatmentPlan(patient?.id || '');
  const protocolState = usePatientClinicalProtocol(activePlan?.id || '');
  const protocolManaged = protocolState.canRead && (
    protocolState.loading || Boolean(protocolState.error) || Boolean(protocolState.data.protocol)
  );
  const scheduling = useTreatmentPlanScheduling(patient?.id || '');
  const executionSessions = useTreatmentExecutionSessions(
    patient?.id || '',
    scheduling.appointmentLinks,
    scheduling.scheduleEligibilityByItem,
  );
  const schedule = useSchedule({ enabled: scheduling.canManage || protocolState.canManage });
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [schedulingTarget, setSchedulingTarget] = useState(null);
  const [sessionTarget, setSessionTarget] = useState(null);
  const [guidedSessionTarget, setGuidedSessionTarget] = useState(null);
  const [groupedVisitTarget, setGroupedVisitTarget] = useState(null);

  useEffect(() => {
    setItemModalOpen(false);
    setCompleteTarget(null);
    setCancelTarget(null);
    setSchedulingTarget(null);
    setSessionTarget(null);
    setGuidedSessionTarget(null);
    setGroupedVisitTarget(null);
    schedule.clearSuggestedSlots();
  }, [patient?.id, scopeKey, scheduling.scopeKey, executionSessions.scopeKey, schedule.clearSuggestedSlots]);

  const suggestedSequence = useMemo(() => {
    const sequences = activePlan?.items.map((item) => item.sequenceNumber) || [];
    return Math.min(999, Math.max(0, ...sequences) + 1);
  }, [activePlan]);

  const handleAppend = async (input) => {
    const result = await appendItem(input);
    await scheduling.refreshLinks();
    toast({ title: 'Procedimento adicionado ao plano.', description: 'O plano foi atualizado sem gerar cobrança ou agendamento.' });
    return result;
  };
  const handleComplete = async (input) => {
    const result = await completeItem(input);
    await scheduling.refreshLinks();
    toast({ title: 'Item concluído.', description: 'O item foi preservado no histórico do plano.' });
    setCompleteTarget(null);
    return result;
  };
  const handleCancel = async (input) => {
    const result = await cancelItem(input);
    await scheduling.refreshLinks();
    toast({ title: 'Item cancelado.', description: 'O motivo e o registro original permanecem no histórico.' });
    setCancelTarget(null);
    return result;
  };
  const handleSchedule = async (input) => {
    const result = await scheduling.scheduleItem(input);
    await executionSessions.refreshSessions();
    setSchedulingTarget(null);
    schedule.clearSuggestedSlots();
    toast({ title: 'Consulta criada na Agenda.' });
    return result;
  };
  const handleRecordSession = async (input) => {
    const result = await executionSessions.recordSession(input);
    await Promise.all([
      scheduling.refreshLinks(),
      Promise.resolve(onClinicalTimelineChanged?.()),
    ]);
    setSessionTarget(null);
    toast({ title: 'Sessão clínica registrada.', description: 'A evolução foi finalizada e vinculada à consulta sem concluir o item do plano.' });
    return result;
  };
  const handleGuidedSessionRecorded = async () => {
    await Promise.all([
      refresh(),
      protocolState.refresh(),
      scheduling.refreshLinks(),
      executionSessions.refreshSessions(),
      Promise.resolve(onClinicalTimelineChanged?.()),
    ]);
    toast({ title: 'Sessão clínica registrada.', description: 'A evolução e o resultado da etapa foram preservados no Prontuário.' });
  };

  if (!canRead) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Seu perfil não possui acesso ao plano de tratamento deste tenant.</div>;
  if (loading) return <div className="flex items-center justify-center gap-3 rounded-xl border p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando plano de tratamento...</div>;
  if (error) return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{error}</p>
      <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
    </div>
  );

  return (
    <div className="space-y-6" data-treatment-plan-panel data-treatment-plan-access={canManage ? 'manage' : 'read-only'}>
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="flex items-center gap-2 font-semibold text-blue-950"><ClipboardList className="h-5 w-5" />Plano clínico estruturado</p>
          <p className="mt-1 text-sm text-blue-900">Procedimentos clínicos manuais ligados a Serviços, orçamentos aceitos, Agenda e evoluções append-only. Nenhuma sessão conclui o item ou gera cobrança automaticamente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canOpenProtocolLibrary && <Button variant="outline" onClick={() => navigate('/prontuario/protocolos')}>Modelos de protocolo</Button>}
          {canManage && <Button onClick={() => setItemModalOpen(true)} disabled={mutationInFlight || eligibleServices.length === 0 || protocolManaged} data-treatment-plan-add-action><Plus className="mr-2 h-4 w-4" />Adicionar procedimento</Button>}
        </div>
      </div>

      {scheduling.error && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center" data-treatment-scheduling-error>
          <p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{scheduling.error}</p>
          <Button variant="outline" size="sm" onClick={scheduling.refreshLinks}><RefreshCw className="mr-2 h-4 w-4" />Atualizar vínculos</Button>
        </div>
      )}

      {(executionSessions.error || executionSessions.sessionError) && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center" data-treatment-session-error>
          <p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{executionSessions.sessionError || executionSessions.error}</p>
          <Button variant="outline" size="sm" onClick={executionSessions.refreshSessions}><RefreshCw className="mr-2 h-4 w-4" />Atualizar sessões</Button>
        </div>
      )}

      {!activePlan && historicalPlans.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
          <p className="font-medium">Nenhum plano de tratamento registrado.</p>
          <p className="mt-1 text-sm text-muted-foreground">O plano será criado de forma atômica no primeiro item autorizado.</p>
        </div>
      )}

      {activePlan && <PatientClinicalProtocolSection plan={activePlan} protocolState={protocolState}
        appointmentLinksByItem={executionSessions.linkedAppointmentsByItem}
        sessionsByAppointmentLink={executionSessions.sessionsByAppointmentLink}
        professionals={schedule.professionals}
        onPlanChanged={refresh}
        onDocumentSession={(step, item, appointmentLink) => setGuidedSessionTarget({ step, item, appointmentLink })}
        onDocumentVisit={(visit, items) => setGroupedVisitTarget({ visit, items })} />}
      <PlanSection appointmentLinksByItem={executionSessions.linkedAppointmentsByItem} eligibilityByItem={scheduling.scheduleEligibilityByItem} plan={activePlan} title="Plano atual" canManage={canManage} mutationInFlight={mutationInFlight} onComplete={setCompleteTarget} onCancel={setCancelTarget} onOpenClinicalTimeline={onOpenClinicalTimeline} onOpenAgenda={(link) => navigate(link.agendaPath)} onRecordSession={(item, appointmentLink) => setSessionTarget({ item, appointmentLink })} onSchedule={setSchedulingTarget} schedulingInFlightId={scheduling.scheduleInFlightId} sessionInFlightId={executionSessions.sessionInFlightId} sessionsByAppointmentLink={executionSessions.sessionsByAppointmentLink} sessionsByItem={executionSessions.sessionsByItem} canManageSessions={executionSessions.canManage} protocolManaged={protocolManaged} />

      <TreatmentQuoteSection patient={patient} activePlan={activePlan} onQuoteChanged={scheduling.refreshLinks} />

      {historicalPlans.length > 0 && (
        <div className="space-y-5" data-treatment-plan-history>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Histórico de planos</h3>
          {historicalPlans.map((plan, index) => <PlanSection key={plan.id} appointmentLinksByItem={executionSessions.linkedAppointmentsByItem} eligibilityByItem={scheduling.scheduleEligibilityByItem} plan={plan} title={`Plano anterior ${historicalPlans.length - index}`} canManage={false} mutationInFlight={mutationInFlight} onComplete={setCompleteTarget} onCancel={setCancelTarget} onOpenClinicalTimeline={onOpenClinicalTimeline} onOpenAgenda={(link) => navigate(link.agendaPath)} onRecordSession={() => {}} onSchedule={setSchedulingTarget} schedulingInFlightId={scheduling.scheduleInFlightId} sessionInFlightId={executionSessions.sessionInFlightId} sessionsByAppointmentLink={executionSessions.sessionsByAppointmentLink} sessionsByItem={executionSessions.sessionsByItem} canManageSessions={false} />)}
        </div>
      )}

      {!canManage && <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground" data-treatment-plan-read-only>Modo somente leitura: as ações de adicionar, agendar, registrar sessão, concluir e cancelar não estão disponíveis para este perfil.</div>}

      {canManage && (
        <>
          <TreatmentPlanItemModal open={itemModalOpen} onOpenChange={setItemModalOpen} patientName={patient.name} eligibleServices={eligibleServices} suggestedSequence={suggestedSequence} onSubmit={handleAppend} isSaving={mutationInFlight} />
          <TreatmentPlanCompleteModal open={Boolean(completeTarget)} onOpenChange={(next) => !next && setCompleteTarget(null)} item={completeTarget} onSubmit={handleComplete} isSaving={mutationInFlight} />
          <TreatmentPlanCancelModal open={Boolean(cancelTarget)} onOpenChange={(next) => !next && setCancelTarget(null)} item={cancelTarget} onSubmit={handleCancel} isSaving={mutationInFlight} />
        </>
      )}
      {scheduling.canManage && (
        <TreatmentPlanAppointmentModal
          clearSuggestedSlots={schedule.clearSuggestedSlots}
          eligibility={schedulingTarget ? scheduling.scheduleEligibilityByItem[schedulingTarget.id] : null}
          isSaving={scheduling.scheduleInFlightId === schedulingTarget?.id}
          item={schedulingTarget}
          loadSuggestedSlots={schedule.loadSuggestedSlots}
          onOpenChange={(next) => !next && setSchedulingTarget(null)}
          onSubmit={handleSchedule}
          open={Boolean(schedulingTarget)}
          patientName={patient.name}
          professionals={schedule.professionals}
          rooms={schedule.rooms}
          slots={schedule.suggestedSlots}
          slotsError={schedule.slotsError}
          slotsLoading={schedule.slotsLoading}
        />
      )}
      {executionSessions.canManage && (
        <TreatmentExecutionSessionModal
          appointmentLink={sessionTarget?.appointmentLink}
          isSaving={executionSessions.sessionInFlightId === sessionTarget?.appointmentLink?.linkId}
          item={sessionTarget?.item}
          onOpenChange={(next) => !next && setSessionTarget(null)}
          onSubmit={handleRecordSession}
          open={Boolean(sessionTarget)}
          patientName={patient.name}
        />
      )}
      {protocolState.canManage && <ClinicalProtocolSessionModal
        open={Boolean(guidedSessionTarget)}
        onOpenChange={(next) => !next && setGuidedSessionTarget(null)}
        patientName={patient.name}
        itemName={guidedSessionTarget?.item?.serviceName}
        step={guidedSessionTarget?.step}
        appointmentLink={guidedSessionTarget?.appointmentLink}
        onCompleted={handleGuidedSessionRecorded}
      />}
      {protocolState.canManage && <ClinicalProtocolVisitModal
        open={Boolean(groupedVisitTarget)}
        onOpenChange={(next) => !next && setGroupedVisitTarget(null)}
        patientName={patient.name}
        professionalName={schedule.professionals.find((entry) => entry.id === groupedVisitTarget?.visit?.professional_id)?.displayName}
        visit={groupedVisitTarget?.visit}
        items={groupedVisitTarget?.items || []}
        steps={protocolState.data.steps}
        planItems={activePlan?.items || []}
        onCompleted={handleGuidedSessionRecorded}
      />}
    </div>
  );
};

export default TreatmentPlanPanel;
