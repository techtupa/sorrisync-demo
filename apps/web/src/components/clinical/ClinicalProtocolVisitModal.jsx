import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, ClipboardCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  clinicalProtocolTemplateErrorMessage,
  discardClinicalProtocolVisitDraft,
  fetchClinicalProtocolVisitDraft,
  finalizeClinicalProtocolGroupedVisit,
  saveClinicalProtocolVisitDraft,
  validateClinicalProtocolVisitResults,
} from '@/repositories/index.js';

const OUTCOMES = [
  { code: 'performed', label: 'Realizado' },
  { code: 'partially_performed', label: 'Parcialmente realizado' },
  { code: 'not_performed', label: 'Não realizado' },
];
const blankResults = (items) => items.map((item) => ({
  step_id: item.step_id, outcome_code: '', manual_confirmation: false,
  complete_step: false, complete_item: false,
}));
const fingerprint = (content, results) => JSON.stringify([content, results]);

const ClinicalProtocolVisitModal = ({ open, onOpenChange, visit, items = [], steps = [],
  planItems = [], patientName, professionalName, onCompleted }) => {
  const { currentTenantId, currentProfile, user } = useAuth();
  const [content, setContent] = useState('');
  const [results, setResults] = useState([]);
  const [stage, setStage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Salvo');
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const formRef = useRef({ content, results });
  formRef.current = { content, results };
  const draftIdRef = useRef('');
  const versionRef = useRef(null);
  const savedFingerprintRef = useRef('');
  const pendingSaveRef = useRef(null);
  const scopeRef = useRef('');
  const finalRequestRef = useRef('');
  const scope = `${currentTenantId || ''}:${visit?.id || ''}`;

  useEffect(() => {
    if (!open || !visit?.id || items.length < 2) return undefined;
    scopeRef.current = scope;
    setLoading(true);
    setLoaded(false);
    setError('');
    setStage(1);
    setConfirmed(false);
    finalRequestRef.current = '';
    fetchClinicalProtocolVisitDraft(currentTenantId, visit.id)
      .then((row) => {
        if (scopeRef.current !== scope) return;
        const initialResults = blankResults(items);
        const restoredResults = row?.state === 'active' && Array.isArray(row.results)
          ? initialResults.map((entry) => row.results.find((saved) => saved.step_id === entry.step_id) || entry)
          : initialResults;
        const restoredContent = row?.state === 'active' ? row.content || '' : '';
        draftIdRef.current = row?.id || '';
        versionRef.current = row?.version ?? null;
        savedFingerprintRef.current = fingerprint(restoredContent, restoredResults);
        setContent(restoredContent);
        setResults(restoredResults);
        setSaveStatus('Salvo');
        setLoaded(true);
      })
      .catch((failure) => {
        if (scopeRef.current === scope) {
          setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
          setSaveStatus('Não salvo');
        }
      })
      .finally(() => { if (scopeRef.current === scope) setLoading(false); });
    return () => { if (scopeRef.current === scope) scopeRef.current = ''; };
  }, [currentTenantId, items, open, scope, visit?.id]);

  const saveNow = useCallback(async () => {
    if (pendingSaveRef.current) await pendingSaveRef.current;
    if (!loaded || !visit?.id || scopeRef.current !== scope) return versionRef.current;
    const snapshot = formRef.current;
    const snapshotFingerprint = fingerprint(snapshot.content, snapshot.results);
    if (snapshotFingerprint === savedFingerprintRef.current) return versionRef.current;
    if (!navigator.onLine) {
      setSaveStatus('Não salvo');
      throw new Error('Sem conexão. O texto permanece apenas nesta tela.');
    }
    setSaving(true);
    setSaveStatus('Salvando');
    const operation = saveClinicalProtocolVisitDraft({
      visitId: visit.id, content: snapshot.content, results: snapshot.results,
      expectedVersion: versionRef.current, requestId: crypto.randomUUID(),
    });
    pendingSaveRef.current = operation;
    let saved;
    try {
      saved = await operation;
      if (scopeRef.current === scope) {
        draftIdRef.current = saved.draft_id;
        versionRef.current = saved.draft_version;
        savedFingerprintRef.current = snapshotFingerprint;
        setSaveStatus(fingerprint(formRef.current.content, formRef.current.results) === snapshotFingerprint ? 'Salvo' : 'Salvando');
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
    if (scopeRef.current === scope
      && fingerprint(formRef.current.content, formRef.current.results) !== snapshotFingerprint) return saveNow();
    return saved.draft_version;
  }, [loaded, scope, visit?.id]);

  useEffect(() => {
    if (!open || !loaded || fingerprint(content, results) === savedFingerprintRef.current) return undefined;
    setSaveStatus('Salvando');
    const timer = window.setTimeout(() => { saveNow().catch(() => {}); }, 900);
    return () => window.clearTimeout(timer);
  }, [content, loaded, open, results, saveNow]);

  useEffect(() => {
    if (!open) return undefined;
    const warn = (event) => {
      if (fingerprint(formRef.current.content, formRef.current.results) === savedFingerprintRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open]);

  const updateResult = (stepId, change) => {
    finalRequestRef.current = '';
    setConfirmed(false);
    setResults((current) => current.map((entry) => entry.step_id === stepId ? { ...entry, ...change } : entry));
  };
  const close = (next) => {
    if (next) return;
    if (fingerprint(formRef.current.content, formRef.current.results) !== savedFingerprintRef.current
      && !window.confirm('Há alterações ainda não salvas. Sair desta visita?')) return;
    onOpenChange(false);
  };
  const discard = async () => {
    if (!window.confirm('Descartar o rascunho desta visita? O conteúdo finalizado permanece preservado.')) return;
    try {
      if (draftIdRef.current && versionRef.current != null) {
        await discardClinicalProtocolVisitDraft({
          draftId: draftIdRef.current, expectedVersion: versionRef.current,
          requestId: crypto.randomUUID(),
        });
      }
      onOpenChange(false);
    } catch (failure) {
      setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    }
  };
  const validResults = validateClinicalProtocolVisitResults(
    results,
    items.map((item) => item.step_id),
    Object.fromEntries(steps.map((step) => [step.id, step.criteria])),
  );
  const finalize = async () => {
    if (!confirmed || !validResults || content.trim().length < 5) return;
    setError('');
    try {
      await saveNow();
      if (fingerprint(formRef.current.content, formRef.current.results) !== savedFingerprintRef.current
        || !draftIdRef.current || versionRef.current == null) {
        throw new Error('Revise as alterações recentes antes de finalizar.');
      }
      if (!finalRequestRef.current) finalRequestRef.current = crypto.randomUUID();
      const result = await finalizeClinicalProtocolGroupedVisit({
        draftId: draftIdRef.current, expectedVersion: versionRef.current,
        requestId: finalRequestRef.current,
      });
      savedFingerprintRef.current = fingerprint(formRef.current.content, formRef.current.results);
      await onCompleted(result);
      onOpenChange(false);
    } catch (failure) {
      setError(failure.userMessage || clinicalProtocolTemplateErrorMessage(failure));
    }
  };

  return <Dialog open={open} onOpenChange={close}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[800px]" data-clinical-protocol-visit-modal>
    <DialogHeader><DialogTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" />Documentar visita agrupada</DialogTitle><DialogDescription>{patientName} · {items.length} procedimentos · uma evolução clínica</DialogDescription></DialogHeader>
    <div className="rounded-lg border bg-muted/20 p-3 text-sm"><p>Profissional da Agenda: {professionalName || 'Não informado'}</p><p>Autor autenticado: {currentProfile?.full_name || user?.email || 'Profissional da clínica'}</p></div>
    {loading && <p className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Recuperando rascunho...</p>}
    {loaded && <><p className="text-xs text-muted-foreground">Passo {stage} de 3 · Rascunho: {saveStatus}</p>
      {stage === 1 && <div className="space-y-3">{items.map((item) => {
        const step = steps.find((entry) => entry.id === item.step_id);
        const planItem = planItems.find((entry) => entry.id === item.treatment_plan_item_id);
        const result = results.find((entry) => entry.step_id === item.step_id);
        return <div key={item.step_id} className="space-y-2 rounded-lg border p-3"><p className="font-medium">{planItem?.serviceName || 'Procedimento'} · {step?.title || 'Etapa'}</p><label htmlFor={`visit-outcome-${item.step_id}`} className="text-sm">Resultado</label><select id={`visit-outcome-${item.step_id}`} className="h-10 w-full rounded-md border bg-background px-3" value={result?.outcome_code || ''} onChange={(event) => updateResult(item.step_id, { outcome_code: event.target.value, complete_step: false, complete_item: false })}><option value="">Selecione</option>{OUTCOMES.map((outcome) => <option key={outcome.code} value={outcome.code}>{outcome.label}</option>)}</select>{step?.criteria?.includes('manual_confirmation') && <div className="flex items-center gap-2"><Checkbox id={`visit-confirm-${item.step_id}`} checked={result?.manual_confirmation || false} onCheckedChange={(value) => updateResult(item.step_id, { manual_confirmation: value === true })} /><Label htmlFor={`visit-confirm-${item.step_id}`}>Confirmo o critério desta etapa.</Label></div>}</div>;
      })}</div>}
      {stage === 2 && <div className="space-y-2"><Label htmlFor="visit-clinical-content">Evolução clínica da visita</Label><Textarea id="visit-clinical-content" rows={10} maxLength={5000} value={content} onChange={(event) => { finalRequestRef.current = ''; setConfirmed(false); setContent(event.target.value); }} placeholder="Registre uma evolução única para a consulta." /><p className="text-xs text-muted-foreground">{content.length}/5.000 caracteres. Apenas o Prontuário receberá o texto.</p></div>}
      {stage === 3 && <div className="space-y-3"><p className="rounded-lg border p-3 text-sm whitespace-pre-wrap">{content || 'Evolução ainda não preenchida.'}</p>{items.map((item) => {
        const step = steps.find((entry) => entry.id === item.step_id);
        const planItem = planItems.find((entry) => entry.id === item.treatment_plan_item_id);
        const result = results.find((entry) => entry.step_id === item.step_id);
        return <div key={item.step_id} className="space-y-2 rounded-lg border p-3 text-sm"><p className="font-medium">{planItem?.serviceName || 'Procedimento'} · {step?.title || 'Etapa'}</p><p>Resultado: {OUTCOMES.find((outcome) => outcome.code === result?.outcome_code)?.label || 'Não selecionado'}</p>{result?.outcome_code === 'performed' && <><div className="flex items-center gap-2"><Checkbox id={`visit-complete-step-${item.step_id}`} checked={result.complete_step} onCheckedChange={(value) => updateResult(item.step_id, { complete_step: value === true, complete_item: value === true ? result.complete_item : false })} /><Label htmlFor={`visit-complete-step-${item.step_id}`}>Concluir etapa</Label></div><div className="flex items-center gap-2"><Checkbox id={`visit-complete-item-${item.step_id}`} checked={result.complete_item} disabled={!result.complete_step} onCheckedChange={(value) => updateResult(item.step_id, { complete_item: value === true })} /><Label htmlFor={`visit-complete-item-${item.step_id}`}>Concluir procedimento, se todas as etapas estiverem resolvidas</Label></div></>}</div>;
      })}<div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><Checkbox id="visit-final-confirm" checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} /><Label htmlFor="visit-final-confirm" className="font-normal">Revisei a evolução e o resultado individual de cada procedimento. Confirmo o registro final.</Label></div></div>}
    </>}
    {error && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>{error}</AlertDescription></Alert>}
    <DialogFooter className="flex flex-wrap gap-2 sm:justify-between"><Button variant="ghost" onClick={discard} disabled={!loaded || saving}>Descartar rascunho</Button><div className="flex gap-2"><Button variant="outline" onClick={() => stage === 1 ? close(false) : setStage((current) => current - 1)}>{stage === 1 ? 'Fechar' : 'Voltar'}</Button>{stage < 3 ? <Button onClick={() => setStage((current) => current + 1)} disabled={!loaded || (stage === 1 && !validResults)}>Continuar</Button> : <Button onClick={finalize} disabled={!loaded || saving || !confirmed || !validResults || content.trim().length < 5}>Finalizar documentação</Button>}</div></DialogFooter>
  </DialogContent></Dialog>;
};

export default ClinicalProtocolVisitModal;
