import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  createInventoryItemByTenant,
  createMockInventoryItemByTenant,
  deactivateInventoryItemByTenant,
  deactivateMockInventoryItemByTenant,
  inventoryOperationErrorMessage,
  recordInventoryMovementByTenant,
  recordMockInventoryMovementByTenant,
  updateInventoryItemByTenant,
  updateMockInventoryItemByTenant,
} from '@/repositories/index.js';

export const useInventoryOperations = ({ onChanged } = {}) => {
  const { currentTenantId, isSupabaseMode, canAccessModule, hasPermission } = useAuth();
  const canManage = Boolean(
    currentTenantId
      && canAccessModule('mod_estoque')
      && hasPermission('inventory.manage'),
  );
  const generationRef = useRef(0);
  const [mutationInFlightId, setMutationInFlightId] = useState(null);
  const [mutationError, setMutationError] = useState(null);

  useEffect(() => {
    generationRef.current += 1;
    setMutationInFlightId(null);
    setMutationError(null);
  }, [currentTenantId]);

  const runMutation = useCallback(async (lockId, supabaseOperation, mockOperation) => {
    if (!canManage || !currentTenantId) {
      const error = new Error('SS_INVENTORY_MANAGE_PERMISSION_DENIED');
      setMutationError(inventoryOperationErrorMessage(error));
      throw error;
    }
    if (mutationInFlightId) {
      const error = new Error('SS_INVENTORY_MUTATION_IN_FLIGHT');
      setMutationError('Aguarde a operação de estoque em andamento.');
      throw error;
    }

    const generation = generationRef.current;
    setMutationInFlightId(lockId);
    setMutationError(null);
    try {
      const result = await (isSupabaseMode ? supabaseOperation() : mockOperation());
      if (generation !== generationRef.current) {
        const staleResponseError = new Error('SS_INVENTORY_STALE_TENANT_RESPONSE');
        staleResponseError.code = 'SS_INVENTORY_STALE_TENANT_RESPONSE';
        throw staleResponseError;
      }
      await onChanged?.();
      return result;
    } catch (error) {
      if (generation === generationRef.current) setMutationError(inventoryOperationErrorMessage(error));
      throw error;
    } finally {
      if (generation === generationRef.current) setMutationInFlightId(null);
    }
  }, [canManage, currentTenantId, isSupabaseMode, mutationInFlightId, onChanged]);

  const createItem = useCallback((input) => runMutation(
    `create:${input.requestId}`,
    () => createInventoryItemByTenant(currentTenantId, input),
    () => createMockInventoryItemByTenant(currentTenantId, input, { canManage }),
  ), [canManage, currentTenantId, runMutation]);

  const updateItem = useCallback((itemId, input) => runMutation(
    `update:${itemId}`,
    () => updateInventoryItemByTenant(currentTenantId, itemId, input),
    () => updateMockInventoryItemByTenant(currentTenantId, itemId, input, { canManage }),
  ), [canManage, currentTenantId, runMutation]);

  const deactivateItem = useCallback((itemId, expectedUpdatedAt) => runMutation(
    `deactivate:${itemId}`,
    () => deactivateInventoryItemByTenant(currentTenantId, itemId, expectedUpdatedAt),
    () => deactivateMockInventoryItemByTenant(currentTenantId, itemId, expectedUpdatedAt, { canManage }),
  ), [canManage, currentTenantId, runMutation]);

  const recordMovement = useCallback((itemId, input) => runMutation(
    `movement:${itemId}`,
    () => recordInventoryMovementByTenant(currentTenantId, itemId, input),
    () => recordMockInventoryMovementByTenant(currentTenantId, itemId, input, { canManage }),
  ), [canManage, currentTenantId, runMutation]);

  const clearMutationError = useCallback(() => setMutationError(null), []);

  return {
    canManage,
    createItem,
    updateItem,
    deactivateItem,
    recordMovement,
    mutationInFlightId,
    mutationError,
    clearMutationError,
    refresh: onChanged,
  };
};

export default useInventoryOperations;
