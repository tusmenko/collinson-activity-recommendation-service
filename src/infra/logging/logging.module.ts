import { Global, Module } from '@nestjs/common';
import { pino } from 'pino';

import { ConfigService } from '../config/config.service';
import { AppLogger } from './app-logger.service';

@Global()
@Module({
  providers: [
    {
      provide: AppLogger,
      useFactory: (config: ConfigService): AppLogger =>
        new AppLogger(pino({ level: config.get('LOG_LEVEL') })),
      inject: [ConfigService],
    },
  ],
  exports: [AppLogger],
})
export class LoggingModule {}
