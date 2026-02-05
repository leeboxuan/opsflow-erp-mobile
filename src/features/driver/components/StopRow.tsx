import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppText from '../../../shared/ui/AppText';
import { theme } from '../../../shared/theme/theme';
import { getStopAddress } from './transportListHelpers';
import { Stop } from '../../../api/types';

interface StopRowProps {
  stop: Stop;
  /** Optional sequence to show (e.g. 1, 2, 3). Omit to hide. */
  sequence?: number;
}

export default function StopRow({ stop, sequence }: StopRowProps) {
  const address = getStopAddress({
    addressLine1: stop.addressLine1,
    postalCode: stop.postalCode,
    city: stop.city,
  });
  return (
    <View style={styles.row}>
      {sequence != null && (
        <View style={styles.sequenceBadge}>
          <AppText variant="body" weight="bold" color="white">
            {sequence}
          </AppText>
        </View>
      )}
      <View style={styles.info}>
        <AppText variant="body" weight="medium" color="text" numberOfLines={2}>
          {address}
        </AppText>
      </View>
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
  },
  sequenceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  info: {
    flex: 1,
  },
});
