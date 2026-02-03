import React from 'react';
import { FlatList, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminTabsParamList } from '../../app/navigation/AdminTabs';
import { getVehicles } from '../../api/vehicles';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminTabsParamList, 'VehiclesList'>;

export default function VehiclesListScreen({ navigation }: Props) {
  const {
    data: vehicles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vehicles'],
    queryFn: getVehicles,
  });

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color="textSecondary" style={styles.loadingText}>
            Loading vehicles...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <AppText variant="body" color="error">
            Failed to load vehicles. Please try again.
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <Screen>
        <Card style={styles.emptyCard}>
          <AppText variant="body" color="textSecondary" style={styles.emptyText}>
            No vehicles found.
          </AppText>
        </Card>
      </Screen>
    );
  }

  const renderVehicle = ({ item }: { item: any }) => (
    <Card
      onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}
      style={styles.vehicleCard}>
      <View style={styles.vehicleHeader}>
        <AppText variant="h3" weight="bold" color="text">
          {item.plateNumber}
        </AppText>
        {item.status && (
          <Badge
            label={item.status}
            variant={item.status === 'Available' ? 'success' : item.status === 'In Use' ? 'info' : 'warning'}
          />
        )}
      </View>
      {item.make && item.model && (
        <AppText variant="bodySmall" color="textSecondary" style={styles.vehicleInfo}>
          {item.make} {item.model} {item.year && `(${item.year})`}
        </AppText>
      )}
      {item.type && (
        <AppText variant="bodySmall" color="textSecondary" style={styles.vehicleInfo}>
          Type: {item.type}
        </AppText>
      )}
      {item.capacity && (
        <AppText variant="bodySmall" color="textSecondary" style={styles.vehicleInfo}>
          Capacity: {item.capacity}
        </AppText>
      )}
    </Card>
  );

  return (
    <Screen>
      <FlatList
        data={vehicles}
        renderItem={renderVehicle}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={refetch}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.md,
  },
  vehicleCard: {
    marginBottom: theme.spacing.md,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  vehicleInfo: {
    marginTop: theme.spacing.xs,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorCard: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  emptyCard: {
    margin: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
  },
});
