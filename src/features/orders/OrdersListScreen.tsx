import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../app/navigation/AdminStack';
import { getUnassignedOrders, getTransportTrips, acceptOrder } from '../../api/transport';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { useAuthRole } from '../../shared/hooks/useAuthRole';
import { getTripLabel } from '../../features/driver/components';
import { Order, Trip } from '../../api/types';

type Props = NativeStackScreenProps<AdminStackParamList, 'OrdersList'>;

const dateKey = new Date().toISOString().slice(0, 10);
const today = new Date();

export default function OrdersListScreen({ navigation }: Props) {
  const { role, canEditRoute, isDriverExecution } = useAuthRole();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [addToTripOrderId, setAddToTripOrderId] = useState<string | null>(null);

  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['unassignedOrders', dateKey],
    queryFn: () => getUnassignedOrders(today),
  });

  const { data: trips = [] } = useQuery({
    queryKey: ['transportTrips', dateKey],
    queryFn: () => getTransportTrips(today),
    enabled: isDriverExecution && addToTripOrderId != null,
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const acceptMutation = useMutation({
    mutationFn: ({ orderId, tripId }: { orderId: string; tripId?: string }) => acceptOrder(orderId, tripId),
    onSuccess: (result, { orderId }) => {
      setAddToTripOrderId(null);
      const tripId = result?.tripId ?? result?.trip?.id;
      const currentTrips = queryClient.getQueryData<Trip[]>(['transportTrips', dateKey]) ?? [];
      const safeTrips = [...currentTrips];
      const currentOrders = queryClient.getQueryData<Order[]>(['unassignedOrders', dateKey]) ?? [];
      const safeOrders = currentOrders.filter((o) => o.id !== orderId);
      if (tripId) {
        const idx = safeTrips.findIndex((t) => t.id === tripId);
        if (idx >= 0) {
          const trip = safeTrips[idx];
          safeTrips[idx] = { ...trip, stops: [...(trip.stops ?? []), {}] as Trip['stops'] };
        }
      } else {
        safeTrips.push({
          id: `temp-${Date.now()}`,
          status: 'Scheduled',
          stops: [{}] as Trip['stops'],
          tripNumber: `Trip ${safeTrips.length + 1}`,
        });
      }
      queryClient.setQueryData(['transportTrips', dateKey], safeTrips);
      queryClient.setQueryData(['unassignedOrders', dateKey], safeOrders);
    },
    onError: () => {
      setAddToTripOrderId(null);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  useEffect(() => {
    if (!canEditRoute) return;
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('CreateOrder')}
          style={styles.headerButton}>
          <AppText variant="body" weight="semibold" color="primary">
            Create Order
          </AppText>
        </TouchableOpacity>
      ),
    });
  }, [canEditRoute, navigation]);

  const handleAddToTrip = useCallback((orderId: string) => {
    setAddToTripOrderId(orderId);
  }, []);

  const closeTripPicker = useCallback(() => {
    if (!acceptMutation.isPending) setAddToTripOrderId(null);
  }, [acceptMutation.isPending]);

  const handleAcceptConfirm = useCallback(
    (tripId?: string) => {
      const orderId = addToTripOrderId;
      if (!orderId) return;
      acceptMutation.mutate({ orderId, tripId });
    },
    [addToTripOrderId, acceptMutation]
  );

  const safeTrips = Array.isArray(trips) ? trips : [];

  const renderOrder = ({ item }: { item: Order }) => (
    <Card
      onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <AppText variant="h3" weight="bold" color="text">
          {item.orderNumber || `Order #${item.id.slice(0, 8)}`}
        </AppText>
        {item.status && (
          <AppText variant="caption" color="textSecondary">
            {item.status}
          </AppText>
        )}
      </View>
      <AppText variant="body" color="text" style={styles.customerName}>
        Customer: {item.customerName}
      </AppText>
      <AppText variant="bodySmall" color="textSecondary">
        Stops: {item.stops?.length || 0}
      </AppText>
      {item.createdAt && (
        <AppText variant="caption" color="textSecondary" style={styles.date}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </AppText>
      )}
      {isDriverExecution && (
        <Button
          title="Add to Trip"
          onPress={(e) => {
            e?.stopPropagation?.();
            handleAddToTrip(item.id);
          }}
          variant="outline"
          style={styles.addToTripButton}
          disabled={acceptMutation.isPending}
          loading={acceptMutation.isPending && addToTripOrderId === item.id}
        />
      )}
    </Card>
  );

  const emptyState = (
    <View style={styles.emptyState}>
      <AppText variant="h3" weight="bold" color="text" style={styles.emptyTitle}>
        No orders
      </AppText>
      <AppText variant="body" color="textSecondary" style={styles.emptySubtitle}>
        Unassigned orders will appear here.
      </AppText>
      {canEditRoute && (
        <Button
          title="Create Order"
          onPress={() => navigation.navigate('CreateOrder')}
          style={styles.createButton}
        />
      )}
    </View>
  );

  if (isLoading && !orders?.length) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <AppText variant="body" color="textSecondary">
            Loading orders...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <AppText variant="body" color="error">
            Error loading orders: {(error as Error).message}
          </AppText>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, orders.length === 0 && styles.listEmpty]}
        ListEmptyComponent={emptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Trip picker modal (Driver only) */}
      {isDriverExecution && (
        <Modal visible={addToTripOrderId != null} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={closeTripPicker}>
            <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
              <AppText variant="h3" weight="bold" color="text" style={styles.sheetTitle}>
                Add to trip
              </AppText>
              <AppText variant="bodySmall" color="textSecondary" style={styles.sheetSubtitle}>
                Trips today
              </AppText>
              <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
                {safeTrips.map((trip, index) => {
                  const stopCount = trip.stops?.length ?? 0;
                  return (
                    <TouchableOpacity
                      key={trip.id}
                      style={styles.sheetRow}
                      onPress={() => handleAcceptConfirm(trip.id)}
                      disabled={acceptMutation.isPending}>
                      <AppText variant="body" weight="semibold" color="text">
                        {getTripLabel(trip, index)}
                      </AppText>
                      <AppText variant="bodySmall" color="textSecondary">
                        {stopCount} stop{stopCount !== 1 ? 's' : ''}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.sheetRow, styles.createNewRow]}
                  onPress={() => handleAcceptConfirm()}
                  disabled={acceptMutation.isPending}>
                  <AppText variant="body" weight="semibold" color="primary">
                    + Create New Trip
                  </AppText>
                </TouchableOpacity>
              </ScrollView>
              <Button title="Cancel" variant="outline" onPress={closeTripPicker} style={styles.sheetButton} />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: theme.spacing.md,
  },
  listEmpty: {
    flexGrow: 1,
  },
  orderCard: {
    marginBottom: theme.spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  customerName: {
    marginBottom: theme.spacing.xs,
  },
  date: {
    marginTop: theme.spacing.xs,
  },
  addToTripButton: {
    marginTop: theme.spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyTitle: {
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  createButton: {
    marginTop: theme.spacing.sm,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  headerButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.lg,
    borderTopRightRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    maxHeight: '70%',
  },
  sheetTitle: {
    marginBottom: theme.spacing.xs,
  },
  sheetSubtitle: {
    marginBottom: theme.spacing.sm,
  },
  sheetList: {
    maxHeight: 280,
    marginBottom: theme.spacing.md,
  },
  sheetRow: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  createNewRow: {
    borderBottomWidth: 0,
  },
  sheetButton: {
    marginTop: theme.spacing.xs,
  },
});
