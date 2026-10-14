// Whether the marine source has data for this place; unknown until the first marine fetch.
export type MarineAvailability = 'available' | 'absent' | 'unknown';

// A normalised geocoding hit, independent of the provider's payload shape.
export interface GeocodingResult {
  readonly id: string;
  readonly name: string;
  // Country name, or the country code when the provider gives no name.
  readonly country: string;
  readonly countryCode?: string;
  readonly admin1?: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly elevation?: number;
  readonly timezone: string;
}

// Stored without TTL under location:v1:{id} (design D-4).
export interface LocationFacts extends GeocodingResult {
  readonly marineDataAvailable: MarineAvailability;
  // ISO 8601.
  readonly updatedAt: string;
}

export interface ResolvedLocation {
  readonly location: LocationFacts;
  // Other upstream results in upstream order, at most four.
  readonly alternatives: LocationFacts[];
}

export type UpstreamFailureReason = 'timeout' | 'http' | 'malformed' | 'network';

export type GeocodingOutcome =
  | { readonly kind: 'ok'; readonly results: GeocodingResult[] }
  | { readonly kind: 'failed'; readonly reason: UpstreamFailureReason; readonly detail: string };
