// Written in development only; the committed copy is checked by the schema snapshot test (S-SCHEMA-1).
export const SCHEMA_FILE = 'schema.gql';

export const REQUEST_ID_HEADER = 'x-request-id';

// A client-sent request id is kept only when it looks like one; anything else is replaced.
export const REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;

// INBOUND_PER_MINUTE is counted over this window.
export const THROTTLE_WINDOW_MS = 60_000;

// Geocoding has no stored fallback; a client is told to retry after this long.
export const GEOCODING_RETRY_AFTER_SECONDS = 30;

// The two fields that rank a location; QUERY_MAX_LOCATIONS bounds how many one query selects.
export const LOCATION_FIELDS: ReadonlySet<string> = new Set([
  'Query.activityRankings',
  'Location.rankings',
]);

// Error codes of design D-3 beyond the ones Apollo defines.
export const ERROR_CODES = {
  badUserInput: 'BAD_USER_INPUT',
  notFound: 'NOT_FOUND',
  upstreamUnavailable: 'UPSTREAM_UNAVAILABLE',
  rateLimited: 'RATE_LIMITED',
  queryTooComplex: 'QUERY_TOO_COMPLEX',
  internal: 'INTERNAL_SERVER_ERROR',
} as const;
