import React from 'react';
import { FlatList, StyleSheet, View, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../app/navigation/AdminStack';
import { getOrders } from '../../api/orders';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'OrdersList'>;

export default function OrdersListScreen({ navigation }: Props) {
  const {
    data: orders,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const renderOrder = ({ item }: { item: any }) => (
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
    </Card>
  );

  if (isLoading) {
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
            Error loading orders: {error.message}
          </AppText>
          <Button title="Retry" onPress={() => refetch()} style={styles.retryButton} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={orders || []}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centerContainer}>
            <AppText variant="body" color="textSecondary">
              No orders found
            </AppText>
            <Button
              title="Create Order"
              onPress={() => navigation.navigate('CreateOrder')}
              style={styles.createButton}
            />
          </View>
        }
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  retryButton: {
    marginTop: theme.spacing.md,
  },
  createButton: {
    marginTop: theme.spacing.md,
  },
});
