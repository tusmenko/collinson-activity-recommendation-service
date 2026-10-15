import { Module } from '@nestjs/common';

import { RuleSetProvider } from './rule-set.port';
import { StaticRuleSetAdapter } from './static-rule-set.adapter';

@Module({
  providers: [
    { provide: RuleSetProvider, useFactory: (): RuleSetProvider => new StaticRuleSetAdapter() },
  ],
  exports: [RuleSetProvider],
})
export class RulesModule {}
