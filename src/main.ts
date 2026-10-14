import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { pinoHttp } from 'pino-http';

import { AppModule } from './app.module.js';
import { AppLogger, ConfigService } from './infra/index.js';

async function bootstrap(): Promise<void> {
  // Logs stay buffered until pino is in place; on a bad environment the only output is the error
  // naming the key, and abortOnError: false turns it into a non-zero exit instead of an abort.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    autoFlushLogs: false,
    abortOnError: false,
  });
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.flushLogs();
  app.use(
    pinoHttp({ logger: logger.pino, autoLogging: { ignore: (req) => req.url === '/health' } }),
  );
  app.enableShutdownHooks();
  await app.listen(app.get(ConfigService).get('PORT'));
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Startup failed: ${message}\n`);
  process.exitCode = 1;
});
