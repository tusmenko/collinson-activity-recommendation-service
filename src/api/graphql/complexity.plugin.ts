import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { getComplexity } from 'graphql-query-complexity';
import type { ComplexityEstimatorArgs } from 'graphql-query-complexity';

import { ERROR_CODES } from '../api.const.js';
import { LOCATION_FIELDS } from './graphql.const.js';
import type { GraphqlContext } from './graphql.types.js';

// Rejects a query selecting more than QUERY_MAX_LOCATIONS locations before any resolver runs (NFR-9).
export class ComplexityPlugin implements ApolloServerPlugin<GraphqlContext> {
  constructor(private readonly maxLocations: number) {}

  requestDidStart(): Promise<GraphQLRequestListener<GraphqlContext>> {
    return Promise.resolve({
      didResolveOperation: ({ request, document, schema }) => {
        const locations = getComplexity({
          schema,
          query: document,
          variables: request.variables ?? {},
          estimators: [(args) => this.locationEstimator(args)],
          ...(request.operationName ? { operationName: request.operationName } : {}),
        });
        if (locations > this.maxLocations) {
          throw this.tooComplex(locations);
        }
        return Promise.resolve();
      },
    });
  }

  // Each field that ranks a location costs 1, everything else 0, so the complexity is the location count.
  private locationEstimator({ type, field, childComplexity }: ComplexityEstimatorArgs): number {
    return (LOCATION_FIELDS.has(`${type.name}.${field.name}`) ? 1 : 0) + childComplexity;
  }

  private tooComplex(locations: number): GraphQLError {
    const { maxLocations } = this;
    return new GraphQLError(
      `Query selects ${String(locations)} locations; the limit is ${String(maxLocations)}`,
      { extensions: { code: ERROR_CODES.queryTooComplex, maxLocations, http: { status: 400 } } },
    );
  }
}
