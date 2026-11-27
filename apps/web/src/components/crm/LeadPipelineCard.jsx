import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, MessageCircle, Phone, UserRoundCheck } from 'lucide-react';
import PatientAvatar from './PatientAvatar';
import { InterestBadge, OriginBadge } from './Badges';
import { LEAD_PRIORITIES, LEAD_STATUSES } from '@/repositories/index.js';

const statusStyles = {
  [LEAD_STATUSES.NOVO_LEAD]: 'bg-blue-100 text-blue-800 border-blue-200',
  [LEAD_STATUSES.CONTATO_INICIADO]: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  [LEAD_STATUSES.AVALIACAO_MARCADA]: 'bg-purple-100 text-purple-800 border-purple-200',
  [LEAD_STATUSES.CONVERTIDO]: 'bg-green-100 text-green-800 border-green-200',
  [LEAD_STATUSES.PERDIDO]: 'bg-slate-800 text-slate-100 border-slate-700',
};

const priorityStyles = {
  [LEAD_PRIORITIES.BAIXA]: 'bg-muted text-muted-foreground border-border',
  [LEAD_PRIORITIES.NORMAL]: 'bg-blue-50 text-blue-700 border-blue-100',
  [LEAD_PRIORITIES.ALTA]: 'bg-amber-50 text-amber-700 border-amber-100',
  [LEAD_PRIORITIES.URGENTE]: 'bg-red-50 text-red-700 border-red-100',
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Sem follow-up';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sem follow-up';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const LeadPipelineCard = ({ lead, onOpenLead }) => {
  const isConverted = lead.status === LEAD_STATUSES.CONVERTIDO;

  return (
    <Card className="hover:shadow-premium transition-all duration-300 border-border/50 group">
      <CardContent className="p-5">
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <PatientAvatar name={lead.name} initials={lead.name?.slice(0, 2)} className="w-12 h-12" />
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground truncate">{lead.name}</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 min-w-0">
                <Phone className="w-3 h-3 shrink-0" />
                <span className="truncate">{lead.phone || 'Sem telefone'}</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`${statusStyles[lead.status] || 'bg-muted text-muted-foreground'} font-medium whitespace-nowrap shrink-0`}>
            {lead.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4 mb-5">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Origem</p>
            <OriginBadge origin={lead.origin} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Interesse</p>
            <InterestBadge interest={lead.interest} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
            <Badge variant="outline" className={`${priorityStyles[lead.priority] || priorityStyles[LEAD_PRIORITIES.NORMAL]} font-medium whitespace-nowrap`}>
              {lead.priority || LEAD_PRIORITIES.NORMAL}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(lead.estimatedValue)}</p>
          </div>
        </div>

        <div className="bg-muted/30 p-3 rounded-lg mb-5 border border-border/50">
          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
            <CalendarClock className="w-3 h-3" /> {formatDateTime(lead.followUpAt)}
          </p>
          <p className="text-sm font-medium text-foreground leading-snug">{lead.nextAction || 'Entrar em contato'}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{lead.responsible || 'Responsável não informado'}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" className="flex-1 shadow-sm" onClick={() => onOpenLead(lead)}>
            {isConverted ? (
              <>
                <UserRoundCheck className="w-4 h-4 mr-2" /> Ver conversão
              </>
            ) : (
              'Ver lead'
            )}
          </Button>
          <Button variant="outline" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => onOpenLead(lead)}>
            <MessageCircle className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadPipelineCard;
