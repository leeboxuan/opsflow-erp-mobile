/**
 * DriverMapScreen - Shows driver's current location on a map
 * Optional: Shows assigned trip stops as markers
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Switch, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DriverTabsParamList } from '../../app/navigation/DriverTabs';
import { getLocationTracker, resetLocationTracker } from '../../location/LocationTracker';
import { getShareLiveLocation, setShareLiveLocation } from '../../shared/utils/authStorage';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';
import { useAuth } from '../../shared/context/AuthContext';

type Props = NativeStackScreenProps<DriverTabsParamList, 'DriverMap'>;

export default function DriverMapScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; timeAgo: number } | null>(null);
  const [tracking, setTracking] = useState(false);
  const [shareLiveLocation, setShareLiveLocationState] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const tracker = getLocationTracker({
    onLocationUpdate: (location) => {
      setLastLocation({
        lat: location.lat,
        lng: location.lng,
        timeAgo: 0,
      });
    },
    onError: (error) => {
      if (error.message.includes('permission')) {
        setPermissionDenied(true);
      }
    },
  });

  // Load share location preference
  useEffect(() => {
    const sharePref = getShareLiveLocation();
    setShareLiveLocationState(sharePref);
  }, []);

  // Start/stop tracking based on share preference
  useEffect(() => {
    const initializeTracking = async () => {
      if (shareLiveLocation && user && user.role === 'Driver') {
        const started = await tracker.startTracking();
        setTracking(started);
        if (!started) {
          setPermissionDenied(true);
        }
      } else {
        tracker.stopTracking();
        setTracking(false);
      }
    };

    initializeTracking();

    // Update location display every second
    const interval = setInterval(() => {
      const location = tracker.getLastSentLocation();
      if (location) {
        const timeAgo = tracker.getTimeSinceLastUpdate();
        setLastLocation({
          lat: location.lat,
          lng: location.lng,
          timeAgo,
        });
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      // Don't stop tracking on unmount if user is just navigating
    };
  }, [shareLiveLocation, user]);

  const handleShareToggle = (enabled: boolean) => {
    setShareLiveLocationState(enabled);
    setShareLiveLocation(enabled); // Save to storage
    
    if (enabled) {
      tracker.startTracking().then((started) => {
        setTracking(started);
        if (!started) {
          setPermissionDenied(true);
        }
      }).catch((error) => {
        console.error('Failed to start tracking:', error);
        setPermissionDenied(true);
      });
    } else {
      tracker.stopTracking();
      setTracking(false);
    }
  };

  const handleEnablePermission = () => {
    Alert.alert(
      'Enable Location Permission',
      'Please enable location permission in your device settings to share live location.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => {
          // On Android, user needs to open settings manually
          // For iOS, can use Linking.openSettings()
        }},
      ]
    );
  };

  // Default location (San Francisco) if no location yet
  const defaultRegion = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const mapRegion = lastLocation
    ? {
        latitude: lastLocation.lat,
        longitude: lastLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : defaultRegion;

  return (
    <Screen>
      <View style={styles.container}>
        {/* Share Live Location Toggle */}
        <Card style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <AppText variant="h3" weight="semibold" color="text">
                Share Live Location
              </AppText>
              <AppText variant="bodySmall" color="textSecondary" style={styles.toggleDescription}>
                Allow admin to see your live location on the map
              </AppText>
            </View>
            <Switch
              value={shareLiveLocation}
              onValueChange={handleShareToggle}
              trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }}
              thumbColor={theme.colors.white}
            />
          </View>
          {tracking && lastLocation && (
            <View style={styles.statusRow}>
              <Badge label="LIVE" variant="success" />
              <AppText variant="bodySmall" color="textSecondary" style={styles.statusText}>
                Updated {lastLocation.timeAgo}s ago
              </AppText>
            </View>
          )}
        </Card>

        {/* Permission Denied Message */}
        {permissionDenied && (
          <Card style={styles.errorCard}>
            <AppText variant="body" color="error" style={styles.errorText}>
              Location permission denied. Please enable location permission to share live location.
            </AppText>
            <AppText
              variant="bodySmall"
              color="primary"
              style={styles.ctaLink}
              onPress={handleEnablePermission}>
              Enable Location Permission
            </AppText>
          </Card>
        )}

        {/* Map */}
        {shareLiveLocation && !permissionDenied ? (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              showsUserLocation={!!lastLocation}
              showsMyLocationButton={true}
              followsUserLocation={!!lastLocation}>
              {lastLocation && (
                <Marker
                  coordinate={{
                    latitude: lastLocation.lat,
                    longitude: lastLocation.lng,
                  }}
                  title="My Location"
                  description={`Updated ${lastLocation.timeAgo}s ago`}
                  pinColor={theme.colors.primary}
                />
              )}
            </MapView>
          </View>
        ) : (
          <Card style={styles.mapPlaceholder}>
            <View style={styles.placeholderContent}>
              {!shareLiveLocation ? (
                <>
                  <AppText variant="h2" style={styles.mapIcon}>🗺️</AppText>
                  <AppText variant="body" color="textSecondary" style={styles.placeholderText}>
                    Enable "Share Live Location" to view map
                  </AppText>
                </>
              ) : (
                <>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <AppText variant="body" color="textSecondary" style={styles.placeholderText}>
                    Loading map...
                  </AppText>
                </>
              )}
            </View>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleCard: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleDescription: {
    marginTop: theme.spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  statusText: {
    marginLeft: theme.spacing.xs,
  },
  errorCard: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  errorText: {
    marginBottom: theme.spacing.sm,
  },
  ctaLink: {
    marginTop: theme.spacing.xs,
    textDecorationLine: 'underline',
  },
  mapContainer: {
    flex: 1,
    margin: theme.spacing.md,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    margin: theme.spacing.md,
    backgroundColor: theme.colors.gray50,
  },
  placeholderContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  mapIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.md,
  },
  placeholderText: {
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
});

