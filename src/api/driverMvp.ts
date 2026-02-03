/**
 * Driver MVP API - aligns with monorepo backend routes under /api
 */
import { apiClient, getErrorMessage } from './client';
import { Trip } from './types';

/** Date as YYYY-MM-DD for query params */
function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Get trips assigned to the current driver for a given date
 * GET /api/driver/trips?date=YYYY-MM-DD
 */
export async function getDriverTrips(date: Date): Promise<Trip[]> {
  try {
    const params = { date: formatDateForApi(date) };
    const response = await apiClient.get<Trip[]>('/driver/trips', { params });
    return response.data ?? [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Driver accepts a trip (assign vehicle/trailer)
 * POST /api/driver/trips/:tripId/accept
 */
export async function acceptTrip(
  tripId: string,
  vehicleNumber: string,
  trailerNumber?: string
): Promise<Trip> {
  try {
    const response = await apiClient.post<Trip>(`/driver/trips/${tripId}/accept`, {
      vehicleNumber,
      trailerNumber,
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Driver starts a trip
 * POST /api/driver/trips/:tripId/start
 */
export async function startTrip(tripId: string): Promise<Trip> {
  try {
    const response = await apiClient.post<Trip>(`/driver/trips/${tripId}/start`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Driver starts a stop (e.g. arrived)
 * POST /api/driver/stops/:stopId/start
 */
export async function startStop(stopId: string): Promise<void> {
  try {
    await apiClient.post(`/driver/stops/${stopId}/start`);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export interface CompleteStopPayload {
  photoUrl?: string;
  signedBy?: string;
}

/**
 * Driver completes a stop with optional POD data
 * POST /api/driver/stops/:stopId/complete
 */
export async function completeStop(
  stopId: string,
  payload: CompleteStopPayload
): Promise<void> {
  try {
    await apiClient.post(`/driver/stops/${stopId}/complete`, payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export interface WalletSummary {
  month: string;
  totalEarnings?: number;
  tripsCompleted?: number;
  [key: string]: unknown;
}

/**
 * Get driver wallet/summary for a month
 * GET /api/driver/wallet?month=YYYY-MM
 */
export async function getWallet(month: Date): Promise<WalletSummary> {
  try {
    const monthStr = month.getFullYear() + '-' + String(month.getMonth() + 1).padStart(2, '0');
    const response = await apiClient.get<WalletSummary>('/driver/wallet', {
      params: { month: monthStr },
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
