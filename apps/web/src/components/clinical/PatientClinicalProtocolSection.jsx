import React, { useRef, useState } from 'react';
import { AlertTriangle, ClipboardList, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useClinicalProtocolTemplates } from '@/hooks/useClinicalProtocolTemplates.js';
import { CLINICAL_PROTOCOL_CRITERION_LABELS, clinicalProtocolTemplateErrorMessage, validateProtocolApplicationMapping } from '@/repositories/index.js';

const makeMapping = (version) => (version?.definition?.phases || []).flatMap((phase, phaseIndex) => (
  phase.steps.map((step, stepIndex) => ({
    phase_index: phaseIndex,
    step_index: stepIndex,
    item_id: '',
    duration_minutes: step.duration_minutes,
  }))
));

const PatientClinicalProtocolSection = ({ plan, protocolState, appointmentLinksByItem = {}, sessionsByAppointmentLink = {}, professionals = [], onDocumentSession, onDocumentVisit, onPlanChanged }) => {
  const { data, loading, error, canRead, canManage, mutationInFlight, refresh, apply, revise,
    setPaused, waiveCriterion, waiveStep, completeItem, completeProtocol, cancelProtocol, releaseStep, revokeRelease,
    groupReleases, revokeVisit } = protocolState;
  const { templates, versions, loadVersions, loading: templatesLoading } = useClinicalProtocolTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [mapping, setMapping] = useState([]);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [replanDraft, setReplanDraft] = useState({});
  const [justification, setJustification] = useState({});
  const [releaseTargetId, setReleaseTargetId] = useState('');
  const [releaseDraft, setReleaseDraft] = useState({ professionalId: '', durationMinutes: 45, windowStart: '', windowEnd: '' });
  const [groupSelection, setGroupSelection] = useState([]);
  const [groupDuration, setGroupDuration] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const selectionSequence = useRef(0);
  const selectedVersion = versions.find((version) => version.id === selectedVersionId) || null;
  const applicable = mapping.filter((entry) => entry.item_id);
  const plannedItemIds = plan.items.filter((item) => item.status === 'planned').map((item) => item.id);
  const mappingValidation = validateProtocolApplicationMapping(selectedVersion?.definition, applicable, plannedItemIds);
  const itemById = new Map(plan.items.map((item) => [item.id, item]));
  const pendingChanges = data.steps.filter((step) => {
    if (step.status !== 'pending' || !replanDraft[step.id]) return false;
    const draft = replanDraft[step.id];
    return (draft.item_id ?? step.treatment_plan_item_id) !== step.treatment_plan_item_id
      || (draft.title ?? step.title) !== step.title
      || (draft.duration_minutes ?? step.duration_minutes) !== step.duration_minutes
      || (draft.min_interval_days ?? step.min_interval_days) !== step.min_interval_days;
  }).map((step) => ({
    step_id: step.id,
    item_id: replanDraft[step.id].item_id ?? step.treatment_plan_item_id,
    title: (replanDraft[step.id].title ?? step.title).trim(),
    duration_minutes: replanDraft[step.id].duration_minutes ?? step.duration_minutes,
    min_interval_days: replanDraft[step.id].min_interval_days ?? step.min_interval_days,
  }));
  const replanValid = pendingChanges.length > 0 && pendingChanges.every((change) => (
    change.title.length >= 3 && change.title.length <= 100
      && Number.isInteger(change.duration_minutes)
      && change.duration_minutes >= 5 && change.duration_minutes <= 480
      && Number.isInteger(change.min_interval_days)
      && change.min_interval_days >= 0 && change.min_interval_days <= 365
      && plan.items.some((item) => item.id === change.item_id && item.status === 'planned')
  ));
  const publishedTemplates = templates.filter((template) => template.status !== 'archived' && template.last_published_revision);
  const updateMapping = (phaseIndex, stepIndex, change) => setMapping((current) => current.map((entry) => (
    entry.phase_index === phaseIndex && entry.step_index === stepIndex ? { ...entry, ...change } : entry
  )));
  const updateReplan = (stepId, change) => setReplanDraft((current) => ({
    ...current, [stepId]: { ...current[stepId], ...change },
  }));

  const selectTemplate = async (templateId) => {
    const sequence = ++selectionSequence.current;
    setSelectedTemplateId(templateId);
    setSelectedVersionId('');
    setMapping([]);
    setActionError('');
    const rows = templateId ? await loadVersions(templateId) : [];
    if (sequence === selectionSequence.current && rows[0]) {
      setSelectedVersionId(rows[0].id);
      setMapping(makeMapping(rows[0]));
    }
  };
  const selectVersion = (versionId) => {
    setSelectedVersionId(versionId);
    setMapping(makeMapping(versions.find((version) => version.id === versionId)));
    setActionError('');
  };
  const handleApply = async () => {
    if (!selectedVersion || !mappingValidation.valid) return;
    const selectedItems = new Set(applicable.map((entry) => entry.item_id));
    if (!window.confirm(`Aplicar ${applicable.length} etapa(s) a ${selectedItems.size} procedimento(s) deste plano? Nenhum procedimento ou orçamento será criado.`)) return;
    setActionError('');
    setNotice('');
    try {
      await apply({ versionId: selectedVersion.id, mapping: applicable, definition: selectedVersion.definition, plannedItemIds });
      setNotice('Protocolo aplicado ao plano. As etapas permanecem pendentes até a execução clínica.');
    } catch (failure) {
      setActionError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    }
  };
  const handleReplan = async () => {
    if (!replanValid || !window.confirm(`Revisar ${pendingChanges.length} etapa(s) futura(s)? Etapas já documentadas permanecem intactas.`)) return;
    setActionError('');
    setNotice('');
    try {
      await revise(pendingChanges);
      setReplanDraft({});
      setNotice('Etapas futuras revisadas. A versão anterior permanece no histórico protegido.');
    } catch (failure) {
      setActionError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    }
  };
  const runAction = async (operation, message) => {
    setActionError('');
    setNotice('');
    try {
      await operation();
      setNotice(message);
      return true;
    } catch (failure) {
      setActionError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
      return false;
    }
  };
  const handleJustifiedAction = async (step, kind) => {
    const reason = (justification[step.id] || '').trim();
    if (reason.length < 10) {
      setActionError('Registre uma justificativa clínica com pelo menos 10 caracteres.');
      return;
    }
    if (!window.confirm(kind === 'step' ? 'Dispensar esta etapa? A justificativa será registrada no Prontuário.' : 'Dispensar a dependência anterior? A justificativa será registrada no Prontuário.')) return;
    const succeeded = await runAction(
      () => kind === 'step' ? waiveStep(step.id, reason) : waiveCriterion(step.id, reason),
      kind === 'step' ? 'Etapa dispensada com justificativa clínica.' : 'Dependência dispensada com justificativa clínica.',
    );
    if (succeeded) setJustification((current) => ({ ...current, [step.id]: '' }));
  };
  const handleRelease = async () => {
    const start = new Date(releaseDraft.windowStart);
    const end = new Date(releaseDraft.windowEnd);
    if (!releaseDraft.professionalId || !Number.isInteger(releaseDraft.durationMinutes)
      || releaseDraft.durationMinutes < 5 || releaseDraft.durationMinutes > 480
      || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setActionError('Revise profissional, duração e início e fim da janela de agendamento.');
      return;
    }
    if (!window.confirm('Liberar esta etapa para a recepção? A liberação não reservará um horário.')) return;
    const succeeded = await runAction(() => releaseStep(releaseTargetId, {
      durationMinutes: releaseDraft.durationMinutes, professionalId: releaseDraft.professionalId,
      windowStartsAt: start.toISOString(), windowEndsAt: end.toISOString(),
    }), 'Etapa liberada para a fila de agendamento da recepção.');
    if (succeeded) setReleaseTargetId('');
  };
  const handleGroup = async () => {
    const selected = data.releases.filter((release) => groupSelection.includes(release.id));
    const durationMinutes = Number(groupDuration || selected.reduce((sum, release) => sum + release.duration_minutes, 0));
    if (selected.length < 2 || selected.length > 5 || !Number.isInteger(durationMinutes)
      || durationMinutes < 5 || durationMinutes > 1440) {
      setActionError('Selecione de duas a cinco etapas liberadas e uma duração válida.');
      return;
    }
    if (!window.confirm(`Agrupar ${selected.length} procedimentos em uma consulta de ${durationMinutes} minutos? Cada resultado permanecerá individual.`)) return;
    const succeeded = await runAction(() => groupReleases(selected.map((release) => release.id), durationMinutes),
      'Visita agrupada liberada para agendamento.');
    if (succeeded) { setGroupSelection([]); setGroupDuration(''); }
  };

  if (!canRead) return null;
  if (loading) return <div className="flex items-center gap-2 rounded-xl border p-5 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Conferindo protocolo do plano...</div>;
  if (error) return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</span><Button size="sm" variant="outline" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Atualizar</Button></div>;

  if (data.protocol) {
    const completed = data.steps.filter((step) => step.status === 'completed').length;
    const waived = data.steps.filter((step) => step.status === 'waived').length;
    const cancelled = data.steps.filter((step) => step.status === 'cancelled').length;
    const next = data.steps.find((step) => step.status === 'pending' || step.status === 'in_progress');
    return <Card className="border-blue-200 bg-blue-50/40" data-patient-clinical-protocol={data.protocol.id}><CardContent className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-semibold text-blue-950"><ClipboardList className="h-5 w-5" />{data.protocol.title}</p><p className="mt-1 text-sm text-blue-900">Protocolo aplicado ao plano · revisão {data.protocol.revision}</p></div><Badge variant="outline">{data.protocol.status === 'active' ? 'Ativo' : data.protocol.status === 'paused' ? 'Pausado' : 'Encerrado'}</Badge></div>
      <p className="text-sm text-foreground">{completed} concluída(s) · {waived} dispensada(s) · {cancelled} cancelada(s) · {data.steps.length} etapa(s) no total. Esses números descrevem tarefas, não recuperação clínica.</p>
      <p className="text-sm text-blue-950">Próxima etapa planejada: <strong>{next?.title || 'nenhuma'}</strong>. Consulte as sessões realizadas e documente a próxima consulta finalizada.</p>
      <div className="space-y-3">{data.phases.map((phase) => <details key={phase.id} className="rounded-lg border bg-background p-3"><summary className="cursor-pointer font-medium">{phase.position}. {phase.title}</summary><ol className="mt-3 space-y-2">{data.steps.filter((step) => step.phase_id === phase.id).map((step) => {
        const item = itemById.get(step.treatment_plan_item_id);
        const documentedIds = new Set(data.stepSessions.filter((record) => record.step_id === step.id).map((record) => record.session_id));
        const finalizedLink = (appointmentLinksByItem[step.treatment_plan_item_id] || []).find((link) => link.status === 'Finalizada'
          && !sessionsByAppointmentLink[link.linkId]
          && !data.visitItems.some((groupedItem) => groupedItem.appointment_link_id === link.linkId));
        const openRelease = data.releases.find((release) => release.step_id === step.id && release.state === 'released');
        return <li key={step.id} className="rounded-md bg-muted/30 p-3 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><span>{step.position}. {step.title} · {item?.serviceName || 'Procedimento do plano'}</span><Badge variant="outline">{step.status === 'pending' ? 'Pendente' : step.status === 'in_progress' ? 'Em andamento' : step.status === 'completed' ? 'Concluída' : step.status === 'waived' ? 'Dispensada' : 'Cancelada'}</Badge></div>
          {documentedIds.size > 0 && <p className="mt-2 text-xs text-muted-foreground">{documentedIds.size} sessão(ões) vinculada(s) a esta etapa.</p>}
          {canManage && ['pending', 'in_progress'].includes(step.status) && <div className="mt-3 flex flex-wrap gap-2">
            {finalizedLink && <Button size="sm" onClick={() => onDocumentSession?.(step, item, finalizedLink)} disabled={mutationInFlight}>Documentar consulta finalizada</Button>}
            {!finalizedLink && <span className="text-xs text-muted-foreground">A documentação guiada fica disponível após a consulta ser finalizada na Agenda.</span>}
            {data.protocol.status === 'active' && !openRelease && <Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => {
              setReleaseTargetId(step.id);
              setReleaseDraft({ professionalId: '', durationMinutes: step.duration_minutes, windowStart: '', windowEnd: '' });
            }}>Liberar para agendamento</Button>}
            {openRelease && <><span className="text-xs text-blue-900">{openRelease.visit_id ? 'Visita agrupada' : 'A agendar'} até {new Date(openRelease.window_ends_at).toLocaleString('en-US')}.</span>{!openRelease.visit_id && <Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => {
              if (window.confirm('Revogar esta liberação? Consultas já criadas não serão canceladas.')) runAction(() => revokeRelease(openRelease.id), 'Liberação revogada.');
            }}>Revogar liberação</Button>}</>}
          </div>}
          {canManage && step.status === 'pending' && <details className="mt-3"><summary className="cursor-pointer text-xs text-muted-foreground">Exceção clínica</summary><label className="mt-2 block text-xs font-medium" htmlFor={`protocol-waiver-${step.id}`}>Justificativa no Prontuário</label><Input id={`protocol-waiver-${step.id}`} maxLength={1000} value={justification[step.id] || ''} onChange={(event) => setJustification((current) => ({ ...current, [step.id]: event.target.value }))} /><div className="mt-2 flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => handleJustifiedAction(step, 'step')}>Dispensar etapa</Button>{step.depends_on_step_id && !data.waivers.some((waiver) => waiver.step_id === step.id && waiver.criterion_code === 'previous_step') && <Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => handleJustifiedAction(step, 'criterion')}>Dispensar dependência</Button>}</div></details>}
        </li>;
      })}</ol></details>)}</div>
      {releaseTargetId && <div className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-2" data-clinical-protocol-release-form><div className="sm:col-span-2"><p className="font-medium">Liberar etapa para agendamento</p><p className="text-xs text-muted-foreground">A recepção verá somente paciente, profissional, duração e janela permitida.</p></div><div><label htmlFor="protocol-release-professional" className="mb-1 block text-sm">Profissional</label><select id="protocol-release-professional" className="h-10 w-full rounded-md border bg-background px-3" value={releaseDraft.professionalId} onChange={(event) => setReleaseDraft((current) => ({ ...current, professionalId: event.target.value }))}><option value="">Selecione</option>{professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.displayName}</option>)}</select></div><div><label htmlFor="protocol-release-duration" className="mb-1 block text-sm">Duração em minutos</label><Input id="protocol-release-duration" type="number" min="5" max="480" value={releaseDraft.durationMinutes} onChange={(event) => setReleaseDraft((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} /></div><div><label htmlFor="protocol-release-start" className="mb-1 block text-sm">Início da janela</label><Input id="protocol-release-start" type="datetime-local" value={releaseDraft.windowStart} onChange={(event) => setReleaseDraft((current) => ({ ...current, windowStart: event.target.value }))} /></div><div><label htmlFor="protocol-release-end" className="mb-1 block text-sm">Fim da janela</label><Input id="protocol-release-end" type="datetime-local" value={releaseDraft.windowEnd} onChange={(event) => setReleaseDraft((current) => ({ ...current, windowEnd: event.target.value }))} /></div><div className="flex gap-2 sm:col-span-2"><Button size="sm" disabled={mutationInFlight} onClick={handleRelease}>Confirmar liberação</Button><Button size="sm" variant="outline" onClick={() => setReleaseTargetId('')}>Cancelar</Button></div></div>}
      {canManage && data.protocol.status === 'active' && data.releases.filter((release) => release.state === 'released' && !release.visit_id).length >= 2 && <details className="rounded-lg border bg-background p-4" data-clinical-protocol-grouping><summary className="cursor-pointer font-medium">Reunir procedimentos em uma consulta</summary><p className="mt-2 text-sm text-muted-foreground">Selecione liberações do mesmo plano e profissional. A duração inicial soma as etapas.</p><div className="mt-3 space-y-2">{data.releases.filter((release) => release.state === 'released' && !release.visit_id).map((release) => {
        const step = data.steps.find((entry) => entry.id === release.step_id);
        const item = itemById.get(step?.treatment_plan_item_id);
        return <label key={release.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={groupSelection.includes(release.id)} onChange={(event) => setGroupSelection((current) => event.target.checked ? [...current, release.id] : current.filter((id) => id !== release.id))} />{item?.serviceName || 'Procedimento'} · {step?.title || 'Etapa'} · {release.duration_minutes} min</label>;
      })}</div><div className="mt-3 flex flex-wrap items-end gap-2"><div><label htmlFor="protocol-group-duration" className="mb-1 block text-sm">Duração conjunta em minutos</label><Input id="protocol-group-duration" type="number" min="5" max="1440" value={groupDuration || data.releases.filter((release) => groupSelection.includes(release.id)).reduce((sum, release) => sum + release.duration_minutes, 0)} onChange={(event) => setGroupDuration(event.target.value)} /></div><Button size="sm" disabled={mutationInFlight || groupSelection.length < 2} onClick={handleGroup}>Liberar visita agrupada</Button></div></details>}
      {data.visits.length > 0 && <div className="space-y-2" data-clinical-protocol-visits><p className="text-sm font-semibold">Visitas agrupadas</p>{data.visits.map((visit) => {
        const items = data.visitItems.filter((entry) => entry.visit_id === visit.id);
        const finalized = visit.state === 'booked' && items.length > 0 && items.every((entry) => (appointmentLinksByItem[entry.treatment_plan_item_id] || []).some((link) => link.linkId === entry.appointment_link_id && link.status === 'Finalizada'));
        return <div key={visit.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3 text-sm"><span>{items.length} procedimentos · {visit.duration_minutes} min · {visit.state === 'released' ? 'A agendar' : visit.state === 'booked' ? 'Consulta marcada' : visit.state === 'documented' ? 'Documentada' : 'Revogada'}</span><div className="flex gap-2">{canManage && visit.state === 'released' && <Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => {
          if (window.confirm('Revogar esta visita agrupada? Nenhuma consulta existente será cancelada.')) runAction(() => revokeVisit(visit.id), 'Visita agrupada revogada.');
        }}>Revogar visita</Button>}{canManage && finalized && <Button size="sm" onClick={() => onDocumentVisit?.(visit, items)} disabled={mutationInFlight}>Documentar visita</Button>}</div></div>;
      })}</div>}
      {canManage && ['active', 'paused'].includes(data.protocol.status) && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => runAction(() => setPaused(data.protocol.status === 'active'), data.protocol.status === 'active' ? 'Protocolo pausado.' : 'Protocolo retomado.')}>{data.protocol.status === 'active' ? 'Pausar protocolo' : 'Retomar protocolo'}</Button>{data.steps.length > 0 && data.steps.every((step) => ['completed', 'waived'].includes(step.status)) && plan.items.every((item) => item.status !== 'planned') && <Button size="sm" onClick={() => {
        if (!window.confirm('Concluir o protocolo e o plano? Revise todas as etapas, procedimentos e consultas vinculadas antes de confirmar.')) return;
        runAction(async () => { await completeProtocol(); await onPlanChanged?.(); }, 'Protocolo e plano concluídos após revisão das pendências.');
      }} disabled={mutationInFlight}>Revisar e concluir protocolo</Button>}</div>}
      {canManage && plan.items.filter((item) => item.status === 'planned' && data.steps.some((step) => step.treatment_plan_item_id === item.id)
        && data.steps.filter((step) => step.treatment_plan_item_id === item.id).every((step) => ['completed', 'waived'].includes(step.status))).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background p-3 text-sm"><span>{item.serviceName}: etapas resolvidas. Revise o histórico antes de encerrar o procedimento.</span><Button size="sm" variant="outline" disabled={mutationInFlight} onClick={() => {
        if (!window.confirm(`Concluir o procedimento ${item.serviceName}? O servidor verificará a execução e o aceite.`)) return;
        runAction(async () => { await completeItem(item.id); await onPlanChanged?.(); }, 'Procedimento concluído após revisão clínica.');
      }}>Concluir procedimento</Button></div>)}
      {canManage && ['active', 'paused'].includes(data.protocol.status) && <details className="rounded-lg border bg-background p-4"><summary className="cursor-pointer font-medium">Cancelar protocolo e plano</summary><p className="mt-2 text-sm text-muted-foreground">Revogue liberações pendentes e resolva as consultas vinculadas antes de cancelar. Sessões e etapas já documentadas serão preservadas.</p><div className="mt-3 flex flex-wrap items-end gap-3"><div><label htmlFor="protocol-cancellation-reason" className="mb-1 block text-sm font-medium">Motivo</label><select id="protocol-cancellation-reason" className="h-10 rounded-md border bg-background px-3 text-sm" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)}><option value="">Selecione</option><option value="registration_error">Erro de registro</option><option value="no_longer_indicated">Tratamento não indicado</option><option value="replaced_by_another_item">Substituído por outro procedimento</option><option value="patient_declined">Paciente recusou</option></select></div><Button size="sm" variant="destructive" disabled={mutationInFlight || !cancellationReason} onClick={() => {
        if (!window.confirm('Cancelar o protocolo e o plano? O servidor impedirá a operação se houver liberação ou consulta pendente.')) return;
        runAction(async () => { await cancelProtocol(cancellationReason); await onPlanChanged?.(); }, 'Protocolo e plano cancelados; histórico preservado.');
      }}>Revisar e cancelar</Button></div></details>}
      {canManage && data.steps.some((step) => step.status === 'pending') && <details className="rounded-lg border bg-background p-4"><summary className="cursor-pointer font-medium">Replanejar etapas futuras</summary><p className="mt-2 text-sm text-muted-foreground">Altere somente etapas ainda pendentes e sem consulta vinculada. Uma revisão nova preserva a anterior.</p><div className="mt-4 space-y-3">{data.steps.filter((step) => step.status === 'pending').map((step) => <div key={step.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_100px]"><div><label htmlFor={`replan-title-${step.id}`} className="mb-1 block text-sm font-medium">Etapa</label><Input id={`replan-title-${step.id}`} value={replanDraft[step.id]?.title ?? step.title} maxLength={100} onChange={(event) => updateReplan(step.id, { title: event.target.value })} /></div><div><label htmlFor={`replan-item-${step.id}`} className="mb-1 block text-sm font-medium">Procedimento do plano</label><select id={`replan-item-${step.id}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={replanDraft[step.id]?.item_id ?? step.treatment_plan_item_id} onChange={(event) => updateReplan(step.id, { item_id: event.target.value })}>{plan.items.filter((item) => item.status === 'planned').map((item) => <option key={item.id} value={item.id}>{item.serviceName} · #{item.sequenceNumber}</option>)}</select></div><div><label htmlFor={`replan-duration-${step.id}`} className="mb-1 block text-sm font-medium">Minutos</label><Input id={`replan-duration-${step.id}`} type="number" min="5" max="480" value={replanDraft[step.id]?.duration_minutes ?? step.duration_minutes} onChange={(event) => updateReplan(step.id, { duration_minutes: Number(event.target.value) })} /></div><div><label htmlFor={`replan-interval-${step.id}`} className="mb-1 block text-sm font-medium">Dias</label><Input id={`replan-interval-${step.id}`} type="number" min="0" max="365" value={replanDraft[step.id]?.min_interval_days ?? step.min_interval_days} onChange={(event) => updateReplan(step.id, { min_interval_days: Number(event.target.value) })} /></div></div>)}</div><div className="mt-4 flex flex-wrap items-center gap-3"><Button size="sm" onClick={handleReplan} disabled={!replanValid || mutationInFlight}>{mutationInFlight ? 'Salvando...' : 'Revisar e salvar alterações'}</Button>{pendingChanges.length > 0 && !replanValid && <p role="alert" className="text-sm text-amber-800">Revise título, procedimento, duração e intervalo.</p>}</div></details>}
      <div className="text-xs text-muted-foreground">Histórico: {data.revisions.map((revision) => `${revision.action_code === 'applied' ? 'aplicação' : 'revisão'} ${revision.revision}`).join(' · ')}</div>
      {actionError && <p role="alert" className="text-sm text-amber-800">{actionError}</p>}
      {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
    </CardContent></Card>;
  }

  return <Card className="border-border/60" data-patient-clinical-protocol-apply><CardContent className="space-y-5 p-5">
    <div><h3 className="font-semibold">Aplicar protocolo clínico</h3><p className="mt-1 text-sm text-muted-foreground">Escolha uma versão publicada e associe explicitamente as etapas aos procedimentos planejados. Etapas sem vínculo serão omitidas.</p></div>
    {!canManage && <p className="text-sm text-muted-foreground">Seu perfil pode consultar protocolos, mas não aplicá-los.</p>}
    {canManage && <>
      <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="patient-protocol-template" className="mb-2 block text-sm font-medium">Modelo</label><select id="patient-protocol-template" value={selectedTemplateId} onChange={(event) => selectTemplate(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecione um modelo</option>{publishedTemplates.map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></div><div><label htmlFor="patient-protocol-version" className="mb-2 block text-sm font-medium">Versão publicada</label><select id="patient-protocol-version" value={selectedVersionId} onChange={(event) => selectVersion(event.target.value)} disabled={!selectedTemplateId} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecione uma versão</option>{versions.map((version) => <option key={version.id} value={version.id}>Versão {version.version_number}</option>)}</select></div></div>
      {templatesLoading && <p className="text-sm text-muted-foreground">Carregando modelos...</p>}
      {!templatesLoading && publishedTemplates.length === 0 && <p className="text-sm text-muted-foreground">Nenhum modelo publicado está disponível. Prepare e publique uma versão na biblioteca.</p>}
      {selectedVersion && <div className="space-y-4" data-protocol-application-preview>{selectedVersion.definition.phases.map((phase, phaseIndex) => <section key={phaseIndex} className="rounded-lg border bg-muted/10 p-4"><h4 className="font-medium">Fase {phaseIndex + 1}: {phase.title}</h4><div className="mt-3 space-y-3">{phase.steps.map((step, stepIndex) => {
        const entry = mapping.find((item) => item.phase_index === phaseIndex && item.step_index === stepIndex);
        return <div key={stepIndex} className="grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_100px]"><div><label htmlFor={`protocol-item-${phaseIndex}-${stepIndex}`} className="mb-1 block text-sm font-medium">{step.title}</label><select id={`protocol-item-${phaseIndex}-${stepIndex}`} value={entry?.item_id || ''} onChange={(event) => updateMapping(phaseIndex, stepIndex, { item_id: event.target.value })} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Omitir nesta aplicação</option>{plan.items.filter((item) => item.status === 'planned').map((item) => <option key={item.id} value={item.id}>{item.serviceName} · #{item.sequenceNumber}</option>)}</select><p className="mt-1 text-xs text-muted-foreground">Critérios: {step.criteria.length ? step.criteria.map((criterion) => CLINICAL_PROTOCOL_CRITERION_LABELS[criterion]).join(', ') : 'confirmação clínica'}.</p></div><div><label htmlFor={`protocol-duration-${phaseIndex}-${stepIndex}`} className="mb-1 block text-sm font-medium">Minutos</label><Input id={`protocol-duration-${phaseIndex}-${stepIndex}`} type="number" min="5" max="480" value={entry?.duration_minutes || ''} onChange={(event) => updateMapping(phaseIndex, stepIndex, { duration_minutes: Number(event.target.value) })} /></div></div>;
      })}</div></section>)}</div>}
      {selectedVersion && <div className="rounded-lg border bg-muted/20 p-4 text-sm"><p className="font-medium">Revisão antes de aplicar</p><p className="mt-1">{applicable.length} etapa(s) associada(s) a {new Set(applicable.map((entry) => entry.item_id)).size} procedimento(s). O orçamento aceito não será alterado. O agendamento e a conclusão ainda exigem ações clínicas próprias.</p></div>}
      {selectedVersion && !mappingValidation.valid && <p role="alert" className="text-sm text-amber-800">{mappingValidation.message}</p>}
      {actionError && <p role="alert" className="text-sm text-amber-800">{actionError}</p>}
      {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
      <Button onClick={handleApply} disabled={!selectedVersion || !mappingValidation.valid || mutationInFlight}>{mutationInFlight ? 'Aplicando...' : 'Revisar e aplicar protocolo'}</Button>
    </>}
  </CardContent></Card>;
};

export default PatientClinicalProtocolSection;
