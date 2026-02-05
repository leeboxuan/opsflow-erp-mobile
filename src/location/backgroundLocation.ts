/**
 * Background location task for Android.
 * Registered once in App.tsx. Receives location updates from expo-location
 * and sends the latest to the driver location API.
 * Location tracking is automatic and mandatory during active trips.
 */
import * as TaskManager from 'expo-task-manager';
import { updateLocation } from '../api/driver';
import type { LocationObject } from 'expo-location';

export const BACKGROUND_LOCATION_TASK_NAME = 'BACKGROUND_LOCATION';

export interface BackgroundLocationData {
  locations: LocationObject[];
}

TaskManager.defineTask<BackgroundLocationData>(
  BACKGROUND_LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.error('Background location task error:', error);
      return;
    }
    const locations = data?.locations;
    if (!locations?.length) return;

    const loc = locations[locations.length - 1];
    const { coords, timestamp } = loc;

    // Always send location when tracking is active (automatic during active trips)
    try {
      await updateLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        accuracy: coords.accuracy ?? 0,
        heading: coords.heading ?? undefined,
        speed: coords.speed != null ? coords.speed * 3.6 : undefined, // Convert m/s to km/h
        capturedAt: new Date(timestamp).toISOString(),
      });
    } catch (e) {
      console.error('Failed to send background location:', e);
    }
  }
);
