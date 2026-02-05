# OpsFlow Mobile

React Native CLI mobile application for OpsFlow - Transport Management System.

## Setup

### Prerequisites

- Node.js >= 20
- React Native CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

### Installation

```bash
npm install
```

### Maps (react-native-maps)

The app uses `react-native-maps` for the driver trip execution map. Install the Expo-compatible version:

```bash
npx expo install react-native-maps
```

**Rebuild after adding or updating native modules (e.g. react-native-maps):**

```bash
npx expo prebuild --clean
npx expo run:android --device
# or for iOS: npx expo run:ios --device
```

Use `prebuild --clean` when you change native config (e.g. `app.json`, new native modules). Use `run:android` / `run:ios` for normal development builds.

### Google Maps API Key (Required for Map Features)

The app uses Google Maps for live driver location tracking. You need to configure your Google Maps API key:

1. **Get a Google Maps API key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a project or select an existing one
   - Enable "Maps SDK for Android" (and "Maps SDK for iOS" if targeting iOS)
   - Create an API key
   - Restrict the API key to your app (recommended for production)

2. **Configure the API key:**
   - Open `android/gradle.properties`
   - Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:
   ```properties
   GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```
   - **Important:** Do NOT commit `gradle.properties` with your actual API key to git
   - The file is already in `.gitignore` to prevent accidental commits

3. **For iOS (if targeting iOS):**
   - Add the API key to `ios/AppDelegate.mm` (not implemented yet)

### Running the App

You can run the app in two ways: **native (React Native CLI)** or **Expo CLI**. Both use the same code and native projects; location sharing and all features work the same.

#### Option 1: Native (React Native CLI)

**Android:**
```bash
npm run android
# or
npx react-native run-android
```

**iOS:**
```bash
npm run ios
# or
npx react-native run-ios
```

**Metro:**
```bash
npm start
```

#### Option 2: Expo CLI

npx expo run:android     # build & install
npx expo start           # start Metro / dev server


**iOS:**
```bash
npm run expo:ios
```

- **Expo Go:** This app uses custom native modules (e.g. MMKV, geolocation, maps), so it **cannot** run inside the Expo Go app. Use a development build via `expo run:android` / `expo run:ios` (or `react-native run-android` / `run-ios`).
- **Location sharing** works the same whether you use `npm run android` or `npm run expo:android`; both use the same native code.

## Features

### Admin Features

- Dashboard with quick stats
- Order management (create, view, edit)
- Trip management (assign drivers, vehicles, track status)
- Resource management (drivers, vehicles)
- Live map showing all active drivers

### Driver Features

- Home dashboard with today's trips
- Trip execution with stop actions (Arrived, Complete, Fail)
- POD (Proof of Delivery) capture with photos
- Live location sharing (optional, toggle-based)
- Map view showing current location

## API Configuration

The app connects to the OpsFlow API:

- Base URL: `https://opsflow-erp-api.onrender.com`
- Authentication: JWT tokens
- Multi-tenant: Uses `x-tenant-id` header

Configuration is in `src/config/env.ts`.

## Location Tracking

### Driver Location Tracking

- Drivers can toggle "Share Live Location" to allow admins to see their location
- Location updates are sent to the API every 5 seconds or when moved >20 meters
- Location tracking respects the share preference and stops on logout

### Admin trip live map

- Admin users see live driver location **inside Trip Details** only (no global map tab)
- When a trip is active (Dispatched / In Transit) and has an assigned driver, the Trip Details screen shows a "Live Location" map with the driver marker and "Updated Xs ago"
- Location is fetched via GET `/trips/:tripId/location` (or fallback GET `/transport/drivers/:driverId/location`) and polled every 7 seconds while the screen is focused
- When the trip is not active or has no driver, the map shows: "Live location is available when trip is in progress."

## Project Structure

```
src/
├── api/              # API client and functions
├── app/              # App-level configuration
│   └── navigation/   # Navigation stacks and tabs
├── features/         # Feature-based screens (auth, orders, trips, etc.)
├── screens/          # Screen components (admin, driver)
│   ├── admin/        # Admin-specific screens
│   └── driver/       # Driver-specific screens
├── shared/           # Shared components and utilities
│   ├── context/      # React contexts (Auth, etc.)
│   ├── theme/        # Design system (colors, typography, spacing)
│   ├── ui/           # Reusable UI components
│   └── utils/        # Utility functions (auth storage, etc.)
└── location/         # Location tracking service
```

## Development

### Adding New Screens

1. Create screen component in appropriate folder (`screens/admin/` or `screens/driver/`)
2. Add route to appropriate navigator (`AdminTabs.tsx` or `DriverTabs.tsx`)
3. Update TypeScript param lists

### API Integration

- All API calls use `axios` via `src/api/client.ts`
- React Query (`@tanstack/react-query`) is used for data fetching and caching
- JWT tokens and `x-tenant-id` headers are automatically added via interceptors

## Troubleshooting

### "The native NitroModules Turbo/Native-Module could not be found"

This can happen if the Nitro native library (used by `react-native-mmkv`) wasn’t built or linked. Try:

1. **Full clean and rebuild** (from project root):
   ```bash
   cd android
   gradlew clean
   cd ..
   npx react-native run-android
   ```
   If `gradlew clean` fails with an Expo Gradle error, skip it and run only:
   ```bash
   npx react-native run-android
   ```
   and ensure you’re not running an old installed build.

2. **Confirm Nitro is linked:**  
   `npx react-native config` should list both `react-native-nitro-modules` and `react-native-mmkv`.

3. **Nitro Gradle props** are set in `android/gradle.properties` (`Nitro_ndkVersion`, `Nitro_compileSdkVersion`, etc.); don’t remove them.

### Map not showing

- Verify `GOOGLE_MAPS_API_KEY` is set in `android/gradle.properties`
- Check that the API key has "Maps SDK for Android" enabled
- Ensure the API key is not restricted (or restrict it to your app's package name: `com.opsflowerpmobile`)

### Location tracking not working

- Ensure location permissions are granted on the device (foreground and background for Android)
- Location tracking is automatic during active trips (Dispatched / In Transit); no toggle required
- Verify the device has location services enabled
- If the map shows "Location permission is required", tap **Open Settings** and enable location for the app

## License

Private - OpsFlow
