import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Linking, Alert, TextInput } from 'react-native';
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
import { getLocationTracker } from '../../location/LocationTracker';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { getToken } from '../../shared/utils/authStorage';
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

export default function TripExecutionScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const queryClient = useQueryClient();
  const [processingStop, setProcessingStop] = useState<string | null>(null);
  const [processingTrip, setProcessingTrip] = useState(false);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number; timeAgo: number } | null>(null);
  const [acceptVehicleId, setAcceptVehicleId] = useState('');
  const [acceptTrailerNo, setAcceptTrailerNo] = useState('');

  const tracker = getLocationTracker({
    onLocationUpdate: (location) => {
      setLastLocation({ lat: location.lat, lng: location.lng, timeAgo: 0 });
    },
  });

  useEffect(() => {
    if (!tracker.isCurrentlyTracking()) {
      tracker.startTracking().catch((e) => console.error('Failed to start location tracking:', e));
    }
    const interval = setInterval(() => {
      const loc = tracker.getLastSentLocation();
      if (loc) {
        setLastLocation({
          lat: loc.lat,
          lng: loc.lng,
          timeAgo: tracker.getTimeSinceLastUpdate(),
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
  });

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
    },
  });

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
          {lastLocation && (
            <View style={styles.locationStatus}>
              <AppText variant="bodySmall" color="textSecondary">
                Live: {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)} · {lastLocation.timeAgo}s ago
              </AppText>
            </View>
          )}
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
                    {!isCompleted && (
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
                            { (stop.type === 'DELIVERY' || stop.type === 'Delivery') ? (
                              <Button
                                title="Complete with POD"
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
  locationStatus: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.sm,
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
});
