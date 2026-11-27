import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { fetchInventoryReplenishmentByTenant, mutateInventoryOrderByTenant } from '@/repositories/index.js';
import { INVENTORY_UNIT_LABELS } from '@/repositories/inventoryManualOperationsContract.js';
import { formatInventoryOrderQuantity as quantity } from '@/repositories/inventoryOrdersContract.js';
import InventoryOrderForm from './InventoryOrderForm.jsx';

const canPrepare = item => Boolean(item?.suggested_hundredths && item.suggested_hundredths !== '0');
const readError = 'Não foi possível consultar a reposição. Atualize para tentar novamente.';

function ReplenishmentPanel({ tenantId, sourceAvailable, suppliers, refreshToken, onChanged }) {
  const [page, setPage] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  const listSequence = useRef(0);
  const action = useRef(false);

  const load = useCallback(async (cursor = null) => {
    const sequence = ++listSequence.current;
    if (!sourceAvailable) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchInventoryReplenishmentByTenant(tenantId, { cursor });
      if (mounted.current && sequence === listSequence.current) {
        setPage(previous => cursor ? { ...next, items: [...new Map([...previous.items, ...next.items]
          .map(item => [item.item_id, item])).values()] } : next);
      }
    } catch {
      if (mounted.current && sequence === listSequence.current) setError(readError);
    } finally {
      if (mounted.current && sequence === listSequence.current) setLoading(false);
    }
  }, [tenantId, sourceAvailable]);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; listSequence.current++; };
  }, [load, refreshToken]);

  const readItem = async itemId => {
    const result = await fetchInventoryReplenishmentByTenant(tenantId, { itemId });
    return result.items[0];
  };

  const reviewDraft = async (previous, inForm) => {
    try {
      const latest = await readItem(previous.item_id);
      if (!mounted.current) return;
      if (canPrepare(latest)) {
        const message = inForm || latest.revision !== previous.revision
          ? `Reposição recalculada. Saldo atual ${quantity(latest.current_hundredths)}, mínimo ${quantity(latest.minimum_hundredths)}, em aberto ${quantity(latest.open_hundredths)} e nova sugestão de ${quantity(latest.suggested_hundredths)}. Revise a quantidade antes de confirmar.`
          : null;
        setDraft({ item: latest, message });
      } else {
        const message = latest?.shortage_hundredths === '0'
          ? 'A falta já está coberta pelos pedidos em aberto.'
          : 'O item deixou de ter uma sugestão disponível. Atualize a lista para revisar.';
        if (inForm) setDraft({ item: previous, blocked: true, message });
        else setError(message);
      }
    } catch {
      if (!mounted.current) return;
      if (inForm) setDraft({ item: previous, blocked: true, retry: true, message: readError });
      else setError(readError);
    }
  };

  const runExclusive = async run => {
    if (!mounted.current || action.current) {
      throw Object.assign(new Error('SS_INVENTORY_OPERATION_UNAVAILABLE'), { code: 'PT409' });
    }
    action.current = true;
    setBusy(true);
    try { return await run(); }
    finally {
      action.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const prepare = item => {
    if (!action.current) void runExclusive(() => reviewDraft(item, false));
  };
  const submit = input => runExclusive(async () => {
    if ((!sourceAvailable || draft.blocked) && !input.recovering) {
      throw Object.assign(new Error('SS_INVENTORY_OPERATION_UNAVAILABLE'), { code: 'PT409' });
    }
    try {
      await mutateInventoryOrderByTenant(tenantId, 'create', input);
      if (mounted.current) { void load(); onChanged?.(); }
    } catch (failure) {
      if (failure.message === 'SS_INVENTORY_REPLENISHMENT_CHANGED' && mounted.current) {
        await reviewDraft(draft.item, true);
        void load();
      }
      throw failure;
    }
  });

  return <Card className="border-border/50 shadow-sm">
    <CardContent className="space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-semibold">Reposição manual assistida</h3>
          <p className="text-sm text-muted-foreground">Compare o saldo físico, o mínimo do item e as quantidades em aberto na clínica.</p></div>
        <Button type="button" variant="outline" disabled={!sourceAvailable || loading || busy} onClick={() => load()}>Atualizar reposição</Button>
      </div>
      {!sourceAvailable && <p role="status" className="text-sm">A reposição requer uma leitura confirmada do estoque da clínica.</p>}
      {sourceAvailable && loading && <p role="status" className="text-sm">Consultando reposição...</p>}
      {sourceAvailable && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {sourceAvailable && !loading && !error && page.items.length === 0 && <p className="text-sm">Nenhum item ativo abaixo do mínimo.</p>}
      {sourceAvailable && !error && page.items.map(item => <div key={item.item_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div className="min-w-0">
          <p className="font-medium break-words">{item.item_name} · {INVENTORY_UNIT_LABELS[item.unit_code] || 'Unidade a revisar'}</p>
          <p className="text-sm">Saldo atual {quantity(item.current_hundredths)} · Mínimo {quantity(item.minimum_hundredths)} · Em aberto {quantity(item.open_hundredths)} · Falta {quantity(item.shortage_hundredths)}</p>
          {item.shortage_hundredths === '0' && <p className="text-sm text-muted-foreground">Coberto por pedidos em aberto.</p>}
          {item.suggested_hundredths === null && <p className="text-sm text-muted-foreground">Revise a unidade ou o limite da quantidade antes de preparar um pedido.</p>}
          {canPrepare(item) && item.shortage_hundredths !== item.suggested_hundredths && <p className="text-sm">Sugestão arredondada para {quantity(item.suggested_hundredths)}.</p>}
        </div>
        {canPrepare(item) && <Button disabled={loading || busy} onClick={() => prepare(item)}>Preparar pedido</Button>}
      </div>)}
      {sourceAvailable && !error && page.next_cursor && <Button variant="outline" disabled={loading || busy} onClick={() => load(page.next_cursor)}>Carregar mais itens</Button>}
      {draft && <InventoryOrderForm replenishment={draft.item}
        review={{ blocked: draft.blocked || !sourceAvailable, message: draft.message,
          retry: draft.retry && sourceAvailable ? () => runExclusive(() => reviewDraft(draft.item, true)) : undefined }}
        items={[{ id: draft.item.item_id, name: draft.item.item_name, unit_code: draft.item.unit_code, lifecycle_status: 'active' }]}
        suppliers={suppliers} onSubmit={submit} isSaving={busy} onClose={() => setDraft(null)} />}
    </CardContent>
  </Card>;
}

export default function InventoryReplenishmentPanel(props) {
  const { currentTenantId, user, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  if (!currentTenantId || !user?.id || !isSupabaseMode || !canAccessModule('mod_estoque') || !hasPermission('inventory.manage')) return null;
  return <ReplenishmentPanel key={`${currentTenantId}:${user.id}`} tenantId={currentTenantId} {...props} />;
}
