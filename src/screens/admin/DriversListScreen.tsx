import React from 'react';
import { FlatList, StyleSheet, View, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminTabsParamList } from '../../app/navigation/AdminTabs';
import { getDrivers } from '../../api/drivers';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminTabsParamList, 'DriversList'>;

export default function DriversListScreen({ navigation }: Props) {
  const {
    data: drivers,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['drivers'],
    queryFn: getDrivers,
  });

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color="textSecondary" style={styles.loadingText}>
            Loading drivers...
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
            Failed to load drivers. Please try again.
          </AppText>
        </Card>
      </Screen>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <Screen>
        <Card style={styles.emptyCard}>
          <AppText variant="body" color="textSecondary" style={styles.emptyText}>
            No drivers found.
          </AppText>
        </Card>
      </Screen>
    );
  }

  const renderDriver = ({ item }: { item: any }) => (
    <Card
      onPress={() => navigation.navigate('DriverDetail', { driverId: item.id })}
      style={styles.driverCard}>
      <View style={styles.driverHeader}>
        <AppText variant="h3" weight="bold" color="text">
          {item.name}
        </AppText>
        {item.status && (
          <Badge
            label={item.status}
            variant={item.status === 'Active' ? 'success' : item.status === 'On Trip' ? 'info' : 'default'}
          />
        )}
      </View>
      {item.email && (
        <AppText variant="bodySmall" color="textSecondary" style={styles.driverInfo}>
          {item.email}
        </AppText>
      )}
      {item.phone && (
        <AppText variant="bodySmall" color="textSecondary" style={styles.driverInfo}>
          {item.phone}
        </AppText>
      )}
      {item.licenseNumber && (
        <AppText variant="bodySmall" color="textSecondary" style={styles.driverInfo}>
          License: {item.licenseNumber}
        </AppText>
      )}
    </Card>
  );

  return (
    <Screen>
      <FlatList
        data={drivers}
        renderItem={renderDriver}
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
  driverCard: {
    marginBottom: theme.spacing.md,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  driverInfo: {
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
