import { Global, Module } from '@nestjs/common';

import { ConfigService } from './config.service.js';
import { loadEnv } from './env.schema.js';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: (): ConfigService => new ConfigService(loadEnv(process.env)),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
