import type { GraphiqlExample } from './graphql.types';

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

// The tabs GraphiQL opens with, in order; the same files are the e2e and schema contract fixtures.
export const GRAPHIQL_EXAMPLES: readonly GraphiqlExample[] = [
  { file: 'default.graphql', variables: { city: 'Biarritz' } },
  {
    file: 'details.graphql',
    variables: { city: 'London', activities: ['SURFING', 'OUTDOOR_SIGHTSEEING'] },
  },
  { file: 'alternatives.graphql', variables: { city: 'Springfield', country: 'US' } },
];

// GraphiQL 3 needs React 18's UMD builds (React 19 ships none); exact versions so the page never changes under us.
export const GRAPHIQL_ASSETS = {
  css: 'https://unpkg.com/graphiql@3.8.3/graphiql.min.css',
  scripts: [
    'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
    'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js',
    'https://unpkg.com/graphiql@3.8.3/graphiql.min.js',
  ],
} as const;
