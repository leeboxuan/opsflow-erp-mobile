# OpsFlow Mobile - Navigation Route Map

## Navigation Structure

```
RootStackNavigator (src/app/navigation/RootStackNavigator.tsx)
├── Login (AuthStack)
│   └── LoginScreen
│
└── Authenticated (AuthenticatedRootNavigator)
    ├── AdminStack (if Admin/Ops/Finance in admin mode)
    │   └── AdminTabs
    │       ├── HomeTab
    │       │   └── AdminHomeScreen
    │       ├── OrdersTab
    │       │   ├── OrdersListScreen
    │       │   ├── CreateOrderScreen (modal/stack)
    │       │   └── OrderDetailScreen (stack)
    │       ├── TripsTab
    │       │   ├── TripsListScreen
    │       │   ├── TripDetailScreen (stack)
    │       │   └── StopDetailScreen (stack)
    │       └── ResourcesTab
    │           ├── DriversListScreen
    │           ├── DriverDetailScreen (stack)
    │           ├── VehiclesListScreen
    │           └── VehicleDetailScreen (stack)
    │
    └── DriverStack (if Driver role OR Admin/Ops/Finance in driver mode)
        └── DriverTabs
            ├── HomeTab
            │   └── DriverHomeScreen
            ├── TripsTab
            │   ├── MyTripsScreen
            │   ├── TripExecutionScreen (stack)
            │   └── PODCaptureScreen (stack)
            └── ProfileTab
                └── SettingsScreen
```

## Route Details

### Auth Flow
- **Login** → After login → Navigate to Authenticated (AdminStack or DriverStack based on role/mode)

### Admin Flow
1. **AdminHome** → Dashboard with quick stats and shortcuts
2. **OrdersTab**
   - **OrdersList** → List all orders (status, plannedAt)
   - **CreateOrder** → Form with stop builder (pickup/delivery)
   - **OrderDetail** → Order info + related trip(s)
3. **TripsTab**
   - **TripsList** → List all trips (status, driver, vehicle)
   - **TripDetail** → Timeline of stops, assign driver/vehicle, dispatch/start/complete actions
   - **StopDetail** → Individual stop details
4. **ResourcesTab**
   - **DriversList** → List all drivers
   - **DriverDetail** → Driver info + assigned trips
   - **VehiclesList** → List all vehicles
   - **VehicleDetail** → Vehicle info + assigned trips

### Driver Flow
1. **DriverHome** → Today's assigned trips + next stop
2. **TripsTab**
   - **MyTrips** → List assigned trips (status)
   - **TripExecution** → Stop list with action buttons (ARRIVED, COMPLETE, FAIL), Navigate button, Upload POD button
   - **PODCapture** → Take photo/pick photo + note, submit POD
3. **ProfileTab**
   - **Settings** → Show role + tenant + mode, toggle Driver Mode (admin only), logout

## Navigation Patterns

### Tab Navigation
- Bottom tabs for main sections (Home, Orders, Trips, Resources for Admin; Home, Trips, Profile for Driver)
- Stack navigation within each tab for detail screens

### Stack Navigation
- Detail screens pushed on top of list screens
- Back navigation always available
- Modal screens for create/edit flows

### Mode Switching
- Role switcher in header (AdminStack/DriverStack)
- Settings accessible from both stacks
- Mode change resets navigation stack

## Access Control

- **Admin/Ops/Finance**: Can access AdminStack, can switch to DriverStack via "Driver Mode"
- **Driver**: Always uses DriverStack, cannot switch
- **Settings**: Accessible from both stacks
- **Role Switcher**: Visible in header for Admin/Ops/Finance users

## Data Flow

- All API calls via React Query
- Cache invalidation on create/update/delete
- Real-time updates via query refetch
- Loading states for all async operations
- Empty states for no data
