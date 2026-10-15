import { Module } from '@nestjs/common';

import { SourcesModule } from '../sources/sources.module.js';
import { StoreModule } from '../store/store.module.js';
import { EnrichQueue } from './enrich.queue.js';
import { IngestProcessor } from './ingest.processor.js';
import { IngestQueue } from './ingest.queue.js';

@Module({
  imports: [SourcesModule, StoreModule],
  providers: [IngestQueue, IngestProcessor, EnrichQueue],
  exports: [IngestQueue, EnrichQueue],
})
export class QueueModule {}
