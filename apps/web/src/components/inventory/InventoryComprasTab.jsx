import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatInventoryPurchaseMoney as money, formatInventoryPurchaseDate as date } from '@/repositories/inventoryPurchasesContract.js';
import PurchaseDetailDrawer from './PurchaseDetailDrawer.jsx';
import InventoryOrdersPanel from './InventoryOrdersPanel.jsx';
const InventoryComprasTab = ({ purchases = [], items = [], suppliers = [], onSaveSupplier, source = 'unavailable', canManage = false, onReceive, onReverse, onRefresh, onLoadMore, loading, error, isSaving }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selected = purchases.find((p) => p.id === selectedId);
  if (!canManage) return <Card><CardContent className="p-6 text-sm text-muted-foreground">{source === 'supabase' ? 'Compras e custos são consultados pelos gestores autorizados da clínica. As movimentações de estoque continuam no Histórico.' : 'Recebimentos de compras não estão disponíveis nesta fonte demonstrativa.'}</CardContent></Card>;
  const filtered = purchases.filter((p) => (status === 'all' || p.status === status) && (p.supplier_name + ' ' + p.supplier_code + ' ' + p.id).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  return <div className="space-y-6 min-w-0">
    <InventoryOrdersPanel sourceAvailable={source === 'mock' && canManage} items={items} suppliers={suppliers} onSaveSupplier={onSaveSupplier} onChanged={onRefresh} selectedId={selectedOrderId} onSelect={setSelectedOrderId} busy={isSaving} />
    <div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{error ? 'Purchase history unavailable' : 'Local purchase records'}</Badge>{source !== 'supabase' && <p className="text-sm text-amber-800">Inventory and deliveries use fictional records.</p>}</div>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Compras recebidas</h2><p className="text-sm text-muted-foreground">Record manual de materiais e custos, sem efeito no Financeiro.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={loading || isSaving} onClick={onRefresh}>Atualizar compras</Button><Button disabled={!onReceive || isSaving} onClick={onReceive}>Registrar recebimento</Button></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Recorded receipts</p><p className="text-2xl font-bold">{purchases.length}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Estornados na consulta</p><p className="text-2xl font-bold">{purchases.filter((p) => p.status === 'reversed').length}</p></CardContent></Card></div>
    <Card className="border-border/50 shadow-sm p-4"><div className="flex flex-col sm:flex-row gap-3"><Input aria-label="Buscar compras" placeholder="Search by supplier or code" value={search} onChange={(e) => setSearch(e.target.value)} /><select aria-label="Situação da compra" className="rounded-md border border-input bg-background p-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Todas as situações</option><option value="received">Recebidos</option><option value="reversed">Estornados</option></select></div></Card>
    {loading && <p role="status" className="text-sm text-muted-foreground">Atualizando compras...</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Card className="border-border/50 shadow-sm overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Fornecedor</TableHead><TableHead>Registro</TableHead><TableHead>Situação</TableHead><TableHead className="text-right">Custo registrado</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader><TableBody>{filtered.map((p) => <TableRow key={p.id}><TableCell><div className="font-medium">{p.supplier_name}</div><div className="text-xs text-muted-foreground">{p.supplier_code}</div></TableCell><TableCell className="whitespace-nowrap">{date(p.created_at)}</TableCell><TableCell><Badge variant="outline">{p.status === 'reversed' ? 'Estornado' : 'Recebido'}</Badge></TableCell><TableCell className="text-right whitespace-nowrap">{money(p.total_cents)}</TableCell><TableCell><Button size="sm" variant="ghost" onClick={() => setSelectedId(p.id)}>Ver recebimento</Button></TableCell></TableRow>)}{!filtered.length && !loading && !error && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">Nenhum recebimento encontrado.</TableCell></TableRow>}</TableBody></Table></div></Card>
    {onLoadMore && <Button variant="outline" disabled={loading || isSaving} onClick={onLoadMore}>Carregar recebimentos anteriores</Button>}
    {selected && <PurchaseDetailDrawer key={selected.id} isOpen onOpenChange={(open) => !open && setSelectedId(null)} purchase={selected} onReverse={selected.order_id ? undefined : onReverse} onOpenOrder={selected.order_id ? () => { setSelectedId(null); setSelectedOrderId(selected.order_id); } : undefined} isSaving={isSaving} />}
  </div>;
};
export default InventoryComprasTab;
