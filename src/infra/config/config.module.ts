import { Global, Module } from '@nestjs/common';

import { ConfigService } from './config.service.js';
import { loadProcessEnv } from './env.schema.js';

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useFactory: (): ConfigService => new ConfigService(loadProcessEnv()),
    },
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
