
import React, { useEffect, useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Calendar, FileText, FileHeart, Phone, Mail, MapPin, User, Tag, CheckCircle2, Pencil, Save, X } from 'lucide-react';
import PatientAvatar from './PatientAvatar';
import { PatientStatusBadge, OriginBadge } from './Badges';
import TimelineItem from './TimelineItem';
import { usePatientInteractions } from '@/hooks/usePatientInteractions.js';
import { STATUSES, ORIGINS, INTERESTS, RESPONSIBLES } from '@/repositories/index.js';
import { toast } from 'sonner';

const INTERACTION_ICONS = {
  message: MessageCircle,
  user: User,
  check: CheckCircle2,
  file: FileText,
  calendar: Calendar,
  note: FileText,
};

const defaultOptions = {
  statuses: Object.values(STATUSES),
  origins: Object.values(ORIGINS),
  interests: Object.values(INTERESTS),
  responsibles: Object.values(RESPONSIBLES),
};

const getEditFormData = (patient) => ({
  name: patient?.name || '',
  phone: patient?.phone || '',
  email: patient?.email || '',
  cpf: patient?.cpf || '',
  birthdate: patient?.birthdate || '',
  address: patient?.address || '',
  origin: patient?.origin || '',
  interest: patient?.interest || '',
  status: patient?.status || '',
  responsible: patient?.responsible || '',
  nextAction: patient?.nextAction || '',
  estimatedValue: patient?.estimatedValue ?? 0,
});

const APPOINTMENT_LINK_SOURCE_LABELS = {
  patient_id: 'Vínculo por patient_id',
  phone: 'Reconhecida por telefone',
  name: 'Reconhecida por nome',
};

const formatAppointmentDateLabel = (appointment) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(appointment?.date || '')) {
    const [year, month, day] = appointment.date.split('-').map(Number);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(year, month - 1, day, 12));
  }

  const date = new Date(appointment?.starts_at);

  if (Number.isNaN(date.getTime())) {
    return 'Data não informada';
  }

  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

const PatientDrawer = ({
  patient,
  isOpen,
  onClose,
  onSave,
  onSchedule,
  canSchedule = false,
  appointmentMatches = [],
  onOpenAppointment,
  canOpenAppointment = false,
  onOpenClinicalRecord,
  canOpenClinicalRecord = false,
  options = defaultOptions,
  isSaving = false,
}) => {
  const [activeTab, setActiveTab] = useState('resumo');
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => getEditFormData(patient));
  const { latestInteractions, journeyInteractions } = usePatientInteractions(patient);

  useEffect(() => {
    if (!patient || !isOpen) return;

    setActiveTab('resumo');
    setIsEditing(false);
    setFormData(getEditFormData(patient));
  }, [patient, isOpen]);

  if (!patient) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatBirthdate = (dateString) => {
    if (!dateString) {
      return 'Não informado';
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'Não informado';
    }

    return date.toLocaleDateString('en-US');
  };

  const handleEdit = () => {
    setFormData(getEditFormData(patient));
    setActiveTab('dados');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(getEditFormData(patient));
    setIsEditing(false);
  };

  const handleChange = (field, value) => {
    setFormData((currentFormData) => ({
      ...currentFormData,
      [field]: value,
    }));
  };

  const handleSubmitEdit = async (event) => {
    event.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Informe o nome do paciente.');
      return;
    }

    try {
      await onSave?.(patient.id, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        cpf: formData.cpf,
        birthdate: formData.birthdate || null,
        address: formData.address,
        origin: formData.origin,
        interest: formData.interest,
        status: formData.status,
        responsible: formData.responsible,
        nextAction: formData.nextAction,
        estimatedValue: Number(formData.estimatedValue || 0),
        lastInteraction: new Date().toISOString(),
      });
      setIsEditing(false);
      toast.success('Paciente atualizado com sucesso.');
    } catch {
      toast.error('Não foi possível atualizar o paciente agora.');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl overflow-y-auto p-0 border-l border-border/50">
        <div className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
          <SheetHeader className="text-left">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <PatientAvatar name={patient.name} initials={patient.avatarInitials} className="w-16 h-16 text-lg" />
                <div>
                  <SheetTitle className="text-2xl font-bold">{patient.name}</SheetTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <PatientStatusBadge status={patient.status} />
                    <OriginBadge origin={patient.origin} />
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="shrink-0 bg-card" onClick={handleEdit} disabled={isSaving}>
                <Pencil className="w-4 h-4 mr-2" /> Editar
              </Button>
            </div>
            <div className="flex gap-2 mt-6">
              <Button className="flex-1 shadow-sm"><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onSchedule?.(patient)}
                disabled={!canSchedule || isSaving}
              >
                <Calendar className="w-4 h-4 mr-2" /> Agendar
              </Button>
            </div>
            {canOpenClinicalRecord && (
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full bg-card"
                onClick={() => onOpenClinicalRecord?.(patient)}
                disabled={isSaving}
              >
                <FileHeart className="w-4 h-4 mr-2" /> Abrir prontuário
              </Button>
            )}
          </SheetHeader>
        </div>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="dados">Dados</TabsTrigger>
              <TabsTrigger value="jornada">Jornada</TabsTrigger>
              <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="space-y-6 mt-0">
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5">
                  <h4 className="text-sm font-semibold text-foreground mb-4">Próxima Ação</h4>
                  <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl">
                    <p className="font-medium text-primary">{patient.nextAction}</p>
                    <p className="text-sm text-muted-foreground mt-1">Responsável: {patient.responsible}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Agenda operacional</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Consultas reconhecidas na Agenda para este paciente.
                    </p>
                  </div>

                  {!canOpenAppointment ? (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                      Agenda indisponível para este perfil.
                    </div>
                  ) : appointmentMatches.length ? (
                    <div className="space-y-3">
                      {appointmentMatches.map((appointment) => (
                        <div key={appointment.id} className="rounded-lg border border-border/50 bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {appointment.procedure || 'Consulta'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatAppointmentDateLabel(appointment)} às {appointment.time || 'horário não informado'}
                              </p>
                              <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                {APPOINTMENT_LINK_SOURCE_LABELS[appointment.crmLinkSource] || 'Reconhecida no CRM'}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0"
                              disabled={!canOpenAppointment || isSaving}
                              onClick={() => onOpenAppointment?.(appointment)}
                            >
                              <Calendar className="w-4 h-4 mr-2" /> Abrir na Agenda
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                      Nenhuma consulta reconhecida na Agenda.
                    </div>
                  )}

                  <p className="text-[10px] font-medium text-muted-foreground/80">
                    Reconhecimento por telefone ou nome não grava patient_id inferido.
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Valor Estimado</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrency(patient.estimatedValue)}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Interesse Principal</p>
                    <p className="text-sm font-medium text-foreground">{patient.interest}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-4">Últimas Interações</h4>
                <div className="space-y-0">
                  {latestInteractions.map((interaction, index) => (
                    <TimelineItem
                      key={interaction.id}
                      date={interaction.date}
                      title={interaction.title}
                      description={interaction.description}
                      icon={INTERACTION_ICONS[interaction.iconType] || User}
                      isLast={index === latestInteractions.length - 1}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dados" className="space-y-6 mt-0">
              {isEditing ? (
                <form onSubmit={handleSubmitEdit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nome Completo *</label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Telefone</label>
                      <Input
                        value={formData.phone}
                        onChange={(event) => handleChange('phone', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">E-mail</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(event) => handleChange('email', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Origem</label>
                      <Select value={formData.origin} onValueChange={(value) => handleChange('origin', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {options.origins.map((origin) => <SelectItem key={origin} value={origin}>{origin}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Interesse</label>
                      <Select value={formData.interest} onValueChange={(value) => handleChange('interest', value)}>
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
                      <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {options.statuses.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Responsável</label>
                      <Select value={formData.responsible} onValueChange={(value) => handleChange('responsible', value)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {options.responsibles.map((responsible) => <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Próxima Ação</label>
                    <Input
                      value={formData.nextAction}
                      onChange={(event) => handleChange('nextAction', event.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Valor Estimado</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.estimatedValue}
                        onChange={(event) => handleChange('estimatedValue', event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data de Nascimento</label>
                      <Input
                        type="date"
                        value={formData.birthdate || ''}
                        onChange={(event) => handleChange('birthdate', event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">CPF</label>
                    <Input
                      value={formData.cpf}
                      onChange={(event) => handleChange('cpf', event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Endereço</label>
                    <Textarea
                      value={formData.address}
                      onChange={(event) => handleChange('address', event.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                    <Button type="submit" className="shadow-sm" disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" /> Salvar Alterações
                    </Button>
                  </div>
                </form>
              ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{patient.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-sm font-medium">{patient.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">CPF</p>
                    <p className="text-sm font-medium">{patient.cpf || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Nascimento</p>
                    <p className="text-sm font-medium">{formatBirthdate(patient.birthdate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="text-sm font-medium">{patient.address || 'Não informado'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Tag className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Responsável</p>
                    <p className="text-sm font-medium">{patient.responsible}</p>
                  </div>
                </div>
              </div>
              )}
            </TabsContent>

            <TabsContent value="jornada" className="mt-0">
              <div className="pt-2">
                {journeyInteractions.map((interaction, index) => (
                  <TimelineItem
                    key={interaction.id}
                    date={interaction.date}
                    title={interaction.title}
                    description={interaction.description}
                    icon={INTERACTION_ICONS[interaction.iconType] || User}
                    isLast={index === journeyInteractions.length - 1}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="financeiro" className="space-y-6 mt-0">
              <Card className="border-border/50 shadow-sm bg-muted/20">
                <CardContent className="p-6 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-1">Módulo Financeiro</h3>
                  <p className="text-sm text-muted-foreground">
                    O histórico financeiro detalhado deste paciente estará disponível em breve.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PatientDrawer;
