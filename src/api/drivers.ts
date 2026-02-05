import { apiClient, getErrorMessage } from './client';

export interface Driver {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  status?: 'Active' | 'Inactive' | 'On Trip';
  currentTripId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get all drivers (authenticated)
 */
export async function getDrivers(): Promise<Driver[]> {
  try {
    const response = await apiClient.get<Driver[]>('/transport/drivers');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a single driver by ID
 */
export async function getDriverById(driverId: string): Promise<Driver> {
  try {
    const response = await apiClient.get<Driver>(`/transport/drivers/${driverId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get driver's latest location (admin view).
 * Fallback when GET /trips/:tripId/location is not available.
 * GET /drivers/:driverId/location or /transport/drivers/:driverId/location
 */
export interface DriverLocationResponse {
  lat: number;
  lng: number;
  capturedAt?: string;
  accuracy?: number;
}

export async function getDriverLocation(driverId: string): Promise<DriverLocationResponse | null> {
  try {
    const response = await apiClient.get<DriverLocationResponse>(`/transport/drivers/${driverId}/location`);
    return response.data;
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    if (msg.includes('404') || msg.includes('not found')) return null;
    throw new Error(msg);
  }
}
