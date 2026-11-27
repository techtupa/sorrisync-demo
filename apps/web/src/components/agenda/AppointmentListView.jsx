
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, CalendarCheck, MapPin, CheckCircle, Clock, XCircle, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SCHEDULE_STATUSES as STATUSES } from '@/repositories/index.js';

const statusConfig = {
  [STATUSES.CONFIRMADA]: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  [STATUSES.AGENDADA]: { color: 'bg-blue-100 text-blue-700', icon: CalendarCheck },
  [STATUSES.PENDENTE]: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  [STATUSES.EM_ATENDIMENTO]: { color: 'bg-orange-100 text-orange-700', icon: User },
  [STATUSES.FINALIZADA]: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  [STATUSES.CANCELADA]: { color: 'bg-red-100 text-red-700', icon: XCircle }
};

const AppointmentListView = ({ appointments, onOpenDrawer, onUpdateStatus }) => {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold w-[100px]">Horário</TableHead>
            <TableHead className="font-semibold">Paciente</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Procedimento</TableHead>
            <TableHead className="font-semibold hidden lg:table-cell">Profissional / Sala</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appointments.map((app) => {
            const StatusIcon = statusConfig[app.status]?.icon || Clock;

            return (
              <TableRow
                key={app.id}
                className="hover:bg-muted/30 transition-colors group cursor-pointer"
                onClick={() => onOpenDrawer(app)}
              >
                <TableCell>
                  <span className="font-semibold tabular-nums bg-muted/50 px-2 py-1 rounded-md">{app.time}</span>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-foreground">{app.patient}</p>
                  <p className="text-xs text-muted-foreground md:hidden">{app.procedure}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm">{app.procedure}</p>
                  <p className="text-xs text-muted-foreground">{app.origin}</p>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <p className="text-sm font-medium">{app.professional}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {app.room}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`border-0 flex items-center gap-1.5 w-fit ${statusConfig[app.status]?.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {app.status}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onOpenDrawer(app)}>Ver detalhes</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onUpdateStatus?.(app, STATUSES.CONFIRMADA)}>Confirmar consulta</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => onUpdateStatus?.(app, STATUSES.CANCELADA)}>Cancelar consulta</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {appointments.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                Nenhuma consulta encontrada com os filtros atuais.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AppointmentListView;
