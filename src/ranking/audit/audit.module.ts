import { Module } from '@nestjs/common';

import { RankingAuditService } from './ranking-audit.service';

@Module({
  providers: [RankingAuditService],
  exports: [RankingAuditService],
})
export class AuditModule {}
