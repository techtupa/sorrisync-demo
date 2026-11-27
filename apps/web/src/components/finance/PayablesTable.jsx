import React from 'react';
import FinanceReadonlyTable from './FinanceReadonlyTable.jsx';

const PayablesTable = ({ payables = [], filters, onFiltersChange, canManage, onOpenDrawer, onEdit, onCancel, onSettle, onReverseSettlement }) => (
  <FinanceReadonlyTable entries={payables} filters={filters} onFiltersChange={onFiltersChange} emptyLabel="Nenhuma conta a pagar encontrada com os filtros atuais." canManage={canManage} onOpenEntry={onOpenDrawer} onEditEntry={onEdit} onCancelEntry={onCancel} onSettleEntry={onSettle} onReverseSettlement={onReverseSettlement} />
);

export default PayablesTable;
