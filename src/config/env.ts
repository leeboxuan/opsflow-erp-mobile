/**
 * App config. API keys and secrets should be set via environment variables
 * (e.g. EXPO_PUBLIC_GOOGLE_PLACES_API_KEY in .env or EAS Secrets), not hardcoded.
 */
export const ENV = {
  API_BASE_URL: 'https://opsflow-erp-api.onrender.com',
  /** Google Places API key for address autocomplete (Android/iOS). Set in .env as EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. */
  GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
};