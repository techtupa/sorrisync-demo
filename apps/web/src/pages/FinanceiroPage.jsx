import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { AlertTriangle, Download, Info, Loader2, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import Layout from '@/components/Layout.jsx';
import FinanceTabs from '@/components/finance/FinanceTabs.jsx';
import FinanceCancellationDialog from '@/components/finance/FinanceCancellationDialog.jsx';
import FinanceEntryMutationModal from '@/components/finance/FinanceEntryMutationModal.jsx';
import FinanceSettlementDialog from '@/components/finance/FinanceSettlementDialog.jsx';
import FinanceSettlementReversalDialog from '@/components/finance/FinanceSettlementReversalDialog.jsx';
import PayableDrawer from '@/components/finance/PayableDrawer.jsx';
import ReceivableDrawer from '@/components/finance/ReceivableDrawer.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useClinicFinance } from '@/hooks/useClinicFinance.js';
import { useTenantDisplay } from '@/hooks/useTenantDisplay.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { toast } from 'sonner';

const SOURCE_LABELS = {
  supabase: 'Supabase • leitura real',
  mock: 'Fallback sintético • dados demo',
  unavailable: 'Leitura indisponível',
};

const FinanceiroClinicPage = ({ financeState }) => {
  const tenantDisplay = useTenantDisplay();
  const [financeTab, setFinanceTab] = useState('overview');
  const [tableFilters, setTableFilters] = useState({
    receivables: { search: '', status: 'all', duePeriod: 'all' },
    payables: { search: '', status: 'all', duePeriod: 'all' },
  });
  const updateTableFilters = (tab, filters) => setTableFilters((current) => ({ ...current, [tab]: filters }));
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [selectedPayable, setSelectedPayable] = useState(null);
  const [mutationModal, setMutationModal] = useState({ isOpen: false, mode: 'create', entryType: 'receivable', entry: null });
  const [cancellationTarget, setCancellationTarget] = useState(null);
  const [settlementTarget, setSettlementTarget] = useState(null);
  const [settlementReversalTarget, setSettlementReversalTarget] = useState(null);
  const {
    data: finance,
    loading,
    error,
    permissionDenied,
    canRead,
    canManage,
    createReceivable,
    updateReceivable,
    cancelReceivable,
    createPayable,
    updatePayable,
    cancelPayable,
    clearMutationFeedback,
    clearSettlementFeedback,
    settleReceivable,
    reverseReceivableSettlement,
    settlePayable,
    reversePayableSettlement,
    mutationInFlightId,
    mutationError,
    settlementInFlightId,
    settlementError,
    refresh,
    source,
  } = financeState;
  const hasData = finance.receivables.length > 0 || finance.payables.length > 0;

  useEffect(() => {
    setFinanceTab('overview');
    setSelectedReceivable(null);
    setSelectedPayable(null);
    setMutationModal({ isOpen: false, mode: 'create', entryType: 'receivable', entry: null });
    setCancellationTarget(null);
    setSettlementTarget(null);
    setSettlementReversalTarget(null);
  }, [finance.tenantId]);

  useEffect(() => {
    setSelectedReceivable((current) => current
      ? finance.receivables.find((entry) => entry.id === current.id) || null
      : null);
    setSelectedPayable((current) => current
      ? finance.payables.find((entry) => entry.id === current.id) || null
      : null);
  }, [finance.payables, finance.receivables]);

  const openMutationModal = (mode, entryType, entry = null) => {
    clearMutationFeedback();
    setMutationModal({ isOpen: true, mode, entryType, entry });
  };

  const handleMutationSubmit = async (draft) => {
    const { mode, entryType, entry } = mutationModal;
    const result = mode === 'create'
      ? await (entryType === 'receivable' ? createReceivable(draft) : createPayable(draft))
      : await (entryType === 'receivable' ? updateReceivable(entry, draft) : updatePayable(entry, draft));
    toast.success(result.mutationResult === 'idempotent'
      ? 'Operação já registrada; nenhuma duplicidade foi criada.'
      : mode === 'create' ? 'Lançamento manual criado com sucesso.' : 'Lançamento atualizado com sucesso.');
    setMutationModal((current) => ({ ...current, isOpen: false, entry: null }));
  };

  const handleCancellation = async (reasonCode) => {
    const result = cancellationTarget.entry.type === 'receivable'
      ? await cancelReceivable(cancellationTarget.entry, reasonCode)
      : await cancelPayable(cancellationTarget.entry, reasonCode);
    toast.success(result.mutationResult === 'idempotent'
      ? 'O lançamento já estava cancelado.'
      : 'Lançamento cancelado e histórico preservado.');
    setCancellationTarget(null);
  };

  const openCancellation = (entry) => {
    clearMutationFeedback();
    setCancellationTarget({ entry });
  };

  const openSettlement = (entry) => {
    clearSettlementFeedback();
    setSettlementTarget(entry);
  };

  const openSettlementReversal = (entry, paymentEventId) => {
    clearSettlementFeedback();
    if (!paymentEventId) {
      if (entry.type === 'receivable') setSelectedReceivable(entry); else setSelectedPayable(entry);
      return;
    }
    setSettlementReversalTarget({ ...entry, paymentEventId });
    setSelectedReceivable(null);
    setSelectedPayable(null);
  };

  const handleSettlement = async ({ requestId, settlementDate, amountCents }) => {
    const entry = settlementTarget;
    const result = entry.type === 'receivable'
      ? await settleReceivable(entry, { requestId, settlementDate, amountCents })
      : await settlePayable(entry, { requestId, settlementDate, amountCents });
    toast.success(result.mutationResult === 'idempotent'
      ? 'Esta baixa já estava registrada; nenhuma duplicidade foi criada.'
      : entry.type === 'receivable' ? 'Receipt recorded and balance updated.' : 'Payment recorded and balance updated.');
    setSettlementTarget(null);
  };

  const handleSettlementReversal = async ({ requestId, reversalReasonCode, paymentEventId }) => {
    const entry = settlementReversalTarget;
    const result = entry.type === 'receivable'
      ? await reverseReceivableSettlement(entry, { requestId, reversalReasonCode, paymentEventId })
      : await reversePayableSettlement(entry, { requestId, reversalReasonCode, paymentEventId });
    toast.success(result.mutationResult === 'idempotent'
      ? 'Este estorno já estava registrado; o histórico foi preservado.'
      : 'Registro estornado e saldo atualizado. O histórico foi preservado.');
    setSettlementReversalTarget(null);
  };

  return (
    <>
      <Helmet><title>Financeiro da Clínica | SorriSync</title></Helmet>

      <Layout>
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 mb-6 dark:bg-blue-950/20 dark:border-blue-900/50">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 dark:text-blue-400" />
          <div>
            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-1">Financeiro da Clínica • {canManage ? 'lançamentos e baixas manuais controlados' : 'somente leitura'}</h4>
            <p className="text-sm text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
              Esta área mantém recebíveis e pagáveis operacionais da clínica atual. Perfis autorizados podem cadastrar, editar, cancelar, registrar valores parciais ou integrais, estornar cada registro e conferir referências manuais. Esse controle interno não executa movimentação ou conciliação bancária, PIX ou boleto. Billing e cobrança SaaS pertencem ao Master Control.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-start justify-between mb-8 gap-5">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2">Financeiro</h1>
            <p className="text-lg text-muted-foreground text-balance">Acompanhe valores e registre obrigações, pagamentos e recebimentos parciais sem movimentar dinheiro.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Clínica: {tenantDisplay.displayName}</Badge>
              <Badge
                data-clinic-finance-source={source}
                variant="outline"
                className={source === 'supabase' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
              >
                {SOURCE_LABELS[source] || SOURCE_LABELS.unavailable}
              </Badge>
              <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200"><ShieldCheck className="w-3.5 h-3.5 mr-1" />{canManage ? 'Gestão e baixa manual' : 'Read-only'}</Badge>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap gap-3">
            <Button variant="outline" disabled title="Próxima etapa"><Download className="w-4 h-4 mr-2" /> Exportar • Próxima etapa</Button>
            {canManage && (
              <>
                <Button variant="outline" onClick={() => openMutationModal('create', 'payable')}><Plus className="w-4 h-4 mr-2" /> Nova conta a pagar</Button>
                <Button onClick={() => openMutationModal('create', 'receivable')}><Plus className="w-4 h-4 mr-2" /> Nova conta a receber</Button>
              </>
            )}
          </motion.div>
        </div>

        {!canRead && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3" data-clinic-finance-access="blocked">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">O módulo Financeiro e a permissão de leitura não estão disponíveis para este perfil.</p>
          </div>
        )}

        {canRead && loading && (
          <div className="mb-8 p-8 border border-border/50 rounded-xl flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">Carregando o Financeiro da Clínica...</span>
          </div>
        )}

        {canRead && !loading && error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3" data-clinic-finance-error={permissionDenied ? 'permission' : 'read'}>
            <div className="flex items-start gap-3"><AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" /><p className="text-sm text-red-900">{error} Nenhum fallback foi aplicado sobre esta falha.</p></div>
            <Button variant="outline" size="sm" onClick={refresh} className="bg-background shrink-0"><RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente</Button>
          </div>
        )}

        {canRead && !loading && !error && !hasData && (
          <div className="mb-8 p-8 border border-dashed border-border rounded-xl text-center" data-clinic-finance-empty="true">
            <p className="font-medium text-foreground">Nenhum recebível ou pagável disponível para esta clínica.</p>
            <p className="text-sm text-muted-foreground mt-1">O vazio do Supabase é preservado; nenhum dado demo é inserido na tela.</p>
          </div>
        )}

        {canRead && !loading && !error && hasData && (
          <FinanceTabs
            key={finance.tenantId}
            finance={finance}
            value={financeTab}
            onValueChange={setFinanceTab}
            tableFilters={tableFilters}
            onFiltersChange={updateTableFilters}
            canManage={canManage}
            onOpenReceivable={setSelectedReceivable}
            onOpenPayable={setSelectedPayable}
            onEditReceivable={(entry) => openMutationModal('edit', 'receivable', entry)}
            onEditPayable={(entry) => openMutationModal('edit', 'payable', entry)}
            onCancelReceivable={openCancellation}
            onCancelPayable={openCancellation}
            onSettleReceivable={openSettlement}
            onSettlePayable={openSettlement}
            onReverseReceivableSettlement={openSettlementReversal}
            onReversePayableSettlement={openSettlementReversal}
          />
        )}

        <ReceivableDrawer item={selectedReceivable} isOpen={Boolean(selectedReceivable)} onClose={() => setSelectedReceivable(null)} canManage={canManage && !settlementInFlightId} onReversePayment={(id, entry) => openSettlementReversal(entry || selectedReceivable, id)} />
        <PayableDrawer item={selectedPayable} isOpen={Boolean(selectedPayable)} onClose={() => setSelectedPayable(null)} canManage={canManage && !settlementInFlightId} onReversePayment={(id, entry) => openSettlementReversal(entry || selectedPayable, id)} />
        <FinanceEntryMutationModal
          isOpen={mutationModal.isOpen}
          mode={mutationModal.mode}
          entryType={mutationModal.entryType}
          entry={mutationModal.entry}
          submitting={Boolean(mutationInFlightId?.startsWith(mutationModal.mode === 'create' ? 'create-' : 'update-'))}
          mutationError={mutationError}
          onClose={() => setMutationModal((current) => ({ ...current, isOpen: false, entry: null }))}
          onSubmit={handleMutationSubmit}
        />
        <FinanceCancellationDialog
          isOpen={Boolean(cancellationTarget)}
          entry={cancellationTarget?.entry}
          submitting={Boolean(mutationInFlightId?.startsWith('cancel-'))}
          mutationError={mutationError}
          onClose={() => setCancellationTarget(null)}
          onConfirm={handleCancellation}
        />
        <FinanceSettlementDialog
          isOpen={Boolean(settlementTarget)}
          entry={settlementTarget}
          submitting={Boolean(settlementInFlightId?.startsWith('settle-'))}
          settlementError={settlementError}
          onClose={() => setSettlementTarget(null)}
          onConfirm={handleSettlement}
        />
        <FinanceSettlementReversalDialog
          isOpen={Boolean(settlementReversalTarget)}
          entry={settlementReversalTarget}
          submitting={Boolean(settlementInFlightId?.startsWith('reverse-'))}
          settlementError={settlementError}
          onClose={() => setSettlementReversalTarget(null)}
          onConfirm={handleSettlementReversal}
        />
      </Layout>
    </>
  );
};

// A identidade vem da sessão, não do snapshot que pode estar carregando.
// Trocar clínica descarta a interface, mas mantém o hook e suas refs contra callbacks obsoletos.
const FinanceiroPage = () => {
  const { currentTenantId } = useAuth();
  const financeState = useClinicFinance();
  if (financeState.data.tenantId !== currentTenantId) return null;
  return <FinanceiroClinicPage key={currentTenantId} financeState={financeState} />;
};

export default FinanceiroPage;
