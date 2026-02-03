import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import AppText from './AppText';
import { getSelectedMode, setSelectedMode, SelectedMode } from '../utils/authStorage';
import { setSelectedModeGlobal } from '../../app/navigation/AuthenticatedRootNavigator';
import { useAuth } from '../context/AuthContext';

interface RoleSwitcherProps {
  onSwitch?: () => void;
}

export default function RoleSwitcher({ onSwitch }: RoleSwitcherProps) {
  const { user } = useAuth();
  const currentMode = getSelectedMode();

  // Only show for Admin/Ops/Finance users
  if (!user || !['Admin', 'Ops', 'Finance'].includes(user.role)) {
    return null;
  }

  const isDriverMode = currentMode === 'driver';
  const buttonText = isDriverMode ? 'Back to Admin' : 'Driver Mode';
  const buttonColor = isDriverMode ? '#fff' : '#fff';

  const handleSwitch = () => {
    const newMode: SelectedMode = isDriverMode ? 'admin' : 'driver';
    setSelectedModeGlobal(newMode);
    if (onSwitch) {
      onSwitch();
    }
  };

  return (
    <TouchableOpacity onPress={handleSwitch} style={styles.button}>
      <AppText variant="body" weight="semibold" style={{ color: buttonColor }}>
        {buttonText}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
});
