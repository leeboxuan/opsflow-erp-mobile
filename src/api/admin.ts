import { apiClient, getErrorMessage } from './client';

export interface DriverLocation {
  driverUserId: string;
  driverLabel: string;
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  updatedAt: string; // ISO timestamp
}

/**
 * Get all driver locations for the current tenant (Admin only)
 * GET /api/admin/locations
 */
export async function getDriverLocations(): Promise<DriverLocation[]> {
  try {
    const response = await apiClient.get<DriverLocation[]>('/admin/locations');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
