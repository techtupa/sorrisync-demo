import React, { useEffect, useMemo, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarClock,
  MessageCircle,
  RefreshCw,
  Save,
  User,
  UserPlus,
  UserRoundCheck,
  X,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import PatientAvatar from './PatientAvatar';
import TimelineItem from './TimelineItem';
import { InterestBadge, OriginBadge } from './Badges';
import { LEAD_EVENT_TYPES, LEAD_PRIORITIES, LEAD_STATUSES } from '@/repositories/index.js';

const statusOptions = Object.values(LEAD_STATUSES);
const priorityOptions = Object.values(LEAD_PRIORITIES);

const eventIcons = {
  [LEAD_EVENT_TYPES.LEAD_CAPTURED]: UserPlus,
  [LEAD_EVENT_TYPES.CONTACT_LOGGED]: MessageCircle,
  [LEAD_EVENT_TYPES.FOLLOW_UP_SCHEDULED]: CalendarClock,
  [LEAD_EVENT_TYPES.STATUS_CHANGED]: RefreshCw,
  [LEAD_EVENT_TYPES.LEAD_UPDATED]: Save,
  [LEAD_EVENT_TYPES.LEAD_CONVERTED]: UserRoundCheck,
  [LEAD_EVENT_TYPES.LEAD_LOST]: XCircle,
};

const priorityStyles = {
  [LEAD_PRIORITIES.BAIXA]: 'bg-muted text-muted-foreground border-border',
  [LEAD_PRIORITIES.NORMAL]: 'bg-blue-50 text-blue-700 border-blue-100',
  [LEAD_PRIORITIES.ALTA]: 'bg-amber-50 text-amber-700 border-amber-100',
  [LEAD_PRIORITIES.URGENTE]: 'bg-red-50 text-red-700 border-red-100',
};

const getLeadFormData = (lead) => ({
  name: lead?.name || '',
  phone: lead?.phone || '',
  email: lead?.email || '',
  origin: lead?.origin || '',
  interest: lead?.interest || '',
  status: lead?.status || LEAD_STATUSES.NOVO_LEAD,
  priority: lead?.priority || LEAD_PRIORITIES.NORMAL,
  followUpAt: toDateTimeLocal(lead?.followUpAt),
  nextAction: lead?.nextAction || '',
  responsible: lead?.responsible || '',
  estimatedValue: lead?.estimatedValue ?? 0,
  notesSummary: lead?.notesSummary || '',
});

function toDateTimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

const fromDateTimeLocal = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Não informado';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Não informado';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
};

const LeadDrawer = ({
  lead,
  events = [],
  isOpen,
  onClose,
  onUpdateLead,
  onConvertLead,
  onRecordContact,
  options = { origins: [], interests: [], responsibles: [] },
  isUpdating = false,
  isConverting = false,
  isRecording = false,
}) => {
  const [activeTab, setActiveTab] = useState('resumo');
  const [formData, setFormData] = useState(() => getLeadFormData(lead));
  const isConverted = lead?.status === LEAD_STATUSES.CONVERTIDO;
  const isLost = lead?.status === LEAD_STATUSES.PERDIDO;
  const isActionDisabled = isUpdating || isConverting || isRecording || isConverted || isLost;

  const sortedEvents = useMemo(() => {
    return [...events].sort((first, second) => new Date(second.occurredAt) - new Date(first.occurredAt));
  }, [events]);

  useEffect(() => {
    if (!lead || !isOpen) return;

    setActiveTab('resumo');
    setFormData(getLeadFormData(lead));
  }, [lead, isOpen]);

  if (!lead) return null;

  const handleChange = (field, value) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Informe o nome do lead.');
      return;
    }

    try {
      const updatedLead = await onUpdateLead?.(lead.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        origin: formData.origin,
        interest: formData.interest,
        status: formData.status,
        priority: formData.priority,
        followUpAt: fromDateTimeLocal(formData.followUpAt),
        nextAction: formData.nextAction,
        responsible: formData.responsible,
        estimatedValue: Number(formData.estimatedValue || 0),
        notesSummary: formData.notesSummary,
      });
      if (updatedLead) {
        setFormData(getLeadFormData(updatedLead));
      }
      setActiveTab('eventos');
      toast.success('Lead atualizado com sucesso.');
    } catch {
      toast.error('Não foi possível atualizar o lead agora.');
    }
  };

  const handleRecordContact = async () => {
    try {
      await onRecordContact?.(lead, formData.notesSummary || formData.nextAction);
      setActiveTab('eventos');
      toast.success('Contato registrado no histórico do lead.');
    } catch {
      toast.error('Não foi possível registrar o contato agora.');
    }
  };

  const handleConvert = async () => {
    try {
      await onConvertLead?.(lead.id);
      toast.success('Lead convertido em paciente.');
    } catch {
      toast.error('Não foi possível converter o lead agora.');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto p-0 border-l border-border/50">
        <div className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetHeader className="text-left">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <PatientAvatar name={lead.name} initials={lead.name?.slice(0, 2)} className="w-16 h-16 text-lg" />
                <div className="min-w-0">
                  <SheetTitle className="text-2xl font-bold truncate">{lead.name}</SheetTitle>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <OriginBadge origin={lead.origin} />
                    <InterestBadge interest={lead.interest} />
                    <Badge variant="outline" className={`${priorityStyles[lead.priority] || priorityStyles[LEAD_PRIORITIES.NORMAL]} font-medium whitespace-nowrap`}>
                      {lead.priority || LEAD_PRIORITIES.NORMAL}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 bg-card" onClick={handleConvert} disabled={isActionDisabled}>
                <UserRoundCheck className="w-4 h-4 mr-2" /> Converter
              </Button>
            </div>
            <div className="flex gap-2 mt-6">
              <Button className="flex-1 shadow-sm" onClick={handleRecordContact} disabled={isActionDisabled}>
                <MessageCircle className="w-4 h-4 mr-2" /> Registrar Contato
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setActiveTab('dados')}>
                <Save className="w-4 h-4 mr-2" /> Editar Lead
              </Button>
            </div>
          </SheetHeader>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-6">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="eventos">Eventos</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-6 mt-0">
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Próxima Ação</h4>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                    <p className="font-medium text-primary">{lead.nextAction || 'Entrar em contato'}</p>
                    <p className="text-sm text-muted-foreground mt-1">Responsável: {lead.responsible || 'Não informado'}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(lead.estimatedValue)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Follow-up</p>
                    <p className="text-sm font-medium text-foreground">{formatDateTime(lead.followUpAt)}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4">Últimos Eventos</h4>
                <div className="space-y-0">
                  {sortedEvents.slice(0, 4).map((event, index) => (
                    <TimelineItem
                      key={event.id}
                      date={formatDateTime(event.occurredAt)}
                      title={event.title}
                      description={event.description}
                      icon={eventIcons[event.type] || User}
                      isLast={index === Math.min(sortedEvents.length, 4) - 1}
                    />
                  ))}
                  {sortedEvents.length === 0 && (
                    <div className="p-4 rounded-lg border border-border/50 bg-muted/20 text-sm text-muted-foreground">
                      Nenhum evento registrado para este lead.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dados" className="space-y-6 mt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome do Lead *</label>
                  <Input required value={formData.name} onChange={(event) => handleChange('name', event.target.value)} disabled={isConverted} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input value={formData.phone} onChange={(event) => handleChange('phone', event.target.value)} disabled={isConverted} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-mail</label>
                    <Input type="email" value={formData.email} onChange={(event) => handleChange('email', event.target.value)} disabled={isConverted} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Origem</label>
                    <Select value={formData.origin} onValueChange={(value) => handleChange('origin', value)} disabled={isConverted}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {options.origins.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interesse</label>
                    <Select value={formData.interest} onValueChange={(value) => handleChange('interest', value)} disabled={isConverted}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {options.interests.map((interest) => <SelectItem key={interest} value={interest}>{interest}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={formData.status} onValueChange={(value) => handleChange('status', value)} disabled={isConverted}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {statusOptions.filter((status) => status !== LEAD_STATUSES.CONVERTIDO || formData.status === LEAD_STATUSES.CONVERTIDO).map((status) => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select value={formData.priority} onValueChange={(value) => handleChange('priority', value)} disabled={isConverted}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Follow-up</label>
                    <Input type="datetime-local" value={formData.followUpAt} onChange={(event) => handleChange('followUpAt', event.target.value)} disabled={isConverted} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor Estimado</label>
                    <Input type="number" min="0" step="0.01" value={formData.estimatedValue} onChange={(event) => handleChange('estimatedValue', event.target.value)} disabled={isConverted} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Responsável</label>
                  <Select value={formData.responsible} onValueChange={(value) => handleChange('responsible', value)} disabled={isConverted}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {options.responsibles.map((responsible) => <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Próxima Ação</label>
                  <Input value={formData.nextAction} onChange={(event) => handleChange('nextAction', event.target.value)} disabled={isConverted} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Resumo Operacional</label>
                  <Textarea value={formData.notesSummary} onChange={(event) => handleChange('notesSummary', event.target.value)} rows={3} disabled={isConverted} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setFormData(getLeadFormData(lead))} disabled={isUpdating || isConverted}>
                    <X className="w-4 h-4 mr-2" /> Cancelar
                  </Button>
                  <Button type="submit" className="shadow-sm" disabled={isUpdating || isConverted}>
                    <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="eventos" className="mt-0">
              <div className="pt-2">
                {sortedEvents.map((event, index) => (
                  <TimelineItem
                    key={event.id}
                    date={formatDateTime(event.occurredAt)}
                    title={event.title}
                    description={event.description}
                    icon={eventIcons[event.type] || User}
                    isLast={index === sortedEvents.length - 1}
                  />
                ))}
                {sortedEvents.length === 0 && (
                  <div className="p-4 rounded-lg border border-border/50 bg-muted/20 text-sm text-muted-foreground">
                    Nenhum evento registrado para este lead.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LeadDrawer;
