import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { Injectable } from '@nestjs/common';
import type { GqlOptionsFactory } from '@nestjs/graphql';

import { ConfigService } from '../infra/index.js';
import { ClassifierRegistry } from '../ranking/index.js';
import { REQUEST_ID_HEADER, REQUEST_ID_PATTERN, SCHEMA_FILE } from './api.const.js';
import type { GraphqlContext } from './api.types.js';
import { complexityPlugin } from './complexity.plugin.js';
import { formatGraphqlError } from './graphql-error.mapper.js';
import { registerActivities } from './models/enums.model.js';

interface HttpPair {
  readonly req: IncomingMessage;
  readonly res: ServerResponse;
}

// A client-sent id is kept for tracing across services; otherwise one is generated. Echoed on the response.
function requestContext({ req, res }: HttpPair): GraphqlContext {
  const sent = req.headers[REQUEST_ID_HEADER];
  const requestId = typeof sent === 'string' && REQUEST_ID_PATTERN.test(sent) ? sent : randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  return { req, res, requestId };
}

// Apollo options (design D-1, D-3), built after the classifiers registered so the Activity enum is complete.
@Injectable()
export class GraphqlConfigService implements GqlOptionsFactory<ApolloDriverConfig> {
  constructor(
    private readonly config: ConfigService,
    private readonly registry: ClassifierRegistry,
  ) {}

  createGqlOptions(): ApolloDriverConfig {
    registerActivities(this.registry.ids());
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
      context: requestContext,
      formatError: formatGraphqlError,
      plugins: [complexityPlugin(this.config.get('QUERY_MAX_LOCATIONS'))],
    };
  }
}
