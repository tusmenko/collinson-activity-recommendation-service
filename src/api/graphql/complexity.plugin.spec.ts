import type { GraphQLRequestContextDidResolveOperation } from '@apollo/server';
import { buildSchema, GraphQLError, parse } from 'graphql';
import { describe, expect, it } from 'vitest';

import { ComplexityPlugin } from './complexity.plugin';
import type { GraphqlContext } from './graphql.types';

const SCHEMA = buildSchema(`
  type Query { activityRankings(city: String!): Result }
  type Result { location: Location }
  type Location { name: String, rankings: [String] }
`);

// Three locations: two activityRankings fields and one Location.rankings below the first.
const THREE = `
  query Three($city: String!) {
    a: activityRankings(city: $city) { location { rankings } }
    b: activityRankings(city: "Paris") { location { name } }
  }
  query One { activityRankings(city: "Paris") { location { name } } }
`;

async function resolve(
  maxLocations: number,
  request: { operationName?: string; variables?: Record<string, unknown> },
): Promise<void> {
  const listener = await new ComplexityPlugin(maxLocations).requestDidStart();
  const context = { request, document: parse(THREE), schema: SCHEMA };
  await listener.didResolveOperation?.(
    context as unknown as GraphQLRequestContextDidResolveOperation<GraphqlContext>,
  );
}

describe('ComplexityPlugin', () => {
  it('U-API-7 a query within QUERY_MAX_LOCATIONS resolves', async () => {
    await expect(
      resolve(3, { operationName: 'Three', variables: { city: 'Biarritz' } }),
    ).resolves.toBeUndefined();
  });

  it('U-API-7 a query over QUERY_MAX_LOCATIONS is QUERY_TOO_COMPLEX with status 400', async () => {
    const failure: unknown = await resolve(2, {
      operationName: 'Three',
      variables: { city: 'Biarritz' },
    }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(GraphQLError);
    expect((failure as GraphQLError).message).toBe('Query selects 3 locations; the limit is 2');
    expect((failure as GraphQLError).extensions).toEqual({
      code: 'QUERY_TOO_COMPLEX',
      maxLocations: 2,
      http: { status: 400 },
    });
  });

  it('U-API-7 only the named operation is counted, with no variables sent', async () => {
    await expect(resolve(1, { operationName: 'One' })).resolves.toBeUndefined();
  });
});
