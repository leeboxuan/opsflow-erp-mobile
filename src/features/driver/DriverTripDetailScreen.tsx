import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DriverTripsStackParamList } from '../../app/navigation/DriverTabs';
import {
  getTransportTrip,
  getTransportTrips,
  getUnassignedOrders,
  acceptOrder,
  patchTripStatus,
  reorderStops,
  moveStop,
  unassignOrder,
} from '../../api/transport';
import { getToken } from '../../shared/utils/authStorage';
import { getLastSeenRouteVersion, setLastSeenRouteVersion } from '../../shared/utils/routeVersionStorage';
import { useAuthRole } from '../../shared/hooks/useAuthRole';
import { getErrorMessage } from '../../api/client';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';
import { Stop, Trip } from '../../api/types';
import { StopRow, UnassignedOrderRow, EditableStopRow, getTripLabel } from './components';

type Props = NativeStackScreenProps<DriverTripsStackParamList, 'DriverTripDetail'>;

/** Sort by sequence asc; null/undefined sequence last */
function sortStopsBySequence(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => (a.sequence ?? Infinity) - (b.sequence ?? Infinity));
}

/** Delivered = completed or has POD signed */
function isDelivered(stop: Stop): boolean {
  const status = (stop.status ?? '').toLowerCase();
  if (status === 'completed' || status === 'delivered') return true;
  if (stop.pod?.signedAt != null) return true;
  return false;
}

/** Block edit when trip is Closed or Cancelled */
function isEditBlockedByStatus(status: string): boolean {
  const s = (status ?? '').toLowerCase();
  return s === 'closed' || s === 'cancelled';
}

export default function DriverTripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const { canEditRoute } = useAuthRole();
  const queryClient = useQueryClient();
  const [addOrdersVisible, setAddOrdersVisible] = useState(false);
  const [assigningOrderId, setAssigningOrderId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Stop[]>([]);
  const [toast, setToast] = useState<{ visible: boolean; message: string; isError: boolean }>({
    visible: false,
    message: '',
    isError: false,
  });
  const [moveStopContext, setMoveStopContext] = useState<{ stopId: string; orderId?: string } | null>(null);
  const [routeUpdatedBanner, setRouteUpdatedBanner] = useState(false);
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const hasToken = Boolean(getToken());
  const isFocused = useIsFocused();

  const { data: trip, isLoading, error, refetch } = useQuery({
    queryKey: ['transportTrip', tripId],
    queryFn: () => getTransportTrip(tripId),
    enabled: hasToken && !!tripId,
    refetchInterval: isFocused ? 45000 : false,
  });

  useFocusEffect(
    useCallback(() => {
      if (hasToken && tripId) refetch();
    }, [hasToken, tripId, refetch])
  );

  useEffect(() => {
    if (!trip?.id || trip.routeVersion == null) return;
    const lastSeen = getLastSeenRouteVersion(tripId);
    if (lastSeen === undefined) {
      setLastSeenRouteVersion(tripId, trip.routeVersion);
      return;
    }
    if (trip.routeVersion > lastSeen) {
      setLastSeenRouteVersion(tripId, trip.routeVersion);
      setRouteUpdatedBanner(true);
    }
  }, [tripId, trip?.id, trip?.routeVersion]);

  const { data: todayTrips = [] } = useQuery({
    queryKey: ['transportTrips', dateKey],
    queryFn: () => getTransportTrips(today),
    enabled: hasToken && (addOrdersVisible || moveStopContext != null),
  });

  const { data: unassignedOrders = [] } = useQuery({
    queryKey: ['unassignedOrders', dateKey],
    queryFn: () => getUnassignedOrders(today),
    enabled: hasToken && addOrdersVisible,
  });

  const invalidateTrip = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['transportTrip', tripId] });
    queryClient.invalidateQueries({ queryKey: ['transportTrips', dateKey] });
    queryClient.invalidateQueries({ queryKey: ['unassignedOrders', dateKey] });
  }, [queryClient, tripId, dateKey]);

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ visible: true, message, isError });
  }, []);

  useEffect(() => {
    if (trip?.stops && editMode) {
      const sorted = sortStopsBySequence(trip.stops);
      const pending = sorted.filter((s) => !isDelivered(s));
      setPendingOrder(pending);
    }
  }, [trip?.stops, editMode]);

  const acceptMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string }) => acceptOrder(orderId, tripId),
    onMutate: ({ orderId }) => setAssigningOrderId(orderId),
    onSuccess: (_, { orderId }) => {
      invalidateTrip();
      setAssigningOrderId(null);
      setAddOrdersVisible(false);
    },
    onError: () => setAssigningOrderId(null),
  });

  const startTripMutation = useMutation({
    mutationFn: () => patchTripStatus(tripId, 'InTransit'),
    onSuccess: () => {
      invalidateTrip();
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (stopIdsInOrder: string[]) => reorderStops(tripId, stopIdsInOrder),
    onSuccess: () => {
      invalidateTrip();
      showToast('Route order saved');
    },
    onError: (err) => {
      showToast(getErrorMessage(err), true);
    },
  });

  const moveStopMutation = useMutation({
    mutationFn: ({ stopId, targetTripId }: { stopId: string; targetTripId: string }) =>
      moveStop(stopId, targetTripId),
    onSuccess: (_, { stopId, targetTripId }) => {
      setMoveStopContext(null);
      queryClient.setQueryData<Trip>(['transportTrip', tripId], (prev) => {
        if (!prev?.stops) return prev;
        return { ...prev, stops: prev.stops.filter((s) => s.id !== stopId) };
      });
      queryClient.setQueryData<Trip[]>(['transportTrips', dateKey], (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((t) => {
          if (t.id === tripId)
            return { ...t, stops: (t.stops ?? []).filter((s) => s.id !== stopId) };
          if (t.id === targetTripId)
            return { ...t, stops: [...(t.stops ?? []), {} as Stop] };
          return t;
        });
      });
      invalidateTrip();
      showToast('Stop moved');
    },
    onError: (err) => {
      showToast(getErrorMessage(err), true);
    },
  });

  const acceptToNewTripMutation = useMutation({
    mutationFn: ({ orderId }: { orderId: string; stopId: string }) => acceptOrder(orderId),
    onSuccess: (result, { orderId, stopId }) => {
      setMoveStopContext(null);
      queryClient.setQueryData<Trip>(['transportTrip', tripId], (prev) => {
        if (!prev?.stops) return prev;
        return { ...prev, stops: prev.stops.filter((s) => s.id !== stopId) };
      });
      const newTripId = result?.tripId ?? result?.trip?.id;
      queryClient.setQueryData<Trip[]>(['transportTrips', dateKey], (prev) => {
        if (!Array.isArray(prev)) return prev;
        const withoutSource = prev.map((t) =>
          t.id === tripId ? { ...t, stops: (t.stops ?? []).filter((s) => s.id !== stopId) } : t
        );
        if (newTripId && !withoutSource.some((t) => t.id === newTripId)) {
          const newTrip: Trip = {
            id: newTripId,
            status: 'Scheduled',
            stops: [{}] as Stop[],
            tripNumber: `Trip ${withoutSource.length + 1}`,
          };
          return [...withoutSource, newTrip];
        }
        return withoutSource;
      });
      invalidateTrip();
      showToast('Order moved to new trip');
    },
    onError: (err) => {
      showToast(getErrorMessage(err), true);
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (orderId: string) => unassignOrder(orderId),
    onSuccess: () => {
      invalidateTrip();
      showToast('Order unassigned');
    },
    onError: (err) => {
      showToast(getErrorMessage(err), true);
    },
  });

  const handleAddOrder = useCallback(
    (orderId: string) => {
      if (assigningOrderId) return;
      acceptMutation.mutate({ orderId });
    },
    [assigningOrderId, acceptMutation]
  );

  const handleStartTrip = useCallback(() => {
    startTripMutation.mutate();
  }, [startTripMutation]);

  const handleSaveOrder = useCallback(() => {
    if (!trip) return;
    const delivered = sortStopsBySequence(trip.stops ?? []).filter(isDelivered);
    const ids = [...pendingOrder.map((s) => s.id), ...delivered.map((s) => s.id)];
    reorderMutation.mutate(ids);
  }, [trip, pendingOrder, reorderMutation]);

  const handleMoveToTrip = useCallback((stop: Stop) => {
    setMoveStopContext({ stopId: stop.id, orderId: stop.transportOrderId });
  }, []);

  const handleConfirmMove = useCallback(
    (targetTripId: string) => {
      if (!moveStopContext) return;
      moveStopMutation.mutate({ stopId: moveStopContext.stopId, targetTripId });
    },
    [moveStopContext, moveStopMutation]
  );

  const handleCreateNewTrip = useCallback(() => {
    const orderId = moveStopContext?.orderId;
    const stopId = moveStopContext?.stopId;
    if (!orderId || !stopId) {
      showToast('No order linked to this stop', true);
      return;
    }
    acceptToNewTripMutation.mutate({ orderId, stopId });
  }, [moveStopContext?.orderId, moveStopContext?.stopId, acceptToNewTripMutation, showToast]);

  const handleUnassign = useCallback(
    (stop: Stop) => {
      const orderId = stop.transportOrderId;
      if (!orderId) {
        showToast('No order linked to this stop', true);
        return;
      }
      Alert.alert(
        'Unassign order',
        'Remove this stop (order) from the trip?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unassign', style: 'destructive', onPress: () => unassignMutation.mutate(orderId) },
        ]
      );
    },
    [unassignMutation, showToast]
  );

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <AppText variant="body" color="textSecondary" style={styles.loadingText}>
            Loading trip...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (error || !trip) {
    return (
      <Screen>
        <Card style={styles.errorCard}>
          <AppText variant="body" color="error">
            Failed to load trip.
          </AppText>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
          <Button title="Back" onPress={() => navigation.goBack()} variant="outline" />
        </Card>
      </Screen>
    );
  }

  const sortedStops = sortStopsBySequence(trip.stops ?? []);
  const deliveredStops = sortedStops.filter(isDelivered);
  const editBlocked = isEditBlockedByStatus(trip.status);
  const canEditRouteAllowed = canEditRoute && !editBlocked;
  const statusVariant =
    trip.status === 'In Transit' ? 'info' : trip.status === 'Completed' ? 'success' : 'warning';

  const otherTrips = todayTrips.filter((t: Trip) => t.id !== tripId);
  const hasPendingChanges =
    editMode &&
    pendingOrder.length > 0 &&
    JSON.stringify(pendingOrder.map((s) => s.id)) !==
      JSON.stringify(sortedStops.filter((s) => !isDelivered(s)).map((s) => s.id));

  const renderStopItem = ({ item, index }: { item: Stop; index: number }) => (
    <Card style={styles.stopCard}>
      <StopRow stop={item} sequence={index + 1} />
    </Card>
  );

  const editModeListHeader = (
    <>
      {headerBlock}
      {pendingOrder.length > 0 && (
        <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
          Pending (drag to reorder)
        </AppText>
      )}
    </>
  );

  const editModeListFooter = (
    <>
      {deliveredStops.length > 0 && (
        <>
          <AppText variant="label" color="textSecondary" style={styles.sectionLabel}>
            Delivered (locked)
          </AppText>
          {deliveredStops.map((stop, index) => (
            <Card key={stop.id} style={[styles.stopCard, styles.lockedCard]}>
              <EditableStopRow
                stop={stop}
                sequence={pendingOrder.length + index + 1}
                editMode
                locked
              />
            </Card>
          ))}
        </>
      )}
      {hasPendingChanges && (
        <Button
          title="Save order"
          onPress={handleSaveOrder}
          loading={reorderMutation.isPending}
          style={styles.saveButton}
        />
      )}
    </>
  );

  const renderDraggableItem = ({
    item,
    getIndex,
    drag,
  }: {
    item: Stop;
    getIndex: () => number | undefined;
    drag: () => void;
  }) => {
    const index = getIndex();
    const sequence = index !== undefined ? index + 1 : 1;
    return (
      <Card style={styles.stopCard}>
        <EditableStopRow
          stop={item}
          sequence={sequence}
          editMode
          locked={false}
          onDrag={drag}
          onMoveToTrip={() => handleMoveToTrip(item)}
          onUnassign={() => handleUnassign(item)}
        />
      </Card>
    );
  };

  const headerBlock = (
    <>
      <View style={styles.header}>
        <AppText variant="h2" weight="bold" color="text">
          {getTripLabel(trip, 0)}
        </AppText>
        <Badge label={trip.status} variant={statusVariant} />
      </View>
      <View style={styles.actions}>
        {canEditRoute && (
          <Button
            title="Add Orders"
            onPress={() => setAddOrdersVisible(true)}
            variant="outline"
            style={styles.actionButton}
          />
        )}
        <Button
          title="Start Trip"
          onPress={handleStartTrip}
          loading={startTripMutation.isPending}
          disabled={trip.status === 'In Transit' || trip.status === 'Completed'}
          style={styles.actionButton}
        />
      </View>
      {canEditRouteAllowed && (
        <View style={styles.editRow}>
          <AppText variant="body" weight="medium" color="text">
            Edit Route
          </AppText>
          <Switch
            value={editMode}
            onValueChange={setEditMode}
            trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }}
            thumbColor={theme.colors.white}
          />
        </View>
      )}
    </>
  );

  return (
    <Screen>
      {routeUpdatedBanner && (
        <View style={styles.routeUpdatedBanner}>
          <AppText variant="body" color="white" style={styles.routeUpdatedBannerText}>
            Route updated by Admin
          </AppText>
          <Pressable
            onPress={() => setRouteUpdatedBanner(false)}
            style={styles.routeUpdatedBannerDismiss}
            hitSlop={8}>
            <AppText variant="body" weight="semibold" color="white">
              Dismiss
            </AppText>
          </Pressable>
        </View>
      )}
      {editMode && canEditRouteAllowed ? (
        <DraggableFlatList<Stop>
          data={pendingOrder}
          keyExtractor={(item) => item.id}
          onDragEnd={({ data }) => setPendingOrder(data)}
          ListHeaderComponent={editModeListHeader}
          ListFooterComponent={editModeListFooter}
          ListEmptyComponent={
            pendingOrder.length === 0 && deliveredStops.length === 0 ? (
              <View style={styles.empty}>
                <AppText variant="body" color="textSecondary">
                  No stops for this trip.
                </AppText>
              </View>
            ) : null
          }
          renderItem={renderDraggableItem}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={sortedStops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={headerBlock}
          renderItem={renderStopItem}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="body" color="textSecondary">
                No stops for this trip.
              </AppText>
            </View>
          }
        />
      )}

      <Modal visible={addOrdersVisible} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOrdersVisible(false)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sheetTitle}>
              Add order to trip
            </AppText>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {unassignedOrders.length === 0 ? (
                <AppText variant="body" color="textSecondary" style={styles.emptySheet}>
                  No unassigned orders.
                </AppText>
              ) : (
                unassignedOrders.map((order) => (
                  <UnassignedOrderRow
                    key={order.id}
                    order={order}
                    actionTitle="Add"
                    onAction={() => handleAddOrder(order.id)}
                    disabled={assigningOrderId != null}
                    loading={assigningOrderId === order.id && acceptMutation.isPending}
                  />
                ))
              )}
            </ScrollView>
            <Button title="Done" variant="outline" onPress={() => setAddOrdersVisible(false)} style={styles.sheetButton} />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={moveStopContext != null} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setMoveStopContext(null)}>
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <AppText variant="h3" weight="bold" color="text" style={styles.sheetTitle}>
              Move stop to trip
            </AppText>
            <AppText variant="bodySmall" color="textSecondary" style={styles.sheetSubtitle}>
              Trips Today
            </AppText>
            <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled">
              {otherTrips.map((t, idx) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.sheetRow}
                  onPress={() => handleConfirmMove(t.id)}
                  disabled={moveStopMutation.isPending}>
                  <AppText variant="body" weight="semibold" color="text">
                    {getTripLabel(t, idx)}
                  </AppText>
                  <AppText variant="bodySmall" color="textSecondary">
                    {(t.stops?.length ?? 0)} stop{(t.stops?.length ?? 0) !== 1 ? 's' : ''}
                  </AppText>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.sheetRow, styles.createNewRow]}
                onPress={handleCreateNewTrip}
                disabled={acceptToNewTripMutation.isPending}>
                <AppText variant="body" weight="semibold" color="primary">
                  + Create New Trip
                </AppText>
              </TouchableOpacity>
            </ScrollView>
            <Button title="Cancel" variant="outline" onPress={() => setMoveStopContext(null)} style={styles.sheetButton} />
          </Pressable>
        </Pressable>
      </Modal>

      {toast.visible && (
        <View style={[styles.toast, toast.isError && styles.toastError]}>
          <AppText variant="body" color="white" style={styles.toastMessage} numberOfLines={2}>
            {toast.message}
          </AppText>
          <Pressable
            onPress={() => setToast((t) => ({ ...t, visible: false }))}
            style={styles.toastDismiss}>
            <AppText variant="body" weight="semibold" color="white">
              Dismiss
            </AppText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  routeUpdatedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  routeUpdatedBannerText: {
    flex: 1,
    color: '#fff',
  },
  routeUpdatedBannerDismiss: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  list: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  sectionLabel: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  stopCard: {
    marginBottom: theme.spacing.sm,
  },
  lockedCard: {
    backgroundColor: theme.colors.gray50,
    opacity: 0.95,
  },
  saveButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
  },
  errorCard: {
    margin: theme.spacing.md,
    backgroundColor: theme.colors.errorLight,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  empty: {
    padding: theme.spacing.xl,
    alignItems: 'center',
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
  sheetList: {
    maxHeight: 320,
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
  emptySheet: {
    textAlign: 'center',
    paddingVertical: theme.spacing.lg,
  },
  sheetButton: {
    marginTop: theme.spacing.xs,
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
  toastError: {
    backgroundColor: theme.colors.error,
  },
  toastMessage: {
    flex: 1,
    color: '#fff',
  },
  toastDismiss: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
});
