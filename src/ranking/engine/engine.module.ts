import { Module } from '@nestjs/common';

import { ScoreEngine } from './score-engine.service';

@Module({
  providers: [ScoreEngine],
  exports: [ScoreEngine],
})
export class EngineModule {}
