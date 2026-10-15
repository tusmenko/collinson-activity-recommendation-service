import { Module } from '@nestjs/common';

import { QueueModule } from '../queue/queue.module.js';
import { StoreModule } from '../store/store.module.js';
import { IngestService } from './ingest.service.js';
import { WindowService } from './window.service.js';

@Module({
  imports: [StoreModule, QueueModule],
  providers: [WindowService, IngestService],
  exports: [WindowService, IngestService],
})
export class IngestModule {}
