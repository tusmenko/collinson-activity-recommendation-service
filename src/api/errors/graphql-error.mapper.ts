import { unwrapResolverError } from '@apollo/server/errors';
import { Injectable } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { GraphQLError } from 'graphql';
import type { GraphQLFormattedError } from 'graphql';

import { GeocodingUnavailableError, LocationNotFoundError } from '../../location/index';
import { UnknownActivityError } from '../../ranking/index';
import { ForecastUnavailableError } from '../../weather/index';
import { ERROR_CODES } from '../api.const';
import { UpstreamUnavailableError } from '../api.errors';
import { locationView } from '../api.util';
import { GEOCODING_RETRY_AFTER_SECONDS } from './errors.const';
import type { MappedError } from './errors.types';

// Thrown errors to the client error codes of design D-3.
@Injectable()
export class GraphqlErrorMapper {
  // Apollo formatError: the one place a thrown error becomes a client error. GraphQL errors (parse,
  // validation, the Zod pipe, the complexity plugin) pass through; anything unexpected loses its detail.
  format(formatted: GraphQLFormattedError, error: unknown): GraphQLFormattedError {
    const original = unwrapResolverError(error);
    const mapped = this.mapDomainError(original);
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

  // Errors the client caused or is told about; anything else is a bug and is logged by the filter.
  isClientError(error: unknown): boolean {
    return error instanceof GraphQLError || this.mapDomainError(error) !== null;
  }

  // Domain errors to the codes of design D-3; null for anything that is not one of them.
  private mapDomainError(error: unknown): MappedError | null {
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
}
