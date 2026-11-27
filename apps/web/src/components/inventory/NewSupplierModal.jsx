import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createInventoryRequestId } from '@/repositories/index.js';
import { inventoryPurchaseErrorMessage, isInventoryPurchaseKnownRefusal } from '@/repositories/inventoryPurchasesContract.js';

const NewSupplierModal = ({ isOpen, onOpenChange, supplier = null, suppliers = [], onSubmit, isSaving = false }) => {
  const [name, setName] = useState(supplier?.name || '');
  const [status, setStatus] = useState(supplier?.lifecycle_status || 'active');
  const [error, setError] = useState(null);
  const [uncertain, setUncertain] = useState(false);
  const attempt = useRef(null);
  const duplicate = suppliers.some((s) => s.id !== supplier?.id && s.name.trim().toLocaleLowerCase('pt-BR') === name.trim().toLocaleLowerCase('pt-BR'));
  const submit = async (event) => {
    event.preventDefault();
    if (name.trim().length < 2 || name.trim().length > 120) { setError('Informe um nome entre 2 e 120 caracteres.'); return; }
    const input = uncertain ? attempt.current.input : { supplierId: supplier?.id || null, expectedUpdatedAt: supplier?.updated_at || null, displayName: name.trim(), status: ['active', 'inactive'].includes(status) ? status : null };
    const signature = JSON.stringify(input);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = { signature, input, requestId: createInventoryRequestId() };
    setError(null);
    try { const result = await onSubmit({ ...input, requestId: attempt.current.requestId, recovering: uncertain }); setUncertain(false); onOpenChange(false, result); }
    catch (failure) { setError(inventoryPurchaseErrorMessage(failure)); setUncertain(!isInventoryPurchaseKnownRefusal(failure)); }
  };
  return <Dialog open={isOpen} onOpenChange={(open) => !isSaving && !uncertain && onOpenChange(open)}>
    <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>{supplier ? 'Editar fornecedor' : 'Novo fornecedor'}</DialogTitle>
        <DialogDescription>Cadastro operacional da clínica, sem documentos, contatos ou dados de pagamento.</DialogDescription></DialogHeader>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="supplier-name">Nome operacional</Label><Input id="supplier-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required disabled={isSaving || uncertain} /></div>
        {duplicate && <p className="text-sm text-amber-800" role="status">Já existe um fornecedor com esse nome. Confira os códigos para evitar um cadastro duplicado.</p>}
        {supplier && <div className="space-y-2"><Label htmlFor="supplier-status">Situação</Label><select id="supplier-status" className="w-full rounded-md border border-input bg-background p-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSaving || uncertain}>
          {!['active', 'inactive'].includes(status) && <option value={status}>Manter situação atual</option>}<option value="active">Ativo</option><option value="inactive">Inativo</option>
        </select><p className="text-xs text-muted-foreground">Inativar preserva os recebimentos anteriores.</p></div>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={isSaving || uncertain} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? 'Salvando...' : uncertain ? 'Recuperar solicitação' : 'Salvar fornecedor'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
};
export default NewSupplierModal;
