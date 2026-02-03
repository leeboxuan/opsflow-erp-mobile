/**
 * LocationTracker - Handles driver location tracking
 * - Starts/stops geolocation watching
 * - Updates location at configured intervals or distance thresholds
 * - Sends location updates to API
 */

import Geolocation from 'react-native-geolocation-service';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { updateLocation } from '../api/driver';
import { getShareLiveLocation } from '../shared/utils/authStorage';

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  heading?: number;
  speed?: number;
  capturedAt: string; // ISO timestamp
}

export interface LocationTrackerOptions {
  onLocationUpdate?: (location: LocationData) => void;
  onError?: (error: Error) => void;
  updateInterval?: number; // milliseconds (default: 5000)
  distanceThreshold?: number; // meters (default: 20)
}

class LocationTracker {
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private lastSentLocation: LocationData | null = null;
  private lastSentTime: number = 0;
  private options: LocationTrackerOptions;
  private permissionRequested: boolean = false;

  constructor(options: LocationTrackerOptions = {}) {
    this.options = {
      updateInterval: 5000, // 5 seconds
      distanceThreshold: 20, // 20 meters
      ...options,
    };
  }

  /**
   * Request location permissions (Android)
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      // iOS permissions are handled via Info.plist and will prompt automatically
      return true;
    }

    if (this.permissionRequested) {
      return false;
    }

    try {
      const fineLocationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'OpsFlow needs access to your location to track deliveries.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      if (fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED) {
        this.permissionRequested = true;
        return true;
      } else if (fineLocationGranted === PermissionsAndroid.RESULTS.DENIED) {
        Alert.alert(
          'Location Permission Denied',
          'Location tracking is required for driver mode. Please enable it in app settings.',
          [{ text: 'OK' }]
        );
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Check if location should be sent based on interval and distance
   */
  private shouldSendLocation(newLocation: LocationData): boolean {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastSentTime;

    // Always send first location
    if (!this.lastSentLocation) {
      return true;
    }

    // Send if interval has passed
    if (timeSinceLastUpdate >= (this.options.updateInterval || 5000)) {
      return true;
    }

    // Send if moved more than threshold distance
    if (this.lastSentLocation) {
      const distance = this.calculateDistance(
        this.lastSentLocation.lat,
        this.lastSentLocation.lng,
        newLocation.lat,
        newLocation.lng
      );
      if (distance >= (this.options.distanceThreshold || 20)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Send location update to API
   * Only sends if "Share Live Location" is enabled
   */
  private async sendLocationToAPI(location: LocationData): Promise<void> {
    // Check if sharing is enabled before sending
    const shareEnabled = getShareLiveLocation();
    if (!shareEnabled) {
      console.log('⏸️ Location update skipped (sharing disabled)');
      // Still update local state for UI display
      this.lastSentLocation = location;
      this.lastSentTime = Date.now();
      if (this.options.onLocationUpdate) {
        this.options.onLocationUpdate(location);
      }
      return;
    }

    try {
      await updateLocation(location);
      this.lastSentLocation = location;
      this.lastSentTime = Date.now();

      if (this.options.onLocationUpdate) {
        this.options.onLocationUpdate(location);
      }

      console.log(`✅ Location sent: ${location.lat}, ${location.lng}`);
    } catch (error) {
      console.error('❌ Failed to send location:', error);
      if (this.options.onError && error instanceof Error) {
        this.options.onError(error);
      }
    }
  }

  /**
   * Handle geolocation success
   */
  private handleLocationUpdate = (position: Geolocation.GeoPosition) => {
    const location: LocationData = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy || 0,
      heading: position.coords.heading || undefined,
      speed: position.coords.speed ? position.coords.speed * 3.6 : undefined, // Convert m/s to km/h
      capturedAt: new Date(position.timestamp).toISOString(),
    };

    // Only send if interval or distance threshold met
    if (this.shouldSendLocation(location)) {
      this.sendLocationToAPI(location);
    }
  };

  /**
   * Handle geolocation error
   */
  private handleLocationError = (error: Geolocation.GeoError) => {
    console.error('Geolocation error:', error);
    if (this.options.onError) {
      this.options.onError(new Error(error.message || 'Location tracking error'));
    }
  };

  /**
   * Start location tracking
   */
  async startTracking(): Promise<boolean> {
    if (this.isTracking) {
      console.log('⚠️ Location tracking already started');
      return true;
    }

    // Request permissions first
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.error('❌ Location permission not granted');
      return false;
    }

    try {
      // Clear any existing watch
      if (this.watchId !== null) {
        Geolocation.clearWatch(this.watchId);
      }

      this.watchId = Geolocation.watchPosition(
        this.handleLocationUpdate,
        this.handleLocationError,
        {
          accuracy: {
            android: 'high',
            ios: 'best',
          },
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
          distanceFilter: 5, // Minimum distance (in meters) before update (optimization)
          showLocationDialog: true,
          forceRequestLocation: true,
        }
      );

      this.isTracking = true;
      console.log('✅ Location tracking started');
      return true;
    } catch (error) {
      console.error('❌ Failed to start location tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Stop location tracking
   */
  stopTracking(): void {
    if (!this.isTracking) {
      return;
    }

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    console.log('✅ Location tracking stopped');
  }

  /**
   * Get last sent location
   */
  getLastSentLocation(): LocationData | null {
    return this.lastSentLocation;
  }

  /**
   * Get time since last update (in seconds)
   */
  getTimeSinceLastUpdate(): number {
    if (!this.lastSentTime) {
      return 0;
    }
    return Math.floor((Date.now() - this.lastSentTime) / 1000);
  }

  /**
   * Check if currently tracking
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking;
  }
}

// Singleton instance
let locationTrackerInstance: LocationTracker | null = null;

/**
 * Get or create LocationTracker instance
 */
export function getLocationTracker(options?: LocationTrackerOptions): LocationTracker {
  if (!locationTrackerInstance) {
    locationTrackerInstance = new LocationTracker(options);
  }
  return locationTrackerInstance;
}

/**
 * Reset LocationTracker instance (useful for testing or cleanup)
 */
export function resetLocationTracker(): void {
  if (locationTrackerInstance) {
    locationTrackerInstance.stopTracking();
    locationTrackerInstance = null;
  }
}

export default LocationTracker;
