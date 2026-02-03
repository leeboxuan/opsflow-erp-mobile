/**
 * DriverStack - Main stack navigator for Driver interface
 * Contains DriverTabs (bottom tabs) and Settings screen
 * Settings is also accessible via ProfileTab in DriverTabs
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DriverTabs from './DriverTabs';
import SettingsScreen from '../../features/settings/SettingsScreen';

export type DriverStackParamList = {
  DriverTabs: undefined;
  Settings: undefined;
  // Detail screens are handled within DriverTabs stacks
};

const Stack = createNativeStackNavigator<DriverStackParamList>();

export default function DriverStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#2196f3',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Stack.Screen
        name="DriverTabs"
        component={DriverTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
