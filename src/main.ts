import 'reflect-metadata';

import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { pinoHttp } from 'pino-http';

import { AppModule } from './app.module';
import { AppLogger, ConfigService, loadProcessEnv, TelemetryService } from './infra/index';

// Nest's own shutdown hooks exit before the last metric export; close the app, flush telemetry, then exit by the signal.
function closeOnSignal(app: INestApplication, telemetry: TelemetryService): void {
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      void app
        .close()
        .finally(() => telemetry.shutdown())
        .finally(() => process.kill(process.pid, signal));
    });
  }
}

async function bootstrap(): Promise<void> {
  // Before Nest, so the global meter provider exists when the anomaly counter is built.
  const telemetry = new TelemetryService(loadProcessEnv().OTEL_EXPORTER);
  telemetry.start();
  // Logs stay buffered until pino is in place; on a bad environment the only output is the error
  // naming the key, and abortOnError: false turns it into a non-zero exit instead of an abort.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    autoFlushLogs: false,
    abortOnError: false,
  });
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.flushLogs();
  app.use(
    pinoHttp({
      logger: logger.pino,
      autoLogging: { ignore: (req) => req.url === '/health' },
      // A-31: no client addresses in logs; method and URL are enough for an access line.
      serializers: {
        req: (req: { method: string; url: string }) => ({ method: req.method, url: req.url }),
      },
    }),
  );
  const config = app.get(ConfigService);
  const trustProxy = config.get('TRUST_PROXY');
  // The throttle keys on req.ip; behind an ingress that is the proxy unless Express trusts it.
  if (trustProxy !== undefined) {
    app.set('trust proxy', trustProxy);
  }
  closeOnSignal(app, telemetry);
  await app.listen(config.get('PORT'));
}

bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Startup failed: ${message}\n`);
  process.exitCode = 1;
});
