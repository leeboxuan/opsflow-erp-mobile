import { apiClient, getErrorMessage } from './client';
import { Trip, Stop } from './types';

/**
 * Get all trips (authenticated)
 */
export async function getTrips(): Promise<Trip[]> {
  try {
    const response = await apiClient.get<Trip[]>('/trips');
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a single trip by ID
 */
export async function getTripById(tripId: string): Promise<Trip> {
  try {
    const response = await apiClient.get<Trip>(`/trips/${tripId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get all stops for a trip
 */
export async function getTripStops(tripId: string): Promise<Stop[]> {
  try {
    const response = await apiClient.get<Stop[]>(`/trips/${tripId}/stops`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a single stop by ID
 */
export async function getStopById(
  tripId: string,
  stopId: string
): Promise<Stop> {
  try {
    const response = await apiClient.get<Stop>(
      `/trips/${tripId}/stops/${stopId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Update stop status (e.g., mark as arrived or completed)
 */
export async function updateStopStatus(
  tripId: string,
  stopId: string,
  status: Stop['status']
): Promise<Stop> {
  try {
    const response = await apiClient.patch<Stop>(
      `/trips/${tripId}/stops/${stopId}`,
      { status }
    );
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}
