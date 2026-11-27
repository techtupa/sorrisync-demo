import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ODONTOGRAM_FINDING_LABELS,
  ODONTOGRAM_RESOLUTION_REASON_LABELS,
  ODONTOGRAM_SURFACE_LABELS,
} from '@/repositories/index.js';

const formatDateTime = (value) => value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const FindingCard = ({ finding, canManage, onResolve }) => {
  const active = finding.lifecycleStatus === 'active';
  return (
    <div className={`rounded-xl border p-4 ${active ? 'border-amber-200 bg-amber-50/70' : 'border-border bg-muted/30'}`} data-odontogram-finding={finding.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">{ODONTOGRAM_FINDING_LABELS[finding.findingCode]}</p>
        <Badge variant={active ? 'default' : 'secondary'}>{active ? 'Ativo' : 'Resolvido'}</Badge>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div><dt className="inline text-muted-foreground">Superfície: </dt><dd className="inline">{ODONTOGRAM_SURFACE_LABELS[finding.surfaceCode]}</dd></div>
        <div><dt className="inline text-muted-foreground">Registrado por: </dt><dd className="inline">{finding.authorDisplayName}</dd></div>
        <div><dt className="inline text-muted-foreground">Data: </dt><dd className="inline">{formatDateTime(finding.createdAt)}</dd></div>
        {!active && (
          <>
            <div><dt className="inline text-muted-foreground">Resolução: </dt><dd className="inline">{ODONTOGRAM_RESOLUTION_REASON_LABELS[finding.resolutionReasonCode]}</dd></div>
            <div><dt className="inline text-muted-foreground">Resolvido por: </dt><dd className="inline">{finding.resolverDisplayName}</dd></div>
            <div><dt className="inline text-muted-foreground">Data da resolução: </dt><dd className="inline">{formatDateTime(finding.resolvedAt)}</dd></div>
          </>
        )}
      </dl>
      {active && canManage && <Button className="mt-4" variant="outline" size="sm" onClick={() => onResolve(finding)}>Resolver</Button>}
    </div>
  );
};

const OdontogramToothDrawer = ({ open, onOpenChange, toothCode, findings, canManage, mutationInFlight, onAdd, onResolve }) => {
  const active = findings.filter((finding) => finding.lifecycleStatus === 'active');
  const resolved = findings.filter((finding) => finding.lifecycleStatus === 'resolved');
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg" data-odontogram-tooth-drawer>
        <SheetHeader>
          <SheetTitle>Tooth {toothCode}</SheetTitle>
          <SheetDescription>Achados estruturados e histórico de resoluções deste dente permanente.</SheetDescription>
        </SheetHeader>
        <div className="mt-5 flex items-center justify-between gap-3 border-y py-4">
          <p className="text-sm text-muted-foreground">{active.length} active • {resolved.length} resolved</p>
          {canManage && <Button size="sm" onClick={onAdd} disabled={mutationInFlight}>Record finding</Button>}
        </div>
        <ScrollArea className="mt-4 h-[calc(100vh-210px)] pr-4">
          {findings.length === 0 ? (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Nenhum achado foi registrado para este dente. Isso não representa confirmação de saúde clínica.
            </div>
          ) : (
            <div className="space-y-4">
              {active.length > 0 && <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Achados ativos</p>}
              {active.map((finding) => <FindingCard key={finding.id} finding={finding} canManage={canManage} onResolve={onResolve} />)}
              {resolved.length > 0 && <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico resolvido</p>}
              {resolved.map((finding) => <FindingCard key={finding.id} finding={finding} canManage={false} onResolve={onResolve} />)}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default OdontogramToothDrawer;
