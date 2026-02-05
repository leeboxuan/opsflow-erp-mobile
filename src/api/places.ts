import { ENV } from '../config/env';
import { PlacePrediction, PlaceDetails } from './types';

const GOOGLE_PLACES_AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

/** Singapore bias for autocomplete (optional: components=country:sg) */
const COMPONENTS = 'country:sg';

function hasApiKey(): boolean {
  const key = ENV.GOOGLE_PLACES_API_KEY?.trim();
  return !!key;
}

/**
 * Google Places Autocomplete (legacy) response shape.
 * @see https://developers.google.com/maps/documentation/places/web-service/autocomplete
 */
interface GoogleAutocompleteResponse {
  status: string;
  predictions?: Array<{
    place_id: string;
    description: string;
    structured_formatting?: { main_text?: string; secondary_text?: string };
  }>;
  error_message?: string;
}

/**
 * Google Place Details response shape (address_components).
 * @see https://developers.google.com/maps/documentation/places/web-service/details
 */
interface GooglePlaceDetailsResponse {
  status: string;
  result?: {
    formatted_address?: string;
    address_components?: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  };
  error_message?: string;
}

function extractPostalCode(components: GooglePlaceDetailsResponse['result']['address_components']): string | undefined {
  if (!Array.isArray(components)) return undefined;
  const postal = components.find((c) => c.types?.includes('postal_code'));
  return postal?.long_name?.trim() || undefined;
}

/**
 * Search address suggestions using Google Places Autocomplete API.
 * Uses API key from config (ENV.GOOGLE_PLACES_API_KEY). If key is missing,
 * returns empty array so UI falls back to manual address input.
 */
export async function searchPlacesAutocomplete(input: string): Promise<PlacePrediction[]> {
  if (!input?.trim()) return [];
  if (!hasApiKey()) return [];

  const key = ENV.GOOGLE_PLACES_API_KEY.trim();
  const params = new URLSearchParams({
    input: input.trim(),
    key,
    components: COMPONENTS,
  });

  try {
    const res = await fetch(`${GOOGLE_PLACES_AUTOCOMPLETE_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data: GoogleAutocompleteResponse = await res.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return [];
    }
    if (!Array.isArray(data.predictions)) return [];

    return data.predictions.map((p) => ({
      placeId: p.place_id,
      description: p.description ?? '',
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Get place details (formatted address + postal code) for a selected prediction.
 * Uses API key from config. If key is missing or request fails, returns null
 * so UI allows manual entry.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!placeId?.trim()) return null;
  if (!hasApiKey()) return null;

  const key = ENV.GOOGLE_PLACES_API_KEY.trim();
  const params = new URLSearchParams({
    place_id: placeId.trim(),
    key,
    fields: 'formatted_address,address_components',
  });

  try {
    const res = await fetch(`${GOOGLE_PLACE_DETAILS_URL}?${params.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const data: GooglePlaceDetailsResponse = await res.json();

    if (data.status !== 'OK' || !data.result) return null;

    const formattedAddress = data.result.formatted_address?.trim();
    const postalCode = extractPostalCode(data.result.address_components);

    return {
      formattedAddress: formattedAddress ?? '',
      postalCode,
    };
  } catch (e) {
    return null;
  }
}
