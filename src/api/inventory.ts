import { apiClient, getErrorMessage } from './client';
import { InventoryItem } from './types';

/**
 * Search inventory items by SKU, reference, or name (for Create Order line items).
 */
export async function getInventoryItems(search: string): Promise<InventoryItem[]> {
  try {
    const response = await apiClient.get<InventoryItem[]>('/inventory/items', {
      params: { search: search.trim() || undefined },
    });
    return response.data ?? [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
