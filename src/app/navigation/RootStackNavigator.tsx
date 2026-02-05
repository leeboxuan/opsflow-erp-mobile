import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../../shared/context/AuthContext';
import LoginScreen from '../../features/auth/LoginScreen';
import TenantSelectScreen from '../../features/auth/TenantSelectScreen';
import NoAccessScreen from '../../features/auth/NoAccessScreen';
import NetworkDiagnosticsScreen from '../../features/debug/NetworkDiagnosticsScreen';
import AuthenticatedRootNavigator from './AuthenticatedRootNavigator';

export type RootStackParamList = {
  Login: undefined;
  TenantSelect: undefined;
  NoAccess: undefined;
  Authenticated: undefined;
  NetworkDiagnostics: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** When authenticated: show NoAccess, TenantSelect, or main app. */
function AuthenticatedGate() {
  const { noAccess, needsTenantSelection } = useAuth();

  if (noAccess) return <NoAccessScreen />;
  if (needsTenantSelection) return <TenantSelectScreen />;
  return <AuthenticatedRootNavigator />;
}

export default function RootStackNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="NetworkDiagnostics"
            component={NetworkDiagnosticsScreen}
            options={{ headerShown: true, title: 'Network Diagnostics' }}
          />
        </>
      ) : (
        <Stack.Screen name="Authenticated" component={AuthenticatedGate} />
      )}
    </Stack.Navigator>
  );
}
