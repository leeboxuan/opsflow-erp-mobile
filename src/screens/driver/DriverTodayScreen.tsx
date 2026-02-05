import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DriverTabsParamList } from '../../app/navigation/DriverTabs';
import { getTransportTrips, getUnassignedOrders, acceptOrder, unassignOrder } from '../../api/transport';
import { getToken } from '../../shared/utils/authStorage';
import { useAuthRole } from '../../shared/hooks/useAuthRole';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { Trip, Order } from '../../api/types';
import { TripCard, UnassignedOrderRow, getTripLabel } from '../../features/driver/components';

type Props = BottomTabScreenProps<DriverTabsParamList, 'TodayTab'>;

/** In-memory lock: prevent double-assign while a request is in flight */
let assigningOrderId: string | null = null;

export default function DriverTodayScreen({ navigation }: Props) {
  const { role, canEditRoute } = useAuthRole();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [addToTripOrderId, setAddToTripOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; tripLabel: string; orderId: string }>({
    visible: false,
    message: '',
    tripLabel: '',
    orderId: '',
  });
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const hasToken = Boolean(getToken());

  const {
    data: trips = [],
    isLoading: tripsLoading,
    refetch: refetchTrips,
  } = useQuery({
    queryKey: ['transportTrips', dateKey],
    queryFn: () => getTransportTrips(today),
    enabled: hasToken,
  });

  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['unassignedOrders', dateKey],
    queryFn: () => getUnassignedOrders(today),
    enabled: hasToken,
  });

  const acceptMutation = useMutation({
    mutationFn: ({ orderId, tripId }: { orderId: string; tripId?: string }) => acceptOrder(orderId, tripId),
    onMutate: ({ orderId }) => {
      assigningOrderId = orderId;
    },
    onSuccess: (result, { orderId }) => {
      assigningOrderId = null;
      setAddToTripOrderId(null);

      const currentTrips = queryClient.getQueryData<Trip[]>(['transportTrips', dateKey]) ?? [];
      const safeTrips = [...currentTrips];
      const currentOrders = queryClient.getQueryData<Order[]>(['unassignedOrders', dateKey]) ?? [];
      const safeOrders = currentOrders.filter((o) => o.id !== orderId);

      const tripId = result?.tripId ?? result?.trip?.id;
      let tripLabel = 'New Trip';

      if (tripId) {
        const idx = safeTrips.findIndex((t) => t.id === tripId);
        if (idx >= 0) {
          const trip = safeTrips[idx];
          safeTrips[idx] = { ...trip, stops: [...(trip.stops ?? []), {}] as Trip['stops'] };
          tripLabel = getTripLabel(trip, idx);
        }
      } else {
        const newTrip: Trip = {
          id: `temp-${Date.now()}`,
          status: 'Scheduled',
          stops: [{}] as Trip['stops'],
          tripNumber: `Trip ${safeTrips.length + 1}`,
        };
        safeTrips.push(newTrip);
        tripLabel = newTrip.tripNumber ?? 'New Trip';
      }

      queryClient.setQueryData(['transportTrips', dateKey], safeTrips);
      queryClient.setQueryData(['unassignedOrders', dateKey], safeOrders);

      setToast({ visible: true, message: `Added to ${tripLabel}`, tripLabel, orderId });
    },
    onError: () => {
      assigningOrderId = null;
      setAddToTripOrderId(null);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTrips(), refetchOrders()]);
    setRefreshing(false);
  }, [refetchTrips, refetchOrders]);

  const handleTripPress = (tripId: string) => {
    navigation.navigate('TripsTab', {
      screen: 'DriverTripDetail',
      params: { tripId },
    });
  };

  const handleTripLongPress = (tripId: string) => {
    if (!canEditRoute) return;
    Alert.alert(
      'Edit Route',
      'Open trip to add or reorder stops?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Route', onPress: () => handleTripPress(tripId) },
      ]
    );
  };

  const assignButtonLabel = role === 'Driver' ? 'Add to Trip' : 'Assign to Trip';
  const assignSheetTitle = role === 'Driver' ? 'Add to trip' : 'Assign to trip';

  const handleAddToTrip = (orderId: string) => {
    if (assigningOrderId != null) return;
    setAddToTripOrderId(orderId);
  };

  const closeAddToTripModal = useCallback(() => {
    if (!assigningOrderId) setAddToTripOrderId(null);
  }, []);

  const handleAcceptConfirm = useCallback(
    (tripId?: string) => {
      const orderId = addToTripOrderId;
      if (!orderId) return;
      acceptMutation.mutate({ orderId, tripId });
    },
    [addToTripOrderId, acceptMutation]
  );

  const handleUndo = useCallback(async () => {
    const orderIdToUndo = toast.orderId;
    setToast((t) => ({ ...t, visible: false }));
    try {
      await unassignOrder(orderIdToUndo);
    } catch {
      // 404 or unassign not implemented: fall back to refetch
    }
    await Promise.all([refetchTrips(), refetchOrders()]);
  }, [toast.orderId, refetchTrips, refetchOrders]);

  const isLoading = tripsLoading || ordersLoading;
  const safeTrips = Array.isArray(trips) ? trips : [];
  const safeOrders = Array.isArray(orders) ? orders : [];
  const hasTrips = safeTrips.length > 0;
  const showNoTripsSheet = addToTripOrderId != null && !hasTrips;
  const showTripPickerSheet = addToTripOrderId != null && hasTrips;

  return (
    <Screen scrollable>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
        }>
        {/* Section A: Trips Today */}
        <Card style={styles.sectionCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Trips Today
          </AppText>
          {tripsLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <AppText variant="body" color="textSecondary" style={styles.loadingText}>
                Loading trips...
              </AppText>
            </View>
          ) : safeTrips.length === 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.emptyText}>
              No trips yet
            </AppText>
          ) : (
            safeTrips.map((trip, index) => (
              <TripCard
                key={trip.id}
                trip={trip}
                index={index}
                onPress={() => handleTripPress(trip.id)}
                onLongPress={canEditRoute ? () => handleTripLongPress(trip.id) : undefined}
              />
            ))
          )}
        </Card>

        {/* Section B: Unassigned Orders */}
        <Card style={styles.sectionCard}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Unassigned Orders
          </AppText>
          {ordersLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <AppText variant="body" color="textSecondary" style={styles.loadingText}>
                Loading orders...
              </AppText>
            </View>
          ) : safeOrders.length === 0 ? (
            <AppText variant="body" color="textSecondary" style={styles.emptyText}>
              No unassigned orders
            </AppText>
          ) : (
            safeOrders.map((order) => (
              <UnassignedOrderRow
                key={order.id}
                order={order}
                actionTitle={assignButtonLabel}
                onAction={() => handleAddToTrip(order.id)}
                disabled={assigningOrderId != null}
                loading={assigningOrderId === order.id && acceptMutation.isPending}
              />
            ))
          )}
        </Card>
      </ScrollView>

      {/* No-trips sheet: Create a trip for today? */}
      <Modal visible={showNoTripsSheet} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeAddToTripModal}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sheetTitle}>
              Create a trip for today?
            </AppText>
            <View style={styles.sheetActions}>
              <Button
                title="Create Trip + Add Order"
                onPress={() => handleAcceptConfirm()}
                loading={acceptMutation.isPending}
                style={styles.sheetButton}
              />
              <Button title="Cancel" variant="outline" onPress={closeAddToTripModal} style={styles.sheetButton} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Trip picker sheet: list trips today + Create New Trip */}
      <Modal visible={showTripPickerSheet} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={closeAddToTripModal}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sheetTitle}>
              {assignSheetTitle}
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.sheetSubtitle}>
              Trips Today
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
            <Button title="Cancel" variant="outline" onPress={closeAddToTripModal} style={styles.sheetButton} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Snackbar / toast with Undo */}
      {toast.visible && (
        <View style={styles.toast}>
          <AppText variant="body" color="white" style={styles.toastMessage} numberOfLines={1}>
            {toast.message}
          </AppText>
          <Pressable onPress={handleUndo} style={styles.toastUndoHit}>
            <AppText variant="body" weight="semibold" style={styles.toastUndoText}>
              Undo
            </AppText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  sectionCard: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  loadingText: {
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
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
    paddingBottom: theme.spacing.xxl,
  },
  sheetTitle: {
    marginBottom: theme.spacing.xs,
  },
  sheetSubtitle: {
    marginBottom: theme.spacing.sm,
  },
  sheetActions: {
    gap: theme.spacing.sm,
  },
  sheetButton: {
    marginTop: theme.spacing.xs,
  },
  sheetList: {
    maxHeight: 280,
    marginBottom: theme.spacing.md,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  createNewRow: {
    borderBottomWidth: 0,
  },
  toast: {
    position: 'absolute',
    left: theme.spacing.md,
    right: theme.spacing.md,
    bottom: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#323232',
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.md,
  },
  toastMessage: {
    flex: 1,
    color: '#fff',
  },
  toastUndoHit: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  toastUndoText: {
    color: theme.colors.primary,
  },
});
