import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2 } from 'lucide-react';

const DeactivateInventoryItemDialog = ({ isOpen, onOpenChange, item, onConfirm, isSaving, operationError }) => {
  if (!item) return null;
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !isSaving && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desativar item?</AlertDialogTitle>
          <AlertDialogDescription>
            {item.name} será mantido com saldo e movimentações históricas. Novas movimentações ficarão bloqueadas.
            {Number(item.current_quantity) > 0 ? ` Há saldo remanescente de ${item.current_quantity} ${item.unit}; nenhum ajuste será criado automaticamente.` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {operationError && <p role="alert" className="text-sm text-destructive">{operationError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSaving}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={async (event) => {
              event.preventDefault();
              try {
                await onConfirm?.();
                onOpenChange(false);
              } catch {
                // O hook fornece a mensagem saneada em operationError.
              }
            }}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Desativar item
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeactivateInventoryItemDialog;
