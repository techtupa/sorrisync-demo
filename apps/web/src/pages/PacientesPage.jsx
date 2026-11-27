
import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout.jsx';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CalendarClock, CheckCircle2, Plus, Download, Info, Activity, RefreshCw, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { DEMO_MESSAGES } from '@/lib/DemoModeUtils.js';
import { usePatientCrmOptions } from '@/hooks/usePatientCrmOptions.js';
import { usePatientLeads } from '@/hooks/usePatientLeads.js';
import { usePatients } from '@/hooks/usePatients.js';
import { useSchedule } from '@/hooks/useSchedule.js';
import { createAppointmentByTenant, fetchScheduleByTenant, filterPatients } from '@/repositories/index.js';
import { getPatientAppointmentMatchSource } from '@/lib/crmAgendaLinking.js';
import {
  buildCrmAgendaNavigationPath,
  getCrmAgendaAppointmentSortValue,
  resolveCrmLeadSearchParam,
  resolveCrmPatientSearchParam,
} from '@/lib/crmAgendaNavigation.js';

import PatientTable from '@/components/crm/PatientTable.jsx';
import CRMInsightCard from '@/components/crm/CRMInsightCard.jsx';
import LeadPipelineBoard from '@/components/crm/LeadPipelineBoard.jsx';
import FilterBar from '@/components/crm/FilterBar.jsx';
import NewPatientModal from '@/components/crm/NewPatientModal.jsx';
import NewLeadModal from '@/components/crm/NewLeadModal.jsx';
import NewAppointmentModal from '@/components/agenda/NewAppointmentModal.jsx';
import PatientDrawer from '@/components/crm/PatientDrawer.jsx';
import LeadDrawer from '@/components/crm/LeadDrawer.jsx';
import EmptyState from '@/components/EmptyState.jsx';

const buildAppointmentDraftFromPatient = (patient) => ({
  patientId: patient?.id || null,
  patient: patient?.name || '',
  phone: patient?.phone || '',
  origin: patient?.origin || 'CRM',
  procedure: patient?.interest || 'Avaliação inicial',
  notes: patient?.nextAction ? `CRM: ${patient.nextAction}` : '',
});

const buildPatientAppointmentMatches = (patient, appointments = []) => {
  if (!patient) {
    return [];
  }

  return appointments
    .map((appointment) => ({
      ...appointment,
      crmLinkSource: getPatientAppointmentMatchSource(patient, appointment),
    }))
    .filter((appointment) => appointment.crmLinkSource !== 'none')
    .sort((first, second) => getCrmAgendaAppointmentSortValue(first) - getCrmAgendaAppointmentSortValue(second));
};

const PacientesPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentTenantId, canAccessModule, hasPermission } = useAuth();
  const { patients, createPatient, updatePatient, updating, syncPatient } = usePatients();
  const {
    events: leadEvents,
    leads,
    summary: leadSummary,
    loading: loadingLeads,
    creating: creatingLead,
    updating: updatingLead,
    converting,
    recordingEvent,
    createLead,
    updateLead,
    convertLeadToPatient,
    recordLeadContact,
  } = usePatientLeads();
  const crmOptions = usePatientCrmOptions();
  const [activeTab, setActiveTab] = useState('base');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    origin: '',
    interest: '',
    responsible: '',
  });
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState(false);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isPatientDrawerOpen, setIsPatientDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isLeadDrawerOpen, setIsLeadDrawerOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [appointmentDraft, setAppointmentDraft] = useState(null);
  const [scheduleOptions, setScheduleOptions] = useState(null);
  const isLeadTab = activeTab === 'funil';
  const canReadAppointments = canAccessModule('mod_agenda') && hasPermission('appointments.read');
  const canCreateAppointments = canAccessModule('mod_agenda') && hasPermission('appointments.manage');
  const canOpenClinicalRecord = canAccessModule('mod_prontuario')
    && hasPermission('patients.read')
    && hasPermission('clinical_records.read');
  const {
    appointments: tenantAppointments = [],
    clearSuggestedSlots,
    loadSuggestedSlots,
    slotsError,
    slotsLoading,
    suggestedSlots,
  } = useSchedule({ enabled: canReadAppointments });
  const requestedPatientId = resolveCrmPatientSearchParam(searchParams);
  const requestedLeadId = resolveCrmLeadSearchParam(searchParams);
  const tenantPatients = useMemo(() => filterPatients(patients, filters), [patients, filters]);
  const selectedPatientAppointmentMatches = useMemo(
    () => buildPatientAppointmentMatches(selectedPatient, tenantAppointments).slice(0, 3),
    [selectedPatient, tenantAppointments],
  );
  const selectedLeadEvents = useMemo(() => {
    return selectedLead ? leadEvents.filter((event) => event.leadId === selectedLead.id) : [];
  }, [leadEvents, selectedLead?.id]);

  const handleExport = () => {
    toast.success('Exportação de dados iniciada apenas nesta demonstração.');
  };

  const handleOpenPatient = (patient) => {
    setSelectedPatient(patient);
    setIsPatientDrawerOpen(true);
  };

  const handleOpenClinicalRecord = (patient) => {
    if (!canOpenClinicalRecord || !patient?.id) return;
    setIsPatientDrawerOpen(false);
    navigate(`/prontuario?patient=${encodeURIComponent(patient.id)}`);
  };

  const handleOpenLead = (lead) => {
    setSelectedLead(lead);
    setIsLeadDrawerOpen(true);
  };

  useEffect(() => {
    if (!requestedPatientId) return;

    const targetPatient = patients.find((patient) => patient.id === requestedPatientId);
    if (!targetPatient) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('patient');

    setActiveTab('base');
    setSelectedPatient(targetPatient);
    setIsPatientDrawerOpen(true);
    setSearchParams(nextParams, { replace: true });
  }, [patients, requestedPatientId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!requestedLeadId) return;

    const targetLead = leads.find((lead) => lead.id === requestedLeadId);
    if (!targetLead) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('lead');

    setActiveTab('funil');
    setSelectedLead(targetLead);
    setIsLeadDrawerOpen(true);
    setSearchParams(nextParams, { replace: true });
  }, [leads, requestedLeadId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!selectedPatient) return;

    const nextSelectedPatient = patients.find((patient) => patient.id === selectedPatient.id);
    if (nextSelectedPatient && nextSelectedPatient !== selectedPatient) {
      setSelectedPatient(nextSelectedPatient);
      return;
    }

    if (!nextSelectedPatient) {
      setIsPatientDrawerOpen(false);
      setSelectedPatient(null);
    }
  }, [patients, selectedPatient?.id]);

  useEffect(() => {
    if (!selectedLead) return;

    const nextSelectedLead = leads.find((lead) => lead.id === selectedLead.id);
    if (nextSelectedLead && nextSelectedLead !== selectedLead) {
      setSelectedLead(nextSelectedLead);
      return;
    }

    if (!nextSelectedLead) {
      setIsLeadDrawerOpen(false);
      setSelectedLead(null);
    }
  }, [leads, selectedLead?.id]);

  const handleSavePatient = async (patient) => {
    await createPatient(patient);
  };

  const handleSaveLead = async (lead) => {
    const createdLead = await createLead(lead);
    setActiveTab('funil');
    setSelectedLead(createdLead);
    setIsLeadDrawerOpen(true);
    return createdLead;
  };

  const handlePrimaryCreate = () => {
    if (isLeadTab) {
      setIsNewLeadModalOpen(true);
      return;
    }

    setIsNewPatientModalOpen(true);
  };

  const handleUpdatePatient = async (patientId, patientPatch) => {
    const updatedPatient = await updatePatient(patientId, patientPatch);
    setSelectedPatient(updatedPatient);
    return updatedPatient;
  };

  const handleUpdateLead = async (leadId, leadPatch) => {
    const updatedLead = await updateLead(leadId, leadPatch);
    setSelectedLead(updatedLead);
    return updatedLead;
  };

  const handleRecordLeadContact = async (lead, description) => {
    const updatedLead = await recordLeadContact(
      lead.id,
      description || lead.nextAction || 'Contato operacional registrado',
    );

    setSelectedLead(updatedLead);
    return updatedLead;
  };

  const handleOpenAppointmentFromPatient = async (patient) => {
    if (!patient?.id) return;

    if (!canCreateAppointments) {
      toast.error('Acesso à Agenda não disponível para este perfil.');
      return;
    }

    setAppointmentDraft(buildAppointmentDraftFromPatient(patient));
    setScheduleOptions(null);
    setIsAppointmentModalOpen(true);

    try {
      const schedule = await fetchScheduleByTenant(currentTenantId);
      setScheduleOptions({
        professionals: schedule?.professionals || [],
        professionalOptions: schedule?.professionalOptions || [],
        rooms: schedule?.rooms || [],
        roomOptions: schedule?.roomOptions || [],
        statuses: schedule?.statuses || [],
      });
    } catch {
      setScheduleOptions(null);
    }
  };

  const handleSaveAppointmentFromCrm = async (appointment) => {
    const createdAppointment = await createAppointmentByTenant(currentTenantId, appointment);

    setIsAppointmentModalOpen(false);
    setAppointmentDraft(null);
    setIsPatientDrawerOpen(false);
    setTimeout(() => setSelectedPatient(null), 300);
    navigate(buildCrmAgendaNavigationPath(createdAppointment));

    return createdAppointment;
  };

  const handleOpenExistingAppointment = (appointment) => {
    if (!appointment?.id) return;

    if (!canReadAppointments) {
      toast.error('Acesso à Agenda não disponível para este perfil.');
      return;
    }

    setIsPatientDrawerOpen(false);
    setTimeout(() => setSelectedPatient(null), 300);
    navigate(buildCrmAgendaNavigationPath(appointment));
  };

  const handleConvertLead = async (leadId) => {
    const conversion = await convertLeadToPatient(leadId);
    const convertedPatient = syncPatient(conversion.patient) || conversion.patient;
    setSelectedLead(conversion.lead);
    setIsLeadDrawerOpen(false);
    setActiveTab('base');

    if (canCreateAppointments && convertedPatient?.id) {
      setSelectedPatient(convertedPatient);
      await handleOpenAppointmentFromPatient(convertedPatient);
    }

    setTimeout(() => setSelectedLead(null), 300);
    return conversion;
  };

  return (
    <>
      <Helmet>
        <title>Pacientes & CRM | SorriSync</title>
      </Helmet>

      <Layout>
        {/* Microcopy Banner */}
        <div className="demo-warning-panel mb-6">
           <Info className="w-5 h-5 shrink-0 mt-0.5" />
           <p className="text-sm leading-relaxed">{DEMO_MESSAGES.patientsNote}</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2 flex items-center gap-3">
              Pacientes & CRM
            </h1>
            <p className="text-lg text-muted-foreground text-balance">
              Gerencie seus pacientes, leads e funil de conversão.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex gap-3">
            <Button variant="outline" className="shadow-sm bg-card" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Exportar
            </Button>
            <Button className="shadow-premium" disabled={!hasPermission('patients.manage')} onClick={handlePrimaryCreate}>
              <Plus className="w-4 h-4 mr-2" /> {isLeadTab ? 'Novo Lead' : 'Novo Paciente'}
            </Button>
          </motion.div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <TabsList className="w-full sm:w-auto justify-start bg-muted/50 p-1 overflow-x-auto custom-scrollbar">
              <TabsTrigger value="base" className="text-sm px-4 py-2">Base de Pacientes</TabsTrigger>
              <TabsTrigger value="funil" className="text-sm px-4 py-2">Funil de Vendas (Leads)</TabsTrigger>
              <TabsTrigger value="retorno" className="text-sm px-4 py-2">Lista de Retorno</TabsTrigger>
            </TabsList>

            {activeTab === 'base' && <FilterBar filters={filters} setFilters={setFilters} options={crmOptions} />}
          </div>

          <TabsContent value="base" className="m-0 border-0 p-0">
             <PatientTable patients={tenantPatients}
               onViewProfile={handleOpenPatient}
               onSchedule={handleOpenAppointmentFromPatient}
               canSchedule={canCreateAppointments}
             />
          </TabsContent>

          <TabsContent value="funil" className="m-0 border-0 p-0">
             {loadingLeads && (
               <div className="mb-4 flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                 <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                 <span>Atualizando dados do funil para o tenant atual.</span>
               </div>
             )}
             <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
               <CRMInsightCard
                 icon={Users}
                 text="Leads em aberto"
                 metric={String(leadSummary.open ?? 0)}
                 colorClass="text-blue-600 bg-blue-50"
               />
               <CRMInsightCard
                 icon={CalendarClock}
                 text="Follow-ups agendados"
                 metric={String(leadSummary.scheduledFollowUps ?? 0)}
                 colorClass="text-purple-600 bg-purple-50"
               />
               <CRMInsightCard
                 icon={AlertCircle}
                 text="Prioridade urgente"
                 metric={String(leadSummary.urgent ?? 0)}
                 colorClass="text-rose-600 bg-rose-50"
               />
               <CRMInsightCard
                 icon={CheckCircle2}
                 text="Convertidos"
                 metric={String(leadSummary.converted ?? 0)}
                 colorClass="text-emerald-600 bg-emerald-50"
               />
             </div>
             <LeadPipelineBoard leads={leads} onOpenLead={handleOpenLead} />
          </TabsContent>

          <TabsContent value="retorno" className="m-0 border-0 p-0 mt-4">
             <EmptyState
               icon={Activity}
               title="Lista de Retorno Preventivo"
               description="O algoritmo de rechamada automática de pacientes para manutenções preventivas será implementado via Supabase Edge Functions na fase Codex."
               ctaText="Simular automação (Mock)"
             />
          </TabsContent>
        </Tabs>

        {/* Modals & Drawers */}
        <NewPatientModal
          isOpen={isNewPatientModalOpen}
          onClose={() => setIsNewPatientModalOpen(false)}
          onSave={handleSavePatient}
          options={crmOptions}
        />

        <NewLeadModal
          isOpen={isNewLeadModalOpen}
          onClose={() => setIsNewLeadModalOpen(false)}
          onSave={handleSaveLead}
          options={crmOptions}
          isSaving={creatingLead}
        />

        <NewAppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => {
            setIsAppointmentModalOpen(false);
            setAppointmentDraft(null);
            setScheduleOptions(null);
          }}
          onSave={handleSaveAppointmentFromCrm}
          initialAppointment={appointmentDraft}
          professionals={scheduleOptions?.professionalOptions}
          professionalResources={scheduleOptions?.professionals}
          rooms={scheduleOptions?.roomOptions}
          roomResources={scheduleOptions?.rooms}
          statuses={scheduleOptions?.statuses}
          clearSuggestedSlots={clearSuggestedSlots}
          loadSuggestedSlots={loadSuggestedSlots}
          slots={suggestedSlots}
          slotsError={slotsError}
          slotsLoading={slotsLoading}
        />

        <PatientDrawer
          patient={selectedPatient}
          isOpen={isPatientDrawerOpen}
          onSave={handleUpdatePatient}
          onSchedule={handleOpenAppointmentFromPatient}
          canSchedule={canCreateAppointments}
          appointmentMatches={selectedPatientAppointmentMatches}
          onOpenAppointment={handleOpenExistingAppointment}
          canOpenAppointment={canReadAppointments}
          onOpenClinicalRecord={handleOpenClinicalRecord}
          canOpenClinicalRecord={canOpenClinicalRecord}
          options={crmOptions}
          isSaving={updating}
          onClose={() => {
            setIsPatientDrawerOpen(false);
            setTimeout(() => setSelectedPatient(null), 300);
          }}
        />

        <LeadDrawer
          lead={selectedLead}
          events={selectedLeadEvents}
          isOpen={isLeadDrawerOpen}
          onUpdateLead={handleUpdateLead}
          onConvertLead={handleConvertLead}
          onRecordContact={handleRecordLeadContact}
          options={crmOptions}
          isUpdating={updatingLead}
          isConverting={converting}
          isRecording={recordingEvent}
          onClose={() => {
            setIsLeadDrawerOpen(false);
            setTimeout(() => setSelectedLead(null), 300);
          }}
        />

      </Layout>
    </>
  );
};

export default PacientesPage;
