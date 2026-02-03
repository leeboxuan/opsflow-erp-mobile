import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';
import { AdminTabsParamList } from '../../app/navigation/AdminTabs';

type Props = BottomTabScreenProps<AdminTabsParamList, 'HomeTab'>;

export default function AdminHomeScreen({ navigation }: Props) {
  const handleNavigateToOrders = () => {
    navigation.navigate('OrdersTab', { screen: 'OrdersList' });
  };

  const handleNavigateToTrips = () => {
    navigation.navigate('TripsTab', { screen: 'TripsList' });
  };

  const handleNavigateToResources = () => {
    navigation.navigate('ResourcesTab', { screen: 'DriversList' });
  };

  return (
    <Screen scrollable>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Card style={styles.headerCard}>
          <AppText variant="h1" weight="bold" color="text" style={styles.title}>
            OpsFlow
          </AppText>
          <Badge label="ADMIN MODE" variant="info" />
        </Card>

        <Card style={styles.statsCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Quick Stats
          </AppText>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <AppText variant="h2" weight="bold" color="primary">0</AppText>
              <AppText variant="bodySmall" color="textSecondary">Active Orders</AppText>
            </View>
            <View style={styles.statItem}>
              <AppText variant="h2" weight="bold" color="primary">0</AppText>
              <AppText variant="bodySmall" color="textSecondary">In Transit</AppText>
            </View>
            <View style={styles.statItem}>
              <AppText variant="h2" weight="bold" color="primary">0</AppText>
              <AppText variant="bodySmall" color="textSecondary">Drivers</AppText>
            </View>
            <View style={styles.statItem}>
              <AppText variant="h2" weight="bold" color="primary">0</AppText>
              <AppText variant="bodySmall" color="textSecondary">Vehicles</AppText>
            </View>
          </View>
        </Card>

        <Card style={styles.actionsCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Quick Actions
          </AppText>
          <Button
            title="Create Order"
            onPress={handleNavigateToOrders}
            style={styles.actionButton}
          />
          <Button
            title="View All Orders"
            onPress={handleNavigateToOrders}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="View Trips"
            onPress={handleNavigateToTrips}
            variant="outline"
            style={styles.actionButton}
          />
          <Button
            title="Manage Resources"
            onPress={handleNavigateToResources}
            variant="outline"
            style={styles.actionButton}
          />
        </Card>

        <Card style={styles.infoCard}>
          <AppText variant="body" color="textSecondary" style={styles.infoText}>
            Stats and quick actions will be populated with real data from the API.
          </AppText>
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
    alignItems: 'center',
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  statsCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.gray50,
    borderRadius: theme.radius.md,
  },
  actionsCard: {
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    marginBottom: theme.spacing.sm,
  },
  infoCard: {
    backgroundColor: theme.colors.infoLight,
  },
  infoText: {
    textAlign: 'center',
  },
});
