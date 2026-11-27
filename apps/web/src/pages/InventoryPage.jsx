import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import Layout from '@/components/Layout.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Package, Info, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import InventoryTabs from '@/components/inventory/InventoryTabs.jsx';
import NewInventoryItemModal from '@/components/inventory/NewInventoryItemModal.jsx';
import InventoryMovementModal from '@/components/inventory/InventoryMovementModal.jsx';
import DeactivateInventoryItemDialog from '@/components/inventory/DeactivateInventoryItemDialog.jsx';
import { useTenantDisplay } from '@/hooks/useTenantDisplay.js';
import { useInventoryReadModel } from '@/hooks/useInventoryReadModel.js';
import { useInventoryOperations } from '@/hooks/useInventoryOperations.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useInventoryPurchases } from '@/hooks/useInventoryPurchases.js';
import NewSupplierModal from '@/components/inventory/NewSupplierModal.jsx';
import InventoryPurchaseForm from '@/components/inventory/InventoryPurchaseForm.jsx';
import { useInventoryCosts } from '@/hooks/useInventoryCosts.js';
import { InventoryCostOverview } from '@/components/inventory/InventoryCostSection.jsx';

const SOURCE_LABELS = {
  supabase: 'Supabase • leitura real',
  mock: 'Dados demo',
  fallback: 'Fallback demo',
  mixed: 'Fonte mista',
  unavailable: 'Leitura indisponível',
};

const InventoryPage = () => {
  const [itemModal, setItemModal] = useState({ open: false, item: null });
  const [movementModal, setMovementModal] = useState({ open: false, item: null, type: 'entry' });
  const [deactivation, setDeactivation] = useState({ open: false, item: null });
  const [supplierModal, setSupplierModal] = useState({ open: false, id: null });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const tenantDisplay = useTenantDisplay();
  const { currentTenantId, hasPermission } = useAuth();
  const {
    data: inventory,
    loading,
    error,
    canRead,
    refresh,
    source,
  } = useInventoryReadModel();
  const {
    canManage,
    createItem,
    updateItem,
    deactivateItem,
    recordMovement,
    mutationInFlightId,
    mutationError,
    clearMutationError,
  } = useInventoryOperations({ onChanged: refresh });
  const purchases = useInventoryPurchases({ onChanged: refresh, sourceAvailable: source === 'supabase' && !error });
  const costs = useInventoryCosts({ onChanged: refresh, sourceAvailable: source === 'supabase' && !loading && !error, refreshToken: inventory });
  const canWritePurchases = purchases.canManagePurchases && source === 'supabase' && !loading && !error;

  useEffect(() => {
    setItemModal({ open: false, item: null });
    setMovementModal({ open: false, item: null, type: 'entry' });
    setDeactivation({ open: false, item: null });
    setSupplierModal({ open: false, id: null });
    setReceiptOpen(false);
  }, [currentTenantId]);

  const hasInventoryData = inventory.items.length > 0
    || inventory.categories.length > 0
    || inventory.suppliers.length > 0
    || inventory.movements.length > 0;
  const isSaving = Boolean(mutationInFlightId);

  const handleItemSubmit = async (input) => {
    if (itemModal.item) {
      await updateItem(itemModal.item.id, input);
      toast.success('Item de estoque atualizado com sucesso.');
    } else {
      await createItem(input);
      toast.success('Item criado com saldo zero. Registre o estoque inicial em uma entrada separada.');
    }
  };

  const handleMovementSubmit = async (input) => {
    await recordMovement(movementModal.item.id, input);
    toast.success('Movimentação registrada e saldo atualizado.');
  };

  const handleDeactivation = async () => {
    await deactivateItem(deactivation.item.id, deactivation.item.updated_at);
    toast.success('Item desativado. O histórico foi preservado.');
  };

  const mutableCallbacks = canManage ? {
    onEditItem: (item) => { clearMutationError(); setItemModal({ open: true, item }); },
    onRecordMovement: (item, type) => { clearMutationError(); setMovementModal({ open: true, item, type }); },
    onDeactivateItem: (item) => { clearMutationError(); setDeactivation({ open: true, item }); },
  } : undefined;

  return (
    <>
      <Helmet><title>Estoque e Insumos | SorriSync</title></Helmet>
      <Layout>
        <div className="mb-8 flex flex-col xl:flex-row xl:items-start justify-between gap-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-2 flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              Estoque e Insumos
            </h1>
            <p className="text-lg text-muted-foreground text-balance max-w-3xl">
              Controle materiais, níveis mínimos e movimentações internas da clínica.
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Clínica: {tenantDisplay.displayName}</Badge>
              <Badge variant="secondary" className="font-mono text-xs text-muted-foreground">{tenantDisplay.tenantLabel}</Badge>
              <Badge variant="outline" className={source === 'supabase' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                {SOURCE_LABELS[source] || SOURCE_LABELS.unavailable}
              </Badge>
            </div>
          </motion.div>

          {canManage && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex shrink-0">
              <Button onClick={() => { clearMutationError(); setItemModal({ open: true, item: null }); }} className="shadow-sm" disabled={isSaving || inventory.categories.length === 0}>
                <Package className="w-4 h-4 mr-2" /> Novo item
              </Button>
            </motion.div>
          )}
        </div>

        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800/90 leading-relaxed">
            Categorias, itens, fornecedores e movimentações usam leitura Supabase real quando disponível. Proprietários e administradores autorizados podem gerenciar fornecedores e recebimentos manuais, registrar custos e estornar recebimentos com histórico preservado. Financeiro, pagamentos, nota fiscal e integrações externas permanecem fora deste fluxo.
          </p>
        </div>

        {!canRead && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900">Seu acesso atual não possui o módulo de Estoque com a permissão <code>inventory.read</code>.</p>
          </div>
        )}

        {canRead && loading && (
          <div className="mb-8 p-8 border border-border/50 rounded-xl flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando o estoque da clínica atual...</span>
          </div>
        )}

        {canRead && !loading && error && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">A leitura do estoque falhou. As listas de itens e fornecedores usam demonstração. Novos recebimentos ficam bloqueados; a aba Compras identifica separadamente os registros reais já consultados.</p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} className="bg-background shrink-0">
              <RefreshCw className="w-4 h-4 mr-2" /> Tentar novamente
            </Button>
          </div>
        )}

        {canRead && !loading && !hasInventoryData && !error && (
          <div className="mb-8 p-8 border border-dashed border-border rounded-xl text-center">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">Nenhum registro de estoque disponível para esta clínica.</p>
            <p className="text-sm text-muted-foreground mt-1">Cadastre uma categoria em uma entrega própria antes de criar o primeiro item.</p>
          </div>
        )}

        {canRead && (source === 'supabase' || !loading || hasInventoryData || error) && (
          <><InventoryCostOverview costs={costs} /><InventoryTabs key={currentTenantId || 'no-tenant'} inventory={inventory} canManage={canManage} mutableCallbacks={mutableCallbacks} costs={costs} purchaseState={{
            purchases: purchases.purchases, canManage: hasPermission('inventory.manage'), loading: purchases.loading, error: purchases.error,
            isSaving: purchases.saving, onRefresh: () => { void purchases.refresh(); refresh(); },
            onLoadMore: purchases.loadMore, onSaveSupplier: canWritePurchases ? purchases.saveSupplier : undefined,
            onReceive: canWritePurchases ? () => setReceiptOpen(true) : undefined,
            onReverse: canWritePurchases ? purchases.reverse : undefined,
            onCreateSupplier: canWritePurchases ? () => setSupplierModal({ open: true, id: null, snapshot: null }) : undefined,
            onEditSupplier: canWritePurchases ? (supplier) => setSupplierModal({ open: true, id: supplier.id, snapshot: supplier }) : undefined,
          }} /></>
        )}

        {purchases.canManagePurchases && supplierModal.open && <NewSupplierModal key={`${currentTenantId}:${supplierModal.id || 'new'}`} isOpen onOpenChange={(open) => setSupplierModal((value) => ({ ...value, open }))} supplier={inventory.suppliers.find((s) => s.id === supplierModal.id) || supplierModal.snapshot} suppliers={inventory.suppliers} onSubmit={purchases.saveSupplier} isSaving={purchases.saving} />}
        {purchases.canManagePurchases && receiptOpen && <InventoryPurchaseForm key={`purchase:${currentTenantId}`} isOpen onOpenChange={setReceiptOpen} suppliers={inventory.suppliers} items={inventory.items} onSubmit={purchases.receive} onSaveSupplier={purchases.saveSupplier} isSaving={purchases.saving} />}

        {canManage && (
          <>
            <NewInventoryItemModal
              isOpen={itemModal.open}
              onOpenChange={(open) => setItemModal((current) => ({ ...current, open }))}
              item={itemModal.item}
              categories={inventory.categories}
              onSubmit={handleItemSubmit}
              isSaving={isSaving}
              operationError={mutationError}
            />
            <InventoryMovementModal
              isOpen={movementModal.open}
              onOpenChange={(open) => setMovementModal((current) => ({ ...current, open }))}
              item={movementModal.item}
              initialType={movementModal.type}
              onSubmit={handleMovementSubmit}
              isSaving={isSaving}
              operationError={mutationError}
            />
            <DeactivateInventoryItemDialog
              isOpen={deactivation.open}
              onOpenChange={(open) => setDeactivation((current) => ({ ...current, open }))}
              item={deactivation.item}
              onConfirm={handleDeactivation}
              isSaving={isSaving}
              operationError={mutationError}
            />
          </>
        )}
      </Layout>
    </>
  );
};

export default InventoryPage;
