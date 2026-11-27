import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useClinicFinanceReconciliation } from '@/hooks/useClinicFinanceReconciliation.js';
import FinanceReconciliationSection from './FinanceReconciliationSection.jsx';

const formatCurrency = (amountCents) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((amountCents || 0) / 100);
const formatDate = (dateKey) => dateKey ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00Z`)) : '—';
const formatTimestamp = (value) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const Detail = ({ label, value }) => (
  <div className="flex justify-between gap-4 py-3 border-b border-border/50">
    <span className="text-sm text-muted-foreground">{label}</span><span className="text-sm font-medium text-right">{value}</span>
  </div>
);

const FinanceEntryDetails = ({ selected, title, canManage, onReversePayment }) => {
  const detail = useClinicFinanceReconciliation(selected);
  const item = detail.data?.entry;
  return <>
          <SheetHeader className="text-left mb-6">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Detalhes e histórico da clínica atual. Registros ativos podem ser estornados por um perfil autorizado.</SheetDescription>
          </SheetHeader>
          {detail.loading && <p role="status" className="text-sm text-muted-foreground">Carregando detalhes e conferências...</p>}
          <Button variant="outline" disabled={detail.loading || detail.busy} onClick={() => detail.load()}>Atualizar histórico</Button>
          {detail.readError && <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{detail.readError}</p></div>}
          {item && !detail.loading && <>
          <div className="p-4 bg-muted/30 rounded-xl border border-border/50 mb-5">
            <p className="text-sm text-muted-foreground mb-1">Valor</p><p className="text-2xl font-bold tabular-nums">{formatCurrency(item.amountCents)}</p>
          </div>
          <Detail label="Contraparte" value={item.counterpartyLabel} />
          <Detail label="Categoria" value={item.categoryLabel} />
          <Detail label="Total registrado ativo" value={item.paidAmountCents == null ? 'Valor histórico não registrado' : formatCurrency(item.paidAmountCents)} />
          <Detail label="Saldo restante" value={item.remainingAmountCents == null ? 'Indisponível' : formatCurrency(item.remainingAmountCents)} />
          <Detail label="Status" value={<Badge variant="outline">{item.statusLabel}</Badge>} />
          {item.paymentSettledDate && <Detail label="Data da quitação" value={formatDate(item.paymentSettledDate)} />}
          <Detail label="Vencimento" value={formatDate(item.dueDate)} />
          <Detail label="Competência" value={formatDate(item.competenceMonth)} />
          {item.description && <Detail label="Descrição" value={item.description} />}
          <Detail label="Criado em" value={formatTimestamp(item.createdAt)} />
          <Detail label="Atualizado em" value={formatTimestamp(item.updatedAt)} />
          </>}
          <FinanceReconciliationSection detail={{ ...detail, canManage: canManage && detail.canManage }} onReversePayment={onReversePayment} />
  </>;
};
const FinanceEntryDrawer = ({ item, isOpen, onClose, title, canManage = false, onReversePayment }) => (
  <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <SheetContent className="w-full sm:max-w-md overflow-y-auto" data-clinic-finance-drawer="readonly">
      {item && <FinanceEntryDetails key={`${item.tenantId}:${item.type}:${item.id}`} selected={item} title={title} canManage={canManage} onReversePayment={onReversePayment} />}
    </SheetContent>
  </Sheet>
);

export default FinanceEntryDrawer;
