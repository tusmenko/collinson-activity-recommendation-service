import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApolloDriverConfig } from '@nestjs/apollo';
import { describe, expect, it, vi } from 'vitest';

import { testConfig } from '../../../test/setup/adapter-deps';
import { ClassifierRegistry } from '../../ranking/index';
import { SkiingClassifier } from '../../ranking/classifiers/skiing/skiing.classifier';
import { ScoreEngine } from '../../ranking/engine/score-engine.service';
import { GraphqlErrorMapper } from '../errors/graphql-error.mapper';
import { ActivityEnum } from '../models/enums.model';
import { ComplexityPlugin } from './complexity.plugin';
import { GraphqlConfigService } from './graphql-config.service';
import type { GraphqlContext } from './graphql.types';

function service(nodeEnv: string, registry = new ClassifierRegistry()): GraphqlConfigService {
  return new GraphqlConfigService(
    testConfig({ NODE_ENV: nodeEnv }),
    registry,
    new GraphqlErrorMapper(),
  );
}

function requestContext(options: ApolloDriverConfig, header: unknown) {
  const setHeader = vi.fn();
  const req = { headers: { 'x-request-id': header } } as unknown as IncomingMessage;
  const res = { setHeader } as unknown as ServerResponse;
  const build = options.context as (pair: { req: unknown; res: unknown }) => GraphqlContext;
  return { context: build({ req, res }), setHeader, req, res };
}

describe('GraphqlConfigService', () => {
  it('U-API-9 registers every classifier id in the Activity enum before the schema is built', () => {
    const registry = new ClassifierRegistry();
    registry.register(new SkiingClassifier(new ScoreEngine()));

    service('production', registry).onModuleInit();

    expect(ActivityEnum).toEqual({ SKIING: 'SKIING' });
  });

  it('U-API-9 writes schema.gql and returns stack traces only in development', () => {
    const development = service('development').createGqlOptions();
    const production = service('production').createGqlOptions();

    expect(development).toMatchObject({
      autoSchemaFile: 'schema.gql',
      includeStacktraceInErrorResponses: true,
    });
    expect(production).toMatchObject({
      autoSchemaFile: true,
      includeStacktraceInErrorResponses: false,
    });
    expect(production.plugins).toEqual([expect.any(ComplexityPlugin)]);
  });

  it('U-API-9 keeps a well-formed client request id and echoes it', () => {
    const options = service('production').createGqlOptions();

    const { context, setHeader, req, res } = requestContext(options, 'client-trace:42');

    expect(context).toEqual({ req, res, requestId: 'client-trace:42' });
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'client-trace:42');
  });

  it('U-API-9 replaces a missing or malformed request id with a generated one', () => {
    const options = service('production').createGqlOptions();

    const missing = requestContext(options, undefined).context.requestId;
    const malformed = requestContext(options, 'has spaces in it').context.requestId;

    expect(missing).toMatch(/^[0-9a-f-]{36}$/);
    expect(malformed).toMatch(/^[0-9a-f-]{36}$/);
    expect(malformed).not.toBe(missing);
  });

  it('U-API-9 formatError goes through the error mapper', () => {
    const options = service('production').createGqlOptions();

    expect(options.formatError?.({ message: 'secret' }, new Error('secret'))).toEqual({
      message: 'Internal server error',
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  });
});
