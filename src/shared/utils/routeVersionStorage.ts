import { createMMKV } from 'react-native-mmkv';

const PREFIX = 'opsflow_lastSeenRouteVersion_';

const storage = createMMKV({
  id: 'opsflow-route-version',
});

/**
 * Get last seen routeVersion for a trip (for route-update detection).
 * Returns undefined if never set.
 */
export function getLastSeenRouteVersion(tripId: string): number | undefined {
  try {
    const raw = storage.getString(PREFIX + tripId);
    if (raw == null || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Store last seen routeVersion for a trip.
 */
export function setLastSeenRouteVersion(tripId: string, version: number): void {
  try {
    storage.set(PREFIX + tripId, String(version));
  } catch (e) {
    console.warn('Failed to set lastSeenRouteVersion:', e);
  }
}

/**
 * Clear stored version for a trip (e.g. when leaving trip context).
 */
export function clearLastSeenRouteVersion(tripId: string): void {
  try {
    storage.delete(PREFIX + tripId);
  } catch {
    // no-op
  }
}
