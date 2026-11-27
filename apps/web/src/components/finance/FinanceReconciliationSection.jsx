import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { compareReconciliation, parseReconciliationAmount, reconciliationStates, validateReconciliationDraft } from '@/repositories/clinicFinanceReconciliationContract.js';
import { mapClinicFinanceSettlementEvent, todayInSaoPaulo } from '@/repositories/clinicFinanceReadModel.js';

const money = n => n == null ? 'Valor histórico não registrado' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100);
const date = d => d ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z')) : '—';
const blank = { referenceCode: '', referenceDate: '', amount: '' };
const FinanceReconciliationSection = ({ detail, onReversePayment }) => {
  const [draft, setDraft] = useState(blank), [ids, setIds] = useState([]), [head, setHead] = useState(null), [error, setError] = useState(null), [feedback, setFeedback] = useState(null);
  const request = useRef(crypto.randomUUID()), undos = useRef(new Map()), initialized = useRef(false), cache = useRef({ version: null, payments: new Map() });
  const data = detail.data;
  if (data) {
    if (cache.current.version !== data.version) cache.current = { version: data.version, payments: new Map() };
    for (const p of data.payments) cache.current.payments.set(p.id, p);
  }
  useEffect(() => {
    if (!data || initialized.current) return;
    initialized.current = true;
    const eligible = data.payments.filter(p => p.active && p.amount_cents != null && !p.claimed_by);
    if (data.payment_count <= 50 && eligible.length === 1) setIds([eligible[0].id]);
  }, [data]);
  if (!data || detail.loading || detail.readError) return null;
  const entry = data.entry, manage = detail.canManage && data.can_manage, busy = detail.busy;
  const eligibleEntry = ['open', 'scheduled', 'overdue', 'paid'].includes(entry.status) && entry.balanceQuality !== 'inconsistent';
  const selected = ids.map(id => cache.current.payments.get(id)).filter(Boolean);
  const paymentRows = [...data.payments, ...selected.filter(p => !data.payments.some(row => row.id === p.id))];
  const amount = parseReconciliationAmount(draft.amount);
  const preview = compareReconciliation(selected, draft.referenceDate, amount);
  const changed = () => { request.current = crypto.randomUUID(); setError(null); setFeedback(null); };
  const reset = () => { setDraft(blank); setIds([]); setHead(null); changed(); };
  const submit = async event => {
    event.preventDefault();
    const validation = validateReconciliationDraft({ ...draft, referenceAmountCents: amount, paymentIds: ids }, [...cache.current.payments.values()], head?.conference_id);
    if (!validation.valid) { setError(validation.errors[0]); return; }
    try {
      const receipt = await detail.mutate({ action: head ? 'correct' : 'register', requestId: request.current, head, draft: validation.value });
      reset(); setFeedback('Conferência confirmada: ' + reconciliationStates[receipt.current.state] + '. Nenhum pagamento ou saldo foi alterado.');
    } catch { /* O hook conserva o erro sanitizado e o formulário/chave. */ }
  };
  const correct = conference => {
    for (const p of conference.payments) cache.current.payments.set(p.id, p);
    setHead(conference); setIds(conference.payments.map(p => p.id));
    setDraft({ referenceCode: conference.reference_code, referenceDate: conference.reference_date, amount: (conference.reference_amount_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }); changed();
  };
  const undo = async conference => {
    if (!undos.current.has(conference.id)) undos.current.set(conference.id, crypto.randomUUID());
    try {
      const receipt = await detail.mutate({ action: 'undo', requestId: undos.current.get(conference.id), head: conference });
      reset(); setFeedback('Conferência confirmada: ' + reconciliationStates[receipt.current.state] + '. O histórico foi preservado.');
    } catch { /* Sem retry automático. */ }
  };
  const page = (kind, offset) => detail.load({ version: data.version, payments: kind === 'payments' ? offset : data.payments_offset, history: kind === 'history' ? offset : data.history_offset });
  return <div className="space-y-5 mt-5" data-clinic-finance-reconciliation={data.source}>
    <section className="space-y-3" aria-label="Histórico de registros">
      <h3 className="font-semibold">Histórico de registros</h3>
      {paymentRows.map(p => {
        const checked = ids.includes(p.id), eligible = p.active && p.amount_cents != null && (!p.claimed_by || p.claimed_by === head?.conference_id);
        return <div key={p.id} className="rounded-lg border border-border/60 p-3 space-y-2">
          <p className="text-sm">{p.event_type === 'reversed' ? 'Estorno' : 'Registro'} • {money(p.amount_cents)}</p>
          <p className="text-xs text-muted-foreground">{date(p.settlement_date || (p.created_at ? todayInSaoPaulo(new Date(p.created_at)) : null))}</p>
          {manage && p.event_type === 'settled' && <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" aria-label={'Selecionar registro de ' + money(p.amount_cents) + ' para conferência'} checked={checked} disabled={busy || (!eligible && !checked)} onChange={() => { setIds(current => checked ? current.filter(id => id !== p.id) : [...current, p.id]); changed(); }} /> Selecionar para conferência
          </label>}
          {p.claimed_by && p.claimed_by !== head?.conference_id && <p className="text-xs text-muted-foreground">Em outra conferência vigente.</p>}
          {!p.active && p.event_type === 'settled' && <p className="text-xs text-muted-foreground">Registro estornado; remova-o da seleção para corrigir.</p>}
          {manage && entry.canReversePayment && p.active && <Button variant="outline" size="sm" disabled={busy} onClick={() => onReversePayment?.(p.id, { ...entry, activePaymentEvents: [...cache.current.payments.values()].filter(row => row.active).map(row => mapClinicFinanceSettlementEvent({ ...row, entry_type: entry.type, [entry.type + '_id']: entry.id })) })}>Estornar registro</Button>}
        </div>;
      })}
      {!data.payment_count && <p className="text-sm text-muted-foreground">Nenhum registro disponível.</p>}
      {data.payment_count > 50 && <div className="flex flex-wrap gap-2 text-sm items-center">
        <span>Registros {data.payments_offset + 1}–{Math.min(data.payments_offset + 50, data.payment_count)} de {data.payment_count}</span>
        <Button variant="outline" size="sm" disabled={busy || !data.payments_offset} onClick={() => page('payments', Math.max(0, data.payments_offset - 50))}>Registros anteriores</Button>
        <Button variant="outline" size="sm" disabled={busy || data.payments_offset + 50 >= data.payment_count} onClick={() => page('payments', data.payments_offset + 50)}>Próximos registros</Button>
      </div>}
    </section>
    <section className="space-y-3 border-t pt-4" aria-label="Conferências manuais">
      <h3 className="font-semibold">Conferências manuais</h3>
      <p className="text-xs text-muted-foreground">Referência informada pelo operador, sem validação bancária. Conferir ou desfazer não registra pagamento, não estorna valores e não altera o saldo.</p>
      {data.source === 'mock' && <Badge variant="outline">Conferência demo • somente em memória</Badge>}
      {feedback && <p role="status" className="text-sm text-emerald-700">{feedback}</p>}
      {(error || detail.mutationError) && <p role="alert" className="text-sm text-destructive">{error || detail.mutationError}</p>}
      {manage && eligibleEntry && <form onSubmit={submit} className="space-y-3" data-clinic-reconciliation-form="true">
        <h4 className="text-sm font-medium">{head ? 'Corrigir conferência' : 'Nova conferência'}</h4>
        <p className="text-sm">{ids.length} registro(s) selecionado(s) • {money(preview?.sum ?? (selected.length ? selected.reduce((n, p) => n + (p.amount_cents || 0), 0) : 0))}</p>
        <div><Label htmlFor="recon-reference">Código operacional da referência</Label><Input id="recon-reference" value={draft.referenceCode} maxLength={40} disabled={busy} placeholder="Ex.: CAIXA-20261105-01" onChange={e => { setDraft(d => ({ ...d, referenceCode: e.target.value })); changed(); }} /><p className="text-xs text-muted-foreground mt-1">Sem CPF, telefone, dados bancários ou chave PIX.</p></div>
        <div><Label htmlFor="recon-date">Data na referência</Label><Input id="recon-date" type="date" value={draft.referenceDate} disabled={busy} onChange={e => { setDraft(d => ({ ...d, referenceDate: e.target.value })); changed(); }} /></div>
        <div><Label htmlFor="recon-amount">Valor observado na referência</Label><Input id="recon-amount" inputMode="decimal" value={draft.amount} disabled={busy} placeholder="0,00" onChange={e => { setDraft(d => ({ ...d, amount: e.target.value })); changed(); }} /></div>
        {preview && draft.referenceDate && <p className="text-sm" data-reconciliation-preview={preview.state}>{reconciliationStates[preview.state]} • Diferença de valor: {money(preview.difference)}. {!preview.dateMatches && 'Data diferente da referência.'} A decisão só será registrada ao confirmar.</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>{busy ? 'Registrando...' : head ? 'Salvar correção' : preview?.state === 'matched' ? 'Conciliar registros' : 'Registrar divergência'}</Button>
          {head && <Button type="button" variant="ghost" disabled={busy} onClick={reset}>Cancelar correção</Button>}
        </div>
      </form>}
      {!data.conferences.length && <p className="text-sm text-muted-foreground">Nenhuma conferência registrada.</p>}
      {data.conferences.map(c => <div key={c.id} className="rounded-lg border border-border/60 p-3 space-y-2" data-reconciliation-state={c.state}>
        <div className="flex flex-wrap gap-2 items-center"><span className="font-medium text-sm break-all">{c.reference_code}</span><Badge variant="outline">{reconciliationStates[c.state]}</Badge></div>
        <p className="text-sm">{date(c.reference_date)} • {money(c.reference_amount_cents)}</p>
        {c.action !== 'undone' && c.selected_amount_cents != null && <p className="text-xs text-muted-foreground">Total selecionado: {money(c.selected_amount_cents)} • Diferença: {money(c.difference_amount_cents)}</p>}
        {c.action !== 'undone' && <p className="text-xs text-muted-foreground">{c.payments.length} registro(s) • {!c.amount_matches ? 'Diferença de valor. ' : ''}{!c.date_matches ? 'Diferença de data.' : ''}</p>}
        {manage && !['superseded', 'undone'].includes(c.state) && <div className="flex flex-wrap gap-2">{eligibleEntry && <Button variant="outline" size="sm" disabled={busy} onClick={() => correct(c)}>Corrigir</Button>}<Button variant="outline" size="sm" disabled={busy} onClick={() => undo(c)}>Desfazer conferência</Button></div>}
      </div>)}
      {data.history_count > 50 && <div className="flex flex-wrap gap-2 text-sm items-center"><span>Conferências {data.history_offset + 1}–{Math.min(data.history_offset + 50, data.history_count)} de {data.history_count}</span>
        <Button variant="outline" size="sm" disabled={busy || !data.history_offset} onClick={() => page('history', Math.max(0, data.history_offset - 50))}>Conferências anteriores</Button>
        <Button variant="outline" size="sm" disabled={busy || data.history_offset + 50 >= data.history_count} onClick={() => page('history', data.history_offset + 50)}>Próximas conferências</Button>
      </div>}
    </section>
  </div>;
};
export default FinanceReconciliationSection;
