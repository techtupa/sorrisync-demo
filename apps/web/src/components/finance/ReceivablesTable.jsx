import React from 'react';
import FinanceReadonlyTable from './FinanceReadonlyTable.jsx';

const ReceivablesTable = ({ receivables = [], filters, onFiltersChange, canManage, onOpenDrawer, onEdit, onCancel, onSettle, onReverseSettlement }) => (
  <FinanceReadonlyTable entries={receivables} filters={filters} onFiltersChange={onFiltersChange} emptyLabel="Nenhuma conta a receber encontrada com os filtros atuais." canManage={canManage} onOpenEntry={onOpenDrawer} onEditEntry={onEdit} onCancelEntry={onCancel} onSettleEntry={onSettle} onReverseSettlement={onReverseSettlement} />
);

export default ReceivablesTable;
