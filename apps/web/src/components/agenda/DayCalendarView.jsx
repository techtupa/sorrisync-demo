
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
import { SCHEDULE_STATUSES as STATUSES } from '@/repositories/index.js';

const DEFAULT_PROFESSIONALS = ['Dr. Avery Chen', 'Dr. Carlos Silva', 'Dra. Mariana Lopes'];
const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENT_TIME_START_HOUR = 8;
const CURRENT_TIME_END_HOUR = 18;

const statusColors = {
  [STATUSES.CONFIRMADA]: 'bg-green-100 text-green-700 border-green-200',
  [STATUSES.AGENDADA]: 'bg-blue-100 text-blue-700 border-blue-200',
  [STATUSES.PENDENTE]: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  [STATUSES.EM_ATENDIMENTO]: 'bg-orange-100 text-orange-700 border-orange-200',
  [STATUSES.FINALIZADA]: 'bg-gray-100 text-gray-700 border-gray-200',
  [STATUSES.CANCELADA]: 'bg-red-100 text-red-700 border-red-200'
};

const formatDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getCurrentTimeOffsetMinutes = () => {
  const now = new Date();
  return ((now.getHours() - CURRENT_TIME_START_HOUR) * 60) + now.getMinutes();
};

const DayCalendarView = ({ appointments, blocks = [], professionals = DEFAULT_PROFESSIONALS, selectedDate = '', onOpenDrawer }) => {
  const hours = Array.from({ length: 11 }, (_, i) => i + CURRENT_TIME_START_HOUR); // 08:00 to 18:00
  const visibleProfessionals = professionals.length ? professionals.slice(0, 3) : DEFAULT_PROFESSIONALS;
  const pxPerMinute = 1.5; // 1 min = 1.5px (60 mins = 90px height)
  const currentTimeOffsetMinutes = getCurrentTimeOffsetMinutes();
  const shouldShowCurrentTime = (
    DATE_PARAM_PATTERN.test(selectedDate) &&
    selectedDate === formatDateInputValue(new Date()) &&
    currentTimeOffsetMinutes >= 0 &&
    currentTimeOffsetMinutes <= ((CURRENT_TIME_END_HOUR - CURRENT_TIME_START_HOUR) * 60)
  );

  // Utility to parse "HH:MM" to minutes from 08:00
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;

    const [h, m] = timeStr.split(':').map(Number);

    if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;

    return (h - CURRENT_TIME_START_HOUR) * 60 + m;
  };

  return (
    <div className="relative bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden flex flex-col h-[700px]">
      {/* Header */}
      <div className="flex bg-muted/30 border-b border-border/50 p-4 shrink-0">
        <div className="w-16 shrink-0"></div>
        <div className="flex-1 grid grid-cols-3 gap-4">
          {visibleProfessionals.map((professional) => (
            <div key={professional} className="text-center font-semibold text-sm">{professional}</div>
          ))}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto relative custom-scrollbar">
        <div className="flex min-h-max relative" style={{ height: `${10 * 60 * pxPerMinute}px` }}>

          {/* Time Column */}
          <div className="w-16 shrink-0 border-r border-border/50 relative bg-muted/10">
            {hours.map(h => (
              <div key={h} className="absolute w-full text-right pr-2 text-xs font-medium text-muted-foreground" style={{ top: `${(h - CURRENT_TIME_START_HOUR) * 60 * pxPerMinute - 8}px` }}>
                {h.toString().padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Grid Lines */}
          <div className="absolute inset-0 left-16 pointer-events-none">
            {hours.map(h => (
              <div key={h} className="absolute w-full border-t border-border/50" style={{ top: `${(h - CURRENT_TIME_START_HOUR) * 60 * pxPerMinute}px` }}></div>
            ))}
            {hours.slice(0, -1).map(h => (
              <div key={h + '-half'} className="absolute w-full border-t border-border/50 border-dashed opacity-50" style={{ top: `${((h - CURRENT_TIME_START_HOUR) * 60 + 30) * pxPerMinute}px` }}></div>
            ))}
            {/* Column Dividers */}
            <div className="absolute inset-y-0 w-1/3 left-0 border-r border-border/30"></div>
            <div className="absolute inset-y-0 w-1/3 left-1/3 border-r border-border/30"></div>
          </div>

          {shouldShowCurrentTime && (
            <div className="absolute w-full left-16 z-20 pointer-events-none flex items-center" style={{ top: `${currentTimeOffsetMinutes * pxPerMinute}px` }}>
              <div className="w-2 h-2 rounded-full bg-destructive -ml-1"></div>
              <div className="flex-1 border-t-2 border-destructive/80"></div>
            </div>
          )}

          {/* Appointments & Blocks */}
          <div className="flex-1 relative z-10 grid grid-cols-3 gap-2 px-2">
            {visibleProfessionals.map((profName, colIdx) => {

              const colAppointments = appointments.filter(a => a.professional === profName);
              const colBlocks = blocks.filter(b => b.professional === profName);

              return (
                <div key={colIdx} className="relative h-full">
                  {/* Blocks */}
                  {colBlocks.map(block => {
                    const top = parseTime(block.time) * pxPerMinute;
                    const height = block.duration * pxPerMinute;
                    return (
                      <div
                        key={block.id}
                        className="absolute inset-x-0 mx-1 bg-muted/40 border border-muted-foreground/20 rounded-md flex flex-col items-center justify-center pointer-events-none"
                        style={{ top: `${top}px`, height: `${height}px` }}
                      >
                        <span className="text-xs font-medium text-muted-foreground">{block.reason}</span>
                      </div>
                    );
                  })}

                  {/* Appointments */}
                  {colAppointments.map(app => {
                    const top = parseTime(app.time) * pxPerMinute;
                    const height = app.duration * pxPerMinute;
                    const isSmall = app.duration <= 30;

                    return (
                      <div
                        key={app.id}
                        onClick={() => onOpenDrawer(app)}
                        className={`absolute inset-x-0 mx-1 rounded-lg border shadow-sm p-2 cursor-pointer hover:shadow-md hover:brightness-95 transition-all overflow-hidden flex flex-col ${app.status === STATUSES.CANCELADA ? 'bg-background opacity-60 grayscale' : 'bg-card'}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          borderLeftWidth: '4px',
                          borderLeftColor: app.status === STATUSES.FINALIZADA ? '#9ca3af' :
                                           app.status === STATUSES.EM_ATENDIMENTO ? '#f97316' :
                                           app.status === STATUSES.CONFIRMADA ? '#16a34a' :
                                           app.status === STATUSES.CANCELADA ? '#ef4444' : '#3b82f6'
                        }}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-xs font-bold text-foreground leading-none truncate pr-2">{app.patient}</p>
                          {!isSmall && <p className="text-[10px] tabular-nums text-muted-foreground">{app.time}</p>}
                        </div>

                        <p className="text-[11px] text-muted-foreground leading-tight truncate mb-1">{app.procedure}</p>

                        {!isSmall && (
                          <div className="mt-auto flex justify-between items-end">
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <MapPin className="w-3 h-3" /> {app.room.split(' ')[0]}
                            </div>
                            <Badge className={`text-[9px] px-1.5 py-0 border-0 ${statusColors[app.status]}`}>
                              {app.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayCalendarView;
