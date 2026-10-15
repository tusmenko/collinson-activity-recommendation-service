import { Module } from '@nestjs/common';

import { AuditModule } from './audit/audit.module';
import { IndoorSightseeingModule } from './classifiers/indoor-sightseeing/indoor-sightseeing.module';
import { OutdoorSightseeingModule } from './classifiers/outdoor-sightseeing/outdoor-sightseeing.module';
import { SkiingModule } from './classifiers/skiing/skiing.module';
import { SurfingModule } from './classifiers/surfing/surfing.module';
import { RankingService } from './ranking.service';
import { RegistryModule } from './registry/registry.module';
import { RulesModule } from './rules/rules.module';

// Adding an activity is one folder under classifiers/ (module, classifier, rules) plus one import here and its
// rule file in RULE_FILES (QAS-7). Each classifier module registers itself on init, in this import order.
@Module({
  imports: [
    RegistryModule,
    RulesModule,
    AuditModule,
    SkiingModule,
    SurfingModule,
    OutdoorSightseeingModule,
    IndoorSightseeingModule,
  ],
  providers: [RankingService],
  exports: [RankingService, RegistryModule],
})
export class RankingModule {}
