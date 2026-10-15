// Written in development only; the committed copy is checked by the schema snapshot test (S-SCHEMA-1).
export const SCHEMA_FILE = 'schema.gql';

export const REQUEST_ID_HEADER = 'x-request-id';

// A client-sent request id is kept only when it looks like one; anything else is replaced.
export const REQUEST_ID_PATTERN = /^[\w.:-]{1,128}$/;

// INBOUND_PER_MINUTE is counted over this window.
export const THROTTLE_WINDOW_MS = 60_000;

// The two fields that rank a location; QUERY_MAX_LOCATIONS bounds how many one query selects.
export const LOCATION_FIELDS: ReadonlySet<string> = new Set([
  'Query.activityRankings',
  'Location.rankings',
]);
