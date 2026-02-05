import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, ActivityIndicator } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { DriverTabsParamList } from '../../app/navigation/DriverTabs';
import { getTrips } from '../../api/driver';
import { getToken } from '../../shared/utils/authStorage';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import ModeBadge from '../../shared/ui/ModeBadge';
import { theme } from '../../shared/theme/theme';
import { Trip } from '../../api/types';

type Props = BottomTabScreenProps<DriverTabsParamList, 'HomeTab'>;

function getTripDisplayNumber(trip: Trip): string {
  return trip.tripNumber ?? `Trip #${trip.id.slice(0, 8)}`;
}

function getNextStopAddress(trip: Trip): string | null {
  const stops = trip.stops ?? [];
  const next = [...stops].sort((a, b) => a.sequence - b.sequence).find(
    (s) => s.status !== 'Completed' && s.status !== 'Failed'
  );
  if (!next) return null;
  return [next.addressLine1, next.city].filter(Boolean).join(', ') || next.addressLine1 || null;
}

export default function DriverHomeScreen({ navigation }: Props) {
  const today = useMemo(() => new Date(), []);
  const hasToken = Boolean(getToken());
  const { data: todayTrips = [], isLoading } = useQuery({
    queryKey: ['driverTrips', today.toISOString().slice(0, 10)],
    queryFn: () => getTrips(today),
    enabled: hasToken,
  });

  const firstTrip = todayTrips[0];
  const nextStop = firstTrip ? getNextStopAddress(firstTrip) : null;

  const handleViewTrips = () => {
    navigation.navigate('TripsTab', { screen: 'MyTrips' });
  };

  const safeTodayTrips = Array.isArray(todayTrips) ? todayTrips : [];

  const handleNavigate = (address: string) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <AppText variant="h1" weight="bold" color="text" style={styles.title}>
            Driver Dashboard
          </AppText>
          <View style={styles.badges}>
            <Badge label="DRIVER MODE" variant="info" />
            <ModeBadge />
          </View>
        </Card>

        {isLoading ? (
          <Card style={styles.tripsCard}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <AppText variant="body" color="textSecondary" style={styles.loadingText}>
              Loading trips...
            </AppText>
          </Card>
        ) : (
          <>
            {nextStop && (
              <Card style={styles.nextStopCard}>
                <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
                  Next Stop
                </AppText>
                <AppText variant="body" color="text" style={styles.address}>
                  {nextStop}
                </AppText>
                <Button
                  title="Navigate"
                  onPress={() => handleNavigate(nextStop)}
                  style={styles.navigateButton}
                />
              </Card>
            )}

            <Card style={styles.tripsCard}>
              <View style={styles.sectionHeader}>
                <AppText variant="h3" weight="bold" color="text">
                  Today's Trips
                </AppText>
                <TouchableOpacity onPress={handleViewTrips}>
                  <AppText variant="body" color="primary" weight="semibold">
                    View All
                  </AppText>
                </TouchableOpacity>
              </View>
              {todayTrips.length === 0 ? (
                <AppText variant="body" color="textSecondary" style={styles.emptyText}>
                  No trips scheduled for today.
                </AppText>
              ) : (
                safeTodayTrips.map((trip) => {
                  const nextAddr = getNextStopAddress(trip);
                  return (
                    <Card
                      key={trip.id}
                      onPress={() =>
                        navigation.navigate('TripsTab', {
                          screen: 'TripExecution',
                          params: { tripId: trip.id },
                        })
                      }
                      style={styles.tripItem}>
                      <View style={styles.tripHeader}>
                        <AppText variant="h3" weight="bold" color="text">
                          {getTripDisplayNumber(trip)}
                        </AppText>
                        <Badge
                          label={trip.status}
                          variant={trip.status === 'In Transit' ? 'info' : 'warning'}
                        />
                      </View>
                      {nextAddr && (
                        <AppText variant="bodySmall" color="textSecondary" style={styles.tripStop}>
                          Next: {nextAddr}
                        </AppText>
                      )}
                    </Card>
                  );
                })
              )}
            </Card>
          </>
        )}

        <Card style={styles.actionsCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Quick Actions
          </AppText>
          <Button
            title="View All Trips"
            onPress={handleViewTrips}
            style={styles.actionButton}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  headerCard: {
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  locationStatus: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.successLight,
    borderRadius: theme.radius.sm,
  },
  nextStopCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.infoLight,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  address: {
    marginBottom: theme.spacing.md,
    fontSize: 16,
  },
  navigateButton: {
    marginTop: theme.spacing.sm,
  },
  tripsCard: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tripItem: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  tripStop: {
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
  actionsCard: {
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
});
