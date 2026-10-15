import { randomUUID } from 'node:crypto';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { GqlOptionsFactory } from '@nestjs/graphql';

import { ConfigService } from '../../infra/index';
import { ClassifierRegistry } from '../../ranking/index';
import { GraphqlErrorMapper } from '../errors/graphql-error.mapper';
import { registerActivities } from '../models/enums.model';
import { ComplexityPlugin } from './complexity.plugin';
import { REQUEST_ID_HEADER, REQUEST_ID_PATTERN, SCHEMA_FILE } from './graphql.const';
import type { GraphqlContext, HttpPair } from './graphql.types';

// Apollo options (design D-1, D-3). The schema is built in GraphQLModule's own init, after this provider's init
// and after the classifier modules registered (they sit deeper in the import graph), so the Activity enum is complete.
@Injectable()
export class GraphqlConfigService implements GqlOptionsFactory<ApolloDriverConfig>, OnModuleInit {
  constructor(
    private readonly config: ConfigService,
    private readonly registry: ClassifierRegistry,
    private readonly errors: GraphqlErrorMapper,
  ) {}

  onModuleInit(): void {
    registerActivities(this.registry.ids());
  }

  createGqlOptions(): ApolloDriverConfig {
    const development = this.config.get('NODE_ENV') === 'development';
    return {
      // The image's file system is read-only to the app user; the committed copy is checked by S-SCHEMA-1.
      autoSchemaFile: development ? SCHEMA_FILE : true,
      sortSchema: true,
      buildSchemaOptions: { addNewlineAtEnd: true },
      introspection: true,
      graphiql: true,
      includeStacktraceInErrorResponses: development,
      autoTransformHttpErrors: false,
      context: (pair: HttpPair) => this.requestContext(pair),
      formatError: (formatted, error) => this.errors.format(formatted, error),
      plugins: [new ComplexityPlugin(this.config.get('QUERY_MAX_LOCATIONS'))],
    };
  }

  // A client-sent id is kept for tracing across services; otherwise one is generated. Echoed on the response.
  private requestContext({ req, res }: HttpPair): GraphqlContext {
    const sent = req.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof sent === 'string' && REQUEST_ID_PATTERN.test(sent) ? sent : randomUUID();
    res.setHeader(REQUEST_ID_HEADER, requestId);
    return { req, res, requestId };
  }
}
