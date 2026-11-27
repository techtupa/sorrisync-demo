import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  clinicalProtocolTemplateErrorMessage,
  discardClinicalProtocolSessionDraft,
  fetchClinicalProtocolSessionDraft,
  finalizeClinicalProtocolSession,
  saveClinicalProtocolSessionDraft,
} from '@/repositories/index.js';

const EMPTY_FORM = {
  content: '', outcomeCode: '', manualConfirmation: false,
  completeStep: false, completeItem: false,
};
const OUTCOMES = [
  { value: 'performed', label: 'Realizado' },
  { value: 'partially_performed', label: 'Parcialmente realizado' },
  { value: 'not_performed', label: 'Não realizado' },
];
const fingerprint = (form) => JSON.stringify(form);

const ClinicalProtocolSessionModal = ({ open, onOpenChange, patientName, itemName,
  step, appointmentLink, onCompleted }) => {
  const { currentTenantId, currentProfile, user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [stage, setStage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Salvo');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;
  const draftIdRef = useRef('');
  const versionRef = useRef(null);
  const savedFingerprintRef = useRef(fingerprint(EMPTY_FORM));
  const pendingSaveRef = useRef(null);
  const scopeRef = useRef('');
  const finalRequestRef = useRef('');
  const scope = `${currentTenantId || ''}:${step?.id || ''}:${appointmentLink?.linkId || ''}`;

  useEffect(() => {
    if (!open || !step?.id || !appointmentLink?.linkId) return undefined;
    scopeRef.current = scope;
    setLoaded(false);
    setLoading(true);
    setError('');
    setStage(1);
    setConfirmed(false);
    setForm(EMPTY_FORM);
    draftIdRef.current = '';
    versionRef.current = null;
    finalRequestRef.current = '';
    fetchClinicalProtocolSessionDraft(currentTenantId, step.id, appointmentLink.linkId)
      .then((row) => {
        if (scopeRef.current !== scope) return;
        const restored = row?.state === 'active' ? {
          content: row.content || '', outcomeCode: row.outcome_code || '',
          manualConfirmation: Boolean(row.manual_confirmation),
          completeStep: Boolean(row.complete_step), completeItem: Boolean(row.complete_item),
        } : EMPTY_FORM;
        draftIdRef.current = row?.id || '';
        versionRef.current = row?.version ?? null;
        savedFingerprintRef.current = fingerprint(restored);
        setForm(restored);
        setSaveStatus('Salvo');
        setLoaded(true);
      })
      .catch((failure) => {
        if (scopeRef.current !== scope) return;
        setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
        setSaveStatus('Não salvo');
      })
      .finally(() => { if (scopeRef.current === scope) setLoading(false); });
    return () => { if (scopeRef.current === scope) scopeRef.current = ''; };
  }, [appointmentLink?.linkId, currentTenantId, open, scope, step?.id]);

  const saveNow = useCallback(async () => {
    if (pendingSaveRef.current) await pendingSaveRef.current;
    if (!loaded || !step?.id || !appointmentLink?.linkId || scopeRef.current !== scope) return versionRef.current;
    const snapshot = formRef.current;
    const snapshotFingerprint = fingerprint(snapshot);
    if (snapshotFingerprint === savedFingerprintRef.current) return versionRef.current;
    if (!navigator.onLine) {
      setSaveStatus('Não salvo');
      throw new Error('Sem conexão. O texto permanece apenas nesta tela.');
    }
    setSaving(true);
    setSaveStatus('Salvando');
    const operation = saveClinicalProtocolSessionDraft({
      stepId: step.id, appointmentLinkId: appointmentLink.linkId,
      content: snapshot.content, outcomeCode: snapshot.outcomeCode,
      manualConfirmation: snapshot.manualConfirmation,
      completeStep: snapshot.completeStep, completeItem: snapshot.completeItem,
      expectedVersion: versionRef.current, requestId: crypto.randomUUID(),
    });
    pendingSaveRef.current = operation;
    let result;
    try {
      result = await operation;
      if (scopeRef.current === scope) {
        draftIdRef.current = result.draft_id;
        versionRef.current = result.draft_version;
        savedFingerprintRef.current = snapshotFingerprint;
        setSaveStatus(fingerprint(formRef.current) === snapshotFingerprint ? 'Salvo' : 'Salvando');
      }
    } catch (failure) {
      if (scopeRef.current === scope) {
        setSaveStatus('Não salvo');
        setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
      }
      throw failure;
    } finally {
      pendingSaveRef.current = null;
      if (scopeRef.current === scope) setSaving(false);
    }
    if (scopeRef.current === scope && fingerprint(formRef.current) !== snapshotFingerprint) return saveNow();
    return result.draft_version;
  }, [appointmentLink?.linkId, loaded, scope, step?.id]);

  useEffect(() => {
    if (!open || !loaded || fingerprint(form) === savedFingerprintRef.current) return undefined;
    setSaveStatus('Salvando');
    const timer = window.setTimeout(() => { saveNow().catch(() => {}); }, 900);
    return () => window.clearTimeout(timer);
  }, [form, loaded, open, saveNow]);

  useEffect(() => {
    if (!open) return undefined;
    const warn = (event) => {
      if (fingerprint(formRef.current) === savedFingerprintRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open]);

  const update = (change) => {
    finalRequestRef.current = '';
    setConfirmed(false);
    setForm((current) => ({ ...current, ...change }));
  };
  const close = (next) => {
    if (next) return;
    if (fingerprint(formRef.current) !== savedFingerprintRef.current
      && !window.confirm('Há alterações ainda não salvas. Sair desta sessão?')) return;
    onOpenChange(false);
  };
  const discard = async () => {
    if (!window.confirm('Descartar este rascunho? Esta ação apaga somente o conteúdo não finalizado.')) return;
    try {
      if (draftIdRef.current && versionRef.current != null) {
        await discardClinicalProtocolSessionDraft({
          draftId: draftIdRef.current, expectedVersion: versionRef.current,
          requestId: crypto.randomUUID(),
        });
      }
      savedFingerprintRef.current = fingerprint(EMPTY_FORM);
      onOpenChange(false);
    } catch (failure) {
      setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    }
  };
  const finalize = async () => {
    if (!confirmed || !form.outcomeCode || form.content.trim().length < 5
      || (form.completeStep && form.outcomeCode !== 'performed')
      || (form.completeItem && !form.completeStep)) return;
    setError('');
    try {
      await saveNow();
      if (fingerprint(formRef.current) !== savedFingerprintRef.current) {
        throw new Error('Revise as alterações recentes antes de finalizar.');
      }
      if (!draftIdRef.current || versionRef.current == null) throw new Error('Rascunho ainda não foi salvo.');
      if (!finalRequestRef.current) finalRequestRef.current = crypto.randomUUID();
      const result = await finalizeClinicalProtocolSession({
        draftId: draftIdRef.current, expectedVersion: versionRef.current,
        requestId: finalRequestRef.current,
      });
      savedFingerprintRef.current = fingerprint(formRef.current);
      await onCompleted(result);
      onOpenChange(false);
    } catch (failure) {
      setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    }
  };

  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]" data-clinical-protocol-session-modal>
    <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Execução guiada da etapa</DialogTitle><DialogDescription>{step?.title} · {patientName} · {itemName}</DialogDescription></DialogHeader>
    <div className="rounded-lg border bg-muted/20 p-3 text-sm"><p>Profissional da Agenda: {appointmentLink?.professional || 'Não informado'}</p><p>Autor autenticado: {currentProfile?.full_name || user?.email || 'Profissional da clínica'}</p><p className="mt-1 text-xs text-muted-foreground">Consulta finalizada. O registro criará uma evolução clínica e um resultado para este procedimento.</p></div>
    {loading && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Recuperando rascunho...</p>}
    {loaded && <>
      <p className="text-xs text-muted-foreground">Passo {stage} de 3 · Rascunho: {saveStatus}</p>
      {stage === 1 && <div className="space-y-4"><div><Label htmlFor="guided-outcome">Resultado da sessão</Label><select id="guided-outcome" className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.outcomeCode} onChange={(event) => update({ outcomeCode: event.target.value, completeStep: false, completeItem: false })}><option value="">Selecione o resultado</option>{OUTCOMES.map((outcome) => <option key={outcome.value} value={outcome.value}>{outcome.label}</option>)}</select></div>{step?.criteria?.includes('manual_confirmation') && <div className="flex items-center gap-2"><Checkbox id="guided-manual-confirm" checked={form.manualConfirmation} onCheckedChange={(value) => update({ manualConfirmation: value === true })} /><Label htmlFor="guided-manual-confirm">Confirmo manualmente o critério desta etapa.</Label></div>}<p className="text-sm text-muted-foreground">Dependências e aceite do orçamento serão revalidados pelo servidor ao finalizar.</p></div>}
      {stage === 2 && <div className="space-y-2"><Label htmlFor="guided-clinical-content">Evolução clínica</Label><Textarea id="guided-clinical-content" rows={10} maxLength={5000} value={form.content} onChange={(event) => update({ content: event.target.value })} placeholder="Registre a evolução desta consulta em texto simples." /><p className="text-xs text-muted-foreground">{form.content.length}/5.000 caracteres. Apenas o Prontuário receberá o texto finalizado.</p></div>}
      {stage === 3 && <div className="space-y-4"><div className="rounded-lg border p-3 text-sm"><p>Resultado: {OUTCOMES.find((outcome) => outcome.value === form.outcomeCode)?.label || 'Não selecionado'}</p><p className="mt-2 whitespace-pre-wrap">{form.content || 'Evolução ainda não preenchida.'}</p></div>{form.outcomeCode === 'performed' && <><div className="flex items-center gap-2"><Checkbox id="guided-complete-step" checked={form.completeStep} onCheckedChange={(value) => update({ completeStep: value === true, completeItem: value === true ? form.completeItem : false })} /><Label htmlFor="guided-complete-step">Concluir esta etapa após registrar a sessão</Label></div><div className="flex items-center gap-2"><Checkbox id="guided-complete-item" checked={form.completeItem} disabled={!form.completeStep} onCheckedChange={(value) => update({ completeItem: value === true })} /><Label htmlFor="guided-complete-item">Concluir também o procedimento, se todas as suas etapas estiverem resolvidas</Label></div></>}<div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><Checkbox id="guided-confirm" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} /><Label htmlFor="guided-confirm" className="font-normal">Revisei o resultado, a evolução e as conclusões escolhidas. Confirmo o registro final no Prontuário.</Label></div></div>}
    </>}
    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
    <DialogFooter className="flex flex-wrap gap-2 sm:justify-between"><Button type="button" variant="ghost" onClick={discard} disabled={!loaded || saving}>Descartar rascunho</Button><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => stage === 1 ? close(false) : setStage((current) => current - 1)}>{stage === 1 ? 'Fechar' : 'Voltar'}</Button>{stage < 3 ? <Button type="button" onClick={() => setStage((current) => current + 1)} disabled={!loaded || (stage === 1 && !form.outcomeCode)}>Continuar</Button> : <Button type="button" onClick={finalize} disabled={!loaded || saving || !confirmed || !form.outcomeCode || form.content.trim().length < 5}>Finalizar documentação</Button>}</div></DialogFooter>
  </DialogContent></Dialog>;
};

export default ClinicalProtocolSessionModal;
