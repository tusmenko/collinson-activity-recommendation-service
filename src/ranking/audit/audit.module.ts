import { Module } from '@nestjs/common';

import { RankingAuditService } from './ranking-audit.service.js';

@Module({
  providers: [RankingAuditService],
  exports: [RankingAuditService],
})
export class AuditModule {}
