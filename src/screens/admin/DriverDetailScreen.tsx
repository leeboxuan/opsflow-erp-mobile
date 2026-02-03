import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminTabsParamList } from '../../app/navigation/AdminTabs';
import { getDriverById } from '../../api/drivers';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminTabsParamList, 'DriverDetail'>;

export default function DriverDetailScreen({ route }: Props) {
  const { driverId } = route.params;

  const {
    data: driver,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['drivers', driverId],
    queryFn: () => getDriverById(driverId),
  });

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (error || !driver) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <AppText variant="body" color="error">
            Failed to load driver details.
          </AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <AppText variant="h2" weight="bold" color="text">
              {driver.name}
            </AppText>
            {driver.status && (
              <Badge
                label={driver.status}
                variant={driver.status === 'Active' ? 'success' : driver.status === 'On Trip' ? 'info' : 'default'}
              />
            )}
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Contact Information
          </AppText>
          {driver.email && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Email</AppText>
              <AppText variant="body" color="text">{driver.email}</AppText>
            </View>
          )}
          {driver.phone && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Phone</AppText>
              <AppText variant="body" color="text">{driver.phone}</AppText>
            </View>
          )}
          {driver.licenseNumber && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">License Number</AppText>
              <AppText variant="body" color="text">{driver.licenseNumber}</AppText>
            </View>
          )}
        </Card>

        <Card style={styles.infoCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Assigned Trips
          </AppText>
          <AppText variant="body" color="textSecondary" style={styles.comingSoon}>
            Trip assignment list coming soon.
          </AppText>
          {driver.currentTripId && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Current Trip ID</AppText>
              <AppText variant="body" color="text">{driver.currentTripId}</AppText>
            </View>
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
  },
  infoCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    marginBottom: theme.spacing.md,
  },
  comingSoon: {
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
});
