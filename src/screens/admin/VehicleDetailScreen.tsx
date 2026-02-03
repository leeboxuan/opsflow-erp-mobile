import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminTabsParamList } from '../../app/navigation/AdminTabs';
import { getVehicleById } from '../../api/vehicles';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminTabsParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route }: Props) {
  const { vehicleId } = route.params;

  const {
    data: vehicle,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vehicles', vehicleId],
    queryFn: () => getVehicleById(vehicleId),
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

  if (error || !vehicle) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <AppText variant="body" color="error">
            Failed to load vehicle details.
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
              {vehicle.plateNumber}
            </AppText>
            {vehicle.status && (
              <Badge
                label={vehicle.status}
                variant={vehicle.status === 'Available' ? 'success' : vehicle.status === 'In Use' ? 'info' : 'warning'}
              />
            )}
          </View>
        </Card>

        <Card style={styles.infoCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Vehicle Information
          </AppText>
          {vehicle.make && vehicle.model && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Make & Model</AppText>
              <AppText variant="body" color="text">{vehicle.make} {vehicle.model}</AppText>
            </View>
          )}
          {vehicle.year && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Year</AppText>
              <AppText variant="body" color="text">{vehicle.year}</AppText>
            </View>
          )}
          {vehicle.type && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Type</AppText>
              <AppText variant="body" color="text">{vehicle.type}</AppText>
            </View>
          )}
          {vehicle.capacity && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Capacity</AppText>
              <AppText variant="body" color="text">{vehicle.capacity}</AppText>
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
          {vehicle.currentTripId && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">Current Trip ID</AppText>
              <AppText variant="body" color="text">{vehicle.currentTripId}</AppText>
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
