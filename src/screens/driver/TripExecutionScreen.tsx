import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DriverTripsStackParamList } from '../../app/navigation/DriverTabs';
import {
  getTrip,
  acceptTrip,
  startTrip,
  startStop,
  completeStop,
  type AcceptTripPayload,
} from '../../api/driver';
import { startBackgroundTracking, stopBackgroundTracking } from '../../location/locationService';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { getToken } from '../../shared/utils/authStorage';
import { useAuthRole } from '../../shared/hooks/useAuthRole';
import { Trip, Stop } from '../../api/types';

type Props = NativeStackScreenProps<DriverTripsStackParamList, 'TripExecution'>;

function getTripDisplayNumber(trip: Trip): string {
  return trip.tripNumber ?? `Trip #${trip.id.slice(0, 8)}`;
}

function getOrigin(trip: Trip): string {
  if (trip.origin) return trip.origin;
  const first = trip.stops?.[0];
  if (first) return [first.addressLine1, first.city].filter(Boolean).join(', ') || first.addressLine1 || '—';
  return '—';
}

function getDestination(trip: Trip): string {
  if (trip.destination) return trip.destination;
  const stops = trip.stops;
  if (stops?.length) {
    const last = stops[stops.length - 1];
    return [last.addressLine1, last.city].filter(Boolean).join(', ') || last.addressLine1 || '—';
  }
  return '—';
}

function getStopAddress(stop: Stop): string {
  return [stop.addressLine1, stop.city].filter(Boolean).join(', ') || stop.addressLine1 || '—';
}

/** Smallest sequence stop that is not completed (and not failed) */
function getNextStop(stops: Stop[]): Stop | null {
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  return sorted.find((s) => s.status !== 'Completed' && s.status !== 'Failed') ?? null;
}

/**
 * Normalize trip status for reliable matching (lowercase + remove spaces).
 * Handles variations like "In Transit", "InTransit", "intransit", etc.
 */
function normalizeTripStatus(status: string | undefined | null): string {
  if (!status) return '';
  return status.toLowerCase().replace(/\s+/g, '');
}

export default function TripExecutionScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const { isDriverExecution } = useAuthRole();
  const queryClient = useQueryClient();
  const [processingStop, setProcessingStop] = useState<string | null>(null);
  const [processingTrip, setProcessingTrip] = useState(false);
  const [acceptVehicleId, setAcceptVehicleId] = useState('');
  const [acceptTrailerNo, setAcceptTrailerNo] = useState('');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapLocationPermissionDenied, setMapLocationPermissionDenied] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const prevNextStopIdRef = useRef<string | null>(null);
  const [stopReassignedModalVisible, setStopReassignedModalVisible] = useState(false);
  const isFocused = useIsFocused();

  /** Singapore fallback when driverLocation is null */
  const SINGAPORE_REGION = {
    latitude: 1.3521,
    longitude: 103.8198,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const hasToken = Boolean(getToken());
  const {
    data: trip,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['driverTrip', tripId],
    queryFn: () => getTrip(tripId),
    enabled: hasToken && !!tripId,
    refetchInterval: isFocused ? 45000 : false,
  });

  useFocusEffect(
    useCallback(() => {
      if (hasToken && tripId) refetch();
    }, [hasToken, tripId, refetch])
  );

  // If the current (next) stop was reassigned away from this trip, show modal and offer to go back to Trip Details
  useEffect(() => {
    if (!trip?.stops) return;
    const stops = trip.stops;
    const nextStop = getNextStop(stops);
    const nextStopId = nextStop?.id ?? null;
    const prevId = prevNextStopIdRef.current;
    if (prevId != null && !stops.some((s) => s.id === prevId)) {
      setStopReassignedModalVisible(true);
    }
    prevNextStopIdRef.current = nextStopId;
  }, [trip?.stops]);

  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptTripPayload) => acceptTrip(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverTrip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['driverTrips'] });
    },
  });

  const startTripMutation = useMutation({
    mutationFn: () => startTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driverTrip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['driverTrips'] });
      startBackgroundTracking().catch((e) => console.error('Failed to start background tracking:', e));
    },
  });

  // Start/stop background tracking based on trip status only (not on mount unless trip is active)
  // Tracking is automatic and mandatory during active trips (like Grab/Lalamove)
  useEffect(() => {
    if (!trip?.status) return;
    const normalized = normalizeTripStatus(trip.status);
    const active = normalized === 'dispatched' || normalized === 'intransit';
    const ended = normalized === 'completed' || normalized === 'cancelled' || normalized === 'closed' || normalized === 'delivered';
    if (active) {
      startBackgroundTracking().catch((e) => console.error('Failed to start background tracking:', e));
    } else if (ended) {
      stopBackgroundTracking().catch((e) => console.warn('stopBackgroundTracking:', e));
    }
  }, [trip?.status]);

  // Foreground location watch for map display (only when trip is active)
  useEffect(() => {
    if (!trip?.status) return;
    const normalized = normalizeTripStatus(trip.status);
    const active = normalized === 'dispatched' || normalized === 'intransit';

    if (!active) {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      setDriverLocation(null);
      setMapLocationPermissionDenied(false);
      return;
    }

    let cancelled = false;
    setMapLocationPermissionDenied(false);

    const startWatch = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== 'granted') {
        setMapLocationPermissionDenied(true);
        return;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.LocationAccuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (loc) => {
          if (cancelled) return;
          const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setDriverLocation(coords);
          // Animate map to new region instead of controlled region to avoid snapping
          mapRef.current?.animateToRegion({
            latitude: coords.lat,
            longitude: coords.lng,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 500);
        }
      );
      if (cancelled) {
        sub.remove();
        return;
      }
      subscriptionRef.current = sub;
    };

    startWatch();

    return () => {
      cancelled = true;
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [trip?.status]);

  const handleAcceptTrip = () => {
    const vehicleId = acceptVehicleId.trim();
    if (!vehicleId) {
      Alert.alert('Error', 'Please enter vehicle ID.');
      return;
    }
    setProcessingTrip(true);
    acceptMutation
      .mutateAsync({ assignedVehicleId: vehicleId, trailerNo: acceptTrailerNo.trim() || undefined })
      .then(() => Alert.alert('Success', 'Trip accepted.'))
      .catch((err: Error) => Alert.alert('Error', err.message || 'Failed to accept trip.'))
      .finally(() => setProcessingTrip(false));
  };

  const handleStartTrip = () => {
    setProcessingTrip(true);
    startTripMutation
      .mutateAsync()
      .then(() => Alert.alert('Success', 'Trip started.'))
      .catch((err: Error) => Alert.alert('Error', err.message || 'Failed to start trip.'))
      .finally(() => setProcessingTrip(false));
  };

  const handleStartStop = async (stopId: string) => {
    setProcessingStop(stopId);
    try {
      await startStop(stopId);
      Alert.alert('Success', 'Stop started.');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start stop.');
    } finally {
      setProcessingStop(null);
    }
  };

  const handleNavigate = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open maps app. Please check your device settings.')
    );
  };

  const handleCompleteWithPOD = (stopId: string, stopType: string) => {
    if (stopType === 'DELIVERY' || stopType === 'Delivery') {
      navigation.navigate('PODCapture', { stopId });
    } else {
      Alert.alert('Info', 'POD is only for delivery stops. Use Complete to finish this stop.');
    }
  };

  const handleCompleteStopNoPOD = async (stopId: string) => {
    setProcessingStop(stopId);
    try {
      await completeStop(stopId, {});
      Alert.alert('Success', 'Stop completed.');
      refetch();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete stop.');
    } finally {
      setProcessingStop(null);
    }
  };

  const handleOpenMapSettings = () => {
    Linking.openSettings();
  };

  const handleStopReassignedDismiss = useCallback(() => {
    setStopReassignedModalVisible(false);
    navigation.navigate('DriverTripDetail', { tripId });
  }, [navigation, tripId]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <AppText variant="body" color="textSecondary">Loading trip details...</AppText>
        </View>
      </Screen>
    );
  }

  if (error || !trip) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <AppText variant="body" color="error">Failed to load trip details.</AppText>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
        </Card>
      </Screen>
    );
  }

  const stops = trip.stops ?? [];
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const nextStop = getNextStop(stops);
  const isScheduled = trip.status === 'Scheduled';
  const accepted = Boolean(trip.vehicleId);
  const canStartTrip =
    trip.status !== 'In Transit' &&
    trip.status !== 'Completed' &&
    trip.status !== 'Cancelled' &&
    (accepted || trip.status !== 'Scheduled');
  
  // Show map only when trip is active (Dispatched or In Transit)
  const normalizedStatus = normalizeTripStatus(trip.status);
  const isTripActive = normalizedStatus === 'dispatched' || normalizedStatus === 'intransit';

  const initialMapRegion = driverLocation
    ? {
        latitude: driverLocation.lat,
        longitude: driverLocation.lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : SINGAPORE_REGION;

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <AppText variant="h2" weight="bold" color="text">
              {getTripDisplayNumber(trip)}
            </AppText>
            <Badge
              label={trip.status}
              variant={trip.status === 'In Transit' ? 'info' : trip.status === 'Completed' ? 'success' : 'warning'}
            />
          </View>
          <AppText variant="body" color="textSecondary" style={styles.route}>
            {getOrigin(trip)} → {getDestination(trip)}
          </AppText>
        </Card>

        {isScheduled && (
          <Card style={styles.acceptCard}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
              Accept trip
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.fieldLabel}>
              Vehicle ID *
            </AppText>
            <TextInput
              style={styles.input}
              value={acceptVehicleId}
              onChangeText={setAcceptVehicleId}
              placeholder="e.g. VH-001"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <AppText variant="bodySmall" color="textSecondary" style={styles.fieldLabel}>
              Trailer No (optional)
            </AppText>
            <TextInput
              style={styles.input}
              value={acceptTrailerNo}
              onChangeText={setAcceptTrailerNo}
              placeholder="e.g. TR-01"
              placeholderTextColor={theme.colors.textSecondary}
            />
            <Button
              title="Accept Trip"
              onPress={handleAcceptTrip}
              loading={processingTrip || acceptMutation.isPending}
              disabled={!acceptVehicleId.trim()}
              style={styles.actionButton}
            />
          </Card>
        )}

        {canStartTrip && !isScheduled && (
          <Card style={styles.actionCard}>
            <Button
              title="Start Trip"
              onPress={handleStartTrip}
              loading={processingTrip || startTripMutation.isPending}
              style={styles.actionButton}
            />
          </Card>
        )}

        {/* Map - only shown when trip is active */}
        {isTripActive && (
          <Card style={styles.mapCard}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
              Live Location
            </AppText>
            <View style={styles.mapContainer}>
              {mapLocationPermissionDenied ? (
                <View style={styles.mapPlaceholder}>
                  <AppText variant="body" color="textSecondary" style={styles.mapPlaceholderText}>
                    Location permission is required to show your position on the map.
                  </AppText>
                  <Button
                    title="Open Settings"
                    onPress={handleOpenMapSettings}
                    variant="outline"
                    style={styles.mapSettingsButton}
                  />
                </View>
              ) : driverLocation ? (
                <MapView
                  ref={mapRef}
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={initialMapRegion}
                  showsUserLocation={true}
                  showsMyLocationButton={true}
                  followsUserLocation={false}>
                  <Marker
                    coordinate={{
                      latitude: driverLocation.lat,
                      longitude: driverLocation.lng,
                    }}
                    title="My Location"
                    pinColor={theme.colors.primary}
                  />
                </MapView>
              ) : (
                <View style={styles.mapPlaceholder}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <AppText variant="body" color="textSecondary" style={styles.mapPlaceholderText}>
                    Getting location...
                  </AppText>
                </View>
              )}
            </View>
          </Card>
        )}

        <Card style={styles.stopsCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Stops
          </AppText>
          {sortedStops.length === 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.emptyText}>
              No stops for this trip.
            </AppText>
          ) : (
            sortedStops.map((stop) => {
              const address = getStopAddress(stop);
              const isNext = nextStop?.id === stop.id;
              const isCompleted = stop.status === 'Completed' || stop.status === 'Failed';
              const isStarted = stop.status === 'Arrived' || stop.status === 'In Transit' || isCompleted;
              const canStartThisStop = isNext && !isStarted;

              return (
                <Card key={stop.id} style={styles.stopCard}>
                  <View style={styles.stopHeader}>
                    <View style={styles.stopNumber}>
                      <AppText variant="h3" weight="bold" color="primary">
                        {stop.sequence}
                      </AppText>
                    </View>
                    <View style={styles.stopInfo}>
                      <View style={styles.stopTypeRow}>
                        <Badge
                          label={stop.type}
                          variant={stop.type === 'PICKUP' || stop.type === 'Pickup' ? 'info' : 'success'}
                        />
                        <Badge
                          label={stop.status ?? 'Scheduled'}
                          variant={
                            stop.status === 'Completed'
                              ? 'success'
                              : stop.status === 'Failed'
                                ? 'default'
                                : stop.status === 'Arrived' || stop.status === 'In Transit'
                                  ? 'warning'
                                  : 'default'
                          }
                        />
                      </View>
                      <AppText variant="body" weight="semibold" color="text" style={styles.stopAddress}>
                        {address}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <Button
                      title="Navigate"
                      onPress={() => handleNavigate(address)}
                      variant="outline"
                      style={styles.actionButton}
                    />
                    {/* Driver only: Start stop, Mark Delivered, Complete. Admin/Ops never see these. */}
                    {isDriverExecution && !isCompleted && (
                      <>
                        {canStartThisStop && (
                          <Button
                            title="Start stop (arrived)"
                            onPress={() => handleStartStop(stop.id)}
                            loading={processingStop === stop.id}
                            style={styles.actionButton}
                          />
                        )}
                        {isStarted && !isCompleted && (
                          <>
                            {(stop.type === 'DELIVERY' || stop.type === 'Delivery') ? (
                              <Button
                                title="Mark Delivered"
                                onPress={() => handleCompleteWithPOD(stop.id, stop.type)}
                                loading={processingStop === stop.id}
                                style={styles.actionButton}
                              />
                            ) : (
                              <Button
                                title="Complete"
                                onPress={() => handleCompleteStopNoPOD(stop.id)}
                                loading={processingStop === stop.id}
                                style={styles.actionButton}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </View>
                </Card>
              );
            })
          )}
        </Card>
      </ScrollView>

      <Modal visible={stopReassignedModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={handleStopReassignedDismiss}>
          <Pressable style={styles.stopReassignedModal} onPress={(e) => e.stopPropagation()}>
            <AppText variant="h3" weight="bold" color="text" style={styles.stopReassignedTitle}>
              This stop was reassigned
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.stopReassignedMessage}>
              The stop is no longer part of this trip. You will be taken back to Trip Details.
            </AppText>
            <Button title="OK" onPress={handleStopReassignedDismiss} style={styles.stopReassignedButton} />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  headerCard: {
    marginBottom: theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  route: {
    marginTop: theme.spacing.xs,
  },
  acceptCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  actionCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  fieldLabel: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
  },
  stopsCard: {
    marginBottom: theme.spacing.md,
  },
  stopCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  stopHeader: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  stopNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stopInfo: { flex: 1 },
  stopTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  stopAddress: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
  },
  emptyText: {
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  errorCard: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  mapCard: {
    marginBottom: theme.spacing.md,
  },
  mapContainer: {
    height: 300,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    marginTop: theme.spacing.sm,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray50,
  },
  mapPlaceholderText: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  mapSettingsButton: {
    marginTop: theme.spacing.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  stopReassignedModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 360,
  },
  stopReassignedTitle: {
    marginBottom: theme.spacing.sm,
  },
  stopReassignedMessage: {
    marginBottom: theme.spacing.lg,
  },
  stopReassignedButton: {
    marginTop: theme.spacing.xs,
  },
});
