
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, Edit, Archive, FilterX, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import InventoryItemDetailDrawer from './InventoryItemDetailDrawer.jsx';

const InventoryItemsTab = ({ items = [], canManage = false, mutableCallbacks, costs }) => {
  const allItems = items;
  const categoryOptions = [...new Set(allItems.map((item) => item.category_name).filter(Boolean))];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredItems = allItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category_name === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const openDrawer = (item) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setCategoryFilter('all');
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
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-border/50 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do item..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Estoque baixo">Estoque baixo</SelectItem>
                <SelectItem value="Crítico">Crítico</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters} className="px-3" title="Limpar Filtros">
              <FilterX className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Qtd Atual</TableHead>
                <TableHead className="text-right">Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length > 0 ? (
                filteredItems.map((item, i) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">{item.name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-0.5">{item.unit}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.category_name}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {item.current_quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {item.minimum_quantity}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {item.supplier_name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openDrawer(item)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          {canManage && item.lifecycle_status === 'active' && mutableCallbacks && (
                            <>
                              <DropdownMenuItem onClick={() => mutableCallbacks.onEditItem(item)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar item
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => mutableCallbacks.onRecordMovement(item, 'entry')} className="text-green-600 focus:text-green-700 focus:bg-green-50">
                                <ArrowDownToLine className="w-4 h-4 mr-2" /> Registrar entrada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => mutableCallbacks.onRecordMovement(item, 'consumption')} className="text-amber-600 focus:text-amber-700 focus:bg-amber-50">
                                <ArrowUpFromLine className="w-4 h-4 mr-2" /> Registrar consumo
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => mutableCallbacks.onRecordMovement(item, 'adjustment_increase')}>
                                <SlidersHorizontal className="w-4 h-4 mr-2" /> Ajustar estoque
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => mutableCallbacks.onDeactivateItem(item)} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Archive className="w-4 h-4 mr-2" /> Desativar item
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhum item encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <InventoryItemDetailDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        item={selectedItem}
        canManage={canManage}
        mutableCallbacks={mutableCallbacks}
        costs={costs}
      />
    </div>
  );
};

export default InventoryItemsTab;
