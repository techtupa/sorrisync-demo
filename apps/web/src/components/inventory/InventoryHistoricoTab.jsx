
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, MoreHorizontal, Eye, FilterX, History, Activity, CalendarDays, ArrowRightSquare, ArrowLeftSquare, PackageOpen, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import HistoryDetailDrawer from './HistoryDetailDrawer.jsx';

const InventoryHistoricoTab = ({ events = [] }) => {
  const allEvents = events;
  const entryCount = allEvents.filter((event) => event.type === 'Entrada').length;
  const exitCount = allEvents.filter((event) => ['Saída', 'Consumo'].includes(event.type)).length;
  const adjustmentCount = allEvents.filter((event) => event.type.startsWith('Ajuste')).length;
  const movedItemsCount = new Set(allEvents.map((event) => event.item)).size;

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const filteredEvents = allEvents.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchTerm.toLowerCase()) || e.item.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || e.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const openDrawer = (event) => {
    setSelectedEvent(event);
    setIsDrawerOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
  };

  const getEventBadge = (type) => {
    switch (type) {
      case 'Entrada':
      case 'Reposição recebida': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{type}</Badge>;
      case 'Saída': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{type}</Badge>;
      case 'Reposição planejada': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{type}</Badge>;
      case 'Alerta gerado': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{type}</Badge>;
      default: return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-border/50 shadow-sm bg-card lg:col-span-2">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Movimentações Recentes</p>
              <Activity className="w-4 h-4 text-primary opacity-50" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">{allEvents.length}</span>
              <span className="text-xs text-muted-foreground">registros lidos</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entradas</p>
            <div className="flex items-baseline gap-2 text-green-600">
              <span className="text-2xl font-bold">{entryCount}</span>
              <ArrowLeftSquare className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Saídas</p>
            <div className="flex items-baseline gap-2 text-amber-600">
              <span className="text-2xl font-bold">{exitCount}</span>
              <ArrowRightSquare className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-[hsl(var(--inv-critical)_/_0.3)] shadow-sm bg-[hsl(var(--inv-critical)_/_0.02)]">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-[hsl(var(--inv-critical))] uppercase tracking-wider mb-1">Ajustes</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[hsl(var(--inv-critical))]">{adjustmentCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Itens</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary">{movedItemsCount}</span>
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
              placeholder="Buscar por evento ou item/reposição..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="Entrada">Entrada</SelectItem>
                <SelectItem value="Saída">Saída</SelectItem>
                <SelectItem value="Consumo">Consumo</SelectItem>
                <SelectItem value="Ajuste de aumento">Ajuste de aumento</SelectItem>
                <SelectItem value="Ajuste de redução">Ajuste de redução</SelectItem>
                <SelectItem value="Reposição planejada">Reposição planejada</SelectItem>
                <SelectItem value="Reposição recebida">Reposição recebida</SelectItem>
                <SelectItem value="Alerta gerado">Alerta gerado</SelectItem>
                <SelectItem value="Estoque mínimo alterado">Estoque mínimo alterado</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" className="px-3" title="Filtros avançados (Visual)">
              <CalendarDays className="w-4 h-4 mr-2" /> Período
            </Button>

            <Button variant="outline" onClick={clearFilters} className="px-3" title="Limpar Filtros">
              <FilterX className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <History className="w-5 h-5 text-primary" /> Log de Auditoria do Estoque
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Movimentações operacionais da clínica atual em modo somente leitura.</p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[140px]">Data / Hora</TableHead>
                <TableHead className="w-[220px]">Evento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item / Reposição</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length > 0 ? (
                filteredEvents.map((e, i) => (
                  <motion.tr
                    key={e.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                  >
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">{new Date(e.date).toLocaleDateString('en-US')}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(e.date).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{e.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{e.details}</div>
                    </TableCell>
                    <TableCell>
                      {getEventBadge(e.type)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-foreground">{e.item}</span>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{e.category}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-foreground">{e.origin || 'Registro operacional'}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openDrawer(e)}>
                            <Eye className="w-4 h-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {e.type.includes('Reposição') ? (
                            <DropdownMenuItem disabled>
                              <PackageOpen className="w-4 h-4 mr-2" /> Abrir reposição
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem disabled>
                              <PackageOpen className="w-4 h-4 mr-2" /> Abrir item
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem disabled className="text-primary focus:text-primary focus:bg-primary/10">
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Marcar revisado
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhum evento encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <HistoryDetailDrawer
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        event={selectedEvent}
      />
    </div>
  );
};

export default InventoryHistoricoTab;
