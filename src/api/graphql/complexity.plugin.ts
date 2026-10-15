import type { ApolloServerPlugin } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { getComplexity } from 'graphql-query-complexity';
import type { ComplexityEstimatorArgs } from 'graphql-query-complexity';

import { ERROR_CODES, LOCATION_FIELDS } from './api.const.js';
import type { GraphqlContext } from './api.types.js';

// Each field that ranks a location costs 1, everything else 0, so the complexity is the location count.
function locationEstimator({ type, field, childComplexity }: ComplexityEstimatorArgs): number {
  return (LOCATION_FIELDS.has(`${type.name}.${field.name}`) ? 1 : 0) + childComplexity;
}

// Rejects a query selecting more than QUERY_MAX_LOCATIONS locations before any resolver runs (NFR-9).
export function complexityPlugin(maxLocations: number): ApolloServerPlugin<GraphqlContext> {
  return {
    requestDidStart: () =>
      Promise.resolve({
        didResolveOperation: ({ request, document, schema }) => {
          const locations = getComplexity({
            schema,
            query: document,
            variables: request.variables ?? {},
            estimators: [locationEstimator],
            ...(request.operationName ? { operationName: request.operationName } : {}),
          });
          if (locations > maxLocations) {
            throw new GraphQLError(
              `Query selects ${String(locations)} locations; the limit is ${String(maxLocations)}`,
              {
                extensions: {
                  code: ERROR_CODES.queryTooComplex,
                  maxLocations,
                  http: { status: 400 },
                },
              },
            );
          }
          return Promise.resolve();
        },
      }),
  };
}
