import { apiClient, getErrorMessage } from './client';
import { Trip, Order } from './types';

function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Get a single trip by ID (includes stops)
 * GET /transport/trips/:tripId
 */
export async function getTransportTrip(tripId: string): Promise<Trip> {
  try {
    const response = await apiClient.get<Trip>(`/transport/trips/${tripId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Update trip status (e.g. InTransit, Completed)
 * PATCH /transport/trips/:tripId/status
 * Body: { status: string }
 */
export async function patchTripStatus(tripId: string, status: string): Promise<Trip> {
  try {
    const response = await apiClient.patch<Trip>(`/transport/trips/${tripId}/status`, { status });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get trips for today (driver context)
 * GET /transport/trips?date=YYYY-MM-DD
 * Auth and x-tenant-id headers are added by apiClient interceptors.
 */
export async function getTransportTrips(date: Date): Promise<Trip[]> {
  try {
    const response = await apiClient.get('/transport/trips', {
      params: { date: formatDateForApi(date) },
    });
    const data: unknown = response.data;
    if (Array.isArray(data)) return data as Trip[];
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj?.trips)) return obj.trips as Trip[];
    if (Array.isArray(obj?.data)) return obj.data as Trip[];
    if (Array.isArray(obj?.items)) return obj.items as Trip[];
    return [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get unassigned orders for today
 * GET /transport/orders?unassigned=true&date=YYYY-MM-DD
 */
export async function getUnassignedOrders(date: Date): Promise<Order[]> {
  try {
    const response = await apiClient.get('/transport/orders', {
      params: { unassigned: true, date: formatDateForApi(date) },
    });
    const data: unknown = response.data;
    if (Array.isArray(data)) return data as Order[];
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj?.orders)) return obj.orders as Order[];
    if (Array.isArray(obj?.data)) return obj.data as Order[];
    if (Array.isArray(obj?.items)) return obj.items as Order[];
    return [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Accept (assign) an order to a trip or create a new trip for today.
 * POST /transport/orders/:orderId/accept
 * Body: { tripId?: string } — omit for "create new trip"
 */
export async function acceptOrder(orderId: string, tripId?: string): Promise<{ tripId?: string; trip?: { id: string; stops: unknown[] } }> {
  try {
    const response = await apiClient.post(`/transport/orders/${orderId}/accept`, tripId != null ? { tripId } : {});
    const data: unknown = response.data;
    if (data && typeof data === 'object' && 'tripId' in (data as object)) return data as { tripId?: string; trip?: { id: string; stops: unknown[] } };
    return {};
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Unassign an order from its trip.
 * POST /transport/orders/:orderId/unassign
 * May not exist yet; caller should handle 404 and fall back to refetch.
 */
export async function unassignOrder(orderId: string): Promise<void> {
  await apiClient.post(`/transport/orders/${orderId}/unassign`);
}

/**
 * Reorder stops within a trip.
 * PATCH /transport/trips/:tripId/reorder-stops
 * Body: { stopIdsInOrder: string[] }
 */
export async function reorderStops(tripId: string, stopIdsInOrder: string[]): Promise<Trip> {
  try {
    const response = await apiClient.patch<Trip>(`/transport/trips/${tripId}/reorder-stops`, {
      stopIdsInOrder,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Move a stop to another trip.
 * POST /transport/stops/:stopId/move
 * Body: { targetTripId: string; insertAfterStopId?: string }
 */
export async function moveStop(
  stopId: string,
  targetTripId: string,
  insertAfterStopId?: string
): Promise<void> {
  try {
    await apiClient.post(`/transport/stops/${stopId}/move`, {
      targetTripId,
      insertAfterStopId: insertAfterStopId ?? undefined,
    });
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
