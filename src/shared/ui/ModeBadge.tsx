import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AppText from './AppText';
import { theme } from '../theme/theme';

/**
 * Small mode badge: "SuperAdmin" when in global mode, or tenant name when in tenant mode.
 */
export default function ModeBadge() {
  const { isSuperAdmin, selectedTenantName } = useAuth();
  const label = isSuperAdmin && !selectedTenantName ? 'SuperAdmin' : selectedTenantName;
  if (!label) return null;

  return (
    <View style={styles.badge}>
      <AppText variant="caption" weight="semibold" color="text" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.gray100,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    maxWidth: 200,
  },
});
