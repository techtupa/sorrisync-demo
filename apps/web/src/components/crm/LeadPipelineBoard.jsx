import React from 'react';
import { LEAD_PRIORITIES, LEAD_STATUSES } from '@/repositories/index.js';
import LeadPipelineCard from './LeadPipelineCard';

const columns = [
  { id: LEAD_STATUSES.NOVO_LEAD, title: 'Novos Leads', color: 'bg-blue-50 border-blue-200' },
  { id: LEAD_STATUSES.CONTATO_INICIADO, title: 'Contato Iniciado', color: 'bg-cyan-50 border-cyan-200' },
  { id: LEAD_STATUSES.AVALIACAO_MARCADA, title: 'Avaliações', color: 'bg-purple-50 border-purple-200' },
  { id: LEAD_STATUSES.CONVERTIDO, title: 'Convertidos', color: 'bg-green-50 border-green-200' },
  { id: LEAD_STATUSES.PERDIDO, title: 'Perdidos', color: 'bg-slate-50 border-slate-200' },
];

const priorityOrder = {
  [LEAD_PRIORITIES.URGENTE]: 0,
  [LEAD_PRIORITIES.ALTA]: 1,
  [LEAD_PRIORITIES.NORMAL]: 2,
  [LEAD_PRIORITIES.BAIXA]: 3,
};

const getTimeRank = (value, fallback = Number.MAX_SAFE_INTEGER) => {
  if (!value) return fallback;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? fallback : timestamp;
};

const sortLeadsForColumn = (columnLeads) => {
  return [...columnLeads].sort((firstLead, secondLead) => {
    const priorityDelta = (priorityOrder[firstLead.priority] ?? priorityOrder[LEAD_PRIORITIES.NORMAL])
      - (priorityOrder[secondLead.priority] ?? priorityOrder[LEAD_PRIORITIES.NORMAL]);

    if (priorityDelta !== 0) return priorityDelta;

    const followUpDelta = getTimeRank(firstLead.followUpAt) - getTimeRank(secondLead.followUpAt);
    if (followUpDelta !== 0) return followUpDelta;

    return getTimeRank(secondLead.capturedAt, 0) - getTimeRank(firstLead.capturedAt, 0);
  });
};

const LeadPipelineBoard = ({ leads, onOpenLead }) => {
  return (
    <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar min-h-[600px]">
      {columns.map((column) => {
        const columnLeads = sortLeadsForColumn(leads.filter((lead) => lead.status === column.id));

        return (
          <div key={column.id} className="flex-shrink-0 w-[320px] flex flex-col">
            <div className={`px-4 py-3 rounded-t-xl border-t border-l border-r ${column.color} flex justify-between items-center`}>
              <h3 className="font-semibold text-sm text-foreground">{column.title}</h3>
              <span className="bg-background/50 text-foreground text-xs font-bold px-2 py-1 rounded-full">
                {columnLeads.length}
              </span>
            </div>
            <div className="flex-1 bg-muted/30 border border-border/50 rounded-b-xl p-3 flex flex-col gap-3">
              {columnLeads.map((lead) => (
                <LeadPipelineCard key={lead.id} lead={lead} onOpenLead={onOpenLead} />
              ))}
              {columnLeads.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-border/60 rounded-lg">
                  <p className="text-xs text-muted-foreground">Nenhum lead</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadPipelineBoard;
