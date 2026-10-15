import { Module } from '@nestjs/common';

import { EnrichQueue } from './enrich.queue';
import { IngestQueue } from './ingest.queue';

@Module({
  providers: [IngestQueue, EnrichQueue],
  exports: [IngestQueue, EnrichQueue],
})
export class QueueModule {}
