import { OtelAnomalyCounter } from '../../src/infra/telemetry/otel-anomaly-counter.service.js';
import type { Classifier, RuleSetProvider } from '../../src/ranking/index.js';
import { ClassifierRegistry, RankingService } from '../../src/ranking/index.js';
import { IndoorSightseeingClassifier } from '../../src/ranking/indoor-sightseeing/indoor-sightseeing.classifier.js';
import { OutdoorSightseeingClassifier } from '../../src/ranking/outdoor-sightseeing/outdoor-sightseeing.classifier.js';
import { RankingAuditService } from '../../src/ranking/ranking-audit.service.js';
import { ScoreEngine } from '../../src/ranking/score-engine.service.js';
import { SkiingClassifier } from '../../src/ranking/skiing/skiing.classifier.js';
import { StaticRuleSetAdapter } from '../../src/ranking/static-rule-set.adapter.js';
import { SurfingClassifier } from '../../src/ranking/surfing/surfing.classifier.js';
import { testConfig } from './adapter-deps.js';
import { captureLogger } from './capture-logger.js';

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
