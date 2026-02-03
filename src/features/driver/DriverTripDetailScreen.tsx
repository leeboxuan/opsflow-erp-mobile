import React from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverTripsStackParamList } from '../../app/navigation/DriverTabs';
import { getTrip } from '../../api/driver';
import { getToken } from '../../shared/utils/authStorage';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { Stop } from '../../api/types';

type Props = NativeStackScreenProps<DriverTripsStackParamList, 'DriverTripDetail'>;

function getStopAddress(stop: Stop): string {
  return [stop.addressLine1, stop.city].filter(Boolean).join(', ') || stop.addressLine1 || '—';
}

function formatPlannedAt(plannedAt: string): string {
  try {
    const d = new Date(plannedAt);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return plannedAt;
  }
}

export default function DriverTripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const hasToken = Boolean(getToken());
  const { data: trip, isLoading, error, refetch } = useQuery({
    queryKey: ['driverTrip', tripId],
    queryFn: () => getTrip(tripId),
    enabled: hasToken && !!tripId,
  });

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color="textSecondary" style={styles.loadingText}>
            Loading trip...
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
            Failed to load trip.
          </AppText>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
          <Button
            title="Back to execution"
            onPress={() => navigation.navigate('TripExecution', { tripId })}
            variant="outline"
          />
        </Card>
      </Screen>
    );
  }

  const stops = [...(trip.stops ?? [])].sort((a, b) => a.sequence - b.sequence);

  const renderStop = ({ item }: { item: Stop }) => (
    <Card
      onPress={() => navigation.navigate('TripExecution', { tripId })}
      style={styles.stopCard}
    >
      <View style={styles.stopHeader}>
        <View style={styles.sequenceBadge}>
          <AppText variant="body" weight="bold" color="white">
            {item.sequence}
          </AppText>
        </View>
        <View style={styles.stopInfo}>
          <AppText variant="h3" weight="bold" color="text">
            {item.type}
          </AppText>
          <AppText variant="body" color="textSecondary">
            {getStopAddress(item)}
          </AppText>
          <AppText variant="bodySmall" color="textSecondary">
            Planned: {formatPlannedAt(item.plannedAt)}
          </AppText>
        </View>
        <Badge
          label={item.status ?? 'Scheduled'}
          variant={item.status === 'Completed' ? 'success' : 'info'}
        />
      </View>
    </Card>
  );

  return (
    <Screen>
      <FlatList
        data={stops}
        renderItem={renderStop}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText variant="body" color="textSecondary">No stops for this trip.</AppText>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.md,
  },
  stopCard: {
    marginBottom: theme.spacing.md,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sequenceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stopInfo: {
    flex: 1,
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
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  empty: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
});
