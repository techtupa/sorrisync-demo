
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { MoreHorizontal, MessageCircle, Calendar } from 'lucide-react';
import PatientAvatar from './PatientAvatar';
import { PatientStatusBadge, OriginBadge, InterestBadge } from './Badges';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PatientTable = ({ patients, onViewProfile, onSchedule, canSchedule = false }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { day: '2-digit', month: 'short' }).format(date);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Paciente</TableHead>
            <TableHead className="font-semibold">Contato</TableHead>
            <TableHead className="font-semibold">Origem & Interesse</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Próxima Ação</TableHead>
            <TableHead className="font-semibold text-right">Valor</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((patient) => (
            <TableRow key={patient.id} className="hover:bg-muted/30 transition-colors group cursor-pointer" onClick={() => onViewProfile(patient)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <PatientAvatar name={patient.name} initials={patient.avatarInitials} />
                  <div>
                    <p className="font-medium text-foreground">{patient.name}</p>
                    <p className="text-xs text-muted-foreground">Atualizado em {formatDate(patient.lastInteraction)}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <p className="text-sm text-foreground">{patient.phone}</p>
                <p className="text-xs text-muted-foreground">{patient.email}</p>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-2 items-start">
                  <OriginBadge origin={patient.origin} />
                  <InterestBadge interest={patient.interest} />
                </div>
              </TableCell>
              <TableCell>
                <PatientStatusBadge status={patient.status} />
              </TableCell>
              <TableCell>
                <p className="text-sm font-medium text-foreground">{patient.nextAction}</p>
                <p className="text-xs text-muted-foreground">{patient.responsible}</p>
              </TableCell>
              <TableCell className="text-right font-medium text-foreground">
                {formatCurrency(patient.estimatedValue)}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewProfile(patient)}>Ver Perfil Completo</DropdownMenuItem>
                    <DropdownMenuItem><MessageCircle className="w-4 h-4 mr-2" /> Enviar WhatsApp</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onSchedule?.(patient)} disabled={!canSchedule}>
                      <Calendar className="w-4 h-4 mr-2" /> Agendar Consulta
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {patients.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                Nenhum paciente encontrado com os filtros atuais.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PatientTable;
