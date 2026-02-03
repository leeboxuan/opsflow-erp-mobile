/**
 * AdminLiveMapScreen - Shows markers for all drivers in the tenant
 * Polls GET /api/admin/locations every 5 seconds
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AdminTabsParamList } from '../../app/navigation/AdminTabs';
import { getDriverLocations, DriverLocation } from '../../api/admin';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';

type Props = BottomTabScreenProps<AdminTabsParamList, 'AdminLiveMap'>;

export default function AdminLiveMapScreen({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Poll driver locations every 5 seconds
  const {
    data: driverLocations = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['driverLocations'],
    queryFn: getDriverLocations,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Auto-refresh on mount
  useEffect(() => {
    refetch();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate map region to show all drivers
  const calculateRegion = (locations: DriverLocation[]) => {
    if (locations.length === 0) {
      return {
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    const lats = locations.map((loc) => loc.lat);
    const lngs = locations.map((loc) => loc.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latDelta = (maxLat - minLat) * 1.5 || 0.01;
    const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(latDelta, 0.01),
      longitudeDelta: Math.max(lngDelta, 0.01),
    };
  };

  const mapRegion = calculateRegion(driverLocations);

  const getTimeAgo = (updatedAt: string): string => {
    const now = new Date().getTime();
    const updated = new Date(updatedAt).getTime();
    const seconds = Math.floor((now - updated) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Status Bar */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <AppText variant="h3" weight="bold" color="text">
                Live Driver Map
              </AppText>
              <View style={styles.statsRow}>
                <Badge label={`${driverLocations.length} Drivers`} variant="info" />
                <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
                  <AppText variant="bodySmall" color="primary" weight="semibold">
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Card>

        {/* Error Banner */}
        {error && (
          <Card style={styles.errorCard}>
            <AppText variant="body" color="error" style={styles.errorText}>
              Failed to load driver locations. Map may show outdated data.
            </AppText>
          </Card>
        )}

        {/* Map Error (e.g., missing Google Maps API key) */}
        {mapError && (
          <Card style={styles.errorCard}>
            <AppText variant="body" color="error" style={styles.errorText}>
              {mapError}
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.errorHelp}>
              Ensure GOOGLE_MAPS_API_KEY is set in android/gradle.properties
            </AppText>
          </Card>
        )}

        {/* Map */}
        {isLoading && driverLocations.length === 0 ? (
          <Card style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="body" color="textSecondary" style={styles.loadingText}>
              Loading driver locations...
            </AppText>
          </Card>
        ) : (
          <View style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={mapRegion}
              onMapReady={() => setMapError(null)}
              onError={(error) => {
                console.error('Map error:', error);
                setMapError('Failed to load map. Check Google Maps API key configuration.');
              }}>
              {driverLocations.map((location) => (
                <Marker
                  key={location.driverUserId}
                  coordinate={{
                    latitude: location.lat,
                    longitude: location.lng,
                  }}
                  title={location.driverLabel}
                  description={`Last updated: ${getTimeAgo(location.updatedAt)}`}
                  pinColor={theme.colors.primary}>
                  <View style={styles.markerContainer}>
                    <View style={styles.markerDot}>
                      <AppText variant="bodySmall" weight="bold" style={styles.markerText}>
                        {location.driverLabel.charAt(0).toUpperCase()}
                      </AppText>
                    </View>
                  </View>
                </Marker>
              ))}
            </MapView>
          </View>
        )}

        {/* Driver List */}
        {driverLocations.length > 0 && (
          <Card style={styles.driversCard}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
              Active Drivers
            </AppText>
            {driverLocations.map((location) => (
              <View key={location.driverUserId} style={styles.driverItem}>
                <View style={styles.driverInfo}>
                  <AppText variant="body" weight="semibold" color="text">
                    {location.driverLabel}
                  </AppText>
                  <AppText variant="bodySmall" color="textSecondary">
                    {getTimeAgo(location.updatedAt)}
                  </AppText>
                </View>
                <AppText variant="bodySmall" color="textSecondary">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </AppText>
              </View>
            ))}
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
  statusCard: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  errorCard: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  errorText: {
    marginBottom: theme.spacing.xs,
  },
  errorHelp: {
    marginTop: theme.spacing.xs,
  },
  mapContainer: {
    flex: 1,
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.gray50,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  markerText: {
    color: theme.colors.white,
  },
  driversCard: {
    margin: theme.spacing.md,
    maxHeight: 200,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  driverItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  driverInfo: {
    flex: 1,
  },
});
