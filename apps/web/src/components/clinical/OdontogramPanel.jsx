import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast.js';
import { useOdontogram } from '@/hooks/useOdontogram.js';
import OdontogramChart from './OdontogramChart.jsx';
import OdontogramFindingModal from './OdontogramFindingModal.jsx';
import OdontogramResolutionModal from './OdontogramResolutionModal.jsx';
import OdontogramToothDrawer from './OdontogramToothDrawer.jsx';

const OdontogramPanel = ({ patient }) => {
  const { toast } = useToast();
  const {
    chart, findingsByTooth, activeByTooth, selectedTooth, setSelectedTooth, scopeKey,
    loading, error, canManage, mutationInFlight, refresh, appendFinding, resolveFinding,
  } = useOdontogram(patient?.id || '');
  const [findingModalOpen, setFindingModalOpen] = useState(false);
  const [resolutionTarget, setResolutionTarget] = useState(null);

  useEffect(() => {
    setFindingModalOpen(false); setResolutionTarget(null);
  }, [patient?.id, scopeKey]);

  const selectedFindings = useMemo(() => findingsByTooth[selectedTooth] || [], [findingsByTooth, selectedTooth]);

  const handleAppend = async (input) => {
    const result = await appendFinding(input);
    toast({ title: 'Achado odontológico registrado.', description: 'O odontograma foi atualizado com segurança.' });
    return result;
  };
  const handleResolve = async (input) => {
    const result = await resolveFinding(input);
    toast({ title: 'Achado atualizado no histórico.', description: 'O registro original permanece preservado no histórico.' });
    setResolutionTarget(null);
    return result;
  };

  if (loading) return <div className="flex items-center justify-center gap-3 rounded-xl border p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando odontograma...</div>;
  if (error) return (
    <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
      <p className="flex items-center gap-2 text-sm text-amber-900"><AlertTriangle className="h-5 w-5" />{error}</p>
      <Button variant="outline" size="sm" onClick={refresh}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
    </div>
  );

  return (
    <div className="space-y-4" data-odontogram-panel data-chart-state={chart ? 'created' : 'not-created'}>
      {!chart && <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">O odontograma será criado de forma atômica somente no primeiro achado autorizado. A consulta desta aba não cria registros.</div>}
      <OdontogramChart activeByTooth={activeByTooth} selectedTooth={selectedTooth} onSelectTooth={setSelectedTooth} />
      <OdontogramToothDrawer
        open={Boolean(selectedTooth)} onOpenChange={(open) => !open && setSelectedTooth('')}
        toothCode={selectedTooth} findings={selectedFindings} canManage={canManage}
        mutationInFlight={mutationInFlight}
        onAdd={canManage ? () => setFindingModalOpen(true) : undefined}
        onResolve={canManage ? setResolutionTarget : undefined}
      />
      {canManage && (
        <>
          <OdontogramFindingModal open={findingModalOpen} onOpenChange={setFindingModalOpen} patientName={patient.name} toothCode={selectedTooth} onSubmit={handleAppend} isSaving={mutationInFlight} />
          <OdontogramResolutionModal open={Boolean(resolutionTarget)} onOpenChange={(open) => !open && setResolutionTarget(null)} finding={resolutionTarget} onSubmit={handleResolve} isSaving={mutationInFlight} />
        </>
      )}
    </div>
  );
};

export default OdontogramPanel;
