export const createEmptyInventoryReadModel = (tenantId = null, source = 'unavailable') => ({
  tenantId,
  source,
  categories: [],
  items: [],
  suppliers: [],
  movements: [],
  alerts: [],
  purchaseOrders: [],
  summary: {
    itemsCount: 0,
    categoriesCount: 0,
    suppliersCount: 0,
    activeSuppliersCount: 0,
    purchaseOrdersCount: 0,
    openAlertsCount: 0,
    criticalItemsCount: 0,
    lowStockItemsCount: 0,
    healthyItemsCount: 0,
    inactiveItemsCount: 0,
    movementsCount: 0,
  },
});

export const loadInventoryReadModel = async ({
  tenantId,
  canRead,
  isSupabaseMode,
  fetchSupabase,
  fetchMock,
}) => {
  if (!tenantId || !canRead) {
    return {
      data: createEmptyInventoryReadModel(tenantId),
      error: null,
    };
  }

  if (!isSupabaseMode) {
    return {
      data: await fetchMock(tenantId),
      error: null,
    };
  }

  try {
    return {
      data: await fetchSupabase(tenantId),
      error: null,
    };
  } catch (error) {
    const fallbackData = await fetchMock(tenantId);
    return {
      data: { ...fallbackData, source: 'fallback' },
      error: error instanceof Error ? error.message : 'Falha inesperada ao ler o estoque.',
    };
  }
};
