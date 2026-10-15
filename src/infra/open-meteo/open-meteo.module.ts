import { Global, Module } from '@nestjs/common';

import { OpenMeteoClient } from './open-meteo.client';

@Global()
@Module({
  providers: [OpenMeteoClient],
  exports: [OpenMeteoClient],
})
export class OpenMeteoModule {}
