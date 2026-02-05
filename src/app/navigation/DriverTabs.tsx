/**
 * DriverTabs - Bottom Tab Navigator for Driver interface
 * Contains: Today (default), Home, Trips, Settings
 * Trips tab contains a stack navigator for detail screens
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens - importing from features (existing) and screens (new)
import DriverTodayScreen from '../../screens/driver/DriverTodayScreen';
import DriverHomeScreen from '../../screens/driver/DriverHomeScreen';
import DriverTripsScreen from '../../features/driver/DriverTripsScreen';
import TripExecutionScreen from '../../screens/driver/TripExecutionScreen';
import DriverTripDetailScreen from '../../features/driver/DriverTripDetailScreen';
import PODCaptureScreen from '../../screens/driver/PODCaptureScreen';
import SettingsScreen from '../../features/settings/SettingsScreen';

// Define param lists
export type DriverTabsParamList = {
  TodayTab: undefined;
  HomeTab: undefined;
  TripsTab: {
    screen: 'MyTrips' | 'TripExecution' | 'DriverTripDetail' | 'PODCapture';
    params?: {
      tripId?: string;
      stopId?: string;
    };
  };
  Settings: undefined;
  MyTrips: undefined;
  TripExecution: { tripId: string };
  PODCapture: { stopId: string };
};

/** Param list for the Trips tab stack (MyTrips, TripExecution, DriverTripDetail, PODCapture) */
export type DriverTripsStackParamList = {
  MyTrips: undefined;
  TripExecution: { tripId: string };
  DriverTripDetail: { tripId: string };
  PODCapture: { stopId: string };
};

const Tab = createBottomTabNavigator<DriverTabsParamList>();
const TripsStack = createNativeStackNavigator<DriverTripsStackParamList>();

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
      initialRouteName="TodayTab"
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
        name="TodayTab"
        component={DriverTodayScreen}
        options={{
          tabBarLabel: 'Today',
          tabBarIcon: () => <Text>📋</Text>,
        }}
      />
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
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: () => <Text>⚙️</Text>,
          headerShown: true,
          headerTitle: 'Settings',
          headerStyle: { backgroundColor: '#2196f3' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
    </Tab.Navigator>
  );
}
