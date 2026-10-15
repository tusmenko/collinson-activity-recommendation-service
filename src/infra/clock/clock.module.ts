import { Global, Module } from '@nestjs/common';

import { ClockPort } from './clock.port';
import { SystemClock } from './system-clock.service';

@Global()
@Module({
  providers: [{ provide: ClockPort, useClass: SystemClock }],
  exports: [ClockPort],
})
export class ClockModule {}
