import { Global, Module } from '@nestjs/common';

import { AnomalyCounter } from './anomaly-counter.port.js';
import { LogAnomalyCounter } from './log-anomaly-counter.service.js';

@Global()
@Module({
  providers: [{ provide: AnomalyCounter, useClass: LogAnomalyCounter }],
  exports: [AnomalyCounter],
})
export class TelemetryModule {}
