
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatePresence, motion } from 'framer-motion';

import InventoryOverviewTab from './InventoryOverviewTab.jsx';
import InventoryItemsTab from './InventoryItemsTab.jsx';
import InventorySuppliersTab from './InventorySuppliersTab.jsx';
import InventoryComprasTab from './InventoryComprasTab.jsx';
import InventoryAlertsTab from './InventoryAlertsTab.jsx';
import InventoryCategoriasTab from './InventoryCategoriasTab.jsx';
import InventoryHistoricoTab from './InventoryHistoricoTab.jsx';
import InventoryReplenishmentPanel from './InventoryReplenishmentPanel.jsx';

const InventoryTabs = ({ inventory, canManage = false, mutableCallbacks, purchaseState, costs }) => {
  const [tab,setTab]=useState('visao-geral');
  return (
    <Tabs value={tab} onValueChange={(value)=>!costs?.pending && setTab(value)} className="w-full">
      <TabsList className="w-full justify-start bg-muted/50 p-1 h-12 overflow-x-auto custom-scrollbar mb-8">
        <TabsTrigger value="visao-geral" className="text-sm px-4 py-2">Visão Geral</TabsTrigger>
        <TabsTrigger value="itens" className="text-sm px-4 py-2">Itens em Estoque</TabsTrigger>
        <TabsTrigger value="fornecedores" className="text-sm px-4 py-2">Fornecedores</TabsTrigger>
        <TabsTrigger value="compras" className="text-sm px-4 py-2">Compras</TabsTrigger>
        <TabsTrigger value="alertas" className="text-sm px-4 py-2">Alertas e Regras</TabsTrigger>
        <TabsTrigger value="categorias" className="text-sm px-4 py-2">Categorias</TabsTrigger>
        <TabsTrigger value="historico" className="text-sm px-4 py-2">Histórico (Logs)</TabsTrigger>
      </TabsList>

      <AnimatePresence mode="wait">
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
          <TabsContent value="visao-geral" className="outline-none m-0"><InventoryOverviewTab alerts={inventory.alerts} suppliers={inventory.suppliers} summary={inventory.summary} categories={inventory.categories} /></TabsContent>
          <TabsContent value="itens" className="outline-none m-0"><InventoryItemsTab key={costs?.context} items={inventory.items} canManage={canManage} mutableCallbacks={mutableCallbacks} costs={costs} /></TabsContent>
          <TabsContent value="fornecedores" className="outline-none m-0"><InventorySuppliersTab suppliers={inventory.suppliers} onCreateSupplier={purchaseState?.onCreateSupplier} onEditSupplier={purchaseState?.onEditSupplier} /></TabsContent>
          <TabsContent value="compras" className="outline-none m-0"><InventoryComprasTab {...purchaseState} source={inventory.source} items={inventory.items} suppliers={inventory.suppliers} /></TabsContent>
          <TabsContent value="alertas" className="outline-none m-0 space-y-6">
            <InventoryReplenishmentPanel sourceAvailable={Boolean(purchaseState?.onReceive)}
              suppliers={inventory.suppliers} refreshToken={inventory} onChanged={purchaseState?.onRefresh} />
            <InventoryAlertsTab alerts={inventory.alerts} showPhysicalGap={Boolean(purchaseState?.canManage)} />
          </TabsContent>
          <TabsContent value="categorias" className="outline-none m-0"><InventoryCategoriasTab categories={inventory.categories} /></TabsContent>
          <TabsContent value="historico" className="outline-none m-0"><InventoryHistoricoTab events={inventory.movements} /></TabsContent>
        </motion.div>
      </AnimatePresence>
    </Tabs>
  );
};

export default InventoryTabs;
