/**
 * AdminStack - Main stack navigator for Admin interface
 * Contains AdminTabs (bottom tabs) and Settings screen
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminTabs from './AdminTabs';
import SettingsScreen from '../../features/settings/SettingsScreen';
import NetworkDiagnosticsScreen from '../../features/debug/NetworkDiagnosticsScreen';

export type AdminStackParamList = {
  AdminTabs: undefined;
  Settings: undefined;
  NetworkDiagnostics: undefined;
  // Detail screens are handled within AdminTabs stacks
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Stack.Screen
        name="AdminTabs"
        component={AdminTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="NetworkDiagnostics"
        component={NetworkDiagnosticsScreen}
        options={{ title: 'Network Diagnostics' }}
      />
    </Stack.Navigator>
  );
}
