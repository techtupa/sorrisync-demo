import React, { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, FileHeart, Loader2, Plus, RefreshCw } from 'lucide-react';
import Layout from '@/components/Layout.jsx';
import ClinicalAddendumModal from '@/components/clinical/ClinicalAddendumModal.jsx';
import ClinicalEntryModal from '@/components/clinical/ClinicalEntryModal.jsx';
import OdontogramPanel from '@/components/clinical/OdontogramPanel.jsx';
import TreatmentPlanPanel from '@/components/clinical/TreatmentPlanPanel.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useClinicalRecord } from '@/hooks/useClinicalRecord.js';
import { usePatients } from '@/hooks/usePatients.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { CLINICAL_ENTRY_TYPES } from '@/repositories/index.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const formatDateTime = (value) => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const ClinicalRecordPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { canAccessModule, hasPermission } = useAuth();
  const requestedPatientId = searchParams.get('patient') || '';
  const patientId = uuidPattern.test(requestedPatientId) ? requestedPatientId : '';
  const canReadTreatmentPlan = canAccessModule('mod_tratamentos')
    && hasPermission('patients.read')
    && hasPermission('services.read')
    && hasPermission('clinical_records.read')
    && hasPermission('treatment_plans.read');
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'odontograma'
    ? 'odontograma'
    : requestedTab === 'plano' && canReadTreatmentPlan ? 'plano' : 'evolucoes';
  const { patients, loading: patientsLoading } = usePatients();
  const patient = useMemo(() => patients.find((item) => item.id === patientId) || null, [patientId, patients]);
  const { entries, loading, error, canManage, mutationInFlight, refresh, appendEntry, appendAddendum } = useClinicalRecord(patient?.id || '');
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [addendumTarget, setAddendumTarget] = useState(null);

  const selectPatient = (nextPatientId) => {
    const next = new URLSearchParams(searchParams);
    if (nextPatientId) next.set('patient', nextPatientId);
    else { next.delete('patient'); next.delete('tab'); }
    setSearchParams(next, { replace: true });
  };

  const selectTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'odontograma' || (tab === 'plano' && canReadTreatmentPlan)) next.set('tab', tab); else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <Helmet><title>Prontuário | SorriSync</title></Helmet>
      <Layout>
        <div className="mb-8 flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              <FileHeart className="h-8 w-8 text-primary" /> Prontuário
            </h1>
            <p className="max-w-3xl text-lg text-muted-foreground">Evolução longitudinal, odontograma permanente e plano de tratamento estruturado, com autoria e histórico preservado.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">Supabase • registros clínicos reais</Badge>
              <Badge variant="secondary">Sem edição ou exclusão</Badge>
            </div>
          </motion.div>
          {activeTab === 'evolucoes' && canManage && patient && (
            <Button onClick={() => setEntryModalOpen(true)} disabled={mutationInFlight} data-clinical-write-action>
              <Plus className="mr-2 h-4 w-4" /> Nova evolução
            </Button>
          )}
        </div>

        <div className="mb-8 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">
          O prontuário reúne evoluções, odontograma e plano de tratamento. Os protocolos clínicos acrescentam etapas, documentação de sessões e liberação de agendamento quando habilitados para a clínica. Assinatura, anexos, Portal do Paciente, IA, cobrança e movimentações automáticas de estoque seguem em frentes próprias.
        </div>

        <Card className="mb-8 border-border/60 shadow-sm">
          <CardContent className="p-5">
            <label className="mb-2 block text-sm font-medium" htmlFor="clinical-patient-select">Paciente</label>
            <Select value={patientId || undefined} onValueChange={selectPatient} disabled={patientsLoading}>
              <SelectTrigger id="clinical-patient-select" className="max-w-xl"><SelectValue placeholder="Selecione um paciente para abrir o prontuário" /></SelectTrigger>
              <SelectContent>{patients.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
          </CardContent>
        </Card>

        {!patientId && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <FileHeart className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">Selecione um paciente para consultar o prontuário.</p>
            <p className="mt-1 text-sm text-muted-foreground">Nenhum conteúdo clínico é carregado sem um paciente válido.</p>
          </div>
        )}

        {patientId && !patientsLoading && !patient && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Paciente indisponível neste tenant ou para este perfil.</div>
        )}

        {patient && (
          <Tabs value={activeTab} onValueChange={selectTab} className="space-y-6">
            <TabsList aria-label="Áreas do prontuário" className="h-auto max-w-full flex-wrap justify-start sm:h-9 sm:flex-nowrap">
              <TabsTrigger value="evolucoes">Evoluções</TabsTrigger>
              <TabsTrigger value="odontograma">Odontograma</TabsTrigger>
              {canReadTreatmentPlan && <TabsTrigger value="plano">Plano de tratamento</TabsTrigger>}
            </TabsList>
            <TabsContent value="evolucoes" className="space-y-4">
              {loading && <div className="flex items-center justify-center gap-3 rounded-xl border p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando linha do tempo...</div>}
              {!loading && error && (
                <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
                  <p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{error}</p>
                  <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
                </div>
              )}
              {!loading && !error && entries.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <p className="font-medium">Nenhuma evolução clínica finalizada.</p>
                  <p className="mt-1 text-sm text-muted-foreground">O prontuário será criado de forma atômica no primeiro registro autorizado.</p>
                </div>
              )}
              {!loading && !error && entries.length > 0 && (
                <div className="space-y-4" data-clinical-timeline>
                  {entries.map((entry) => {
                    const isAddendum = entry.entry_type === CLINICAL_ENTRY_TYPES.ADDENDUM;
                    return (
                      <Card key={entry.entry_id} className={isAddendum ? 'ml-4 border-primary/30 bg-primary/5 sm:ml-10' : 'border-border/60'}>
                        <CardContent className="p-5">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
                              <Badge variant={isAddendum ? 'secondary' : 'outline'}>{isAddendum ? 'Adendo' : 'Evolução clínica'}</Badge>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">{entry.content}</p>
                              <p className="mt-4 text-xs text-muted-foreground">{entry.author_display_name} • {formatDateTime(entry.finalized_at)}</p>
                            </div>
                            {!isAddendum && canManage && <Button variant="outline" size="sm" onClick={() => setAddendumTarget(entry)} disabled={mutationInFlight} data-clinical-write-action>Adicionar adendo</Button>}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            <TabsContent value="odontograma"><OdontogramPanel patient={patient} /></TabsContent>
            {canReadTreatmentPlan && <TabsContent value="plano"><TreatmentPlanPanel patient={patient} onClinicalTimelineChanged={refresh} onOpenClinicalTimeline={() => selectTab('evolucoes')} /></TabsContent>}
          </Tabs>
        )}

        {canManage && (
          <>
            <ClinicalEntryModal open={entryModalOpen} onOpenChange={setEntryModalOpen} onSubmit={appendEntry} isSaving={mutationInFlight} />
            <ClinicalAddendumModal open={Boolean(addendumTarget)} onOpenChange={(open) => !open && setAddendumTarget(null)} targetEntry={addendumTarget} onSubmit={appendAddendum} isSaving={mutationInFlight} />
          </>
        )}
      </Layout>
    </>
  );
};

export default ClinicalRecordPage;
