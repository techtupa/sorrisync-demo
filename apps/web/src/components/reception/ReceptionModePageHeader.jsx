import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Info, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTenantDisplay } from '@/hooks/useTenantDisplay.js';

const ReceptionModePageHeader = ({
  canOpenCrm = false,
  onOpenAgenda,
  onOpenCrm,
  sourceLabel = 'Agenda',
  todayLabel = '',
}) => {
  const tenantDisplay = useTenantDisplay();

  return (
    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl"
      >
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Modo Recepção
          </h1>
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-xs px-3 py-1">
            Clínica: {tenantDisplay.displayName}
          </Badge>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
            Role: Front desk
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-3 py-1">
            Source: {sourceLabel}
          </Badge>
        </div>
        <p className="text-lg text-muted-foreground text-balance mb-2">
          Acompanhe a rotina de hoje com consultas, bloqueios, profissionais, salas e status operacionais vindos da Agenda.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{tenantDisplay.tenantLabel}</span>
          <span>•</span>
          <span>{todayLabel || 'Dia operacional atual'}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Info className="w-3 h-3" />
            Check-in separado da Agenda, sem fila própria ou mudança automática de status.
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex flex-wrap gap-2 shrink-0"
      >
        <Button variant="outline" className="bg-card hover:bg-muted shadow-sm" onClick={onOpenAgenda}>
          <CalendarDays className="w-4 h-4 mr-2" /> Abrir Agenda
        </Button>
        <Button
          variant="outline"
          className="bg-card hover:bg-muted shadow-sm"
          onClick={onOpenCrm}
          disabled={!canOpenCrm}
        >
          <Users className="w-4 h-4 mr-2" /> Abrir CRM
        </Button>
      </motion.div>
    </div>
  );
};

export default ReceptionModePageHeader;
