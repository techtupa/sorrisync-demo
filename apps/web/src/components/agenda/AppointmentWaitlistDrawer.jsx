import React from 'react';
import { CalendarPlus, ExternalLink, Loader2, Pencil, Plus, Search, UserRoundX } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  APPOINTMENT_WAITLIST_PERIOD_LABELS,
  APPOINTMENT_WAITLIST_PRIORITY_LABELS,
  APPOINTMENT_WAITLIST_SOURCE_LABELS,
} from '@/repositories/index.js';

const formatDate = (value) => {
  if (!value) return 'Sem limite';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const formatCreatedAt = (value) => value
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(value))
  : 'Data indisponível';

const AppointmentWaitlistDrawer = ({
  canManage = false,
  entries = [],
  error = '',
  filters,
  isOpen,
  loading = false,
  onAdd,
  onClose,
  onDismiss,
  onEdit,
  onOpenCrm,
  onSchedule,
  onUpdateFilters,
  services = [],
}) => (
  <Sheet open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
    <SheetContent className="w-full overflow-y-auto border-l border-border/50 p-0 sm:max-w-[720px]">
      <SheetHeader className="sticky top-0 z-10 border-b bg-background/95 p-6 text-left backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <SheetTitle className="text-2xl">Lista de espera</SheetTitle>
            <p className="mt-1 text-sm text-muted-foreground">{entries.length} {entries.length === 1 ? 'entrada aberta' : 'entradas abertas'}</p>
          </div>
          {canManage && <Button onClick={onAdd}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>}
        </div>
      </SheetHeader>

      <div className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar na lista" value={filters.search} onChange={(event) => onUpdateFilters({ ...filters, search: event.target.value })} />
          </div>
          <Select value={filters.serviceId} onValueChange={(serviceId) => onUpdateFilters({ ...filters, serviceId })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os serviços</SelectItem>{services.map((service) => <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.period} onValueChange={(period) => onUpdateFilters({ ...filters, period })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos os períodos</SelectItem>{Object.entries(APPOINTMENT_WAITLIST_PERIOD_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.priority} onValueChange={(priority) => onUpdateFilters({ ...filters, priority })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as prioridades</SelectItem>{Object.entries(APPOINTMENT_WAITLIST_PRIORITY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        {loading && <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando lista...</div>}
        {!loading && !error && entries.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="font-semibold">Nenhuma entrada aberta</p>
            <p className="mt-1 text-sm text-muted-foreground">A lista não reserva horários e não envia contatos automaticamente.</p>
          </div>
        )}

        {!loading && entries.map((entry) => (
          <article key={entry.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm" data-waitlist-entry-id={entry.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{entry.sourceDisplayName}</p>
                  <Badge variant="outline">{APPOINTMENT_WAITLIST_SOURCE_LABELS[entry.sourceType]}</Badge>
                  {entry.priority === 'priority' && <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Prioridade</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{entry.serviceLabel}</p>
              </div>
              <span className="text-xs text-muted-foreground">Criado em {formatCreatedAt(entry.createdAt)}</span>
            </div>

            <div className="mt-3 grid gap-2 rounded-lg bg-muted/30 p-3 text-xs sm:grid-cols-2">
              <p><span className="font-medium">Período:</span> {APPOINTMENT_WAITLIST_PERIOD_LABELS[entry.preferredPeriod]}</p>
              <p><span className="font-medium">Profissional:</span> {entry.preferredProfessionalLabel || 'Sem preferência'}</p>
              <p><span className="font-medium">A partir de:</span> {formatDate(entry.earliestDate)}</p>
              <p><span className="font-medium">Até:</span> {formatDate(entry.latestDate)}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenCrm?.(entry)}><ExternalLink className="mr-2 h-4 w-4" /> Abrir no CRM</Button>
              {canManage && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onEdit?.(entry)}><Pencil className="mr-2 h-4 w-4" /> Editar preferências</Button>
                  <Button size="sm" onClick={() => onSchedule?.(entry)}><CalendarPlus className="mr-2 h-4 w-4" /> Agendar</Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDismiss?.(entry)}><UserRoundX className="mr-2 h-4 w-4" /> Dispensar</Button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </SheetContent>
  </Sheet>
);

export default AppointmentWaitlistDrawer;
