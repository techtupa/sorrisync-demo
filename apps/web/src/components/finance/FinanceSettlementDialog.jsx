import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createClinicFinanceSettlementRequestId,
  todayInSaoPaulo,
  validateClinicFinancePayment,
  parseClinicFinanceAmount,
} from '@/repositories/index.js';

const LABELS = {
  payable: {
    action: 'Registrar pagamento',
    description: 'Registre um valor pago desta conta. O saldo restante será atualizado sem transferência ou integração bancária.',
    subject: 'pagamento',
  },
  receivable: {
    action: 'Registrar recebimento',
    description: 'Registre um valor recebido desta conta. O saldo restante será atualizado sem cobrança ou integração bancária.',
    subject: 'recebimento',
  },
};

const formatCurrency = (amountCents) => new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
}).format((amountCents || 0) / 100);
const formatDate = (dateKey) => dateKey
  ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00Z`))
  : '—';

const FinanceSettlementDialog = ({ isOpen, entry, submitting, settlementError, onClose, onConfirm }) => {
  const labels = LABELS[entry?.type] || LABELS.receivable;
  const [settlementDate, setSettlementDate] = useState(todayInSaoPaulo());
  const [amount, setAmount] = useState('');
  const [requestId, setRequestId] = useState(() => createClinicFinanceSettlementRequestId());
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setSettlementDate(todayInSaoPaulo());
    setAmount(Number.isSafeInteger(entry?.remainingAmountCents) ? (entry.remainingAmountCents / 100).toFixed(2).replace('.', ',') : '');
    setRequestId(createClinicFinanceSettlementRequestId());
    setLocalError(null);
  }, [entry?.id, isOpen]);

  const handleConfirm = async () => {
    const amountCents = parseClinicFinanceAmount(amount);
    const validation = validateClinicFinancePayment({ entry, requestId, settlementDate, amountCents });
    if (!validation.valid) {
      setLocalError(validation.errors[0]);
      return;
    }
    setLocalError(null);
    try {
      await onConfirm({ requestId, settlementDate, amountCents });
    } catch (error) {
      setLocalError(error?.userMessage || 'Não foi possível confirmar o registro. Confira o histórico antes de tentar novamente.');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto" data-clinic-finance-settlement-dialog={entry?.type || 'unknown'}>
        <DialogHeader>
          <DialogTitle>{labels.action}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <fieldset disabled={submitting} className="space-y-4 py-2">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Lançamento</p>
            <p className="font-semibold mt-1">{entry?.categoryLabel || '—'}</p>
            <p className="text-sm text-muted-foreground mt-1">{entry?.counterpartyLabel || '—'}</p>
            {entry?.description && <p className="text-sm mt-3">{entry.description}</p>}
            <dl className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border/60">
              <div><dt className="text-xs text-muted-foreground">Valor integral</dt><dd className="font-semibold mt-1">{formatCurrency(entry?.amountCents)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Saldo restante</dt><dd className="font-semibold mt-1">{formatCurrency(entry?.remainingAmountCents)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Vencimento</dt><dd className="font-semibold mt-1">{formatDate(entry?.dueDate)}</dd></div>
            </dl>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clinic-finance-payment-amount">{entry?.type === 'payable' ? 'Amount paid now' : 'Amount received now'}</Label>
            <Input id="clinic-finance-payment-amount" inputMode="decimal" value={amount} onChange={event => { setAmount(event.target.value); setRequestId(createClinicFinanceSettlementRequestId()); }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinic-finance-settlement-date">Data da baixa</Label>
            <Input
              id="clinic-finance-settlement-date"
              type="date"
              max={todayInSaoPaulo()}
              value={settlementDate}
              onChange={(event) => { setSettlementDate(event.target.value); setRequestId(createClinicFinanceSettlementRequestId()); }}
            />
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
              <p>O registro reduz o saldo. Informar todo o saldo restante quita a conta. O valor total do lançamento permanece preservado.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Esta ação apenas registra a baixa no SorriSync. Nenhuma movimentação bancária será executada.</p>

          {(localError || settlementError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 flex gap-2" role="alert">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{localError || settlementError}
            </div>
          )}
        </fieldset>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Voltar</Button>
          <Button onClick={handleConfirm} disabled={submitting}>{submitting ? 'Registrando...' : labels.action}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FinanceSettlementDialog;
