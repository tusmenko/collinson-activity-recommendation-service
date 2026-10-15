import { unwrapResolverError } from '@apollo/server/errors';
import { ThrottlerException } from '@nestjs/throttler';
import { GraphQLError } from 'graphql';
import type { GraphQLFormattedError } from 'graphql';

import { GeocodingUnavailableError, LocationNotFoundError } from '../location/index.js';
import { UnknownActivityError } from '../ranking/index.js';
import { ForecastUnavailableError } from '../weather/index.js';
import { ERROR_CODES, GEOCODING_RETRY_AFTER_SECONDS } from './api.const.js';
import { UpstreamUnavailableError } from './api.errors.js';
import { locationView } from './rankings-result.mapper.js';

interface Mapped {
  readonly message: string;
  readonly extensions: Readonly<Record<string, unknown>>;
}

// Domain errors to the codes of design D-3; null for anything that is not one of them.
function mapDomainError(error: unknown): Mapped | null {
  if (error instanceof LocationNotFoundError) {
    return {
      message: error.message,
      extensions: { code: ERROR_CODES.notFound, input: error.city },
    };
  }
  if (error instanceof UpstreamUnavailableError) {
    const { retryAfterSeconds } = error;
    const location = locationView(error.location);
    const code = ERROR_CODES.upstreamUnavailable;
    return { message: error.message, extensions: { code, retryAfterSeconds, location } };
  }
  if (error instanceof ForecastUnavailableError) {
    const { retryAfterSeconds } = error;
    return { message: error.message, extensions: { code: error.code, retryAfterSeconds } };
  }
  if (error instanceof GeocodingUnavailableError) {
    const retryAfterSeconds = GEOCODING_RETRY_AFTER_SECONDS;
    return { message: error.message, extensions: { code: error.code, retryAfterSeconds } };
  }
  if (error instanceof ThrottlerException) {
    return { message: 'Too many requests', extensions: { code: ERROR_CODES.rateLimited } };
  }
  if (error instanceof UnknownActivityError) {
    return { message: error.message, extensions: { code: ERROR_CODES.badUserInput } };
  }
  return null;
}

// Errors the client caused or is told about; anything else is a bug and is logged by the filter.
export function isClientError(error: unknown): boolean {
  return error instanceof GraphQLError || mapDomainError(error) !== null;
}

// Apollo formatError: the one place a thrown error becomes a client error. GraphQL errors (parse,
// validation, the Zod pipe, the complexity plugin) pass through; anything unexpected loses its detail.
export function formatGraphqlError(
  formatted: GraphQLFormattedError,
  error: unknown,
): GraphQLFormattedError {
  const original = unwrapResolverError(error);
  const mapped = mapDomainError(original);
  const { locations, path } = formatted;
  const position = { ...(locations ? { locations } : {}), ...(path ? { path } : {}) };
  if (mapped !== null) {
    return { ...position, message: mapped.message, extensions: mapped.extensions };
  }
  if (original instanceof GraphQLError) {
    return formatted;
  }
  return {
    ...position,
    message: 'Internal server error',
    extensions: { code: ERROR_CODES.internal },
  };
}
