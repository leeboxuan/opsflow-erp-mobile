import React from 'react';
import { FlatList, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../app/navigation/AdminStack';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import Badge from '../../shared/ui/Badge';
import AppText from '../../shared/ui/AppText';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'TripsList'>;

interface Trip {
  id: string;
  tripNumber: string;
  origin: string;
  destination: string;
  status: string;
  driver: string;
}

// Mock data
const mockTrips: Trip[] = [
  {
    id: '1',
    tripNumber: 'TRP-001',
    origin: 'New York',
    destination: 'Los Angeles',
    status: 'In Transit',
    driver: 'John Doe',
  },
  {
    id: '2',
    tripNumber: 'TRP-002',
    origin: 'Chicago',
    destination: 'Miami',
    status: 'Scheduled',
    driver: 'Jane Smith',
  },
  {
    id: '3',
    tripNumber: 'TRP-003',
    origin: 'Seattle',
    destination: 'Portland',
    status: 'Completed',
    driver: 'Bob Johnson',
  },
];

export default function TripsListScreen({ navigation }: Props) {
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
      onPress={() => navigation.navigate('TripDetail', { tripId: item.id })}
      style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <AppText variant="h3" weight="bold" color="text">
          {item.tripNumber}
        </AppText>
        <Badge label={item.status} variant={getStatusVariant(item.status)} />
      </View>
      <View style={styles.routeContainer}>
        <AppText variant="body" color="textSecondary">
          {item.origin}
        </AppText>
        <AppText variant="body" color="textSecondary" style={styles.arrow}>
          →
        </AppText>
        <AppText variant="body" color="textSecondary">
          {item.destination}
        </AppText>
      </View>
      <AppText variant="bodySmall" color="textSecondary" style={styles.driver}>
        Driver: {item.driver}
      </AppText>
    </Card>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <AppText variant="body" color="textSecondary" style={styles.emptyText}>
        No trips available
      </AppText>
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={mockTrips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
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
  driver: {
    marginTop: theme.spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyText: {
    textAlign: 'center',
  },
});
