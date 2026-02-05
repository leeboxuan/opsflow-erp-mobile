import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, Switch, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AdminStackParamList } from '../../app/navigation/AdminStack';
import { DriverStackParamList } from '../../app/navigation/DriverStack';
import { stopBackgroundTracking } from '../../location/locationService';
import Screen from '../../shared/ui/Screen';
import Card from '../../shared/ui/Card';
import AppText from '../../shared/ui/AppText';
import Button from '../../shared/ui/Button';
import Badge from '../../shared/ui/Badge';
import Input from '../../shared/ui/Input';
import { theme } from '../../shared/theme/theme';
import { useAuth } from '../../shared/context/AuthContext';
import { useAuthRole } from '../../shared/hooks/useAuthRole';
import { logout } from '../../api/auth';
import { getSelectedMode, SelectedMode } from '../../shared/utils/authStorage';
import { setSelectedModeGlobal } from '../../app/navigation/AuthenticatedRootNavigator';
import { TenantMembership } from '../../api/types';

type Props =
  | NativeStackScreenProps<AdminStackParamList, 'Settings'>
  | NativeStackScreenProps<DriverStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const queryClient = useQueryClient();
  const { user, setUser, currentTenantId, setCurrentTenantId, refreshUser, isSuperAdmin } = useAuth();
  const { role: authRole, canEditRoute } = useAuthRole();
  const [selectedMode, setSelectedModeState] = useState<SelectedMode>('admin');
  const [loading, setLoading] = useState(false);
  const [manualTenantId, setManualTenantId] = useState('');
  const [savingTenant, setSavingTenant] = useState(false);

  useEffect(() => {
    if (user) {
      const savedMode = getSelectedMode();
      setSelectedModeState(savedMode);
    }
  }, [user]);

  const handleModeToggle = (enabled: boolean) => {
    // Only allow Admin/Ops/Finance to toggle driver mode
    if (!user || !['Admin', 'Ops', 'Finance'].includes(user.role)) {
      Alert.alert(
        'Access Denied',
        'Driver mode is only available for Admin, Ops, and Finance users.'
      );
      return;
    }

    const newMode: SelectedMode = enabled ? 'driver' : 'admin';
    setSelectedModeState(newMode);
    setSelectedModeGlobal(newMode);

    // The AuthenticatedRootNavigator will automatically switch stacks
    // via key prop change, no manual navigation needed
    Alert.alert(
      'Mode Changed',
      enabled
        ? 'Switched to driver mode. The app will switch to driver view.'
        : 'Switched to admin mode. The app will switch to admin view.',
      [{ text: 'OK' }]
    );
  };

  const handleTenantSwitch = (tenant: TenantMembership) => {
    if (tenant.tenantId === currentTenantId) {
      return; // Already selected
    }

    Alert.alert(
      'Switch Tenant',
      `Switch to ${tenant.tenantName || tenant.tenant || tenant.tenantId}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch',
          onPress: () => {
            setCurrentTenantId(tenant.tenantId);
            // Invalidate all queries to refetch with new tenant
            queryClient.invalidateQueries();
            Alert.alert('Success', 'Tenant switched. Data will refresh.');
          },
        },
      ]
    );
  };

  const performLogout = async () => {
    setLoading(true);
    try {
      await stopBackgroundTracking();
      await logout();
      setUser(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You can sign in again afterward.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: performLogout },
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={handleLogout}
          disabled={loading}
          style={styles.headerLogout}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <AppText variant="body" weight="semibold" color="white">
            {loading ? '…' : 'Logout'}
          </AppText>
        </TouchableOpacity>
      ),
    });
  }, [navigation, loading]);

  if (!user) {
    return (
      <Screen>
        <AppText>No user data available</AppText>
      </Screen>
    );
  }

  const canUseDriverMode = ['Admin', 'Ops', 'Finance'].includes(user.role);
  const isDriverModeEnabled = selectedMode === 'driver';
  const hasMultipleTenants = user.tenants && user.tenants.length > 1;
  const tenants = user.tenants || [];

  // Show tenant error only when non-superadmin and no tenant (SuperAdmin can have null tenant)
  const showTenantError = !isSuperAdmin && !currentTenantId;

  const handleSaveManualTenant = async () => {
    const id = manualTenantId.trim();
    if (!id) {
      Alert.alert('Missing tenant ID', 'Please enter your tenant ID.');
      return;
    }
    setSavingTenant(true);
    try {
      setCurrentTenantId(id);
      await refreshUser();
      setManualTenantId('');
      Alert.alert('Tenant set', 'Your tenant has been set. Data should load correctly now.');
    } catch (e) {
      Alert.alert('Error', 'Could not load profile with that tenant. Check the ID and try again.');
    } finally {
      setSavingTenant(false);
    }
  };

  return (
    <Screen scrollable>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* No tenant: show manual entry */}
        {showTenantError && (
          <Card style={[styles.section, styles.errorCard]}>
            <AppText variant="body" weight="semibold" color="error" style={styles.errorText}>
              No tenant selected
            </AppText>
            <AppText variant="body" color="textSecondary" style={styles.tenantHelp}>
              The server did not return a tenant with your login. If you have a tenant ID from your
              administrator, enter it below and tap "Use this tenant".
            </AppText>
            <Input
              label="Tenant ID"
              placeholder="e.g. your-tenant-uuid"
              value={manualTenantId}
              onChangeText={setManualTenantId}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!savingTenant}
            />
            <Button
              title="Use this tenant"
              onPress={handleSaveManualTenant}
              loading={savingTenant}
              disabled={savingTenant || !manualTenantId.trim()}
              style={styles.manualTenantButton}
            />
          </Card>
        )}

        {/* User Information */}
        <Card style={styles.section}>
          <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
            User Information
          </AppText>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Email
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {user.email}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Role
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {user.role}
            </AppText>
          </View>
          {user.tenant && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">
                Tenant
              </AppText>
              <AppText variant="body" color="text" style={styles.value}>
                {user.tenant}
              </AppText>
            </View>
          )}
          {user.tenantId && (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">
                Tenant ID
              </AppText>
              <AppText variant="body" color="text" style={styles.value}>
                {user.tenantId}
              </AppText>
            </View>
          )}
        </Card>

        {/* Current Tenant */}
        <Card style={styles.section}>
          <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
            Current Tenant
          </AppText>
          {currentTenantId ? (
            <View style={styles.infoRow}>
              <AppText variant="label" color="textSecondary">
                Current Tenant ID
              </AppText>
              <AppText variant="body" color="text" style={styles.value}>
                {currentTenantId}
              </AppText>
            </View>
          ) : (
            <AppText variant="body" color="error" style={styles.warningText}>
              No tenant selected
            </AppText>
          )}
        </Card>

        {/* Tenant Switcher (if multiple tenants) */}
        {hasMultipleTenants && (
          <Card style={styles.section}>
            <AppText variant="h2" weight="bold" color="text" style={styles.sectionTitle}>
              Switch Tenant
            </AppText>
            {tenants.map((tenant) => (
              <Card
                key={tenant.tenantId}
                onPress={() => handleTenantSwitch(tenant)}
                style={[
                  styles.tenantCard,
                  currentTenantId === tenant.tenantId && styles.tenantCardActive,
                ]}>
                <View style={styles.tenantCardHeader}>
                  <View style={styles.tenantInfo}>
                    <AppText variant="h3" weight="semibold" color="text">
                      {tenant.tenantName || tenant.tenant || tenant.tenantId}
                    </AppText>
                    {tenant.role && (
                      <AppText variant="bodySmall" color="textSecondary">
                        Role: {tenant.role}
                      </AppText>
                    )}
                    <AppText variant="caption" color="textSecondary">
                      ID: {tenant.tenantId}
                    </AppText>
                  </View>
                  <View style={styles.tenantBadges}>
                    {currentTenantId === tenant.tenantId && (
                      <Badge label="Current" variant="success" />
                    )}
                    {tenant.isActive !== false && (
                      <Badge label="Active" variant="info" />
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </Card>
        )}

        {/* Debug Information (dev) */}
        <Card style={styles.section}>
          <AppText variant="h3" weight="bold" color="text" style={styles.sectionTitle}>
            Debug Info
          </AppText>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Role (RBAC)
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {authRole ?? user.role ?? '—'}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Can edit route
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {canEditRoute ? 'Yes' : 'No'}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              User Role
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {user.role}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Selected Mode
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {selectedMode}
            </AppText>
          </View>
          <View style={styles.infoRow}>
            <AppText variant="label" color="textSecondary">
              Tenant ID (current)
            </AppText>
            <AppText variant="body" color="text" style={styles.value}>
              {currentTenantId || 'N/A'}
            </AppText>
          </View>
        </Card>

        {/* Driver Mode Toggle (only for Admin/Ops/Finance) */}
        {canUseDriverMode && (
          <Card style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <AppText variant="h3" weight="semibold" color="text">
                  Driver Mode
                </AppText>
                <AppText variant="bodySmall" color="textSecondary" style={styles.toggleDescription}>
                  Switch to driver view to see the app from a driver's perspective
                </AppText>
              </View>
              <Switch
                value={isDriverModeEnabled}
                onValueChange={handleModeToggle}
                trackColor={{ false: theme.colors.gray300, true: theme.colors.primary }}
                thumbColor={theme.colors.white}
              />
            </View>
          </Card>
        )}

        {/* Logout Button - sign out to log in again with a different account */}
        <Card style={styles.section}>
          <AppText variant="body" color="textSecondary" style={styles.logoutHint}>
            Sign out to log in with a different account.
          </AppText>
          <Button
            title="Logout"
            onPress={handleLogout}
            loading={loading}
            variant="destructive"
            style={styles.logoutButton}
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
  sectionTitle: {
    marginBottom: theme.spacing.md,
  },
  infoRow: {
    marginBottom: theme.spacing.md,
  },
  value: {
    marginTop: theme.spacing.xs,
  },
  errorCard: {
    backgroundColor: theme.colors.errorLight,
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  errorText: {
    textAlign: 'center',
  },
  tenantHelp: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  manualTenantButton: {
    marginTop: theme.spacing.sm,
  },
  warningText: {
    marginTop: theme.spacing.xs,
  },
  tenantCard: {
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.gray50,
  },
  tenantCardActive: {
    backgroundColor: theme.colors.infoLight,
    borderColor: theme.colors.info,
    borderWidth: 1,
  },
  tenantCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tenantInfo: {
    flex: 1,
  },
  tenantBadges: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  toggleDescription: {
    marginTop: theme.spacing.xs,
  },
  logoutHint: {
    marginBottom: theme.spacing.sm,
  },
  logoutButton: {
    marginTop: theme.spacing.xs,
  },
  headerLogout: {
    marginRight: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
});
