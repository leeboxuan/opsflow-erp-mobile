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

export default function AuthenticatedRootNavigator() {
  const { user } = useAuth();
  const [selectedMode, setSelectedModeState] = useState<SelectedMode>('admin');
  const [initialized, setInitialized] = useState(false);
  const listenerRef = useRef<((mode: SelectedMode) => void) | null>(null);

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
      
      // Safety: If user is actually a Driver role, force admin mode (they can't switch)
      // Actually wait - if user.role is Driver, they should see DriverStack
      // But if they're Admin/Ops/Finance and somehow have invalid mode, reset to admin
      if (['Admin', 'Ops', 'Finance'].includes(user.role) && savedMode !== 'admin' && savedMode !== 'driver') {
        savedMode = 'admin';
        setSelectedMode('admin');
      }

      setSelectedModeState(savedMode);
      setInitialized(true);
    }
  }, [user]);

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

  // Determine which stack to show
  const shouldShowDriverStack = (): boolean => {
    if (!user) return false;

    // If user is actually a Driver role, always show DriverStack
    if (user.role === 'Driver') {
      return true;
    }

    // If user is Admin/Ops/Finance, check selected mode (default to 'admin')
    if (['Admin', 'Ops', 'Finance'].includes(user.role)) {
      return selectedMode === 'driver';
    }

    return false;
  };

  if (!initialized || !user) {
    return null; // Or a loading screen
  }

  const showDriver = shouldShowDriverStack();
  // Use key to force re-render when mode changes
  const stackKey = `${user.role}-${selectedMode}-${user.tenantId ?? ''}`;

  // Force re-render by using key prop
  return showDriver ? (
    <DriverStack key={stackKey} />
  ) : (
    <AdminStack key={stackKey} />
  );
}
