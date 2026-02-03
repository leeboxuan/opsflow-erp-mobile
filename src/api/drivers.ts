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
