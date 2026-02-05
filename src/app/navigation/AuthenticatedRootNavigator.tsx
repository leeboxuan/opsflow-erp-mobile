import React, { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../shared/context/AuthContext';
import { getSelectedMode, setSelectedMode, SelectedMode } from '../../shared/utils/authStorage';
import AdminStack from './AdminStack';
import DriverStack from './DriverStack';

// Global event emitter for mode changes
let modeChangeListeners: Array<(mode: SelectedMode) => void> = [];

export function setSelectedModeGlobal(mode: SelectedMode) {
  setSelectedMode(mode);
  modeChangeListeners.forEach(listener => listener(mode));
}

/** Derive role from tenant membership when tenantRole not on user. */
function getEffectiveRole(user: { tenantRole?: string; role?: string; tenants?: Array<{ tenantId: string; role?: string }> } | null, currentTenantId: string | null): string {
  if (!user) return '';
  if (user.tenantRole) return String(user.tenantRole).trim();
  const tenants = user.tenants;
  if (currentTenantId && Array.isArray(tenants)) {
    const m = tenants.find((t) => t.tenantId === currentTenantId);
    if (m?.role) return String(m.role).trim();
  }
  if (Array.isArray(tenants) && tenants.length > 0 && tenants[0].role) return String(tenants[0].role).trim();
  return String(user.role ?? '').trim();
}

export default function AuthenticatedRootNavigator() {
  const { user, currentTenantId } = useAuth();
  const [selectedMode, setSelectedModeState] = useState<SelectedMode>('admin');
  const [initialized, setInitialized] = useState(false);
  const listenerRef = useRef<((mode: SelectedMode) => void) | null>(null);

  // Prefer tenant role (from membership); derive from user.tenants + currentTenantId if not set
  const roleKey = getEffectiveRole(user, currentTenantId);
  const isDriverRole = roleKey.toLowerCase() === 'driver';
  const isAdminLikeRole = ['admin', 'ops', 'finance'].includes(roleKey.toLowerCase());

  // Load selected mode preference on mount with validation
  useEffect(() => {
    if (user) {
      let savedMode = getSelectedMode();
      
      // Validate mode: must be 'admin' or 'driver'
      if (savedMode !== 'admin' && savedMode !== 'driver') {
        console.warn('⚠️ Invalid selected mode detected, resetting to admin');
        savedMode = 'admin';
        setSelectedMode('admin');
        // Show alert once on invalid mode detection
        Alert.alert('Mode Reset', 'Role reset to Admin mode.', [{ text: 'OK' }]);
      }
      
      // Driver role: always use driver mode (they can't switch to admin stack)
      // Admin/Ops/Finance: respect saved mode; if invalid, reset to admin
      if (isDriverRole) {
        setSelectedMode('driver');
        setSelectedModeState('driver');
      } else if (isAdminLikeRole && savedMode !== 'admin' && savedMode !== 'driver') {
        savedMode = 'admin';
        setSelectedMode('admin');
        setSelectedModeState('admin');
      } else {
        setSelectedModeState(savedMode);
      }
      setInitialized(true);
    }
  }, [user, isDriverRole, isAdminLikeRole]);

  // Listen for mode changes from Settings screen
  useEffect(() => {
    listenerRef.current = (mode: SelectedMode) => {
      setSelectedModeState(mode);
    };
    modeChangeListeners.push(listenerRef.current);

    return () => {
      if (listenerRef.current) {
        modeChangeListeners = modeChangeListeners.filter(
          listener => listener !== listenerRef.current
        );
      }
    };
  }, []);

  // Determine which stack to show (differentiate by role: Driver vs Admin/others)
  const shouldShowDriverStack = (): boolean => {
    if (!user) return false;

    // API role "Driver" (any case) → always DriverStack
    if (isDriverRole) {
      return true;
    }

    // Admin / Ops / Finance / USER etc. → AdminStack, or DriverStack only if they chose "driver mode"
    if (isAdminLikeRole) {
      return selectedMode === 'driver';
    }

    // Unknown role (e.g. "USER"): default to Admin stack
    return false;
  };

  if (!initialized || !user) {
    return null; // Or a loading screen
  }

  const showDriver = shouldShowDriverStack();
  const stackKey = `${(user as any)?.tenantRole ?? user.role}-${selectedMode}-${(user as any)?.currentTenantId ?? user.tenantId ?? ''}`;

  // Force re-render by using key prop
  return showDriver ? (
    <DriverStack key={stackKey} />
  ) : (
    <AdminStack key={stackKey} />
  );
}
