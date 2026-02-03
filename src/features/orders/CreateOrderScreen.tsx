import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../app/navigation/AdminStack';
import { createOrder } from '../../api/orders';
import { OrderStop, CreateOrderRequest } from '../../api/types';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import Input from '../../shared/ui/Input';
import Button from '../../shared/ui/Button';
import AppText from '../../shared/ui/AppText';
import Badge from '../../shared/ui/Badge';
import { theme } from '../../shared/theme/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'CreateOrder'>;

interface FormErrors {
  customerName?: string;
  stops?: string;
  [key: string]: string | undefined;
}

export default function CreateOrderScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const [customerName, setCustomerName] = useState('');
  const [stops, setStops] = useState<OrderStop[]>([
    {
      type: 'PICKUP',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      country: '',
      plannedAt: '',
    },
    {
      type: 'DELIVERY',
      addressLine1: '',
      addressLine2: '',
      city: '',
      postalCode: '',
      country: '',
      plannedAt: '',
    },
  ]);
  const [errors, setErrors] = useState<FormErrors>({});

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (order) => {
      // Invalidate and refetch orders list
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      Alert.alert('Success', 'Order created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.replace('OrderDetail', { orderId: order.id }),
        },
      ]);
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message || 'Failed to create order');
    },
  });

  const updateStop = (index: number, field: keyof OrderStop, value: string) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], [field]: value };
    setStops(newStops);
    // Clear errors for this field
    const errorKey = `stop${index}_${field}`;
    if (errors[errorKey]) {
      setErrors({ ...errors, [errorKey]: undefined });
    }
  };

  const addStop = () => {
    setStops([
      ...stops,
      {
        type: 'DELIVERY',
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        country: '',
        plannedAt: '',
      },
    ]);
  };

  const removeStop = (index: number) => {
    if (stops.length > 2) {
      const newStops = stops.filter((_, i) => i !== index);
      setStops(newStops);
    } else {
      Alert.alert('Validation', 'At least 2 stops are required');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate customer name
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    // Validate stops (minimum 2)
    if (stops.length < 2) {
      newErrors.stops = 'At least 2 stops are required';
    }

    // Validate each stop
    stops.forEach((stop, index) => {
      if (!stop.addressLine1.trim()) {
        newErrors[`stop${index}_addressLine1`] = 'Address line 1 is required';
      }
      if (!stop.city.trim()) {
        newErrors[`stop${index}_city`] = 'City is required';
      }
      if (!stop.postalCode.trim()) {
        newErrors[`stop${index}_postalCode`] = 'Postal code is required';
      }
      if (!stop.country.trim()) {
        newErrors[`stop${index}_country`] = 'Country is required';
      }
      if (!stop.plannedAt.trim()) {
        newErrors[`stop${index}_plannedAt`] = 'Planned date/time is required';
      } else {
        // Validate date format
        const date = new Date(stop.plannedAt);
        if (isNaN(date.getTime())) {
          newErrors[`stop${index}_plannedAt`] = 'Invalid date/time format';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const orderData: CreateOrderRequest = {
      customerName: customerName.trim(),
      stops: stops.map((stop) => ({
        type: stop.type,
        addressLine1: stop.addressLine1.trim(),
        addressLine2: stop.addressLine2?.trim() || undefined,
        city: stop.city.trim(),
        postalCode: stop.postalCode.trim(),
        country: stop.country.trim(),
        plannedAt: stop.plannedAt.trim(),
      })),
    };

    createOrderMutation.mutate(orderData);
  };

  return (
    <Screen scrollable>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Customer Name */}
        <Card style={styles.section}>
          <Input
            label="Customer Name *"
            placeholder="Enter customer name"
            value={customerName}
            onChangeText={(text) => {
              setCustomerName(text);
              if (errors.customerName) {
                setErrors({ ...errors, customerName: undefined });
              }
            }}
            error={errors.customerName}
          />
        </Card>

        {/* Stops */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="h2" weight="bold" color="text">
              Stops *
            </AppText>
            {errors.stops && (
              <AppText variant="caption" color="error">
                {errors.stops}
              </AppText>
            )}
          </View>

          {stops.map((stop, index) => (
            <Card key={index} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <AppText variant="h3" weight="semibold" color="text">
                  Stop {index + 1}
                </AppText>
                <View style={styles.stopHeaderActions}>
                  <Badge
                    label={stop.type}
                    variant={stop.type === 'PICKUP' ? 'info' : 'success'}
                  />
                  {stops.length > 2 && (
                    <Button
                      title="Remove"
                      onPress={() => removeStop(index)}
                      variant="text"
                      size="sm"
                      style={styles.removeButton}
                    />
                  )}
                </View>
              </View>

              <View style={styles.stopTypeButtons}>
                <Button
                  title="Pickup"
                  onPress={() => updateStop(index, 'type', 'PICKUP')}
                  variant={stop.type === 'PICKUP' ? 'primary' : 'outline'}
                  size="sm"
                  style={styles.typeButton}
                />
                <Button
                  title="Delivery"
                  onPress={() => updateStop(index, 'type', 'DELIVERY')}
                  variant={stop.type === 'DELIVERY' ? 'primary' : 'outline'}
                  size="sm"
                  style={styles.typeButton}
                />
              </View>

              <Input
                label="Address Line 1 *"
                placeholder="Street address"
                value={stop.addressLine1}
                onChangeText={(value) => updateStop(index, 'addressLine1', value)}
                error={errors[`stop${index}_addressLine1`]}
              />

              <Input
                label="Address Line 2"
                placeholder="Apartment, suite, etc. (optional)"
                value={stop.addressLine2 || ''}
                onChangeText={(value) => updateStop(index, 'addressLine2', value)}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Input
                    label="City *"
                    placeholder="City"
                    value={stop.city}
                    onChangeText={(value) => updateStop(index, 'city', value)}
                    error={errors[`stop${index}_city`]}
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Input
                    label="Postal Code *"
                    placeholder="Postal code"
                    value={stop.postalCode}
                    onChangeText={(value) => updateStop(index, 'postalCode', value)}
                    error={errors[`stop${index}_postalCode`]}
                  />
                </View>
              </View>

              <Input
                label="Country *"
                placeholder="Country"
                value={stop.country}
                onChangeText={(value) => updateStop(index, 'country', value)}
                error={errors[`stop${index}_country`]}
              />

              <Input
                label="Planned Date/Time *"
                placeholder="YYYY-MM-DDTHH:mm:ss (ISO format)"
                value={stop.plannedAt}
                onChangeText={(value) => updateStop(index, 'plannedAt', value)}
                error={errors[`stop${index}_plannedAt`]}
              />
              <AppText variant="caption" color="textSecondary" style={styles.hint}>
                Example: 2024-01-15T10:00:00
              </AppText>
            </Card>
          ))}

          <Button title="Add Stop" onPress={addStop} variant="outline" style={styles.addButton} />
        </Card>

        {/* Submit Button */}
        <Card style={styles.section}>
          <Button
            title="Create Order"
            onPress={handleSubmit}
            loading={createOrderMutation.isPending}
            disabled={createOrderMutation.isPending}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionHeader: {
    marginBottom: theme.spacing.md,
  },
  stopCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.gray50,
  },
  stopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  stopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  removeButton: {
    marginLeft: theme.spacing.sm,
  },
  stopTypeButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  typeButton: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  hint: {
    marginTop: -theme.spacing.md,
    marginBottom: theme.spacing.md,
    marginLeft: theme.spacing.xs,
  },
  addButton: {
    marginTop: theme.spacing.sm,
  },
  submitButton: {
    marginTop: theme.spacing.sm,
  },
});
