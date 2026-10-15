import { describe, expect, it } from 'vitest';

import { testConfig } from '../../../test/setup/adapter-deps';
import { captureLogger } from '../../../test/setup/capture-logger';
import { locationFacts } from '../../../test/setup/location-facts';
import { rankingInput } from '../../../test/setup/ranking-input';
import { AnomalyCounter } from '../../infra/index';
import type { ActivityRanking, RankingResult } from '../ranking.types';
import { noSignals } from '../ranking.util';
import { RankingAuditService } from './ranking-audit.service';

class CountingAnomalies extends AnomalyCounter {
  readonly types: string[] = [];

  increment(type: string): void {
    this.types.push(type);
  }
}

function setup() {
  const { logger, lines } = captureLogger();
  const anomalies = new CountingAnomalies();
  const audit = new RankingAuditService(anomalies, logger, testConfig({ WINDOW_DAYS: '1' }));
  return { audit, anomalies, lines };
}

function result(rankings: readonly ActivityRanking[]): RankingResult {
  return { rankings, ruleSetVersion: 'v1+SKIING@1.1.0' };
}

const DAY = { date: '2026-10-15', factors: [], signals: noSignals('2026-10-15') };

const SKIING: ActivityRanking = {
  activity: 'SKIING',
  status: 'APPLICABLE',
  reason: null,
  classifierVersion: '1.1.0',
  days: [{ ...DAY, score: 70 }],
};

describe('RankingAuditService', () => {
  it('U-EVENT-2 a sound ranking logs nothing and counts nothing', () => {
    const { audit, anomalies, lines } = setup();

    audit.check(rankingInput('london'), result([SKIING]));

    expect(anomalies.types).toEqual([]);
    expect(lines).toEqual([]);
  });

  it('U-EVENT-2 each violation logs at warn with its context and increments its type', () => {
    const { audit, anomalies, lines } = setup();
    const broken = {
      ...SKIING,
      days: [
        { ...DAY, score: 120 },
        { ...DAY, score: null },
      ],
    };

    audit.check(rankingInput('london'), result([broken]));

    expect(anomalies.types).toEqual(['score_out_of_range', 'window_mismatch', 'missing_score']);
    expect(lines[0]).toMatchObject({
      level: 40,
      component: 'RankingService',
      type: 'score_out_of_range',
      activity: 'SKIING',
      requestId: 'test-london',
      locationId: 'london',
      msg: 'ranking invariant violated',
    });
  });

  it('U-EVENT-1 the ranking event carries provider, fetched-at per source, versions and days', () => {
    const { audit, lines } = setup();

    audit.emit(rankingInput('london'), result([SKIING]));

    expect(lines).toEqual([
      expect.objectContaining({
        level: 30,
        event: 'ranking',
        requestId: 'test-london',
        locationId: 'london',
        provider: 'open-meteo',
        fetchedAt: { FORECAST: '2026-10-15T06:00:00.000Z', MARINE: '2026-10-15T06:00:00.000Z' },
        ruleSetVersion: 'v1+SKIING@1.1.0',
        activities: [
          {
            classifierId: 'SKIING',
            classifierVersion: '1.1.0',
            status: 'APPLICABLE',
            reason: null,
            days: [{ date: '2026-10-15', score: 70, factors: [] }],
          },
        ],
      }),
    ]);
  });

  it('U-EVENT-3 a marine availability change logs one event; no change logs nothing', () => {
    const { audit, lines } = setup();
    const paris = locationFacts();

    audit.noteMarineAvailability(paris, 'unknown', 'absent');
    audit.noteMarineAvailability(paris, 'absent', 'absent');

    expect(lines).toEqual([
      expect.objectContaining({
        event: 'marine_availability_changed',
        locationId: '2988507',
        previous: 'unknown',
        next: 'absent',
      }),
    ]);
  });
});
