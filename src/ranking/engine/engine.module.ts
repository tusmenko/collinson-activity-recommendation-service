import { Module } from '@nestjs/common';

import { ScoreEngine } from './score-engine.service.js';

@Module({
  providers: [ScoreEngine],
  exports: [ScoreEngine],
})
export class EngineModule {}
