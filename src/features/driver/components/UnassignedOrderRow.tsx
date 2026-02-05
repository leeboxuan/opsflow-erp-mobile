import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../../shared/ui/AppText';
import Button from '../../../shared/ui/Button';
import { theme } from '../../../shared/theme/theme';
import { Order } from '../../../api/types';
import { getOrderAddress } from './transportListHelpers';

interface UnassignedOrderRowProps {
  order: Order;
  actionTitle: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export default function UnassignedOrderRow({
  order,
  actionTitle,
  onAction,
  disabled = false,
  loading = false,
}: UnassignedOrderRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <AppText variant="body" weight="semibold" color="text" numberOfLines={2}>
          {getOrderAddress(order)}
        </AppText>
        {order.orderNumber && (
          <AppText variant="bodySmall" color="textSecondary">
            {order.orderNumber}
          </AppText>
        )}
      </View>
      <Button
        title={actionTitle}
        onPress={onAction}
        variant="outline"
        style={styles.button}
        disabled={disabled}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  info: {
    flex: 1,
  },
  button: {
    minWidth: 100,
  },
});
