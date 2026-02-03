import { apiClient, getErrorMessage } from './client';
import { LocationData } from '../location/LocationTracker';
import { Trip } from './types';

/**
 * Update driver location
 * POST /api/driver/location
 */
export interface UpdateLocationRequest {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  capturedAt: string; // ISO timestamp
}

/**
 * Update driver location (authenticated, requires x-tenant-id header)
 */
export async function updateLocation(location: LocationData): Promise<void> {
  try {
    const payload: UpdateLocationRequest = {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      capturedAt: location.capturedAt,
    };

    await apiClient.post('/driver/location', payload);
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/** Date as YYYY-MM-DD for query params */
function formatDateForApi(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Get trips for the driver for a given date
 * GET /api/driver/trips?date=YYYY-MM-DD
 */
export async function getTrips(date: Date): Promise<Trip[]> {
  try {
    const response = await apiClient.get<Trip[]>('/driver/trips', {
      params: { date: formatDateForApi(date) },
    });
    return response.data ?? [];
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

/**
 * Get a single trip by ID (driver context)
 * GET /api/driver/trips/:tripId
 */
export async function getTrip(tripId: string): Promise<Trip> {
  try {
    const response = await apiClient.get<Trip>(`/driver/trips/${tripId}`);
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export interface AcceptTripPayload {
  assignedVehicleId: string;
  trailerNo?: string;
}

/**
 * Driver accepts a trip (assign vehicle/trailer)
 * POST /api/driver/trips/:tripId/accept
 */
export async function acceptTrip(
  tripId: string,
  payload: AcceptTripPayload
): Promise<Trip> {
  try {
    const response = await apiClient.post<Trip>(`/driver/trips/${tripId}/accept`, payload);
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
 * Driver starts a stop (e.g. arrived at stop)
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
  /** MVP: pass local image URIs (e.g. file://...). Later: storage keys */
  podPhotoKeys?: string[];
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
