/**
 * Driver background location service (Android).
 * Start/stop tracking only during active trips. Requests foreground + background permissions.
 */
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { BACKGROUND_LOCATION_TASK_NAME } from './backgroundLocation';

const TRACKING_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.LocationAccuracy.High,
  timeInterval: 10000,
  distanceInterval: 20,
  pausesUpdatesAutomatically: false,
  foregroundService: {
    notificationTitle: 'OpsFlow tracking active',
    notificationBody: 'Sharing live location for current trip',
  },
};

/**
 * Request foreground and (on Android) background location permissions.
 * Call before startBackgroundTracking().
 */
export async function requestLocationPermissions(): Promise<boolean> {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  if (Platform.OS === 'android') {
    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') return false;
  }

  return true;
}

/**
 * Start background location updates (Android). Sends locations to the driver API via the registered task.
 * Must be called while app is in foreground. Call after requestLocationPermissions().
 * Idempotent: hasStartedLocationUpdatesAsync guard prevents double-start when called from both
 * startTripMutation.onSuccess and the trip-status useEffect.
 */
export async function startBackgroundTracking(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
  if (alreadyStarted) {
    return; // Already running, idempotent
  }

  const hasPermission = await requestLocationPermissions();
  if (!hasPermission) {
    throw new Error('Location permission denied (foreground or background).');
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME, TRACKING_OPTIONS);
}

/**
 * Stop background location updates.
 * Idempotent: hasStartedLocationUpdatesAsync guard returns early if not started.
 */
export async function stopBackgroundTracking(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
  if (!isStarted) {
    return; // Not running, idempotent
  }

  try {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
  } catch (e) {
    console.warn('stopBackgroundTracking:', e);
  }
}

/**
 * Check if background location updates are currently running.
 */
export async function isBackgroundTrackingActive(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK_NAME);
}
