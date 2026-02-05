import React, { useCallback, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../app/navigation/AdminStack';
import { getOrderById } from '../../api/orders';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route }: Props) {
  const { orderId } = route.params;
  const [copyToast, setCopyToast] = useState(false);
  const handleCopyOrderRef = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 1500);
    } catch {}
  }, []);

  const {
    data: order,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => getOrderById(orderId),
  });

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <AppText variant="body" color="textSecondary">
            Loading order...
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
            Error loading order: {error.message}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (!order) {
    return (
      <Screen>
        <View style={styles.centerContainer}>
          <AppText variant="body" color="textSecondary">
            Order not found
          </AppText>
        </View>
      </Screen>
    );
  }

  const orderRef = order.orderNumber || `#${order.id.slice(0, 8)}`;

  return (
    <Screen scrollable>
      {/* Order Ref (immutable, prominent, with Copy) */}
      <Card style={styles.section}>
        <View style={styles.orderRefRow}>
          <View style={styles.orderRefBlock}>
            <AppText variant="caption" color="textSecondary" style={styles.orderRefLabel}>
              Order Ref
            </AppText>
            <AppText variant="h1" weight="bold" color="text">
              {orderRef}
            </AppText>
          </View>
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => handleCopyOrderRef(orderRef)}
            accessibilityLabel="Copy order ref">
            <AppText variant="body" weight="semibold" color="primary">Copy</AppText>
          </TouchableOpacity>
        </View>
        {copyToast && (
          <AppText variant="caption" color="primary" style={styles.copiedHint}>
            Copied to clipboard
          </AppText>
        )}
        <View style={styles.header}>
          {order.status && (
            <Badge label={order.status} variant="info" />
          )}
        </View>
        <View style={styles.infoRow}>
          <AppText variant="label" color="textSecondary">
            Customer
          </AppText>
          <AppText variant="body" color="text" style={styles.value}>
            {order.customerName}
          </AppText>
        </View>
        {order.createdAt && (
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Created At
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {new Date(order.createdAt).toLocaleString()}
            </AppText>
          </View>
        )}
      </Card>

      {/* Stops */}
      <Card style={styles.section}>
        <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
          Stops ({order.stops?.length || 0})
        </AppText>
        {order.stops?.map((stop, index) => (
          <Card key={index} style={styles.stopCard}>
            <View style={styles.stopHeader}>
              <View style={styles.sequenceBadge}>
                <AppText variant="body" weight="bold" color="white">
                  {stop.sequence !== undefined ? stop.sequence : index + 1}
                </AppText>
              </View>
              <View style={styles.stopInfo}>
                <AppText variant="h3" weight="semibold" color="text">
                  {stop.type}
                </AppText>
                <AppText variant="body" color="textSecondary">
                  {stop.addressLine1}
                  {stop.addressLine2 ? `, ${stop.addressLine2}` : ''}
                </AppText>
                <AppText variant="body" color="textSecondary">
                  {stop.city}, {stop.postalCode} {stop.country}
                </AppText>
                {stop.plannedAt && (
                  <AppText variant="bodySmall" color="textSecondary" style={styles.plannedAt}>
                    Planned: {new Date(stop.plannedAt).toLocaleString()}
                  </AppText>
                )}
              </View>
            </View>
          </Card>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  orderRefRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  orderRefBlock: {
    flex: 1,
  },
  orderRefLabel: {
    marginBottom: theme.spacing.xs,
  },
  copyBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  copiedHint: {
    marginBottom: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    marginBottom: theme.spacing.md,
  },
  value: {
    marginTop: theme.spacing.xs,
  },
  stopCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.gray50,
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sequenceBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  stopInfo: {
    flex: 1,
  },
  plannedAt: {
    marginTop: theme.spacing.xs,
  },
});
