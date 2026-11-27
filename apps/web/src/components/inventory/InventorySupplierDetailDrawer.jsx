
import React from 'react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Truck, MapPin, Phone, ShoppingCart, Edit, Package } from 'lucide-react';

const InventorySupplierDetailDrawer = ({ isOpen, onOpenChange, supplier, onEditSupplier }) => {
  if (!supplier) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ativo': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>;
      case 'Em avaliação': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Em avaliação</Badge>;
      default: return <Badge variant="outline" className="inv-badge-inactive">Inativo</Badge>;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-xl overflow-y-auto custom-scrollbar p-0">
        <div className="p-6 bg-muted/30 border-b border-border/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-background rounded-xl border border-border/50 shadow-sm shrink-0">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                {getStatusBadge(supplier.status)}
                {supplier.is_preferred && (
                  <Badge variant="secondary" className="text-[10px]">Preferencial</Badge>
                )}
              </div>
              <SheetTitle className="text-xl font-bold text-foreground truncate pr-4">
                {supplier.name}
              </SheetTitle>
              <SheetDescription className="text-sm mt-1">
                {supplier.category}
              </SheetDescription>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button size="sm" className="shadow-sm" disabled>
              <ShoppingCart className="w-4 h-4 mr-2" /> Nova Reposição
            </Button>
            <Button size="sm" variant="outline" disabled>
              <Package className="w-4 h-4 mr-2" /> Escopo MVP
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Informações de Contato */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Contato Operacional</h4>
            <div className="p-4 border border-border/50 rounded-xl bg-card space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{supplier.contact || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{supplier.city || 'Não informada'}</span>
              </div>
            </div>
          </div>

          {/* Resumo Comercial */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Itens vinculados</p>
              <p className="text-2xl font-bold text-foreground tabular-nums flex items-center gap-2">
                {supplier.items_supplied}
                <Package className="w-4 h-4 text-muted-foreground/50" />
              </p>
            </div>
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Entradas de itens vinculados</p>
              <p className="text-2xl font-bold text-foreground tabular-nums flex items-center gap-2">
                {supplier.recent_replenishments}
                <ShoppingCart className="w-4 h-4 text-muted-foreground/50" />
              </p>
            </div>
          </div>

          {/* Últimas Reposições */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              Últimas Reposições
            </h4>
            <div className="p-4 border border-border/50 rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">Foram identificadas {supplier.recent_replenishments || 0} entradas para itens vinculados neste recorte de leitura.</p>
            </div>
          </div>

          {/* Ações */}
          <Separator />
          <div className="grid grid-cols-1 gap-2 pt-2">
            <Button variant="outline" className="justify-start" disabled={!onEditSupplier} onClick={() => onEditSupplier?.(supplier)}>
              <Edit className="w-4 h-4 mr-2" /> Editar cadastro do fornecedor
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <Package className="w-4 h-4 mr-2" /> Ver catálogo de itens vinculados
            </Button>
          </div>

          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground font-mono">
              Cadastro operacional com histórico preservado
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InventorySupplierDetailDrawer;
