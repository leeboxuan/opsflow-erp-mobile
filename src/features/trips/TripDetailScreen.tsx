import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { TripsStackParamList } from '../../app/navigation/AdminTabs';
import { getTripById, getTripLocation } from '../../api/trips';
import { getDriverLocation } from '../../api/drivers';
import { Trip, Stop } from '../../api/types';
import { getToken } from '../../shared/utils/authStorage';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<TripsStackParamList, 'TripDetail'>;

function normalizeTripStatus(status: string | undefined | null): string {
  if (!status) return '';
  return status.toLowerCase().replace(/\s+/g, '');
}

const SINGAPORE_REGION = {
  latitude: 1.3521,
  longitude: 103.8198,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const POLL_INTERVAL_MS = 7000;

export default function TripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; capturedAt?: string } | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasToken = Boolean(getToken());
  const { data: trip, isLoading, error, refetch } = useQuery({
    queryKey: ['adminTrip', tripId],
    queryFn: () => getTripById(tripId),
    enabled: hasToken && !!tripId,
  });

  const normalizedStatus = trip ? normalizeTripStatus(trip.status) : '';
  const isTripActive = normalizedStatus === 'dispatched' || normalizedStatus === 'intransit';
  const hasDriver = Boolean(trip?.driverId);
  const shouldPoll = isTripActive && hasDriver && !!trip?.driverId;

  const fetchLocation = useCallback(async () => {
    if (!trip?.driverId) return;
    try {
      let loc: { lat: number; lng: number; capturedAt?: string } | null = null;
      loc = await getTripLocation(tripId);
      if (!loc) {
        loc = await getDriverLocation(trip.driverId);
      }
      if (loc) {
        setDriverLocation({ lat: loc.lat, lng: loc.lng, capturedAt: loc.capturedAt });
        setLastUpdatedAt(Date.now());
      }
    } catch (e) {
      console.warn('TripDetailScreen fetchLocation:', e);
    }
  }, [tripId, trip?.driverId]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldPoll) {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        if (!isTripActive) setDriverLocation(null);
        return;
      }
      fetchLocation();
      pollRef.current = setInterval(fetchLocation, POLL_INTERVAL_MS);
      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    }, [shouldPoll, isTripActive, fetchLocation])
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color="textSecondary" style={styles.loadingText}>
            Loading trip details...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (error || !trip) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <AppText variant="body" color="error">
            Failed to load trip details.
          </AppText>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <AppText variant="body" color="primary" weight="semibold">
              Retry
            </AppText>
          </TouchableOpacity>
        </Card>
      </Screen>
    );
  }

  const stops = trip.stops ?? [];
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const secondsAgo = lastUpdatedAt ? Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000)) : 0;

  const renderStop = ({ item }: { item: Stop }) => {
    const address = [item.addressLine1, item.city].filter(Boolean).join(', ') || item.addressLine1 || '—';
    return (
      <TouchableOpacity
        style={styles.stopCard}
        onPress={() => navigation.navigate('StopDetail', { stopId: item.id, tripId })}>
        <View style={styles.stopHeader}>
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>{item.sequence}</Text>
          </View>
          <View style={styles.stopInfo}>
            <Text style={styles.stopType}>{item.type}</Text>
            <Text style={styles.stopAddress}>{address}</Text>
            {item.plannedAt && (
              <Text style={styles.scheduledTime}>
                Planned: {new Date(item.plannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
          <Text style={[styles.stopStatus, getStopStatusStyle(item.status ?? '')]}>
            {item.status ?? 'Scheduled'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Card style={styles.tripInfoCard}>
          <View style={styles.tripInfoRow}>
            <AppText variant="h3" weight="bold" color="text">
              {trip.tripNumber ?? `Trip ${trip.id.slice(0, 8)}`}
            </AppText>
            <Badge label={trip.status} variant={isTripActive ? 'info' : 'default'} />
          </View>
          <AppText variant="body" color="textSecondary" style={styles.tripMeta}>
            Stops: {sortedStops.length}
            {trip.driverId && ' · Driver assigned'}
          </AppText>
        </Card>

        {/* Live Location map - only when trip is active and has driver */}
        <Card style={styles.mapCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Live Location
          </AppText>
          {!isTripActive || !hasDriver ? (
            <View style={styles.mapPlaceholder}>
              <AppText variant="body" color="textSecondary" style={styles.placeholderText}>
                Live location is available when trip is in progress.
              </AppText>
            </View>
          ) : driverLocation ? (
            <View style={styles.mapWrapper}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={styles.map}
                initialRegion={{
                  latitude: driverLocation.lat,
                  longitude: driverLocation.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}>
                <Marker
                  coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}
                  title="Driver"
                  pinColor={theme.colors.primary}
                />
              </MapView>
              <View style={styles.updatedBadge}>
                <Badge label={`Updated ${secondsAgo}s ago`} variant="success" />
              </View>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <AppText variant="body" color="textSecondary" style={styles.placeholderText}>
                Loading driver location...
              </AppText>
            </View>
          )}
        </Card>

        <Card style={styles.stopsCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Stops
          </AppText>
          {sortedStops.length === 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.emptyText}>
              No stops for this trip.
            </AppText>
          ) : (
            sortedStops.map((stop) => (
              <View key={stop.id}>{renderStop({ item: stop })}</View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function getStopStatusStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes('completed')) return { backgroundColor: '#4caf50', color: '#fff' };
  if (s.includes('transit') || s.includes('arrived')) return { backgroundColor: '#2196f3', color: '#fff' };
  if (s.includes('scheduled')) return { backgroundColor: '#ff9800', color: '#fff' };
  return { backgroundColor: '#9e9e9e', color: '#fff' };
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorCard: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.errorLight,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  tripInfoCard: {
    marginBottom: theme.spacing.md,
  },
  tripInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  tripMeta: {
    fontSize: 14,
  },
  mapCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  mapPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  placeholderText: {
    textAlign: 'center',
  },
  mapWrapper: {
    height: 280,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  updatedBadge: {
    position: 'absolute',
    bottom: theme.spacing.sm,
    left: theme.spacing.sm,
  },
  stopsCard: {
    marginBottom: theme.spacing.md,
  },
  stopCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sequenceBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  sequenceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stopInfo: {
    flex: 1,
  },
  stopType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  stopAddress: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  scheduledTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  stopStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
});
