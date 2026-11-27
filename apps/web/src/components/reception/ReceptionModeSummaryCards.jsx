import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock3, PlayCircle, Slash, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const cards = [
  {
    id: 'total',
    label: 'Consultas hoje',
    description: 'Leitura da Agenda',
    icon: CalendarDays,
    metric: 'total',
    colorClass: 'text-primary',
  },
  {
    id: 'toConfirm',
    label: 'A confirmar',
    description: 'Agendada ou pendente',
    icon: Clock3,
    metric: 'toConfirm',
    colorClass: 'text-amber-600',
  },
  {
    id: 'confirmed',
    label: 'Confirmadas',
    description: 'Status confirmado',
    icon: CheckCircle2,
    metric: 'confirmed',
    colorClass: 'text-emerald-600',
  },
  {
    id: 'inProgress',
    label: 'Em atendimento',
    description: 'Status ativo na Agenda',
    icon: PlayCircle,
    metric: 'inProgress',
    colorClass: 'text-orange-600',
  },
  {
    id: 'finished',
    label: 'Finalizadas',
    description: 'Atendimento encerrado',
    icon: Slash,
    metric: 'finished',
    colorClass: 'text-slate-600',
  },
  {
    id: 'canceled',
    label: 'Canceladas',
    description: 'Status cancelado',
    icon: XCircle,
    metric: 'canceled',
    colorClass: 'text-red-600',
  },
];

const ReceptionModeSummaryCards = ({ metrics = {}, sourceLabel = 'Agenda' }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
    {cards.map((item, idx) => {
      const Icon = item.icon;

      return (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
        >
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 h-full relative overflow-hidden group">
            <CardContent className="p-3 flex flex-col justify-center h-full min-h-[92px]">
              <Icon className={`absolute -right-2 -bottom-2 w-10 h-10 opacity-10 group-hover:scale-110 transition-transform ${item.colorClass}`} />
              <p className={`text-2xl font-bold leading-tight relative z-10 tabular-nums ${item.colorClass}`}>
                {Number(metrics[item.metric] || 0)}
              </p>
              <p className="text-[10px] font-bold text-foreground mt-1 relative z-10 leading-tight">{item.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 relative z-10 leading-tight">
                {item.id === 'total' ? sourceLabel : item.description}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      );
    })}
  </div>
);

export default ReceptionModeSummaryCards;
