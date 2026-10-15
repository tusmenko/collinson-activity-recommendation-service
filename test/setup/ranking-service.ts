import { OtelAnomalyCounter } from '../../src/infra/telemetry/otel-anomaly-counter.service';
import { RankingAuditService } from '../../src/ranking/audit/ranking-audit.service';
import { IndoorSightseeingClassifier } from '../../src/ranking/classifiers/indoor-sightseeing/indoor-sightseeing.classifier';
import { OutdoorSightseeingClassifier } from '../../src/ranking/classifiers/outdoor-sightseeing/outdoor-sightseeing.classifier';
import { SkiingClassifier } from '../../src/ranking/classifiers/skiing/skiing.classifier';
import { SurfingClassifier } from '../../src/ranking/classifiers/surfing/surfing.classifier';
import { ScoreEngine } from '../../src/ranking/engine/score-engine.service';
import { ClassifierRegistry, RankingService } from '../../src/ranking/index';
import type { Classifier, RuleSetProvider } from '../../src/ranking/index';
import { StaticRuleSetAdapter } from '../../src/ranking/rules/static-rule-set.adapter';
import { testConfig } from './adapter-deps';
import { captureLogger } from './capture-logger';

export interface RankingHarness {
  readonly service: RankingService;
  readonly counter: OtelAnomalyCounter;
  readonly lines: () => Record<string, unknown>[];
}

// The ranking service wired by hand as the module wires it, with a captured logger and the default window.
export function rankingHarness(
  extra: readonly Classifier[] = [],
  rules: RuleSetProvider = new StaticRuleSetAdapter(),
): RankingHarness {
  const engine = new ScoreEngine();
  const registry = new ClassifierRegistry();
  const builtIns = [
    new SkiingClassifier(engine),
    new SurfingClassifier(engine),
    new OutdoorSightseeingClassifier(engine),
    new IndoorSightseeingClassifier(engine),
  ];
  for (const classifier of [...builtIns, ...extra]) {
    registry.register(classifier);
  }
  const captured = captureLogger();
  const { logger } = captured;
  const lines = (): Record<string, unknown>[] => captured.lines;
  const counter = new OtelAnomalyCounter(logger);
  const config = testConfig();
  const audit = new RankingAuditService(counter, logger, config);
  return { service: new RankingService(registry, rules, audit, config), counter, lines };
}
