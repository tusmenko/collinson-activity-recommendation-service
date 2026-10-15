// Error codes of design D-3 beyond the ones Apollo defines.
export const ERROR_CODES = {
  badUserInput: 'BAD_USER_INPUT',
  notFound: 'NOT_FOUND',
  upstreamUnavailable: 'UPSTREAM_UNAVAILABLE',
  rateLimited: 'RATE_LIMITED',
  queryTooComplex: 'QUERY_TOO_COMPLEX',
  internal: 'INTERNAL_SERVER_ERROR',
} as const;
