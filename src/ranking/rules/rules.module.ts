import { Module } from '@nestjs/common';

import { RuleSetProvider } from './rule-set.port.js';
import { StaticRuleSetAdapter } from './static-rule-set.adapter.js';

@Module({
  providers: [
    { provide: RuleSetProvider, useFactory: (): RuleSetProvider => new StaticRuleSetAdapter() },
  ],
  exports: [RuleSetProvider],
})
export class RulesModule {}
