
import React, { useCallback, useState } from 'react';
import InventoryCostSection from './InventoryCostSection.jsx';
import { formatInventoryOrderQuantity } from '@/repositories/inventoryOrdersContract.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, MapPin, History, ArrowDownToLine, ArrowUpFromLine, Edit, Activity, Archive, SlidersHorizontal } from 'lucide-react';

const InventoryItemDetailDrawer = ({ isOpen, onOpenChange, item, canManage = false, mutableCallbacks, costs }) => {
  const [costLocked,setCostLocked] = useState(false);
  const setRecoveryPending=costs?.setRecoveryPending;
  const blockClose=useCallback((value)=>{setCostLocked(value);setRecoveryPending?.(value);},[setRecoveryPending]);
  if (!item) return null;
  const costSnapshot=costs?.sourceAvailable && !costs.detail?.loading && !costs.detail?.error
    && costs.detail?.snapshot?.available && costs.detail.snapshot.item_id===item.id ? costs.detail.snapshot : null;
  const observedQuantity=costSnapshot ? formatInventoryOrderQuantity(costSnapshot.quantity_hundredths) : item.current_quantity;
  const observedUnit=costSnapshot ? (INVENTORY_UNIT_LABELS[costSnapshot.unit_code] || costSnapshot.unit_code) : item.unit;

  const handleMutableAction = (callback, ...args) => {
    if (costLocked) return;
    onOpenChange(false);
    callback?.(...args);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Crítico': return <Badge variant="outline" className="inv-badge-critical">Crítico</Badge>;
      case 'Estoque baixo': return <Badge variant="outline" className="inv-badge-low">Estoque Baixo</Badge>;
      case 'Normal': return <Badge variant="outline" className="inv-badge-normal">Normal</Badge>;
      case 'Em revisão': return <Badge variant="outline" className="inv-badge-review">Em Revisão</Badge>;
      default: return <Badge variant="outline" className="inv-badge-inactive">Inativo</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !costLocked && onOpenChange(open)}>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl overflow-y-auto custom-scrollbar p-0">
        <div className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-background rounded-xl border border-border/50 shadow-sm shrink-0">
              <Package className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="mb-2">{getStatusBadge(item.status)}</div>
              <SheetTitle className="text-xl font-bold text-foreground truncate pr-4">
                {item.name}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1">
                {item.category_name}
              </SheetDescription>
            </div>
          </div>

          {canManage && item.lifecycle_status === 'active' && mutableCallbacks && (
            <div className="flex flex-wrap gap-2 mt-4" data-inventory-write-actions>
              <Button size="sm" onClick={() => handleMutableAction(mutableCallbacks.onRecordMovement, item, 'entry')} className="bg-green-600 hover:bg-green-700 text-white">
                <ArrowDownToLine className="w-4 h-4 mr-2" /> Entrada
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleMutableAction(mutableCallbacks.onRecordMovement, item, 'consumption')} className="text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Consumo
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleMutableAction(mutableCallbacks.onRecordMovement, item, 'adjustment_increase')}>
                <SlidersHorizontal className="w-4 h-4 mr-2" /> Ajustar
              </Button>
            </div>
          )}
        </div>

        <div className="p-6 space-y-8">
          {isOpen && costs?.allowed && <InventoryCostSection key={`${costs.context}:${item.id}`} itemId={item.id} costs={costs} onBlockClose={blockClose} />}
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Quantidade Atual</p>
              <p className="text-2xl font-bold text-foreground tabular-nums flex items-baseline gap-1">
                <span data-inventory-observed-quantity>{observedQuantity}</span> <span className="text-sm font-medium text-muted-foreground">{observedUnit}</span>
              </p>
            </div>
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Estoque Mínimo</p>
              <p className="text-2xl font-bold text-foreground tabular-nums flex items-baseline gap-1">
                {item.minimum_quantity} <span className="text-sm font-medium text-muted-foreground">{item.unit}</span>
              </p>
            </div>
          </div>

          {/* Detalhes Logísticos */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Logística
            </h4>
            <div className="p-4 border border-border/50 rounded-xl bg-card space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Fornecedor Principal</span>
                <span className="text-sm font-medium truncate max-w-[200px]">{item.supplier_name || 'Não definido'}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Localização</span>
                <span className="text-sm font-medium">{item.storage_location || 'Geral'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Reposição sugerida</span>
                <span className="text-sm font-medium">{item.suggested_replenishment || 0} {item.unit}</span>
              </div>
            </div>
          </div>

          {/* Últimas Movimentações */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Últimas Movimentações
            </h4>
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">Consulte a aba Histórico para ver as movimentações reais disponíveis em modo leitura.</p>
            </div>
          </div>

          {/* Ações */}
          <Separator />
          <div className="grid grid-cols-1 gap-2 pt-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm text-muted-foreground">
              <History className="w-4 h-4" /> O histórico completo está disponível na aba Histórico (Logs).
            </div>
            {canManage && item.lifecycle_status === 'active' && mutableCallbacks && (
              <>
                <Button variant="outline" className="justify-start" onClick={() => handleMutableAction(mutableCallbacks.onEditItem, item)}>
                  <Edit className="w-4 h-4 mr-2" /> Editar cadastro do item
                </Button>
                <Button variant="outline" className="justify-start text-destructive" onClick={() => handleMutableAction(mutableCallbacks.onDeactivateItem, item)}>
                  <Archive className="w-4 h-4 mr-2" /> Desativar item
                </Button>
              </>
            )}
          </div>

          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              Código: {item.item_code || item.id}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InventoryItemDetailDrawer;
