
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SCHEDULE_STATUSES as STATUSES } from '@/repositories/index.js';

const statusColors = {
  [STATUSES.CONFIRMADA]: 'bg-green-100 text-green-700',
  [STATUSES.AGENDADA]: 'bg-blue-100 text-blue-700',
  [STATUSES.PENDENTE]: 'bg-yellow-100 text-yellow-700',
  [STATUSES.EM_ATENDIMENTO]: 'bg-orange-100 text-orange-700',
  [STATUSES.FINALIZADA]: 'bg-gray-100 text-gray-700',
  [STATUSES.CANCELADA]: 'bg-red-100 text-red-700'
};

const WeekCalendarView = ({ appointments, onOpenDrawer }) => {
  const days = [
    { date: '25 Seg', isToday: false },
    { date: '26 Ter', isToday: false },
    { date: '27 Qua', isToday: false },
    { date: '28 Qui', isToday: false },
    { date: '29 Sex', isToday: false },
    { date: '30 Sáb', isToday: true }
  ];

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="grid grid-cols-6 border-b border-border/50 bg-muted/30">
        {days.map((day, idx) => (
          <div key={idx} className={`p-4 text-center border-r last:border-0 border-border/50 ${day.isToday ? 'bg-primary/5' : ''}`}>
            <p className={`font-semibold text-sm ${day.isToday ? 'text-primary' : 'text-foreground'}`}>{day.date}</p>
            {day.isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1"></div>}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-6 divide-x divide-border/50 overflow-y-auto custom-scrollbar">
        {days.map((day, colIdx) => (
          <div key={colIdx} className={`p-2 space-y-2 min-h-full ${day.isToday ? 'bg-primary/5' : ''}`}>
            {/* Mock: Only populate today (colIdx 5) with our mock data, others empty or random */}
            {day.isToday ? (
              appointments.map(app => (
                <div
                  key={app.id}
                  onClick={() => onOpenDrawer(app)}
                  className="bg-card border border-border/50 rounded-lg p-2.5 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 rounded">{app.time}</span>
                    <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 border-0 ${statusColors[app.status]}`}>
                      {app.status === STATUSES.EM_ATENDIMENTO ? 'Atendimento' : app.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-foreground leading-tight mb-0.5 truncate group-hover:text-primary transition-colors">{app.patient}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.procedure}</p>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-20 border border-dashed border-border/60 rounded-lg">
                <span className="text-xs text-muted-foreground opacity-50">Sem consultas</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeekCalendarView;
