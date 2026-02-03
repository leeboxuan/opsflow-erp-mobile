/**
 * DriverTabs - Bottom Tab Navigator for Driver interface
 * Contains: Home, Trips, Profile tabs
 * Trips tab contains a stack navigator for detail screens
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens - importing from features (existing) and screens (new)
import DriverHomeScreen from '../../screens/driver/DriverHomeScreen';
import DriverTripsScreen from '../../features/driver/DriverTripsScreen';
import TripExecutionScreen from '../../screens/driver/TripExecutionScreen';
import DriverTripDetailScreen from '../../features/driver/DriverTripDetailScreen';
import PODCaptureScreen from '../../screens/driver/PODCaptureScreen';
import DriverMapScreen from '../../screens/driver/DriverMapScreen';
import SettingsScreen from '../../features/settings/SettingsScreen';

// Define param lists
export type DriverTabsParamList = {
  HomeTab: undefined;
  TripsTab: {
    screen: 'MyTrips' | 'TripExecution' | 'DriverTripDetail' | 'PODCapture' | 'DriverMap';
    params?: {
      tripId?: string;
      stopId?: string;
    };
  };
  MapTab: undefined;
  ProfileTab: undefined;
  DriverHome: undefined;
  MyTrips: undefined;
  TripExecution: { tripId: string };
  PODCapture: { stopId: string };
  DriverMap: undefined;
  Settings: undefined;
};

/** Param list for the Trips tab stack (MyTrips, TripExecution, DriverTripDetail, PODCapture, DriverMap) */
export type DriverTripsStackParamList = {
  MyTrips: undefined;
  TripExecution: { tripId: string };
  DriverTripDetail: { tripId: string };
  PODCapture: { stopId: string };
  DriverMap: undefined;
};

const Tab = createBottomTabNavigator();
const TripsStack = createNativeStackNavigator();

// Trips Tab Stack
function TripsStackNavigator() {
  return (
    <TripsStack.Navigator>
      <TripsStack.Screen
        name="MyTrips"
        component={DriverTripsScreen}
        options={{ title: 'My Trips' }}
      />
      <TripsStack.Screen
        name="TripExecution"
        component={TripExecutionScreen}
        options={{ title: 'Trip Execution' }}
      />
      <TripsStack.Screen
        name="DriverTripDetail"
        component={DriverTripDetailScreen}
        options={{ title: 'Trip Details' }}
      />
      <TripsStack.Screen
        name="PODCapture"
        component={PODCaptureScreen}
        options={{ title: 'Upload POD' }}
      />
      <TripsStack.Screen
        name="DriverMap"
        component={DriverMapScreen}
        options={{ title: 'Map' }}
      />
    </TripsStack.Navigator>
  );
}

// Main Driver Tabs Navigator
const TAB_BAR_BASE_HEIGHT = 56;

export default function DriverTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom; // Android nav bar / iOS home indicator

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2196f3',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          paddingBottom: bottomInset,
          height: TAB_BAR_BASE_HEIGHT + bottomInset,
        },
      }}>
      <Tab.Screen
        name="HomeTab"
        component={DriverHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: () => <Text>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="TripsTab"
        component={TripsStackNavigator}
        options={{
          tabBarLabel: 'Trips',
          tabBarIcon: () => <Text>🚛</Text>,
        }}
      />
      <Tab.Screen
        name="MapTab"
        component={DriverMapScreen}
        options={{
          tabBarLabel: 'Map',
          tabBarIcon: () => <Text>🗺️</Text>,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: () => <Text>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
