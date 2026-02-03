/**
 * AdminTabs - Bottom Tab Navigator for Admin interface
 * Contains: Home, Orders, Trips, Resources tabs
 * Each tab contains a stack navigator for detail screens
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens - importing from features (existing) and screens (new)
import AdminHomeScreen from '../../screens/admin/AdminHomeScreen';
import OrdersListScreen from '../../features/orders/OrdersListScreen';
import CreateOrderScreen from '../../features/orders/CreateOrderScreen';
import OrderDetailScreen from '../../features/orders/OrderDetailScreen';
import TripsListScreen from '../../features/trips/TripsListScreen';
import TripDetailScreen from '../../features/trips/TripDetailScreen';
import StopDetailScreen from '../../features/stops/StopDetailScreen';
import DriversListScreen from '../../screens/admin/DriversListScreen';
import DriverDetailScreen from '../../screens/admin/DriverDetailScreen';
import VehiclesListScreen from '../../screens/admin/VehiclesListScreen';
import VehicleDetailScreen from '../../screens/admin/VehicleDetailScreen';
import AdminLiveMapScreen from '../../screens/admin/AdminLiveMapScreen';

// Define param lists
export type AdminTabsParamList = {
  HomeTab: undefined;
  OrdersTab: {
    screen: 'OrdersList' | 'CreateOrder' | 'OrderDetail';
    params?: {
      orderId?: string;
    };
  };
  TripsTab: {
    screen: 'TripsList' | 'TripDetail' | 'StopDetail';
    params?: {
      tripId?: string;
      stopId?: string;
    };
  };
  ResourcesTab: {
    screen: 'DriversList' | 'DriverDetail' | 'VehiclesList' | 'VehicleDetail';
    params?: {
      driverId?: string;
      vehicleId?: string;
    };
  };
  AdminLiveMap: undefined;
  // Detail screens accessible from any tab
  AdminHome: undefined;
  OrdersList: undefined;
  CreateOrder: undefined;
  OrderDetail: { orderId: string };
  TripsList: undefined;
  TripDetail: { tripId: string };
  StopDetail: { stopId: string; tripId: string };
  DriversList: undefined;
  DriverDetail: { driverId: string };
  VehiclesList: undefined;
  VehicleDetail: { vehicleId: string };
};

type OrdersStackParamList = {
  OrdersList: undefined;
  CreateOrder: undefined;
  OrderDetail: { orderId: string };
};
type TripsStackParamList = {
  TripsList: undefined;
  TripDetail: { tripId: string };
  StopDetail: { stopId: string; tripId: string };
};
type ResourcesStackParamList = {
  DriversList: undefined;
  DriverDetail: { driverId: string };
  VehiclesList: undefined;
  VehicleDetail: { vehicleId: string };
};

const Tab = createBottomTabNavigator<AdminTabsParamList>();
const OrdersStack = createNativeStackNavigator<OrdersStackParamList>();
const TripsStack = createNativeStackNavigator<TripsStackParamList>();
const ResourcesStack = createNativeStackNavigator<ResourcesStackParamList>();

// Tab bar icons defined at module level so the same component type is used every render
function HomeTabIcon() { return <Text>🏠</Text>; }
function OrdersTabIcon() { return <Text>📦</Text>; }
function TripsTabIcon() { return <Text>🚛</Text>; }
function ResourcesTabIcon() { return <Text>👥</Text>; }
function LiveMapTabIcon() { return <Text>🗺️</Text>; }

// Orders Tab Stack
function OrdersStackNavigator() {
  return (
    <OrdersStack.Navigator>
      <OrdersStack.Screen
        name="OrdersList"
        component={OrdersListScreen}
        options={{ title: 'Orders' }}
      />
      <OrdersStack.Screen
        name="CreateOrder"
        component={CreateOrderScreen}
        options={{ title: 'Create Order' }}
      />
      <OrdersStack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: 'Order Details' }}
      />
    </OrdersStack.Navigator>
  );
}

// Trips Tab Stack
function TripsStackNavigator() {
  return (
    <TripsStack.Navigator>
      <TripsStack.Screen
        name="TripsList"
        component={TripsListScreen}
        options={{ title: 'Trips' }}
      />
      <TripsStack.Screen
        name="TripDetail"
        component={TripDetailScreen}
        options={{ title: 'Trip Details' }}
      />
      <TripsStack.Screen
        name="StopDetail"
        component={StopDetailScreen}
        options={{ title: 'Stop Details' }}
      />
    </TripsStack.Navigator>
  );
}

// Resources Tab Stack
function ResourcesStackNavigator() {
  return (
    <ResourcesStack.Navigator>
      <ResourcesStack.Screen
        name="DriversList"
        component={DriversListScreen}
        options={{ title: 'Drivers' }}
      />
      <ResourcesStack.Screen
        name="DriverDetail"
        component={DriverDetailScreen}
        options={{ title: 'Driver Details' }}
      />
      <ResourcesStack.Screen
        name="VehiclesList"
        component={VehiclesListScreen}
        options={{ title: 'Vehicles' }}
      />
      <ResourcesStack.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
        options={{ title: 'Vehicle Details' }}
      />
    </ResourcesStack.Navigator>
  );
}

// Main Admin Tabs Navigator
// Note: useBottomTabBarHeight() only works inside tab *screens*, not here.
// Screens use TabScreenContainer for bottom padding.
const TAB_BAR_BASE_HEIGHT = 56;

export default function AdminTabs() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom; // Android nav bar / iOS home indicator

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          paddingBottom: bottomInset,
          height: TAB_BAR_BASE_HEIGHT + bottomInset,
        },
      }}>
      <Tab.Screen
        name="HomeTab"
        component={AdminHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: HomeTabIcon,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStackNavigator}
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: OrdersTabIcon,
        }}
      />
      <Tab.Screen
        name="TripsTab"
        component={TripsStackNavigator}
        options={{
          tabBarLabel: 'Trips',
          tabBarIcon: TripsTabIcon,
        }}
      />
      <Tab.Screen
        name="ResourcesTab"
        component={ResourcesStackNavigator}
        options={{
          tabBarLabel: 'Resources',
          tabBarIcon: ResourcesTabIcon,
        }}
      />
      <Tab.Screen
        name="AdminLiveMap"
        component={AdminLiveMapScreen}
        options={{
          tabBarLabel: 'Live Map',
          tabBarIcon: LiveMapTabIcon,
        }}
      />
    </Tab.Navigator>
  );
}