import { GraphQLSchemaBuilderModule, GraphQLSchemaFactory } from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { isEnumType, lexicographicSortSchema, printSchema } from 'graphql';
import type { GraphQLSchema } from 'graphql';

import { registerActivities } from '../../src/api/models/enums.model.js';
import { API_RESOLVERS } from '../../src/api/rankings/resolvers.const.js';
import type { ClassifierRegistry } from '../../src/ranking/index.js';

export interface BuiltSchema {
  readonly schema: GraphQLSchema;
  // Sorted and printed as the app writes schema.gql, without the file header.
  readonly sdl: string;
}

// The code-first schema built in-process from the api resolvers, as the app builds it at startup; no Redis, no HTTP.
export async function buildSchema(registry: ClassifierRegistry): Promise<BuiltSchema> {
  registerActivities(registry.ids());
  const moduleRef = await Test.createTestingModule({
    imports: [GraphQLSchemaBuilderModule],
  }).compile();
  const schema = lexicographicSortSchema(
    await moduleRef.get(GraphQLSchemaFactory).create([...API_RESOLVERS]),
  );
  await moduleRef.close();
  return { schema, sdl: printSchema(schema) };
}

export function enumValues(schema: GraphQLSchema, name: string): string[] {
  const type = schema.getType(name);
  return isEnumType(type) ? type.getValues().map((value) => value.name) : [];
}
