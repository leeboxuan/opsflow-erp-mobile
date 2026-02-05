import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../shared/context/AuthContext';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import { theme } from '../../shared/theme/theme';
import { TenantMembership } from '../../api/types';

/**
 * Shown when user has multiple tenant memberships and none selected.
 * Simple list: tap a tenant to select and proceed.
 */
export default function TenantSelectScreen() {
  const { user, setCurrentTenantId } = useAuth();
  const tenants = user?.tenants ?? [];

  const handleSelect = (membership: TenantMembership) => {
    setCurrentTenantId(membership.tenantId);
  };

  return (
    <Screen scrollable>
      <AppText variant="h2" weight="bold" color="text" style={styles.title}>
        Select tenant
      </AppText>
      <AppText variant="body" color="textSecondary" style={styles.subtitle}>
        Choose a tenant to continue.
      </AppText>
      <View style={styles.list}>
        {tenants.map((m) => (
          <TouchableOpacity
            key={m.tenantId}
            activeOpacity={0.7}
            onPress={() => handleSelect(m)}>
            <Card style={styles.card}>
              <AppText variant="body" weight="semibold" color="text">
                {m.tenantName ?? m.tenant ?? m.tenantId}
              </AppText>
              {m.role && (
                <AppText variant="caption" color="textSecondary" style={styles.role}>
                  {m.role}
                </AppText>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    marginBottom: theme.spacing.md,
  },
  list: {
    gap: theme.spacing.sm,
  },
  card: {
    marginBottom: theme.spacing.sm,
  },
  role: {
    marginTop: theme.spacing.xs,
  },
});
