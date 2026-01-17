import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../../features/auth/LoginScreen';
import TripsListScreen from '../../features/trips/TripsListScreen';
import TripDetailScreen from '../../features/trips/TripDetailScreen';
import StopDetailScreen from '../../features/stops/StopDetailScreen';

export type RootStackParamList = {
  Login: undefined;
  TripsList: undefined;
  TripDetail: { tripId: string };
  StopDetail: { stopId: string; tripId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
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
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TripsList"
        component={TripsListScreen}
        options={{ title: 'Trips' }}
      />
      <Stack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ title: 'Trip Details' }}
      />
      <Stack.Screen
        name="StopDetail"
        component={StopDetailScreen}
        options={{ title: 'Stop Details' }}
      />
    </Stack.Navigator>
  );
}
