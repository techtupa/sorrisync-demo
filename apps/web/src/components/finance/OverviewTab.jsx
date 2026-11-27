import React from 'react';
import { CalendarClock, CircleDollarSign, HandCoins, ReceiptText, TriangleAlert, WalletCards } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FinanceStatCard from './FinanceStatCard.jsx';
import { CLINIC_FINANCE_STATUS_LABELS } from '@/repositories/index.js';

const formatCurrency = (amountCents) => Number.isSafeInteger(amountCents) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amountCents / 100) : 'Indisponível';
const formatDate = (dateKey) => dateKey ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00Z`)) : '—';

const OverviewTab = ({ finance }) => {
  const { summary, receivables, payables } = finance;
  const upcoming = [...receivables, ...payables]
    .filter((entry) => entry.isOpen && !entry.isOverdue)
    .sort((first, second) => first.dueDate.localeCompare(second.dueDate))
    .slice(0, 6);

  return (
    <div className="space-y-6" data-clinic-finance-overview="readonly">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <FinanceStatCard icon={HandCoins} value={formatCurrency(summary.receivableOpenCents)} label="A receber em aberto" description={`${summary.receivablesCount} registro(s) carregado(s)`} />
        <FinanceStatCard icon={WalletCards} value={formatCurrency(summary.payableOpenCents)} label="A pagar em aberto" description={`${summary.payablesCount} registro(s) carregado(s)`} />
        <FinanceStatCard icon={TriangleAlert} value={formatCurrency(summary.receivableOverdueCents == null || summary.payableOverdueCents == null ? null : summary.receivableOverdueCents + summary.payableOverdueCents)} label="Valores vencidos" description={`${summary.receivablesOverdueCount + summary.payablesOverdueCount} vencimento(s)`} />
        <FinanceStatCard icon={CircleDollarSign} value={formatCurrency(summary.operationalBalanceCents)} label="Saldo operacional em aberto" description="A receber menos a pagar; não representa lucro" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CalendarClock className="w-5 h-5 text-primary" />Próximos vencimentos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-4 rounded-lg border border-border/50 p-3">
                <div className="min-w-0"><p className="font-medium truncate">{entry.categoryLabel}</p><p className="text-sm text-muted-foreground truncate">{entry.counterpartyLabel} • {formatDate(entry.dueDate)}</p></div>
                <p className="font-semibold tabular-nums shrink-0">{formatCurrency(entry.remainingAmountCents)}</p>
              </div>
            ))}
            {!upcoming.length && <p className="text-sm text-muted-foreground">Nenhum vencimento futuro carregado.</p>}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ReceiptText className="w-5 h-5 text-primary" />Distribuição por status</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(summary.statusCounts).map(([status, count]) => <Badge key={status} variant="outline" className="px-3 py-1.5">{CLINIC_FINANCE_STATUS_LABELS[status] || CLINIC_FINANCE_STATUS_LABELS.unknown}: {count}</Badge>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewTab;
