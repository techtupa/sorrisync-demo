import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Ban, CheckCircle2, Eye, FilterX, Pencil, RotateCcw, Search } from 'lucide-react';
import { filterClinicFinanceEntries, isClinicFinanceEntryMutable } from '@/repositories/index.js';

const statusClasses = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',
  draft: 'bg-slate-50 text-slate-700 border-slate-200',
  canceled: 'bg-muted text-muted-foreground border-border',
  unknown: 'bg-orange-50 text-orange-700 border-orange-200',
};

const formatCurrency = (amountCents) => Number.isSafeInteger(amountCents) ? new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', minimumFractionDigits: 2,
}).format(amountCents / 100) : 'Indisponível';

const formatDate = (dateKey) => dateKey
  ? new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }).format(new Date(`${dateKey}T12:00:00Z`))
  : '—';

const FinanceReadonlyTable = ({
  entries = [],
  emptyLabel,
  canManage = false,
  onOpenEntry,
  onEditEntry,
  onCancelEntry,
  onSettleEntry,
  onReverseSettlement,
  filters,
  onFiltersChange,
}) => {
  const { search, status, duePeriod } = filters;
  const filtered = useMemo(() => filterClinicFinanceEntries(entries, { search, status, duePeriod }), [duePeriod, entries, search, status]);

  const clearFilters = () => {
    onFiltersChange({ search: '', status: 'all', duePeriod: 'all' });
  };

  return (
    <div className="space-y-5" data-clinic-finance-readonly-table="true">
      <div className="flex flex-col xl:flex-row gap-3 p-4 bg-card border border-border/50 rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
            placeholder="Buscar por categoria, contraparte ou descrição"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(value) => onFiltersChange({ ...filters, status: value })}>
          <SelectTrigger className="w-full xl:w-[190px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="open">Em aberto</SelectItem>
            <SelectItem value="overdue">Vencidos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="canceled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={duePeriod} onValueChange={(value) => onFiltersChange({ ...filters, duePeriod: value })}>
          <SelectTrigger className="w-full xl:w-[210px]"><SelectValue placeholder="Vencimento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os vencimentos</SelectItem>
            <SelectItem value="overdue">Já vencidos</SelectItem>
            <SelectItem value="next30">Próximos 30 dias</SelectItem>
            <SelectItem value="future">Após 30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
          <FilterX className="w-4 h-4 mr-2" /> Limpar
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-premium">
        <div className="overflow-x-auto custom-scrollbar">
          <Table className="min-w-[820px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead>Contraparte</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Saldo restante</TableHead>
                <TableHead className="w-[250px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium max-w-[220px] truncate">{entry.counterpartyLabel}</TableCell>
                  <TableCell><Badge variant="outline">{entry.categoryLabel}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(entry.competenceMonth)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(entry.dueDate)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusClasses[entry.effectiveStatus] || statusClasses.unknown}>{entry.statusLabel}</Badge>
                    {entry.isPartial && <Badge variant="outline" className="ml-1">Parcial</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(entry.remainingAmountCents)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => onOpenEntry?.(entry)}><Eye className="w-4 h-4 mr-2" /> Ver</Button>
                      {canManage && isClinicFinanceEntryMutable(entry) && (
                        <div className="contents" data-clinic-finance-write-actions="manual-only">
                          <Button variant="ghost" size="sm" onClick={() => onEditEntry?.(entry)}><Pencil className="w-4 h-4 mr-2" /> Editar</Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onCancelEntry?.(entry)}><Ban className="w-4 h-4 mr-2" /> Cancelar</Button>
                        </div>
                      )}
                      {canManage && entry.canRecordPayment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-700 hover:text-emerald-800"
                          data-clinic-finance-settlement-action={entry.type}
                          onClick={() => onSettleEntry?.(entry)}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> {entry.type === 'payable' ? 'Registrar pagamento' : 'Registrar recebimento'}
                        </Button>
                      )}
                      {canManage && entry.canReversePayment && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-700 hover:text-amber-800"
                          data-clinic-finance-settlement-reversal-action={entry.type}
                          onClick={() => onReverseSettlement?.(entry)}
                        >
                          <RotateCcw className="w-4 h-4 mr-2" /> Histórico
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length && (
                <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">{emptyLabel}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default FinanceReadonlyTable;
