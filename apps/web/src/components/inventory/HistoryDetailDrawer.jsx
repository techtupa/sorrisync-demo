
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { History, Calendar, Database, Info, FileText, CheckCircle2 } from 'lucide-react';

const HistoryDetailDrawer = ({ isOpen, onOpenChange, event }) => {
  if (!event) return null;

  const getEventBadge = (type) => {
    switch (type) {
      case 'Entrada':
      case 'Reposição recebida': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{type}</Badge>;
      case 'Saída': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{type}</Badge>;
      case 'Reposição planejada': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{type}</Badge>;
      case 'Alerta gerado': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{type}</Badge>;
      default: return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{type}</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col h-full bg-background border-l border-border/50">

        <div className="p-6 bg-muted/10 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-background">{event.id}</Badge>
            {getEventBadge(event.type)}
          </div>
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="text-xl font-bold text-foreground">{event.title}</SheetTitle>
            <p className="text-sm font-medium text-primary flex items-center gap-1.5">
              <FileText className="w-4 h-4" /> {event.item}
            </p>
          </SheetHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Data/Hora</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                {new Date(event.date).toLocaleString('en-US')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Categoria</p>
              <p className="text-sm font-medium text-foreground">{event.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Tipo</p>
              <p className="text-sm font-medium text-foreground">{event.type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Origem</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Database className="w-4 h-4 text-muted-foreground" /> {event.origin || 'Registro operacional'}
              </p>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div>
            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" /> Descrição do Evento
            </h4>
            <div className="p-4 bg-muted/20 border border-border/50 rounded-lg text-sm text-foreground leading-relaxed">
              {event.details}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Impacto no Sistema
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                Registro armazenado com sucesso na trilha de auditoria do tenant.
              </li>
              {event.type === 'Alerta gerado' && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  Alerta disparado na Central Operacional.
                </li>
              )}
              {event.type.includes('Reposição') && (
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  Sem ação fora da Frente J nesta fase.
                </li>
              )}
            </ul>
          </div>

        </div>

        <div className="p-6 bg-muted/10 border-t border-border/50 flex gap-3 shrink-0">
          <Button variant="outline" className="flex-1" disabled>
            Visualizar Origem
          </Button>
          <Button className="flex-1 shadow-sm" disabled>
            Marcar Revisado
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HistoryDetailDrawer;
