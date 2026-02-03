import React from 'react';
import { FlatList, StyleSheet, View, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { DriverTripsStackParamList } from '../../app/navigation/DriverTabs';
import Screen from '../../shared/ui/Screen';
import TabScreenContainer from '../../shared/ui/TabScreenContainer';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { useAuth } from '../../shared/context/AuthContext';
import { getSelectedMode, getToken } from '../../shared/utils/authStorage';
import { setSelectedModeGlobal } from '../../app/navigation/AuthenticatedRootNavigator';
import { getTrips } from '../../api/driver';
import { Trip } from '../../api/types';

type Props = NativeStackScreenProps<DriverTripsStackParamList, 'MyTrips'>;

/** Derive display label for trip (tripNumber or short id) */
function getTripDisplayNumber(trip: Trip): string {
  return trip.tripNumber ?? `Trip #${trip.id.slice(0, 8)}`;
}

/** Derive origin from first stop or trip.origin */
function getOrigin(trip: Trip): string {
  if (trip.origin) return trip.origin;
  const first = trip.stops?.[0];
  if (first) return [first.addressLine1, first.city].filter(Boolean).join(', ') || first.addressLine1 || '—';
  return '—';
}

/** Derive destination from last stop or trip.destination */
function getDestination(trip: Trip): string {
  if (trip.destination) return trip.destination;
  const stops = trip.stops;
  if (stops?.length) {
    const last = stops[stops.length - 1];
    return [last.addressLine1, last.city].filter(Boolean).join(', ') || last.addressLine1 || '—';
  }
  return '—';
}

export default function DriverTripsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const currentMode = getSelectedMode();
  const isDriverMode = currentMode === 'driver';

  const today = React.useMemo(() => new Date(), []);
  const hasToken = Boolean(getToken());
  const { data: trips = [], isLoading, error, refetch } = useQuery({
    queryKey: ['driverTrips', today.toISOString().slice(0, 10)],
    queryFn: () => getTrips(today),
    enabled: hasToken,
  });

  const handleExitDriverMode = () => {
    if (user && ['Admin', 'Ops', 'Finance'].includes(user.role)) {
      setSelectedModeGlobal('admin');
      Alert.alert('Mode Changed', 'Switched back to Admin mode.');
    }
  };

  const getStatusVariant = (status: string): 'success' | 'warning' | 'info' | 'default' => {
    switch (status) {
      case 'Completed':
        return 'success';
      case 'In Transit':
        return 'info';
      case 'Scheduled':
        return 'warning';
      default:
        return 'default';
    }
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <Card
      onPress={() => navigation.navigate('TripExecution', { tripId: item.id })}
      style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <AppText variant="h3" weight="bold" color="text">
          {getTripDisplayNumber(item)}
        </AppText>
        <Badge label={item.status} variant={getStatusVariant(item.status)} />
      </View>
      <View style={styles.routeContainer}>
        <AppText variant="body" color="textSecondary">
          {getOrigin(item)}
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.arrow}>
          →
        </AppText>
        <AppText variant="body" color="textSecondary">
          {getDestination(item)}
        </AppText>
      </View>
    </Card>
  );

  const listHeader = isDriverMode && user && ['Admin', 'Ops', 'Finance'].includes(user.role) ? (
    <Card style={styles.exitDriverCard}>
      <View style={styles.exitDriverContent}>
        <AppText variant="body" color="text" style={styles.exitDriverText}>
          You're viewing Driver mode
        </AppText>
        <Button
          title="Exit Driver Mode"
          onPress={handleExitDriverMode}
          variant="outline"
          style={styles.exitDriverButton}
        />
      </View>
    </Card>
  ) : null;

  if (isLoading) {
    return (
      <TabScreenContainer>
        <Screen>
          {listHeader}
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="body" color="textSecondary" style={styles.loadingText}>
              Loading trips...
            </AppText>
          </View>
        </Screen>
      </TabScreenContainer>
    );
  }

  if (error) {
    return (
      <TabScreenContainer>
        <Screen>
          {listHeader}
          <View style={styles.centerContainer}>
            <AppText variant="body" color="error" style={styles.errorText}>
              {error.message}
            </AppText>
            <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
          </View>
        </Screen>
      </TabScreenContainer>
    );
  }

  return (
    <TabScreenContainer>
      <Screen>
        <FlatList
          data={trips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                No trips for today
              </AppText>
            </View>
          }
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={() => refetch()}
        />
      </Screen>
    </TabScreenContainer>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.md,
  },
  tripCard: {
    marginBottom: theme.spacing.md,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  arrow: {
    marginHorizontal: theme.spacing.sm,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  retryButton: {
    marginTop: theme.spacing.sm,
  },
  emptyContainer: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  exitDriverCard: {
    margin: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.infoLight,
    borderColor: theme.colors.info,
    borderWidth: 1,
  },
  exitDriverContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exitDriverText: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  exitDriverButton: {
    minWidth: 120,
  },
});
