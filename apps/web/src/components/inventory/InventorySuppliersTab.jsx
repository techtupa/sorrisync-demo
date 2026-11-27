
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, Edit, FilterX, ShoppingCart, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import InventorySupplierDetailDrawer from './InventorySupplierDetailDrawer.jsx';

const InventorySuppliersTab = ({ suppliers = [], onCreateSupplier, onEditSupplier }) => {
  const allSuppliers = suppliers;
  const activeSuppliers = allSuppliers.filter((supplier) => supplier.status === 'Ativo');
  const recentReplenishments = allSuppliers.reduce((total, supplier) => total + (supplier.recent_replenishments || 0), 0);
  const mainSupplier = [...allSuppliers].sort((a, b) => (b.items_supplied || 0) - (a.items_supplied || 0))[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredSuppliers = allSuppliers.filter(sup => {
    const matchesSearch = sup.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sup.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDrawer = (supplier) => {
    setSelectedSupplier(supplier);
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Ativo': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>;
      case 'Em avaliação': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Em avaliação</Badge>;
      default: return <Badge variant="outline" className="inv-badge-inactive">Inativo</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {onCreateSupplier && <div className="flex justify-end"><Button onClick={onCreateSupplier}>Novo fornecedor</Button></div>}
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fornecedores Ativos</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{activeSuppliers.length}</span>
              <span className="text-xs text-muted-foreground">de {allSuppliers.length} cadastrados</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entradas de itens vinculados</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{recentReplenishments}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card col-span-2 md:col-span-1">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fornecedor Principal</p>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-foreground">{mainSupplier?.name || 'Não definido'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou cidade..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Ativo">Ativos</SelectItem>
                <SelectItem value="Em avaliação">Em avaliação</SelectItem>
                <SelectItem value="Inativo">Inativos</SelectItem>
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
                <TableHead className="w-[250px]">Fornecedor</TableHead>
                <TableHead>Categoria Principal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contato Operacional</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="text-right">Entradas de itens vinculados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((sup, i) => (
                  <motion.tr
                    key={sup.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                  >
                    <TableCell>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {sup.name}
                        {sup.is_preferred && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Pref</Badge>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{sup.items_supplied} itens vinculados</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 break-all">{sup.supplier_code}</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sup.category}</TableCell>
                    <TableCell>{getStatusBadge(sup.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sup.contact}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{sup.city}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {sup.recent_replenishments > 0 ? sup.recent_replenishments : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openDrawer(sup)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <ShoppingCart className="w-4 h-4 mr-2" /> Nova reposição
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled>
                            <Package className="w-4 h-4 mr-2" /> Ver catálogo
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>
                            <Package className="w-4 h-4 mr-2" /> Escopo MVP
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem disabled={!onEditSupplier} onClick={() => onEditSupplier?.(sup)}>
                            <Edit className="w-4 h-4 mr-2" /> Editar dados
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    Nenhum fornecedor encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <InventorySupplierDetailDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        supplier={allSuppliers.find((s) => s.id === selectedSupplier?.id) || selectedSupplier}
        onEditSupplier={onEditSupplier ? (supplier) => { setIsDrawerOpen(false); onEditSupplier(supplier); } : undefined}
      />
    </div>
  );
};

export default InventorySuppliersTab;
