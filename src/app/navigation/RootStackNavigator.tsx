import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../../shared/context/AuthContext';
import LoginScreen from '../../features/auth/LoginScreen';
import AuthenticatedRootNavigator from './AuthenticatedRootNavigator';

export type RootStackParamList = {
  Login: undefined;
  Authenticated: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    // You can show a loading screen here
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Authenticated" component={AuthenticatedRootNavigator} />
      )}
    </Stack.Navigator>
  );
}
