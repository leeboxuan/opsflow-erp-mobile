import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Card from '../../../shared/ui/Card';
import AppText from '../../../shared/ui/AppText';
import Badge from '../../../shared/ui/Badge';
import { theme } from '../../../shared/theme/theme';
import { Trip } from '../../../api/types';
import { getTripLabel } from './transportListHelpers';

interface TripCardProps {
  trip: Trip;
  index: number;
  onPress: () => void;
  /** Optional long-press (e.g. "Edit Route" for Admin/Ops) */
  onLongPress?: () => void;
}

export default function TripCard({ trip, index, onPress, onLongPress }: TripCardProps) {
  const stopCount = trip.stops?.length ?? 0;
  const variant =
    trip.status === 'In Transit' ? 'info' : trip.status === 'Completed' ? 'success' : 'warning';
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} onLongPress={onLongPress}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <AppText variant="h3" weight="bold" color="text">
            {getTripLabel(trip, index)}
          </AppText>
          <Badge label={trip.status} variant={variant} />
        </View>
        <AppText variant="bodySmall" color="textSecondary">
          {stopCount} stop{stopCount !== 1 ? 's' : ''}
        </AppText>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
});
