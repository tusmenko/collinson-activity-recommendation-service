import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import { GraphQLError } from 'graphql';
import { getComplexity } from 'graphql-query-complexity';
import type { ComplexityEstimatorArgs } from 'graphql-query-complexity';

import { ERROR_CODES } from '../api.const';
import { ALTERNATIVES_FIELD, LOCATION_FIELDS, MAX_ALTERNATIVES } from './graphql.const';
import type { GraphqlContext } from './graphql.types';

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

  // Each field that ranks a location costs 1, everything else 0, so the complexity is the location count. A list
  // runs its selection once per item: Meta.alternatives holds up to MAX_ALTERNATIVES places, so what is selected
  // under it counts that many times.
  private locationEstimator({ type, field, childComplexity }: ComplexityEstimatorArgs): number {
    const key = `${type.name}.${field.name}`;
    if (key === ALTERNATIVES_FIELD) {
      return childComplexity * MAX_ALTERNATIVES;
    }
    return (LOCATION_FIELDS.has(key) ? 1 : 0) + childComplexity;
  }

  private tooComplex(locations: number): GraphQLError {
    const { maxLocations } = this;
    return new GraphQLError(
      `Query selects ${String(locations)} locations; the limit is ${String(maxLocations)}`,
      { extensions: { code: ERROR_CODES.queryTooComplex, maxLocations, http: { status: 400 } } },
    );
  }
}
