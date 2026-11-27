import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchInventoryReadModelByTenant,
  getMockInventoryReadModelByTenant,
} from '@/repositories/index.js';
import {
  createEmptyInventoryReadModel,
  loadInventoryReadModel,
} from '@/repositories/inventoryReadModel.js';

export const useInventoryReadModel = () => {
  const {
    currentTenantId,
    isSupabaseMode,
    canAccessModule,
    hasPermission,
  } = useAuth();
  const canRead = Boolean(
    currentTenantId
      && canAccessModule('mod_estoque')
      && hasPermission('inventory.read'),
  );
  const activeTenantIdRef = useRef(currentTenantId);
  const [state, setState] = useState(() => ({
    data: createEmptyInventoryReadModel(currentTenantId),
    loading: Boolean(currentTenantId && canRead),
    error: null,
  }));
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;
    activeTenantIdRef.current = currentTenantId;

    if (!currentTenantId || !canRead) {
      setState({
        data: createEmptyInventoryReadModel(currentTenantId),
        loading: false,
        error: null,
      });
      return () => {
        isCurrentRequest = false;
      };
    }

    setState((previous) => ({
      data: previous.data.tenantId === currentTenantId ? previous.data : createEmptyInventoryReadModel(currentTenantId),
      loading: true,
      error: null,
    }));

    loadInventoryReadModel({
      tenantId: currentTenantId,
      canRead,
      isSupabaseMode,
      fetchSupabase: fetchInventoryReadModelByTenant,
      fetchMock: getMockInventoryReadModelByTenant,
    }).then((result) => {
      if (!isCurrentRequest || activeTenantIdRef.current !== currentTenantId) return;
      setState({
        data: result.data,
        loading: false,
        error: result.error,
      });
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [canRead, currentTenantId, isSupabaseMode, reloadToken]);

  const refresh = useCallback(() => setReloadToken((value) => value + 1), []);

  return {
    ...state,
    data: state.data.tenantId === currentTenantId && canRead ? state.data : createEmptyInventoryReadModel(currentTenantId),
    canRead,
    refresh,
    source: state.data.tenantId === currentTenantId && canRead ? state.data.source : 'unavailable',
  };
};

export default useInventoryReadModel;
