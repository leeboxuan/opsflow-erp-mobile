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
 * Driver location for a trip (admin view).
 * Prefer: GET /trips/:tripId/location
 * Response: { lat, lng, capturedAt?, accuracy? }
 */
export interface TripLocationResponse {
  lat: number;
  lng: number;
  capturedAt?: string;
  accuracy?: number;
}

export async function getTripLocation(tripId: string): Promise<TripLocationResponse | null> {
  try {
    const response = await apiClient.get<TripLocationResponse>(`/trips/${tripId}/location`);
    return response.data;
  } catch (error: unknown) {
    const msg = getErrorMessage(error);
    if (msg.includes('404') || msg.includes('not found')) return null;
    throw new Error(msg);
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

