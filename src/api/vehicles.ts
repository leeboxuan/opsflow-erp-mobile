import { apiClient, getErrorMessage } from './client';

export interface Vehicle {
  id: string;
  plateNumber: string;
  make?: string;
  model?: string;
  year?: number;
  type?: 'Truck' | 'Van' | 'Trailer';
  capacity?: string;
  status?: 'Available' | 'In Use' | 'Maintenance';
  currentTripId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get all vehicles (authenticated)
 */
export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const response = await apiClient.get<Vehicle[]>('/transport/vehicles');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a single vehicle by ID
 */
export async function getVehicleById(vehicleId: string): Promise<Vehicle> {
  try {
    const response = await apiClient.get<Vehicle>(`/transport/vehicles/${vehicleId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
