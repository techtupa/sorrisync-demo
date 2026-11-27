import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OverviewTab from './OverviewTab.jsx';
import PayablesTable from './PayablesTable.jsx';
import ReceivablesTable from './ReceivablesTable.jsx';

const FinanceTabs = ({ finance, canManage, value, onValueChange, tableFilters, onFiltersChange, onOpenReceivable, onOpenPayable, onEditReceivable, onEditPayable, onCancelReceivable, onCancelPayable, onSettleReceivable, onSettlePayable, onReverseReceivableSettlement, onReversePayableSettlement }) => (
  <Tabs defaultValue="overview" value={value} onValueChange={onValueChange} className="w-full" data-clinic-finance-mode={canManage ? 'manual-entries' : 'readonly'}>
    <div className="overflow-x-auto pb-2 mb-4 custom-scrollbar">
      <TabsList className="w-max min-w-full justify-start bg-muted/50 p-1 h-12">
        <TabsTrigger value="overview" className="text-sm px-4 py-2">Visão Geral</TabsTrigger>
        <TabsTrigger value="receivables" className="text-sm px-4 py-2">Contas a Receber</TabsTrigger>
        <TabsTrigger value="payables" className="text-sm px-4 py-2">Contas a Pagar</TabsTrigger>
        <TabsTrigger value="budgets" disabled title="Próxima etapa" className="text-sm px-4 py-2">Orçamentos • Próxima etapa</TabsTrigger>
        <TabsTrigger value="cashflow" disabled title="Próxima etapa" className="text-sm px-4 py-2">Fluxo de Caixa • Próxima etapa</TabsTrigger>
        <TabsTrigger value="dre" disabled title="Próxima etapa" className="text-sm px-4 py-2">DRE • Próxima etapa</TabsTrigger>
        <TabsTrigger value="fiscal" disabled title="Próxima etapa" className="text-sm px-4 py-2">Fiscal • Próxima etapa</TabsTrigger>
      </TabsList>
    </div>
    <TabsContent value="overview" className="m-0 outline-none"><OverviewTab finance={finance} /></TabsContent>
    <TabsContent value="receivables" className="m-0 outline-none"><ReceivablesTable receivables={finance.receivables} filters={tableFilters.receivables} onFiltersChange={(filters) => onFiltersChange('receivables', filters)} canManage={canManage} onOpenDrawer={onOpenReceivable} onEdit={canManage ? onEditReceivable : undefined} onCancel={canManage ? onCancelReceivable : undefined} onSettle={canManage ? onSettleReceivable : undefined} onReverseSettlement={canManage ? onReverseReceivableSettlement : undefined} /></TabsContent>
    <TabsContent value="payables" className="m-0 outline-none"><PayablesTable payables={finance.payables} filters={tableFilters.payables} onFiltersChange={(filters) => onFiltersChange('payables', filters)} canManage={canManage} onOpenDrawer={onOpenPayable} onEdit={canManage ? onEditPayable : undefined} onCancel={canManage ? onCancelPayable : undefined} onSettle={canManage ? onSettlePayable : undefined} onReverseSettlement={canManage ? onReversePayableSettlement : undefined} /></TabsContent>
  </Tabs>
);

export default FinanceTabs;
